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
  archived_at: string | null
  created_at: string
}

export interface CreateTicketPayload {
  title: string
  description?: string
  priority: TicketPriority
  assignee_ids?: string[]
  labels?: string[]
}

export interface UpdateTicketPayload {
  title?: string
  description?: string | null
  status?: TicketStatus
  priority?: TicketPriority
  is_blocked?: boolean
  assignee_ids?: string[]
  labels?: string[]
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
  from?: string
  to?: string
}
