import { db } from '../config/db';
import { attendees } from '../db/schema';

export class AttendeeService {
  static async createAttendee(data: {
    fullName: string;
    email?: string;
    phone?: string;
    ticketTier?: string;
    accessCode: string;
    registeredBy: string;
  }) {
    const [newAttendee] = await db.insert(attendees).values(data).returning();
    return newAttendee;
  }

  static async getAllAttendees() {
    return await db.select().from(attendees);
  }
}