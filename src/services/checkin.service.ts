import { eq } from "drizzle-orm";
import { db } from "../config/db.ts";
import { attendees, checkinLogs } from "../db/schema.ts";
import { redis, redisPub } from "../config/redis.ts";

// In-memory write-behind queue for asynchronous PostgreSQL batch flushing
const writeQueue: Array<{
  attendeeId: string;
  gateId: number;
  usherId: string;
  scannedAt: Date;
  syncSource: "online" | "lan_sync";
}> = [];

setInterval(async () => {
  if (writeQueue.length === 0) return;
  const batch = [...writeQueue];
  writeQueue.length = 0; 

  try {
    for (const item of batch) {
      await db.transaction(async (tx) => {
        await tx
          .update(attendees)
          .set({
            isCheckedIn: true,
            checkedInAt: item.scannedAt,
            checkedInGateId: item.gateId,
            checkedInBy: item.usherId,
            updatedAt: new Date(),
          })
          .where(eq(attendees.id, item.attendeeId));

        await tx.insert(checkinLogs).values({
          attendeeId: item.attendeeId,
          gateId: item.gateId,
          usherId: item.usherId,
          deviceScannedAt: item.scannedAt,
          syncSource: item.syncSource,
        });
      });
    }
    console.log(`[Write-Behind] Flushed ${batch.length} check-ins to PostgreSQL.`);
  } catch (error) {
    console.error("[Write-Behind Error] Failed to flush batch to PostgreSQL:", error);
    // Re-queue failed items back into the array so they aren't lost
    writeQueue.push(...batch);
  }
}, 5000);

export class CheckinService {
  static async getOfflineManifest() {
    return await db
      .select({
        id: attendees.id,
        fullName: attendees.fullName,
        ticketTier: attendees.ticketTier,
        accessCode: attendees.accessCode,
        qrPayload: attendees.qrPayload,
        isCheckedIn: attendees.isCheckedIn,
        checkedInAt: attendees.checkedInAt,
        checkedInGateId: attendees.checkedInGateId,
      })
      .from(attendees);
  }

  // Live Verification: Uses Redis for microsecond speed and publishes via Pub/Sub
  static async processCheckIn(params: {
      identifier: string; // accessCode or qrPayload
      isQrScan?: boolean;
      gateId: number;
      usherId: string;
      deviceScannedAt?: Date;
      syncSource?: "online" | "lan_sync";
    }) {
      const {
        identifier,
        isQrScan = false,
        gateId,
        usherId,
        deviceScannedAt = new Date(),
        syncSource = "online",
      } = params;
  
      let targetAccessCode = identifier.toUpperCase();
  
      // If it's a QR scan, resolve the qrPayload to the corresponding accessCode using Redis
      if (isQrScan) {
        const mappedCode = await redis.get(`qr_map:${identifier}`);
        if (!mappedCode) {
          return { status: "INVALID_CODE", attendee: null };
        }
        targetAccessCode = mappedCode;
      }
  
      const searchKey = `attendee:${targetAccessCode}`;
  
     
      const cachedAttendee = await redis.hgetall(searchKey);
  
      if (!cachedAttendee || !cachedAttendee.id) {
        return { status: "INVALID_CODE", attendee: null };
      }
  
      if (cachedAttendee.isCheckedIn === "1") {
        return {
          status: "ALREADY_CHECKED_IN",
          attendee: cachedAttendee,
        };
      }
  
    
      await redis.hset(searchKey, {
        isCheckedIn: "1",
        checkedInAt: deviceScannedAt.toISOString(),
        checkedInGateId: gateId.toString(),
      });
  
      await redisPub.publish(
        "hall-gate-sync",
        JSON.stringify({
          accessCode: cachedAttendee.accessCode,
          gateId,
          checkedInAt: deviceScannedAt.toISOString(),
        })
      );
  
      writeQueue.push({
        attendeeId: cachedAttendee.id,
        gateId,
        usherId,
        scannedAt: deviceScannedAt,
        syncSource,
      });
  
      return { 
        status: "SUCCESS", 
        attendee: {
          ...cachedAttendee,
          isCheckedIn: true,
          checkedInAt: deviceScannedAt,
          checkedInGateId: gateId,
        } 
      };
    }

  static async batchSyncCheckIns(
    records: Array<{
      identifier: string;
      isQrScan?: boolean;
      gateId: number;
      usherId: string;
      deviceScannedAt: string;
    }>,
  ) {
    const results = [];
    for (const record of records) {
      try {
        const res = await this.processCheckIn({
          identifier: record.identifier,
          isQrScan: record.isQrScan || false,
          gateId: record.gateId,
          usherId: record.usherId,
          deviceScannedAt: new Date(record.deviceScannedAt),
          syncSource: "lan_sync",
        });
        results.push({
          identifier: record.identifier,
          result: res.status,
          success: res.status === "SUCCESS" || res.status === "ALREADY_CHECKED_IN",
        });
      } catch (err: any) {
        results.push({
          identifier: record.identifier,
          status: "ERROR",
          message: err.message,
          success: false,
        });
      }
    }
    return results;
  }
}