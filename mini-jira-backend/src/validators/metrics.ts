import { z } from 'zod';

export const metricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z
    .enum(['todo', 'in_progress', 'review', 'done'])
    .optional(),
  assignee_id: z.string().uuid().optional(),
});

export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
