import { Request, Response, NextFunction } from 'express';
import { AttendeeService } from '../services/attendee.service';
import crypto from 'crypto';

export class AttendeeController {
  static async registerAttendee(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, email, phone, ticketTier } = req.body;
      const registeredBy = req.user!.id;

     // Access code generator
      const accessCode = `EVT-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const attendee = await AttendeeService.createAttendee({
        fullName,
        email,
        phone,
        ticketTier,
        accessCode,
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
    res.status(501).json({ message: 'Bulk registration coming soon' });
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