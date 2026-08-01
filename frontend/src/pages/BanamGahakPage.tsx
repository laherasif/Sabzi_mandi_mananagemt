import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Contact, FileSpreadsheet, Printer, ScrollText } from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api'
import { ledgerApi } from '@/lib/mandiApi'
import type { Party } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

type ViewMode = 'list' | 'parchi' | 'chatha' | 'banam'

interface DebitRow {
  id: string
  nameUr: string
  nameEn: string
  nag: number
  amount: number
  status: 'open' | 'partial' | 'paid'
  date: string
}

function mapCustomerDebit(p: Party): DebitRow {
  const balance = Number(p.balance) || 0
  return {
    id: p._id,
    nameUr: p.nameUr || '',
    nameEn: p.nameEn || '',
    nag: 0,
    amount: balance,
    status: balance > 0 ? 'open' : 'paid',
    date: todayStr(),
  }
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.round(n))
}

/** بنام گاہک — Customer debit list / parchi / chatha */
export function BanamGahakPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [status, setStatus] = useState<'all' | 'open' | 'partial' | 'paid'>('all')
  const [mode, setMode] = useState<ViewMode>('banam')
  const [selected, setSelected] = useState<string[]>([])
  const [allRows, setAllRows] = useState<DebitRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const summary = await ledgerApi.summary()
        if (cancelled) return
        const mapped = (summary.customerDebits || []).map(mapCustomerDebit)
        setAllRows(mapped)
        setSelected(mapped.map((r) => r.id))
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Summary has no per-row dates — status filter only; date pickers kept for UI/print
  const displayRows = useMemo(() => {
    if (status === 'all') return allRows
    return allRows.filter((r) => r.status === status)
  }, [allRows, status])

  const totals = useMemo(() => {
    const source =
      selected.length > 0 ? displayRows.filter((r) => selected.includes(r.id)) : displayRows
    return {
      nag: source.reduce((s, r) => s + r.nag, 0),
      amount: source.reduce((s, r) => s + r.amount, 0),
    }
  }, [displayRows, selected])

  const allChecked = displayRows.length > 0 && selected.length === displayRows.length

  const toggleAll = () => {
    if (allChecked) setSelected([])
    else setSelected(displayRows.map((r) => r.id))
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const runAction = (next: ViewMode) => {
    setMode(next)
    if (next === 'parchi') {
      if (selected.length === 0) {
        toast.message(L('پہلے قطار منتخب کریں', 'Select rows first'))
        return
      }
      toast.success(L('پرچی تیار — پرنٹ کھولیں', 'Parchi ready — open print'))
      setTimeout(() => window.print(), 150)
    } else if (next === 'chatha') {
      toast.success(L('چٹھہ رپورٹ کھلی', 'Chatha report opened'))
    } else {
      toast.message(L('بنام گاہک لسٹ', 'Customer debit list'))
    }
  }

  const modeTitle =
    mode === 'parchi'
      ? L('پرچی', 'Parchi / Slip')
      : mode === 'chatha'
        ? L('چٹھہ', 'Chatha')
        : L('بنام گاہک', 'Customer Debit')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white print:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Contact className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {L('بنام گاہک', 'Customer Debit')}
            </h1>
            <p className="text-[10px] text-sky-100/90">{modeTitle}</p>
          </div>
        </div>
        <MandiHomeLink lang={lang} className="ms-auto" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5 print:overflow-visible print:p-0">
        {/* Toolbar */}
        <section className="shrink-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 print:hidden">
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label={L('تاریخ از', 'Date from')} className="w-[11.5rem]">
              <MandiDatePicker value={dateFrom} onChange={setDateFrom} lang={lang} className="w-full" />
            </Field>
            <Field label={L('تاریخ تک', 'Date to')} className="w-[11.5rem]">
              <MandiDatePicker value={dateTo} onChange={setDateTo} lang={lang} className="w-full" />
            </Field>
            <Field label={L('حیثیت', 'Status')} className="w-[140px]">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              >
                <option value="all">{L('تمام', 'All')}</option>
                <option value="open">{L('باقی', 'Open')}</option>
                <option value="partial">{L('جزوی', 'Partial')}</option>
                <option value="paid">{L('ادا شدہ', 'Paid')}</option>
              </select>
            </Field>

            <div className="ms-auto flex flex-wrap items-center gap-2">
              <ActionBtn
                active={mode === 'parchi'}
                onClick={() => runAction('parchi')}
                tone="sky"
                urdu={rtl}
                icon={<ScrollText className="h-3.5 w-3.5" />}
              >
                {L('پرچی', 'Parchi')}
              </ActionBtn>
              <ActionBtn
                active={mode === 'chatha'}
                onClick={() => runAction('chatha')}
                tone="emerald"
                urdu={rtl}
                icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              >
                {L('چٹھہ', 'Chatha')}
              </ActionBtn>
              <ActionBtn
                active={mode === 'banam'}
                onClick={() => runAction('banam')}
                tone="blue"
                urdu={rtl}
                icon={<Contact className="h-3.5 w-3.5" />}
              >
                {L('بنام گاہک', 'Customer Debit')}
              </ActionBtn>
              <button
                type="button"
                onClick={() => window.print()}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700',
                  rtl && 'font-urdu'
                )}
              >
                <Printer className="h-3.5 w-3.5" />
                {L('پرنٹ آؤٹ', 'Print Out')}
              </button>
            </div>
          </div>
        </section>

        {/* Table / report */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:shadow-none print:ring-0">
          {mode === 'chatha' ? (
            <ChathaView rows={displayRows} selected={selected} lang={lang} L={L} rtl={rtl} />
          ) : mode === 'parchi' ? (
            <ParchiView
              rows={displayRows.filter((r) => selected.includes(r.id))}
              lang={lang}
              L={L}
              rtl={rtl}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0d5f86] text-white">
                      <th className="w-28 px-3 py-2.5 text-center text-xs font-bold">
                        <label className="inline-flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={toggleAll}
                            className="h-3.5 w-3.5"
                          />
                          <span className={rtl ? 'font-urdu' : ''}>{L('تمام چیک', 'Check all')}</span>
                        </label>
                      </th>
                      <th className={cn('px-3 py-2.5 text-start text-xs font-bold', rtl && 'font-urdu')}>
                        {L('نام', 'Name')}
                      </th>
                      <th className={cn('px-3 py-2.5 text-center text-xs font-bold', rtl && 'font-urdu')}>
                        {L('نگ', 'Nag')}
                      </th>
                      <th className={cn('px-3 py-2.5 text-center text-xs font-bold', rtl && 'font-urdu')}>
                        {L('بنام / رقم', 'Debit / Amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className={cn('px-3 py-14 text-center text-slate-400', rtl && 'font-urdu')}
                        >
                          {L('کوئی ریکارڈ نہیں', 'No records')}
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((r) => (
                        <tr
                          key={r.id}
                          className={cn(
                            'border-t border-slate-100 transition hover:bg-sky-50',
                            selected.includes(r.id) && 'bg-sky-50'
                          )}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selected.includes(r.id)}
                              onChange={() => toggleOne(r.id)}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                          <td className={cn('px-3 py-2.5 font-semibold text-slate-900', rtl && 'font-urdu')}>
                            {lang === 'ur' ? r.nameUr : r.nameEn}
                            <span className="ms-2 text-[10px] font-medium text-slate-400" dir="ltr">
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-semibold tabular-nums" dir="ltr">
                            {formatRs(r.nag)}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold tabular-nums text-[#0d5f86]" dir="ltr">
                            {formatRs(r.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className={cn(
                  'flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#7eb6d4] bg-[#e8f4fb] px-4 py-3',
                  rtl && 'font-urdu'
                )}
              >
                <p className="text-sm font-bold text-[#0d5f86]">
                  {L('ٹوٹل نگ', 'Total Nag')}
                  <span className="ms-2 tabular-nums" dir="ltr">
                    {formatRs(totals.nag)}
                  </span>
                </p>
                <p className="text-sm font-bold text-[#0d5f86]">
                  {L('ٹوٹل رقم بنام', 'Total Debit Amount')}
                  <span className="ms-2 text-base tabular-nums" dir="ltr">
                    {formatRs(totals.amount)}
                  </span>
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function ChathaView({
  rows,
  selected,
  lang,
  L,
  rtl,
}: {
  rows: DebitRow[]
  selected: string[]
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  rtl: boolean
}) {
  const list = selected.length ? rows.filter((r) => selected.includes(r.id)) : rows
  const totalNag = list.reduce((s, r) => s + r.nag, 0)
  const totalAmt = list.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 print:overflow-visible">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className={cn('mb-3 text-center text-lg font-bold text-[#0d5f86]', rtl && 'font-urdu text-xl')}>
          {L('چٹھہ — بنام گاہک', 'Chatha — Customer Debit')}
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border px-2 py-2">#</th>
              <th className={cn('border px-2 py-2', rtl && 'font-urdu')}>{L('نام', 'Name')}</th>
              <th className={cn('border px-2 py-2', rtl && 'font-urdu')}>{L('نگ', 'Nag')}</th>
              <th className={cn('border px-2 py-2', rtl && 'font-urdu')}>{L('رقم', 'Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={r.id}>
                <td className="border px-2 py-1.5 text-center tabular-nums" dir="ltr">
                  {i + 1}
                </td>
                <td className={cn('border px-2 py-1.5', rtl && 'font-urdu')}>
                  {lang === 'ur' ? r.nameUr : r.nameEn}
                </td>
                <td className="border px-2 py-1.5 text-center tabular-nums" dir="ltr">
                  {formatRs(r.nag)}
                </td>
                <td className="border px-2 py-1.5 text-center font-bold tabular-nums" dir="ltr">
                  {formatRs(r.amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-amber-100 font-bold">
              <td className="border px-2 py-2" colSpan={2}>
                {L('کل', 'Total')}
              </td>
              <td className="border px-2 py-2 text-center tabular-nums" dir="ltr">
                {formatRs(totalNag)}
              </td>
              <td className="border px-2 py-2 text-center tabular-nums" dir="ltr">
                {formatRs(totalAmt)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ParchiView({
  rows,
  lang,
  L,
  rtl,
  dateFrom,
  dateTo,
}: {
  rows: DebitRow[]
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  rtl: boolean
  dateFrom: string
  dateTo: string
}) {
  if (rows.length === 0) {
    return (
      <div className={cn('flex flex-1 items-center justify-center p-8 text-slate-400', rtl && 'font-urdu')}>
        {L('پرچی کے لیے قطار منتخب کریں', 'Select rows for parchi')}
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 print:overflow-visible">
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <article
            key={r.id}
            className="break-inside-avoid rounded-xl border-2 border-[#0d5f86] bg-white p-4 shadow-sm"
            dir={rtl ? 'rtl' : 'ltr'}
          >
            <p className={cn('text-center text-xs font-bold text-[#0d5f86]', rtl && 'font-urdu')}>
              {L('بنام گاہک — پرچی', 'Customer Debit — Slip')}
            </p>
            <p className="mt-1 text-center text-[10px] text-slate-500" dir="ltr">
              {dateFrom} → {dateTo}
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <Row label={L('نام', 'Name')} value={lang === 'ur' ? r.nameUr : r.nameEn} urdu={rtl} />
              <Row label={L('نگ', 'Nag')} value={formatRs(r.nag)} dir="ltr" urdu={rtl} />
              <Row
                label={L('بنام رقم', 'Debit amount')}
                value={formatRs(r.amount)}
                dir="ltr"
                urdu={rtl}
                bold
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  urdu,
  dir,
  bold,
}: {
  label: string
  value: string
  urdu?: boolean
  dir?: 'ltr' | 'rtl'
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-200 pb-1.5">
      <span className={cn('text-xs font-bold text-slate-500', urdu && 'font-urdu')}>{label}</span>
      <span className={cn('text-sm', bold && 'font-bold text-[#0d5f86]', urdu && 'font-urdu')} dir={dir}>
        {value}
      </span>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block min-w-0 space-y-1', className)}>
      <span className="mandi-label">{label}</span>
      {children}
    </label>
  )
}

function ActionBtn({
  children,
  active,
  onClick,
  tone,
  urdu,
  icon,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  tone: 'sky' | 'emerald' | 'blue'
  urdu?: boolean
  icon?: React.ReactNode
}) {
  const tones = {
    sky: active ? 'bg-sky-700 text-white' : 'bg-sky-600 text-white hover:bg-sky-700',
    emerald: active ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700',
    blue: active ? 'bg-[#0a4c6b] text-white' : 'bg-[#0d5f86] text-white hover:bg-[#0a4c6b]',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold shadow-sm',
        tones[tone],
        urdu && 'font-urdu'
      )}
    >
      {icon}
      {children}
    </button>
  )
}
