import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AttendeeService } from '../services/attendee.service.ts';

const MAX_BULK_BATCH_SIZE = 200;

function generateAccessCode(): string {
  return `EVT-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

export class AttendeeController {
  static async registerAttendee(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, email, phone, ticketTier } = req.body;
      const registeredBy = req.user!.id;

     // Access code generator
      const accessCode = generateAccessCode();

      const attendee = await AttendeeService.createAttendee({
        fullName,
        email,
        phone,
        ticketTier,
        accessCode,
        qrPayload,
        registeredBy,
      });

      res.status(201).json({
        message: 'Attendee pre-registered successfully',
        attendee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async bulkRegisterAttendees(req: Request, res: Response, next: NextFunction) {
    try {
      const registeredBy = req.user!.id;
      const rawAttendees = Array.isArray(req.body) ? req.body : req.body?.attendees;

      if (!Array.isArray(rawAttendees) || rawAttendees.length === 0) {
        return res.status(400).json({
          message: 'Provide a non-empty attendees array.',
        });
      }

      if (rawAttendees.length > MAX_BULK_BATCH_SIZE) {
        return res.status(400).json({
          message: `Batch size cannot exceed ${MAX_BULK_BATCH_SIZE} attendees per request`,
        });
      }

      const invalidIndex = rawAttendees.findIndex(
        (item) => !item || typeof item.fullName !== 'string' || !item.fullName.trim()
      );

      if (invalidIndex !== -1) {
        return res.status(400).json({
          message: `Attendee at index ${invalidIndex} is missing a valid fullName.`,
        });
      }

      const usedCodes = new Set<string>();
      const itemsWithCodes = rawAttendees.map((item) => {
        let accessCode
      })


    } catch () {
      
    }
  }

  static async getAllAttendees(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await AttendeeService.getAllAttendees();
      res.status(200).json({ count: list.length, attendees: list });
    } catch (error) {
      next(error);
    }
  }
}