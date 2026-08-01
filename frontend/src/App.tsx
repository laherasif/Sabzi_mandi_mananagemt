import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAuth } from '@/components/auth/AuthGate'
import { MandiShell } from '@/layouts/MandiShell'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { ModulePage } from '@/pages/ModulePage'
import { BanamPage } from '@/pages/BanamPage'
import { SheetPage } from '@/pages/SheetPage'
import { CashBookPage } from '@/pages/CashBookPage'
import { RoznamchaPage } from '@/pages/RoznamchaPage'
import { BalanceSheetPage } from '@/pages/BalanceSheetPage'
import { PartyLedgerPage } from '@/pages/PartyLedgerPage'
import { NewCustomerPage } from '@/pages/NewCustomerPage'
import { NewProductPage } from '@/pages/NewProductPage'
import { NewMarfatPage } from '@/pages/NewMarfatPage'
import { SaleMaalPage } from '@/pages/SaleMaalPage'
import { PurchasesGate } from '@/pages/PurchasesGate'
import { BillPrintPage } from '@/pages/BillPrintPage'
import { BanamGahakPage } from '@/pages/BanamGahakPage'
import { MaalKhataPage } from '@/pages/MaalKhataPage'
import { isAuthenticated } from '@/lib/auth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root = login */}
        <Route
          path="/"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* App — requires login */}
        <Route element={<RequireAuth />}>
          <Route element={<MandiShell />}>
            <Route path="home" element={<HomePage />} />
            <Route path="parties" element={<PartyLedgerPage />} />
            <Route path="customers" element={<NewCustomerPage />} />
            <Route path="banam-gahak" element={<BanamGahakPage />} />
            <Route path="products" element={<NewProductPage />} />
            <Route path="marfat" element={<NewMarfatPage />} />
            <Route path="purchases" element={<PurchasesGate />} />
            <Route path="sales" element={<SaleMaalPage />} />
            <Route path="bills" element={<BillPrintPage />} />
            <Route path="payments" element={<BanamPage />} />
            <Route path="inventory" element={<MaalKhataPage />} />
            <Route path="cashbook" element={<CashBookPage />} />
            <Route path="reports" element={<ModulePage titleUr="رپورٹس" titleEn="Reports" />} />
            <Route path="reports/sheet" element={<SheetPage />} />
            <Route path="reports/daybook" element={<RoznamchaPage />} />
            <Route path="reports/balance" element={<BalanceSheetPage />} />
            <Route path="reports/:type" element={<ModulePage titleUr="رپورٹ" titleEn="Report" />} />
            <Route path="settings" element={<ModulePage titleUr="ترتیبات" titleEn="Settings" />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated() ? '/home' : '/'} replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}
