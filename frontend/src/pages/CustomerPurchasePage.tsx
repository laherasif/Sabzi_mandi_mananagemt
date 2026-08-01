import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  UserRoundSearch,
} from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { cn } from '@/lib/utils'
import { customerPurchasesApi } from '@/lib/mandiApi'
import { ApiClientError } from '@/lib/api'

interface Ctx {
  lang: 'en' | 'ur'
}

interface LineDraft {
  name: string
  pieces: string
  rate: string
  item: string
  lagana: string
  traderRate: string
}

interface CustomerLine {
  id: string
  name: string
  pieces: number
  rate: number
  item: string
  lagana: number
  traderRate: number
  amount: number
  marfat: string
  marka: string
  number: string
}

interface CustomerBill {
  id: string
  invoice: string
  date: string
  name: string
  marfat: string
  item: string
  marka: string
  number: string
  pieces: number
  amount: number
}

function mapApiBill(b: Record<string, unknown>): CustomerBill {
  const lines = (b.lines as Array<Record<string, unknown>>) || []
  const first = lines[0] || {}
  return {
    id: String(b._id),
    invoice: String(b.invoice || ''),
    date: String(b.date || '').replace(/\//g, '-'),
    name: String(first.name || '—'),
    marfat: String(first.marfat || '—'),
    item: String(first.item || b.item || '—'),
    marka: String(first.marka || '—'),
    number: String(first.number || '—'),
    pieces: Number(b.totalPieces || first.pieces || 0),
    amount: Number(b.netAmount || b.grossAmount || 0),
  }
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatRs(n: number) {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('en-PK').format(Math.round(n))
}

function num(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function emptyDraft(): LineDraft {
  return {
    name: '',
    pieces: '',
    rate: '',
    item: '',
    lagana: '20',
    traderRate: '0',
  }
}

type Filter = 'all' | 'purchase' | 'sale' | 'remaining' | 'customers'

/** کسٹمر خرید — Customer Purchase (simpler entry, no charges sidebar) */
export function CustomerPurchasePage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [search, setSearch] = useState('')
  const [invoice, setInvoice] = useState('')
  const [date, setDate] = useState(todayStr())
  const [headerNag, setHeaderNag] = useState('')

  const [draft, setDraft] = useState<LineDraft>(emptyDraft)
  const [lines, setLines] = useState<CustomerLine[]>([])

  const [summaryLagana, setSummaryLagana] = useState('')
  const [diffAccount, setDiffAccount] = useState('')
  const [expense, setExpense] = useState('0')

  const [bills, setBills] = useState<CustomerBill[]>([])
  const [filter, setFilter] = useState<Filter>('customers')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)

  const loadBills = async () => {
    try {
      const list = (await customerPurchasesApi.list()) as Record<string, unknown>[]
      setBills(list.map(mapApiBill))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('بل لوڈ ناکام', 'Load bills failed'))
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const { invoice: next } = await customerPurchasesApi.nextInvoice()
        setInvoice(next)
      } catch {
        /* keep default */
      }
      await loadBills()
    })()
  }, [])

  const totalPieces = useMemo(
    () => lines.reduce((s, r) => s + r.pieces, 0) || num(headerNag),
    [lines, headerNag]
  )
  const grossAmount = useMemo(() => lines.reduce((s, r) => s + r.amount, 0), [lines])
  const totalLagana = useMemo(() => lines.reduce((s, r) => s + r.lagana, 0), [lines])
  const totalExpense = num(expense) + totalLagana + num(summaryLagana)
  const netAmount = grossAmount - totalExpense
  const average = totalPieces > 0 ? grossAmount / totalPieces : 0

  const draftTotal = num(draft.pieces) * num(draft.rate)

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = bills
    if (filter === 'remaining') list = bills.filter((b) => b.amount > 50000)
    if (filter === 'sale' || filter === 'purchase') list = filter === 'purchase' ? bills : []
    if (!q) return list
    return list.filter(
      (b) =>
        b.invoice.includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.marfat.includes(search) ||
        b.item.includes(search) ||
        b.marka.toLowerCase().includes(q)
    )
  }, [bills, filter, search])

  const setDraftField = <K extends keyof LineDraft>(key: K, value: LineDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const addLine = () => {
    if (!draft.name.trim()) {
      toast.error(L('نام درج کریں', 'Enter name'))
      return
    }
    if (num(draft.pieces) <= 0 && num(draft.rate) <= 0) {
      toast.error(L('نگ یا ریٹ درج کریں', 'Enter pieces or rate'))
      return
    }

    const row: CustomerLine = {
      id: editingLineId || crypto.randomUUID(),
      name: draft.name.trim(),
      pieces: num(draft.pieces),
      rate: num(draft.rate),
      item: draft.item.trim() || '—',
      lagana: num(draft.lagana),
      traderRate: num(draft.traderRate),
      amount: draftTotal,
      marfat: '—',
      marka: '—',
      number: '—',
    }

    if (editingLineId) {
      setLines((prev) => prev.map((r) => (r.id === editingLineId ? row : r)))
      setEditingLineId(null)
      toast.success(L('لائن اپڈیٹ', 'Line updated'))
    } else {
      setLines((prev) => [...prev, row])
      toast.success(L('لائن شامل', 'Line added'))
    }
    setDraft(emptyDraft())
  }

  const loadLine = (row: CustomerLine) => {
    setEditingLineId(row.id)
    setDraft({
      name: row.name,
      pieces: String(row.pieces || ''),
      rate: String(row.rate || ''),
      item: row.item === '—' ? '' : row.item,
      lagana: String(row.lagana),
      traderRate: String(row.traderRate),
    })
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((r) => r.id !== id))
    if (editingLineId === id) {
      setEditingLineId(null)
      setDraft(emptyDraft())
    }
  }

  const saveBill = async () => {
    if (lines.length === 0) {
      toast.error(L('پہلے لائن شامل کریں', 'Add a line first'))
      return
    }
    try {
      await customerPurchasesApi.create({
        invoice,
        date,
        lines: lines.map((l) => ({
          name: l.name,
          pieces: l.pieces,
          rate: l.rate,
          item: l.item,
          lagana: l.lagana,
          traderRate: l.traderRate,
          marfat: l.marfat,
          marka: l.marka,
          number: l.number,
          amount: l.amount,
        })),
        expense: num(expense),
        lagana: num(summaryLagana),
        diffAccount: num(diffAccount),
      })
      setLines([])
      setDraft(emptyDraft())
      setHeaderNag('')
      setSummaryLagana('')
      setDiffAccount('')
      setExpense('0')
      const { invoice: next } = await customerPurchasesApi.nextInvoice()
      setInvoice(next)
      await loadBills()
      toast.success(L('کسٹمر خرید محفوظ ہو گئی', 'Customer purchase saved'))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('محفوظ ناکام', 'Save failed'))
    }
  }

  const printBill = () => {
    if (selectedIds.length === 0 && filteredBills.length === 0) {
      toast.message(L('پہلے بل منتخب کریں', 'Select a bill first'))
      return
    }
    window.print()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBills.length) setSelectedIds([])
    else setSelectedIds(filteredBills.map((b) => b.id))
  }

  const removeBill = async (id: string) => {
    try {
      await customerPurchasesApi.remove(id)
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      await loadBills()
      toast.message(L('بل حذف', 'Bill removed'))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('حذف ناکام', 'Delete failed'))
    }
  }

  const saveRef = useRef(saveBill)
  saveRef.current = saveBill

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <UserRoundSearch className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {L('کسٹمر خرید', 'Customer Purchase')}
            </h1>
            <p className="text-[10px] text-sky-100/90" dir="ltr">
              INV #{invoice}
            </p>
          </div>
        </div>

        <div className="relative ms-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L('بل تلاش…', 'Search bill…')}
            className="h-9 w-full rounded-lg border border-white/20 bg-white/15 pe-3 ps-9 text-sm text-white placeholder:text-sky-100/70 outline-none focus:bg-white/25"
          />
        </div>

        <MandiHomeLink lang={lang} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5">
        <div
          className={cn(
            'shrink-0 rounded-xl bg-[#0d5f86] px-4 py-2 text-center text-sm font-bold text-white shadow',
            rtl && 'font-urdu text-base'
          )}
        >
          {L('کسٹمر خرید کھاتہ', 'Customer Purchase Ledger')}
        </div>

        {/* Compact header: Invoice / Date / Total Nag */}
        <section className="shrink-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="grid max-w-xl gap-2.5 sm:grid-cols-[6.5rem_minmax(9rem,1fr)_minmax(7rem,1fr)]">
            <Field label={L('انوائس', 'Invoice')}>
              <input
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </Field>
            <Field label={L('تاریخ', 'Date')}>
              <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-full" />
            </Field>
            <Field label={L('کل نگ', 'Total pcs')}>
              <input
                value={headerNag}
                onChange={(e) => setHeaderNag(e.target.value)}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
              />
            </Field>
          </div>
        </section>

        {/* Entry row */}
        <section className="shrink-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={cn('text-sm font-bold text-[#0d5f86]', rtl && 'font-urdu')}>
              {editingLineId ? L('لائن ترمیم', 'Edit line') : L('نیا اندراج', 'New entry')}
            </p>
            {editingLineId && (
              <button
                type="button"
                onClick={() => {
                  setEditingLineId(null)
                  setDraft(emptyDraft())
                }}
                className="text-xs font-semibold text-slate-500 hover:underline"
              >
                {L('نیا فارم', 'New form')}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label={L('نام', 'Name')} className="min-w-[140px] flex-[1.4]">
              <input
                value={draft.name}
                onChange={(e) => setDraftField('name', e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
                placeholder={L('کسٹمر / بپاری نام', 'Customer / trader name')}
              />
            </Field>
            <Field label={L('نگ', 'Pcs')} className="w-[88px]">
              <input
                value={draft.pieces}
                onChange={(e) => setDraftField('pieces', e.target.value)}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label={L('ریٹ', 'Rate')} className="w-[100px]">
              <input
                value={draft.rate}
                onChange={(e) => setDraftField('rate', e.target.value)}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label={L('جنس', 'Item')} className="min-w-[120px] flex-1">
              <input
                value={draft.item}
                onChange={(e) => setDraftField('item', e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              />
            </Field>
            <Field label={L('لگانا', 'Lagana')} className="w-[88px]">
              <input
                value={draft.lagana}
                onChange={(e) => setDraftField('lagana', e.target.value)}
                className="mandi-input bg-sky-50 text-center tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label={L('بپاری ریٹ', 'Trader rate')} className="w-[100px]">
              <input
                value={draft.traderRate}
                onChange={(e) => setDraftField('traderRate', e.target.value)}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label={L('ٹوٹل رقم', 'Total')} className="w-[110px]">
              <div
                className="flex h-10 items-center justify-center rounded border border-[#6b8fa8] bg-[#cfeee8] text-sm font-bold tabular-nums"
                dir="ltr"
              >
                {formatRs(draftTotal)}
              </div>
            </Field>
            <button
              type="button"
              onClick={addLine}
              className="mb-0 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700"
              title={L('لائن شامل', 'Add line')}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Current lines preview */}
          {lines.length > 0 && (
            <div className="mt-3 max-h-36 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="sticky top-0 bg-[#0d5f86] text-white">
                  <tr>
                    <Th>{L('نام', 'Name')}</Th>
                    <Th>{L('نگ', 'Pcs')}</Th>
                    <Th>{L('ریٹ', 'Rate')}</Th>
                    <Th>{L('جنس', 'Item')}</Th>
                    <Th>{L('لگانا', 'Lagana')}</Th>
                    <Th>{L('رقم', 'Amount')}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 odd:bg-white even:bg-[#f3f9fc]">
                      <td className={cn('px-2 py-1.5 font-semibold', rtl && 'font-urdu')}>{r.name}</td>
                      <td className="px-2 py-1.5 text-center tabular-nums" dir="ltr">
                        {r.pieces}
                      </td>
                      <td className="px-2 py-1.5 text-center tabular-nums" dir="ltr">
                        {formatRs(r.rate)}
                      </td>
                      <td className={cn('px-2 py-1.5', rtl && 'font-urdu')}>{r.item}</td>
                      <td className="px-2 py-1.5 text-center tabular-nums" dir="ltr">
                        {r.lagana}
                      </td>
                      <td className="px-2 py-1.5 text-center font-bold tabular-nums" dir="ltr">
                        {formatRs(r.amount)}
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="flex justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => loadLine(r)}
                            className="rounded p-1 text-sky-700 hover:bg-sky-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(r.id)}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Summary + Save */}
        <section className="shrink-0 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-end gap-2">
            <SummaryBox label={L('کل نگ', 'Total pcs')} value={formatRs(totalPieces)} />
            <SummaryBox label={L('خام رقم', 'Gross')} value={formatRs(grossAmount)} />
            <div className="min-w-[90px] flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">
                {L('کل خرچہ', 'Expenses')}
              </label>
              <input
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                className="mandi-input h-9 text-center tabular-nums"
                dir="ltr"
              />
            </div>
            <SummaryBox label={L('صافی رقم', 'Net')} value={formatRs(netAmount)} tone="emerald" />
            <div className="min-w-[90px] flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">{L('لگانا', 'Lagana')}</label>
              <input
                value={summaryLagana}
                onChange={(e) => setSummaryLagana(e.target.value)}
                className="mandi-input h-9 text-center tabular-nums"
                dir="ltr"
                placeholder={String(totalLagana || '')}
              />
            </div>
            <div className="min-w-[100px] flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">
                {L('ڈیفرینس کھاتہ', 'Diff. A/c')}
              </label>
              <input
                value={diffAccount}
                onChange={(e) => setDiffAccount(e.target.value)}
                className="mandi-input h-9 text-center tabular-nums"
                dir="ltr"
              />
            </div>
            <SummaryBox label={L('اوسط', 'Average')} value={formatRs(average)} />
            <button
              type="button"
              onClick={saveBill}
              className={cn(
                'inline-flex h-10 min-w-[150px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0d5f86] px-4 text-sm font-bold text-white shadow hover:bg-[#0a4c6b] sm:flex-none',
                rtl && 'font-urdu'
              )}
            >
              <Save className="h-4 w-4" />
              {L('محفوظ کریں', 'Save')}
              <span className="text-[10px] opacity-80" dir="ltr">
                Alt+M
              </span>
            </button>
          </div>
        </section>

        {/* Bills list */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <button
              type="button"
              onClick={printBill}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700',
                rtl && 'font-urdu'
              )}
            >
              <Printer className="h-3.5 w-3.5" />
              {L('بل پرنٹ', 'Print Bill')}
            </button>
            <FilterBtn active={filter === 'customers'} onClick={() => setFilter('customers')} urdu={rtl}>
              {L('تمام کسٹمر وضاحت', 'Customer details')}
            </FilterBtn>
            <FilterBtn active={filter === 'remaining'} onClick={() => setFilter('remaining')} urdu={rtl}>
              {L('بقایا سیل مال', 'Remaining sales')}
            </FilterBtn>
            <FilterBtn active={filter === 'sale'} onClick={() => setFilter('sale')} urdu={rtl}>
              {L('تمام سیل مال', 'All sale goods')}
            </FilterBtn>
            <FilterBtn active={filter === 'purchase'} onClick={() => setFilter('purchase')} urdu={rtl}>
              {L('تمام بل خرید', 'All purchase bills')}
            </FilterBtn>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-white">
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      checked={filteredBills.length > 0 && selectedIds.length === filteredBills.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5"
                    />
                  </th>
                  <Th>INV#</Th>
                  <Th>{L('تاریخ', 'Date')}</Th>
                  <Th>{L('نام', 'Name')}</Th>
                  <Th>{L('معرفت', 'Marfat')}</Th>
                  <Th>{L('جنس', 'Item')}</Th>
                  <Th>{L('مارکہ', 'Marka')}</Th>
                  <Th>{L('نمبر', 'No.')}</Th>
                  <Th>{L('نگ', 'Pcs')}</Th>
                  <Th>{L('رقم', 'Amount')}</Th>
                  <Th>{L('ایکشن', 'Action')}</Th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className={cn('px-3 py-10 text-center text-slate-400', rtl && 'font-urdu')}
                    >
                      {L('کوئی بل نہیں', 'No bills')}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr
                      key={b.id}
                      className={cn(
                        'border-t border-slate-100 transition hover:bg-sky-50',
                        selectedIds.includes(b.id) && 'bg-emerald-50'
                      )}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={() => toggleSelect(b.id)}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="px-3 py-2 text-center font-bold tabular-nums" dir="ltr">
                        {b.invoice}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums" dir="ltr">
                        {b.date}
                      </td>
                      <td className={cn('px-3 py-2 font-semibold', rtl && 'font-urdu')}>{b.name}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marfat}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.item}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marka}</td>
                      <td className="px-3 py-2 text-center" dir="ltr">
                        {b.number}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums" dir="ltr">
                        {formatRs(b.pieces)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold tabular-nums text-[#0d5f86]" dir="ltr">
                        {formatRs(b.amount)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => removeBill(b.id)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'emerald'
}) {
  return (
    <div className="min-w-[88px] flex-1">
      <p className="mb-1 text-[11px] font-bold text-slate-600">{label}</p>
      <div
        className={cn(
          'flex h-9 items-center justify-center rounded border border-[#6b8fa8] bg-[#eceff3] text-sm font-bold tabular-nums',
          tone === 'emerald' && 'bg-emerald-50 text-emerald-700'
        )}
        dir="ltr"
      >
        {value}
      </div>
    </div>
  )
}

function FilterBtn({
  children,
  active,
  onClick,
  urdu,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  urdu?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-lg px-3 text-xs font-bold leading-none',
        active
          ? 'bg-[#0d5f86] text-white'
          : 'border border-[#0d5f86]/40 bg-white text-[#0d5f86] hover:bg-sky-50',
        urdu && 'font-urdu'
      )}
    >
      {children}
    </button>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-2 py-2 text-center text-[11px] font-bold whitespace-nowrap">{children}</th>
}
