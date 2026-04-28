import { useState } from 'react'
import { MentionsInput, Mention } from 'react-mentions'
import { useCreateComment } from '@/hooks/useComments'
import { useUsers } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface CommentInputProps {
  ticketId: string
}

export function CommentInput({ ticketId }: CommentInputProps) {
  const [body, setBody] = useState('')
  const { data: users = [] } = useUsers()
  const createMutation = useCreateComment(ticketId)

  const mentionData = users.map((u) => ({ id: u.email, display: u.name }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    await createMutation.mutateAsync({ body: trimmed })
    setBody('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <MentionsInput
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe un comentario… usa @ para mencionar"
        className="mentions"
        style={{
          control: {
            fontSize: '0.875rem',
            lineHeight: '1.6',
          },
          input: {
            padding: '8px 12px',
            borderRadius: '0.5rem',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-on-surface, #2d3338)',
          },
          highlighter: {
            padding: '8px 12px',
          },
          suggestions: {
            list: {
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(172,179,184,0.15)',
              borderRadius: '0.75rem',
              boxShadow: '0px 12px 32px rgba(12,14,16,0.04)',
              overflow: 'hidden',
              fontSize: '0.8125rem',
            },
            item: {
              padding: '6px 12px',
              cursor: 'pointer',
            },
            'item:hover': {
              background: '#ebeef2',
            },
          },
        }}
        a11ySuggestionsListLabel="Usuarios del equipo"
      >
        <Mention
          trigger="@"
          markup="@[__display__](__id__)"
          data={mentionData}
          displayTransform={(_id, display) => `@${display}`}
          appendSpaceOnAdd
        />
      </MentionsInput>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || createMutation.isPending}
        >
          <Send size={13} />
          {createMutation.isPending ? 'Enviando…' : 'Comentar'}
        </Button>
      </div>
    </form>
  )
}
