import client from './client'
import type { Ticket, CreateTicketPayload, UpdateTicketPayload, BoardFilters } from '@/types'

export async function fetchTickets(filters: BoardFilters = {}): Promise<Ticket[]> {
  const { data } = await client.get<Ticket[]>('/tickets', { params: filters })
  return data
}

export async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await client.get<Ticket>(`/tickets/${id}`)
  return data
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const { data } = await client.post<Ticket>('/tickets', payload)
  return data
}

export async function updateTicket(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
  const { data } = await client.patch<Ticket>(`/tickets/${id}`, payload)
  return data
}

export async function archiveTicket(id: string): Promise<void> {
  await client.delete(`/tickets/${id}`)
}
