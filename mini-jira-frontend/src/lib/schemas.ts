import { z } from 'zod'

export const ticketSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(120, 'Máximo 120 caracteres')
    .refine((v) => v.trim().length > 0, 'El título no puede estar vacío'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  is_blocked: z.boolean(),
  due_date: z.string().optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
  labels: z
    .array(z.string().max(100))
    .optional()
    .refine(
      (arr) => !arr || arr.every((l) => l.trim().length > 0),
      'Las etiquetas no pueden estar vacías',
    ),
})

export type TicketFormValues = z.infer<typeof ticketSchema>

export const commentSchema = z.object({
  body: z
    .string()
    .min(1, 'El comentario no puede estar vacío')
    .refine((v) => v.trim().length > 0, 'El comentario no puede estar vacío'),
})

export type CommentFormValues = z.infer<typeof commentSchema>

export const metricsFilterSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    status: z.array(z.enum(['todo', 'in_progress', 'review', 'done'])).optional(),
    assignee_id: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) return data.from <= data.to
      return true
    },
    { message: 'La fecha de inicio debe ser anterior a la fecha de fin', path: ['from'] },
  )
