import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { useAuthStore } from '@/store/authStore'

export function AdminUsersPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/board', { replace: true })
    }
  }, [user, navigate])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-container-high px-6 py-4">
        <h2 className="text-base font-semibold text-on-surface">Gestión de usuarios</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <AdminUsersTable />
      </div>
    </div>
  )
}
