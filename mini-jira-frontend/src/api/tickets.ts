import client from './client'
import type { Ticket, CreateTicketPayload, UpdateTicketPayload, BoardFilters } from '@/types'

export interface TicketsPage {
  data: Ticket[]
  page: number
  limit: number
}

export async function fetchTickets(filters: BoardFilters = {}, page = 1): Promise<TicketsPage> {
  const { data } = await client.get<TicketsPage>('/tickets', { params: { ...filters, page } })
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
