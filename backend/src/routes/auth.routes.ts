import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { User } from '../models/User'
import { asyncHandler } from '../utils/asyncHandler'
import { ApiError } from '../utils/ApiError'
import { ok, created } from '../utils/response'
import { validateBody } from '../middleware/validate'
import { env } from '../config/env'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function signAccess(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  })
}

export const authRouter = Router()

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const exists = await User.findOne({ email: req.body.email })
    if (exists) throw new ApiError(409, 'Email already registered')
    const user = await User.create(req.body)
    const accessToken = signAccess(String(user._id))
    return created(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      token: accessToken,
    })
  })
)

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password')
    if (!user) throw new ApiError(401, 'Invalid email or password')
    const match = await bcrypt.compare(req.body.password, user.password)
    if (!match) throw new ApiError(401, 'Invalid email or password')
    const accessToken = signAccess(String(user._id))
    return ok(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
      token: accessToken,
    }, 'Logged in')
  })
)

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Unauthorized')
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as { sub: string }
    const user = await User.findById(payload.sub)
    if (!user) throw new ApiError(401, 'Unauthorized')
    return ok(res, { id: user._id, name: user.name, email: user.email, role: user.role })
  })
)
