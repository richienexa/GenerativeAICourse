import type { AxiosResponse } from 'axios'
import client from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { MOCK_USERS, MOCK_TICKETS, MOCK_COMMENTS } from './data'
import type { Ticket, Comment, User } from '@/types'

// Estado mutable en memoria — simula la base de datos durante la sesión
let tickets: Ticket[] = structuredClone(MOCK_TICKETS)
let comments: Comment[] = structuredClone(MOCK_COMMENTS)
let users: User[] = structuredClone(MOCK_USERS)

function ok(data: unknown, config: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: config as never,
    request: {},
  }
}

function fail(status: number, message: string, config: unknown): AxiosResponse {
  const err = Object.assign(new Error(message), {
    response: { data: { message }, status, config },
  })
  throw err
}

export function setupMocks() {
  // Auto-login como Laura (admin) — cambiar a marcos/sofia para probar rol member
  const mockUser = MOCK_USERS[0]
  useAuthStore.getState().setAuth(mockUser, 'mock-access-token')

  // Reemplaza el adapter de axios por una función que resuelve contra los mocks
  client.defaults.adapter = async (config) => {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    const body = config.data ? JSON.parse(config.data as string) : {}

    await new Promise((r) => setTimeout(r, 150)) // latencia simulada

    // ── Auth ────────────────────────────────────────────────────────────────
    if (url === '/auth/me' && method === 'get') return ok(mockUser, config)
    if (url === '/auth/refresh' && method === 'post') return ok({ accessToken: 'mock-access-token' }, config)
    if (url === '/auth/logout' && method === 'post') return ok({}, config)

    // ── Users ───────────────────────────────────────────────────────────────
    if (url === '/users' && method === 'get') return ok(users, config)

    const userMatch = url.match(/^\/users\/(.+)$/)
    if (userMatch && method === 'patch') {
      const idx = users.findIndex((u) => u.id === userMatch[1])
      if (idx === -1) return fail(404, 'Usuario no encontrado', config)
      users[idx] = { ...users[idx], ...body, updated_at: new Date().toISOString() }
      return ok(users[idx], config)
    }

    // ── Tickets ─────────────────────────────────────────────────────────────
    if (url === '/tickets' && method === 'get') {
      const params = config.params as Record<string, string> | undefined
      let result = tickets.filter((t) => t.archived_at === null)
      if (params?.status) result = result.filter((t) => t.status === params.status)
      if (params?.priority) result = result.filter((t) => t.priority === params.priority)
      if (params?.assignee_id) result = result.filter((t) => t.assignees.some((a) => a.id === params.assignee_id))
      if (params?.label) result = result.filter((t) => t.labels.includes(params.label))
      if (params?.search) {
        const q = params.search.toLowerCase()
        result = result.filter((t) => t.title.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false))
      }
      const page = Number(params?.page ?? 1)
      const limit = Number(params?.limit ?? 50)
      const paged = result.slice((page - 1) * limit, page * limit)
      return ok({ data: paged, page, limit }, config)
    }

    if (url === '/tickets' && method === 'post') {
      const assignees = users.filter((u) => (body.assignee_ids ?? []).includes(u.id))
      const newTicket: Ticket = {
        id: crypto.randomUUID(),
        title: body.title,
        description: body.description ?? null,
        status: 'todo',
        priority: body.priority,
        is_blocked: false,
        due_date: body.due_date ?? null,
        created_by: mockUser.id,
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignees,
        labels: body.labels ?? [],
      }
      tickets.push(newTicket)
      return ok(newTicket, config)
    }

    const ticketMatch = url.match(/^\/tickets\/([^/]+)$/)
    if (ticketMatch) {
      const id = ticketMatch[1]
      const idx = tickets.findIndex((t) => t.id === id)

      if (method === 'get') {
        if (idx === -1) return fail(404, 'Ticket no encontrado', config)
        return ok(tickets[idx], config)
      }

      if (method === 'patch') {
        if (idx === -1) return fail(404, 'Ticket no encontrado', config)
        const assignees = body.assignee_ids
          ? users.filter((u) => body.assignee_ids.includes(u.id))
          : tickets[idx].assignees
        tickets[idx] = {
          ...tickets[idx],
          ...body,
          assignees,
          updated_at: new Date().toISOString(),
        }
        return ok(tickets[idx], config)
      }

      if (method === 'delete') {
        if (idx === -1) return fail(404, 'Ticket no encontrado', config)
        tickets[idx] = { ...tickets[idx], archived_at: new Date().toISOString() }
        return ok({}, config)
      }
    }

    // ── Comments ─────────────────────────────────────────────────────────────
    const commentsMatch = url.match(/^\/tickets\/([^/]+)\/comments$/)
    if (commentsMatch) {
      const ticketId = commentsMatch[1]
      if (method === 'get') return ok(comments.filter((c) => c.ticket_id === ticketId), config)
      if (method === 'post') {
        const newComment: Comment = {
          id: crypto.randomUUID(),
          ticket_id: ticketId,
          author: mockUser,
          body: body.body,
          edited_at: null,
          archived_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        comments.push(newComment)
        return ok(newComment, config)
      }
    }

    const commentMatch = url.match(/^\/comments\/(.+)$/)
    if (commentMatch) {
      const idx = comments.findIndex((c) => c.id === commentMatch[1])
      if (method === 'delete') {
        if (idx !== -1) comments[idx] = { ...comments[idx], archived_at: new Date().toISOString() }
        return ok({}, config)
      }
      if (method === 'patch') {
        if (idx !== -1) {
          const now = new Date().toISOString()
          comments[idx] = { ...comments[idx], body: body.body, edited_at: now, updated_at: now }
        }
        return ok(comments[idx !== -1 ? idx : 0], config)
      }
    }

    // Activity log mock
    const activityMatch = url.match(/^\/tickets\/([^/]+)\/activity$/)
    if (activityMatch && method === 'get') {
      return ok([], config)
    }

    // ── Metrics ──────────────────────────────────────────────────────────────
    if (url === '/metrics' && method === 'get') {
      const active = tickets.filter((t) => t.archived_at === null)
      return ok(
        {
          tickets_closed_by_month: [
            { month: '2026-04', count: active.filter((t) => t.status === 'done').length },
          ],
          tickets_by_status: {
            todo:        active.filter((t) => t.status === 'todo').length,
            in_progress: active.filter((t) => t.status === 'in_progress').length,
            review:      active.filter((t) => t.status === 'review').length,
            done:        active.filter((t) => t.status === 'done').length,
          },
          tickets_by_member: users.map((u) => ({
            user: u,
            active_count: active.filter((t) => t.assignees.some((a) => a.id === u.id)).length,
          })),
        },
        config,
      )
    }

    // Endpoint no manejado — avisa en consola pero no rompe la app
    console.warn(`[mock] Sin handler para ${method.toUpperCase()} ${url}`)
    return ok({}, config)
  }
}
