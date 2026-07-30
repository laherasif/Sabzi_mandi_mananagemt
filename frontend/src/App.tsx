import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestRoute, ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PartiesPage } from '@/features/parties/PartiesPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { UnitsPage } from '@/features/units/UnitsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ComingSoonPage } from '@/features/shared/ComingSoonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="parties" element={<PartiesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="units" element={<UnitsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="purchases" element={<ComingSoonPage titleKey="nav.purchases" />} />
            <Route path="sales" element={<ComingSoonPage titleKey="nav.sales" />} />
            <Route path="payments" element={<ComingSoonPage titleKey="nav.payments" />} />
            <Route path="inventory" element={<ComingSoonPage titleKey="nav.inventory" />} />
            <Route path="cashbook" element={<ComingSoonPage titleKey="nav.cashbook" />} />
            <Route path="reports" element={<ComingSoonPage titleKey="nav.reports" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
