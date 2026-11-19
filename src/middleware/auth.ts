import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export type Role = 'super_admin' | 'registrar' | 'usher';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  assignedGateId?: number | null;
}

const ROLES: readonly Role[] = ['super_admin', 'registrar', 'usher'];


declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}


function isAuthUser(payload: string | JwtPayload): payload is JwtPayload & AuthUser {
  if (typeof payload === 'string') return false;

  const gate = payload.assignedGateId;
  return (
    typeof payload.id === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string' &&
    ROLES.includes(payload.role as Role) &&
    (gate === undefined || gate === null || typeof gate === 'number')
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token missing or malformed' });
  }

  const token = authHeader.slice('Bearer '.length);
  const secret = getSecret(); 

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  if (!isAuthUser(decoded)) {
    return res.status(403).json({ message: 'Invalid token payload' });
  }

  
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    assignedGateId: decoded.assignedGateId ?? null,
  };
  next();
}

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
}