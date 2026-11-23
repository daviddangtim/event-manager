import crypto from 'crypto';
import  QRCode  from 'qrcode';
import { db } from '../config/db.ts';
import { attendees } from '../db/schema.ts';
import { redis } from '../config/redis.ts';

function buildQrPayload(accessCode: string): string{
  const secret = process.env.JWT_SECRET
  const sig = crypto
    .createHmac('sha256', secret)
    .update(accessCode)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();

  
  return `EVTQR:${accessCode}:${sig}`
}

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
    const qrPayload = data.qrPayload?.trim() || buildQrPayload(normalizedAccessCode)

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

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });

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

    return {
      ...newAttendee,
    qrCodeDataUrl
    };
  }

  static async getAllAttendees() {
    return await db.select().from(attendees);
  }
}