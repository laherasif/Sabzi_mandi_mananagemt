import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Languages,
  UserPlus,
  PackagePlus,
  Users,
  ShoppingCart,
  FilePlus2,
  UserRoundSearch,
  Printer,
  Contact,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Sheet,
  Wallet,
  BookOpen,
  Scale,
  BookUser,
} from 'lucide-react'
import { SideRail, type SideAction } from '@/components/mandi/SideRail'
import { SettingsDropdown } from '@/components/mandi/SettingsDropdown'
import { ShopLogo } from '@/components/mandi/ShopLogo'
import { setLang, applyDir } from '@/i18n'
import { SHOP_ADDRESS_EN, SHOP_ADDRESS_UR } from '@/lib/shopInfo'

/** Right menu — accounts / cash / ledgers */
const RIGHT_ACTIONS: SideAction[] = [
  { labelUr: 'بنام رقم', labelEn: 'Debit', to: '/payments?type=debit', icon: ArrowDownLeft, accent: 'orange' },
  { labelUr: 'جمع رقم', labelEn: 'Credit', to: '/payments?type=credit', icon: ArrowUpRight, accent: 'orange' },
  { labelUr: 'وصولی رقم', labelEn: 'Recovery', to: '/payments?type=recovery', icon: HandCoins, accent: 'orange' },
  { labelUr: 'شیٹ', labelEn: 'Sheet', to: '/reports/sheet', icon: Sheet },
  { labelUr: 'کیش بک', labelEn: 'Cash Book', to: '/cashbook', icon: Wallet },
  { labelUr: 'روزنامچہ', labelEn: 'Day Book', to: '/reports/daybook', icon: BookOpen },
  { labelUr: 'بیلنس', labelEn: 'Balance', to: '/reports/balance', icon: Scale },
  { labelUr: 'کھاتہ پارٹی', labelEn: 'Party A/c', to: '/parties', icon: BookUser },
]

/** Left menu — masters / sale / purchase */
const LEFT_ACTIONS: SideAction[] = [
  { labelUr: 'نیو کسٹمر', labelEn: 'New Customer', to: '/customers', icon: UserPlus },
  { labelUr: 'نیو جنس', labelEn: 'New Product', to: '/products', icon: PackagePlus },
  { labelUr: 'نیو معرفت', labelEn: 'New Marfat', to: '/marfat', icon: Users },
  { labelUr: 'سیل مال', labelEn: 'Sale', to: '/sales', icon: ShoppingCart },
  { labelUr: 'خرید بل', labelEn: 'Purchase', to: '/purchases', icon: FilePlus2 },
  { labelUr: 'کسٹمر خرید', labelEn: 'Cust. Buy', to: '/purchases?type=customer', icon: UserRoundSearch },
  { labelUr: 'بل پرنٹ', labelEn: 'Bill Print', to: '/bills', icon: Printer },
  { labelUr: 'بنام گاہک', labelEn: 'Cust. Debit', to: '/banam-gahak', icon: Contact },
  { labelUr: 'مال کھاتہ', labelEn: 'Stock A/c', to: '/inventory', icon: Boxes },
]

function LiveClock({ lang }: { lang: 'en' | 'ur' }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  const date = now.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-white backdrop-blur">
      <div className="leading-tight">
        <p className="text-sm font-bold tabular-nums" dir="ltr">
          {time}
        </p>
        <p className={`text-[11px] text-sky-100 ${lang === 'ur' ? 'font-urdu' : ''}`}>
          {date}
        </p>
      </div>
    </div>
  )
}

export function MandiShell() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const lang = (i18n.language || 'ur').startsWith('ur') ? 'ur' : 'en'
  const isHome = location.pathname === '/'
  const railSize = isHome ? 'comfortable' : 'compact'
  const shopTitle =
    lang === 'ur'
      ? 'چوہدری محمد اسلم، محمد عرفان — سبزی فروٹ کمیشن ایجنٹ'
      : 'Ch. M. Aslam, M. Irfan — Sabzi Fruit Commission Agent'

  const toggle = () => void setLang(lang === 'ur' ? 'en' : 'ur')

  // Keep html dir in sync (fixes Accounts rail flipping left after login LTR)
  useEffect(() => {
    applyDir(lang)
  }, [lang])

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#2390c0]">
      {/* Fixed header */}
      <header className="relative z-30 shrink-0 overflow-visible border-b border-white/20 bg-gradient-to-l from-[#0d5f86] via-[#1a7eab] to-[#0d5f86] text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=60)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Left: date/time · Center: logo + shop name · Right: lang + settings */}
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3.5 sm:px-4" dir="ltr">
          <div className="flex min-w-0 items-center justify-start">
            <LiveClock lang={lang} />
          </div>

          <Link
            to="/"
            className="flex min-w-0 max-w-[min(100vw-11rem,42rem)] items-center justify-center gap-2.5 overflow-visible px-1 sm:gap-3"
            dir={lang === 'ur' ? 'rtl' : 'ltr'}
          >
            <ShopLogo size="md" className="shrink-0 self-center" />
            <div className="min-w-0 overflow-visible py-0.5 text-center sm:text-start">
              <p
                className={
                  lang === 'ur'
                    ? 'font-urdu text-base font-bold !leading-[2.05] sm:text-lg'
                    : 'text-sm font-bold leading-snug sm:text-base'
                }
              >
                {shopTitle}
              </p>
              <p
                className={
                  lang === 'ur'
                    ? 'font-urdu mt-1 max-w-full overflow-visible pb-1.5 text-[11px] !leading-[2.2] text-sky-100 sm:text-xs'
                    : 'mt-0.5 max-w-full text-[11px] leading-normal text-sky-100 sm:text-xs'
                }
                title={lang === 'ur' ? SHOP_ADDRESS_UR : SHOP_ADDRESS_EN}
              >
                {lang === 'ur' ? SHOP_ADDRESS_UR : SHOP_ADDRESS_EN}
              </p>
            </div>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0d5f86] shadow-sm hover:bg-sky-50"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === 'ur' ? 'EN' : 'اردو'}
            </button>
            <SettingsDropdown lang={lang} />
          </div>
        </div>
      </header>

      {/* Fixed sidebars + inner-scroll main */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SideRail
          titleUr="اکاؤنٹس"
          titleEn="Accounts"
          items={RIGHT_ACTIONS}
          lang={lang}
          side="start"
          size={railSize}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 h-full flex-1 flex-col overflow-hidden">
            <Outlet context={{ lang }} />
          </div>
        </main>
        <SideRail
          titleUr="آپریشنز"
          titleEn="Operations"
          items={LEFT_ACTIONS}
          lang={lang}
          side="end"
          size={railSize}
        />
      </div>
    </div>
  )
}
