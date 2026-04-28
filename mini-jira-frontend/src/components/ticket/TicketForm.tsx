import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { ticketSchema, type TicketFormValues } from '@/lib/schemas'
import { useCreateTicket, useUpdateTicket, useArchiveTicket } from '@/hooks/useTicketMutations'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/store/authStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownPreview } from './MarkdownPreview'
import type { Ticket } from '@/types'

interface TicketFormProps {
  ticket?: Ticket
  onClose: () => void
}

export function TicketForm({ ticket, onClose }: TicketFormProps) {
  const user = useAuthStore((s) => s.user)
  const { data: users = [] } = useUsers()
  const [conflict, setConflict] = useState(false)

  const isNew = !ticket
  const canEdit = isNew || user?.role === 'admin' || ticket?.created_by === user?.id

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: ticket?.title ?? '',
      description: ticket?.description ?? '',
      priority: ticket?.priority ?? 'medium',
      status: ticket?.status ?? 'todo',
      is_blocked: ticket?.is_blocked ?? false,
      assignee_ids: ticket?.assignees.map((a) => a.id) ?? [],
      labels: ticket?.labels ?? [],
    },
  })

  const createMutation = useCreateTicket()
  const updateMutation = useUpdateTicket(ticket?.id ?? '')
  const archiveMutation = useArchiveTicket()

  async function onSubmit(values: TicketFormValues) {
    setConflict(false)
    try {
      if (isNew) {
        await createMutation.mutateAsync({
          title: values.title,
          description: values.description,
          priority: values.priority,
          assignee_ids: values.assignee_ids,
          labels: values.labels,
        })
      } else {
        await updateMutation.mutateAsync({ version: ticket!.version, ...values })
      }
      onClose()
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } }).response?.status === 409) {
        setConflict(true)
      }
    }
  }

  async function handleArchive() {
    if (!ticket) return
    await archiveMutation.mutateAsync(ticket.id)
    onClose()
  }

  const descriptionValue = watch('description') ?? ''

  if (!canEdit && ticket) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Label>Descripción</Label>
          <MarkdownPreview content={ticket.description ?? ''} />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Conflict banner */}
      {conflict && (
        <div className="flex items-start gap-2 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-on-error-container">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Alguien modificó este ticket mientras lo editabas. Recarga para ver los cambios.
            Tus cambios se mantienen en el formulario.
          </span>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...register('title')} placeholder="Describe el trabajo en pocas palabras" />
        <div className="flex justify-between">
          {errors.title && (
            <span className="text-xs text-error">{errors.title.message}</span>
          )}
          <span className="ml-auto text-xs text-on-surface-variant">
            {watch('title').length}/120
          </span>
        </div>
      </div>

      {/* Description with preview tab */}
      <div className="flex flex-col gap-1.5">
        <Label>Descripción</Label>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="preview">Vista previa</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Soporte Markdown…"
              className="w-full rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-on-surface ring-1 ring-outline-variant/30 placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </TabsContent>
          <TabsContent value="preview">
            <MarkdownPreview content={descriptionValue} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Priority + Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Prioridad *</Label>
          <Select
            value={watch('priority')}
            onValueChange={(v) => setValue('priority', v as TicketFormValues['priority'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isNew && (
          <div className="flex flex-col gap-1.5">
            <Label>Estado</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as TicketFormValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Por hacer</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Listo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Blocked toggle */}
      {!isNew && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_blocked"
            {...register('is_blocked')}
            className="h-4 w-4 rounded accent-error"
          />
          <Label htmlFor="is_blocked" className="normal-case tracking-normal text-sm">
            Marcar como bloqueado
          </Label>
        </div>
      )}

      {/* Assignees */}
      <div className="flex flex-col gap-1.5">
        <Label>Asignados</Label>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => {
            const selected = (getValues('assignee_ids') ?? []).includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  const current = getValues('assignee_ids') ?? []
                  setValue(
                    'assignee_ids',
                    selected ? current.filter((id) => id !== u.id) : [...current, u.id],
                  )
                }}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? 'bg-primary-container text-on-primary-fixed'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {u.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-1.5">
        <Label>Etiquetas</Label>
        <LabelInput
          value={getValues('labels') ?? []}
          onChange={(labels) => setValue('labels', labels)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {!isNew && (user?.role === 'admin' || ticket?.created_by === user?.id) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleArchive}
            className="text-error hover:bg-error-container/20"
          >
            Eliminar
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : isNew ? 'Crear ticket' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Inline tag input ──────────────────────────────────────────────────────────
function LabelInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')

  function addLabel() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((label) => (
        <span
          key={label}
          className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-0.5 text-xs text-on-surface-variant"
        >
          {label}
          <button
            type="button"
            onClick={() => onChange(value.filter((l) => l !== label))}
            className="leading-none hover:text-on-surface"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addLabel()
          }
        }}
        onBlur={addLabel}
        placeholder="Añadir etiqueta…"
        className="min-w-[100px] flex-1 bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none"
      />
    </div>
  )
}
