import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog'
import { TicketForm } from './TicketForm'
import { CommentList } from './CommentList'
import { CommentInput } from './CommentInput'
import { useTicket } from '@/hooks/useTicket'

interface TicketModalProps {
  ticketId: string | null
  onClose: () => void
}

export function TicketModal({ ticketId, onClose }: TicketModalProps) {
  const isNew = ticketId === 'new'
  const existingId = isNew ? null : ticketId
  const { data: ticket } = useTicket(existingId)

  const open = ticketId !== null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nuevo ticket' : (ticket?.title ?? '…')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <TicketForm ticket={isNew ? undefined : ticket} onClose={onClose} />

          {!isNew && ticket && (
            <div className="mt-8">
              <p className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
                Comentarios
              </p>
              <CommentList ticketId={ticket.id} />
              <div className="mt-4">
                <CommentInput ticketId={ticket.id} />
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
