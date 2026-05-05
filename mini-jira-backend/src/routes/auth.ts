import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, lte } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { loginSchema } from '../validators/auth';
import { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please try again later' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    const user = userRows[0];

    if (!user || user.archivedAt !== null) {
      console.warn(JSON.stringify({ event: 'login_failed', reason: 'user_not_found', ip: req.ip, ts: new Date().toISOString() }));
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      console.warn(JSON.stringify({ event: 'login_failed', reason: 'invalid_password', userId: user.id, ip: req.ip, ts: new Date().toISOString() }));
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT secret not configured' });
      return;
    }

    // Access token
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '30m' },
    );

    // Refresh token — SHA-256 para lookup O(1) (el token ya es aleatorio de 128 bits)
    const rawRefreshToken = uuidv4();
    const tokenHash = createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Limpiar tokens expirados del usuario antes de insertar el nuevo
    await db.delete(refreshTokens).where(
      and(eq(refreshTokens.userId, user.id), lte(refreshTokens.expiresAt, new Date())),
    );

    await db.insert(refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: err.errors,
      });
      return;
    }
    throw err;
  }
});

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.refreshToken as string | undefined;

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  const hash = createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();

  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hash))
    .limit(1);

  const matchedToken = tokenRows[0];

  if (!matchedToken || matchedToken.expiresAt < now) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'JWT secret not configured' });
    return;
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, matchedToken.userId))
    .limit(1);

  const user = userRows[0];
  if (!user || user.archivedAt !== null) {
    res.status(401).json({ error: 'User not found or archived' });
    return;
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    jwtSecret,
    { expiresIn: '30m' },
  );

  // Rotar el refresh token: eliminar el viejo, emitir uno nuevo
  const newRawRefreshToken = uuidv4();
  const newTokenHash = createHash('sha256').update(newRawRefreshToken).digest('hex');
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
  await db.insert(refreshTokens).values({
    id: uuidv4(),
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
  });

  res.cookie('refreshToken', newRawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    expires: newExpiresAt,
    path: '/',
  });

  res.json({ accessToken });
});

// POST /api/auth/logout
router.post(
  '/logout',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies?.refreshToken as string | undefined;

    if (rawToken) {
      const hash = createHash('sha256').update(rawToken).digest('hex');
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
    }

    res.clearCookie('refreshToken', { path: '/' });
    res.status(204).send();
  },
);

// GET /api/auth/me
router.get(
  '/me',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.sub))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  },
);

export default router;
