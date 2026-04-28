import { useState } from 'react'
import { MetricCard } from '@/components/metrics/MetricCard'
import { MetricsFilterBar } from '@/components/metrics/MetricsFilterBar'
import { ExportCSVButton } from '@/components/metrics/ExportCSVButton'
import { useMetrics } from '@/hooks/useMetrics'
import type { MetricsFilters } from '@/types'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = `${today.slice(0, 7)}-01`

export function MetricsPage() {
  const [filters, setFilters] = useState<MetricsFilters>({ from: firstOfMonth, to: today })
  const { data, isLoading } = useMetrics(filters)

  const isEmpty =
    !data ||
    (data.tickets_closed_by_month.length === 0 &&
      Object.values(data.tickets_by_status).every((v) => v === 0))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-container-high px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">Métricas</h2>
        <ExportCSVButton filters={filters} disabled={isEmpty} />
      </div>

      {/* Filters */}
      <div className="border-b border-surface-container-high px-6 py-3">
        <MetricsFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-sm text-on-surface-variant">Cargando métricas…</div>
        ) : data ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard
              title="Tickets cerrados por mes"
              items={data.tickets_closed_by_month.map((m) => ({
                label: m.month,
                value: m.count,
              }))}
            />
            <MetricCard
              title="Tickets por estado"
              items={Object.entries(data.tickets_by_status).map(([status, count]) => ({
                label: status,
                value: count,
              }))}
            />
            <MetricCard
              title="Carga de trabajo por miembro"
              items={data.tickets_by_member.map((m) => ({
                label: m.user.name,
                value: m.active_count,
              }))}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
