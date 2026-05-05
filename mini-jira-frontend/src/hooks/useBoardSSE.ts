import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { TICKETS_KEY } from './useTickets'
import type { Ticket } from '@/types'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api'

export function useBoardSSE() {
  const qc = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!accessToken) return

    const url = `${API_BASE}/sse/board`
    const es = new EventSource(url, { withCredentials: true })

    function invalidate() {
      qc.invalidateQueries({ queryKey: [TICKETS_KEY] })
    }

    es.addEventListener('ticket:created', (e: MessageEvent) => {
      const ticket: Ticket = JSON.parse(e.data)
      qc.setQueryData([TICKETS_KEY], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const page = old as { data: Ticket[]; page: number; limit: number }
        return { ...page, data: [ticket, ...page.data] }
      })
      invalidate()
    })

    es.addEventListener('ticket:updated', (e: MessageEvent) => {
      const ticket: Ticket = JSON.parse(e.data)
      qc.setQueryData([TICKETS_KEY], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const page = old as { data: Ticket[]; page: number; limit: number }
        return {
          ...page,
          data: page.data.map((t) => (t.id === ticket.id ? ticket : t)),
        }
      })
    })

    es.addEventListener('ticket:deleted', (e: MessageEvent) => {
      const { id } = JSON.parse(e.data) as { id: string }
      qc.setQueryData([TICKETS_KEY], (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const page = old as { data: Ticket[]; page: number; limit: number }
        return { ...page, data: page.data.filter((t) => t.id !== id) }
      })
    })

    return () => es.close()
  }, [accessToken, qc])
}
