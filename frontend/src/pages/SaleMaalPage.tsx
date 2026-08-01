import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { ApiClientError } from '@/lib/api'
import { marfatApi, partiesApi, salesApi } from '@/lib/mandiApi'
import type { Marfat, Party, SaleBill as ApiSaleBill } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Ctx {
  lang: 'en' | 'ur'
}

interface MarfatOption {
  id: string
  nameUr: string
  nameEn: string
}

interface LineItem {
  id: string
  name: string
  pieces: string
  rate: string
  item: string
  lagana: string
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
    name: '',
    pieces: '',
    rate: '',
    item: '',
    lagana: '0',
    traderRate: '0',
  }
}

function mapMarfat(m: Marfat): MarfatOption {
  return {
    id: m._id,
    nameUr: m.marfatUr || m.marfatEn || '',
    nameEn: m.marfatEn || m.marfatUr || '',
  }
}

function mapBill(b: ApiSaleBill): BillRow {
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

type BillFilter = 'all' | 'remaining' | 'goods' | 'purchase' | 'customers'

/** سیل مال — مال فروخت کھاتہ */
export function SaleMaalPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [search, setSearch] = useState('')
  const [invoice, setInvoice] = useState('')
  const [date, setDate] = useState(todayStr())
  const [landowner, setLandowner] = useState('')
  const [landownerPartyId, setLandownerPartyId] = useState('')
  const [marfatId, setMarfatId] = useState('')
  const [headerItem, setHeaderItem] = useState('')
  const [marka, setMarka] = useState('')
  const [totalNagHeader, setTotalNagHeader] = useState('')
  const [vehicle, setVehicle] = useState('')

  const [marfatList, setMarfatList] = useState<MarfatOption[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [saving, setSaving] = useState(false)

  const [lines, setLines] = useState<LineItem[]>([emptyLine()])

  const [commission, setCommission] = useState('0')
  const [fare, setFare] = useState('0')
  const [expense, setExpense] = useState('0')
  const [labor, setLabor] = useState('0')
  const [market, setMarket] = useState('0')
  const [munshiana, setMunshiana] = useState('0')
  const [storage, setStorage] = useState('0')
  const [summaryLagana, setSummaryLagana] = useState('')
  const [diffAccount, setDiffAccount] = useState('0')

  const [bills, setBills] = useState<BillRow[]>([])
  const [rawBills, setRawBills] = useState<ApiSaleBill[]>([])
  const [filter, setFilter] = useState<BillFilter>('all')
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedMarfat = marfatList.find((m) => m.id === marfatId) || marfatList[0]

  const lineTotals = useMemo(() => {
    return lines.map((row) => {
      const pieces = num(row.pieces)
      const rate = num(row.rate)
      const lagana = num(row.lagana)
      const trader = num(row.traderRate)
      const amount = pieces * rate
      return { ...row, pieces, rate, lagana, trader, amount }
    })
  }, [lines])

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
      num(storage) +
      num(summaryLagana),
    [commission, fare, expense, labor, market, munshiana, storage, summaryLagana]
  )
  const netAmount = grossAmount - totalExpense
  const average = totalPieces > 0 && Number.isFinite(grossAmount / totalPieces) ? grossAmount / totalPieces : 0

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = bills
    if (filter === 'remaining') list = bills.filter((b) => b.amount > 100000)
    if (filter === 'goods') list = bills
    if (filter === 'purchase') list = []
    if (filter === 'customers') list = bills
    if (!q) return list
    return list.filter(
      (b) =>
        b.invoice.includes(q) ||
        b.landowner.includes(search) ||
        b.marfat.includes(search) ||
        b.item.toLowerCase().includes(q) ||
        b.marka.toLowerCase().includes(q) ||
        b.vehicle.toLowerCase().includes(q)
    )
  }, [bills, filter, search])

  const loadBills = async () => {
    const list = await salesApi.list()
    setRawBills(list)
    setBills(list.map(mapBill))
  }

  const loadMarfat = async () => {
    const list = await marfatApi.list()
    const mapped = list.map(mapMarfat)
    setMarfatList(mapped)
    setMarfatId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || ''))
  }

  const fetchNextInvoice = async () => {
    const { invoice: next } = await salesApi.nextInvoice()
    setInvoice(next)
  }

  const loadAll = async () => {
    try {
      const [marfatRows, partyRows, billRows, inv] = await Promise.all([
        marfatApi.list(),
        partiesApi.list(),
        salesApi.list(),
        salesApi.nextInvoice(),
      ])
      const mapped = marfatRows.map(mapMarfat)
      setMarfatList(mapped)
      setMarfatId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || ''))
      setParties(partyRows)
      setRawBills(billRows)
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
    setEditingId(null)
    setSelectedBillId(null)
    setLandowner('')
    setLandownerPartyId('')
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
    setStorage('0')
    setSummaryLagana('')
    setDiffAccount('0')
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
    const marfatName = selectedMarfat
      ? lang === 'ur'
        ? selectedMarfat.nameUr
        : selectedMarfat.nameEn
      : ''
    return {
      invoice,
      date,
      landowner: landowner.trim(),
      landownerParty: landownerPartyId || null,
      marfat: marfatId || null,
      marfatName,
      item: headerItem || lineTotals.find((r) => r.item)?.item || '',
      marka,
      vehicle,
      totalNag: totalPieces,
      lines: lineTotals.map((r) => ({
        name: r.name,
        pieces: Number(r.pieces) || 0,
        rate: Number(r.rate) || 0,
        item: r.item,
        lagana: Number(r.lagana) || 0,
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
        storage: Number(storage) || 0,
      },
      lagana: Number(summaryLagana) || 0,
      diffAccount: Number(diffAccount) || 0,
    }
  }

  const completeBill = async () => {
    if (!landowner.trim()) {
      toast.error(L('نام زمیندار درج کریں', 'Enter landowner name'))
      return
    }
    if (grossAmount <= 0 && totalPieces <= 0) {
      toast.error(L('کم از کم ایک لائن درج کریں', 'Enter at least one line'))
      return
    }
    if (saving) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (editingId) {
        await salesApi.update(editingId, payload)
        toast.success(L('بل اپڈیٹ ہو گیا', 'Bill updated'))
      } else {
        await salesApi.create(payload)
        toast.success(L('بل مکمل محفوظ ہو گیا', 'Bill completed'))
      }
      await loadBills()
      await resetBill()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('محفوظ ناکام', 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const loadBill = (row: BillRow) => {
    const b = rawBills.find((x) => x._id === row.id)
    if (!b) {
      toast.error(L('بل نہیں ملا', 'Bill not found'))
      return
    }
    setEditingId(b._id)
    setSelectedBillId(b._id)
    setInvoice(b.invoice)
    setDate(b.date.replace(/-/g, '/'))
    setLandowner(b.landowner || '')
    setLandownerPartyId(typeof b.landownerParty === 'string' ? b.landownerParty : '')
    const marfatIdFromBill =
      b.marfat && typeof b.marfat === 'object' ? b.marfat._id : typeof b.marfat === 'string' ? b.marfat : ''
    if (marfatIdFromBill) setMarfatId(marfatIdFromBill)
    else {
      const byName = marfatList.find(
        (m) => m.nameUr === b.marfatName || m.nameEn === b.marfatName
      )
      if (byName) setMarfatId(byName.id)
    }
    setHeaderItem(b.item || '')
    setMarka(b.marka || '')
    setTotalNagHeader(b.totalNag ? String(b.totalNag) : '')
    setVehicle(b.vehicle || '')
    const c = b.charges || {}
    setCommission(String(c.commission ?? 0))
    setFare(String(c.fare ?? 0))
    setExpense(String(c.expense ?? 0))
    setLabor(String(c.labor ?? 0))
    setMarket(String(c.market ?? 0))
    setMunshiana(String(c.munshiana ?? 0))
    setStorage(String(c.storage ?? 0))
    setSummaryLagana(b.lagana ? String(b.lagana) : '')
    setDiffAccount(b.diffAccount ? String(b.diffAccount) : '0')
    if (b.lines?.length) {
      setLines(
        b.lines.map((l) => ({
          id: crypto.randomUUID(),
          name: l.name || '',
          pieces: String(l.pieces ?? ''),
          rate: String(l.rate ?? ''),
          item: l.item || '',
          lagana: String(l.lagana ?? 0),
          traderRate: String(l.traderRate ?? 0),
        }))
      )
    } else {
      setLines([emptyLine()])
    }
    toast.message(L('بل ترمیم کے لیے کھلا', 'Bill loaded for edit'))
  }

  const removeBill = async (id: string) => {
    try {
      await salesApi.remove(id)
      if (editingId === id) await resetBill()
      else if (selectedBillId === id) setSelectedBillId(null)
      toast.message(L('بل حذف', 'Bill removed'))
      await loadBills()
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('حذف ناکام', 'Delete failed'))
    }
  }

  const printBill = () => {
    if (!selectedBillId && filteredBills.length === 0) {
      toast.message(L('پہلے بل منتخب کریں', 'Select a bill first'))
      return
    }
    window.print()
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

  const onLandownerChange = (value: string) => {
    setLandowner(value)
    const byName = parties.find((p) => p.nameUr === value || p.nameEn === value)
    setLandownerPartyId(byName?._id || '')
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {L('سیل مال', 'Sale Goods')}
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

      {/* Outer scroll — all sections move together (like New Customer) */}
      <div className="min-h-0 flex-1 basis-0 overflow-y-scroll overscroll-contain p-2.5 [scrollbar-gutter:stable]">
        <div className="flex flex-col gap-2.5 pb-3">
        {/* Title strip */}
        <div
          className={cn(
            'shrink-0 rounded-xl bg-[#0d5f86] px-4 py-2 text-center text-sm font-bold text-white shadow',
            rtl && 'font-urdu text-base'
          )}
        >
          {L('مال فروخت کھاتہ', 'Sale of Goods Ledger')}
        </div>

        {/* Bill header fields */}
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
              {rtl ? (
                <MandiUrduInput
                  value={landowner}
                  onChange={onLandownerChange}
                  list="sale-landowner-parties"
                  placeholder="نام لکھیں"
                />
              ) : (
                <input
                  value={landowner}
                  onChange={(e) => onLandownerChange(e.target.value)}
                  list="sale-landowner-parties"
                  className="mandi-input"
                  placeholder="Landowner name"
                />
              )}
              <datalist id="sale-landowner-parties">
                {parties.map((p) => (
                  <option key={p._id} value={lang === 'ur' ? p.nameUr || p.nameEn : p.nameEn || p.nameUr} />
                ))}
              </datalist>
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
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0d5f86] px-2.5 text-xs font-bold text-white hover:bg-[#0a4c6b]"
            >
              <Plus className="h-3.5 w-3.5" />
              {L('لائن', 'Line')}
            </button>
          </div>
          <div className="overflow-auto pb-3">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0d5f86] text-white">
                  <Th>{L('نام', 'Name')}</Th>
                  <Th>{L('نگ', 'Pcs')}</Th>
                  <Th>{L('ریٹ', 'Rate')}</Th>
                  <Th>{L('جنس', 'Item')}</Th>
                  <Th>{L('لگانا', 'Lagana')}</Th>
                  <Th>{L('بپاری ریٹ', 'Trader rate')}</Th>
                  <Th>{L('ٹوٹل رقم', 'Total')}</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lineTotals.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 odd:bg-white even:bg-[#f3f9fc]">
                    <Td>
                      {rtl ? (
                        <MandiUrduInput
                          value={row.name}
                          onChange={(v) => updateLine(row.id, 'name', v)}
                          className="h-9"
                          placeholder="نام"
                        />
                      ) : (
                        <input
                          value={row.name}
                          onChange={(e) => updateLine(row.id, 'name', e.target.value)}
                          className="mandi-input h-9"
                        />
                      )}
                    </Td>
                    <Td>
                      <input
                        value={row.pieces}
                        onChange={(e) => updateLine(row.id, 'pieces', e.target.value)}
                        className="mandi-input h-9 text-center tabular-nums"
                        dir="ltr"
                      />
                    </Td>
                    <Td>
                      <input
                        value={row.rate}
                        onChange={(e) => updateLine(row.id, 'rate', e.target.value)}
                        className="mandi-input h-9 text-center tabular-nums"
                        dir="ltr"
                      />
                    </Td>
                    <Td>
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
                    </Td>
                    <Td>
                      <input
                        value={row.lagana}
                        onChange={(e) => updateLine(row.id, 'lagana', e.target.value)}
                        className="mandi-input h-9 text-center tabular-nums"
                        dir="ltr"
                      />
                    </Td>
                    <Td>
                      <input
                        value={row.traderRate}
                        onChange={(e) => updateLine(row.id, 'traderRate', e.target.value)}
                        className="mandi-input h-9 text-center tabular-nums"
                        dir="ltr"
                      />
                    </Td>
                    <Td>
                      <div className="mandi-input flex h-9 items-center justify-center bg-[#eceff3] font-bold tabular-nums" dir="ltr">
                        {formatRs(row.amount)}
                      </div>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => removeLine(row.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        aria-label="Delete line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Charges — full row below goods table */}
        <section className="shrink-0 rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <div
            className={cn(
              'border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-[#0d5f86]',
              rtl && 'font-urdu'
            )}
          >
            {L('خرچہ', 'Charges')}
          </div>
          <div className="flex flex-wrap items-end gap-2.5 p-2.5">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              <ChargeField label={L('کمیشن', 'Commission')} value={commission} onChange={setCommission} />
              <ChargeField label={L('کرایہ', 'Fare')} value={fare} onChange={setFare} />
              <ChargeField label={L('خرچہ', 'Expense')} value={expense} onChange={setExpense} />
              <ChargeField label={L('مزدوری', 'Labor')} value={labor} onChange={setLabor} />
              <ChargeField label={L('مارکیٹ', 'Market')} value={market} onChange={setMarket} />
              <ChargeField label={L('منشیانہ', 'Munshiana')} value={munshiana} onChange={setMunshiana} />
              <ChargeField label={L('سٹور سٹھ', 'Storage')} value={storage} onChange={setStorage} />
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
                + Alt M
              </span>
            </button>
          </div>
        </section>

        {/* Summary bar */}
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
              {editingId ? L('بل اپڈیٹ کریں', 'Update bill') : L('بیچک مکمل کریں', 'Complete bill')}
              <span className="text-[10px] opacity-70" dir="ltr">
                + Alt N
              </span>
            </button>
          </div>
        </section>

        {/* Bills list — tall block; outer page scroll */}
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
              {L('تمام کسٹمر تفصیل', 'All Customer Details')}
            </FilterBtn>
            <FilterBtn active={filter === 'remaining'} onClick={() => setFilter('remaining')} urdu={rtl}>
              {L('باقی سیلز', 'Remaining Sales')}
            </FilterBtn>
            <FilterBtn active={filter === 'goods'} onClick={() => setFilter('goods')} urdu={rtl}>
              {L('تمام سیل مال', 'All Sale Goods')}
            </FilterBtn>
            <FilterBtn active={filter === 'purchase'} onClick={() => setFilter('purchase')} urdu={rtl}>
              {L('تمام خرید بلز', 'All Purchase Bills')}
            </FilterBtn>
            <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} urdu={rtl}>
              {L('سب', 'All')}
            </FilterBtn>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <Th>INV#</Th>
                  <Th>{L('تاریخ', 'Date')}</Th>
                  <Th>{L('نام', 'Name')}</Th>
                  <Th>{L('معرفت', 'Marfat')}</Th>
                  <Th>{L('جنس', 'Item')}</Th>
                  <Th>{L('مارکہ', 'Marka')}</Th>
                  <Th>{L('نمبر', 'No.')}</Th>
                  <Th>{L('نگ', 'Pcs')}</Th>
                  <Th>{L('رقم', 'Amount')}</Th>
                  <Th>{L('عمل', 'Action')}</Th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className={cn('px-3 py-10 text-center text-slate-400', rtl && 'font-urdu')}
                    >
                      {L('کوئی بل نہیں', 'No bills')}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBillId(b.id)}
                      className={cn(
                        'cursor-pointer border-t border-slate-100 transition hover:bg-sky-50',
                        selectedBillId === b.id && 'bg-sky-100',
                        editingId === b.id && 'bg-amber-50'
                      )}
                    >
                      <td className="px-3 py-2 text-center font-bold tabular-nums" dir="ltr">
                        {b.invoice}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums" dir="ltr">
                        {b.date}
                      </td>
                      <td className={cn('px-3 py-2 font-semibold', rtl && 'font-urdu')}>{b.landowner}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marfat}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.item}</td>
                      <td className={cn('px-3 py-2', rtl && 'font-urdu')}>{b.marka}</td>
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
                            onClick={(e) => {
                              e.stopPropagation()
                              loadBill(b)
                            }}
                            className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-100"
                            aria-label="Edit"
                            title={L('ترمیم', 'Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void removeBill(b.id)
                            }}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                            aria-label="Delete"
                            title={L('حذف', 'Delete')}
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

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-2 py-2 text-center text-[11px] font-bold whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-1.5 align-middle">{children}</td>
}
