import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { eq, gt } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { loginSchema } from '../validators/auth';
import { ZodError } from 'zod';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    const user = userRows[0];

    if (!user || user.archivedAt !== null) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
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

    // Refresh token
    const rawRefreshToken = uuidv4();
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.refreshToken as string | undefined;

  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  const now = new Date();

  // Find all non-expired refresh tokens and check bcrypt
  const tokenRows = await db
    .select()
    .from(refreshTokens)
    .where(gt(refreshTokens.expiresAt, now));

  let matchedToken: (typeof tokenRows)[0] | null = null;
  for (const row of tokenRows) {
    const match = await bcrypt.compare(rawToken, row.tokenHash);
    if (match) {
      matchedToken = row;
      break;
    }
  }

  if (!matchedToken) {
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

  res.json({ accessToken });
});

// POST /api/auth/logout
router.post(
  '/logout',
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies?.refreshToken as string | undefined;

    if (rawToken) {
      // Find and delete matching refresh token
      const tokenRows = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, req.user!.sub));

      for (const row of tokenRows) {
        const match = await bcrypt.compare(rawToken, row.tokenHash);
        if (match) {
          await db
            .delete(refreshTokens)
            .where(eq(refreshTokens.id, row.id));
          break;
        }
      }
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
