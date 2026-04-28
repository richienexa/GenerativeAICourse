import client from './client'
import type { MetricsResponse, MetricsFilters } from '@/types'

export async function fetchMetrics(filters: MetricsFilters = {}): Promise<MetricsResponse> {
  const { data } = await client.get<MetricsResponse>('/metrics', { params: filters })
  return data
}

export function buildExportUrl(filters: MetricsFilters): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
  filters.status?.forEach((s) => params.append('status', s))
  return `${base}/metrics/export?${params.toString()}`
}
