import { Router, Request, Response, NextFunction } from 'express';
import { eq, isNull, sql, and, gte, lte, SQL } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { db } from '../db';
import { tickets, ticketAssignees, users } from '../db/schema';
import { verifyToken } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import { metricsQuerySchema } from '../validators/metrics';

const router = Router();

// GET /api/metrics
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = metricsQuerySchema.parse(req.query);

    // ── 1. tickets_closed_by_month ──────────────────────────────────────────
    // Tickets with status='done', grouped by YYYY-MM, filtered by date range
    const closedConditions: SQL[] = [
      eq(tickets.status, 'done'),
      isNull(tickets.archivedAt),
    ];

    if (query.from) {
      closedConditions.push(gte(tickets.createdAt, new Date(query.from)));
    }
    if (query.to) {
      closedConditions.push(lte(tickets.createdAt, new Date(query.to)));
    }

    const closedByMonthRows = await db
      .select({
        month: sql<string>`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`.as('month'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(tickets)
      .where(and(...closedConditions))
      .groupBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`);

    const tickets_closed_by_month = closedByMonthRows.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }));

    // ── 2. tickets_by_status ───────────────────────────────────────────────
    // Count of non-archived tickets grouped by status
    const statusConditions: SQL[] = [isNull(tickets.archivedAt)];

    if (query.status) {
      statusConditions.push(eq(tickets.status, query.status));
    }
    if (query.from) {
      statusConditions.push(gte(tickets.createdAt, new Date(query.from)));
    }
    if (query.to) {
      statusConditions.push(lte(tickets.createdAt, new Date(query.to)));
    }

    const byStatusRows = await db
      .select({
        status: tickets.status,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(tickets)
      .where(and(...statusConditions))
      .groupBy(tickets.status);

    const tickets_by_status = byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, {});

    // ── 3. tickets_by_member ──────────────────────────────────────────────
    // Active tickets per user via ticket_assignees
    const memberTicketConditions: SQL[] = [isNull(tickets.archivedAt)];

    if (query.status) {
      memberTicketConditions.push(eq(tickets.status, query.status));
    }
    if (query.from) {
      memberTicketConditions.push(gte(tickets.createdAt, new Date(query.from)));
    }
    if (query.to) {
      memberTicketConditions.push(lte(tickets.createdAt, new Date(query.to)));
    }

    const memberUserConditions: SQL[] = [
      eq(ticketAssignees.userId, users.id),
      isNull(users.archivedAt),
    ];

    if (query.assignee_id) {
      memberUserConditions.push(eq(users.id, query.assignee_id));
    }

    const byMemberRows = await db
      .select({
        userId: users.id,
        userName: users.name,
        active_count: sql<number>`COUNT(DISTINCT ${tickets.id})`.as('active_count'),
      })
      .from(ticketAssignees)
      .innerJoin(
        tickets,
        and(
          eq(ticketAssignees.ticketId, tickets.id),
          ...memberTicketConditions,
        ),
      )
      .innerJoin(users, and(...memberUserConditions))
      .groupBy(users.id, users.name);

    const tickets_by_member = byMemberRows.map((r) => ({
      user: { id: r.userId, name: r.userName },
      active_count: Number(r.active_count),
    }));

    res.json({ tickets_closed_by_month, tickets_by_status, tickets_by_member });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// Middleware that accepts token from Authorization header OR ?access_token query param
function verifyTokenOrQuery(req: Request, res: Response, next: NextFunction): void {
  const queryToken = req.query.access_token as string | undefined;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  verifyToken(req, res, next);
}

// GET /api/metrics/export — CSV download
router.get('/export', verifyTokenOrQuery, async (req: Request, res: Response): Promise<void> => {
  try {
    const query = metricsQuerySchema.parse(req.query);

    const closedConditions: SQL[] = [eq(tickets.status, 'done'), isNull(tickets.archivedAt)];
    if (query.from) closedConditions.push(gte(tickets.createdAt, new Date(query.from)));
    if (query.to) closedConditions.push(lte(tickets.createdAt, new Date(query.to)));

    const byStatusConditions: SQL[] = [isNull(tickets.archivedAt)];
    if (query.from) byStatusConditions.push(gte(tickets.createdAt, new Date(query.from)));
    if (query.to) byStatusConditions.push(lte(tickets.createdAt, new Date(query.to)));

    const memberTicketConditions: SQL[] = [isNull(tickets.archivedAt)];
    if (query.from) memberTicketConditions.push(gte(tickets.createdAt, new Date(query.from)));
    if (query.to) memberTicketConditions.push(lte(tickets.createdAt, new Date(query.to)));

    const [closedRows, statusRows, memberRows] = await Promise.all([
      db.select({
        month: sql<string>`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`.as('month'),
        count: sql<number>`COUNT(*)`.as('count'),
      }).from(tickets).where(and(...closedConditions))
        .groupBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${tickets.createdAt}, '%Y-%m')`),

      db.select({ status: tickets.status, count: sql<number>`COUNT(*)`.as('count') })
        .from(tickets).where(and(...byStatusConditions)).groupBy(tickets.status),

      db.select({
        userName: users.name,
        active_count: sql<number>`COUNT(DISTINCT ${tickets.id})`.as('active_count'),
      }).from(ticketAssignees)
        .innerJoin(tickets, and(eq(ticketAssignees.ticketId, tickets.id), ...memberTicketConditions))
        .innerJoin(users, and(eq(ticketAssignees.userId, users.id), isNull(users.archivedAt)))
        .groupBy(users.id, users.name),
    ]);

    const lines: string[] = [];

    lines.push('section,key,value');
    for (const r of closedRows) {
      lines.push(`tickets_closed_by_month,${r.month},${Number(r.count)}`);
    }
    for (const r of statusRows) {
      lines.push(`tickets_by_status,${r.status},${Number(r.count)}`);
    }
    for (const r of memberRows) {
      lines.push(`tickets_by_member,${r.userName},${Number(r.active_count)}`);
    }

    const from = query.from ?? 'all';
    const to = query.to ?? 'all';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="metrics_${from}_${to}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;
