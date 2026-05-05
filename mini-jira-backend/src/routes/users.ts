import { Router, Request, Response } from 'express';
import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { validateParam } from '../middleware/validateUuid';
import { updateUserRoleSchema, updateUserProfileSchema, createUserSchema } from '../validators/users';

const router = Router();

function userResponse(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  };
}

// GET /api/users
router.get('/', verifyToken, async (_req: Request, res: Response): Promise<void> => {
  const userRows = await db
    .select()
    .from(users)
    .where(isNull(users.archivedAt));

  res.json(userRows.map(userResponse));
});

// POST /api/users — admin creates a new user
router.post('/', verifyToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing[0]) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const id = uuidv4();
    const now = new Date();

    await db.insert(users).values({
      id,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.select().from(users).where(eq(users.id, id)).limit(1);
    res.status(201).json(userResponse(created[0]));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/users/:id — admin updates role, or user updates own profile
router.patch(
  '/:id',
  verifyToken,
  validateParam('id'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const isSelf = req.user!.sub === id;
      const isAdmin = req.user!.role === 'admin';

      if (!isSelf && !isAdmin) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existing[0] || existing[0].archivedAt !== null) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updateValues: Record<string, unknown> = { updatedAt: new Date() };

      if (isAdmin && req.body.role !== undefined) {
        const roleData = updateUserRoleSchema.parse({ role: req.body.role });
        updateValues.role = roleData.role;
      }

      if (isSelf) {
        const profileData = updateUserProfileSchema.parse({
          name: req.body.name,
          password: req.body.password,
        });
        if (profileData.name) updateValues.name = profileData.name;
        if (profileData.password) {
          updateValues.passwordHash = await bcrypt.hash(profileData.password, 12);
        }
      }

      await db.update(users).set(updateValues).where(eq(users.id, id));

      const updated = await db.select().from(users).where(eq(users.id, id)).limit(1);
      res.json(userResponse(updated[0]));
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.errors });
        return;
      }
      throw err;
    }
  },
);

export default router;
