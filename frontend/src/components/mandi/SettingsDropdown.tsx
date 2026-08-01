import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  PackagePlus,
  Settings,
  UserPlus,
  Users,
  Wallet,
  Banknote,
  Contact,
  RefreshCw,
  BookUser,
  ShoppingCart,
  Sheet,
  Scale,
  LineChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlyItem {
  labelUr: string
  labelEn: string
  hintUr?: string
  hintEn?: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

interface SettingsItem {
  id: string
  labelUr: string
  labelEn: string
  hintUr?: string
  hintEn?: string
  to?: string
  icon: React.ComponentType<{ className?: string }>
  action?: 'logout'
  /** Submenu opens on hover (انوائس) or click/hover (نیو نام) — to the left */
  flyout?: 'invoice' | 'newName'
}

const INVOICE_FLYOUT: FlyItem[] = [
  {
    labelUr: 'پارٹی لیجر',
    labelEn: 'Party Ledger',
    hintUr: 'کھاتہ پارٹی',
    hintEn: 'Party account',
    to: '/parties',
    icon: BookUser,
  },
  {
    labelUr: 'سیل مال',
    labelEn: 'Sale Goods',
    hintUr: 'مال فروخت',
    hintEn: 'Sale maal',
    to: '/sales',
    icon: ShoppingCart,
  },
  {
    labelUr: 'سیل مال جنس',
    labelEn: 'Jins Report',
    hintUr: 'جنس رپورٹ',
    hintEn: 'Product sale report',
    to: '/inventory',
    icon: LineChart,
  },
  {
    labelUr: 'سیل بل',
    labelEn: 'Sale Bill',
    hintUr: 'بل پرنٹ',
    hintEn: 'Bill print',
    to: '/bills',
    icon: FileText,
  },
  {
    labelUr: 'اگراہی',
    labelEn: 'Agrahi Reports',
    hintUr: 'وصولی رپورٹ',
    hintEn: 'Recovery reports',
    to: '/payments?type=recovery',
    icon: LineChart,
  },
  {
    labelUr: 'اگراہی شیٹ',
    labelEn: 'Agrahi Sheet',
    hintUr: 'یومیہ اگراہی',
    hintEn: 'Daily agrahi sheet',
    to: '/reports/sheet',
    icon: Sheet,
  },
  {
    labelUr: 'بیلنس شیٹ',
    labelEn: 'Balance Sheet',
    hintUr: 'بیلنس رپورٹ',
    hintEn: 'Balance report',
    to: '/reports/balance',
    icon: Scale,
  },
]

const NEW_NAME_FLYOUT: FlyItem[] = [
  {
    labelUr: 'نیو جنس',
    labelEn: 'New Product',
    hintUr: 'نیا مال / جنس',
    hintEn: 'Add product',
    to: '/products',
    icon: PackagePlus,
  },
  {
    labelUr: 'ایڈ نیو کسٹمر',
    labelEn: 'Add New Customer',
    hintUr: 'نیا گاہک',
    hintEn: 'Register customer',
    to: '/customers',
    icon: UserPlus,
  },
  {
    labelUr: 'معرفت',
    labelEn: 'Add New Marfat',
    hintUr: 'نئی معرفت',
    hintEn: 'Add reference',
    to: '/marfat',
    icon: Users,
  },
  {
    labelUr: 'اپڈیٹ تمام کسٹمر',
    labelEn: 'Update All Customers',
    hintUr: 'گاہک اپڈیٹ',
    hintEn: 'Update customers',
    to: '/banam-gahak',
    icon: RefreshCw,
  },
]

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: 'logout',
    labelUr: 'لاگ آؤٹ',
    labelEn: 'Log Out',
    hintUr: 'سیشن بند کریں',
    hintEn: 'End session',
    icon: LogOut,
    action: 'logout',
  },
  {
    id: 'daybook',
    labelUr: 'روزنامچہ',
    labelEn: 'Daily Book',
    hintUr: 'یومیہ اندراج',
    hintEn: 'Day book',
    to: '/reports/daybook',
    icon: BookOpen,
  },
  {
    id: 'cashbook',
    labelUr: 'کیش بک',
    labelEn: 'Cash Book',
    hintUr: 'نقدی کھاتہ',
    hintEn: 'Cash ledger',
    to: '/cashbook',
    icon: Wallet,
  },
  {
    id: 'invoice',
    labelUr: 'انوائس',
    labelEn: 'Invoice / Reports',
    hintUr: 'رپورٹس — ہوور کریں',
    hintEn: 'Reports — hover',
    icon: FileText,
    flyout: 'invoice',
  },
  {
    id: 'newcash',
    labelUr: 'نیو کیش لین دین',
    labelEn: 'New Cash Entry',
    hintUr: 'نقدی لین دین',
    hintEn: 'Cash transaction',
    to: '/payments?type=debit',
    icon: Banknote,
  },
  {
    id: 'newname',
    labelUr: 'نیو نام',
    labelEn: 'New Accounts',
    hintUr: 'ماسٹرز — بائیں مینو',
    hintEn: 'Masters — left menu',
    icon: Contact,
    flyout: 'newName',
  },
]

/** Top-right Settings — Urdu labels + left flyouts for انوائس (hover) & نیو نام */
export function SettingsDropdown({ lang }: { lang: 'en' | 'ur' }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const [flyout, setFlyout] = useState<'invoice' | 'newName' | null>(null)
  const [flyPos, setFlyPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const flyRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLElement | null>>({})
  const hoverTimer = useRef<number | null>(null)
  const menuId = useId()
  const navigate = useNavigate()
  const ur = lang === 'ur'
  const L = (a: string, b: string) => (ur ? a : b)

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }

  const updatePosition = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setCoords({
      top: r.bottom + 8,
      right: Math.max(8, window.innerWidth - r.right),
    })
  }

  const placeFlyout = (key: 'invoice' | 'newName') => {
    const row = rowRefs.current[key]
    if (!row) return
    const r = row.getBoundingClientRect()
    const width = 260
    // Open to the LEFT of the settings menu
    let left = r.left - width - 8
    if (left < 8) left = 8
    let top = r.top
    const maxTop = window.innerHeight - 320
    if (top > maxTop) top = Math.max(8, maxTop)
    setFlyPos({ top, left })
    setFlyout(key)
  }

  const openFlyoutSoon = (key: 'invoice' | 'newName') => {
    clearHoverTimer()
    hoverTimer.current = window.setTimeout(() => placeFlyout(key), 80)
  }

  const closeFlyoutSoon = () => {
    clearHoverTimer()
    hoverTimer.current = window.setTimeout(() => setFlyout(null), 180)
  }

  useLayoutEffect(() => {
    if (!open) {
      setFlyout(null)
      return
    }
    updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        btnRef.current?.contains(t) ||
        menuRef.current?.contains(t) ||
        flyRef.current?.contains(t)
      ) {
        return
      }
      setOpen(false)
      setFlyout(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setFlyout(null)
      }
    }
    const onReposition = () => {
      updatePosition()
      if (flyout) placeFlyout(flyout)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      clearHoverTimer()
    }
  }, [open, flyout])

  const onItem = (item: SettingsItem) => {
    if (item.flyout) {
      placeFlyout(item.flyout)
      return
    }
    setOpen(false)
    setFlyout(null)
    if (item.action === 'logout') {
      navigate('/login')
      return
    }
    if (item.to) navigate(item.to)
  }

  const flyItems = flyout === 'invoice' ? INVOICE_FLYOUT : flyout === 'newName' ? NEW_NAME_FLYOUT : []

  const flyMenu =
    open &&
    flyout &&
    createPortal(
      <div
        ref={flyRef}
        className="fixed z-[10000] w-[260px] overflow-hidden rounded-xl border border-slate-300 bg-gradient-to-b from-slate-100 to-white shadow-2xl ring-1 ring-black/10"
        style={{ top: flyPos.top, left: flyPos.left }}
        dir={ur ? 'rtl' : 'ltr'}
        onMouseEnter={clearHoverTimer}
        onMouseLeave={closeFlyoutSoon}
      >
        <div className="border-b border-slate-200 bg-[#0d5f86] px-3 py-2">
          <p className={cn('text-xs font-bold text-white', ur && 'font-urdu text-sm')}>
            {flyout === 'invoice'
              ? L('انوائس / رپورٹس', 'Invoice / Reports')
              : L('نیو نام / ماسٹرز', 'New Name / Masters')}
          </p>
        </div>
        <ul className="max-h-[min(60vh,360px)] overflow-y-auto py-1">
          {flyItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to + item.labelUr}>
                <Link
                  to={item.to}
                  onClick={() => {
                    setOpen(false)
                    setFlyout(null)
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-sky-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#0d5f86]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm font-bold leading-[1.9] text-[#0d5f86]',
                        ur && 'font-urdu'
                      )}
                    >
                      {L(item.labelUr, item.labelEn)}
                    </span>
                    {(item.hintUr || item.hintEn) && (
                      <span className="block text-[10px] leading-relaxed text-slate-400">
                        {L(item.hintUr || '', item.hintEn || '')}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>,
      document.body
    )

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        className="fixed z-[9999] w-[min(100vw-1.5rem,300px)] overflow-visible rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/10"
        style={{ top: coords.top, right: coords.right }}
        dir={ur ? 'rtl' : 'ltr'}
      >
        <div className="rounded-t-2xl border-b border-slate-100 bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-3 py-2.5 text-white">
          <p className={cn('font-bold text-white leading-[1.9]', ur ? 'font-urdu text-base' : 'text-sm')}>
            {L('ترتیبات مینو', 'Settings menu')}
          </p>
          <p className={cn('text-[10px] text-sky-100', ur && 'font-urdu')}>
            {L('کھاتے، رپورٹس اور ماسٹرز', 'Accounts, reports & masters')}
          </p>
        </div>

        <ul className="max-h-[min(70vh,440px)] overflow-y-auto overflow-x-visible rounded-b-2xl bg-white py-1">
          {SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon
            const isLogout = item.action === 'logout'
            const hasFly = Boolean(item.flyout)
            const flyKey = item.flyout
            const activeFly = flyout === flyKey

            const rowClass = cn(
              'flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition',
              isLogout ? 'hover:bg-rose-50' : 'hover:bg-sky-50',
              activeFly && 'bg-sky-50'
            )

            const content = (
              <>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isLogout ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-[#0d5f86]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm font-bold leading-[1.95] text-slate-800',
                      ur && 'font-urdu',
                      isLogout && 'text-rose-700'
                    )}
                  >
                    {L(item.labelUr, item.labelEn)}
                  </span>
                  {(item.hintUr || item.hintEn) && (
                    <span className="block text-[10px] leading-relaxed text-slate-400">
                      {L(item.hintUr || '', item.hintEn || '')}
                    </span>
                  )}
                </span>
                {hasFly && (
                  <span className="shrink-0 text-slate-400">
                    {ur ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                )}
              </>
            )

            if (hasFly && flyKey) {
              return (
                <li
                  key={item.id}
                  ref={(el) => {
                    rowRefs.current[flyKey] = el
                  }}
                  onMouseEnter={() => {
                    // انوائس: hover opens; نیو نام: hover also opens (left)
                    openFlyoutSoon(flyKey)
                  }}
                  onMouseLeave={closeFlyoutSoon}
                >
                  <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={activeFly}
                    onClick={() => onItem(item)}
                    className={rowClass}
                  >
                    {content}
                  </button>
                </li>
              )
            }

            if (item.to && !isLogout) {
              return (
                <li key={item.id} onMouseEnter={() => setFlyout(null)}>
                  <Link
                    to={item.to}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      setFlyout(null)
                    }}
                    className={rowClass}
                  >
                    {content}
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.id} onMouseEnter={() => setFlyout(null)}>
                <button type="button" role="menuitem" onClick={() => onItem(item)} className={rowClass}>
                  {content}
                </button>
              </li>
            )
          })}
        </ul>
      </div>,
      document.body
    )

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-sm transition',
          open
            ? 'bg-amber-400 text-slate-900'
            : 'bg-white text-[#0d5f86] hover:bg-sky-50'
        )}
      >
        <Settings className="h-3.5 w-3.5" />
        <span className={ur ? 'font-urdu' : ''}>{L('ترتیبات', 'Settings')}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>
      {menu}
      {flyMenu}
    </div>
  )
}
