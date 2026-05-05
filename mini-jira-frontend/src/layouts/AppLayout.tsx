import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Users, LogOut, Moon, Sun, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { logout } from '@/api/auth'
import { cn, getInitials } from '@/lib/utils'
import { ProfileModal } from '@/components/ProfileModal'

export function AppLayout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const { dark, toggleDark } = useThemeStore()
  const [profileOpen, setProfileOpen] = useState(false)

  async function handleLogout() {
    await logout().catch(() => null)
    clearAuth()
    navigate('/login', { replace: true })
  }

  const navItem = (to: string, label: string, Icon: React.ElementType) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-fixed text-on-primary-fixed'
            : 'text-on-surface-variant hover:bg-surface-container',
        )
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col gap-1 bg-surface-container-low px-3 py-6">
        <span className="mb-6 px-3 text-sm font-bold tracking-tight text-on-surface">
          Mini Jira
        </span>

        {navItem('/board', 'Tablero', LayoutDashboard)}
        {navItem('/metrics', 'Métricas', BarChart2)}
        {user?.role === 'admin' && navItem('/admin/users', 'Usuarios', Users)}

        <div className="mt-auto flex flex-col gap-1">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {/* User row */}
          <div className="flex items-center gap-2 rounded-lg p-2">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-[11px] font-semibold text-on-primary-fixed hover:opacity-80 transition-opacity"
              title="Mi perfil"
            >
              {user ? getInitials(user.name) : '?'}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-on-surface">{user?.name}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-on-surface-variant">
                {user?.role}
              </p>
            </div>
            <div className="flex gap-0.5">
              <button
                onClick={() => setProfileOpen(true)}
                className="rounded p-1 text-on-surface-variant hover:text-on-surface"
                title="Mi perfil"
              >
                <UserCircle size={14} />
              </button>
              <button
                onClick={handleLogout}
                className="rounded p-1 text-on-surface-variant hover:text-on-surface"
                title="Cerrar sesión"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}
