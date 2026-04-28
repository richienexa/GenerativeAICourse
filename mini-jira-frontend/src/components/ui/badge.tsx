import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { TicketStatus, TicketPriority } from '@/types'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.05em]',
  {
    variants: {
      variant: {
        todo:        'bg-surface-container-high text-on-surface-variant',
        in_progress: 'bg-primary-container text-on-primary-fixed',
        review:      'bg-secondary-container text-on-secondary-container',
        done:        'bg-tertiary-container text-on-tertiary-fixed',
        blocked:     'bg-error-container text-on-error-container',
        low:         'bg-surface-container text-on-surface-variant',
        medium:      'bg-secondary-container text-on-secondary-container',
        high:        'bg-error-container/60 text-on-error-container',
      },
    },
  },
)

type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

const STATUS_LABELS: Record<TicketStatus, string> = {
  todo:        'Por hacer',
  in_progress: 'En progreso',
  review:      'Review',
  done:        'Listo',
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low:    'Baja',
  medium: 'Media',
  high:   'Alta',
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={status}>{STATUS_LABELS[status]}</Badge>
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={priority}>{PRIORITY_LABELS[priority]}</Badge>
}

function BlockedBadge() {
  return <Badge variant="blocked">Bloqueado</Badge>
}

export { Badge, StatusBadge, PriorityBadge, BlockedBadge, badgeVariants }
