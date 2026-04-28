import { Router, Request, Response } from 'express';
import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { db } from '../db';
import { labels } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { createLabelSchema } from '../validators/labels';

const router = Router();

// GET /api/labels
router.get('/', verifyToken, async (_req: Request, res: Response): Promise<void> => {
  const labelRows = await db
    .select()
    .from(labels)
    .where(isNull(labels.archivedAt));

  res.json(labelRows);
});

// POST /api/labels
router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createLabelSchema.parse(req.body);

    const labelId = uuidv4();
    const now = new Date();

    await db.insert(labels).values({
      id: labelId,
      name: data.name,
      createdById: req.user!.sub,
      createdAt: now,
    });

    const created = await db
      .select()
      .from(labels)
      .where(eq(labels.id, labelId))
      .limit(1);

    res.status(201).json(created[0]);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/labels/:id
router.delete('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const existing = await db
    .select()
    .from(labels)
    .where(eq(labels.id, id))
    .limit(1);

  if (!existing[0] || existing[0].archivedAt !== null) {
    res.status(404).json({ error: 'Label not found' });
    return;
  }

  await db
    .update(labels)
    .set({ archivedAt: new Date() })
    .where(eq(labels.id, id));

  res.status(204).send();
});

export default router;
