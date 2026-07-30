import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/redux'

export function ProtectedRoute() {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export function GuestRoute() {
  const token = useAppSelector((s) => s.auth.accessToken)
  if (token) return <Navigate to="/" replace />
  return <Outlet />
}
