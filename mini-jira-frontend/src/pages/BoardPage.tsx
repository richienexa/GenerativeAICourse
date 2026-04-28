import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardFilters } from '@/components/board/BoardFilters'
import { TicketModal } from '@/components/ticket/TicketModal'
import { useBoardStore } from '@/store/boardStore'
import { Plus } from 'lucide-react'

export function BoardPage() {
  const { openTicketId, setOpenTicketId } = useBoardStore()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-container-high px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">Tablero</h2>
        <button
          onClick={() => setOpenTicketId('new')}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim px-3 py-1.5 text-sm font-medium text-on-primary hover:opacity-90"
        >
          <Plus size={15} />
          Nuevo ticket
        </button>
      </div>

      {/* Filters */}
      <div className="border-b border-surface-container-high px-6 py-3">
        <BoardFilters />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        <KanbanBoard />
      </div>

      {/* Ticket modal */}
      <TicketModal
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />
    </div>
  )
}
