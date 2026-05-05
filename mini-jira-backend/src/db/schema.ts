import {
  mysqlTable,
  varchar,
  text,
  datetime,
  mysqlEnum,
  boolean,
  int,
  primaryKey,
} from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: mysqlEnum('role', ['admin', 'member']).default('member').notNull(),
  archivedAt: datetime('archived_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  createdTickets: many(tickets),
  assignedTickets: many(ticketAssignees),
  comments: many(comments),
  createdLabels: many(labels),
}));

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export const refreshTokens = mysqlTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// ─── Labels ───────────────────────────────────────────────────────────────────

export const labels = mysqlTable('labels', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdById: varchar('created_by_id', { length: 36 }).references(
    () => users.id,
  ),
  archivedAt: datetime('archived_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const labelsRelations = relations(labels, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [labels.createdById],
    references: [users.id],
  }),
  ticketLabels: many(ticketLabels),
}));

// ─── Tickets ──────────────────────────────────────────────────────────────────

export const tickets = mysqlTable('tickets', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['todo', 'in_progress', 'review', 'done'])
    .default('todo')
    .notNull(),
  priority: mysqlEnum('priority', ['low', 'medium', 'high'])
    .default('medium')
    .notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  dueDate: datetime('due_date'),
  createdById: varchar('created_by_id', { length: 36 }).references(
    () => users.id,
  ),
  archivedAt: datetime('archived_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tickets.createdById],
    references: [users.id],
  }),
  assignees: many(ticketAssignees),
  labels: many(ticketLabels),
  comments: many(comments),
  activityLogs: many(activityLogs),
}));

// ─── Ticket Assignees ─────────────────────────────────────────────────────────

export const ticketAssignees = mysqlTable(
  'ticket_assignees',
  {
    ticketId: varchar('ticket_id', { length: 36 })
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ticketId, table.userId] }),
  }),
);

export const ticketAssigneesRelations = relations(
  ticketAssignees,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketAssignees.ticketId],
      references: [tickets.id],
    }),
    user: one(users, {
      fields: [ticketAssignees.userId],
      references: [users.id],
    }),
  }),
);

// ─── Ticket Labels ────────────────────────────────────────────────────────────

export const ticketLabels = mysqlTable(
  'ticket_labels',
  {
    ticketId: varchar('ticket_id', { length: 36 })
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    labelId: varchar('label_id', { length: 36 })
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ticketId, table.labelId] }),
  }),
);

export const ticketLabelsRelations = relations(ticketLabels, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketLabels.ticketId],
    references: [tickets.id],
  }),
  label: one(labels, {
    fields: [ticketLabels.labelId],
    references: [labels.id],
  }),
}));

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = mysqlTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  ticketId: varchar('ticket_id', { length: 36 })
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 36 }).references(() => users.id),
  body: text('body').notNull(),
  editedAt: datetime('edited_at'),
  archivedAt: datetime('archived_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const commentsRelations = relations(comments, ({ one, many }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  attachments: many(attachments),
}));

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachments = mysqlTable('attachments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  commentId: varchar('comment_id', { length: 36 })
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: int('size', { unsigned: true }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  archivedAt: datetime('archived_at'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  comment: one(comments, {
    fields: [attachments.commentId],
    references: [comments.id],
  }),
}));

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogs = mysqlTable('activity_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  ticketId: varchar('ticket_id', { length: 36 })
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  field: varchar('field', { length: 100 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  ticket: one(tickets, {
    fields: [activityLogs.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
