import { db } from '../config/db.ts';
import { attendees } from '../db/schema.ts';
import { redis } from '../config/redis.ts';

export async function hydrateRedisCache() {
  const allAttendees = await db.select().from(attendees);
  
  const pipeline = redis.pipeline();
  for (const attendee of allAttendees) {
    const key = `attendee:${attendee.accessCode}`;
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
      await redis.set(`qr_map:${attendee.qrPayload}`, attendee.accessCode);
    }
  }
  
  await pipeline.exec();
  console.log(`Hydrated Redis cache with ${allAttendees.length} attendees.`);
}