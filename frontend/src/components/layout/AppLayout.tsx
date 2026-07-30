import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  Package,
  Ruler,
  ShoppingCart,
  Receipt,
  Wallet,
  Warehouse,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { logout } from '@/store/slices/authSlice'
import { useLogoutMutation } from '@/store/api/authApi'

const links = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/parties', icon: Users, key: 'parties' },
  { to: '/products', icon: Package, key: 'products' },
  { to: '/units', icon: Ruler, key: 'units' },
  { to: '/purchases', icon: ShoppingCart, key: 'purchases' },
  { to: '/sales', icon: Receipt, key: 'sales' },
  { to: '/payments', icon: Wallet, key: 'payments' },
  { to: '/inventory', icon: Warehouse, key: 'inventory' },
  { to: '/cashbook', icon: BookOpen, key: 'cashbook' },
  { to: '/reports', icon: BarChart3, key: 'reports' },
  { to: '/settings', icon: Settings, key: 'settings' },
] as const

export function AppLayout() {
  const { t } = useTranslation()
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logoutApi] = useLogoutMutation()

  const onLogout = async () => {
    try {
      await logoutApi().unwrap()
    } catch {
      /* ignore */
    }
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col border-b lg:border-b-0 lg:border-e border-border bg-white/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
            <Leaf className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight text-brand">{t('appName')}</p>
            <p className="text-xs text-muted">{t('tagline')}</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-ink/80 hover:bg-brand-light hover:text-brand-dark'
                )
              }
            >
              <link.icon className="h-4.5 w-4.5 shrink-0" />
              <span>{t(`nav.${link.key}`)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-border p-4 lg:block">
          <p className="mb-2 truncate text-sm font-semibold">{user?.name}</p>
          <p className="mb-3 text-xs capitalize text-muted">{user?.role}</p>
          <div className="flex gap-2">
            <LanguageSwitcher className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => void onLogout()} title={t('nav.logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-white/70 px-4 py-3 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <p className="font-bold text-brand">{t('appName')}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <div className="hidden sm:block lg:hidden">
              <LanguageSwitcher />
            </div>
            <div className="sm:hidden">
              <LanguageSwitcher showLabel={false} size="icon" />
            </div>
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => void onLogout()}
              title={t('nav.logout')}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
