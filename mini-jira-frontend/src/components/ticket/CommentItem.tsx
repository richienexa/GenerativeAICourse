import { useState } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { useArchiveComment, useUpdateComment } from '@/hooks/useComments'
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
  const updateMutation = useUpdateComment(ticketId)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)

  const isArchived = comment.archived_at !== null
  const isAuthor = user?.id === comment.author.id
  const canArchive = !isArchived && (user?.role === 'admin' || isAuthor)
  const canEdit = !isArchived && isAuthor

  async function handleSave() {
    if (!editBody.trim()) return
    await updateMutation.mutateAsync({ commentId: comment.id, body: editBody.trim() })
    setEditing(false)
  }

  function handleCancelEdit() {
    setEditBody(comment.body)
    setEditing(false)
  }

  return (
    <div className="flex gap-2.5">
      <Avatar user={comment.author} />
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-on-surface">{comment.author.name}</span>
          <div className="flex items-center gap-1">
            {comment.edited_at && !isArchived && (
              <span className="text-[10px] italic text-on-surface-variant">(editado)</span>
            )}
            <span className="text-[10px] text-on-surface-variant">
              {formatDateTime(comment.created_at)}
            </span>
          </div>
        </div>

        {isArchived ? (
          <p className="mt-0.5 text-sm italic text-on-surface-variant">[comentario eliminado]</p>
        ) : editing ? (
          <div className="mt-1 flex flex-col gap-1">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-surface-container-lowest px-2.5 py-1.5 text-sm text-on-surface ring-1 ring-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-primary hover:bg-primary-container/30"
              >
                <Check size={12} /> Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-on-surface-variant hover:bg-surface-container"
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-0.5 flex items-start justify-between gap-2">
            <p className="text-sm text-on-surface whitespace-pre-wrap">{comment.body}</p>
            <div className="flex shrink-0 gap-0.5">
              {canEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-0.5 text-on-surface-variant hover:text-on-surface"
                  title="Editar comentario"
                >
                  <Pencil size={12} />
                </button>
              )}
              {canArchive && (
                <button
                  onClick={() => archiveMutation.mutate(comment.id)}
                  className="rounded p-0.5 text-on-surface-variant hover:text-error"
                  title="Eliminar comentario"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
