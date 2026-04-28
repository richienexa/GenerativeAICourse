import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <p className={cn('text-sm italic text-on-surface-variant', className)}>
        Sin descripción.
      </p>
    )
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-on-surface',
        'prose-headings:text-on-surface prose-p:text-on-surface',
        'prose-code:rounded prose-code:bg-surface-container prose-code:px-1 prose-code:text-on-surface',
        'prose-a:text-primary',
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
