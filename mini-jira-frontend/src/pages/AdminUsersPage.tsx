import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { CreateUserModal } from '@/components/CreateUserModal'
import { useAuthStore } from '@/store/authStore'

export function AdminUsersPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/board', { replace: true })
    }
  }, [user, navigate])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-container-high px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">Gestión de usuarios</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dim px-3 py-1.5 text-sm font-medium text-on-primary hover:opacity-90"
        >
          <Plus size={15} />
          Nuevo usuario
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <AdminUsersTable />
      </div>
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
