import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { PackagePlus, Pencil, Save, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { productsApi } from '@/lib/mandiApi'
import { ApiClientError } from '@/lib/api'
import type { Product } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

interface ProductRow {
  id: string
  code: string
  nameEn: string
  nameUr: string
  commission: number
  labor: number
  market: number
  munshiana: number
  fare: number
}

function productToRow(p: Product): ProductRow {
  return {
    id: p._id,
    code: p.code,
    nameEn: p.nameEn || '',
    nameUr: p.nameUr || '',
    commission: Number(p.commission) || 0,
    labor: Number(p.labor) || 0,
    market: Number(p.market) || 0,
    munshiana: Number(p.munshiana) || 0,
    fare: Number(p.fare) || 0,
  }
}

type ProductForm = Omit<ProductRow, 'id' | 'commission' | 'labor' | 'market' | 'munshiana' | 'fare'> & {
  commission: string
  labor: string
  market: string
  munshiana: string
  fare: string
}

function emptyForm(nextCode: string): ProductForm {
  return {
    code: nextCode,
    nameEn: '',
    nameUr: '',
    commission: '',
    labor: '',
    market: '',
    munshiana: '',
    fare: '',
  }
}

function decimalInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [head, ...rest] = cleaned.split('.')
  return rest.length ? `${head}.${rest.join('').replace(/\./g, '')}` : head
}

/** نیو جنس — New Product (professional form + searchable table) */
export function NewProductPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(() => emptyForm(''))
  const [nextCode, setNextCode] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const [list, codeRes] = await Promise.all([productsApi.list(), productsApi.nextCode()])
      setRows(list.map(productToRow))
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
        r.code.toLowerCase().includes(q) ||
        r.nameEn.toLowerCase().includes(q) ||
        r.nameUr.includes(query)
    )
  }, [rows, query])

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = async () => {
    setEditingId(null)
    try {
      const { code } = await productsApi.nextCode()
      setNextCode(code)
      setForm(emptyForm(code))
    } catch {
      setForm(emptyForm(nextCode || ''))
    }
  }

  const loadRow = (row: ProductRow) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      nameEn: row.nameEn,
      nameUr: row.nameUr,
      commission: row.commission ? String(row.commission) : '',
      labor: row.labor ? String(row.labor) : '',
      market: row.market ? String(row.market) : '',
      munshiana: row.munshiana ? String(row.munshiana) : '',
      fare: row.fare ? String(row.fare) : '',
    })
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameEn.trim() && !form.nameUr.trim()) {
      toast.error(L('جنس کا نام درج کریں', 'Enter product name'))
      return
    }
    if (!form.code.trim()) {
      toast.error(L('کوڈ درج کریں', 'Enter product code'))
      return
    }

    const payload = {
      code: form.code,
      nameEn: form.nameEn,
      nameUr: form.nameUr,
      commission: form.commission || '0',
      labor: form.labor || '0',
      market: form.market || '0',
      munshiana: form.munshiana || '0',
      fare: form.fare || '0',
    }

    try {
      if (editingId) {
        await productsApi.update(editingId, payload)
        toast.success(L('جنس اپڈیٹ ہو گئی', 'Product updated'))
      } else {
        await productsApi.create(payload)
        toast.success(L('نئی جنس محفوظ ہو گئی', 'Product saved'))
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
      await productsApi.remove(id)
      if (editingId === id) await resetForm()
      toast.message(L('جنس حذف', 'Product removed'))
      await load()
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : L('حذف ناکام', 'Delete failed'))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#7eb6d4] bg-gradient-to-l from-[#0d5f86] to-[#1a7eab] px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <PackagePlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-lg font-bold', lang === 'ur' && 'font-urdu text-xl')}>
              {L('نیو جنس', 'New Product')}
            </h1>
            <p className="text-[11px] text-sky-100/90" dir="ltr">
              {loading ? '…' : `${rows.length} products`}
            </p>
          </div>
        </div>
        <MandiHomeLink lang={lang} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        {/* Entry form */}
        <form
          onSubmit={onSave}
          className="shrink-0 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={cn('text-base font-bold text-[#0d5f86]', lang === 'ur' && 'font-urdu text-lg')}>
              {editingId ? L('جنس ترمیم', 'Edit Product') : L('نیو جنس فارم', 'New Product Form')}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
                {L('نیا فارم', 'New form')}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[6.5rem_minmax(10rem,1.4fr)_minmax(10rem,1.4fr)_repeat(5,minmax(0,1fr))] xl:grid-cols-[6.5rem_minmax(9rem,1.3fr)_minmax(9rem,1.3fr)_repeat(6,minmax(0,1fr))]">
            <Field label={L('کوڈ جنس', 'Product code')}>
              <input
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </Field>

            <Field label={L('نام انگلش', 'English name')} className="sm:col-span-1 lg:col-span-1">
              <input
                value={form.nameEn}
                onChange={(e) => setField('nameEn', e.target.value)}
                className="mandi-input"
                placeholder="English name"
                dir="ltr"
              />
            </Field>

            <Field label={L('نام جنس', 'Urdu name')} className="sm:col-span-1 lg:col-span-1">
              <MandiUrduInput
                value={form.nameUr}
                onChange={(v) => setField('nameUr', v)}
                placeholder={L('اردو / pyaz', 'Urdu / pyaz')}
              />
            </Field>

            <Field label={L('کمیشن', 'Commission')}>
              <input
                type="text"
                inputMode="decimal"
                value={form.commission}
                onChange={(e) => setField('commission', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>

            <Field label={L('مزدوری', 'Labor')}>
              <input
                type="text"
                inputMode="decimal"
                value={form.labor}
                onChange={(e) => setField('labor', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>

            <Field label={L('مارکیٹ', 'Market')}>
              <input
                type="text"
                inputMode="decimal"
                value={form.market}
                onChange={(e) => setField('market', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>

            <Field label={L('منشیانہ', 'Munshiana')}>
              <input
                type="text"
                inputMode="decimal"
                value={form.munshiana}
                onChange={(e) => setField('munshiana', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>

            <Field label={L('کرایہ', 'Fare')}>
              <input
                type="text"
                inputMode="decimal"
                value={form.fare}
                onChange={(e) => setField('fare', decimalInput(e.target.value))}
                className="mandi-input text-center tabular-nums"
                dir="ltr"
                placeholder="0.00"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {L('صاف', 'Clear')}
            </button>
            <button
              type="submit"
              className={cn(
                'inline-flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#e11d48] px-5 text-sm font-bold leading-none text-white shadow hover:bg-[#be123c]',
                lang === 'ur' && 'font-urdu'
              )}
            >
              <Save className="h-4 w-4" />
              {L('محفوظ کریں', 'Save')}
            </button>
          </div>
        </form>

        {/* Searchable table */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className={cn('text-sm font-bold text-slate-700', lang === 'ur' && 'font-urdu')}>
              {L('جنس لسٹ', 'Product list')}
            </p>
            <div className="relative ms-auto min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L('کوڈ / نام تلاش…', 'Search code / name…')}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-9 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0d5f86] text-white">
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('کوڈ', 'Code')}</th>
                  <th className="px-3 py-2.5 text-start text-xs font-bold">{L('نام انگلش', 'English')}</th>
                  <th className="px-3 py-2.5 text-start text-xs font-bold">{L('نام اردو', 'Urdu')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('کمیشن', 'Comm.')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('مزدوری', 'Labor')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('مارکیٹ', 'Market')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('منشیانہ', 'Munshi')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('کرایہ', 'Fare')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('ایکشن', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className={cn('px-3 py-12 text-center text-slate-400', lang === 'ur' && 'font-urdu')}
                    >
                      {loading ? L('لوڈ ہو رہا ہے…', 'Loading…') : L('کوئی جنس نہیں ملی', 'No products found')}
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
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-800" dir="ltr">
                        {r.code}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-right text-slate-800" dir="ltr">
                        {r.nameEn}
                      </td>
                      <td className={cn('px-3 py-2.5 font-medium text-slate-800', 'font-urdu')}>{r.nameUr}</td>
                      <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                        {r.commission}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                        {r.labor}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                        {r.market}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                        {r.munshiana}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums" dir="ltr">
                        {r.fare}
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
      <span className="mandi-label">{label}</span>
      {children}
    </label>
  )
}
