import { createMiddleware } from 'hono/factory';
import { StatusCode } from 'hono/utils/http-status';
import { sqlClient } from '../db/client';

// Fallback bộ nhớ chỉ dùng khi bảng idempotency_keys chưa được migrate ở môi trường local.
const memoryFallback = new Map<
  string,
  { status: StatusCode; body: Record<string, unknown>; at: number }
>();

const TTL_MS = 86400 * 1000;

async function readStoredKey(
  key: string
): Promise<{ status: StatusCode; body: Record<string, unknown> } | null> {
  try {
    const [row] = await sqlClient`
      SELECT status, body
      FROM idempotency_keys
      WHERE key = ${key}
        AND created_at > now() - interval '24 hours'
      LIMIT 1;
    `;
    if (row) {
      return {
        status: Number(row.status) as StatusCode,
        body: (row.body ?? {}) as Record<string, unknown>,
      };
    }
    return null;
  } catch {
    const cached = memoryFallback.get(key);
    if (cached && Date.now() - cached.at <= TTL_MS) {
      return { status: cached.status, body: cached.body };
    }
    return null;
  }
}

async function storeKey(
  key: string,
  status: StatusCode,
  body: Record<string, unknown>
): Promise<void> {
  try {
    await sqlClient`
      INSERT INTO idempotency_keys (key, status, body, created_at)
      VALUES (${key}, ${Number(status)}, ${JSON.stringify(body)}::jsonb, now())
      ON CONFLICT (key) DO NOTHING;
    `;
  } catch {
    const now = Date.now();
    for (const [k, v] of memoryFallback.entries()) {
      if (now - v.at > TTL_MS) memoryFallback.delete(k);
    }
    memoryFallback.set(key, { status, body, at: now });
  }
}

export const idempotencyMiddleware = createMiddleware(async (c, next) => {
  const key = c.req.header('Idempotency-Key')?.trim();
  if (!key) {
    return await next();
  }

  const cached = await readStoredKey(key);
  if (cached) {
    c.header('X-Idempotent-Replay', 'true');
    return c.json(cached.body, cached.status);
  }

  await next();

  if (c.res.status >= 200 && c.res.status < 300) {
    try {
      const cloned = c.res.clone();
      const body = (await cloned.json()) as Record<string, unknown>;
      await storeKey(key, c.res.status as StatusCode, body);
    } catch {
      // Body không phải JSON, bỏ qua lưu cache
    }
  }
});
