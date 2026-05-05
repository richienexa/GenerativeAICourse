import { useBoardStore } from '@/store/boardStore'
import { useUsers } from '@/hooks/useUsers'
import { useLabels } from '@/hooks/useLabels'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function BoardFilters() {
  const { filters, patchFilters, clearFilters } = useBoardStore()
  const { data: users = [] } = useUsers()
  const { data: labels = [] } = useLabels()
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

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

      {/* Label */}
      {labels.length > 0 && (
        <Select
          value={filters.label ?? ''}
          onValueChange={(v) => patchFilters({ label: v || undefined })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((l) => (
              <SelectItem key={l.id} value={l.name}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date from */}
      <input
        type="date"
        value={filters.from ?? ''}
        onChange={(e) => patchFilters({ from: e.target.value || undefined })}
        className="h-9 rounded-lg border border-outline-variant/30 bg-surface px-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        title="Desde"
      />

      {/* Date to */}
      <input
        type="date"
        value={filters.to ?? ''}
        onChange={(e) => patchFilters({ to: e.target.value || undefined })}
        className="h-9 rounded-lg border border-outline-variant/30 bg-surface px-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        title="Hasta"
      />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X size={13} />
          Limpiar
        </Button>
      )}
    </div>
  )
}
