import { parseDisplayDate } from '@/components/mandi/MandiDatePicker'
import type { LedgerEntry, Party, Voucher } from '@/lib/types'
import { partyDisplayName } from '@/lib/party'

export interface BookLine {
  id: string
  detailUr: string
  detailEn: string
  amount: number
  muted?: boolean
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function voucherDate(v: Voucher): Date | null {
  return parseDisplayDate(String(v.date || '').replace(/-/g, '/'))
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isBeforeDay(a: Date, day: Date) {
  return startOfDay(a).getTime() < startOfDay(day).getTime()
}

function voucherLabel(v: Voucher, lang: 'en' | 'ur') {
  const name =
    v.partyName ||
    (typeof v.party === 'object' && v.party ? partyDisplayName(v.party, lang) : '') ||
    v.partyCode ||
    ''
  const detail = v.details?.trim()
  if (name && detail) return `${name} — ${detail}`
  return name || detail || v.invoice || '—'
}

function typeLabel(type: Voucher['type']): { ur: string; en: string } {
  if (type === 'recovery') return { ur: 'اگراہی', en: 'Recovery' }
  if (type === 'credit') return { ur: 'جمع', en: 'Credit' }
  return { ur: 'بنام', en: 'Debit' }
}

/** Net cash movement of a voucher: +in / −out */
export function voucherCashDelta(v: Voucher) {
  const amt = Number(v.amount) || 0
  if (v.type === 'debit') return -amt
  return amt // credit + recovery = cash in
}

/** Previous cash before `day` from all vouchers */
export function previousCash(vouchers: Voucher[], day: Date) {
  let sum = 0
  for (const v of vouchers) {
    const d = voucherDate(v)
    if (!d || !isBeforeDay(d, day)) continue
    sum += voucherCashDelta(v)
  }
  return sum
}

/** Cash book / Roznamcha lines for one day */
export function buildDayBookFromVouchers(
  vouchers: Voucher[],
  day: Date,
  lang: 'en' | 'ur' = 'ur'
): { credit: BookLine[]; debit: BookLine[] } {
  const dayRows = vouchers.filter((v) => {
    const d = voucherDate(v)
    return d && isSameDay(d, day)
  })

  const prev = previousCash(vouchers, day)
  const credit: BookLine[] = [
    {
      id: 'prev-cash',
      detailUr: 'سابقہ کیش',
      detailEn: 'Previous Cash',
      amount: prev,
    },
  ]
  const debit: BookLine[] = []

  for (const v of dayRows) {
    const label = voucherLabel(v, lang)
    const type = typeLabel(v.type)
    const detailUr = `${type.ur} ${label}`.trim()
    const detailEn = `${type.en} ${label}`.trim()
    const amt = Number(v.amount) || 0
    if (v.type === 'debit') {
      debit.push({ id: v._id, detailUr, detailEn, amount: amt })
    } else {
      credit.push({ id: v._id, detailUr, detailEn, amount: amt })
    }
  }

  return { credit, debit }
}

export type BalLine = {
  id: string
  code?: string
  nameUr: string
  nameEn: string
  cityUr?: string
  cityEn?: string
  amount: number
}

export type BalSection = {
  key: string
  titleUr: string
  titleEn: string
  credit: BalLine[]
  debit: BalLine[]
}

/** Parse ledger/voucher date (DD/MM/YYYY or DD-MM-YYYY) */
export function parseBookDate(raw: string): Date | null {
  return parseDisplayDate(String(raw || '').replace(/-/g, '/'))
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export type PartyAsOfTotals = {
  debit: number
  credit: number
  /** debit − credit (positive = بنام, negative = جمع) */
  balance: number
}

/**
 * Gross بنام / جمع totals as of `asOf` (inclusive).
 * Matches backend /ledger/party opening rules.
 */
export function totalsAsOfDate(
  entries: Pick<LedgerEntry, 'date' | 'debit' | 'credit' | 'source'>[],
  asOf: Date,
  openingDebit = 0,
  openingCredit = 0
): PartyAsOfTotals {
  const cutoff = endOfDay(asOf)
  const upTo = entries.filter((e) => {
    const d = parseBookDate(e.date)
    return d != null && d.getTime() <= cutoff.getTime()
  })
  const hasOpening = upTo.some((e) => e.source === 'opening')
  let debit = hasOpening ? 0 : Number(openingDebit || 0)
  let credit = hasOpening ? 0 : Number(openingCredit || 0)
  for (const e of upTo) {
    debit += Number(e.debit || 0)
    credit += Number(e.credit || 0)
  }
  return { debit, credit, balance: debit - credit }
}

export function balanceAsOfDate(
  entries: Pick<LedgerEntry, 'date' | 'debit' | 'credit' | 'source'>[],
  asOf: Date,
  openingDebit = 0,
  openingCredit = 0
): number {
  return totalsAsOfDate(entries, asOf, openingDebit, openingCredit).balance
}

export type PartyWithAsOf = Party & { debitTotal: number; creditTotal: number }

/** Apply as-of debit/credit/balance onto parties from a flat ledger list */
export function partiesBalancedAsOf(
  parties: Party[],
  entries: LedgerEntry[],
  asOf: Date
): PartyWithAsOf[] {
  const byParty = new Map<string, LedgerEntry[]>()
  for (const e of entries) {
    const id =
      typeof e.party === 'object' && e.party && '_id' in e.party
        ? String(e.party._id)
        : String(e.party || '')
    if (!id) continue
    const list = byParty.get(id)
    if (list) list.push(e)
    else byParty.set(id, [e])
  }

  return parties.map((p) => {
    const t = totalsAsOfDate(byParty.get(p._id) || [], asOf, p.openingDebit, p.openingCredit)
    return {
      ...p,
      balance: t.balance,
      debitTotal: t.debit,
      creditTotal: t.credit,
    }
  })
}

/**
 * Mandi balance-sheet buckets:
 * - اگراہی = گاہک (customer) — recovery / receivable side
 * - خرچہ = expense
 * - بیوپاری = trader
 * - سٹور = supplier / cash / other
 */
function sectionForParty(p: Party): string {
  const label = (p.accountTypeLabel || '').trim()
  if (label.includes('گاہک') || p.accountType === 'customer') return 'agrahi'
  if (label.includes('خرچہ') || p.accountType === 'expense') return 'expense'
  if (label.includes('بیوپاری') || p.accountType === 'trader') return 'trader'
  if (label.includes('سپلائر') || p.accountType === 'supplier') return 'store'
  if (p.accountType === 'cash') return 'store'
  return 'store'
}

/**
 * Balance sheet: show gross بنام and جمع separately (same party can appear on both sides).
 * So saved بنام vouchers appear under بنام, not only the net closing balance.
 */
export function buildBalanceSections(parties: PartyWithAsOf[] | Party[]): BalSection[] {
  const buckets: Record<string, BalSection> = {
    agrahi: {
      key: 'agrahi',
      titleUr: 'اگراہی (گاہک کھاتہ)',
      titleEn: 'Agrahi (Customer A/c)',
      credit: [],
      debit: [],
    },
    expense: {
      key: 'expense',
      titleUr: 'خرچہ کھاتہ',
      titleEn: 'Expense Account',
      credit: [],
      debit: [],
    },
    trader: {
      key: 'trader',
      titleUr: 'بیوپاری کھاتہ',
      titleEn: 'Trader Account',
      credit: [],
      debit: [],
    },
    store: {
      key: 'store',
      titleUr: 'سٹور / سپلائر کھاتہ',
      titleEn: 'Store / Supplier A/c',
      credit: [],
      debit: [],
    },
  }

  for (const p of parties) {
    if (p.isActive === false) continue
    const withTotals = p as PartyWithAsOf
    const debitAmt =
      withTotals.debitTotal != null
        ? Number(withTotals.debitTotal) || 0
        : Math.max(0, Number(p.balance) || 0)
    const creditAmt =
      withTotals.creditTotal != null
        ? Number(withTotals.creditTotal) || 0
        : Math.max(0, -(Number(p.balance) || 0))
    if (debitAmt === 0 && creditAmt === 0) continue

    const key = sectionForParty(p)
    const base = {
      code: p.code,
      nameUr: p.nameUr || p.nameEn || p.code,
      nameEn: p.nameEn || p.nameUr || p.code,
      cityUr: p.address || '—',
      cityEn: p.address || '—',
    }
    if (creditAmt > 0) {
      buckets[key].credit.push({ id: `${p._id}-c`, ...base, amount: creditAmt })
    }
    if (debitAmt > 0) {
      buckets[key].debit.push({ id: `${p._id}-d`, ...base, amount: debitAmt })
    }
  }

  for (const s of Object.values(buckets)) {
    s.credit.sort((a, b) => a.nameUr.localeCompare(b.nameUr, 'ur'))
    s.debit.sort((a, b) => a.nameUr.localeCompare(b.nameUr, 'ur'))
  }

  return [buckets.agrahi, buckets.expense, buckets.trader, buckets.store]
}
