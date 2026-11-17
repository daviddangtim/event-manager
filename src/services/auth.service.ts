import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async login(email: string, pass: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw { statusCode: 401, message: 'Invalid credentials' };

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) throw { statusCode: 401, message: 'Invalid credentials' };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, assignedGateId: user.assignedGateId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '12h' }
    );

    return { token, role: user.role, fullName: user.fullName };
  }
}