import { Router } from 'express'
import { z } from 'zod'
import { Marfat } from '../models/Marfat'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'

const schema = z.object({
  code: z.string().optional(),
  landownerUr: z.string().optional().default(''),
  landownerEn: z.string().optional().default(''),
  marfatUr: z.string().min(1),
  marfatEn: z.string().optional().default(''),
  landownerParty: z.string().nullable().optional(),
})

export const marfatRouter = Router()

marfatRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    const filter: Record<string, unknown> = { isActive: true }
    if (q) {
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { marfatUr: new RegExp(q, 'i') },
        { marfatEn: new RegExp(q, 'i') },
        { landownerUr: new RegExp(q, 'i') },
        { landownerEn: new RegExp(q, 'i') },
      ]
    }
    return ok(res, await Marfat.find(filter).sort({ code: 1 }).populate('landownerParty').lean())
  })
)

marfatRouter.get(
  '/next-code',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('marfat', 1)
    return ok(res, { code: String(seq) })
  })
)

marfatRouter.post(
  '/',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    let code = req.body.code?.trim()
    if (!code) code = String(await nextSeq('marfat', 1))
    else {
      const n = Number(code)
      if (Number.isFinite(n)) await bumpSeqAtLeast('marfat', n)
    }
    if (await Marfat.findOne({ code })) throw new ApiError(409, 'Code already exists')
    const row = await Marfat.create({
      ...req.body,
      code,
      landownerParty: req.body.landownerParty || null,
    })
    return created(res, row)
  })
)

marfatRouter.put(
  '/:id',
  validateBody(schema.partial()),
  asyncHandler(async (req, res) => {
    const row = await Marfat.findByIdAndUpdate(
      req.params.id,
      { ...req.body, landownerParty: req.body.landownerParty || null },
      { new: true }
    )
    if (!row) throw new ApiError(404, 'Marfat not found')
    return ok(res, row)
  })
)

marfatRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Marfat.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!row) throw new ApiError(404, 'Marfat not found')
    return ok(res, row)
  })
)
