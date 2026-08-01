import { cn } from '@/lib/utils'
import {
  SHOP_ADDRESS_EN,
  SHOP_ADDRESS_UR,
  SHOP_CONTACTS,
  SHOP_LANDLINE,
  SHOP_NAME_EN,
  SHOP_NAME_UR,
  SHOP_TAGLINE_EN,
  SHOP_TAGLINE_UR,
} from '@/lib/shopInfo'

export interface BillLine {
  pieces: number
  itemUr: string
  itemEn: string
  rate: number
  amount: number
}

export interface BillExpenses {
  fare: number
  commission: number
  labor: number
  misc: number
  munshiana: number
}

export interface PrintableBill {
  id: string
  billNo: string
  date: string
  vehicle: string
  customerUr: string
  customerEn: string
  marka: string
  totalBags: number
  partyCode: string
  marfatUr: string
  marfatEn: string
  lines: BillLine[]
  expenses: BillExpenses
}

function formatRs(n: number) {
  return new Intl.NumberFormat('en-PK').format(Math.round(n))
}

function expenseTotal(e: BillExpenses) {
  return e.fare + e.commission + e.labor + e.misc + e.munshiana
}

/** Professional Mandi sale bill — screen + print/PDF */
export function BillPrintDocument({
  bill,
  lang,
  className,
}: {
  bill: PrintableBill
  lang: 'en' | 'ur'
  className?: string
}) {
  const ur = lang === 'ur'
  const gross = bill.lines.reduce((s, r) => s + r.amount, 0)
  const expense = expenseTotal(bill.expenses)
  const net = gross - expense
  const piecesSum = bill.lines.reduce((s, r) => s + r.pieces, 0)

  const expenseRows = [
    { ur: 'کرایہ', en: 'Fare', value: bill.expenses.fare },
    { ur: 'کمیشن', en: 'Commission', value: bill.expenses.commission },
    { ur: 'مزدوری', en: 'Labor', value: bill.expenses.labor },
    { ur: 'متفرقہ خرچہ', en: 'Misc.', value: bill.expenses.misc },
    { ur: 'منشیانہ', en: 'Munshiana', value: bill.expenses.munshiana },
  ]

  return (
    <article
      className={cn(
        'bill-sheet break-inside-avoid rounded-lg border border-slate-300 bg-white text-slate-900 shadow-sm print:rounded-none print:border-slate-400 print:shadow-none',
        className
      )}
      dir={ur ? 'rtl' : 'ltr'}
    >
      {/* Letterhead */}
      <header className="overflow-hidden rounded-t-lg print:rounded-none">
        <div className="flex items-stretch gap-0 bg-gradient-to-l from-[#0b4f73] via-[#1278a8] to-[#1a8fc4]">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5 text-white">
            <h2
              className={cn(
                'text-lg font-black leading-tight tracking-tight sm:text-xl',
                ur && 'font-urdu text-2xl'
              )}
            >
              {ur ? SHOP_NAME_UR : SHOP_NAME_EN}
            </h2>
            <p className={cn('mt-0.5 text-xs text-sky-100', ur && 'font-urdu text-sm')}>
              {ur ? SHOP_TAGLINE_UR : SHOP_TAGLINE_EN}
            </p>
          </div>
          <div className="relative flex w-[88px] shrink-0 items-center justify-center bg-gradient-to-br from-emerald-600 via-lime-500 to-amber-400 sm:w-[110px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-red-600 to-red-800 text-sm font-black text-white shadow-lg">
              MAI
            </div>
          </div>
        </div>

        <div className="bg-[#6b21a8] px-3 py-1.5 text-center text-[11px] font-semibold text-white sm:text-xs">
          <span className={ur ? 'font-urdu' : ''} dir={ur ? 'rtl' : 'ltr'}>
            {ur ? SHOP_ADDRESS_UR : SHOP_ADDRESS_EN}
          </span>
          <span className="mx-2 opacity-70">|</span>
          <span dir="ltr">{SHOP_LANDLINE}</span>
        </div>

        <div className="grid grid-cols-2 text-[10px] text-white sm:grid-cols-4 sm:text-[11px]">
          {SHOP_CONTACTS.map((c, i) => (
            <div
              key={`${c.phone}-${i}`}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                i % 2 === 0 ? 'bg-[#0d5f86]' : 'bg-[#b91c1c]'
              )}
            >
              <span className={cn('font-semibold leading-tight', ur && 'font-urdu')} dir={ur ? 'rtl' : 'ltr'}>
                {ur ? c.nameUr : c.nameEn}
              </span>
              <span className="font-bold tabular-nums" dir="ltr">
                {c.phone}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Meta */}
      <div className="grid gap-2 border-b border-slate-200 px-3 py-2.5 text-xs sm:grid-cols-3">
        <Meta
          label={ur ? 'تاریخ' : 'Date'}
          value={bill.date}
          urdu={ur}
          dir="ltr"
        />
        <Meta
          label={ur ? 'محترمی جناب' : 'Customer'}
          value={ur ? bill.customerUr : bill.customerEn}
          urdu={ur}
        />
        <Meta label={ur ? 'بل نمبر' : 'Bill No'} value={bill.billNo} urdu={ur} dir="ltr" bold />
        <Meta label={ur ? 'گاڑی نمبر' : 'Vehicle'} value={bill.vehicle} urdu={ur} dir="ltr" />
        <Meta label={ur ? 'ٹریڈ مارکہ' : 'Marka'} value={bill.marka} urdu={ur} dir="ltr" />
        <Meta
          label={ur ? 'ٹوٹل بیگ' : 'Total bags'}
          value={String(bill.totalBags)}
          urdu={ur}
          dir="ltr"
          bold
        />
      </div>

      {/* Tables */}
      <div className="grid gap-2 p-2.5 sm:grid-cols-2">
        {/* Items — primary */}
        <div className="overflow-hidden rounded border border-slate-300">
          <table className="w-full border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th className={cn('border border-slate-300 px-1.5 py-1.5 font-bold', ur && 'font-urdu')}>
                  {ur ? 'نگ' : 'Pcs'}
                </th>
                <th className={cn('border border-slate-300 px-1.5 py-1.5 font-bold', ur && 'font-urdu')}>
                  {ur ? 'جنس' : 'Item'}
                </th>
                <th className={cn('border border-slate-300 px-1.5 py-1.5 font-bold', ur && 'font-urdu')}>
                  {ur ? 'ریٹ' : 'Rate'}
                </th>
                <th className={cn('border border-slate-300 px-1.5 py-1.5 font-bold', ur && 'font-urdu')}>
                  {ur ? 'رقم' : 'Amount'}
                </th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((line, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 px-1.5 py-1 text-center tabular-nums" dir="ltr">
                    {line.pieces}
                  </td>
                  <td className={cn('border border-slate-300 px-1.5 py-1', ur && 'font-urdu')}>
                    {ur ? line.itemUr : line.itemEn}
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center tabular-nums" dir="ltr">
                    {formatRs(line.rate)}
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-semibold tabular-nums" dir="ltr">
                    {formatRs(line.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-amber-200 font-bold">
                <td className="border border-slate-300 px-1.5 py-1.5 text-center tabular-nums" dir="ltr">
                  {piecesSum}
                </td>
                <td className={cn('border border-slate-300 px-1.5 py-1.5 text-center', ur && 'font-urdu')}>
                  {ur ? 'کل' : 'Total'}
                </td>
                <td className="border border-slate-300 px-1.5 py-1.5" />
                <td className="border border-slate-300 px-1.5 py-1.5 text-center tabular-nums" dir="ltr">
                  {formatRs(gross)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expenses */}
        <div className="overflow-hidden rounded border border-slate-300">
          <table className="w-full border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-200">
                <th
                  colSpan={2}
                  className={cn('border border-slate-300 px-1.5 py-1.5 text-center font-bold', ur && 'font-urdu')}
                >
                  {ur ? 'خرچہ تفصیل' : 'Expense detail'}
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseRows.map((row) => (
                <tr key={row.en} className="odd:bg-white even:bg-slate-50">
                  <td className={cn('border border-slate-300 px-2 py-1.5 font-semibold', ur && 'font-urdu')}>
                    {ur ? row.ur : row.en}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums" dir="ltr">
                    {formatRs(row.value)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-300 font-bold">
                <td className={cn('border border-slate-300 px-2 py-1.5', ur && 'font-urdu')}>
                  {ur ? 'کل خرچہ' : 'Total expense'}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums" dir="ltr">
                  {formatRs(expense)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1.5 px-2.5 pb-3">
        <SummaryRow label={ur ? 'خام رقم' : 'Gross amount'} value={formatRs(gross)} urdu={ur} />
        <SummaryRow label={ur ? 'کل خرچہ' : 'Total expense'} value={formatRs(expense)} urdu={ur} />
        <SummaryRow label={ur ? 'صافی رقم' : 'Net amount'} value={formatRs(net)} urdu={ur} emphasize />
      </div>
    </article>
  )
}

function Meta({
  label,
  value,
  urdu,
  dir,
  bold,
}: {
  label: string
  value: string
  urdu?: boolean
  dir?: 'ltr' | 'rtl'
  bold?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
      <span className={cn('shrink-0 text-[10px] font-bold text-slate-500', urdu && 'font-urdu')}>{label}</span>
      <span
        className={cn('truncate text-xs font-semibold text-slate-900', bold && 'text-sm font-bold', urdu && 'font-urdu')}
        dir={dir}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  urdu,
  emphasize,
}: {
  label: string
  value: string
  urdu?: boolean
  emphasize?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-bold',
        emphasize && 'border-[#0d5f86] bg-sky-50 text-[#0d5f86]'
      )}
    >
      <span className={urdu ? 'font-urdu' : ''}>{label}</span>
      <span className="tabular-nums" dir="ltr">
        {value}
      </span>
    </div>
  )
}
