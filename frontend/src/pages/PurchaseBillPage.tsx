import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle2,
  FilePlus2,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { ApiClientError } from '@/lib/api'
import { marfatApi, partiesApi, purchasesApi } from '@/lib/mandiApi'
import type { Marfat, Party, PurchaseBill as ApiPurchaseBill } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Ctx {
  lang: 'en' | 'ur'
}

interface Option {
  id: string
  nameUr: string
  nameEn: string
}

interface LineItem {
  id: string
  pieces: string
  rate: string
  item: string
  traderRate: string
}

interface BillRow {
  id: string
  invoice: string
  date: string
  landowner: string
  marfat: string
  item: string
  marka: string
  vehicle: string
  pieces: number
  amount: number
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

function emptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    pieces: '',
    rate: '',
    item: '',
    traderRate: '0',
  }
}

function mapMarfat(m: Marfat): Option {
  return {
    id: m._id,
    nameUr: m.marfatUr || m.marfatEn || '',
    nameEn: m.marfatEn || m.marfatUr || '',
  }
}

function mapParty(p: Party): Option {
  return {
    id: p._id,
    nameUr: p.nameUr || p.nameEn || '',
    nameEn: p.nameEn || p.nameUr || '',
  }
}

function mapBill(b: ApiPurchaseBill): BillRow {
  return {
    id: b._id,
    invoice: b.invoice,
    date: b.date,
    landowner: b.landowner,
    marfat: b.marfatName,
    item: b.item,
    marka: b.marka,
    vehicle: b.vehicle,
    pieces: b.totalNag,
    amount: b.netAmount,
  }
}

type BillFilter = 'purchase' | 'sale' | 'remaining' | 'customers' | 'all'

/** خرید بل — Purchase Bill (same shell as Sale, purchase-specific fields) */
export function PurchaseBillPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [search, setSearch] = useState('')
  const [invoice, setInvoice] = useState('')
  const [date, setDate] = useState(todayStr())
  const [landownerId, setLandownerId] = useState('')
  const [marfatId, setMarfatId] = useState('')
  const [headerItem, setHeaderItem] = useState('')
  const [marka, setMarka] = useState('')
  const [totalNagHeader, setTotalNagHeader] = useState('')
  const [vehicle, setVehicle] = useState('')

  const [landowners, setLandowners] = useState<Option[]>([])
  const [marfatList, setMarfatList] = useState<Option[]>([])
  const [saving, setSaving] = useState(false)

  const [lines, setLines] = useState<LineItem[]>([emptyLine()])

  const [commission, setCommission] = useState('0')
  const [fare, setFare] = useState('0')
  const [expense, setExpense] = useState('0')
  const [labor, setLabor] = useState('0')
  const [market, setMarket] = useState('0')
  const [munshiana, setMunshiana] = useState('0')
  const [store, setStore] = useState('')
  const [cashBill, setCashBill] = useState('')
  const [payment, setPayment] = useState('')
  const [summaryLagana, setSummaryLagana] = useState('')
  const [diffAccount, setDiffAccount] = useState('0')

  const [bills, setBills] = useState<BillRow[]>([])
  const [filter, setFilter] = useState<BillFilter>('purchase')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedLandowner = landowners.find((x) => x.id === landownerId) || landowners[0]
  const selectedMarfat = marfatList.find((m) => m.id === marfatId) || marfatList[0]

  const lineTotals = useMemo(
    () =>
      lines.map((row) => {
        const pieces = num(row.pieces)
        const rate = num(row.rate)
        return { ...row, pieces, rate, amount: pieces * rate }
      }),
    [lines]
  )

  const totalPieces = useMemo(
    () => lineTotals.reduce((s, r) => s + r.pieces, 0) || num(totalNagHeader),
    [lineTotals, totalNagHeader]
  )
  const grossAmount = useMemo(() => lineTotals.reduce((s, r) => s + r.amount, 0), [lineTotals])
  const totalExpense = useMemo(
    () =>
      num(commission) +
      num(fare) +
      num(expense) +
      num(labor) +
      num(market) +
      num(munshiana) +
      num(store) +
      num(cashBill) +
      num(payment) +
      num(summaryLagana),
    [commission, fare, expense, labor, market, munshiana, store, cashBill, payment, summaryLagana]
  )
  const netAmount = grossAmount - totalExpense
  const average = totalPieces > 0 ? grossAmount / totalPieces : 0

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = bills
    if (filter === 'remaining') list = bills.filter((b) => b.amount > 100000)
    if (filter === 'sale') list = []
    if (filter === 'customers') list = bills
    if (filter === 'purchase' || filter === 'all') list = bills
    if (!q) return list
    return list.filter(
      (b) =>
        b.invoice.includes(q) ||
        b.landowner.toLowerCase().includes(q) ||
        b.marfat.includes(search) ||
        b.item.includes(search) ||
        b.marka.toLowerCase().includes(q)
    )
  }, [bills, filter, search])

  const loadBills = async () => {
    const list = await purchasesApi.list()
    setBills(list.map(mapBill))
  }

  const loadMarfat = async () => {
    const list = await marfatApi.list()
    const mapped = list.map(mapMarfat)
    setMarfatList(mapped)
    setMarfatId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || ''))
  }

  const fetchNextInvoice = async () => {
    const { invoice: next } = await purchasesApi.nextInvoice()
    setInvoice(next)
  }

  const loadAll = async () => {
    try {
      const [marfatRows, partyRows, billRows, inv] = await Promise.all([
        marfatApi.list(),
        partiesApi.list(),
        purchasesApi.list(),
        purchasesApi.nextInvoice(),
      ])
      const mappedMarfat = marfatRows.map(mapMarfat)
      const mappedParties = partyRows.map(mapParty)
      setMarfatList(mappedMarfat)
      setLandowners(mappedParties)
      setMarfatId((prev) =>
        prev && mappedMarfat.some((m) => m.id === prev) ? prev : mappedMarfat[0]?.id || ''
      )
      setLandownerId((prev) =>
        prev && mappedParties.some((p) => p.id === prev) ? prev : mappedParties[0]?.id || ''
      )
      setBills(billRows.map(mapBill))
      setInvoice(inv.invoice)
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateLine = (id: string, key: keyof LineItem, value: string) => {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((r) => r.id !== id)))
  }

  const resetBill = async () => {
    setHeaderItem('')
    setMarka('')
    setTotalNagHeader('')
    setVehicle('')
    setLines([emptyLine()])
    setCommission('0')
    setFare('0')
    setExpense('0')
    setLabor('0')
    setMarket('0')
    setMunshiana('0')
    setStore('')
    setCashBill('')
    setPayment('')
    setSummaryLagana('')
    setDiffAccount('0')
    setEditingId(null)
    try {
      await fetchNextInvoice()
    } catch {
      /* keep current invoice */
    }
  }

  const saveCharges = () => {
    toast.success(L('خرچہ محفوظ ہو گیا', 'Charges saved'))
  }

  const buildPayload = () => {
    const landownerName = selectedLandowner
      ? lang === 'ur'
        ? selectedLandowner.nameUr
        : selectedLandowner.nameEn
      : ''
    const marfatName = selectedMarfat
      ? lang === 'ur'
        ? selectedMarfat.nameUr
        : selectedMarfat.nameEn
      : ''
    return {
      invoice,
      date,
      landowner: landownerName,
      landownerParty: landownerId || null,
      marfat: marfatId || null,
      marfatName,
      item: headerItem || lineTotals.find((r) => r.item)?.item || '',
      marka,
      vehicle,
      totalNag: totalPieces,
      lines: lineTotals.map((r) => ({
        pieces: Number(r.pieces) || 0,
        rate: Number(r.rate) || 0,
        item: r.item,
        traderRate: Number(r.traderRate) || 0,
        amount: r.amount,
      })),
      charges: {
        commission: Number(commission) || 0,
        fare: Number(fare) || 0,
        expense: Number(expense) || 0,
        labor: Number(labor) || 0,
        market: Number(market) || 0,
        munshiana: Number(munshiana) || 0,
        store: Number(store) || 0,
        cashBill: Number(cashBill) || 0,
        payment: Number(payment) || 0,
      },
      lagana: Number(summaryLagana) || 0,
      diffAccount: Number(diffAccount) || 0,
    }
  }

  const completeBill = async () => {
    if (grossAmount <= 0 && totalPieces <= 0) {
      toast.error(L('کم از کم ایک لائن درج کریں', 'Enter at least one line'))
      return
    }
    if (saving) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editingId) {
        await purchasesApi.update(editingId, payload)
        toast.success(L('بل اپڈیٹ ہو گیا', 'Bill updated'))
      } else {
        await purchasesApi.create(payload)
        toast.success(L('خرید بل مکمل ہو گیا', 'Purchase bill completed'))
      }
      await loadBills()
      await resetBill()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('محفوظ ناکام', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const loadBill = (b: BillRow) => {
    setEditingId(b.id)
    setInvoice(b.invoice)
    setDate(b.date.replace(/-/g, '/'))
    setHeaderItem(b.item === '—' ? '' : b.item)
    setMarka(b.marka === '—' ? '' : b.marka)
    setVehicle(b.vehicle === '—' ? '' : b.vehicle)
    setTotalNagHeader(String(b.pieces))
    const party = landowners.find(
      (p) => p.nameUr === b.landowner || p.nameEn === b.landowner
    )
    if (party) setLandownerId(party.id)
    const marfat = marfatList.find((m) => m.nameUr === b.marfat || m.nameEn === b.marfat)
    if (marfat) setMarfatId(marfat.id)
    setLines([
      {
        id: crypto.randomUUID(),
        pieces: String(b.pieces),
        rate: b.pieces ? String(Math.round(b.amount / b.pieces)) : '',
        item: b.item === '—' ? '' : b.item,
        traderRate: '0',
      },
    ])
    toast.message(L('بل ترمیم کے لیے کھلا', 'Bill loaded for edit'))
  }

  const removeBill = async (id: string) => {
    try {
      await purchasesApi.remove(id)
      setSelectedIds((prev) => prev.filter((x) => x !== id))
      if (editingId === id) await resetBill()
      toast.message(L('بل حذف', 'Bill removed'))
      await loadBills()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('حذف ناکام', 'Delete failed'))
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

  const saveChargesRef = useRef(saveCharges)
  const completeBillRef = useRef(completeBill)
  saveChargesRef.current = saveCharges
  completeBillRef.current = completeBill

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        saveChargesRef.current()
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        void completeBillRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pageTitle = L('خرید بل', 'Purchase Bill')
  const ledgerTitle = L('مال خرید کھاتہ', 'Purchase Goods Ledger')

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <FilePlus2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {pageTitle}
            </h1>
            <p className="text-[10px] text-sky-100/90" dir="ltr">
              INV #{invoice}
              {editingId ? ' · edit' : ''}
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

      {/* Outer scroll — sections move together */}
      <div className="min-h-0 flex-1 basis-0 overflow-y-scroll overscroll-contain p-2.5 [scrollbar-gutter:stable]">
        <div className="flex flex-col gap-2.5 pb-3">
        <div
          className={cn(
            'shrink-0 rounded-xl bg-[#0d5f86] px-4 py-2 text-center text-sm font-bold text-white shadow',
            rtl && 'font-urdu text-base'
          )}
        >
          {ledgerTitle}
        </div>

        {/* Header fields */}
        <section className="shrink-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[6.5rem_minmax(10rem,11rem)_minmax(12rem,1.4fr)_minmax(12rem,1.4fr)_repeat(4,minmax(0,1fr))] xl:grid-cols-[6rem_minmax(10rem,11rem)_minmax(10rem,1.3fr)_minmax(10rem,1.3fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_5.5rem_minmax(7rem,1fr)]">
            <Field label={L('انوائس', 'Invoice')}>
              <input
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </Field>
            <Field label={L('تاریخ', 'Date')} className="min-w-0">
              <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-full" />
            </Field>
            <Field label={L('نام زمیندار', 'Landowner')} className="min-w-0 sm:col-span-2 lg:col-span-1">
              <select
                value={landownerId}
                onChange={(e) => setLandownerId(e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              >
                {landowners.length === 0 && (
                  <option value="">{L('کوئی کھاتہ نہیں', 'No parties')}</option>
                )}
                {landowners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {lang === 'ur' ? o.nameUr : o.nameEn}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={L('معرفت', 'Marfat')} className="sm:col-span-2 lg:col-span-1">
              <select
                value={marfatId}
                onChange={(e) => setMarfatId(e.target.value)}
                className={cn('mandi-input w-full', rtl && 'font-urdu')}
              >
                {marfatList.length === 0 && (
                  <option value="">{L('کوئی معرفت نہیں', 'No marfat')}</option>
                )}
                {marfatList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {lang === 'ur' ? m.nameUr : m.nameEn}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={L('جنس', 'Item')}>
              {rtl ? (
                <MandiUrduInput value={headerItem} onChange={setHeaderItem} placeholder="جنس لکھیں" />
              ) : (
                <input
                  value={headerItem}
                  onChange={(e) => setHeaderItem(e.target.value)}
                  className="mandi-input"
                />
              )}
            </Field>
            <Field label={L('مارکہ', 'Marka')}>
              {rtl ? (
                <MandiUrduInput value={marka} onChange={setMarka} placeholder="مارکہ لکھیں" />
              ) : (
                <input
                  value={marka}
                  onChange={(e) => setMarka(e.target.value)}
                  className="mandi-input"
                />
              )}
            </Field>
            <Field label={L('کل نگ', 'Total pcs')}>
              <input
                value={totalNagHeader}
                onChange={(e) => setTotalNagHeader(e.target.value)}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label={L('گاڑی نمبر', 'Vehicle No')}>
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="mandi-input text-center"
                dir="ltr"
              />
            </Field>
          </div>
        </section>

        {/* Line items — height follows rows; scrolls only when many lines */}
        <section className="flex max-h-[min(55vh,28rem)] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <p className={cn('text-sm font-bold text-[#0d5f86]', rtl && 'font-urdu')}>
              {L('مال کی تفصیل', 'Goods detail')}
            </p>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              title={L('لائن شامل', 'Add line')}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-auto p-2 pb-4">
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_1.2fr_1fr_1.1fr_36px] gap-2 px-1 text-[11px] font-bold text-slate-600 sm:grid">
                <span className="text-center">{L('نگ', 'Pcs')}</span>
                <span className="text-center">{L('ریٹ', 'Rate')}</span>
                <span className="text-center">{L('جنس', 'Item')}</span>
                <span className="text-center">{L('بپاری ریٹ', 'Trader rate')}</span>
                <span className="text-center">{L('ٹوٹل رقم', 'Total')}</span>
                <span />
              </div>
              {lineTotals.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-[#f8fbfd] p-2 sm:grid-cols-[1fr_1fr_1.2fr_1fr_1.1fr_36px] sm:items-end"
                >
                  <Field label={L('نگ', 'Pcs')} className="sm:[&>span]:hidden">
                    <input
                      value={row.pieces}
                      onChange={(e) => updateLine(row.id, 'pieces', e.target.value)}
                      className="mandi-input h-9 text-center tabular-nums"
                      dir="ltr"
                    />
                  </Field>
                  <Field label={L('ریٹ', 'Rate')} className="sm:[&>span]:hidden">
                    <input
                      value={row.rate}
                      onChange={(e) => updateLine(row.id, 'rate', e.target.value)}
                      className="mandi-input h-9 text-center tabular-nums"
                      dir="ltr"
                    />
                  </Field>
                  <Field label={L('جنس', 'Item')} className="col-span-2 sm:col-span-1 sm:[&>span]:hidden">
                    {rtl ? (
                      <MandiUrduInput
                        value={row.item}
                        onChange={(v) => updateLine(row.id, 'item', v)}
                        className="h-9"
                        placeholder="جنس"
                      />
                    ) : (
                      <input
                        value={row.item}
                        onChange={(e) => updateLine(row.id, 'item', e.target.value)}
                        className="mandi-input h-9"
                      />
                    )}
                  </Field>
                  <Field label={L('بپاری ریٹ', 'Trader rate')} className="sm:[&>span]:hidden">
                    <input
                      value={row.traderRate}
                      onChange={(e) => updateLine(row.id, 'traderRate', e.target.value)}
                      className="mandi-input h-9 text-center tabular-nums"
                      dir="ltr"
                    />
                  </Field>
                  <Field label={L('ٹوٹل رقم', 'Total')} className="sm:[&>span]:hidden">
                    <div
                      className="flex h-9 items-center justify-center rounded border border-[#6b8fa8] bg-[#cfeee8] text-sm font-bold tabular-nums text-slate-800"
                      dir="ltr"
                    >
                      {formatRs(row.amount)}
                    </div>
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeLine(row.id)}
                    className="flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-rose-600 hover:bg-rose-50 sm:mb-0"
                    aria-label="Delete line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Charges — full row below goods (same as Sale Maal) */}
        <section className="shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div
            className={cn(
              'border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-[#0d5f86]',
              rtl && 'font-urdu'
            )}
          >
            {L('خرچہ / ادائیگی', 'Charges / Pay')}
          </div>
          <div className="flex flex-wrap items-end gap-2.5 p-2.5">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
              <ChargeField label={L('کمیشن', 'Commission')} value={commission} onChange={setCommission} />
              <ChargeField label={L('کرایہ', 'Fare')} value={fare} onChange={setFare} />
              <ChargeField label={L('خرچہ', 'Expense')} value={expense} onChange={setExpense} />
              <ChargeField label={L('مزدوری', 'Labor')} value={labor} onChange={setLabor} />
              <ChargeField label={L('مارکیٹ', 'Market')} value={market} onChange={setMarket} />
              <ChargeField label={L('منشیانہ', 'Munshiana')} value={munshiana} onChange={setMunshiana} />
              <ChargeField label={L('سٹور', 'Store')} value={store} onChange={setStore} />
              <ChargeField label={L('نقدی بل نقدی', 'Cash bill')} value={cashBill} onChange={setCashBill} />
              <ChargeField label={L('ادائیگی', 'Payment')} value={payment} onChange={setPayment} />
            </div>
            <button
              type="button"
              onClick={saveCharges}
              className={cn(
                'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0d5f86] px-4 text-sm font-bold text-white hover:bg-[#0a4c6b]',
                rtl && 'font-urdu'
              )}
            >
              <Save className="h-4 w-4" />
              {L('محفوظ کریں', 'Save')}
              <span className="text-[10px] font-semibold opacity-80" dir="ltr">
                Alt+M
              </span>
            </button>
          </div>
        </section>

        {/* Summary */}
        <section className="shrink-0 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-end gap-2">
            <SummaryBox label={L('کل نگ', 'Total pcs')} value={formatRs(totalPieces)} />
            <SummaryBox label={L('خام رقم', 'Gross')} value={formatRs(grossAmount)} />
            <SummaryBox label={L('کل خرچہ', 'Expenses')} value={formatRs(totalExpense)} tone="rose" />
            <SummaryBox label={L('صافی رقم', 'Net')} value={formatRs(netAmount)} tone="emerald" />
            <div className="min-w-[100px] flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">{L('لگانا', 'Lagana')}</label>
              <input
                value={summaryLagana}
                onChange={(e) => setSummaryLagana(e.target.value)}
                className="mandi-input h-9 text-center tabular-nums"
                dir="ltr"
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
              onClick={() => void completeBill()}
              disabled={saving}
              className={cn(
                'inline-flex h-10 min-w-[160px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-900 shadow hover:bg-amber-300 sm:flex-none disabled:opacity-60',
                rtl && 'font-urdu'
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingId ? L('بل اپڈیٹ', 'Update bill') : L('بیجک مکمل کریں', 'Complete bill')}
              <span className="text-[10px] opacity-70" dir="ltr">
                Alt+N
              </span>
            </button>
          </div>
        </section>

        {/* Bills table — natural height; outer page scroll */}
        <section className="shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-700 text-white">
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
                  <Th>{L('مارکہ', 'Marka')}</Th>
                  <Th>{L('جنس', 'Item')}</Th>
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
                        editingId === b.id && 'bg-sky-100',
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
                      <td className={cn('px-3 py-2 font-semibold', rtl && 'font-urdu')}>{b.landowner}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marfat}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marka}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.item}</td>
                      <td className="px-3 py-2 text-center" dir="ltr">
                        {b.vehicle}
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
                            onClick={() => loadBill(b)}
                            className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-100"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeBill(b.id)}
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

function ChargeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="mandi-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mandi-input h-9 text-center tabular-nums"
        dir="ltr"
      />
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
  tone?: 'rose' | 'emerald'
}) {
  return (
    <div className="min-w-[88px] flex-1">
      <p className="mb-1 text-[11px] font-bold text-slate-600">{label}</p>
      <div
        className={cn(
          'flex h-9 items-center justify-center rounded border border-[#6b8fa8] bg-[#eceff3] text-sm font-bold tabular-nums',
          tone === 'rose' && 'bg-rose-50 text-rose-700',
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
