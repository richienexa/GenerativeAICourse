import client from './client'
import type { Comment, CreateCommentPayload } from '@/types'

export async function fetchComments(ticketId: string): Promise<Comment[]> {
  const { data } = await client.get<Comment[]>(`/tickets/${ticketId}/comments`)
  return data
}

export async function createComment(
  ticketId: string,
  payload: CreateCommentPayload,
): Promise<Comment> {
  const { data } = await client.post<Comment>(`/tickets/${ticketId}/comments`, payload)
  return data
}

export async function archiveComment(commentId: string): Promise<void> {
  await client.delete(`/comments/${commentId}`)
}
