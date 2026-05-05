export type UserRole = 'admin' | 'member'
export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  title: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  is_blocked: boolean
  due_date: string | null
  created_by: string
  archived_at: string | null
  created_at: string
  updated_at: string
  assignees: User[]
  labels: string[]
}

export interface Comment {
  id: string
  ticket_id: string
  author: User
  body: string
  edited_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

export interface CreateTicketPayload {
  title: string
  description?: string
  priority: TicketPriority
  due_date?: string | null
  assignee_ids?: string[]
  labels?: string[]
}

export interface UpdateTicketPayload {
  title?: string
  description?: string | null
  status?: TicketStatus
  priority?: TicketPriority
  is_blocked?: boolean
  due_date?: string | null
  assignee_ids?: string[]
  labels?: string[]
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: UserRole
}

export interface CreateCommentPayload {
  body: string
}

export interface MetricsResponse {
  tickets_closed_by_month: Array<{ month: string; count: number }>
  tickets_by_status: Record<TicketStatus, number>
  tickets_by_member: Array<{ user: User; active_count: number }>
}

export interface MetricsFilters {
  from?: string
  to?: string
  status?: TicketStatus[]
  assignee_id?: string
}

export interface BoardFilters {
  status?: TicketStatus[]
  priority?: TicketPriority
  assignee_id?: string
  label?: string
  search?: string
  from?: string
  to?: string
}
