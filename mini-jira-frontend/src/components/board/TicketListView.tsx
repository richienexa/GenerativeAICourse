import { Calendar, AlertTriangle } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/badge'
import { AvatarGroup } from '@/components/ui/avatar'
import { useBoardStore } from '@/store/boardStore'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

interface TicketListViewProps {
  tickets: Ticket[]
  isLoading: boolean
}

export function TicketListView({ tickets, isLoading }: TicketListViewProps) {
  const setOpenTicketId = useBoardStore((s) => s.setOpenTicketId)

  if (isLoading) {
    return <div className="text-sm text-on-surface-variant">Cargando…</div>
  }

  if (tickets.length === 0) {
    return <p className="text-sm text-on-surface-variant">Sin tickets para mostrar</p>
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant/20 bg-surface-container-low">
            <th className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Título
            </th>
            <th className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Estado
            </th>
            <th className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Prioridad
            </th>
            <th className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Fecha límite
            </th>
            <th className="px-4 py-2.5 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Asignados
            </th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, idx) => {
            const isOverdue =
              ticket.due_date &&
              new Date(ticket.due_date) < new Date() &&
              ticket.status !== 'done'

            return (
              <tr
                key={ticket.id}
                onClick={() => setOpenTicketId(ticket.id)}
                className={cn(
                  'cursor-pointer border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low',
                  idx % 2 === 0 ? 'bg-surface' : 'bg-surface-container-lowest',
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {ticket.is_blocked && (
                      <AlertTriangle size={13} className="shrink-0 text-error" />
                    )}
                    <span className="font-medium text-on-surface line-clamp-1">
                      {ticket.title}
                    </span>
                    {ticket.labels.length > 0 && (
                      <div className="flex gap-1">
                        {ticket.labels.slice(0, 2).map((l) => (
                          <span
                            key={l}
                            className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface-variant"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {STATUS_LABEL[ticket.status] ?? ticket.status}
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  {ticket.due_date ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        isOverdue ? 'text-error font-medium' : 'text-on-surface-variant',
                      )}
                    >
                      <Calendar size={11} />
                      {new Date(ticket.due_date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span className="text-on-surface-variant/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {ticket.assignees.length > 0 ? (
                    <AvatarGroup users={ticket.assignees} max={3} />
                  ) : (
                    <span className="text-on-surface-variant/40">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
