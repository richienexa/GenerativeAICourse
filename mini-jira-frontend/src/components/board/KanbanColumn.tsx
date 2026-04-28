import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TicketCard } from './TicketCard'
import { cn } from '@/lib/utils'
import type { Ticket, TicketStatus } from '@/types'

interface KanbanColumnProps {
  id: TicketStatus
  label: string
  tickets: Ticket[]
}

export function KanbanColumn({ id, label, tickets }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex w-64 flex-shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <span className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
          {label}
        </span>
        <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[120px] flex-col gap-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-primary-fixed/30' : 'bg-surface-container-low',
        )}
      >
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="py-4 text-center text-xs text-on-surface-variant/50">Sin tickets</p>
        )}
      </div>
    </div>
  )
}
