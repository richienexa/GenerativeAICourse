import { useOptimistic, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import { TicketCard } from './TicketCard'
import { useTickets, TICKETS_KEY } from '@/hooks/useTickets'
import { updateTicket } from '@/api/tickets'
import type { Ticket, TicketStatus } from '@/types'

const COLUMNS: { id: TicketStatus; label: string }[] = [
  { id: 'todo',        label: 'Por hacer'   },
  { id: 'in_progress', label: 'En progreso' },
  { id: 'review',      label: 'Review'      },
  { id: 'done',        label: 'Listo'       },
]

const VALID_STATUSES = new Set<string>(['todo', 'in_progress', 'review', 'done'])

export function KanbanBoard() {
  const [page, setPage] = useState(1)
  const { data: ticketsPage, isLoading } = useTickets(page)
  const tickets: Ticket[] = ticketsPage?.data ?? []
  const limit = ticketsPage?.limit ?? 50
  const hasMore = tickets.length === limit

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [, startTransition] = useTransition()
  const qc = useQueryClient()

  const [optimisticTickets, applyOptimistic] = useOptimistic(
    tickets,
    (current: Ticket[], { id, status }: { id: string; status: TicketStatus }) =>
      current.map((t) => (t.id === id ? { ...t, status } : t)),
  )

  const { mutate } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      updateTicket(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TICKETS_KEY] }),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTicket(tickets.find((t) => t.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTicket(null)
    if (!over) return

    const ticket = tickets.find((t) => t.id === active.id)
    if (!ticket) return

    let newStatus: TicketStatus
    if (VALID_STATUSES.has(over.id as string)) {
      newStatus = over.id as TicketStatus
    } else {
      const overTicket = tickets.find((t) => t.id === over.id)
      if (!overTicket) return
      newStatus = overTicket.status
    }

    if (ticket.status === newStatus) return

    startTransition(() => {
      applyOptimistic({ id: ticket.id, status: newStatus })
    })

    mutate({ id: ticket.id, status: newStatus })
  }

  if (isLoading) {
    return <div className="text-sm text-on-surface-variant">Cargando tablero…</div>
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {COLUMNS.map(({ id, label }) => (
            <KanbanColumn
              key={id}
              id={id}
              label={label}
              tickets={optimisticTickets.filter((t) => t.status === id && !t.archived_at)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTicket ? <TicketCard ticket={activeTicket} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <ChevronLeft size={13} /> Anterior
          </button>
          <span className="text-xs text-on-surface-variant">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            Siguiente <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
