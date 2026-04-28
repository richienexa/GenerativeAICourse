import { Trash2 } from 'lucide-react'
import { useArchiveComment } from '@/hooks/useComments'
import { useAuthStore } from '@/store/authStore'
import { Avatar } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/utils'
import type { Comment } from '@/types'

interface CommentItemProps {
  comment: Comment
  ticketId: string
}

export function CommentItem({ comment, ticketId }: CommentItemProps) {
  const user = useAuthStore((s) => s.user)
  const archiveMutation = useArchiveComment(ticketId)

  const isArchived = comment.archived_at !== null
  const canArchive =
    !isArchived && (user?.role === 'admin' || user?.id === comment.author.id)

  return (
    <div className="flex gap-2.5">
      <Avatar user={comment.author} />
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-on-surface">{comment.author.name}</span>
          <span className="text-[10px] text-on-surface-variant">
            {formatDateTime(comment.created_at)}
          </span>
        </div>

        {isArchived ? (
          <p className="mt-0.5 text-sm italic text-on-surface-variant">[comentario eliminado]</p>
        ) : (
          <div className="mt-0.5 flex items-start justify-between gap-2">
            <p className="text-sm text-on-surface">{comment.body}</p>
            {canArchive && (
              <button
                onClick={() => archiveMutation.mutate(comment.id)}
                className="shrink-0 rounded p-0.5 text-on-surface-variant hover:text-error"
                title="Eliminar comentario"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
