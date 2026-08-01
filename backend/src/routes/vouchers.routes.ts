import { Router } from 'express'
import { z } from 'zod'
import { Voucher, VOUCHER_TYPES } from '../models/Voucher'
import { Party } from '../models/Party'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { num, postLedger, removeLedgerBySource } from '../services/ledger.service'
import { partyCodeOf, partyName } from '../utils/partyHelpers'

const schema = z.object({
  invoice: z.string().optional(),
  date: z.string().min(1),
  type: z.enum(VOUCHER_TYPES),
  party: z.string().min(1),
  cashAccount: z.string().optional().default('نقدی کھاتہ'),
  details: z.string().optional().default(''),
  marfat: z.string().optional().default(''),
  amount: z.coerce.number().positive(),
  bank: z.string().optional().default(''),
})

function counterKey(type: string) {
  return `voucher_${type}`
}

function counterStart(_type: string) {
  return 1
}

function enrichVoucher(v: Record<string, unknown>) {
  const party = v.party && typeof v.party === 'object' ? (v.party as Record<string, unknown>) : null
  const code =
    String(v.partyCode || '') ||
    (party ? partyCodeOf(party as Parameters<typeof partyCodeOf>[0]) : '')
  const name =
    String(v.partyName || '') ||
    (party ? partyName(party as Parameters<typeof partyName>[0]) : '')
  return { ...v, partyCode: code, partyName: name }
}

export const vouchersRouter = Router()

vouchersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = String(req.query.type || '').trim()
    const filter: Record<string, unknown> = {}
    if (type && VOUCHER_TYPES.includes(type as (typeof VOUCHER_TYPES)[number])) {
      filter.type = type
    }
    const rows = await Voucher.find(filter).sort({ createdAt: -1 }).populate('party').lean()
    return ok(
      res,
      rows.map((r) => enrichVoucher(r as Record<string, unknown>))
    )
  })
)

vouchersRouter.get(
  '/next-invoice',
  asyncHandler(async (req, res) => {
    const type = String(req.query.type || 'debit')
    const key = counterKey(type)
    const start = counterStart(type)

    // Align counter with highest existing invoice so series stays continuous
    const existing = await Voucher.find({ type }).select('invoice').lean()
    const maxInv = existing.reduce((m, v) => Math.max(m, Number(v.invoice) || 0), 0)
    if (maxInv > 0) await bumpSeqAtLeast(key, maxInv)

    const invoice = String(await peekSeq(key, start))
    return ok(res, { invoice })
  })
)

vouchersRouter.post(
  '/',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    const party = await Party.findById(req.body.party)
    if (!party) throw new ApiError(404, 'Party not found')

    const key = counterKey(req.body.type)
    const start = counterStart(req.body.type)

    let invoice = req.body.invoice?.trim()
    if (!invoice) {
      invoice = String(await nextSeq(key, start))
    } else {
      const n = Number(invoice)
      if (!Number.isFinite(n)) throw new ApiError(400, 'Invalid invoice number')
      // Keep series in order after client-provided number
      await bumpSeqAtLeast(key, n)
    }

    if (await Voucher.findOne({ invoice })) {
      // Collision — take next free number in series
      invoice = String(await nextSeq(key, start))
      while (await Voucher.findOne({ invoice })) {
        invoice = String(await nextSeq(key, start))
      }
    }

    const amount = num(req.body.amount)
    const code = partyCodeOf(party)
    const name = partyName(party)

    const voucher = await Voucher.create({
      ...req.body,
      invoice,
      party: party._id,
      partyCode: code,
      partyName: name,
      amount,
    })

    try {
      const isDebit = req.body.type === 'debit'
      await postLedger({
        date: voucher.date,
        partyId: party._id,
        partyCode: code,
        invoice: voucher.invoice,
        source: 'voucher',
        sourceId: voucher._id,
        particulars: voucher.details || `${req.body.type} voucher`,
        marfat: voucher.marfat,
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
      })
    } catch (err) {
      await Voucher.deleteOne({ _id: voucher._id })
      throw err
    }

    const populated = await Voucher.findById(voucher._id).populate('party').lean()
    return created(res, enrichVoucher((populated || voucher.toObject()) as Record<string, unknown>))
  })
)

vouchersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const voucher = await Voucher.findById(req.params.id)
    if (!voucher) throw new ApiError(404, 'Voucher not found')
    await removeLedgerBySource('voucher', voucher._id)
    await voucher.deleteOne()
    return ok(res, { id: req.params.id }, 'Deleted')
  })
)
