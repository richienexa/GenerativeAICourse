import { useActivity } from '@/hooks/useActivity'
import { formatDateTime } from '@/lib/utils'

interface ActivityLogProps {
  ticketId: string
}

const actionLabel: Record<string, string> = {
  created: 'creó el ticket',
  updated: 'actualizó',
}

const fieldLabel: Record<string, string> = {
  status: 'estado',
  priority: 'prioridad',
  title: 'título',
}

const statusLabel: Record<string, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

const priorityLabel: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

function formatValue(field: string | null, value: string | null): string {
  if (!value) return '—'
  if (field === 'status') return statusLabel[value] ?? value
  if (field === 'priority') return priorityLabel[value] ?? value
  return value
}

export function ActivityLog({ ticketId }: ActivityLogProps) {
  const { data: logs = [], isLoading } = useActivity(ticketId)

  if (isLoading) return null

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2">
          <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-surface-container flex items-center justify-center text-[9px] font-semibold text-on-surface-variant">
            {log.user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-on-surface">{log.user.name}</span>
            {' '}
            {log.action === 'created' ? (
              <span className="text-xs text-on-surface-variant">{actionLabel.created}</span>
            ) : (
              <span className="text-xs text-on-surface-variant">
                cambió {fieldLabel[log.field ?? ''] ?? log.field} de{' '}
                <span className="font-medium text-on-surface">
                  {formatValue(log.field, log.oldValue)}
                </span>{' '}
                a{' '}
                <span className="font-medium text-on-surface">
                  {formatValue(log.field, log.newValue)}
                </span>
              </span>
            )}
            <span className="ml-1 text-[10px] text-on-surface-variant">
              · {formatDateTime(log.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
