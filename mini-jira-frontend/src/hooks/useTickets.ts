import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '@/api/tickets'
import { useBoardStore } from '@/store/boardStore'

export const TICKETS_KEY = 'tickets'

export function useTickets() {
  const filters = useBoardStore((s) => s.filters)
  return useQuery({
    queryKey: [TICKETS_KEY, filters],
    queryFn: () => fetchTickets(filters),
  })
}
