import { Router } from 'express'
import { z } from 'zod'
import { PurchaseBill } from '../models/PurchaseBill'
import { Marfat } from '../models/Marfat'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { num, postLedger, removeLedgerBySource, sumCharges } from '../services/ledger.service'

const lineSchema = z.object({
  pieces: z.coerce.number().optional().default(0),
  rate: z.coerce.number().optional().default(0),
  product: z.string().nullable().optional(),
  item: z.string().optional().default(''),
  traderRate: z.coerce.number().optional().default(0),
  amount: z.coerce.number().optional(),
})

const chargesSchema = z
  .object({
    commission: z.coerce.number().optional().default(0),
    fare: z.coerce.number().optional().default(0),
    expense: z.coerce.number().optional().default(0),
    labor: z.coerce.number().optional().default(0),
    market: z.coerce.number().optional().default(0),
    munshiana: z.coerce.number().optional().default(0),
    store: z.coerce.number().optional().default(0),
    cashBill: z.coerce.number().optional().default(0),
    payment: z.coerce.number().optional().default(0),
  })
  .partial()
  .optional()

const billSchema = z.object({
  invoice: z.string().optional(),
  date: z.string().min(1),
  landowner: z.string().optional().default(''),
  landownerParty: z.string().nullable().optional(),
  marfat: z.string().nullable().optional(),
  marfatName: z.string().optional().default(''),
  item: z.string().optional().default(''),
  product: z.string().nullable().optional(),
  marka: z.string().optional().default(''),
  vehicle: z.string().optional().default(''),
  totalNag: z.coerce.number().optional().default(0),
  lines: z.array(lineSchema).default([]),
  charges: chargesSchema,
  lagana: z.coerce.number().optional().default(0),
  diffAccount: z.coerce.number().optional().default(0),
  status: z.enum(['draft', 'completed']).optional().default('completed'),
})

function calcLines(lines: z.infer<typeof lineSchema>[]) {
  return lines.map((l) => {
    const pieces = num(l.pieces)
    const rate = num(l.rate)
    const amount = l.amount != null ? num(l.amount) : pieces * rate
    return { ...l, pieces, rate, amount, product: l.product || null }
  })
}

export const purchasesRouter = Router()

purchasesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    const filter: Record<string, unknown> = {}
    if (q) {
      filter.$or = [
        { invoice: new RegExp(q, 'i') },
        { landowner: new RegExp(q, 'i') },
        { marfatName: new RegExp(q, 'i') },
        { item: new RegExp(q, 'i') },
      ]
    }
    return ok(res, await PurchaseBill.find(filter).sort({ createdAt: -1 }).populate('marfat').lean())
  })
)

purchasesRouter.get(
  '/next-invoice',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('purchase_invoice', 1)
    return ok(res, { invoice: String(seq) })
  })
)

purchasesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await PurchaseBill.findById(req.params.id).populate('marfat').lean()
    if (!row) throw new ApiError(404, 'Purchase bill not found')
    return ok(res, row)
  })
)

purchasesRouter.post(
  '/',
  validateBody(billSchema),
  asyncHandler(async (req, res) => {
    let invoice = req.body.invoice?.trim()
    if (!invoice) invoice = String(await nextSeq('purchase_invoice', 1))
    else {
      const n = Number(invoice)
      if (Number.isFinite(n)) await bumpSeqAtLeast('purchase_invoice', n)
    }
    if (await PurchaseBill.findOne({ invoice })) throw new ApiError(409, 'Invoice already exists')

    const lines = calcLines(req.body.lines || [])
    const grossAmount = lines.reduce((s, l) => s + num(l.amount), 0)
    const charges = req.body.charges || {}
    const totalExpense = sumCharges(charges as Record<string, unknown>)
    const netAmount = grossAmount - totalExpense
    const totalPieces = lines.reduce((s, l) => s + num(l.pieces), 0)

    let marfatName = req.body.marfatName || ''
    if (!marfatName && req.body.marfat) {
      const m = await Marfat.findById(req.body.marfat).lean()
      marfatName = m?.marfatUr || m?.marfatEn || ''
    }

    const bill = await PurchaseBill.create({
      ...req.body,
      invoice,
      marfat: req.body.marfat || null,
      landownerParty: req.body.landownerParty || null,
      product: req.body.product || null,
      marfatName,
      lines,
      charges,
      grossAmount,
      totalExpense,
      netAmount,
      average: totalPieces ? netAmount / totalPieces : 0,
      totalNag: req.body.totalNag || totalPieces,
    })

    if (bill.landownerParty && netAmount > 0) {
      await postLedger({
        date: bill.date,
        partyId: bill.landownerParty,
        invoice: bill.invoice,
        source: 'purchase',
        sourceId: bill._id,
        particulars: `Purchase ${bill.invoice}`,
        marfat: marfatName,
        item: bill.item,
        vehicle: bill.vehicle,
        pieces: totalPieces,
        debit: netAmount,
      })
    }

    return created(res, bill)
  })
)

purchasesRouter.put(
  '/:id',
  validateBody(billSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await PurchaseBill.findById(req.params.id)
    if (!existing) throw new ApiError(404, 'Purchase bill not found')
    await removeLedgerBySource('purchase', existing._id)

    const lines = calcLines(req.body.lines ?? existing.lines.map((l) => l.toObject()))
    const charges = req.body.charges ?? existing.charges
    const grossAmount = lines.reduce((s, l) => s + num(l.amount), 0)
    const totalExpense = sumCharges(charges as unknown as Record<string, unknown>)
    const netAmount = grossAmount - totalExpense
    const totalPieces = lines.reduce((s, l) => s + num(l.pieces), 0)

    Object.assign(existing, {
      ...req.body,
      marfat: req.body.marfat !== undefined ? req.body.marfat || null : existing.marfat,
      landownerParty:
        req.body.landownerParty !== undefined ? req.body.landownerParty || null : existing.landownerParty,
      lines,
      charges,
      grossAmount,
      totalExpense,
      netAmount,
      average: totalPieces ? netAmount / totalPieces : 0,
    })
    await existing.save()

    if (existing.landownerParty && netAmount > 0) {
      await postLedger({
        date: existing.date,
        partyId: existing.landownerParty,
        invoice: existing.invoice,
        source: 'purchase',
        sourceId: existing._id,
        particulars: `Purchase ${existing.invoice}`,
        marfat: existing.marfatName,
        item: existing.item,
        vehicle: existing.vehicle,
        pieces: totalPieces,
        debit: netAmount,
      })
    }

    return ok(res, existing)
  })
)

purchasesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await PurchaseBill.findById(req.params.id)
    if (!bill) throw new ApiError(404, 'Purchase bill not found')
    await removeLedgerBySource('purchase', bill._id)
    await bill.deleteOne()
    return ok(res, { id: req.params.id }, 'Deleted')
  })
)
