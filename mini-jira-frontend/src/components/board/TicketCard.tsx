import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PriorityBadge, BlockedBadge } from '@/components/ui/badge'
import { AvatarGroup } from '@/components/ui/avatar'
import { useBoardStore } from '@/store/boardStore'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types'

interface TicketCardProps {
  ticket: Ticket
  isDragging?: boolean
}

export function TicketCard({ ticket, isDragging = false }: TicketCardProps) {
  const setOpenTicketId = useBoardStore((s) => s.setOpenTicketId)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setOpenTicketId(ticket.id)}
      className={cn(
        'cursor-pointer rounded-xl bg-surface-container-lowest p-3 shadow-ambient',
        'flex flex-col gap-2 transition-shadow hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-40',
      )}
    >
      {/* Blocked badge */}
      {ticket.is_blocked && (
        <div>
          <BlockedBadge />
        </div>
      )}

      {/* Title */}
      <p className="line-clamp-2 text-sm font-medium leading-snug text-on-surface">
        {ticket.title}
      </p>

      {/* Labels */}
      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface-variant"
            >
              {label}
            </span>
          ))}
          {ticket.labels.length > 2 && (
            <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface-variant">
              +{ticket.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={ticket.priority} />
        {ticket.assignees.length > 0 && <AvatarGroup users={ticket.assignees} max={3} />}
      </div>
    </div>
  )
}
