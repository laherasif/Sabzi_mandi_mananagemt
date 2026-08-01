import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MandiDatePicker, formatDashDate, parseDisplayDate } from '@/components/mandi/MandiDatePicker'
import { MandiPageHeader } from '@/components/mandi/MandiPageHeader'
import { MandiExpandButton, MandiExpandModal } from '@/components/mandi/MandiExpandModal'
import { ApiClientError } from '@/lib/api'
import { ledgerApi, partiesApi, vouchersApi } from '@/lib/mandiApi'
import { partyDisplayName } from '@/lib/party'
import type { Party, Voucher } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

type SheetAction = 'agrahi' | 'agrahi-banam' | null

interface AgrahiRow {
  id: string
  no: number
  name: string
  previous: number
  details: string
  recovery: number
  currentDebit: number
  balance: number
}

interface BanamKhataRow {
  id: string
  name: string
  customerNo: string
  previousDebit: number
  debit: number
  recovery: number
  currentBalance: number
  note: string
}

const FILTER_OPTIONS = ['NEW', 'OLD', 'ALL'] as const

const SHOP_TITLE_UR = 'چوہدری محمد اسلم، محمد عرفان (سبزی فروٹ کمیشن ایجنٹ)'
const SHOP_TITLE_EN = 'Ch. M. Aslam, M. Irfan (Sabzi Fruit Commission Agent)'

function todayDisplay() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.abs(n))
}

/** Normalize DD/MM/YYYY or DD-MM-YYYY for compare */
function sameDay(a: string, b: string) {
  const pa = parseDisplayDate(a.replace(/-/g, '/'))
  const pb = parseDisplayDate(b.replace(/-/g, '/'))
  if (pa && pb) {
    return (
      pa.getFullYear() === pb.getFullYear() &&
      pa.getMonth() === pb.getMonth() &&
      pa.getDate() === pb.getDate()
    )
  }
  return a.replace(/\//g, '-') === b.replace(/\//g, '-')
}

function partyIdOf(v: Voucher): string {
  if (typeof v.party === 'object' && v.party && '_id' in v.party) return String(v.party._id)
  return String(v.party || '')
}

function voucherPartyName(v: Voucher, lang: 'en' | 'ur') {
  if (v.partyName) return v.partyName
  if (typeof v.party === 'object' && v.party) return partyDisplayName(v.party, lang)
  return v.partyCode || '—'
}

function voucherPartyCode(v: Voucher) {
  if (v.partyCode) return v.partyCode
  if (typeof v.party === 'object' && v.party?.code) return v.party.code
  return ''
}

/** شیٹ — سیل مال رپورٹ (live اگراہی from recovery vouchers) */
export function SheetPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [filterType, setFilterType] = useState<(typeof FILTER_OPTIONS)[number]>('ALL')
  const [partyFilter, setPartyFilter] = useState('All')
  const [date, setDate] = useState(todayDisplay)
  const [activeAction, setActiveAction] = useState<SheetAction>(null)
  const [expanded, setExpanded] = useState(false)
  const [agrahiRows, setAgrahiRows] = useState<AgrahiRow[]>([])
  const [banamRows, setBanamRows] = useState<BanamKhataRow[]>([])
  const [loading, setLoading] = useState(false)

  const agrahiTotals = useMemo(
    () =>
      agrahiRows.reduce(
        (a, r) => ({
          previous: a.previous + r.previous,
          recovery: a.recovery + r.recovery,
          currentDebit: a.currentDebit + r.currentDebit,
          balance: a.balance + r.balance,
        }),
        { previous: 0, recovery: 0, currentDebit: 0, balance: 0 }
      ),
    [agrahiRows]
  )

  const banamTotals = useMemo(
    () =>
      banamRows.reduce(
        (a, r) => ({
          previousDebit: a.previousDebit + r.previousDebit,
          debit: a.debit + r.debit,
          recovery: a.recovery + r.recovery,
          currentBalance: a.currentBalance + r.currentBalance,
        }),
        { previousDebit: 0, debit: 0, recovery: 0, currentBalance: 0 }
      ),
    [banamRows]
  )

  const matchParty = (name: string, code?: string) => {
    const q = partyFilter.trim().toLowerCase()
    if (!q || q === 'all') return true
    return name.toLowerCase().includes(q) || (code || '').toLowerCase().includes(q)
  }

  const matchAgrahiFilter = (p: Party | undefined) => {
    if (filterType === 'ALL') return true
    const tag = (p?.agrahi || 'NEW').toUpperCase()
    return tag === filterType
  }

  const runReport = async (action: 'agrahi' | 'agrahi-banam') => {
    if (!parseDisplayDate(date.replace(/-/g, '/'))) {
      toast.error(L('تاریخ درست نہیں', 'Invalid date'))
      return
    }

    setLoading(true)
    setActiveAction(action)
    try {
      const [recoveries, debits, parties] = await Promise.all([
        vouchersApi.list('recovery'),
        vouchersApi.list('debit'),
        partiesApi.list(),
      ])

      const dayRecoveries = recoveries.filter((v) => sameDay(v.date, date))
      const dayDebits = debits.filter((v) => sameDay(v.date, date))

      const partyById = new Map(parties.map((p) => [p._id, p]))

      const recoveryByParty = new Map<string, { amount: number; details: string[]; sample: Voucher }>()
      for (const v of dayRecoveries) {
        const id = partyIdOf(v)
        if (!id) continue
        const cur = recoveryByParty.get(id) || { amount: 0, details: [], sample: v }
        cur.amount += Number(v.amount) || 0
        if (v.details?.trim()) cur.details.push(v.details.trim())
        cur.sample = v
        recoveryByParty.set(id, cur)
      }

      const debitByParty = new Map<string, number>()
      for (const v of dayDebits) {
        const id = partyIdOf(v)
        if (!id) continue
        debitByParty.set(id, (debitByParty.get(id) || 0) + (Number(v.amount) || 0))
      }

      const ids =
        action === 'agrahi'
          ? [...recoveryByParty.keys()]
          : [...new Set([...recoveryByParty.keys(), ...debitByParty.keys()])]

      const ledgers = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await ledgerApi.party(id)
            return { id, balance: Number(data.balance) || 0 }
          } catch {
            return { id, balance: partyById.get(id)?.balance ?? 0 }
          }
        })
      )
      const balanceById = new Map(ledgers.map((l) => [l.id, l.balance]))

      if (action === 'agrahi') {
        const rows: AgrahiRow[] = []
        let no = 1
        for (const id of ids) {
          const pack = recoveryByParty.get(id)
          if (!pack) continue
          const party = partyById.get(id)
          if (!matchAgrahiFilter(party)) continue
          const name = voucherPartyName(pack.sample, lang)
          const code = voucherPartyCode(pack.sample)
          if (!matchParty(name, code)) continue

          const currentBal = balanceById.get(id) ?? 0
          // Today's recovery posted as credit → undo to get previous
          const previous = currentBal + pack.amount
          const recovery = pack.amount
          const currentDebit = Math.max(0, currentBal)
          const balance = currentBal

          rows.push({
            id,
            no: no++,
            name,
            previous,
            details: pack.details.join('، ') || L('اگراہی وصولی', 'Agrahi recovery'),
            recovery,
            currentDebit,
            balance,
          })
        }
        setAgrahiRows(rows)
        setBanamRows([])
        if (rows.length === 0) {
          toast.message(L('اس تاریخ پر کوئی اگراہی نہیں', 'No Agrahi for this date'))
        } else {
          toast.success(L(`${rows.length} اگراہی لوڈ ہو گئیں`, `${rows.length} Agrahi row(s) loaded`))
        }
      } else {
        const rows: BanamKhataRow[] = []
        for (const id of ids) {
          const party = partyById.get(id)
          if (!matchAgrahiFilter(party)) continue
          const recovery = recoveryByParty.get(id)?.amount || 0
          const debit = debitByParty.get(id) || 0
          const sample = recoveryByParty.get(id)?.sample || dayDebits.find((v) => partyIdOf(v) === id)
          if (!sample) continue
          const name = voucherPartyName(sample, lang)
          const code = voucherPartyCode(sample) || party?.code || ''
          if (!matchParty(name, code)) continue

          const currentBal = balanceById.get(id) ?? 0
          // Reverse today's credit recoveries and today's debits to get previous
          const previousDebit = currentBal + recovery - debit
          rows.push({
            id,
            name,
            customerNo: code || '—',
            previousDebit,
            debit,
            recovery,
            currentBalance: currentBal,
            note: L('نقدی', 'Cash'),
          })
        }
        setBanamRows(rows)
        setAgrahiRows([])
        if (rows.length === 0) {
          toast.message(L('اس تاریخ پر کوئی ریکارڈ نہیں', 'No records for this date'))
        } else {
          toast.success(L(`${rows.length} کھاتہ لوڈ ہو گئے`, `${rows.length} account(s) loaded`))
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('رپورٹ لوڈ ناکام', 'Report load failed'))
      setAgrahiRows([])
      setBanamRows([])
    } finally {
      setLoading(false)
    }
  }

  const printOut = () => {
    if (!activeAction) {
      toast.message(L('پہلے رپورٹ کھولیں', 'Open a report first'))
      return
    }
    window.print()
  }

  const parsed = parseDisplayDate(date.replace(/-/g, '/'))
  const displayDate = parsed ? formatDashDate(parsed) : date.replaceAll('/', '-')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <MandiPageHeader
        lang={lang}
        titleUr="سیل مال رپورٹ"
        titleEn="Sale Goods Report"
        subtitle={`Sheet · ${filterType} · ${displayDate}`}
        icon={FileSpreadsheet}
        toolbar={
          <>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as (typeof FILTER_OPTIONS)[number])}
              className="h-10 min-w-[96px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              dir="ltr"
            >
              {FILTER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            <input
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="h-10 min-w-[140px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 sm:max-w-[220px]"
              placeholder={L('پارٹی / All', 'Party / All')}
              dir="ltr"
            />

            <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-[11rem]" />

            <div className="ms-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void runReport('agrahi')}
                className={cn(
                  'sheet-action-btn',
                  activeAction === 'agrahi' && 'sheet-action-btn-active',
                  lang === 'ur' && 'font-urdu',
                  loading && 'opacity-60'
                )}
              >
                {loading && activeAction === 'agrahi' ? '…' : L('اگراہی', 'Agrahi')}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => void runReport('agrahi-banam')}
                className={cn(
                  'sheet-action-btn',
                  activeAction === 'agrahi-banam' && 'sheet-action-btn-active',
                  lang === 'ur' && 'font-urdu',
                  loading && 'opacity-60'
                )}
              >
                {loading && activeAction === 'agrahi-banam'
                  ? '…'
                  : L('اگراہی بنام کھاتہ', 'Agrahi Banam Khata')}
              </button>
            </div>
          </>
        }
      />

      {/* Report body */}
      <div className="min-h-0 flex-1 overflow-auto p-3 print:p-0">
        {!activeAction ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-[#9ec4d8] bg-[#cfe6f2] text-sm text-[#0d5f86]/70 shadow-inner">
            <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>
              {L('اگراہی یا اگراہی بنام کھاتہ دبا کر شیٹ کھولیں', 'Click Agrahi or Banam Khata to open sheet')}
            </span>
          </div>
        ) : (
          <div className="sheet-print mx-auto max-w-5xl rounded border border-slate-400 bg-white p-4 shadow-sm print:max-w-none print:border-0 print:shadow-none">
            <div
              className="mb-3 flex flex-wrap items-start justify-between gap-3"
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
            >
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={printOut}
                  className={cn(
                    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold leading-none text-white hover:bg-emerald-700',
                    lang === 'ur' && 'font-urdu'
                  )}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {L('پرنٹ آؤٹ', 'Print Out')}
                </button>
                <MandiExpandButton lang={lang} onClick={() => setExpanded(true)} />
              </div>
              <p className="text-sm font-semibold tabular-nums text-slate-800" dir="ltr">
                {displayDate}
              </p>
            </div>

            {activeAction === 'agrahi' ? (
              <AgrahiSheet
                lang={lang}
                L={L}
                rows={agrahiRows}
                totals={agrahiTotals}
              />
            ) : (
              <BanamKhataSheet lang={lang} L={L} rows={banamRows} totals={banamTotals} />
            )}
          </div>
        )}
      </div>

      <MandiExpandModal
        open={expanded && !!activeAction}
        onClose={() => setExpanded(false)}
        lang={lang}
        titleUr={activeAction === 'agrahi-banam' ? 'اگراہی بنام کھاتہ — مکمل' : 'اگراہی شیٹ — مکمل'}
        titleEn={activeAction === 'agrahi-banam' ? 'Agrahi Banam — Full' : 'Agrahi Sheet — Full'}
        subtitle={displayDate}
      >
        <div className="mx-auto max-w-7xl rounded border border-slate-400 bg-white p-4 shadow-lg sm:p-6">
          {activeAction === 'agrahi' ? (
            <AgrahiSheet
              lang={lang}
              L={L}
              rows={agrahiRows}
              totals={agrahiTotals}
            />
          ) : (
            <BanamKhataSheet lang={lang} L={L} rows={banamRows} totals={banamTotals} />
          )}
        </div>
      </MandiExpandModal>
    </div>
  )
}

function AgrahiSheet({
  lang,
  L,
  rows,
  totals,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  rows: AgrahiRow[]
  totals: { previous: number; recovery: number; currentDebit: number; balance: number }
}) {
  return (
    <div dir="rtl">
      <div className="mb-4 border-4 border-double border-slate-900 px-3 py-3 text-center">
        <h2 className={cn('text-lg font-bold text-slate-900 sm:text-xl', lang === 'ur' && 'font-urdu')}>
          {lang === 'ur' ? SHOP_TITLE_UR : SHOP_TITLE_EN}
        </h2>
      </div>

      <table className="w-full border-collapse border border-slate-900 text-[13px]">
        <thead>
          <tr className="bg-slate-50">
            <Th>{L('نمبر', 'No')}</Th>
            <Th>{L('نام', 'Name')}</Th>
            <Th>{L('سابقہ رقم', 'Previous')}</Th>
            <Th>{L('تفصیلات', 'Details')}</Th>
            <Th>{L('وصولی', 'Recovery')}</Th>
            <Th>{L('موجودہ بنام', 'Current Debit')}</Th>
            <Th>{L('بقایا', 'Balance')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className={cn(
                  'border border-slate-900 px-3 py-8 text-center text-slate-500',
                  lang === 'ur' && 'font-urdu'
                )}
              >
                {L('اس تاریخ پر کوئی اگراہی نہیں ملی', 'No Agrahi found for this date')}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <Td dir="ltr">{r.no}</Td>
                <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.name}</Td>
                <Td dir="ltr">{formatRs(r.previous)}</Td>
                <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.details}</Td>
                <Td dir="ltr" className="font-semibold text-emerald-800">
                  {formatRs(r.recovery)}
                </Td>
                <Td dir="ltr" className="font-semibold text-orange-800">
                  {formatRs(r.currentDebit)}
                </Td>
                <Td dir="ltr">{formatRs(r.balance)}</Td>
              </tr>
            ))
          )}

          <tr className="bg-slate-100 font-bold">
            <td className="border border-slate-900 px-2 py-2 text-center" colSpan={2}>
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('کل ٹوٹل رقم', 'Grand Total')}</span>
            </td>
            <Td dir="ltr">{formatRs(totals.previous)}</Td>
            <td className="border border-slate-900" />
            <Td dir="ltr">{formatRs(totals.recovery)}</Td>
            <Td dir="ltr">{formatRs(totals.currentDebit)}</Td>
            <Td dir="ltr">{formatRs(totals.balance)}</Td>
          </tr>

          <tr className="bg-white font-semibold">
            <td className="border border-slate-900 px-2 py-2 text-center" colSpan={2}>
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('سابقہ آگراہی', 'Prev. Agrahi')}</span>
              <span className="ms-2 tabular-nums" dir="ltr">
                {formatRs(totals.previous)}
              </span>
            </td>
            <td className="border border-slate-900 px-2 py-2 text-center" colSpan={2}>
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('وصولی', 'Recovery')}</span>
              <span className="ms-2 tabular-nums" dir="ltr">
                {formatRs(totals.recovery)}
              </span>
            </td>
            <td className="border border-slate-900 px-2 py-2 text-center">
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('مال فروخت', 'Goods Sold')}</span>
            </td>
            <td className="border border-slate-900 px-2 py-2 text-center" colSpan={2}>
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('موجودہ رقم', 'Current Amt')}</span>
              <span className="ms-2 tabular-nums" dir="ltr">
                {formatRs(totals.balance)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function BanamKhataSheet({
  lang,
  L,
  rows,
  totals,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  rows: BanamKhataRow[]
  totals: { previousDebit: number; debit: number; recovery: number; currentBalance: number }
}) {
  return (
    <div dir="rtl">
      <div className="mb-2 h-2 border-y-2 border-slate-900" />

      <table className="w-full border-collapse border border-slate-900 text-[13px]">
        <thead>
          <tr className="bg-slate-50">
            <Th>{L('نام', 'Name')}</Th>
            <Th>{L('کسٹمر نمبر', 'Cust. No')}</Th>
            <Th>{L('سابقہ بنام', 'Prev. Debit')}</Th>
            <Th>{L('بنام', 'Debit')}</Th>
            <Th>{L('وصولی', 'Recovery')}</Th>
            <Th>{L('موجودہ بیلنس', 'Current Bal.')}</Th>
            <Th>{L('بقایا', 'Balance')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className={cn(
                  'border border-slate-900 px-3 py-8 text-center text-slate-500',
                  lang === 'ur' && 'font-urdu'
                )}
              >
                {L('اس تاریخ پر کوئی ریکارڈ نہیں', 'No records for this date')}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.name}</Td>
                <Td dir="ltr">{r.customerNo}</Td>
                <Td dir="ltr">{formatRs(r.previousDebit)}</Td>
                <Td dir="ltr" className="font-semibold text-orange-800">
                  {formatRs(r.debit)}
                </Td>
                <Td dir="ltr" className="font-semibold text-emerald-800">
                  {formatRs(r.recovery)}
                </Td>
                <Td dir="ltr">{formatRs(r.currentBalance)}</Td>
                <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.note}</Td>
              </tr>
            ))
          )}

          <tr className="bg-slate-100 font-bold">
            <td className="border border-slate-900 px-2 py-2 text-center" colSpan={2}>
              <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('کل ٹوٹل رقم', 'Grand Total')}</span>
            </td>
            <Td dir="ltr">{formatRs(totals.previousDebit)}</Td>
            <Td dir="ltr">{formatRs(totals.debit)}</Td>
            <Td dir="ltr">{formatRs(totals.recovery)}</Td>
            <Td dir="ltr">{formatRs(totals.currentBalance)}</Td>
            <Td className={lang === 'ur' ? 'font-urdu' : ''}>{L('نقدی', 'Cash')}</Td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-900 px-2 py-2 text-center text-[12px] font-bold text-slate-900">
      {children}
    </th>
  )
}

function Td({
  children,
  className,
  dir,
}: {
  children?: React.ReactNode
  className?: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <td dir={dir} className={cn('border border-slate-900 px-2 py-1.5 text-center text-slate-800', className)}>
      {children}
    </td>
  )
}
