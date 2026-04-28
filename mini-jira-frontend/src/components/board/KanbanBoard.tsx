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
  const { data: tickets = [], isLoading } = useTickets()
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

    // over.id puede ser el id de una columna (status) o el id de otro ticket
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
  )
}
