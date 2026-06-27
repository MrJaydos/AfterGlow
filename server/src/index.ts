import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { healthRoutes } from './routes/health';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

async function start(): Promise<void> {
  const server = Fastify({
    logger: { level: NODE_ENV === 'development' ? 'info' : 'warn' },
  });

  await server.register(cors, {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  });

  await server.register(healthRoutes);

  // In production, serve the Vite-built client from server/public
  if (NODE_ENV !== 'development') {
    const publicDir = path.join(__dirname, '../public');
    await server.register(fastifyStatic, {
      root: publicDir,
      prefix: '/',
    });
  }

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
