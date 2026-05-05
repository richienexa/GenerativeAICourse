import { useQuery } from '@tanstack/react-query'
import { fetchLabels } from '@/api/labels'

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: fetchLabels,
  })
}
