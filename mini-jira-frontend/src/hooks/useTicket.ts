import { useQuery } from '@tanstack/react-query'
import { fetchTicket } from '@/api/tickets'

export const TICKET_KEY = 'ticket'

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: [TICKET_KEY, id],
    queryFn: () => fetchTicket(id!),
    enabled: id !== null,
  })
}
