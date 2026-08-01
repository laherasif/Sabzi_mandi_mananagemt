import { Router } from 'express'
import { z } from 'zod'
import { CustomerBill } from '../models/CustomerBill'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { num, postLedger, removeLedgerBySource } from '../services/ledger.service'

const lineSchema = z.object({
  party: z.string().nullable().optional(),
  name: z.string().optional().default(''),
  pieces: z.coerce.number().optional().default(0),
  rate: z.coerce.number().optional().default(0),
  product: z.string().nullable().optional(),
  item: z.string().optional().default(''),
  lagana: z.coerce.number().optional().default(0),
  traderRate: z.coerce.number().optional().default(0),
  marfat: z.string().optional().default(''),
  marka: z.string().optional().default(''),
  number: z.string().optional().default(''),
  amount: z.coerce.number().optional(),
})

const billSchema = z.object({
  invoice: z.string().optional(),
  date: z.string().min(1),
  lines: z.array(lineSchema).default([]),
  expense: z.coerce.number().optional().default(0),
  lagana: z.coerce.number().optional().default(0),
  diffAccount: z.coerce.number().optional().default(0),
  status: z.enum(['draft', 'completed']).optional().default('completed'),
})

function calcLines(lines: z.infer<typeof lineSchema>[]) {
  return lines.map((l) => {
    const pieces = num(l.pieces)
    const rate = num(l.rate)
    const amount = l.amount != null ? num(l.amount) : pieces * rate
    return { ...l, pieces, rate, amount, party: l.party || null, product: l.product || null }
  })
}

export const customerPurchasesRouter = Router()

customerPurchasesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    const filter: Record<string, unknown> = {}
    if (q) filter.invoice = new RegExp(q, 'i')
    return ok(res, await CustomerBill.find(filter).sort({ createdAt: -1 }).lean())
  })
)

customerPurchasesRouter.get(
  '/next-invoice',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('customer_purchase_invoice', 1)
    return ok(res, { invoice: String(seq) })
  })
)

customerPurchasesRouter.post(
  '/',
  validateBody(billSchema),
  asyncHandler(async (req, res) => {
    let invoice = req.body.invoice?.trim()
    if (!invoice) invoice = String(await nextSeq('customer_purchase_invoice', 1))
    else {
      const n = Number(invoice)
      if (Number.isFinite(n)) await bumpSeqAtLeast('customer_purchase_invoice', n)
    }
    if (await CustomerBill.findOne({ invoice })) throw new ApiError(409, 'Invoice already exists')

    const lines = calcLines(req.body.lines || [])
    const grossAmount = lines.reduce((s, l) => s + num(l.amount), 0)
    const expense = num(req.body.expense)
    const netAmount = grossAmount - expense
    const totalPieces = lines.reduce((s, l) => s + num(l.pieces), 0)

    const bill = await CustomerBill.create({
      ...req.body,
      invoice,
      lines,
      expense,
      grossAmount,
      netAmount,
      totalPieces,
      average: totalPieces ? netAmount / totalPieces : 0,
    })

    for (const line of lines) {
      if (line.party && num(line.amount) > 0) {
        await postLedger({
          date: bill.date,
          partyId: line.party,
          invoice: bill.invoice,
          source: 'customer_purchase',
          sourceId: bill._id,
          particulars: `Customer purchase ${bill.invoice} — ${line.name}`,
          marfat: line.marfat,
          item: line.item,
          pieces: num(line.pieces),
          rate: num(line.rate),
          debit: num(line.amount),
        })
      }
    }

    return created(res, bill)
  })
)

customerPurchasesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await CustomerBill.findById(req.params.id)
    if (!bill) throw new ApiError(404, 'Bill not found')
    await removeLedgerBySource('customer_purchase', bill._id)
    await bill.deleteOne()
    return ok(res, { id: req.params.id }, 'Deleted')
  })
)
