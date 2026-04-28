import { z } from 'zod';

export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Label name is required')
    .max(100, 'Label name too long'),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
