import { Router } from 'express'
import { LedgerEntry } from '../models/LedgerEntry'
import { Party } from '../models/Party'
import { Product } from '../models/Product'
import { SaleBill } from '../models/SaleBill'
import { PurchaseBill } from '../models/PurchaseBill'
import { Voucher } from '../models/Voucher'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok } from '../utils/response'

export const ledgerRouter = Router()

ledgerRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const partyId = String(req.query.party || '').trim()
    const code = String(req.query.code || '').trim()
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()

    const filter: Record<string, unknown> = {}
    if (partyId) filter.party = partyId
    if (code) filter.partyCode = code
    // Dates are DD/MM/YYYY strings — filter in memory (do not pass date:{} to Mongo)

    let rows = await LedgerEntry.find(filter).sort({ createdAt: 1 }).populate('party').lean()

    if (from || to) {
      const parse = (d: string) => {
        const m = String(d || '').match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
        if (!m) return 0
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime()
      }
      const fromT = from ? parse(from) : 0
      const toT = to ? parse(to) : Number.MAX_SAFE_INTEGER
      rows = rows.filter((r) => {
        const t = parse(r.date)
        return t >= fromT && t <= toT
      })
    }

    let running = 0
    const withBalance = rows.map((r) => {
      running += Number(r.debit || 0) - Number(r.credit || 0)
      return { ...r, balance: running }
    })

    return ok(res, withBalance)
  })
)

ledgerRouter.get(
  '/party/:id',
  asyncHandler(async (req, res) => {
    const party = await Party.findById(req.params.id).lean()
    if (!party) throw new ApiError(404, 'Party not found')
    const rows = await LedgerEntry.find({ party: party._id }).sort({ createdAt: 1 }).lean()
    let running = Number(party.openingDebit || 0) - Number(party.openingCredit || 0)
    // opening may already be in ledger — if first source is opening, don't double
    const hasOpening = rows.some((r) => r.source === 'opening')
    if (hasOpening) running = 0
    const withBalance = rows.map((r) => {
      running += Number(r.debit || 0) - Number(r.credit || 0)
      return { ...r, balance: running }
    })
    // Always return ledger-computed balance (party.balance can be stale / paisa-based)
    const balance = withBalance.length
      ? Number(withBalance[withBalance.length - 1].balance)
      : running
    return ok(res, { party, entries: withBalance, balance })
  })
)

/** Dashboard / report aggregates */
ledgerRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const d = new Date()
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const todayDates = [
      `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      `${day}/${month}/${year}`,
      `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
      `${day}-${month}-${year}`,
    ]
    const todayFilter = { date: { $in: todayDates } }

    const [
      parties,
      customers,
      sales,
      purchases,
      vouchers,
      products,
      todaySales,
      todayPurchases,
      todayVouchers,
      todayVoucherRows,
      customerDebits,
    ] = await Promise.all([
      Party.countDocuments({ isActive: { $ne: false } }),
      Party.countDocuments({ isActive: { $ne: false }, accountType: 'customer' }),
      SaleBill.countDocuments(),
      PurchaseBill.countDocuments(),
      Voucher.countDocuments(),
      Product.countDocuments({ isActive: { $ne: false } }),
      SaleBill.countDocuments(todayFilter),
      PurchaseBill.countDocuments(todayFilter),
      Voucher.countDocuments(todayFilter),
      Voucher.find(todayFilter).sort({ createdAt: -1 }).limit(20).lean(),
      Party.find({
        isActive: { $ne: false },
        accountType: 'customer',
        balance: { $gt: 0 },
      })
        .select('code nameUr nameEn phone balance')
        .sort({ balance: -1 })
        .limit(20)
        .lean(),
    ])

    const dayBookMap = new Map<string, { nameUr: string; nameEn: string; banam: number; jama: number }>()
    for (const v of todayVoucherRows) {
      const key = String(v.partyCode || v.partyName || v._id)
      const cur = dayBookMap.get(key) || {
        nameUr: v.partyName || v.partyCode || '—',
        nameEn: v.partyName || v.partyCode || '—',
        banam: 0,
        jama: 0,
      }
      const amt = Number(v.amount) || 0
      if (v.type === 'debit') cur.banam += amt
      else cur.jama += amt
      dayBookMap.set(key, cur)
    }

    return ok(res, {
      counts: {
        parties,
        customers,
        sales,
        purchases,
        vouchers,
        products,
        today: todaySales + todayPurchases + todayVouchers,
        todaySales,
        todayPurchases,
        todayVouchers,
        bills: sales + purchases,
      },
      dayBook: [...dayBookMap.values()].slice(0, 8),
      customerDebits,
    })
  })
)
