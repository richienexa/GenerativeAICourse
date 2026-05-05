import client from './client'
import type { ActivityLog } from '@/types'

export async function fetchActivity(ticketId: string): Promise<ActivityLog[]> {
  const { data } = await client.get<ActivityLog[]>(`/tickets/${ticketId}/activity`)
  return data
}
