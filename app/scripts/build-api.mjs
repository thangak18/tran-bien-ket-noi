import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gói server Hono (server/app.ts và mọi file nó import trong server/, src/domain, scripts/lib, mock.json)
 * thành một file ESM cho Vercel Function.
 *
 * Lý do: Vercel biên dịch từng file .ts riêng và giữ nguyên import không có đuôi ("../server/app").
 * Package là "type": "module" nên Node từ chối các import đó (ERR_MODULE_NOT_FOUND) và function sập.
 * Thư viện trong node_modules để ngoài bundle (packages: 'external'); Vercel tự kèm theo khi đóng gói.
 */
const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'api', '_lib');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [path.join(appDir, 'server', 'app.ts')],
  outfile: path.join(outDir, 'server.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  sourcemap: false,
  logLevel: 'info',
});

// Kiểu cho api/[...path].ts (bundle là .mjs không kèm kiểu).
writeFileSync(path.join(outDir, 'server.d.mts'), "export { app } from '../../server/app';\n");
