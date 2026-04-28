import { useUsers, useUpdateUserRole } from '@/hooks/useUsers'
import { Avatar } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UserRole } from '@/types'

export function AdminUsersTable() {
  const { data: users = [], isLoading } = useUsers()
  const updateRole = useUpdateUserRole()

  if (isLoading) return <p className="text-sm text-on-surface-variant">Cargando usuarios…</p>

  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-ambient overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container-high">
            <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Usuario
            </th>
            <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Email
            </th>
            <th className="px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-on-surface-variant w-36">
              Rol
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-surface-container-high/50 last:border-0 hover:bg-surface-container-low"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar user={user} size="md" />
                  <span className="font-medium text-on-surface">{user.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-on-surface-variant">{user.email}</td>
              <td className="px-4 py-3">
                <Select
                  value={user.role}
                  onValueChange={(v) =>
                    updateRole.mutate({ userId: user.id, role: v as UserRole })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
