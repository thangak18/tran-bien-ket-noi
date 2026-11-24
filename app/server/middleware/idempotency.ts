import { createMiddleware } from 'hono/factory';
import { sqlClient } from '../db/client';

// Simple in-memory / cache table for Idempotency-Key
const idempotencyCache = new Map<string, { status: number; body: any; at: number }>();

export const idempotencyMiddleware = createMiddleware(async (c, next) => {
  const key = c.req.header('Idempotency-Key');
  if (!key) {
    return await next();
  }

  // Clean cache older than 24h
  const now = Date.now();
  for (const [k, v] of idempotencyCache.entries()) {
    if (now - v.at > 86400 * 1000) {
      idempotencyCache.delete(k);
    }
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    c.header('X-Idempotent-Replay', 'true');
    return c.json(cached.body, cached.status as any);
  }

  await next();

  // If response was 2xx, cache it
  if (c.res.status >= 200 && c.res.status < 300) {
    try {
      const cloned = c.res.clone();
      const body = await cloned.json();
      idempotencyCache.set(key, {
        status: c.res.status,
        body,
        at: now,
      });
    } catch {
      // Body not json, skip caching
    }
  }
});
