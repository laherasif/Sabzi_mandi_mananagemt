import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  User,
  ShoppingBasket,
  ClipboardList,
  Wallet,
  BookUser,
  HandCoins,
  Scale,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react'
import { TileGrid, type MandiTile } from '@/components/mandi/TileGrid'
import { ApiClientError } from '@/lib/api'
import { ledgerApi } from '@/lib/mandiApi'
import {
  SHOP_ADDRESS_EN,
  SHOP_ADDRESS_UR,
  SHOP_CONTACTS,
  SHOP_LANDLINE,
  SHOP_NAME_EN,
  SHOP_NAME_UR,
  SHOP_PROPRIETOR_EN,
  SHOP_PROPRIETOR_UR,
  SHOP_TAGLINE_EN,
  SHOP_TAGLINE_UR,
} from '@/lib/shopInfo'

interface Ctx {
  lang: 'en' | 'ur'
}

type HomeCounts = {
  parties: number
  customers: number
  sales: number
  purchases: number
  vouchers: number
  products: number
  today: number
  bills: number
}

type DayBookRow = { nameUr: string; nameEn: string; banam: number; jama: number }

const EMPTY_COUNTS: HomeCounts = {
  parties: 0,
  customers: 0,
  sales: 0,
  purchases: 0,
  vouchers: 0,
  products: 0,
  today: 0,
  bills: 0,
}

function formatRs(n: number) {
  if (!n) return '—'
  return new Intl.NumberFormat('en-PK').format(Math.round(n))
}

function buildTopTiles(c: HomeCounts): MandiTile[] {
  return [
    { labelUr: 'گاہک', labelEn: 'Customers', to: '/parties?type=customer', icon: User, badge: c.customers, size: 'lg', tone: 'sky' },
    { labelUr: 'خرید', labelEn: 'Purchase', to: '/purchases', icon: ShoppingBasket, badge: c.purchases, size: 'lg', tone: 'emerald' },
    { labelUr: 'بلز', labelEn: 'Bills', to: '/bills', icon: ClipboardList, badge: c.bills, size: 'lg', tone: 'violet' },
    { labelUr: 'رقم', labelEn: 'Cash', to: '/cashbook', icon: Wallet, badge: c.vouchers, size: 'lg', tone: 'emerald' },
    { labelUr: 'ایڈریس بک', labelEn: 'Contacts', to: '/parties', icon: BookUser, badge: c.parties, size: 'lg', tone: 'sky' },
  ]
}

const BOTTOM_TILES: MandiTile[] = [
  { labelUr: 'روزنامچہ', labelEn: 'Day Book', to: '/reports/daybook', icon: Receipt, size: 'sm', tone: 'slate' },
  { labelUr: 'کیش بک', labelEn: 'Cash Book', to: '/cashbook', icon: Wallet, size: 'sm', tone: 'emerald' },
  { labelUr: 'بیلنس شیٹ', labelEn: 'Balance', to: '/reports/balance', icon: Scale, size: 'sm', tone: 'sky' },
  { labelUr: 'ریکوری شیٹ', labelEn: 'Recovery', to: '/reports/recovery', icon: HandCoins, size: 'sm', tone: 'orange' },
  { labelUr: 'وصولی', labelEn: 'Collect', to: '/payments', icon: HandCoins, size: 'sm', tone: 'emerald' },
  { labelUr: 'بنام', labelEn: 'Debit', to: '/payments?type=debit', icon: ArrowDownLeft, size: 'sm', tone: 'orange' },
  { labelUr: 'جمع', labelEn: 'Credit', to: '/payments?type=credit', icon: ArrowUpRight, size: 'sm', tone: 'sky' },
  { labelUr: 'تمام بلز', labelEn: 'All Bills', to: '/bills', icon: ClipboardList, size: 'sm', tone: 'violet' },
  { labelUr: 'تاجر کھاتہ', labelEn: 'Trader A/c', to: '/parties?type=supplier', icon: BookUser, size: 'sm', tone: 'slate' },
  { labelUr: 'پارٹی کھاتہ', labelEn: 'Party A/c', to: '/parties', icon: BookUser, size: 'sm', tone: 'sky' },
]

export function HomePage() {
  const { lang } = useOutletContext<Ctx>()
  const today = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB')
  const [counts, setCounts] = useState<HomeCounts>(EMPTY_COUNTS)
  const [dayBook, setDayBook] = useState<DayBookRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await ledgerApi.summary()
        if (!alive) return
        const c = data.counts || ({} as HomeCounts)
        setCounts({
          parties: Number(c.parties) || 0,
          customers: Number(c.customers) || 0,
          sales: Number(c.sales) || 0,
          purchases: Number(c.purchases) || 0,
          vouchers: Number(c.vouchers) || 0,
          products: Number(c.products) || 0,
          today: Number(c.today) || 0,
          bills: Number(c.bills) || Number(c.sales) + Number(c.purchases) || 0,
        })
        setDayBook(Array.isArray(data.dayBook) ? data.dayBook : [])
      } catch (e) {
        if (!alive) return
        toast.error(e instanceof ApiClientError ? e.message : lang === 'ur' ? 'لوڈ ناکام' : 'Load failed')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [lang])

  const topTiles = useMemo(() => buildTopTiles(counts), [counts])

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 overflow-y-auto p-3 sm:p-4">
      <div className="relative">
        {loading && (
          <div className="absolute end-0 top-0 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-[#0d5f86] shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            {lang === 'ur' ? 'لوڈ…' : 'Loading…'}
          </div>
        )}
        <TileGrid tiles={topTiles} lang={lang} columns="grid-cols-3 sm:grid-cols-5" />
      </div>
      <TileGrid
        tiles={BOTTOM_TILES}
        lang={lang}
        columns="grid-cols-3 sm:grid-cols-5 lg:grid-cols-10"
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-2xl bg-sky-50 shadow-lg ring-1 ring-black/5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/login-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-100/95 via-white/88 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

          <div className="relative px-5 py-6 text-center sm:px-8 sm:py-8">
            <p className="mb-2 inline-flex rounded-full bg-sky-100/95 px-3 py-1 text-xs font-bold text-sky-800 shadow-sm ring-1 ring-sky-200/60">
              {lang === 'ur' ? SHOP_TAGLINE_UR : SHOP_TAGLINE_EN}
            </p>
            <h1
              className={
                lang === 'ur'
                  ? 'font-urdu text-2xl font-bold leading-relaxed text-slate-900 sm:text-3xl'
                  : 'text-2xl font-bold text-slate-900 sm:text-3xl'
              }
            >
              {lang === 'ur' ? SHOP_NAME_UR : SHOP_NAME_EN}
            </h1>
            <p className={`mt-2 text-sm text-slate-700 ${lang === 'ur' ? 'font-urdu' : ''}`}>
              {lang === 'ur' ? SHOP_PROPRIETOR_UR : SHOP_PROPRIETOR_EN}
            </p>

            <div className="mx-auto mt-4 grid max-w-lg gap-2 sm:grid-cols-2">
              {SHOP_CONTACTS.map((c) => (
                <a
                  key={c.phone}
                  href={`tel:${c.phone.replace(/-/g, '')}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/95 px-3 py-2.5 text-start shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm transition hover:bg-white hover:ring-sky-300"
                >
                  <span className={`text-xs font-semibold text-slate-700 ${lang === 'ur' ? 'font-urdu' : ''}`}>
                    {lang === 'ur' ? c.nameUr : c.nameEn}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-sky-800 tabular-nums" dir="ltr">
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone}
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center gap-2.5 pb-1">
              <a
                href={`tel:${SHOP_LANDLINE.replace(/-/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50/95 px-3 py-1.5 text-sm font-bold text-orange-800 shadow-sm ring-1 ring-orange-200"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5" />
                {SHOP_LANDLINE}
              </a>

              <p
                className={`inline-flex max-w-md items-center justify-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur-sm ${lang === 'ur' ? 'font-urdu' : ''}`}
              >
                <MapPin className="h-4 w-4 shrink-0 text-orange-600" />
                {lang === 'ur' ? SHOP_ADDRESS_UR : SHOP_ADDRESS_EN}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-3 text-white">
            <h2 className={`text-sm font-bold ${lang === 'ur' ? 'font-urdu text-base' : ''}`}>
              {lang === 'ur' ? 'روزنامچہ / Day Book' : 'Day Book'}
            </h2>
            <span className="rounded-lg bg-white/15 px-2 py-1 text-xs tabular-nums" dir="ltr">
              {today}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <Link
                to="/reports/daybook"
                className="flex-1 rounded-xl bg-sky-600 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-700"
              >
                {lang === 'ur' ? 'A Day Book دیکھیں' : 'Open Day Book'}
              </Link>
              <Link
                to="/payments?type=credit"
                className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100"
              >
                {lang === 'ur' ? 'جمع' : 'Jama'}
              </Link>
              <Link
                to="/payments?type=debit"
                className="rounded-xl bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-700 ring-1 ring-orange-100"
              >
                {lang === 'ur' ? 'بنام' : 'Banam'}
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-sky-50 text-sky-900">
                  <tr>
                    <th className={`w-[46%] px-3 py-2 font-bold ${lang === 'ur' ? 'text-right font-urdu' : 'text-left'}`}>
                      {lang === 'ur' ? 'نام کھاتہ' : 'Account'}
                    </th>
                    <th className={`w-[27%] px-2 py-2 text-center font-bold ${lang === 'ur' ? 'font-urdu' : ''}`}>
                      {lang === 'ur' ? 'بنام' : 'Debit'}
                    </th>
                    <th className={`w-[27%] px-2 py-2 text-center font-bold ${lang === 'ur' ? 'font-urdu' : ''}`}>
                      {lang === 'ur' ? 'جمع' : 'Credit'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dayBook.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={`px-3 py-8 text-center text-slate-400 ${lang === 'ur' ? 'font-urdu' : ''}`}>
                        {lang === 'ur' ? 'کوئی ریکارڈ نہیں' : 'No records'}
                      </td>
                    </tr>
                  ) : (
                    dayBook.map((row, i) => (
                      <tr key={`${row.nameEn}-${i}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80">
                        <td
                          className={`px-3 py-2.5 font-medium ${lang === 'ur' ? 'text-right font-urdu' : 'text-left'}`}
                        >
                          {lang === 'ur' ? row.nameUr : row.nameEn}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-orange-700" dir="ltr">
                          {formatRs(row.banam)}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-emerald-700" dir="ltr">
                          {formatRs(row.jama)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
