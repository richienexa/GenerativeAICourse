import { Router, Request, Response } from 'express';
import { eq, isNull } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { updateUserSchema } from '../validators/users';

const router = Router();

// GET /api/users
router.get('/', verifyToken, async (_req: Request, res: Response): Promise<void> => {
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(isNull(users.archivedAt));

  res.json(userRows);
});

// PATCH /api/users/:id
router.patch(
  '/:id',
  verifyToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data = updateUserSchema.parse(req.body);

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!existing[0] || existing[0].archivedAt !== null) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await db.update(users).set({ role: data.role }).where(eq(users.id, id));

      const updated = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      res.json(updated[0]);
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
