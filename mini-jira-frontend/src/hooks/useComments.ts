import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchComments, createComment, updateComment, archiveComment } from '@/api/comments'
import type { CreateCommentPayload } from '@/types'

const key = (ticketId: string) => ['comments', ticketId]

export function useComments(ticketId: string) {
  return useQuery({
    queryKey: key(ticketId),
    queryFn: () => fetchComments(ticketId),
    enabled: ticketId.length > 0,
  })
}

export function useCreateComment(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => createComment(ticketId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ticketId) }),
  })
}

export function useUpdateComment(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateComment(commentId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ticketId) }),
  })
}

export function useArchiveComment(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => archiveComment(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(ticketId) }),
  })
}
