import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Boxes, Loader2, Printer, Search } from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiExpandButton, MandiExpandModal } from '@/components/mandi/MandiExpandModal'
import { ApiClientError } from '@/lib/api'
import { salesApi } from '@/lib/mandiApi'
import type { SaleBill } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Ctx {
  lang: 'en' | 'ur'
}

interface MaalRow {
  id: string
  inv: string
  date: string
  nameUr: string
  nameEn: string
  marfatUr: string
  marfatEn: string
  marka: string
  itemUr: string
  itemEn: string
  vehicle: string
  nag: number
  khana: number
  commission: number
  labor: number
  fare: number
  market: number
  ads: number
  expense: number
  store: number
  bardana: number
  gross: number
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.round(n))
}

function parseParts(v: string) {
  const m = v.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
}

function isAllFilter(value: string) {
  const v = value.trim().toLowerCase()
  return !v || v === 'all' || v === 'تمام'
}

function totalExpense(r: MaalRow) {
  return (
    r.commission +
    r.labor +
    r.fare +
    r.market +
    r.ads +
    r.expense +
    r.store +
    r.bardana +
    r.khana
  )
}

function netAmount(r: MaalRow) {
  return r.gross - totalExpense(r)
}

function toIsoDisplay(dmy: string) {
  const m = dmy.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return dmy
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function marfatFromBill(b: SaleBill): { ur: string; en: string } {
  const m = b.marfat
  if (m && typeof m === 'object') {
    return {
      ur: m.marfatUr || m.marfatEn || b.marfatName || '',
      en: m.marfatEn || m.marfatUr || b.marfatName || '',
    }
  }
  return { ur: b.marfatName || '', en: b.marfatName || '' }
}

function toMaalRow(b: SaleBill): MaalRow {
  const marfat = marfatFromBill(b)
  const c = b.charges || {}
  const item =
    b.item ||
    b.lines?.find((l) => l.item)?.item ||
    b.lines?.find((l) => l.name)?.name ||
    ''
  return {
    id: b._id,
    inv: b.invoice,
    date: b.date,
    nameUr: b.landowner || '',
    nameEn: b.landowner || '',
    marfatUr: marfat.ur,
    marfatEn: marfat.en,
    marka: b.marka || '',
    itemUr: item,
    itemEn: item,
    vehicle: b.vehicle || '',
    nag: Number(b.totalNag) || b.lines?.reduce((s, l) => s + (Number(l.pieces) || 0), 0) || 0,
    khana: Number(b.lagana) || 0,
    commission: Number(c.commission) || 0,
    labor: Number(c.labor) || 0,
    fare: Number(c.fare) || 0,
    market: Number(c.market) || 0,
    ads: Number(c.munshiana) || 0,
    expense: Number(c.expense) || 0,
    store: Number(c.storage) || Number(c.store) || 0,
    bardana: Number(c.cashBill) || 0,
    gross: Number(b.grossAmount) || 0,
  }
}

/** مال کھاتہ — live sale goods ledger report */
export function MaalKhataPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [rows, setRows] = useState<MaalRow[]>([])
  const [loading, setLoading] = useState(true)

  const [date1, setDate1] = useState(todayStr())
  const [date2, setDate2] = useState(todayStr())
  const [vehicle, setVehicle] = useState('all')
  const [item, setItem] = useState('all')
  const [party, setParty] = useState('all')
  const [opened, setOpened] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const sales = await salesApi.list()
      setRows(sales.map(toMaalRow))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((r) => {
      const key = r.nameEn || r.nameUr
      if (key) map.set(key, r.nameUr || r.nameEn)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ur'))
  }, [rows])

  const itemOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((r) => {
      const key = r.itemEn || r.itemUr
      if (key) map.set(key, r.itemUr || r.itemEn)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ur'))
  }, [rows])

  const vehicleOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.vehicle).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [rows]
  )

  const filtered = useMemo(() => {
    const from = parseParts(date1)
    const to = parseParts(date2)
    return rows.filter((r) => {
      if (!isAllFilter(vehicle) && r.vehicle !== vehicle) return false
      if (item !== 'all' && r.itemEn !== item && r.itemUr !== item) return false
      if (party !== 'all' && r.nameEn !== party && r.nameUr !== party) return false
      const bd = parseParts(r.date.replace(/-/g, '/'))
      if (from && bd && bd < from) return false
      if (to && bd && bd > to) return false
      return true
    })
  }, [rows, vehicle, item, party, date1, date2])

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.nag += r.nag
        acc.khana += r.khana
        acc.commission += r.commission
        acc.labor += r.labor
        acc.fare += r.fare
        acc.market += r.market
        acc.ads += r.ads
        acc.expense += r.expense
        acc.store += r.store
        acc.bardana += r.bardana
        acc.totalExp += totalExpense(r)
        acc.gross += r.gross
        acc.net += netAmount(r)
        return acc
      },
      {
        nag: 0,
        khana: 0,
        commission: 0,
        labor: 0,
        fare: 0,
        market: 0,
        ads: 0,
        expense: 0,
        store: 0,
        bardana: 0,
        totalExp: 0,
        gross: 0,
        net: 0,
      }
    )
  }, [filtered])

  const searchBills = (e: React.FormEvent) => {
    e.preventDefault()
    setOpened(true)
    toast.success(
      filtered.length
        ? L(`${filtered.length} ریکارڈ ملے`, `${filtered.length} record(s) found`)
        : L('کوئی ریکارڈ نہیں', 'No records')
    )
  }

  const headers = [
    '#',
    'INV',
    L('تاریخ', 'Date'),
    L('نام', 'Name'),
    L('معرفت', 'Marfat'),
    L('مارکہ', 'Marka'),
    L('جنس', 'Item'),
    L('گاڑی نمبر', 'Veh#'),
    L('نگ', 'Nag'),
    L('کھانہ', 'Khana'),
    L('کمیشن', 'Comm.'),
    L('مزدوری', 'Labor'),
    L('کرایہ', 'Fare'),
    L('مارکیٹ فیس', 'Market'),
    L('اشتہار', 'Ads'),
    L('خرچہ', 'Exp.'),
    L('سٹور', 'Store'),
    L('باردانہ', 'Bardana'),
    L('کل خرچہ', 'Tot. Exp'),
    L('خام رقم', 'Gross'),
    L('صافی رقم', 'Net'),
  ]

  const renderRows = (list: MaalRow[]) =>
    list.length === 0 ? (
      <tr>
        <td colSpan={headers.length} className={cn('px-3 py-12 text-center text-slate-400', rtl && 'font-urdu')}>
          {L('کوئی ریکارڈ نہیں', 'No records')}
        </td>
      </tr>
    ) : (
      list.map((r, i) => (
        <tr key={r.id} className="odd:bg-white even:bg-slate-50">
          <Td>{i + 1}</Td>
          <Td>{r.inv}</Td>
          <Td>{r.date}</Td>
          <Td className={rtl ? 'font-urdu' : ''}>{lang === 'ur' ? r.nameUr : r.nameEn}</Td>
          <Td className={rtl ? 'font-urdu' : ''}>{lang === 'ur' ? r.marfatUr : r.marfatEn}</Td>
          <Td>{r.marka}</Td>
          <Td className={rtl ? 'font-urdu' : ''}>{lang === 'ur' ? r.itemUr : r.itemEn}</Td>
          <Td>{r.vehicle}</Td>
          <Td>{formatRs(r.nag)}</Td>
          <Td>{formatRs(r.khana)}</Td>
          <Td>{formatRs(r.commission)}</Td>
          <Td>{formatRs(r.labor)}</Td>
          <Td>{formatRs(r.fare)}</Td>
          <Td>{formatRs(r.market)}</Td>
          <Td>{formatRs(r.ads)}</Td>
          <Td>{formatRs(r.expense)}</Td>
          <Td>{formatRs(r.store)}</Td>
          <Td>{formatRs(r.bardana)}</Td>
          <Td className="font-semibold">{formatRs(totalExpense(r))}</Td>
          <Td className="font-semibold">{formatRs(r.gross)}</Td>
          <Td className="font-bold text-[#0d5f86]">{formatRs(netAmount(r))}</Td>
        </tr>
      ))
    )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white print:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {L('مال کھاتہ', 'Goods Ledger')}
            </h1>
            <p className="text-[10px] text-sky-100/90">{L('چیک مال رپورٹ', 'Check Goods Report')}</p>
          </div>
        </div>
        <MandiHomeLink lang={lang} className="ms-auto" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5 print:overflow-visible print:p-0">
        <form
          onSubmit={searchBills}
          className="shrink-0 rounded-xl bg-white p-3 pb-4 shadow-sm ring-1 ring-black/5 print:hidden"
        >
          <div
            className={cn(
              'mb-3 flex items-center justify-center gap-2 rounded-lg bg-[#0d5f86] px-3 py-2 text-center text-sm font-bold text-white',
              rtl && 'font-urdu text-base'
            )}
          >
            {L('چیک مال رپورٹ', 'Check Goods Report')}
            {loading && <Loader2 className="h-4 w-4 animate-spin opacity-80" />}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Field label={L('پارٹی نام', 'Party name')}>
              <select
                value={party}
                onChange={(e) => setParty(e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              >
                <option value="all">{L('تمام', 'All')}</option>
                {partyOptions.map(([en, ur]) => (
                  <option key={en} value={en}>
                    {lang === 'ur' ? ur : en}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={L('جنس', 'Item')}>
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              >
                <option value="all">{L('تمام', 'All')}</option>
                {itemOptions.map(([en, ur]) => (
                  <option key={en} value={en}>
                    {lang === 'ur' ? ur : en}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={L('گاڑی نمبر', 'Vehicle No')}>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className={cn('mandi-input text-center', rtl && 'font-urdu')}
                dir={rtl ? 'rtl' : 'ltr'}
              >
                <option value="all">{L('تمام', 'All')}</option>
                {vehicleOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={L('تاریخ 1', 'Date 1')} className="w-[11.5rem]">
              <MandiDatePicker value={date1} onChange={setDate1} lang={lang} className="w-full" />
            </Field>

            <Field label={L('تاریخ 2', 'Date 2')} className="w-[11.5rem]">
              <MandiDatePicker value={date2} onChange={setDate2} lang={lang} className="w-full" />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'inline-flex h-10 min-w-[140px] items-center justify-center gap-1.5 rounded-lg bg-[#0d5f86] px-4 text-sm font-bold text-white hover:bg-[#0a4c6b] disabled:opacity-50',
                rtl && 'font-urdu'
              )}
            >
              <Search className="h-4 w-4" />
              {L('بل تلاش کریں', 'Search Bills')}
            </button>
            {opened && (
              <p className={cn('text-xs font-semibold text-slate-500', rtl && 'font-urdu')}>
                {L(`${filtered.length} ریکارڈ`, `${filtered.length} record(s)`)}
              </p>
            )}
          </div>
        </form>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:shadow-none print:ring-0">
          {loading ? (
            <div className="flex flex-1 items-center justify-center print:hidden">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d5f86]" />
            </div>
          ) : !opened ? (
            <div className="flex flex-1 items-center justify-center bg-[#eef5f9] p-6 print:hidden">
              <p className={cn('text-sm text-[#0d5f86]/75', rtl && 'font-urdu text-base')}>
                {L(
                  'فلٹر چن کر بل تلاش کریں دبائیں — مال کھاتہ یہاں آئے گا',
                  'Set filters and click Search Bills to open ledger'
                )}
              </p>
            </div>
          ) : (
            <>
              <div
                className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5 print:border-0 print:bg-white"
                dir={rtl ? 'rtl' : 'ltr'}
              >
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700',
                      rtl && 'font-urdu'
                    )}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {L('پرنٹ آؤٹ', 'Print Out')}
                  </button>
                  <MandiExpandButton lang={lang} onClick={() => setExpanded(true)} />
                </div>
                <div className="text-center">
                  <p className={cn('text-sm font-bold text-slate-800', rtl && 'font-urdu')}>
                    {L('بقایا کھاتہ', 'Balance Ledger')}
                  </p>
                  <p className="text-[11px] font-semibold tabular-nums text-slate-500" dir="ltr">
                    To: {toIsoDisplay(date2)} — {date1.replace(/\//g, '-')}
                  </p>
                </div>
                <p className="text-xs font-semibold tabular-nums text-slate-600" dir="ltr">
                  {toIsoDisplay(date2)}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">
                <table className="w-full min-w-[1400px] border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0d5f86] text-white">
                      {headers.map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap border border-[#0a4c6b] px-1.5 py-2 text-center font-bold',
                            rtl && 'font-urdu'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows(filtered)}
                    {filtered.length > 0 && (
                      <tr className="bg-rose-500 font-bold text-white">
                        <td
                          colSpan={8}
                          className={cn('border border-rose-600 px-2 py-2 text-center', rtl && 'font-urdu')}
                        >
                          {L('کل', 'Total')}
                        </td>
                        <Td strong>{formatRs(totals.nag)}</Td>
                        <Td strong>{formatRs(totals.khana)}</Td>
                        <Td strong>{formatRs(totals.commission)}</Td>
                        <Td strong>{formatRs(totals.labor)}</Td>
                        <Td strong>{formatRs(totals.fare)}</Td>
                        <Td strong>{formatRs(totals.market)}</Td>
                        <Td strong>{formatRs(totals.ads)}</Td>
                        <Td strong>{formatRs(totals.expense)}</Td>
                        <Td strong>{formatRs(totals.store)}</Td>
                        <Td strong>{formatRs(totals.bardana)}</Td>
                        <Td strong>{formatRs(totals.totalExp)}</Td>
                        <Td strong>{formatRs(totals.gross)}</Td>
                        <Td strong>{formatRs(totals.net)}</Td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-700 text-white">
                      {headers.map((h) => (
                        <th
                          key={`f-${h}`}
                          className={cn(
                            'whitespace-nowrap border border-slate-800 px-1.5 py-2 text-center font-bold',
                            rtl && 'font-urdu'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      <MandiExpandModal
        open={expanded && opened}
        onClose={() => setExpanded(false)}
        lang={lang}
        titleUr="مال کھاتہ — مکمل دیکھیں"
        titleEn="Maal Khata — Full View"
        subtitle={`${date1.replace(/\//g, '-')} → ${date2.replace(/\//g, '-')}`}
      >
        <div className="overflow-auto rounded border border-slate-400 bg-white shadow-lg">
          <table className="w-full min-w-[1400px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#0d5f86] text-white">
                {headers.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'whitespace-nowrap border border-[#0a4c6b] px-1.5 py-2 text-center font-bold',
                      rtl && 'font-urdu'
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows(filtered)}</tbody>
          </table>
        </div>
      </MandiExpandModal>
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

function Td({
  children,
  className,
  strong,
}: {
  children?: React.ReactNode
  className?: string
  strong?: boolean
}) {
  return (
    <td
      className={cn(
        'border border-slate-200 px-1.5 py-1.5 text-center tabular-nums whitespace-nowrap',
        strong && 'border-rose-600',
        className
      )}
      dir="ltr"
    >
      {children}
    </td>
  )
}
