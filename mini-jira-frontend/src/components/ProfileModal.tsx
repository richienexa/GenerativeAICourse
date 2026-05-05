import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useUpdateUserProfile } from '@/hooks/useUsers'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const mutation = useUpdateUserProfile()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password && password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    const payload: { name?: string; password?: string } = {}
    if (name.trim() && name.trim() !== user?.name) payload.name = name.trim()
    if (password) payload.password = password

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    try {
      await mutation.mutateAsync({ userId: user!.id, payload })
      setSuccess(true)
      setPassword('')
      setConfirm('')
    } catch {
      setError('Error al actualizar el perfil')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mi perfil</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-password">Nueva contraseña</Label>
              <Input
                id="profile-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
              />
            </div>
            {password && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profile-confirm">Confirmar contraseña</Label>
                <Input
                  id="profile-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}
            {error && <p className="text-xs text-error">{error}</p>}
            {success && <p className="text-xs text-primary">Perfil actualizado</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
