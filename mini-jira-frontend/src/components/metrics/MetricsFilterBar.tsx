import { useUsers } from '@/hooks/useUsers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MetricsFilters } from '@/types'

interface MetricsFilterBarProps {
  filters: MetricsFilters
  onChange: (f: MetricsFilters) => void
}

export function MetricsFilterBar({ filters, onChange }: MetricsFilterBarProps) {
  const { data: users = [] } = useUsers()

  function patch(partial: Partial<MetricsFilters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Date range */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="from">Desde</Label>
        <Input
          id="from"
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => patch({ from: e.target.value || undefined })}
          className="w-36"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to">Hasta</Label>
        <Input
          id="to"
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => patch({ to: e.target.value || undefined })}
          className="w-36"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <Label>Estado</Label>
        <Select
          value={filters.status?.[0] ?? ''}
          onValueChange={(v) => patch({ status: v ? [v as never] : undefined })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Por hacer</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Listo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div className="flex flex-col gap-1">
        <Label>Miembro</Label>
        <Select
          value={filters.assignee_id ?? ''}
          onValueChange={(v) => patch({ assignee_id: v || undefined })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
