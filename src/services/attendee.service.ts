import { db } from '../config/db.ts';
import { attendees } from '../db/schema.ts';
import { redis } from '../config/redis.ts';

export class AttendeeService {
  static async createAttendee(data: {
    fullName: string;
    email?: string;
    phone?: string;
    ticketTier?: string;
    accessCode: string;
    qrPayload?: string | null;
    registeredBy: string;
  }) {
    const normalizedAccessCode = data.accessCode.toUpperCase();

    // 1. Insert into PostgreSQL (source of truth)
    const [newAttendee] = await db
      .insert(attendees)
      .values({
        ...data,
        accessCode: normalizedAccessCode,
      })
      .returning();

    if (!newAttendee) {
          throw new Error('Failed to create attendee record in database.');
        }

    // 2. Sync live Redis cache so immediate check-ins hit memory
    try {
      const key = `attendee:${newAttendee.accessCode}`;

      await redis.hset(key, {
        id: newAttendee.id,
        fullName: newAttendee.fullName,
        ticketTier: newAttendee.ticketTier,
        accessCode: newAttendee.accessCode,
        qrPayload: newAttendee.qrPayload || '',
        isCheckedIn: newAttendee.isCheckedIn ? '1' : '0',
        checkedInAt: newAttendee.checkedInAt ? newAttendee.checkedInAt.toISOString() : '',
        checkedInGateId: newAttendee.checkedInGateId ? newAttendee.checkedInGateId.toString() : '',
      });

      if (newAttendee.qrPayload) {
        await redis.set(`qr_map:${newAttendee.qrPayload}`, newAttendee.accessCode);
      }
    } catch (redisError) {
      console.error('Failed to sync newly registered attendee to Redis:', redisError);
    }

    return newAttendee;
  }

  static async getAllAttendees() {
    return await db.select().from(attendees);
  }
}