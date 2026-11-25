import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '../../server');

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listTsFiles(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

describe('DB-GUARD-001 – Không dùng sql.json() trong server', () => {
  it('server/db/client.ts tắt prepared statement (pooler Supabase) nên mọi jsonb phải dùng JSON.stringify(...)::jsonb', () => {
    const client = readFileSync(path.join(SERVER_DIR, 'db/client.ts'), 'utf-8');
    expect(client).toMatch(/prepare:\s*false/);

    const offenders = listTsFiles(SERVER_DIR).flatMap((file) =>
      readFileSync(file, 'utf-8')
        .split('\n')
        .map((line, idx) => ({ line, idx }))
        .filter(
          ({ line }) => /\b(sql|tx|sqlClient)\.json\(/.test(line) && !/^\s*(--|\/\/)/.test(line)
        )
        .map(({ idx }) => `${path.relative(SERVER_DIR, file)}:${idx + 1}`)
    );
    expect(offenders).toEqual([]);
  });
});

describe('DB-GUARD-002 – Pool kết nối cho serverless (AC-API-13)', () => {
  it('server/db/client.ts: 1 kết nối trên Vercel, đóng kết nối nhàn rỗi 20 giây, tối đa 5 phút', () => {
    const client = readFileSync(path.join(SERVER_DIR, 'db/client.ts'), 'utf-8');
    expect(client).toMatch(/prepare:\s*false/);
    expect(client).toMatch(/max:\s*process\.env\.VERCEL\s*\?\s*1\s*:\s*10/);
    expect(client).toMatch(/idle_timeout:\s*20\b/);
    expect(client).toMatch(/max_lifetime:\s*(300|60\s*\*\s*5)\b/);
  });
});
