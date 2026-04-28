import { z } from 'zod';

export const updateUserSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
