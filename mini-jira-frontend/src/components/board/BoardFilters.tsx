import { useBoardStore } from '@/store/boardStore'
import { useUsers } from '@/hooks/useUsers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function BoardFilters() {
  const { filters, patchFilters, clearFilters } = useBoardStore()
  const { data: users = [] } = useUsers()
  const hasFilters = Object.keys(filters).some((k) => filters[k as keyof typeof filters] !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status */}
      <Select
        value={filters.status?.[0] ?? ''}
        onValueChange={(v) => patchFilters({ status: v ? [v as never] : undefined })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">Por hacer</SelectItem>
          <SelectItem value="in_progress">En progreso</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="done">Listo</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select
        value={filters.priority?.[0] ?? ''}
        onValueChange={(v) => patchFilters({ priority: v ? [v as never] : undefined })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Baja</SelectItem>
          <SelectItem value="medium">Media</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
        </SelectContent>
      </Select>

      {/* Assignee */}
      <Select
        value={filters.assignee_id ?? ''}
        onValueChange={(v) => patchFilters({ assignee_id: v || undefined })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Asignado" />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X size={13} />
          Limpiar
        </Button>
      )}
    </div>
  )
}
