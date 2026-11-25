import { defineConfig } from 'vite';
import type { UserConfig, Plugin } from 'vite';
import type { InlineConfig } from 'vitest/node';
import react from '@vitejs/plugin-react';
import path from 'path';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/api/v1'))) {
          try {
            const { app } = await import('./server/app');
            const url = `http://${req.headers.host || 'localhost:5173'}${req.url}`;
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (value) {
                if (Array.isArray(value)) {
                  for (const v of value) headers.append(key, v);
                } else {
                  headers.set(key, value);
                }
              }
            }

            const chunks: Buffer[] = [];
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            await new Promise((resolve) => req.on('end', resolve));
            const bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : null;

            const webReq = new Request(url, {
              method: req.method,
              headers,
              body:
                req.method !== 'GET' && req.method !== 'HEAD' && bodyBuffer
                  ? bodyBuffer
                  : undefined,
            });

            const webRes = await app.fetch(webReq);

            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => {
              res.setHeader(key, val);
            });

            const arrayBuf = await webRes.arrayBuffer();
            res.end(Buffer.from(arrayBuf));
            return;
          } catch (err) {
            console.error('API Dev Server Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
            return;
          }
        }
        next();
      });
    },
  };
}

interface VitestConfigExport extends UserConfig {
  test?: InlineConfig;
}

export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
  },
} as VitestConfigExport);
