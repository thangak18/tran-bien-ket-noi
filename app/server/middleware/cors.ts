import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Owner-Token',
    'X-Device-Id',
    'X-Cron-Secret',
    'Idempotency-Key',
  ],
  exposeHeaders: ['X-Request-Id', 'Content-Range'],
  maxAge: 86400,
});
