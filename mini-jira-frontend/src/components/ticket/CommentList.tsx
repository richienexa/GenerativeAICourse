import { useComments } from '@/hooks/useComments'
import { CommentItem } from './CommentItem'

interface CommentListProps {
  ticketId: string
}

export function CommentList({ ticketId }: CommentListProps) {
  const { data: comments = [], isLoading } = useComments(ticketId)

  if (isLoading) return <p className="text-xs text-on-surface-variant">Cargando…</p>
  if (comments.length === 0) return <p className="text-xs text-on-surface-variant">Sin comentarios aún.</p>

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} ticketId={ticketId} />
      ))}
    </div>
  )
}
