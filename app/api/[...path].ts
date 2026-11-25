import { handle } from 'hono/vercel';
// Server đã được gói sẵn bởi scripts/build-api.mjs (chạy trong `npm run build`), vì Vercel không
// phân giải được import không đuôi giữa các file .ts trong package "type": "module".
import { app } from './_lib/server.mjs';

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
