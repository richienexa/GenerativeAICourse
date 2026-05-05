import { Router, Request, Response } from 'express';
import { eq, and, isNull, inArray, gte, lte, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { db } from '../db';
import {
  tickets,
  ticketAssignees,
  ticketLabels,
  users,
  labels,
  activityLogs,
} from '../db/schema';
import { verifyToken } from '../middleware/auth';
import { validateParam } from '../middleware/validateUuid';
import { broadcastBoardUpdate } from './sse';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
} from '../validators/tickets';

const router = Router();

function toTicketResponse(ticket: Record<string, unknown> & {
  isBlocked: boolean;
  dueDate: Date | null;
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
    due_date: ticket.dueDate ? (ticket.dueDate as Date).toISOString() : null,
    created_by: ticket.createdById,
    archived_at: ticket.archivedAt,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
    assignees: ticket.assignees,
    labels: ticket.labels.map((l) => l.name),
  };
}

async function getTicketWithRelations(ticketId: string) {
  const [ticketRows, assigneeRows, labelRows] = await Promise.all([
    db.select().from(tickets)
      .where(and(eq(tickets.id, ticketId), isNull(tickets.archivedAt)))
      .limit(1),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(ticketAssignees)
      .innerJoin(users, eq(ticketAssignees.userId, users.id))
      .where(eq(ticketAssignees.ticketId, ticketId)),
    db.select({ id: labels.id, name: labels.name })
      .from(ticketLabels)
      .innerJoin(labels, eq(ticketLabels.labelId, labels.id))
      .where(eq(ticketLabels.ticketId, ticketId)),
  ]);

  const ticket = ticketRows[0];
  if (!ticket) return null;

  return { ...ticket, assignees: assigneeRows, labels: labelRows };
}

async function logActivity(
  ticketId: string,
  userId: string,
  action: string,
  field?: string,
  oldValue?: string | null,
  newValue?: string | null,
) {
  await db.insert(activityLogs).values({
    id: uuidv4(),
    ticketId,
    userId,
    action,
    field: field ?? null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
  });
}

// GET /api/tickets
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = ticketQuerySchema.parse(req.query);

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

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(or(like(tickets.title, pattern), like(tickets.description, pattern))!);
    }

    if (query.assignee_id) {
      const rows = await db
        .select({ ticketId: ticketAssignees.ticketId })
        .from(ticketAssignees)
        .where(eq(ticketAssignees.userId, query.assignee_id));
      const ids = rows.map((r) => r.ticketId);
      if (ids.length === 0) {
        res.json({ data: [], page: 1, limit: query.limit });
        return;
      }
      conditions.push(inArray(tickets.id, ids));
    }

    if (query.label) {
      const labelRows = await db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.name, query.label), isNull(labels.archivedAt)));
      if (labelRows.length === 0) {
        res.json({ data: [], page: 1, limit: query.limit });
        return;
      }
      const ltRows = await db
        .select({ ticketId: ticketLabels.ticketId })
        .from(ticketLabels)
        .where(eq(ticketLabels.labelId, labelRows[0].id));
      const ids = ltRows.map((r) => r.ticketId);
      if (ids.length === 0) {
        res.json({ data: [], page: 1, limit: query.limit });
        return;
      }
      conditions.push(inArray(tickets.id, ids));
    }

    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const ticketRows = await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    if (ticketRows.length === 0) {
      res.json({ data: [], page, limit });
      return;
    }

    const ticketIds = ticketRows.map((t) => t.id);

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

    res.json({ data: result, page, limit });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// GET /api/tickets/:id
router.get('/:id', verifyToken, validateParam('id'), async (req: Request, res: Response): Promise<void> => {
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
      dueDate: data.due_date ? new Date(data.due_date) : null,
      createdById: req.user!.sub,
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all([
      db.insert(ticketAssignees).values(
        data.assignee_ids.map((userId) => ({ ticketId, userId })),
      ),
      ...(data.label_ids && data.label_ids.length > 0
        ? [db.insert(ticketLabels).values(data.label_ids.map((labelId) => ({ ticketId, labelId })))]
        : []),
    ]);

    await logActivity(ticketId, req.user!.sub, 'created');

    const created = await getTicketWithRelations(ticketId);
    const createdResponse = toTicketResponse(created!);
    broadcastBoardUpdate('ticket:created', createdResponse);
    res.status(201).json(createdResponse);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PATCH /api/tickets/:id
router.patch('/:id', verifyToken, validateParam('id'), async (req: Request, res: Response): Promise<void> => {
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

    const isOwner = existing[0].createdById === req.user!.sub;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'You do not have permission to modify this ticket' });
      return;
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    const activityEntries: Array<{ field: string; oldValue: string; newValue: string }> = [];

    if (data.title !== undefined && data.title !== existing[0].title) {
      activityEntries.push({ field: 'title', oldValue: existing[0].title, newValue: data.title });
      updateValues.title = data.title;
    }
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.status !== undefined && data.status !== existing[0].status) {
      activityEntries.push({ field: 'status', oldValue: existing[0].status, newValue: data.status });
      updateValues.status = data.status;
    }
    if (data.priority !== undefined && data.priority !== existing[0].priority) {
      activityEntries.push({ field: 'priority', oldValue: existing[0].priority, newValue: data.priority });
      updateValues.priority = data.priority;
    }
    if (data.is_blocked !== undefined) updateValues.isBlocked = data.is_blocked;
    if (data.due_date !== undefined) {
      updateValues.dueDate = data.due_date ? new Date(data.due_date) : null;
    }

    await Promise.all([
      db.update(tickets).set(updateValues).where(eq(tickets.id, id)),
      ...(data.assignee_ids !== undefined
        ? [db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id))]
        : []),
      ...(data.label_ids !== undefined
        ? [db.delete(ticketLabels).where(eq(ticketLabels.ticketId, id))]
        : []),
    ]);

    await Promise.all([
      ...(data.assignee_ids !== undefined && data.assignee_ids.length > 0
        ? [db.insert(ticketAssignees).values(data.assignee_ids.map((userId) => ({ ticketId: id, userId })))]
        : []),
      ...(data.label_ids !== undefined && data.label_ids.length > 0
        ? [db.insert(ticketLabels).values(data.label_ids.map((labelId) => ({ ticketId: id, labelId })))]
        : []),
    ]);

    await Promise.all(
      activityEntries.map((e) =>
        logActivity(id, req.user!.sub, 'updated', e.field, e.oldValue, e.newValue),
      ),
    );

    const updated = await getTicketWithRelations(id);
    const updatedResponse = toTicketResponse(updated!);
    broadcastBoardUpdate('ticket:updated', updatedResponse);
    res.json(updatedResponse);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', verifyToken, validateParam('id'), async (req: Request, res: Response): Promise<void> => {
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

  const isOwner = existing[0].createdById === req.user!.sub;
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'You do not have permission to delete this ticket' });
    return;
  }

  await db
    .update(tickets)
    .set({ archivedAt: new Date() })
    .where(eq(tickets.id, id));

  broadcastBoardUpdate('ticket:deleted', { id });
  res.status(204).send();
});

// GET /api/tickets/:id/activity
router.get('/:id/activity', verifyToken, validateParam('id'), async (req: Request, res: Response): Promise<void> => {
  const ticket = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, req.params.id), isNull(tickets.archivedAt)))
    .limit(1);

  if (!ticket[0]) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  const logs = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      field: activityLogs.field,
      oldValue: activityLogs.oldValue,
      newValue: activityLogs.newValue,
      createdAt: activityLogs.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.ticketId, req.params.id))
    .orderBy(activityLogs.createdAt);

  res.json(logs);
});

export default router;
