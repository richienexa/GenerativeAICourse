import { Router, Request, Response } from 'express';
import { eq, isNull, sql, and, gte, lte, SQL } from 'drizzle-orm';
import { ZodError } from 'zod';
import { db } from '../db';
import { tickets, ticketAssignees, users } from '../db/schema';
import { verifyToken } from '../middleware/auth';
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

export default router;
