import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTicket, updateTicket, archiveTicket } from '@/api/tickets'
import { TICKETS_KEY } from './useTickets'
import { TICKET_KEY } from './useTicket'
import type { CreateTicketPayload, UpdateTicketPayload } from '@/types'

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => createTicket(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TICKETS_KEY] }),
  })
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateTicketPayload) => updateTicket(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] })
      qc.setQueryData([TICKET_KEY, id], updated)
    },
  })
}

export function useArchiveTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TICKETS_KEY] }),
  })
}
