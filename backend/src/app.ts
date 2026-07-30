import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import unitRoutes from './routes/unit.routes';
import partyRoutes from './routes/party.routes';
import productRoutes from './routes/product.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, message: 'Sabzi Mandi API is healthy' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/business', businessRoutes);
  app.use('/api/v1/units', unitRoutes);
  app.use('/api/v1/parties', partyRoutes);
  app.use('/api/v1/products', productRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
