import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getMe } from '@/api/auth'

export function RootLayout() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true })
      return
    }
    if (!user) {
      getMe()
        .then((me) => setAuth(me, accessToken))
        .catch(() => {
          clearAuth()
          navigate('/login', { replace: true })
        })
    }
  }, [accessToken, user, navigate, setAuth, clearAuth])

  if (!accessToken || !user) return null

  return <Outlet />
}
