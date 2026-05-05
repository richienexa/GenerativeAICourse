import { useState, useEffect } from 'react'
import { Plus, LayoutGrid, List, Search } from 'lucide-react'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardFilters } from '@/components/board/BoardFilters'
import { TicketListView } from '@/components/board/TicketListView'
import { TicketModal } from '@/components/ticket/TicketModal'
import { useBoardStore } from '@/store/boardStore'
import { useTickets } from '@/hooks/useTickets'
import { useBoardSSE } from '@/hooks/useBoardSSE'
import { cn } from '@/lib/utils'

export function BoardPage() {
  const { openTicketId, setOpenTicketId, filters, patchFilters } = useBoardStore()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const { data: ticketsPage, isLoading } = useTickets(1)

  useBoardSSE()

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      patchFilters({ search: searchInput || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, patchFilters])

  const allTickets = (ticketsPage?.data ?? []).filter((t) => !t.archived_at)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-container-high px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">Tablero</h2>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar tickets…"
              className="h-9 rounded-lg border border-outline-variant/30 bg-surface pl-8 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors',
                view === 'kanban'
                  ? 'bg-primary-container text-on-primary-fixed'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
              title="Vista Kanban"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors',
                view === 'list'
                  ? 'bg-primary-container text-on-primary-fixed'
                  : 'text-on-surface-variant hover:bg-surface-container',
              )}
              title="Vista Lista"
            >
              <List size={14} />
            </button>
          </div>

          <button
            onClick={() => setOpenTicketId('new')}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim px-3 py-1.5 text-sm font-medium text-on-primary hover:opacity-90"
          >
            <Plus size={15} />
            Nuevo ticket
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-surface-container-high px-6 py-3">
        <BoardFilters />
      </div>

      {/* Board / List */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'kanban' ? (
          <KanbanBoard />
        ) : (
          <TicketListView tickets={allTickets} isLoading={isLoading} />
        )}
      </div>

      {/* Ticket modal */}
      <TicketModal
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />
    </div>
  )
}
