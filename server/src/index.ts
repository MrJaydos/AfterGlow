import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { healthRoutes } from './routes/health';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

process.on('uncaughtException', (err) => {
  console.error('[afterglow] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[afterglow] Unhandled rejection:', reason);
  process.exit(1);
});

async function start(): Promise<void> {
  console.log(`[afterglow] Starting — NODE_ENV=${NODE_ENV} PORT=${PORT}`);

  const server = Fastify({
    logger: { level: 'info' },
  });

  await server.register(cors, {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  });

  await server.register(healthRoutes);

  // In production, serve the Vite-built client from server/public
  if (NODE_ENV !== 'development') {
    const publicDir = path.join(__dirname, '../public');
    console.log(`[afterglow] Serving static files from ${publicDir}`);
    await server.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });
  }

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[afterglow] Listening on 0.0.0.0:${PORT}`);
  } catch (err) {
    console.error('[afterglow] Failed to start:', err);
    process.exit(1);
  }
}

start();
