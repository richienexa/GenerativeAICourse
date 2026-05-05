import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '@/api/tickets'
import { useBoardStore } from '@/store/boardStore'

export const TICKETS_KEY = 'tickets'

export function useTickets(page = 1) {
  const filters = useBoardStore((s) => s.filters)
  return useQuery({
    queryKey: [TICKETS_KEY, filters, page],
    queryFn: () => fetchTickets(filters, page),
  })
}
