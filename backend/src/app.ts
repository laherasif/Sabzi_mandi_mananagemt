import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { apiRouter } from './routes'
import { errorHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())
  app.use(morgan('dev'))

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, message: 'Sabzi Mandi API is healthy' })
  })

  app.use('/api/v1', apiRouter)

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
  })

  app.use(errorHandler)
  return app
}
