import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { BoardPage } from '@/pages/BoardPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/board" replace /> },
          { path: '/board', element: <ErrorBoundary><BoardPage /></ErrorBoundary> },
          { path: '/metrics', element: <ErrorBoundary><MetricsPage /></ErrorBoundary> },
          { path: '/admin/users', element: <ErrorBoundary><AdminUsersPage /></ErrorBoundary> },
        ],
      },
    ],
  },
])
