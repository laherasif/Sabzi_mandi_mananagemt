import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Printer, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiClientError } from '@/lib/api'
import { ledgerApi, partiesApi } from '@/lib/mandiApi'
import {
  buildBalanceSections,
  partiesBalancedAsOf,
  type BalSection,
} from '@/lib/dayBooks'
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

type AccountType = 'all' | 'agrahi' | 'expense' | 'trader' | 'store'

const SHOP_TITLE_UR = 'چوہدری محمد اسلم، محمد عرفان (سبزی فروٹ کمیشن ایجنٹ)'
const SHOP_TITLE_EN = 'Ch. M. Aslam, M. Irfan (Sabzi Fruit Commission Agent)'

const ACCOUNT_TYPES: { value: AccountType; ur: string; en: string }[] = [
  { value: 'all', ur: 'تمام', en: 'All' },
  { value: 'agrahi', ur: 'اگراہی (گاہک)', en: 'Agrahi (Customer)' },
  { value: 'expense', ur: 'خرچہ کھاتہ', en: 'Expense A/c' },
  { value: 'trader', ur: 'بیوپاری کھاتہ', en: 'Trader A/c' },
  { value: 'store', ur: 'سٹور / سپلائر', en: 'Store / Supplier' },
]

function formatRs(n: number) {
  const abs = Math.abs(n)
  const formatted = new Intl.NumberFormat('en-PK').format(abs)
  return n < 0 ? `-${formatted}` : formatted
}

function emptySections(): BalSection[] {
  return [
    {
      key: 'agrahi',
      titleUr: 'اگراہی (گاہک کھاتہ)',
      titleEn: 'Agrahi (Customer A/c)',
      credit: [],
      debit: [],
    },
    { key: 'expense', titleUr: 'خرچہ کھاتہ', titleEn: 'Expense Account', credit: [], debit: [] },
    { key: 'trader', titleUr: 'بیوپاری کھاتہ', titleEn: 'Trader Account', credit: [], debit: [] },
    {
      key: 'store',
      titleUr: 'سٹور / سپلائر کھاتہ',
      titleEn: 'Store / Supplier A/c',
      credit: [],
      debit: [],
    },
  ]
}

/** بیلنس شیٹ — Balance Sheet */
export function BalanceSheetPage() {
  const { lang } = useOutletContext<Ctx>()
  const L = (ur: string, en: string) => (lang === 'ur' ? ur : en)

  const [accountType, setAccountType] = useState<AccountType>('all')
  const [date, setDate] = useState(() => formatDisplayDate(new Date()))
  const [opened, setOpened] = useState(false)
  const [sheetDate, setSheetDate] = useState(() => formatDisplayDate(new Date()))
  const [allSections, setAllSections] = useState<BalSection[]>(() => emptySections())
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const loadGen = useRef(0)
  const langRef = useRef(lang)
  langRef.current = lang

  const sections = useMemo(() => {
    if (accountType === 'all') return allSections
    return allSections.filter((s) => s.key === accountType)
  }, [accountType, allSections])

  const hasRows = useMemo(
    () => sections.some((s) => s.credit.length > 0 || s.debit.length > 0),
    [sections]
  )

  const totals = useMemo(() => {
    let credit = 0
    let debit = 0
    for (const s of sections) {
      credit += s.credit.reduce((a, r) => a + r.amount, 0)
      debit += s.debit.reduce((a, r) => a + r.amount, 0)
    }
    const diff = Math.abs(debit - credit)
    return { credit, debit, diff, sectionCredit: credit, sectionDebit: debit }
  }, [sections])

  const displayDate = (() => {
    const p = parseDisplayDate(opened ? sheetDate : date)
    return p ? formatDashDate(p) : (opened ? sheetDate : date).replaceAll('/', '-')
  })()

  const loadSheet = async (dateStr: string, opts?: { silent?: boolean }) => {
    const t = (ur: string, en: string) => (langRef.current === 'ur' ? ur : en)
    const asOf = parseDisplayDate(dateStr)
    if (!asOf) {
      if (!opts?.silent) toast.error(t('تاریخ درست نہیں', 'Invalid date'))
      return
    }
    asOf.setHours(0, 0, 0, 0)
    const gen = ++loadGen.current
    setLoading(true)
    try {
      const [parties, entries] = await Promise.all([
        partiesApi.list(),
        ledgerApi.list({ to: dateStr }),
      ])
      if (gen !== loadGen.current) return
      const live = partiesBalancedAsOf(parties, entries, asOf)
      setAllSections(buildBalanceSections(live))
      setSheetDate(dateStr)
      setOpened(true)
      if (!opts?.silent) toast.success(t('بیلنس شیٹ کھل گئی', 'Balance sheet opened'))
    } catch (e) {
      if (gen !== loadGen.current) return
      toast.error(e instanceof ApiClientError ? e.message : t('لوڈ ناکام', 'Load failed'))
    } finally {
      if (gen === loadGen.current) setLoading(false)
    }
  }

  // API only when تاریخ changes (کھاتہ قسم is client-side filter — no refetch)
  useEffect(() => {
    if (!opened) return
    const t = window.setTimeout(() => {
      void loadSheet(date, { silent: true })
    }, 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: date-only reload
  }, [date])

  const accountLabel =
    ACCOUNT_TYPES.find((t) => t.value === accountType)?.[lang === 'ur' ? 'ur' : 'en'] || 'All'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf4]">
      <MandiPageHeader
        lang={lang}
        titleUr="چیک کریں بیلنس شیٹ"
        titleEn="Check Balance Sheet"
        subtitle={`${L('بتاریخ', 'As of')} ${displayDate} · ${accountLabel}`}
        icon={Scale}
        toolbar={
          <>
            <label className="block">
              <span className={cn('mandi-label text-sm text-slate-700', lang === 'ur' && 'font-urdu')}>
                {L('کھاتہ قسم', 'Account Type')}
              </span>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className={cn(
                  'h-10 min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200',
                  lang === 'ur' && 'font-urdu'
                )}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {L(t.ur, t.en)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block w-[11.5rem]">
              <span className={cn('mandi-label text-sm text-slate-700', lang === 'ur' && 'font-urdu')}>
                {L('تاریخ', 'Date')}
              </span>
              <MandiDatePicker value={date} onChange={setDate} lang={lang} className="w-full" />
            </label>

            <button
              type="button"
              onClick={() => void loadSheet(date)}
              disabled={loading}
              className={cn(
                'inline-flex h-10 items-center justify-center self-end rounded-lg border border-[#0d5f86] bg-white px-5 text-sm font-bold leading-none text-[#0d5f86] shadow-sm hover:bg-sky-50 disabled:opacity-60',
                lang === 'ur' && 'font-urdu'
              )}
            >
              {loading ? L('لوڈ…', 'Load…') : L('بیلنس شیٹ', 'Balance Sheet')}
            </button>
          </>
        }
      />

      {/* Body — full sheet height; only this outer area scrolls */}
      <div className="min-h-0 flex-1 overflow-auto p-3 print:overflow-visible print:p-0">
        {!opened ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-[#9ec4d8] bg-[#cfe6f2] text-sm text-[#0d5f86]/80 shadow-inner">
            <span className={lang === 'ur' ? 'font-urdu text-base' : ''}>
              {L('کھاتہ قسم / تاریخ چن کر بیلنس شیٹ دبائیں', 'Select type & date, then open Balance Sheet')}
            </span>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl rounded border border-slate-400 bg-white shadow-sm print:max-w-none print:border-0 print:shadow-none">
            <SheetToolbar
              lang={lang}
              L={L}
              displayDate={displayDate}
              onExpand={() => setExpanded(true)}
            />
            <SheetReportBody
              lang={lang}
              L={L}
              sections={sections}
              hasRows={hasRows}
              accountLabel={accountLabel}
              totals={totals}
            />
          </div>
        )}
      </div>

      <MandiExpandModal
        open={expanded && opened}
        onClose={() => setExpanded(false)}
        lang={lang}
        titleUr="بیلنس شیٹ — مکمل دیکھیں"
        titleEn="Balance Sheet — Full View"
        subtitle={`${displayDate} · ${accountLabel}`}
      >
        <div className="mx-auto max-w-7xl rounded border border-slate-400 bg-white shadow-lg">
          <SheetReportBody
            lang={lang}
            L={L}
            sections={sections}
            hasRows={hasRows}
            accountLabel={accountLabel}
            totals={totals}
            spacious
          />
        </div>
      </MandiExpandModal>
    </div>
  )
}

function SheetToolbar({
  lang,
  L,
  displayDate,
  onExpand,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  displayDate: string
  onExpand: () => void
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 print:hidden"
      dir={lang === 'ur' ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className={cn(
            'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold leading-none text-white shadow-sm hover:bg-emerald-700',
            lang === 'ur' && 'font-urdu'
          )}
        >
          <Printer className="h-3.5 w-3.5" />
          {L('پرنٹ آؤٹ', 'Print Out')}
        </button>
        <MandiExpandButton lang={lang} onClick={onExpand} />
      </div>
      <p className="text-sm font-semibold tabular-nums text-slate-800" dir="ltr">
        {displayDate}
      </p>
    </div>
  )
}

function SheetReportBody({
  lang,
  L,
  sections,
  hasRows,
  accountLabel,
  totals,
  spacious,
}: {
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
  sections: BalSection[]
  hasRows: boolean
  accountLabel: string
  totals: { credit: number; debit: number; diff: number }
  spacious?: boolean
}) {
  return (
    <div className={cn(spacious ? 'p-6 sm:p-8' : 'p-4')}>
      <div className="mb-4 border-4 border-double border-slate-900 px-3 py-3 text-center">
        <h2
          className={cn(
            'font-bold text-slate-900',
            spacious ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
            lang === 'ur' && 'font-urdu'
          )}
        >
          {lang === 'ur' ? SHOP_TITLE_UR : SHOP_TITLE_EN}
        </h2>
      </div>

      <div className={cn('space-y-4', spacious && 'space-y-5')} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <table
          className={cn(
            'w-full border-collapse border border-slate-900',
            spacious ? 'text-[13px]' : 'text-[12px]'
          )}
        >
          <thead>
            <tr className="bg-slate-50">
              <th
                className={cn(
                  'border border-slate-900 px-2 py-1.5',
                  lang === 'ur' ? 'text-right font-urdu' : 'text-left'
                )}
              >
                {L('تفصیل پارٹی', 'Party')}
              </th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">{L('جمع', 'Credit')}</th>
              <th
                className={cn(
                  'border border-slate-900 px-2 py-1.5',
                  lang === 'ur' ? 'text-right font-urdu' : 'text-left'
                )}
              >
                {L('تفصیل پارٹی', 'Party')}
              </th>
              <th className="border border-slate-900 px-2 py-1.5 text-center">{L('بنام', 'Debit')}</th>
            </tr>
          </thead>
        </table>

        {sections.map((section) => (
          <SectionBlock key={section.key} section={section} lang={lang} L={L} />
        ))}

        {!hasRows && (
          <p
            className={cn(
              'rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600',
              lang === 'ur' && 'font-urdu'
            )}
          >
            {L(
              `${accountLabel} — اس تاریخ پر کوئی بیلنس نہیں`,
              `${accountLabel} — no balances as of this date`
            )}
          </p>
        )}

        <div className="grid gap-2 border border-slate-900 bg-slate-50 p-3 text-sm font-bold sm:grid-cols-3">
          <div className={lang === 'ur' ? 'text-right' : 'text-center'}>
            <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('کل جمع رقم', 'Total Credit')}</span>
            <p className="mt-1 tabular-nums text-emerald-800" dir="ltr">
              {formatRs(totals.credit)}
            </p>
          </div>
          <div className={lang === 'ur' ? 'text-right' : 'text-center'}>
            <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('فرق رقم', 'Difference')}</span>
            <p className="mt-1 tabular-nums text-sky-900" dir="ltr">
              {formatRs(totals.diff)}
            </p>
          </div>
          <div className={lang === 'ur' ? 'text-right' : 'text-center'}>
            <span className={lang === 'ur' ? 'font-urdu' : ''}>{L('کل بنام رقم', 'Total Debit')}</span>
            <p className="mt-1 tabular-nums text-orange-800" dir="ltr">
              {formatRs(totals.debit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionBlock({
  section,
  lang,
  L,
}: {
  section: BalSection
  lang: 'en' | 'ur'
  L: (ur: string, en: string) => string
}) {
  const creditTotal = section.credit.reduce((s, r) => s + r.amount, 0)
  const debitTotal = section.debit.reduce((s, r) => s + r.amount, 0)
  const rows = Math.max(section.credit.length, section.debit.length, 1)
  const detailed =
    section.key === 'agrahi' ||
    section.key === 'expense' ||
    section.key === 'trader' ||
    section.key === 'store'
  const urAlign = lang === 'ur' ? 'text-right' : 'text-left'

  return (
    <div>
      <div className={cn('mb-1 border-2 border-red-600 bg-red-50 px-3 py-1.5', urAlign)}>
        <span className={cn('text-sm font-bold text-red-800', lang === 'ur' && 'font-urdu')}>
          {L(section.titleUr, section.titleEn)}
        </span>
      </div>

      <table className="w-full border-collapse border border-slate-900 text-[13px]">
        {detailed && (
          <thead>
            <tr className="bg-slate-100">
              <th className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}>
                {L('تفصیل پارٹی کھاتہ', 'Party A/c')}
              </th>
              <th className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}>
                {L('شہر', 'City')}
              </th>
              <th className="border border-slate-900 px-2.5 py-2 text-center">{L('جمع', 'Credit')}</th>
              <th className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}>
                {L('تفصیل پارٹی', 'Party')}
              </th>
              <th className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}>
                {L('شہر', 'City')}
              </th>
              <th className="border border-slate-900 px-2.5 py-2 text-center">{L('بنام', 'Debit')}</th>
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const c = section.credit[i]
            const d = section.debit[i]
            return (
              <tr key={i} className="odd:bg-white even:bg-slate-50">
                <TdName name={c ? L(c.nameUr, c.nameEn) : ''} urdu={lang === 'ur'} />
                <td
                  className={cn(
                    'border border-slate-900 px-2.5 py-2 text-slate-600',
                    urAlign,
                    lang === 'ur' && 'font-urdu'
                  )}
                >
                  {c ? L(c.cityUr || '—', c.cityEn || '—') : ''}
                </td>
                <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                  {c ? formatRs(c.amount) : ''}
                </td>
                <TdName name={d ? L(d.nameUr, d.nameEn) : ''} urdu={lang === 'ur'} />
                <td
                  className={cn(
                    'border border-slate-900 px-2.5 py-2 text-slate-600',
                    urAlign,
                    lang === 'ur' && 'font-urdu'
                  )}
                >
                  {d ? L(d.cityUr || '—', d.cityEn || '—') : ''}
                </td>
                <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                  {d ? formatRs(d.amount) : ''}
                </td>
              </tr>
            )
          })}

          {(section.credit.length > 0 || section.debit.length > 0) && (
            <tr className="bg-slate-100 font-bold">
              <td
                className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}
                colSpan={2}
              >
                {L('کل رقم', 'Total')}
              </td>
              <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                {formatRs(creditTotal)}
              </td>
              <td
                className={cn('border border-slate-900 px-2.5 py-2', urAlign, lang === 'ur' && 'font-urdu')}
                colSpan={2}
              >
                {L('کل رقم', 'Total')}
              </td>
              <td className="border border-slate-900 px-2.5 py-2 text-center tabular-nums" dir="ltr">
                {formatRs(debitTotal)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TdName({ name, urdu }: { name: string; urdu?: boolean }) {
  return (
    <td
      className={cn(
        'border border-slate-900 px-2.5 py-2 text-sky-800 leading-snug',
        urdu ? 'text-right font-urdu' : 'text-left'
      )}
    >
      {name}
    </td>
  )
}
