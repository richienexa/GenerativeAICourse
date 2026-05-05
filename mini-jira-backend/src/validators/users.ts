import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'member']).default('member'),
});

// Keep legacy alias
export const updateUserSchema = updateUserRoleSchema;

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
