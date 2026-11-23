# Event Manager API

An API for pre-registering event attendees and checking them in at the hall door. It uses Express 5, PostgreSQL for storage, and Redis for fast check-ins.

**Base URL (local):** `http://localhost:4000/api`
All requests and responses use JSON. Every route except login needs a token.

---

## Quick start

```bash
npm install
# create your .env file (see Configuration below)
npx tsx src/utils/seed.ts   # creates a first admin user and a default gate
npm run dev                 # starts the server
```

When the server prints `Event Hall API Server running on port 4000`, it's ready. On startup it loads all attendee data from PostgreSQL into Redis, so check-ins are fast.

**Development login** (don't use in production):
- Email: `admin@event.com`
- Password: `password123`
- Role: `super_admin`

---

## Configuration

Set these in your `.env` file:

| Variable | Required? | Default | What it does |
|---|---|---|---|
| `PORT` | No | `4000` | Port the server runs on |
| `DATABASE_URL` | Yes | None | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | **Yes** | None | Secret key for signing login tokens |

> **Warning:** Always set `JWT_SECRET`. If it's missing, the server can create tokens but can never verify them, so every logged-in request will fail.

---

## Logging in and using tokens

Send your email and password to log in:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@event.com","password":"password123"}'
```

You'll get back a token, which stays valid for **12 hours**. Include it in every other request:

```
Authorization: Bearer <your-token>
```

There's no way to refresh a token. When it expires, log in again.

**Errors you might see:**

| Problem | Status | Message |
|---|---|---|
| No token sent | 401 | Authentication token missing or malformed |
| Token is wrong or expired | 403 | Invalid or expired token |
| Your role can't use this route | 403 | Access denied: insufficient permissions |

---

## Roles

| What you can do | Super admin | Registrar | Usher |
|---|:--:|:--:|:--:|
| Log in | ✓ | ✓ | ✓ |
| Register attendees | ✓ | ✓ | |
| View attendee list | ✓ | ✓ | ✓ |
| Download check-in list (for offline use) | ✓ | ✓ | ✓ |
| Check in attendees | ✓ | | ✓ |
| Upload offline check-ins | ✓ | | ✓ |

---

## Endpoints

### Attendees

**Register one attendee**: `POST /api/attendees` (super admin, registrar)

```bash
curl -X POST http://localhost:4000/api/attendees \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","ticketTier":"vip"}'
```

- `fullName` is required. `email`, `phone`, and `ticketTier` are optional (`ticketTier` defaults to `standard`).
- The server creates a unique access code for the attendee, like `EVT-1A2B`.
- Returns `201` with the new attendee.

**Bulk register**: `POST /api/attendees/batch`
Not built yet. It returns `501`.

**List all attendees**: `GET /api/attendees` (all staff roles)
Returns every attendee in one response. There's no paging or filtering yet.

---

### Check-ins

**Get the check-in list for offline use**: `GET /api/checkins/manifest` (all staff roles)
Returns a lightweight list of attendees that gate devices can store and scan without internet.

**Check in one attendee**: `POST /api/checkins/verify` (super admin, usher)

```bash
curl -X POST http://localhost:4000/api/checkins/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"accessCode":"EVT-1A2B","gateId":1}'
```

- Send either `accessCode` or `qrPayload`, plus the `gateId`. If you send both, the access code is used.
- Responses:
  - `200`: "Access granted."
  - `400`: a required field is missing
  - `404`: the code isn't valid
  - `409`: the attendee already came in

**Upload offline check-ins**: `POST /api/checkins/sync` (super admin, usher)
When a gate was offline, it can send a batch of scans here. Each record is checked the same way as `/verify`, and one bad record won't stop the others. An attendee who was already checked in still counts as a success.

```json
{
  "records": [
    {
      "identifier": "EVT-1A2B",
      "isQrScan": false,
      "gateId": 1,
      "usherId": "3a7b1c2d-...",
      "deviceScannedAt": "2025-01-01T11:59:30.000Z"
    }
  ]
}
```

---

## How check-in works

1. **Fast lookup:** When someone checks in, the server looks them up in Redis, not PostgreSQL, so it's quick.
2. **Live updates:** After admitting someone, the server sends a message to all gates on the network so they see the update right away.
3. **Saving to the database:** Check-ins are saved to PostgreSQL every 5 seconds. If saving fails, the check-ins are retried.
4. **Startup:** Every time the server starts, it reloads all attendee data from PostgreSQL into Redis.

---
