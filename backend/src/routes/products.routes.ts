import { Router } from 'express'
import { z } from 'zod'
import { Product } from '../models/Product'
import { bumpSeqAtLeast, nextSeq, peekSeq } from '../models/Counter'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'

const schema = z.object({
  code: z.string().optional(),
  nameUr: z.string().optional().default(''),
  nameEn: z.string().optional().default(''),
  commission: z.string().optional().default('2%'),
  labor: z.string().optional().default(''),
  market: z.string().optional().default(''),
  munshiana: z.string().optional().default(''),
  fare: z.string().optional().default(''),
})

export const productsRouter = Router()

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim()
    const filter: Record<string, unknown> = { isActive: true }
    if (q) {
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { nameUr: new RegExp(q, 'i') },
        { nameEn: new RegExp(q, 'i') },
      ]
    }
    return ok(res, await Product.find(filter).sort({ code: 1 }).lean())
  })
)

productsRouter.get(
  '/next-code',
  asyncHandler(async (_req, res) => {
    const seq = await peekSeq('product', 1)
    return ok(res, { code: String(seq) })
  })
)

productsRouter.post(
  '/',
  validateBody(schema),
  asyncHandler(async (req, res) => {
    let code = req.body.code?.trim()
    if (!code) code = String(await nextSeq('product', 1))
    else {
      const n = Number(code)
      if (Number.isFinite(n)) await bumpSeqAtLeast('product', n)
    }
    if (await Product.findOne({ code })) throw new ApiError(409, 'Code already exists')
    return created(res, await Product.create({ ...req.body, code }))
  })
)

productsRouter.put(
  '/:id',
  validateBody(schema.partial()),
  asyncHandler(async (req, res) => {
    const row = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!row) throw new ApiError(404, 'Product not found')
    return ok(res, row)
  })
)

productsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!row) throw new ApiError(404, 'Product not found')
    return ok(res, row)
  })
)
