import { useQuery } from '@tanstack/react-query'
import { fetchActivity } from '@/api/activity'

export function useActivity(ticketId: string | null) {
  return useQuery({
    queryKey: ['activity', ticketId],
    queryFn: () => fetchActivity(ticketId!),
    enabled: !!ticketId,
  })
}
