interface MetricItem {
  label: string
  value: number
}

interface MetricCardProps {
  title: string
  items: MetricItem[]
}

export function MetricCard({ title, items }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient">
      <p className="mb-4 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Sin datos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ label, value }) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-on-surface">{label}</span>
              <span className="shrink-0 rounded-full bg-primary-container px-2 py-0.5 text-xs font-semibold text-on-primary-fixed">
                {value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
