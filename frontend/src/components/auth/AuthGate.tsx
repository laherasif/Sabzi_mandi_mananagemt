import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '@/lib/auth'

/** Block Mandi app until logged in — send guests to login (/) */
export function RequireAuth() {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** If already logged in, skip login screen */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}
