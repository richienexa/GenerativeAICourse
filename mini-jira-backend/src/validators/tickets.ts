import { z } from 'zod';

const statusEnum = z.enum(['todo', 'in_progress', 'review', 'done']);
const priorityEnum = z.enum(['low', 'medium', 'high']);

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
  description: z.string().max(10000).optional().nullable(),
  status: statusEnum.default('todo'),
  priority: priorityEnum.default('medium'),
  is_blocked: z.boolean().default(false),
  assignee_ids: z
    .array(z.string().uuid('Invalid assignee ID'))
    .min(1, 'At least one assignee is required'),
  label_ids: z.array(z.string().uuid('Invalid label ID')).optional().default([]),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  is_blocked: z.boolean().optional(),
  assignee_ids: z.array(z.string().uuid('Invalid assignee ID')).optional(),
  label_ids: z.array(z.string().uuid('Invalid label ID')).optional(),
});

export const ticketQuerySchema = z.object({
  status: z
    .union([z.array(statusEnum), statusEnum])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  priority: priorityEnum.optional(),
  assignee_id: z.string().uuid().optional(),
  label: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
