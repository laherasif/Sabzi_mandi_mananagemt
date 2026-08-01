import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Save, Search, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { formatDisplayDate } from '@/components/mandi/MandiDatePicker'
import { partiesApi } from '@/lib/mandiApi'
import { ApiClientError } from '@/lib/api'
import type { AccountType, Party } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

interface CustomerRow {
  id: string
  code: string
  nameUr: string
  nameEn: string
  phone: string
  address: string
  bankAccountNumber: string
  accountType: string
  date: string
  debit: number
  credit: number
  commission: string
  details: string
  item: string
  agrahi: string
}

const ACCOUNT_TYPES = [
  { value: 'بیوپاری کھاتہ', en: 'Trader A/c', type: 'trader' as AccountType },
  { value: 'گاہک کھاتہ', en: 'Customer A/c', type: 'customer' as AccountType },
  { value: 'سپلائر کھاتہ', en: 'Supplier A/c', type: 'supplier' as AccountType },
] as const

function labelToType(label: string): AccountType {
  return ACCOUNT_TYPES.find((t) => t.value === label)?.type || 'customer'
}

function partyToRow(p: Party): CustomerRow {
  const bal = Number(p.balance || 0)
  return {
    id: p._id,
    code: p.code,
    nameUr: p.nameUr || '',
    nameEn: p.nameEn || '',
    phone: p.phone || '',
    address: p.address || '',
    bankAccountNumber: p.bankAccountNumber || '',
    accountType: p.accountTypeLabel || ACCOUNT_TYPES.find((t) => t.type === p.accountType)?.value || 'گاہک کھاتہ',
    date: p.date || '',
    debit: bal > 0 ? bal : Number(p.openingDebit || 0),
    credit: bal < 0 ? Math.abs(bal) : Number(p.openingCredit || 0),
    commission: p.commission || '',
    details: p.details || '',
    item: p.item || '',
    agrahi: p.agrahi || 'NEW',
  }
}

type CustomerForm = Omit<CustomerRow, 'id' | 'debit' | 'credit'> & {
  debit: string
  credit: string
}

function emptyForm(nextCode: string): CustomerForm {
  return {
    code: nextCode,
    nameUr: '',
    nameEn: '',
    phone: '',
    address: '',
    bankAccountNumber: '',
    accountType: 'گاہک کھاتہ',
    date: formatDisplayDate(new Date()),
    debit: '',
    credit: '',
    commission: '',
    details: '',
    item: '',
    agrahi: 'NEW',
  }
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(n)
}

/** Allow digits + one decimal point while typing */
function decimalInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [head, ...rest] = cleaned.split('.')
  return rest.length ? `${head}.${rest.join('').replace(/\./g, '')}` : head
}

/** نیو کسٹمر — professional form grid on top, table below */
export function NewCustomerPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)
  const rtl = lang === 'ur'

  const [rows, setRows] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(() => emptyForm(''))
  const [nextCode, setNextCode] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const [list, codeRes] = await Promise.all([partiesApi.list(), partiesApi.nextCode()])
      setRows(list.map(partyToRow))
      setNextCode(codeRes.code)
      setForm((prev) => (prev.code ? prev : emptyForm(codeRes.code)))
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : L('لوڈ ناکام', 'Load failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.code.includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.nameUr.includes(query) ||
        r.phone.includes(q) ||
        r.bankAccountNumber.toLowerCase().includes(q)
    )
  }, [rows, query])

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = async () => {
    setEditingId(null)
    try {
      const { code } = await partiesApi.nextCode()
      setNextCode(code)
      setForm(emptyForm(code))
    } catch {
      setForm(emptyForm(nextCode || ''))
    }
  }

  const loadRow = (row: CustomerRow) => {
    setEditingId(row.id)
    setForm({
      ...row,
      debit: row.debit ? String(row.debit) : '',
      credit: row.credit ? String(row.credit) : '',
    })
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameUr.trim() && !form.nameEn.trim()) {
      toast.error(L('نام درج کریں', 'Enter a name'))
      return
    }

    const payload = {
      code: form.code,
      nameUr: form.nameUr,
      nameEn: form.nameEn,
      phone: form.phone,
      address: form.address,
      bankAccountNumber: form.bankAccountNumber.trim(),
      accountType: labelToType(form.accountType),
      accountTypeLabel: form.accountType,
      date: formatDisplayDate(new Date()),
      commission: form.commission || '2%',
      details: form.details,
      item: form.item,
      agrahi: (form.agrahi as 'NEW' | 'OLD' | '') || 'NEW',
      ...(editingId
        ? {}
        : {
            openingDebit: Number(form.debit) || 0,
            openingCredit: Number(form.credit) || 0,
          }),
    }

    try {
      if (editingId) {
        await partiesApi.update(editingId, payload)
        toast.success(L('کھاتہ اپڈیٹ ہو گیا', 'Account updated'))
      } else {
        await partiesApi.create(payload)
        toast.success(L('نیا کھاتہ محفوظ ہو گیا', 'New account saved'))
      }
      setEditingId(null)
      await load()
      await resetForm()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('محفوظ ناکام', 'Save failed'))
    }
  }

  const removeRow = async (id: string) => {
    try {
      await partiesApi.remove(id)
      if (editingId === id) await resetForm()
      toast.message(L('کھاتہ حذف', 'Account removed'))
      await load()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('حذف ناکام', 'Delete failed'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-urdu text-xl font-bold">نیا کسٹمر / کھاتہ</h1>
            <p className="text-[11px] text-sky-100/90 font-urdu">{rows.length} کھاتے</p>
          </div>
        </div>
        <MandiHomeLink lang={lang} />
      </div>

      {/* Outer scroll — both cards move together */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="flex flex-col gap-3 pb-3">
        <form
          onSubmit={onSave}
          className="shrink-0 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="font-urdu text-lg font-bold text-[#0d5f86]">
              {editingId ? 'کھاتہ ترمیم' : 'نیا کھاتہ شامل کریں'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-urdu text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
                نیا فارم
              </button>
            )}
          </div>

          {/* ایک جیسا 4-کالم گرڈ — سب قطاروں میں سیدھا */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="پارٹی نمبر">
              <input
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className="mandi-input w-full text-center font-bold tabular-nums"
                dir="ltr"
              />
            </Field>
            <Field label="تاریخ">
              <div
                className="mandi-input flex h-10 items-center justify-center bg-slate-50 tabular-nums text-slate-700"
                dir="ltr"
              >
                {formatDisplayDate(new Date())}
              </div>
            </Field>
            <Field label="کھاتہ قسم">
              <select
                value={form.accountType}
                onChange={(e) => setField('accountType', e.target.value)}
                className="mandi-input font-urdu"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اگراہی">
              <select
                value={form.agrahi === 'ALL' ? 'NEW' : form.agrahi}
                onChange={(e) => setField('agrahi', e.target.value)}
                className="mandi-input font-urdu text-center"
              >
                <option value="NEW">نیا</option>
                <option value="OLD">پرانا</option>
              </select>
            </Field>

            <Field label="اردو نام">
              <MandiUrduInput
                value={form.nameUr}
                onChange={(v) => setField('nameUr', v)}
                placeholder="اردو نام"
              />
            </Field>
            <Field label="انگریزی نام">
              <input
                value={form.nameEn}
                onChange={(e) => setField('nameEn', e.target.value)}
                className="mandi-input"
                placeholder="English name"
                dir="ltr"
              />
            </Field>
            <Field label="فون نمبر">
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                className="mandi-input tabular-nums"
                dir="ltr"
                placeholder="03xx-xxxxxxx"
              />
            </Field>
            <Field label="جنس">
              <MandiUrduInput
                value={form.item}
                onChange={(v) => setField('item', v)}
                placeholder="جنس لکھیں"
              />
            </Field>

            <Field label="پتہ" className="sm:col-span-2">
              <MandiUrduInput
                value={form.address}
                onChange={(v) => setField('address', v)}
                placeholder="پتہ لکھیں"
              />
            </Field>
            <Field label="بینک اکاؤنٹ نمبر">
              <input
                value={form.bankAccountNumber}
                onChange={(e) => setField('bankAccountNumber', e.target.value)}
                className="mandi-input tabular-nums"
                dir="ltr"
                placeholder="PK00XXXX..."
                inputMode="text"
                autoComplete="off"
              />
            </Field>
            <Field label="کمیشن">
              <input
                value={form.commission}
                onChange={(e) => setField('commission', e.target.value)}
                className="mandi-input text-center"
                dir="ltr"
                placeholder="2%"
              />
            </Field>

            <Field label="تفصیل" className="sm:col-span-2 lg:col-span-4">
              <MandiUrduInput
                value={form.details}
                onChange={(v) => setField('details', v)}
                placeholder="تفصیل لکھیں"
              />
            </Field>

            <Field label="بنام رقم">
              <input
                type="text"
                inputMode="decimal"
                value={form.debit}
                onChange={(e) => setField('debit', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>
            <Field label="جمع رقم">
              <input
                type="text"
                inputMode="decimal"
                value={form.credit}
                onChange={(e) => setField('credit', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2 lg:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 min-w-[6.5rem] flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 font-urdu text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
              >
                صاف
              </button>
              <button
                type="submit"
                className="inline-flex h-10 min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-[#e11d48] px-5 font-urdu text-sm font-bold text-white shadow hover:bg-[#be123c] sm:flex-none"
              >
                <Save className="h-4 w-4" />
                محفوظ کریں
              </button>
            </div>
          </div>
        </form>

        {/* Table card — natural height; page scrolls to show it fully */}
        <section className="shrink-0 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="font-urdu text-sm font-bold text-slate-700">کھاتہ لسٹ</p>
            <div className="relative ms-auto min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="نام / کوڈ / فون / بینک تلاش…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-9 font-urdu text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0d5f86] px-3 font-urdu text-sm font-bold text-white hover:bg-[#0a4c6b]"
            >
              <UserPlus className="h-4 w-4" />
              نیا
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#0d5f86] text-white">
                  <th className="px-3 py-2.5 text-center text-xs font-bold">#</th>
                  <th className="px-3 py-2.5 text-start font-urdu text-xs font-bold">نام</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">فون</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">بینک اکاؤنٹ</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">قسم</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">بنام</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">جمع</th>
                  <th className="px-3 py-2.5 text-center font-urdu text-xs font-bold">ایکشن</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center font-urdu text-slate-400">
                      کوئی ریکارڈ نہیں
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-t border-slate-100 transition hover:bg-sky-50',
                        editingId === r.id && 'bg-sky-50'
                      )}
                    >
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums" dir="ltr">
                        {r.code}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-10">
                          <p className={cn('font-semibold text-slate-900', rtl && 'font-urdu')}>
                            {lang === 'ur' ? r.nameUr : r.nameEn}
                          </p>
                          <p className="text-[11px] text-slate-500" dir="ltr">
                            {lang === 'ur' ? r.nameEn : r.nameUr}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-600" dir="ltr">
                        {r.phone || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-700" dir="ltr">
                        {r.bankAccountNumber || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-urdu text-xs text-slate-600">
                        {r.accountType}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-orange-700" dir="ltr">
                        {formatRs(r.debit)}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-emerald-700" dir="ltr">
                        {formatRs(r.credit)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => loadRow(r)}
                            className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-100"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(r.id)}
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
    <label className={cn('block min-w-0 space-y-1.5', className)}>
      <span className="mandi-label font-urdu">{label}</span>
      {children}
    </label>
  )
}
