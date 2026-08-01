import { Router } from 'express'
import { z } from 'zod'
import { Party, ACCOUNT_TYPES } from '../models/Party'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { postLedger } from '../services/ledger.service'

const partySchema = z.object({
  code: z.string().optional(),
  nameUr: z.string().optional().default(''),
  nameEn: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  bankAccountNumber: z.string().optional().default(''),
  accountType: z.enum(ACCOUNT_TYPES),
  accountTypeLabel: z.string().optional().default(''),
  date: z.string().optional().default(''),
  commission: z.string().optional().default('2%'),
  details: z.string().optional().default(''),
  item: z.string().optional().default(''),
  agrahi: z.enum(['NEW', 'OLD', '']).optional().default('NEW'),
  openingDebit: z.coerce.number().optional().default(0),
  openingCredit: z.coerce.number().optional().default(0),
})

export const partiesRouter = Router()

partiesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    const type = String(req.query.type || '').trim()
    const filter: Record<string, unknown> = { isActive: true }
    if (type && ACCOUNT_TYPES.includes(type as (typeof ACCOUNT_TYPES)[number])) {
      filter.accountType = type
    }
    if (q) {
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { nameUr: new RegExp(q, 'i') },
        { nameEn: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { bankAccountNumber: new RegExp(q, 'i') },
      ]
    }
    const rows = await Party.find(filter).sort({ code: -1 }).lean()
    return ok(res, rows)
  })
)

partiesRouter.get(
  '/next-code',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('party', 1)
    return ok(res, { code: String(seq) })
  })
)

partiesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Party.findById(req.params.id).lean()
    if (!row) throw new ApiError(404, 'Party not found')
    return ok(res, row)
  })
)

partiesRouter.post(
  '/',
  validateBody(partySchema),
  asyncHandler(async (req, res) => {
    let code = req.body.code?.trim()
    if (!code) {
      code = String(await nextSeq('party', 1))
    } else {
      const n = Number(code)
      if (Number.isFinite(n)) await bumpSeqAtLeast('party', n)
    }
    const exists = await Party.findOne({ code })
    if (exists) throw new ApiError(409, 'Code already exists')

    const openingDebit = Number(req.body.openingDebit || 0)
    const openingCredit = Number(req.body.openingCredit || 0)
    const party = await Party.create({
      ...req.body,
      code,
      balance: 0,
    })

    if (openingDebit || openingCredit) {
      await postLedger({
        date: req.body.date || new Date().toLocaleDateString('en-GB'),
        partyId: party._id,
        partyCode: party.code || undefined,
        source: 'opening',
        particulars: 'Opening balance',
        debit: openingDebit,
        credit: openingCredit,
      })
      await party.save() // balance already updated by postLedger
    }

    const fresh = await Party.findById(party._id)
    return created(res, fresh)
  })
)

partiesRouter.put(
  '/:id',
  validateBody(partySchema.partial().extend({ accountType: z.enum(ACCOUNT_TYPES).optional() })),
  asyncHandler(async (req, res) => {
    const party = await Party.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!party) throw new ApiError(404, 'Party not found')
    return ok(res, party)
  })
)

partiesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const party = await Party.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!party) throw new ApiError(404, 'Party not found')
    return ok(res, party, 'Party deactivated')
  })
)
