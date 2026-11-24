import crypto from 'crypto';
import  QRCode  from 'qrcode';
import { db } from '../config/db.ts';
import { attendees } from '../db/schema.ts';
import { redis } from '../config/redis.ts';

function buildQrPayload(accessCode: string): string{
  const secret = process.env.JWT_SECRET!
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
        qrPayload,
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

  static async createBulkAttendees(
    items: Array<{
      fullName: string;
      email?: string;
      phone?: string;
      ticketTier?: string;
      accessCode: string;
      qrPayload?: string | null;
      registeredBy: string;
    }>
  ) {
    const rowsToInsert = items.map((item) => {
      const normalizedAccessCode = item.accessCode.toUpperCase();
      const qrPayload = item.qrPayload?.trim() || buildQrPayload(normalizedAccessCode);

      return {
        fullName: item.fullName.trim(),
        email: item.email?.trim() || null,
        phone: item.phone?.trim() || null,
        ticketTier: item.ticketTier?.trim() || 'standard',
        accessCode: normalizedAccessCode,
        qrPayload,
        registeredBy: item.registeredBy,
      };
    });

    const insertedAttendees = await db
      .insert(attendees)
      .values(rowsToInsert)
      .returning();

    const results = await Promise.all(
      insertedAttendees.map(async (row) => {
        const payloadForQr = row.qrPayload || buildQrPayload(row.accessCode);
        const qrCodeDataUrl = await QRCode.toDataURL(payloadForQr, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width:300,
        });  
        return {
          ...row,
          qrCodeDataUrl,
        }
      })
    );

    try {
      const pipeline = redis.pipeline();

      for (const attendee of insertedAttendees) {
        const key = `attendee:${attendee.accessCode}`
        pipeline.hset(key, {
          id: attendee.id,
          fullName: attendee.fullName,
          ticketTier: attendee.ticketTier,
          accessCode: attendee.accessCode,
          qrPayload: attendee.qrPayload || '',
          isCheckedIn: attendee.isCheckedIn ? '1' : '0',
          checkedInAt: attendee.checkedInAt ? attendee.checkedInAt.toISOString() : '',
          checkedInGateId: attendee.checkedInGateId ? attendee.checkedInGateId.toString() : '',
        });

        if (attendee.qrPayload) {
          pipeline.set(`qr_map:${attendee.qrPayload}`, attendee.accessCode);
        }
      }

      await pipeline.exec();
    } catch (redisError) {
      console.error('Failed to pipeline bulk attendees into Redis:', redisError);
    }
    return results; 
  }

  static async getAllAttendees() {
    return await db.select().from(attendees);
  }
}