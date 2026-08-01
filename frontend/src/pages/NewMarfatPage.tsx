import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Save, Search, Trash2, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MandiHomeLink } from '@/components/mandi/MandiHomeLink'
import { MandiUrduInput } from '@/components/mandi/MandiUrduInput'
import { marfatApi } from '@/lib/mandiApi'
import { ApiClientError } from '@/lib/api'
import type { Marfat } from '@/lib/types'

interface Ctx {
  lang: 'en' | 'ur'
}

interface MarfatRow {
  id: string
  code: string
  landownerUr: string
  landownerEn: string
  marfatUr: string
  marfatEn: string
}

function marfatToRow(m: Marfat): MarfatRow {
  return {
    id: m._id,
    code: m.code,
    landownerUr: m.landownerUr || '',
    landownerEn: m.landownerEn || '',
    marfatUr: m.marfatUr || '',
    marfatEn: m.marfatEn || '',
  }
}

function emptyForm(nextCode: string): Omit<MarfatRow, 'id'> {
  return {
    code: nextCode,
    landownerUr: '',
    landownerEn: '',
    marfatUr: '',
    marfatEn: '',
  }
}

/** نیو معرفت — New Marfat / Reference */
export function NewMarfatPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [rows, setRows] = useState<MarfatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(() => emptyForm(''))
  const [nextCode, setNextCode] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const [list, codeRes] = await Promise.all([marfatApi.list(), marfatApi.nextCode()])
      setRows(list.map(marfatToRow))
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
        r.landownerEn.toLowerCase().includes(q) ||
        r.marfatEn.toLowerCase().includes(q) ||
        r.landownerUr.includes(query) ||
        r.marfatUr.includes(query)
    )
  }, [rows, query])

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const resetForm = async () => {
    setEditingId(null)
    try {
      const { code } = await marfatApi.nextCode()
      setNextCode(code)
      setForm(emptyForm(code))
    } catch {
      setForm(emptyForm(nextCode || ''))
    }
  }

  const loadRow = (row: MarfatRow) => {
    setEditingId(row.id)
    setForm({ ...row })
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.landownerUr.trim() && !form.landownerEn.trim()) {
      toast.error(L('زمیندار کا نام درج کریں', 'Enter landowner name'))
      return
    }
    if (!form.marfatUr.trim() && !form.marfatEn.trim()) {
      toast.error(L('معرفت درج کریں', 'Enter marfat / reference'))
      return
    }

    const payload = {
      code: form.code,
      landownerUr: form.landownerUr,
      landownerEn: form.landownerEn,
      marfatUr: form.marfatUr,
      marfatEn: form.marfatEn,
    }

    try {
      if (editingId) {
        await marfatApi.update(editingId, payload)
        toast.success(L('معرفت اپڈیٹ ہو گئی', 'Marfat updated'))
      } else {
        await marfatApi.create(payload)
        toast.success(L('نئی معرفت محفوظ ہو گئی', 'Marfat saved'))
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
      await marfatApi.remove(id)
      if (editingId === id) await resetForm()
      toast.message(L('معرفت حذف', 'Marfat removed'))
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
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className={cn('text-lg font-bold', lang === 'ur' && 'font-urdu text-xl')}>
              {L('نیو معرفت', 'New Marfat')}
            </h1>
            <p className="text-[11px] text-sky-100/90" dir="ltr">
              {loading ? '…' : `${rows.length} records`}
            </p>
          </div>
        </div>
        <MandiHomeLink lang={lang} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <form onSubmit={onSave} className="shrink-0 rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={cn('text-base font-bold text-[#0d5f86]', lang === 'ur' && 'font-urdu text-lg')}>
              {editingId ? L('معرفت ترمیم', 'Edit Marfat') : L('ایڈ نیو معرفت', 'Add New Marfat')}
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[6.5rem_minmax(10rem,1.2fr)_minmax(10rem,1.2fr)] xl:grid-cols-[6.5rem_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(12rem,1.2fr)]">
            <Field label={L('بزگر #', 'Broker #')}>
              <input
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                className="mandi-input mandi-code"
                dir="ltr"
              />
            </Field>

            <Field label={L('نام زمیندار (اردو)', 'Landowner (Urdu)')}>
              <MandiUrduInput
                value={form.landownerUr}
                onChange={(v) => setField('landownerUr', v)}
                placeholder={L('زمیندار / haji aslam', 'Landowner / haji aslam')}
              />
            </Field>

            <Field label={L('نام زمیندار (انگریزی)', 'Landowner (English)')}>
              <input
                value={form.landownerEn}
                onChange={(e) => setField('landownerEn', e.target.value)}
                className="mandi-input"
                placeholder="Landowner name"
                dir="ltr"
              />
            </Field>

            <Field label={L('معرفت (اردو)', 'Marfat (Urdu)')} className="sm:col-span-2 xl:col-span-1">
              <MandiUrduInput
                value={form.marfatUr}
                onChange={(v) => setField('marfatUr', v)}
                placeholder={L('معرفت / shifa commission', 'Marfat / shifa commission')}
              />
            </Field>

            <Field label={L('معرفت (انگریزی)', 'Marfat (English)')} className="sm:col-span-2 xl:col-span-1">
              <input
                value={form.marfatEn}
                onChange={(e) => setField('marfatEn', e.target.value)}
                className="mandi-input"
                placeholder="Marfat / agency"
                dir="ltr"
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
                'inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#e11d48] px-5 text-sm font-bold leading-none text-white shadow hover:bg-[#be123c]',
                lang === 'ur' && 'font-urdu'
              )}
            >
              <Save className="h-4 w-4" />
              {L('محفوظ کریں', 'Save')}
            </button>
          </div>
        </form>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className={cn('text-sm font-bold text-slate-700', lang === 'ur' && 'font-urdu')}>
              {L('معرفت لسٹ', 'Marfat list')}
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
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0d5f86] text-white">
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('کوڈ', 'Code')}</th>
                  <th className="px-3 py-2.5 text-start text-xs font-bold">{L('نام زمیندار', 'Landowner')}</th>
                  <th className="px-3 py-2.5 text-start text-xs font-bold">{L('معرفت', 'Marfat')}</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold">{L('ایکشن', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className={cn('px-3 py-12 text-center text-slate-400', lang === 'ur' && 'font-urdu')}
                    >
                      {loading ? L('لوڈ ہو رہا ہے…', 'Loading…') : L('کوئی ریکارڈ نہیں', 'No records')}
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
                        <div className='flex items-center gap-10'>
                        <p className={cn('font-semibold text-slate-900', lang === 'ur' && 'font-urdu')}>
                          {lang === 'ur' ? r.landownerUr : r.landownerEn}
                        </p>
                        <p className="text-[11px] text-slate-500" dir="ltr">
                          {lang === 'ur' ? r.landownerEn : r.landownerUr}
                        </p>
                        </div>
                        
                      </td>
                      <td className="px-3 py-2.5">
                        <div className='flex items-center gap-10'>
                        <p className={cn('font-semibold text-slate-900', lang === 'ur' && 'font-urdu')}>
                          {lang === 'ur' ? r.marfatUr : r.marfatEn}
                        </p>
                        <p className="text-[11px] text-slate-500" dir="ltr">
                          {lang === 'ur' ? r.marfatEn : r.marfatUr}
                        </p>
                        </div>
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
