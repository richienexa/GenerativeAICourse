import { create } from 'zustand'
import type { BoardFilters } from '@/types'

interface BoardState {
  filters: BoardFilters
  openTicketId: string | null
  setFilters: (filters: BoardFilters) => void
  patchFilters: (patch: Partial<BoardFilters>) => void
  clearFilters: () => void
  setOpenTicketId: (id: string | null) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  filters: {},
  openTicketId: null,
  setFilters: (filters) => set({ filters }),
  patchFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  clearFilters: () => set({ filters: {} }),
  setOpenTicketId: (id) => set({ openTicketId: id }),
}))
