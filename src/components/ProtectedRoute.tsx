import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { session, loading, configured } = useAuth()
  const location = useLocation()

  if (!configured) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-green/[0.08] via-white to-brand-red/[0.06]">
        <div className="text-sm font-medium text-brand-green">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
