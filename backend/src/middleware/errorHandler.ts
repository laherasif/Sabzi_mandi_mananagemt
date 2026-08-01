import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: err.flatten(),
    })
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    })
  }

  console.error(err)
  return res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : 'Internal server error',
  })
}
