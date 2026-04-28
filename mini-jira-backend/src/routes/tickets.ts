import { Router, Request, Response } from 'express';
import { eq, and, isNull, inArray, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { db } from '../db';
import {
  tickets,
  ticketAssignees,
  ticketLabels,
  users,
  labels,
} from '../db/schema';
import { verifyToken } from '../middleware/auth';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
} from '../validators/tickets';

const router = Router();

function toTicketResponse(ticket: Record<string, unknown> & {
  isBlocked: boolean;
  createdById: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignees: unknown[];
  labels: { id: string; name: string }[];
}) {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    is_blocked: ticket.isBlocked,
    created_by: ticket.createdById,
    archived_at: ticket.archivedAt,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
    assignees: ticket.assignees,
    labels: ticket.labels.map((l) => l.name),
  };
}

// Helper: fetch full ticket with assignees and labels
async function getTicketWithRelations(ticketId: string) {
  const ticketRows = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), isNull(tickets.archivedAt)))
    .limit(1);

  const ticket = ticketRows[0];
  if (!ticket) return null;

  const assigneeRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(ticketAssignees)
    .innerJoin(users, eq(ticketAssignees.userId, users.id))
    .where(eq(ticketAssignees.ticketId, ticketId));

  const labelRows = await db
    .select({
      id: labels.id,
      name: labels.name,
    })
    .from(ticketLabels)
    .innerJoin(labels, eq(ticketLabels.labelId, labels.id))
    .where(eq(ticketLabels.ticketId, ticketId));

  return {
    ...ticket,
    assignees: assigneeRows,
    labels: labelRows,
  };
}

// GET /api/tickets
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = ticketQuerySchema.parse(req.query);

    // Build filters
    const conditions = [isNull(tickets.archivedAt)];

    if (query.status && query.status.length > 0) {
      conditions.push(inArray(tickets.status, query.status));
    }

    if (query.priority) {
      conditions.push(eq(tickets.priority, query.priority));
    }

    if (query.from) {
      conditions.push(gte(tickets.createdAt, new Date(query.from)));
    }

    if (query.to) {
      conditions.push(lte(tickets.createdAt, new Date(query.to)));
    }

    let ticketRows = await db
      .select()
      .from(tickets)
      .where(and(...conditions));

    // Filter by assignee_id
    if (query.assignee_id) {
      const assigneeTicketIds = await db
        .select({ ticketId: ticketAssignees.ticketId })
        .from(ticketAssignees)
        .where(eq(ticketAssignees.userId, query.assignee_id));

      const ids = assigneeTicketIds.map((r) => r.ticketId);
      ticketRows = ticketRows.filter((t) => ids.includes(t.id));
    }

    // Filter by label name
    if (query.label) {
      const labelRows = await db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.name, query.label), isNull(labels.archivedAt)));

      if (labelRows.length === 0) {
        res.json([]);
        return;
      }

      const labelId = labelRows[0].id;
      const labelTicketIds = await db
        .select({ ticketId: ticketLabels.ticketId })
        .from(ticketLabels)
        .where(eq(ticketLabels.labelId, labelId));

      const ids = labelTicketIds.map((r) => r.ticketId);
      ticketRows = ticketRows.filter((t) => ids.includes(t.id));
    }

    if (ticketRows.length === 0) {
      res.json([]);
      return;
    }

    const ticketIds = ticketRows.map((t) => t.id);

    // Batch fetch assignees
    const allAssignees = await db
      .select({
        ticketId: ticketAssignees.ticketId,
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(ticketAssignees)
      .innerJoin(users, eq(ticketAssignees.userId, users.id))
      .where(inArray(ticketAssignees.ticketId, ticketIds));

    // Batch fetch labels
    const allLabels = await db
      .select({
        ticketId: ticketLabels.ticketId,
        id: labels.id,
        name: labels.name,
      })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.labelId, labels.id))
      .where(inArray(ticketLabels.ticketId, ticketIds));

    const result = ticketRows.map((ticket) =>
      toTicketResponse({
        ...ticket,
        assignees: allAssignees
          .filter((a) => a.ticketId === ticket.id)
          .map(({ ticketId: _tid, ...rest }) => rest),
        labels: allLabels
          .filter((l) => l.ticketId === ticket.id)
          .map(({ ticketId: _tid, ...rest }) => rest),
      }),
    );

    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/tickets/:id
router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const ticket = await getTicketWithRelations(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(toTicketResponse(ticket));
});

// POST /api/tickets
router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createTicketSchema.parse(req.body);

    const ticketId = uuidv4();
    const now = new Date();

    await db.insert(tickets).values({
      id: ticketId,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      isBlocked: data.is_blocked,
      createdById: req.user!.sub,
      createdAt: now,
      updatedAt: now,
    });

    // Insert assignees
    await db.insert(ticketAssignees).values(
      data.assignee_ids.map((userId) => ({ ticketId, userId })),
    );

    // Insert labels
    if (data.label_ids && data.label_ids.length > 0) {
      await db.insert(ticketLabels).values(
        data.label_ids.map((labelId) => ({ ticketId, labelId })),
      );
    }

    const created = await getTicketWithRelations(ticketId);
    res.status(201).json(toTicketResponse(created!));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = updateTicketSchema.parse(req.body);
    const { id } = req.params;

    const existing = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.archivedAt)))
      .limit(1);

    if (!existing[0]) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateValues.title = data.title;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.priority !== undefined) updateValues.priority = data.priority;
    if (data.is_blocked !== undefined) updateValues.isBlocked = data.is_blocked;

    await db.update(tickets).set(updateValues).where(eq(tickets.id, id));

    // Replace assignees
    if (data.assignee_ids !== undefined) {
      await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
      await db.insert(ticketAssignees).values(
        data.assignee_ids.map((userId) => ({ ticketId: id, userId })),
      );
    }

    // Replace labels
    if (data.label_ids !== undefined) {
      await db.delete(ticketLabels).where(eq(ticketLabels.ticketId, id));
      if (data.label_ids.length > 0) {
        await db.insert(ticketLabels).values(
          data.label_ids.map((labelId) => ({ ticketId: id, labelId })),
        );
      }
    }

    const updated = await getTicketWithRelations(id);
    res.json(toTicketResponse(updated!));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const existing = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, id), isNull(tickets.archivedAt)))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  await db
    .update(tickets)
    .set({ archivedAt: new Date() })
    .where(eq(tickets.id, id));

  res.status(204).send();
});

export default router;
