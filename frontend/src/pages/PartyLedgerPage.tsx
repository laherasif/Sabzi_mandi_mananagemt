import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { BookUser, ChevronDown, Printer, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api'
import { ledgerApi, partiesApi } from '@/lib/mandiApi'
import type { LedgerEntry, Party } from '@/lib/types'
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

type ViewMode = 'form' | 'ledger' | 'wazahat'
type LedgerKind = 'party' | 'customer'

interface LedgerRow {
  id: string
  no: number
  inv: string
  date: string
  partyDetail: string
  marfat: string
  item: string
  vehicle: string
  tak: string
  rate: number
  debit: number
  credit: number
  balance: number
}

const SHOP_TITLE_UR = 'چوہدری محمد اسلم، محمد عرفان (سبزی فروٹ کمیشن ایجنٹ)'
const SHOP_TITLE_EN = 'Ch. M. Aslam, M. Irfan (Sabzi Fruit Commission Agent)'

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.abs(n))
}

function mapLedgerEntry(e: LedgerEntry, index: number): LedgerRow {
  return {
    id: e._id,
    no: index + 1,
    inv: e.invoice || '',
    date: e.date || '',
    partyDetail: e.particulars || '',
    marfat: e.marfat || '',
    item: e.item || '',
    vehicle: e.vehicle || '',
    tak: e.pieces != null ? String(e.pieces) : '',
    rate: Number(e.rate) || 0,
    debit: Number(e.debit) || 0,
    credit: Number(e.credit) || 0,
    balance: Number(e.balance) || 0,
  }
}

/** کھاتہ وضاحت — dual debit/credit with تفصیل (wazahat) */
function buildWazahat(rows: LedgerRow[]) {
  const entries = rows.filter((r) => r.inv !== 'OP')
  return {
    credit: entries
      .filter((r) => r.credit > 0)
      .map((r) => ({
        inv: r.inv,
        date: r.date.includes('-') ? r.date.split('-').reverse().join('-') : r.date,
        detail: r.tak ? `${r.tak} -` : r.partyDetail || '',
        amount: r.credit,
      })),
    debit: entries
      .filter((r) => r.debit > 0)
      .map((r) => ({
        inv: r.inv,
        date: r.date.includes('-') ? r.date.split('-').reverse().join('-') : r.date,
        detail: r.tak ? `${r.tak} -` : r.partyDetail || '',
        amount: r.debit,
      })),
  }
}

/** کھاتہ پارٹی — Party Ledger */
export function PartyLedgerPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [banamChecked, setBanamChecked] = useState(true)
  const [jamaChecked, setJamaChecked] = useState(false)
  const [parties, setParties] = useState<Party[]>([])
  const [partyCode, setPartyCode] = useState('')
  const [partyQuery, setPartyQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [marfat, setMarfat] = useState('All')
  const [date1, setDate1] = useState('01/01/2022')
  const [date2, setDate2] = useState(() => formatDisplayDate(new Date()))
  const [view, setView] = useState<ViewMode>('form')
  const [expanded, setExpanded] = useState(false)
  const [ledgerKind, setLedgerKind] = useState<LedgerKind>('party')
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([])
  const [loadingLedger, setLoadingLedger] = useState(false)

  const selected = parties.find((p) => p.code === partyCode) || parties[0] || null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await partiesApi.list()
        if (cancelled) return
        setParties(list)
        if (list[0] && !list.some((p) => p.code === partyCode)) {
          setPartyCode(list[0].code)
        }
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

  const loadPartyLedger = async (party: Party | null) => {
    if (!party?._id) {
      setLedgerRows([])
      return false
    }
    setLoadingLedger(true)
    try {
      const data = await ledgerApi.party(party._id)
      const from = parseDisplayDate(date1)
      const to = parseDisplayDate(date2)
      if (from) from.setHours(0, 0, 0, 0)
      if (to) to.setHours(23, 59, 59, 999)

      let opening = 0
      const inRange: LedgerEntry[] = []
      for (const e of data.entries) {
        if (e.invoice === 'OP') continue
        const d = parseDisplayDate(String(e.date || '').replace(/-/g, '/'))
        const debit = Number(e.debit) || 0
        const credit = Number(e.credit) || 0
        if (from && d && d < from) {
          opening += debit - credit
          continue
        }
        if (to && d && d > to) continue
        inRange.push(e)
      }

      const rows: LedgerRow[] = []
      let running = opening
      if (opening !== 0 || inRange.length > 0) {
        rows.push({
          id: 'op',
          no: 1,
          inv: 'OP',
          date: date1,
          partyDetail: L('سابقہ بیلنس', 'Opening Balance'),
          marfat: '',
          item: '',
          vehicle: '',
          tak: '',
          rate: 0,
          debit: opening > 0 ? opening : 0,
          credit: opening < 0 ? Math.abs(opening) : 0,
          balance: running,
        })
      }
      for (const e of inRange) {
        const debit = Number(e.debit) || 0
        const credit = Number(e.credit) || 0
        running += debit - credit
        rows.push(mapLedgerEntry({ ...e, balance: running }, rows.length))
      }
      // Fix serial numbers
      rows.forEach((r, i) => {
        r.no = i + 1
      })

      setLedgerRows(rows)
      setParties((prev) =>
        prev.map((p) => (p._id === data.party._id ? { ...p, balance: data.balance } : p))
      )
      return true
    } catch (e) {
      setLedgerRows([])
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
      return false
    } finally {
      setLoadingLedger(false)
    }
  }

  const filteredParties = useMemo(() => {
    const q = partyQuery.trim().toLowerCase()
    if (!q) return parties
    return parties.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameUr.includes(partyQuery)
    )
  }, [partyQuery, parties])

  const wazahat = useMemo(() => buildWazahat(ledgerRows), [ledgerRows])

  const fromLabel = (() => {
    const p = parseDisplayDate(date1)
    return p ? formatDashDate(p) : date1
  })()
  const toLabel = (() => {
    const p = parseDisplayDate(date2)
    return p ? formatDashDate(p) : date2
  })()

  const openLedger = async (kind: LedgerKind) => {
    if (!selected) {
      toast.error(L('پارٹی منتخب کریں', 'Select a party'))
      return
    }
    const ok = await loadPartyLedger(selected)
    if (!ok) return
    setLedgerKind(kind)
    setView('ledger')
    toast.success(
      kind === 'party'
        ? L('لیجر پارٹی کھل گئی', 'Party ledger opened')
        : L('لیجر کسٹمر کھل گئی', 'Customer ledger opened')
    )
  }

  const openWazahat = async () => {
    if (!selected) {
      toast.error(L('پارٹی منتخب کریں', 'Select a party'))
      return
    }
    const ok = await loadPartyLedger(selected)
    if (!ok) return
    setView('wazahat')
    toast.success(L('کھاتہ وضاحت کھل گئی', 'Account detail opened'))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <MandiPageHeader
        lang={lang}
        titleUr="کھاتہ پارٹی"
        titleEn="Party Ledger"
        subtitle={selected ? `${selected.code} · ${lang === 'ur' ? selected.nameUr : selected.nameEn}` : 'Party Ledger'}
        icon={BookUser}
      />

      {/* Form card — overflow visible so date calendars are not clipped */}
      <div
        className="relative z-20 shrink-0 overflow-visible border-b border-[#9ec4d8] bg-[#cfe6f2] p-3 print:hidden"
        dir={lang === 'ur' ? 'rtl' : 'ltr'}
      >
        <div className="relative z-20 mx-auto max-w-5xl overflow-visible rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-center text-lg font-bold text-slate-800" dir="ltr">
            Party Ledger
          </h2>

          <div className="relative z-20 flex flex-wrap items-end gap-3">
            {/* Party picker */}
            <div className="relative min-w-[200px] flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={banamChecked}
                    onChange={(e) => setBanamChecked(e.target.checked)}
                  />
                  <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('بنام پارٹی نام', 'Debit Party')}</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={jamaChecked}
                    onChange={(e) => setJamaChecked(e.target.checked)}
                  />
                  <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('جمع', 'Credit')}</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex w-full flex-col gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-start shadow-sm hover:border-sky-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold tabular-nums text-slate-900" dir="ltr">
                    {selected?.code || 'Code'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
                <span className={cn('text-sm text-slate-600', lang === 'ur' && 'font-urdu')}>
                  {selected
                    ? lang === 'ur'
                      ? selected.nameUr
                      : selected.nameEn
                    : L('پارٹی منتخب کریں', 'Select a party')}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-64 overflow-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                  <div className="sticky top-0 border-b border-slate-700 bg-slate-800 p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={partyQuery}
                        onChange={(e) => setPartyQuery(e.target.value)}
                        placeholder="Code / name"
                        className="h-8 w-full rounded border border-slate-600 bg-slate-900 pe-2 ps-7 text-xs text-white outline-none"
                        dir="ltr"
                        autoFocus
                      />
                    </div>
                  </div>
                  {filteredParties.map((p) => (
                    <button
                      key={p._id || p.code}
                      type="button"
                      onClick={() => {
                        setPartyCode(p.code)
                        setDropdownOpen(false)
                        setPartyQuery('')
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-white hover:bg-sky-700',
                        p.code === partyCode && 'bg-sky-800'
                      )}
                    >
                      <span className="w-12 shrink-0 tabular-nums" dir="ltr">
                        {p.code}
                      </span>
                      <span className={lang === 'ur' ? 'font-urdu' : ''} dir="ltr">
                        {p.nameEn}
                      </span>
                      <span className={cn('ms-auto text-sky-200', lang === 'ur' && 'font-urdu')}>{p.nameUr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block w-[100px]">
              <span className={cn('mandi-label text-slate-700', lang === 'ur' && 'font-urdu')}>
                {L('معرفت', 'Marfat')}
              </span>
              <input
                value={marfat}
                onChange={(e) => setMarfat(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-semibold shadow-sm outline-none focus:border-sky-500"
                dir="ltr"
              />
            </label>

            <label className="block w-[11.5rem] shrink-0">
              <span className={cn('mandi-label text-slate-700', lang === 'ur' && 'font-urdu')}>
                {L('تاریخ 1', 'Date 1')}
              </span>
              <MandiDatePicker
                value={date1}
                onChange={setDate1}
                lang={lang}
                popoverAlign="left"
                className="w-full"
              />
            </label>

            <label className="block w-[11.5rem] shrink-0">
              <span className={cn('mandi-label text-slate-700', lang === 'ur' && 'font-urdu')}>
                {L('تاریخ 2', 'Date 2')}
              </span>
              <MandiDatePicker
                value={date2}
                onChange={setDate2}
                lang={lang}
                popoverAlign="right"
                className="w-full"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={loadingLedger}
              onClick={() => void openLedger('party')}
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg bg-[#1a6f96] px-4 text-sm font-bold leading-none text-white shadow hover:bg-[#145a7a] disabled:opacity-60',
                lang === 'ur' && 'font-urdu',
                view === 'ledger' && ledgerKind === 'party' && 'ring-2 ring-orange-300'
              )}
            >
              {L('لیجر پارٹی', 'Ledger Party')}
            </button>

            <button
              type="button"
              disabled={loadingLedger}
              onClick={() => void openWazahat()}
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg bg-[#1a6f96] px-4 text-sm font-bold leading-none text-white shadow hover:bg-[#145a7a] disabled:opacity-60',
                lang === 'ur' && 'font-urdu',
                view === 'wazahat' && 'ring-2 ring-orange-300'
              )}
            >
              {L('کھاتہ وضاحت', 'Khata Wazahat')}
            </button>

            <button
              type="button"
              disabled={loadingLedger}
              onClick={() => void openLedger('customer')}
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-bold leading-none text-white shadow hover:bg-emerald-700 disabled:opacity-60',
                lang === 'ur' && 'font-urdu',
                view === 'ledger' && ledgerKind === 'customer' && 'ring-2 ring-orange-300'
              )}
            >
              {L('لیجر کسٹمر', 'Ledger Customer')}
            </button>
          </div>

        </div>
      </div>

      {/* Results — inner scroll */}
      <div className="min-h-0 flex-1 overflow-hidden p-3 print:overflow-visible print:p-0">
        {view === 'form' ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-[#9ec4d8] bg-[#cfe6f2]/60 text-sm text-[#0d5f86]/80">
            <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>
              {L('لیجر پارٹی / لیجر کسٹمر / کھاتہ وضاحت دبائیں', 'Click Ledger Party / Customer / Wazahat')}
            </span>
          </div>
        ) : selected ? (
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded border border-slate-400 bg-white shadow-sm print:overflow-visible print:border-0 print:shadow-none">
            <div
              className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 print:hidden"
              dir={lang === 'ur' ? 'rtl' : 'ltr'}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={cn(
                    'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold leading-none text-white hover:bg-emerald-700',
                    lang === 'ur' && 'font-urdu'
                  )}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {L('پرنٹ آؤٹ', 'Print Out')}
                </button>
                <MandiExpandButton lang={lang} onClick={() => setExpanded(true)} />
              </div>
              <p className={cn('text-xs font-semibold text-slate-600', lang === 'ur' && 'font-urdu')}>
                {view === 'ledger'
                  ? ledgerKind === 'party'
                    ? L('لیجر پارٹی', 'Party Ledger')
                    : L('لیجر کسٹمر', 'Customer Ledger')
                  : L('کھاتہ وضاحت', 'Khata Wazahat')}
                {' · '}
                <span dir="ltr">{selected.code}</span>
              </p>
              <button
                type="button"
                onClick={() => setView('form')}
                className="text-xs font-semibold text-[#0d5f86] hover:underline"
              >
                {L('واپس', 'Back')}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 print:overflow-visible">
              {view === 'ledger' ? (
                <LedgerReport
                  lang={lang}
                  L={L}
                  party={selected}
                  from={fromLabel}
                  to={toLabel}
                  rows={ledgerRows}
                />
              ) : (
                <WazahatReport
                  lang={lang}
                  L={L}
                  party={selected}
                  from={fromLabel}
                  to={toLabel}
                  credit={wazahat.credit}
                  debit={wazahat.debit}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selected && view !== 'form' ? (
        <MandiExpandModal
          open={expanded}
          onClose={() => setExpanded(false)}
          lang={lang}
          titleUr={
            view === 'wazahat'
              ? 'کھاتہ وضاحت — مکمل'
              : ledgerKind === 'customer'
                ? 'لیجر کسٹمر — مکمل'
                : 'لیجر پارٹی — مکمل'
          }
          titleEn={
            view === 'wazahat'
              ? 'Khata Wazahat — Full'
              : ledgerKind === 'customer'
                ? 'Customer Ledger — Full'
                : 'Party Ledger — Full'
          }
          subtitle={`${selected.nameUr || selected.nameEn} · ${fromLabel} → ${toLabel}`}
        >
          <div className="mx-auto max-w-7xl rounded border border-slate-400 bg-white p-4 shadow-lg sm:p-6">
            {view === 'ledger' ? (
              <LedgerReport
                lang={lang}
                L={L}
                party={selected}
                from={fromLabel}
                to={toLabel}
                rows={ledgerRows}
              />
            ) : (
              <WazahatReport
                lang={lang}
                L={L}
                party={selected}
                from={fromLabel}
                to={toLabel}
                credit={wazahat.credit}
                debit={wazahat.debit}
              />
            )}
          </div>
        </MandiExpandModal>
      ) : null}
    </div>
  )
}

function LedgerReport({
  lang,
  L,
  party,
  from,
  to,
  rows,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  party: Party
  from: string
  to: string
  rows: LedgerRow[]
}) {
  return (
    <div dir="rtl">
      <div className="mb-3 border-4 border-double border-slate-900 px-3 py-3 text-center">
        <h2 className={cn('text-lg font-bold sm:text-xl', lang === 'ur' && 'font-urdu')}>
          {lang === 'ur' ? SHOP_TITLE_UR : SHOP_TITLE_EN}
        </h2>
      </div>
      <p className="mb-1 text-center text-sm font-semibold" dir="ltr">
        From: {from} To: {to}
      </p>
      <p className={cn('mb-3 text-center text-sm font-bold', lang === 'ur' && 'font-urdu')}>
        {L('نام', 'Name')}: {lang === 'ur' ? party.nameUr || party.nameEn : party.nameEn || party.nameUr}
      </p>

      <table className="w-full min-w-[980px] border-collapse border border-slate-900 text-[13px]">
        <thead>
          <tr className="bg-slate-100">
            <Th>#</Th>
            <Th>inv</Th>
            <Th>{L('تاریخ', 'Date')}</Th>
            <Th>{L('تفصیل پارٹی', 'Party')}</Th>
            <Th>{L('معرفت-مارکہ', 'Marfat')}</Th>
            <Th>{L('جنس', 'Item')}</Th>
            <Th>{L('گاڑی نمبر', 'Vehicle')}</Th>
            <Th>{L('تک', 'Tak')}</Th>
            <Th>{L('ریٹ', 'Rate')}</Th>
            <Th>{L('بنام', 'Debit')}</Th>
            <Th>{L('جمع', 'Credit')}</Th>
            <Th>{L('رقم', 'Balance')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={i === 6 ? 'bg-slate-200' : i % 2 ? 'bg-slate-50' : 'bg-white'}>
              <Td dir="ltr">{r.no}</Td>
              <Td dir="ltr">{r.inv}</Td>
              <Td dir="ltr">{r.date}</Td>
              <Td className={cn('min-w-[8rem]', lang === 'ur' && 'font-urdu')}>{r.partyDetail}</Td>
              <Td className={lang === 'ur' ? 'font-urdu' : ''}>{r.marfat}</Td>
              <Td>{r.item}</Td>
              <Td>{r.vehicle}</Td>
              <Td dir="ltr">{r.tak}</Td>
              <Td dir="ltr">{r.rate}</Td>
              <Td dir="ltr" className="min-w-[5.5rem] tabular-nums">
                {r.debit ? formatRs(r.debit) : '0'}
              </Td>
              <Td dir="ltr" className="min-w-[5.5rem] tabular-nums">
                {r.credit ? formatRs(r.credit) : '0'}
              </Td>
              <Td dir="ltr" className="min-w-[7.5rem] whitespace-nowrap font-semibold tabular-nums">
                {formatRs(r.balance)} {r.balance >= 0 ? L('جمع', 'Cr') : L('بنام', 'Dr')}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WazahatReport({
  lang,
  L,
  party,
  from,
  to,
  credit,
  debit,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  party: Party
  from: string
  to: string
  credit: { inv: string; date: string; detail: string; amount: number }[]
  debit: { inv: string; date: string; detail: string; amount: number }[]
}) {
  const creditTotal = credit.reduce((s, r) => s + r.amount, 0)
  const debitTotal = debit.reduce((s, r) => s + r.amount, 0)
  const rows = Math.max(credit.length, debit.length, 1)

  return (
    <div dir="rtl">
      <div className="mb-3 border-4 border-double border-slate-900 px-3 py-3 text-center">
        <h2 className={cn('text-lg font-bold sm:text-xl', lang === 'ur' && 'font-urdu')}>
          {lang === 'ur' ? SHOP_TITLE_UR : SHOP_TITLE_EN}
        </h2>
      </div>
      <p className="mb-1 text-center text-sm font-semibold" dir="ltr">
        From: {from} To: {to}
      </p>
      <p className={cn('mb-3 text-center text-sm font-bold', lang === 'ur' && 'font-urdu')}>
        {L('نام', 'Name')}: {lang === 'ur' ? party.nameUr : party.nameEn}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse border border-slate-900 text-[13px]">
          <thead>
            <tr className="bg-slate-100">
              <Th>{L('انوائس', 'Inv')}</Th>
              <Th>{L('تاریخ', 'Date')}</Th>
              <Th>{L('تفصیل', 'Detail')}</Th>
              <Th>{L('جمع رقم', 'Credit Amt')}</Th>
              <Th>{L('انوائس', 'Inv')}</Th>
              <Th>{L('تاریخ', 'Date')}</Th>
              <Th>{L('تفصیل', 'Detail')}</Th>
              <Th>{L('بنام رقم', 'Debit Amt')}</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 font-semibold">
              <td className="border border-slate-900 px-2 py-1" colSpan={2} />
              <td className={cn('border border-slate-900 px-2 py-1 text-center', lang === 'ur' && 'font-urdu')}>
                {L('سابقہ رقم', 'Previous')}
              </td>
              <td className="border border-slate-900 px-2 py-1 text-center" dir="ltr">
                0
              </td>
              <td className="border border-slate-900 px-2 py-1" colSpan={2} />
              <td className={cn('border border-slate-900 px-2 py-1 text-center', lang === 'ur' && 'font-urdu')}>
                {L('سابقہ رقم', 'Previous')}
              </td>
              <td className="border border-slate-900 px-2 py-1 text-center" dir="ltr">
                0
              </td>
            </tr>
            {Array.from({ length: rows }).map((_, i) => {
              const c = credit[i]
              const d = debit[i]
              return (
                <tr key={i} className="odd:bg-white even:bg-slate-50">
                  <Td dir="ltr">{c?.inv || ''}</Td>
                  <Td dir="ltr">{c?.date || ''}</Td>
                  <Td dir="ltr">{c?.detail || ''}</Td>
                  <Td dir="ltr">{c ? formatRs(c.amount) : ''}</Td>
                  <Td dir="ltr">{d?.inv || ''}</Td>
                  <Td dir="ltr">{d?.date || ''}</Td>
                  <Td dir="ltr">{d?.detail || ''}</Td>
                  <Td dir="ltr">{d ? formatRs(d.amount) : ''}</Td>
                </tr>
              )
            })}
            <tr className="bg-slate-100 font-bold">
              <td className={cn('border border-slate-900 px-2 py-1.5 text-center', lang === 'ur' && 'font-urdu')} colSpan={3}>
                {L('کل رقم', 'Total')}
              </td>
              <Td dir="ltr">{formatRs(creditTotal)}</Td>
              <td className={cn('border border-slate-900 px-2 py-1.5 text-center', lang === 'ur' && 'font-urdu')} colSpan={3}>
                {L('کل بینک رقم', 'Total Bank')}
              </td>
              <Td dir="ltr">{formatRs(debitTotal)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-900 px-2.5 py-2 text-center text-[12px] font-bold leading-snug">
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
    <td
      dir={dir}
      className={cn(
        'border border-slate-900 px-2.5 py-2 text-center text-[13px] leading-snug',
        className
      )}
    >
      {children}
    </td>
  )
}
