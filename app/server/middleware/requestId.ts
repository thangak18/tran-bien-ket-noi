import { createMiddleware } from 'hono/factory';
import crypto from 'node:crypto';
import type { AppEnv } from '../types';

export const requestIdMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const existingId = c.req.header('X-Request-Id');
  const requestId = existingId || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});
