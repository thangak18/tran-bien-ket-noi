import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { publicRoutes } from './routes/public';
import { citizenRoutes } from './routes/citizen';
import { officerRoutes } from './routes/officer';
import { volunteerRoutes } from './routes/volunteer';
import { cronRoutes } from './routes/cron';
import { uploadRoutes } from './routes/uploads';
import type { AppEnv } from './types';

const subApp = new Hono<AppEnv>();
subApp.route('/public', publicRoutes);
subApp.route('/citizen', citizenRoutes);
subApp.route('/officer', officerRoutes);
subApp.route('/volunteer', volunteerRoutes);
subApp.route('/cron', cronRoutes);
subApp.route('/uploads', uploadRoutes);

// Health check
subApp.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Trấn Biên Kết Nối API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

export const app = new Hono<AppEnv>();

// Global Middlewares
app.use('*', corsMiddleware);
app.use('*', requestIdMiddleware);
app.onError(errorHandler);

// Hỗ trợ cả hai tiền tố: có /api và không có /api
app.route('/api', subApp);
app.route('/', subApp);

export default app;
