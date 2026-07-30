import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Sabzi Mandi API running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
