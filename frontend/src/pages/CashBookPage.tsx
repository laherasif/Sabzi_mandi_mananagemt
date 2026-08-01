import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api'
import { vouchersApi } from '@/lib/mandiApi'
import { buildDayBookFromVouchers } from '@/lib/dayBooks'
import type { Voucher } from '@/lib/types'
import {
  MandiDatePicker,
  formatDashDate,
  formatDisplayDate,
  parseDisplayDate,
} from '@/components/mandi/MandiDatePicker'
import { MandiPageHeader } from '@/components/mandi/MandiPageHeader'
import { MandiExpandButton, MandiExpandModal } from '@/components/mandi/MandiExpandModal'

interface Ctx {
  lang: 'en' | 'ur'
}

const SHOP_TITLE_UR = 'چوہدری محمد اسلم، محمد عرفان (سبزی فروٹ کمیشن ایجنٹ)'
const SHOP_TITLE_EN = 'Ch. M. Aslam, M. Irfan (Sabzi Fruit Commission Agent)'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatUs(d: Date) {
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`
}

function formatRs(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-PK').format(abs)
  return n < 0 ? `-${formatted}` : formatted
}

function shiftDate(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/** کیش بک — Cash Book with Check + arrow-based day navigation */
export function CashBookPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [pickerDate, setPickerDate] = useState(() => formatDisplayDate(today))
  const [opened, setOpened] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [bookDate, setBookDate] = useState(() => new Date(today))
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(false)

  const dayData = useMemo(
    () => buildDayBookFromVouchers(vouchers, bookDate, lang),
    [vouchers, bookDate, lang]
  )

  const creditTotal = useMemo(
    () => dayData.credit.reduce((s, r) => s + r.amount, 0),
    [dayData.credit]
  )
  const debitTotal = useMemo(
    () => dayData.debit.reduce((s, r) => s + r.amount, 0),
    [dayData.debit]
  )
  // موجودہ کیش: credit total − debit total (matching screenshot style with بنام note)
  const currentCash = creditTotal - debitTotal

  const checkCashBook = async () => {
    const parsed = parseDisplayDate(pickerDate)
    if (!parsed) {
      toast.error(L('تاریخ درست نہیں', 'Invalid date'))
      return
    }
    parsed.setHours(0, 0, 0, 0)
    setLoading(true)
    try {
      const [recovery, credit, debit] = await Promise.all([
        vouchersApi.list('recovery'),
        vouchersApi.list('credit'),
        vouchersApi.list('debit'),
      ])
      setVouchers([...recovery, ...credit, ...debit])
      setBookDate(parsed)
      setOpened(true)
      toast.success(L('کیش بک کھل گئی', 'Cash book opened'))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
    } finally {
      setLoading(false)
    }
  }

  const moveDays = (days: number) => {
    setBookDate((prev) => {
      const next = shiftDate(prev, days)
      setPickerDate(formatDisplayDate(next))
      return next
    })
  }

  const goToday = () => {
    setBookDate(new Date(today))
    setPickerDate(formatDisplayDate(today))
  }

  const displayDate = (() => {
    const p = parseDisplayDate(pickerDate)
    return p ? formatDashDate(p) : pickerDate.replaceAll('/', '-')
  })()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <MandiPageHeader
        lang={lang}
        titleUr="کیش بک"
        titleEn="Cash Book"
        subtitle={`Cash Book · ${displayDate}`}
        icon={Wallet}
        toolbar={
          <>
            <MandiDatePicker
              value={pickerDate}
              onChange={setPickerDate}
              lang={lang}
              popoverAlign="left"
              className="w-[11rem]"
            />
            <button
              type="button"
              onClick={() => void checkCashBook()}
              disabled={loading}
              className={cn(
                'inline-flex h-10 items-center justify-center rounded-lg border border-[#0d5f86] bg-white px-4 text-sm font-bold leading-none text-[#0d5f86] shadow-sm hover:bg-sky-50 disabled:opacity-60',
                lang === 'ur' && 'font-urdu'
              )}
            >
              {loading ? L('لوڈ ہو رہا…', 'Loading…') : L('کیش بک چیک کریں', 'Check Cash Book')}
            </button>
          </>
        }
      />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {!opened ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-[#9ec4d8] bg-[#cfe6f2] text-sm text-[#0d5f86]/80 shadow-inner">
            <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>
              {L('تاریخ چن کر کیش بک چیک کریں دبائیں', 'Pick a date and click Check Cash Book')}
            </span>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl">
            <div
              className="mb-2 flex justify-end print:hidden"
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
            >
              <MandiExpandButton lang={lang} onClick={() => setExpanded(true)} />
            </div>
            <CashBookReport
              lang={lang}
              L={L}
              today={today}
              bookDate={bookDate}
              dayData={dayData}
              creditTotal={creditTotal}
              debitTotal={debitTotal}
              currentCash={currentCash}
              moveDays={moveDays}
              goToday={goToday}
            />
          </div>
        )}
      </div>

      <MandiExpandModal
        open={expanded && opened}
        onClose={() => setExpanded(false)}
        lang={lang}
        titleUr="کیش بک — مکمل دیکھیں"
        titleEn="Cash Book — Full View"
        subtitle={formatDashDate(bookDate)}
      >
        <div className="mx-auto max-w-7xl">
          <CashBookReport
            lang={lang}
            L={L}
            today={today}
            bookDate={bookDate}
            dayData={dayData}
            creditTotal={creditTotal}
            debitTotal={debitTotal}
            currentCash={currentCash}
            moveDays={moveDays}
            goToday={goToday}
          />
        </div>
      </MandiExpandModal>
    </div>
  )
}

function CashBookReport({
  lang,
  L,
  today,
  bookDate,
  dayData,
  creditTotal,
  debitTotal,
  currentCash,
  moveDays,
  goToday,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  today: Date
  bookDate: Date
  dayData: { credit: { detailUr: string; detailEn: string; amount: number }[]; debit: { detailUr: string; detailEn: string; amount: number }[] }
  creditTotal: number
  debitTotal: number
  currentCash: number
  moveDays: (n: number) => void
  goToday: () => void
}) {
  return (
    <div className="rounded border border-slate-400 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 border-4 border-double border-slate-900 px-3 py-3 text-center">
        <div className="mb-1 flex justify-center">
          <Wallet className="h-5 w-5 text-[#0d5f86]" />
        </div>
        <h2 className={cn('text-lg font-bold text-slate-900 sm:text-xl', lang === 'ur' && 'font-urdu')}>
          {lang === 'ur' ? SHOP_TITLE_UR : SHOP_TITLE_EN}
        </h2>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800" dir="ltr">
          Today Date: {formatUs(today)}
        </p>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
          <NavIconBtn label={L('۱۰ دن پیچھے', 'Back 10 days')} onClick={() => moveDays(-10)}>
            <span className="relative inline-flex">
              <ChevronsLeft className="h-5 w-5 text-sky-700" />
              <span className="absolute -top-1 start-1/2 -translate-x-1/2 text-[9px] font-bold text-sky-800">
                10
              </span>
            </span>
          </NavIconBtn>
          <NavIconBtn label={L('ایک دن پیچھے', 'Previous day')} onClick={() => moveDays(-1)}>
            <ChevronLeft className="h-6 w-6 text-emerald-600" />
          </NavIconBtn>
          <NavIconBtn label={L('آج', 'Today')} onClick={goToday}>
            <Home className="h-5 w-5 text-orange-500" />
          </NavIconBtn>
          <NavIconBtn label={L('ایک دن آگے', 'Next day')} onClick={() => moveDays(1)}>
            <ChevronRight className="h-6 w-6 text-emerald-600" />
          </NavIconBtn>
          <NavIconBtn label={L('۱۰ دن آگے', 'Forward 10 days')} onClick={() => moveDays(10)}>
            <span className="relative inline-flex">
              <ChevronsRight className="h-5 w-5 text-sky-700" />
              <span className="absolute -top-1 start-1/2 -translate-x-1/2 text-[9px] font-bold text-sky-800">
                10
              </span>
            </span>
          </NavIconBtn>
          <span className={cn('ms-1 text-sm font-bold text-slate-800', lang === 'ur' && 'font-urdu')}>
            {L('کیش بک', 'Cash Book')}
          </span>
        </div>

        <p className="text-sm font-semibold text-slate-800" dir="ltr">
          Cash Book Date: {formatIso(bookDate)}
        </p>
      </div>

      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full min-w-[720px] border-collapse border border-slate-900 text-[13px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-900 px-2.5 py-2.5 text-center font-bold">
                {L('تفصیل پارٹی', 'Party Detail')}
              </th>
              <th className="border border-slate-900 px-2.5 py-2.5 text-center font-bold">
                {L('جمع', 'Credit')}
              </th>
              <th className="border border-slate-900 px-2.5 py-2.5 text-center font-bold">
                {L('تفصیل پارٹی', 'Party Detail')}
              </th>
              <th className="border border-slate-900 px-2.5 py-2.5 text-center font-bold">
                {L('بنام', 'Debit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({
              length: Math.max(dayData.credit.length, dayData.debit.length, 1),
            }).map((_, i) => {
              const c = dayData.credit[i]
              const d = dayData.debit[i]
              return (
                <tr key={i} className="odd:bg-white even:bg-slate-50/60">
                  <td
                    className={cn(
                      'border border-slate-900 px-2.5 py-2 text-center leading-snug',
                      lang === 'ur' && 'font-urdu'
                    )}
                  >
                    {c ? L(c.detailUr, c.detailEn) : ''}
                  </td>
                  <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                    {c ? formatRs(c.amount) : ''}
                  </td>
                  <td
                    className={cn(
                      'border border-slate-900 px-2.5 py-2 text-center leading-snug',
                      lang === 'ur' && 'font-urdu'
                    )}
                  >
                    {d ? L(d.detailUr, d.detailEn) : ''}
                  </td>
                  <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                    {d ? formatRs(d.amount) : ''}
                  </td>
                </tr>
              )
            })}

            <tr className="bg-slate-100 font-bold">
              <td className={cn('border border-slate-900 px-2.5 py-2.5 text-center', lang === 'ur' && 'font-urdu')}>
                {L('کل رقم', 'Total')}
              </td>
              <td className="border border-slate-900 px-2.5 py-2.5 text-center tabular-nums" dir="ltr">
                {formatRs(creditTotal)}
              </td>
              <td className={cn('border border-slate-900 px-2.5 py-2.5 text-center', lang === 'ur' && 'font-urdu')}>
                {L('کل رقم', 'Total')}
              </td>
              <td className="border border-slate-900 px-2.5 py-2.5 text-center tabular-nums" dir="ltr">
                {formatRs(debitTotal)}
              </td>
            </tr>

            <tr className="bg-[#e8f4fa] font-bold">
              <td
                colSpan={4}
                className={cn(
                  'border border-slate-900 px-3 py-2.5 text-center text-base',
                  lang === 'ur' && 'font-urdu'
                )}
              >
                {L('موجودہ کیش (بنام)', 'Current Cash (Debit)')}{' '}
                <span className="ms-2 tabular-nums" dir="ltr">
                  {formatRs(currentCash)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NavIconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white"
    >
      {children}
    </button>
  )
}
