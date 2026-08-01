import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Loader2, Printer, Search } from 'lucide-react'
import { MandiDatePicker } from '@/components/mandi/MandiDatePicker'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import {
  BillPrintDocument,
  type PrintableBill,
} from '@/components/mandi/BillPrintDocument'
import { ApiClientError } from '@/lib/api'
import { partiesApi, salesApi } from '@/lib/mandiApi'
import type { Party, SaleBill } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Ctx {
  lang: 'en' | 'ur'
}

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
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

function marfatLabel(b: SaleBill): { ur: string; en: string } {
  const m = b.marfat
  if (m && typeof m === 'object') {
    return {
      ur: m.marfatUr || m.marfatEn || b.marfatName || '',
      en: m.marfatEn || m.marfatUr || b.marfatName || '',
    }
  }
  return { ur: b.marfatName || '', en: b.marfatName || '' }
}

function toPrintable(b: SaleBill): PrintableBill {
  const marfat = marfatLabel(b)
  const lines =
    b.lines?.length > 0
      ? b.lines.map((l) => ({
          pieces: Number(l.pieces) || 0,
          itemUr: l.item || l.name || b.item || '',
          itemEn: l.item || l.name || b.item || '',
          rate: Number(l.rate) || 0,
          amount: Number(l.amount) || (Number(l.pieces) || 0) * (Number(l.rate) || 0),
        }))
      : [
          {
            pieces: Number(b.totalNag) || 0,
            itemUr: b.item || '',
            itemEn: b.item || '',
            rate: 0,
            amount: Number(b.grossAmount) || 0,
          },
        ]

  const c = b.charges || {}
  return {
    id: b._id,
    billNo: b.invoice,
    date: b.date,
    vehicle: b.vehicle || '',
    customerUr: b.landowner || '',
    customerEn: b.landowner || '',
    marka: b.marka || '',
    totalBags: Number(b.totalNag) || lines.reduce((s, l) => s + l.pieces, 0),
    partyCode: typeof b.landownerParty === 'string' ? b.landownerParty : '',
    marfatUr: marfat.ur,
    marfatEn: marfat.en,
    lines,
    expenses: {
      fare: Number(c.fare) || 0,
      commission: Number(c.commission) || 0,
      labor: Number(c.labor) || 0,
      misc: Number(c.expense) || Number(c.market) || 0,
      munshiana: Number(c.munshiana) || 0,
    },
  }
}

/** بل پرنٹ — live sale bills + PDF/print */
export function BillPrintPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [parties, setParties] = useState<Party[]>([])
  const [bills, setBills] = useState<PrintableBill[]>([])
  const [loading, setLoading] = useState(true)

  const [partyCode, setPartyCode] = useState('all')
  const [marfat, setMarfat] = useState('')
  const [vehicle, setVehicle] = useState(lang === 'ur' ? 'تمام' : 'all')
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [partyRows, saleRows] = await Promise.all([partiesApi.list(), salesApi.list()])
      setParties(partyRows.filter((p) => p.isActive !== false))
      setBills(saleRows.map(toPrintable))
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

  const filtered = useMemo(() => {
    const from = parseParts(dateFrom)
    const to = parseParts(dateTo)
    return bills.filter((b) => {
      if (partyCode !== 'all') {
        const party = parties.find((p) => p._id === partyCode || p.code === partyCode)
        if (party) {
          const matchId = b.partyCode === party._id
          const matchName =
            b.customerUr === party.nameUr ||
            b.customerEn === party.nameEn ||
            b.customerUr === party.nameEn ||
            b.customerEn === party.nameUr
          if (!matchId && !matchName) return false
        } else if (b.partyCode !== partyCode) {
          return false
        }
      }
      if (!isAllFilter(vehicle) && b.vehicle.trim() !== vehicle.trim()) {
        return false
      }
      if (marfat.trim()) {
        const q = marfat.trim()
        if (!b.marfatUr.includes(q) && !b.marfatEn.toLowerCase().includes(q.toLowerCase())) {
          return false
        }
      }
      const bd = parseParts(b.date.replace(/-/g, '/'))
      if (from && bd && bd < from) return false
      if (to && bd && bd > to) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (
          !b.billNo.toLowerCase().includes(q) &&
          !b.customerEn.toLowerCase().includes(q) &&
          !b.customerUr.includes(query) &&
          !b.marka.toLowerCase().includes(q) &&
          !b.marfatUr.includes(query) &&
          !b.marfatEn.toLowerCase().includes(q) &&
          !b.vehicle.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [bills, parties, partyCode, marfat, vehicle, dateFrom, dateTo, query])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpened(true)
    if (filtered.length === 0) {
      toast.message(L('اس فلٹر پر کوئی بل نہیں', 'No bills for this filter'))
    } else {
      toast.success(L(`${filtered.length} بل دکھائے گئے`, `${filtered.length} bill(s) shown`))
    }
  }

  const onPdf = () => {
    if (!opened) {
      toast.message(L('پہلے محفوظ کریں دبا کر بل دیکھیں', 'Submit filters to view bills first'))
      return
    }
    if (filtered.length === 0) {
      toast.error(L('پرنٹ کے لیے کوئی بل نہیں', 'No bills to print'))
      return
    }
    window.print()
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-2.5 text-white print:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Printer className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-base font-bold leading-tight', rtl && 'font-urdu text-lg')}>
              {L('بل پرنٹ', 'Bill Print')}
            </h1>
            <p className="text-[10px] text-sky-100/90">{L('سیل بل وضاحت', 'Sale bill details')}</p>
          </div>
        </div>

        <div className="relative ms-auto min-w-[160px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200" />
          {rtl ? (
            <MandiUrduInput
              value={query}
              onChange={setQuery}
              placeholder="بل / نام تلاش…"
              className="h-9 w-full border-white/20 bg-white/15 pe-3 ps-9 text-sm text-white placeholder:text-sky-100/70 outline-none focus:bg-white/25"
            />
          ) : (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bill / name…"
              className="h-9 w-full rounded-lg border border-white/20 bg-white/15 pe-3 ps-9 text-sm text-white placeholder:text-sky-100/70 outline-none focus:bg-white/25"
            />
          )}
        </div>

        <MandiHomeLink lang={lang} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5 print:overflow-visible print:p-0">
        <form
          onSubmit={onSubmit}
          className="shrink-0 rounded-xl bg-white p-3 pb-4 shadow-sm ring-1 ring-black/5 print:hidden"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className={cn('text-sm font-bold text-[#0d5f86]', rtl && 'font-urdu text-base')}>
              {L('سیل بل وضاحت', 'Sale Bill Details')}
            </h2>
            {loading && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {L('لوڈ…', 'Loading…')}
              </span>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Field label={L('کوڈ پارٹی', 'Code Party')}>
              <select
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value)}
                className={cn('mandi-input', rtl && 'font-urdu')}
              >
                <option value="all">{L('تمام پارٹیز', 'All parties')}</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.code
                      ? `${p.code} — ${lang === 'ur' ? p.nameUr || p.nameEn : p.nameEn || p.nameUr}`
                      : lang === 'ur'
                        ? p.nameUr || p.nameEn
                        : p.nameEn || p.nameUr}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={L('معرفت', 'Marfat')}>
              {rtl ? (
                <MandiUrduInput value={marfat} onChange={setMarfat} placeholder="معرفت نام لکھیں" />
              ) : (
                <input
                  value={marfat}
                  onChange={(e) => setMarfat(e.target.value)}
                  className="mandi-input"
                  placeholder="Marfat name…"
                />
              )}
            </Field>

            <Field label={L('گاڑی #', 'Veh #')}>
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className={cn('mandi-input text-center', rtl && 'font-urdu')}
                placeholder={L('تمام', 'all')}
                dir={rtl ? 'rtl' : 'ltr'}
              />
            </Field>

            <Field label={L('تاریخ از', 'Date from')}>
              <MandiDatePicker value={dateFrom} onChange={setDateFrom} lang={lang} className="w-full" />
            </Field>

            <Field label={L('تاریخ تک', 'Date to')}>
              <MandiDatePicker value={dateTo} onChange={setDateTo} lang={lang} className="w-full" />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-rose-600 bg-white px-4 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50',
                rtl && 'font-urdu'
              )}
            >
              {L('محفوظ کریں', 'Submit')}
            </button>
            <button
              type="button"
              onClick={onPdf}
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700',
                rtl && 'font-urdu'
              )}
            >
              <FileText className="h-4 w-4" />
              {L('پی ڈی ایف / پرنٹ', 'PDF / Print')}
            </button>
            {opened && (
              <p className={cn('text-xs font-semibold text-slate-500', rtl && 'font-urdu')} dir={rtl ? 'rtl' : 'ltr'}>
                {L(`${filtered.length} بل`, `${filtered.length} bill(s)`)}
              </p>
            )}
          </div>
        </form>

        <div className="bill-print-area min-h-0 flex-1 overflow-auto rounded-xl bg-[#e8eef2] p-3 print:overflow-visible print:bg-white print:p-0">
          {loading ? (
            <div className="flex h-full min-h-[220px] items-center justify-center print:hidden">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d5f86]" />
            </div>
          ) : !opened ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-[#9ec4d8] bg-[#cfe6f2]/60 print:hidden">
              <p className={cn('text-sm text-[#0d5f86]/80', rtl && 'font-urdu text-base')}>
                {L(
                  'فلٹر چن کر محفوظ کریں دبائیں — بل یہاں نظر آئیں گے',
                  'Set filters and click Submit to view bills'
                )}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white print:hidden">
              <p className={cn('text-sm text-slate-400', rtl && 'font-urdu')}>
                {L('کوئی بل نہیں ملا', 'No bills found')}
              </p>
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl gap-4 print:max-w-none print:gap-6 lg:grid-cols-2 print:grid-cols-2">
              {filtered.map((bill) => (
                <BillPrintDocument key={bill.id} bill={bill} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="mandi-label">{label}</span>
      {children}
    </label>
  )
}
