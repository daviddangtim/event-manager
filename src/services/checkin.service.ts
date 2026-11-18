import { eq, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { attendees, checkinLogs } from '../db/schema';

export class CheckinService {
  // Fetch full attendee list for local offline caching on gate devices
  static async getOfflineManifest() {
    return await db
      .select({
        id: attendees.id,
        fullName: attendees.fullName,
        ticketTier: attendees.ticketTier,
        accessCode: attendees.accessCode,
        isCheckedIn: attendees.isCheckedIn,
        checkedInAt: attendees.checkedInAt,
        checkedInGateId: attendees.checkedInGateId,
      })
      .from(attendees);
  }


  static async processCheckIn(params: {
    identifier: string;
    isQrScan?: boolean;
    gateId: number;
    usherId: string;
    deviceScannedAt?: Date;
    syncSource?: 'online' | 'lan_sync';
  }) {
    const { identifier, isQrScan = false, gateId, usherId, deviceScannedAt = new Date(), syncSource = 'online' } = params;

    return await db.transaction(async (tx) => {

      const condition = isQrScan
        ? eq(attendees.qrPayload, identifier)
        : eq(attendees.accessCode, identifier.toUpperCase());

      const [attendee] = await tx
        .select()
        .from(attendees)
        .where(condition)
        .for('update');

      if (!attendee) {
        return { status: 'INVALID_CODE', attendee: null };
      }

      if (attendee.isCheckedIn) {
        return {
          status: 'ALREADY_CHECKED_IN',
          attendee,
        };
      }


      const [updatedAttendee] = await tx
        .update(attendees)
        .set({
          isCheckedIn: true,
          checkedInAt: deviceScannedAt,
          checkedInGateId: gateId,
          checkedInBy: usherId,
          updatedAt: new Date(),
        })
        .where(eq(attendees.id, attendee.id))
        .returning();


      await tx.insert(checkinLogs).values({
        attendeeId: attendee.id,
        gateId,
        usherId,
        deviceScannedAt,
        syncSource,
      });

      return { status: 'SUCCESS', attendee: updatedAttendee };
    });
  }

  static async batchSyncCheckIns(
    records: Array<{
      accessCode: string;
      gateId: number;
      usherId: string;
      deviceScannedAt: string;
    }>
  ) {
    const results = [];
    for (const record of records) {
      const res = await this.processCheckIn({
        identifier: record.identifier,
        isQrScan: record.isQrScan || false,
        gateId: record.gateId,
        usherId: record.usherId,
        deviceScannedAt: new Date(record.deviceScannedAt),
        syncSource: 'lan_sync',
      });
      results.push({ accessCode: record.accessCode, result: res.status });
    }
    return results;
  }
}