import { useQuery } from '@tanstack/react-query'
import { fetchMetrics } from '@/api/metrics'
import type { MetricsFilters } from '@/types'

export function useMetrics(filters: MetricsFilters) {
  return useQuery({
    queryKey: ['metrics', filters],
    queryFn: () => fetchMetrics(filters),
  })
}
