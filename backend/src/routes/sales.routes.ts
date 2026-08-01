import { Router } from 'express'
import { z } from 'zod'
import { SaleBill } from '../models/SaleBill'
import { Marfat } from '../models/Marfat'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { num, postLedger, removeLedgerBySource, sumCharges } from '../services/ledger.service'

const lineSchema = z.object({
  party: z.string().nullable().optional(),
  name: z.string().optional().default(''),
  pieces: z.coerce.number().optional().default(0),
  rate: z.coerce.number().optional().default(0),
  product: z.string().nullable().optional(),
  item: z.string().optional().default(''),
  lagana: z.coerce.number().optional().default(0),
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
    storage: z.coerce.number().optional().default(0),
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
    return { ...l, pieces, rate, amount, party: l.party || null, product: l.product || null }
  })
}

async function resolveMarfatName(marfatId?: string | null, fallback = '') {
  if (!marfatId) return fallback
  const m = await Marfat.findById(marfatId).lean()
  if (!m) return fallback
  return m.marfatUr || m.marfatEn || fallback
}

export const salesRouter = Router()

salesRouter.get(
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
        { marka: new RegExp(q, 'i') },
      ]
    }
    const rows = await SaleBill.find(filter).sort({ createdAt: -1 }).populate('marfat').lean()
    return ok(res, rows)
  })
)

salesRouter.get(
  '/next-invoice',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('sale_invoice', 1)
    return ok(res, { invoice: String(seq) })
  })
)

salesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await SaleBill.findById(req.params.id).populate('marfat').lean()
    if (!row) throw new ApiError(404, 'Sale bill not found')
    return ok(res, row)
  })
)

salesRouter.post(
  '/',
  validateBody(billSchema),
  asyncHandler(async (req, res) => {
    let invoice = req.body.invoice?.trim()
    if (!invoice) invoice = String(await nextSeq('sale_invoice', 1))
    else {
      const n = Number(invoice)
      if (Number.isFinite(n)) await bumpSeqAtLeast('sale_invoice', n)
    }
    if (await SaleBill.findOne({ invoice })) throw new ApiError(409, 'Invoice already exists')

    const lines = calcLines(req.body.lines || [])
    const grossAmount = lines.reduce((s, l) => s + num(l.amount), 0)
    const charges = req.body.charges || {}
    const totalExpense = sumCharges(charges as Record<string, unknown>)
    const netAmount = grossAmount - totalExpense
    const totalPieces = lines.reduce((s, l) => s + num(l.pieces), 0)
    const average = totalPieces ? netAmount / totalPieces : 0
    const marfatName =
      req.body.marfatName || (await resolveMarfatName(req.body.marfat, ''))

    const bill = await SaleBill.create({
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
      average,
      totalNag: req.body.totalNag || totalPieces,
    })

    // Post buyer line amounts as debit on buyer parties when linked
    for (const line of lines) {
      if (line.party && num(line.amount) > 0) {
        await postLedger({
          date: bill.date,
          partyId: line.party,
          invoice: bill.invoice,
          source: 'sale',
          sourceId: bill._id,
          particulars: `Sale ${bill.invoice} — ${line.name || line.item}`,
          marfat: marfatName,
          item: line.item || bill.item,
          vehicle: bill.vehicle,
          pieces: num(line.pieces),
          rate: num(line.rate),
          debit: num(line.amount),
        })
      }
    }

    // Landowner credit = net payable
    if (bill.landownerParty && netAmount > 0) {
      await postLedger({
        date: bill.date,
        partyId: bill.landownerParty,
        invoice: bill.invoice,
        source: 'sale',
        sourceId: bill._id,
        particulars: `Sale settlement ${bill.invoice}`,
        marfat: marfatName,
        item: bill.item,
        vehicle: bill.vehicle,
        pieces: totalPieces,
        credit: netAmount,
      })
    }

    return created(res, bill)
  })
)

salesRouter.put(
  '/:id',
  validateBody(billSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await SaleBill.findById(req.params.id)
    if (!existing) throw new ApiError(404, 'Sale bill not found')

    await removeLedgerBySource('sale', existing._id)

    const lines = calcLines(req.body.lines ?? existing.lines.map((l) => l.toObject()))
    const charges = req.body.charges ?? existing.charges
    const grossAmount = lines.reduce((s, l) => s + num(l.amount), 0)
    const totalExpense = sumCharges(charges as unknown as Record<string, unknown>)
    const netAmount = grossAmount - totalExpense
    const totalPieces = lines.reduce((s, l) => s + num(l.pieces), 0)
    const marfatId = req.body.marfat !== undefined ? req.body.marfat : existing.marfat
    const marfatName =
      req.body.marfatName ||
      (await resolveMarfatName(marfatId ? String(marfatId) : null, existing.marfatName))

    Object.assign(existing, {
      ...req.body,
      marfat: marfatId || null,
      landownerParty:
        req.body.landownerParty !== undefined ? req.body.landownerParty || null : existing.landownerParty,
      marfatName,
      lines,
      charges,
      grossAmount,
      totalExpense,
      netAmount,
      average: totalPieces ? netAmount / totalPieces : 0,
    })
    await existing.save()

    for (const line of lines) {
      if (line.party && num(line.amount) > 0) {
        await postLedger({
          date: existing.date,
          partyId: line.party,
          invoice: existing.invoice,
          source: 'sale',
          sourceId: existing._id,
          particulars: `Sale ${existing.invoice} — ${line.name || line.item}`,
          marfat: marfatName,
          item: line.item || existing.item,
          vehicle: existing.vehicle,
          pieces: num(line.pieces),
          rate: num(line.rate),
          debit: num(line.amount),
        })
      }
    }
    if (existing.landownerParty && netAmount > 0) {
      await postLedger({
        date: existing.date,
        partyId: existing.landownerParty,
        invoice: existing.invoice,
        source: 'sale',
        sourceId: existing._id,
        particulars: `Sale settlement ${existing.invoice}`,
        marfat: marfatName,
        item: existing.item,
        vehicle: existing.vehicle,
        pieces: totalPieces,
        credit: netAmount,
      })
    }

    return ok(res, existing)
  })
)

salesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await SaleBill.findById(req.params.id)
    if (!bill) throw new ApiError(404, 'Sale bill not found')
    await removeLedgerBySource('sale', bill._id)
    await bill.deleteOne()
    return ok(res, { id: req.params.id }, 'Deleted')
  })
)
