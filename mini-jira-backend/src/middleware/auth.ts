import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'member';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'JWT secret not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    const userRows = await db
      .select({ id: users.id, role: users.role, archivedAt: users.archivedAt })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    const user = userRows[0];
    if (!user || user.archivedAt !== null) {
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }

    req.user = { ...payload, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
