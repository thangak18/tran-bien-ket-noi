import { handle } from 'hono/vercel';
// Server đã được gói sẵn bởi scripts/build-api.mjs (chạy trong `npm run build`), vì Vercel không
// phân giải được import không đuôi giữa các file .ts trong package "type": "module".
import { app } from './_lib/server.mjs';

export const config = {
  runtime: 'nodejs',
};

// Vercel Node runtime gọi default export theo kiểu (req, res); Hono cần Web Request/Response.
// Export theo phương thức HTTP thì Vercel truyền Web Request và dùng Response trả về.
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
