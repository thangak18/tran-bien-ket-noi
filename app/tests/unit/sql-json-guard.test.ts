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
