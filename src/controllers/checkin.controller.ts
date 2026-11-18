import { Request, Response, NextFunction } from 'express';
import { CheckinService } from '../services/checkin.service';
// import { broadcastToHallGates } from '../server'; // WebSocket helper

export class CheckinController {
  static async downloadManifest(req: Request, res: Response, next: NextFunction) {
    try {
      const manifest = await CheckinService.getOfflineManifest();
      res.status(200).json({
        syncedAt: new Date().toISOString(),
        count: manifest.length,
        data: manifest,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAttendee(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessCode, qrPayload, gateId } = req.body;
      const usherId = req.user!.id; 
      const identifier = accessCode || qrPayload;
      const isQrScan = !!qrPayload;

      if (!identifier || !gateId) {
        return res.status(400).json({ message: 'Access code or QR payload and gateId are required' });
      }

      const outcome = await CheckinService.processCheckIn({
        identifier,
        isQrScan,
        gateId: Number(gateId),
        usherId,
      });

      if (outcome.status === 'INVALID_CODE') {
        return res.status(404).json({ message: 'Invalid ticket or access code.' });
      }

      if (outcome.status === 'ALREADY_CHECKED_IN') {
        return res.status(409).json({
          message: 'Attendee has already entered the hall.',
          checkedInAt: outcome.attendee?.checkedInAt,
          gateId: outcome.attendee?.checkedInGateId,
        });
      }

      return res.status(200).json({
        message: 'Access granted.',
        attendee: outcome.attendee,
      });
    } catch (error) {
      next(error);
    }
  }


  static async syncOfflineBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { records } = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ message: 'records array is required' });
      }

      const syncReport = await CheckinService.batchSyncCheckIns(records);
      return res.status(200).json({ message: 'Sync complete', report: syncReport });
    } catch (error) {
      next(error);
    }
  }
}