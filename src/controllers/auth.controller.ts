import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '../config/db.ts';
import { users } from '../db/schema.ts';
import { AuthService } from '../services/auth.service.ts';

const ALLOWED_CREATED_ROLES = ['registrar', 'usher'] as const;
type AllowedCreatedRole = (typeof ALLOWED_CREATED_ROLES)[number]

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }
      const result = await AuthService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async registerStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, email, password, role, assignedGateId } = req.body;
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
              return res.status(400).json({ message: 'fullName is required.' });
            }
      
            if (!email || typeof email !== 'string' || !email.trim()) {
              return res.status(400).json({ message: 'email is required.' });
            }
      
            if (!password || typeof password !== 'string' || password.length < 8) {
              return res.status(400).json({
                message: 'password is required and must be at least 8 characters.',
              });
            }
            if (!ALLOWED_CREATED_ROLES.includes(role)) {
                    return res.status(400).json({
                      message: `role must be one of: ${ALLOWED_CREATED_ROLES.join(', ')}.`,
                    });
                  }
            
                  let normalizedGateId: number | null = null;
                  if (role === 'usher' && assignedGateId !== undefined && assignedGateId !== null && assignedGateId !== '') {
                    if (typeof assignedGateId === 'boolean') {
                      return res.status(400).json({
                        message: 'assignedGateId must be an integer between 1 and 5.',
                      });
                    }
                    const parsedGate = Number(assignedGateId);
                    if (!Number.isInteger(parsedGate) || parsedGate < 1 || parsedGate > 5) {
                      return res.status(400).json({
                        message: 'assignedGateId must be an integer between 1 and 5.',
                      });
                    }
                    normalizedGateId = parsedGate;
                  }
            
                  const normalizedEmail = email.trim().toLowerCase();
            
                  const existing = await db
                    .select({ id: users.id })
                    .from(users)
                    .where(eq(users.email, normalizedEmail))
                    .limit(1);
            
                  if (existing.length > 0) {
                    return res.status(409).json({
                      message: 'A user with this email already exists.',
                    });
                  }
            
                  const passwordHash = await bcrypt.hash(password, 10);
            
                  const [createdUser] = await db
                    .insert(users)
                    .values({
                      fullName: fullName.trim(),
                      email: normalizedEmail,
                      passwordHash,
                      role: role as AllowedCreatedRole,
                      assignedGateId: role === 'usher' ? normalizedGateId : null,
                    })
                    .returning({
                      id: users.id,
                      fullName: users.fullName,
                      email: users.email,
                      role: users.role,
                      assignedGateId: users.assignedGateId,
                      createdAt: users.createdAt,
                    });
            
                  return res.status(201).json({
                    message: `${role} account created successfully.`,
                    user: createdUser,
                  });
    } catch(error) {
      next(error)
    }
  }
}