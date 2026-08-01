import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Printer } from 'lucide-react'
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

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatUsShort(d: Date) {
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${String(d.getFullYear()).slice(-2)}`
}

function formatRs(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-PK').format(abs)
  return n < 0 ? `-${formatted}` : formatted
}

/** روزنامچہ بک — Day Book */
export function RoznamchaPage() {
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

  const data = useMemo(
    () => buildDayBookFromVouchers(vouchers, bookDate, lang),
    [vouchers, bookDate, lang]
  )
  const creditTotal = useMemo(() => data.credit.reduce((s, r) => s + r.amount, 0), [data.credit])
  const debitTotal = useMemo(() => data.debit.reduce((s, r) => s + r.amount, 0), [data.debit])
  // موجودہ کیش (جمع) — screenshot shows positive current cash as جمع
  const currentCash = Math.abs(creditTotal) - debitTotal
  const currentSide = currentCash >= 0 ? L('جمع', 'Credit') : L('بنام', 'Debit')

  const dateLabel = formatDashDate(bookDate)

  const loadDayBook = async () => {
    const parsed = parseDisplayDate(pickerDate)
    if (!parsed) {
      toast.error(L('تاریخ درست نہیں', 'Invalid date'))
      return false
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
      return true
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
      return false
    } finally {
      setLoading(false)
    }
  }

  const openPrintout = async () => {
    const ok = await loadDayBook()
    if (ok) toast.success(L('روزنامچہ کھل گیا', 'Day book opened'))
  }

  const printOut = async () => {
    if (!opened) {
      const ok = await loadDayBook()
      if (!ok) return
      setTimeout(() => window.print(), 150)
      return
    }
    window.print()
  }

  const toolbarDate = (() => {
    const p = parseDisplayDate(pickerDate)
    return p ? formatDashDate(p) : pickerDate.replaceAll('/', '-')
  })()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <MandiPageHeader
        lang={lang}
        titleUr="روزنامچہ بک"
        titleEn="Roznamcha Book"
        subtitle={`Day Book · ${toolbarDate}`}
        icon={BookOpen}
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
              onClick={() => void printOut()}
              disabled={loading}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#0d5f86] bg-white px-4 text-sm font-bold leading-none text-[#0d5f86] shadow-sm hover:bg-sky-50 disabled:opacity-60',
                lang === 'ur' && 'font-urdu'
              )}
            >
              <Printer className="h-4 w-4" />
              {L('پرنٹ آؤٹ', 'Print Out')}
            </button>
            <button
              type="button"
              onClick={() => void openPrintout()}
              disabled={loading}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#0d5f86] px-4 text-sm font-bold leading-none text-white shadow-sm hover:bg-[#0a4c6b] disabled:opacity-60',
                lang === 'ur' && 'font-urdu'
              )}
            >
              <BookOpen className="h-4 w-4" />
              {loading ? L('لوڈ…', 'Load…') : L('کھولیں', 'Open')}
            </button>
          </>
        }
      />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto p-3 print:p-0">
        {!opened ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-[#9ec4d8] bg-[#cfe6f2] text-sm text-[#0d5f86]/80 shadow-inner">
            <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>
              {L('تاریخ چن کر پرنٹ آؤٹ / کھولیں دبائیں', 'Pick a date then Print Out / Open')}
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
            <RoznamchaReport
              lang={lang}
              L={L}
              bookDate={bookDate}
              dateLabel={dateLabel}
              data={data}
              creditTotal={creditTotal}
              debitTotal={debitTotal}
              currentCash={currentCash}
              currentSide={currentSide}
            />
          </div>
        )}
      </div>

      <MandiExpandModal
        open={expanded && opened}
        onClose={() => setExpanded(false)}
        lang={lang}
        titleUr="روزنامچہ — مکمل دیکھیں"
        titleEn="Roznamcha — Full View"
        subtitle={dateLabel}
      >
        <div className="mx-auto max-w-7xl">
          <RoznamchaReport
            lang={lang}
            L={L}
            bookDate={bookDate}
            dateLabel={dateLabel}
            data={data}
            creditTotal={creditTotal}
            debitTotal={debitTotal}
            currentCash={currentCash}
            currentSide={currentSide}
          />
        </div>
      </MandiExpandModal>
    </div>
  )
}

function RoznamchaReport({
  lang,
  L,
  bookDate,
  dateLabel,
  data,
  creditTotal,
  debitTotal,
  currentCash,
  currentSide,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  bookDate: Date
  dateLabel: string
  data: {
    credit: { detailUr: string; detailEn: string; amount: number; muted?: boolean }[]
    debit: { detailUr: string; detailEn: string; amount: number; muted?: boolean }[]
  }
  creditTotal: number
  debitTotal: number
  currentCash: number
  currentSide: string
}) {
  return (
    <div className="rounded border border-slate-400 bg-white p-4 shadow-sm print:border-0 print:shadow-none sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tabular-nums text-slate-800" dir="ltr">
          {formatUsShort(bookDate)}
        </p>
        <h2 className={cn('text-center text-xl font-bold text-slate-900', lang === 'ur' && 'font-urdu')}>
          {L('روزنامچہ', 'Roznamcha')}
          <span className="ms-2 text-sm font-semibold tabular-nums" dir="ltr">
            {dateLabel}-----{dateLabel}
          </span>
        </h2>
        <span className="hidden w-16 sm:block" aria-hidden />
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
              length: Math.max(data.credit.length, data.debit.length, 1),
            }).map((_, i) => {
              const c = data.credit[i]
              const d = data.debit[i]
              return (
                <tr
                  key={i}
                  className={cn(
                    i % 3 === 2 ? 'bg-slate-100/80' : 'bg-white',
                    (c?.muted || d?.muted) && 'text-slate-400'
                  )}
                >
                  <td
                    className={cn(
                      'border border-slate-900 px-2.5 py-2 text-center leading-snug',
                      lang === 'ur' && 'font-urdu'
                    )}
                  >
                    {c ? L(c.detailUr, c.detailEn) : ''}
                  </td>
                  <td
                    className={cn(
                      'border border-slate-900 px-2.5 py-2 text-center tabular-nums',
                      c && c.amount < 0 && 'font-bold'
                    )}
                    dir="ltr"
                  >
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
                {L('موجودہ کیش', 'Current Cash')}{' '}
                <span className="ms-2 tabular-nums" dir="ltr">
                  {formatRs(Math.abs(currentCash))} ({currentSide})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
