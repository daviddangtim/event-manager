import { db } from '../config/db';
import { attendees } from '../db/schema';
import { redis } from '../config/redis';

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
  }
  await pipeline.exec();
  console.log(`Hydrated Redis cache with ${allAttendees.length} attendees.`);
}