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
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { aiRoutes } from './routes/ai';
import type { AppEnv } from './types';

const subApp = new Hono<AppEnv>();
subApp.route('/public', publicRoutes);
subApp.route('/citizen', citizenRoutes);
subApp.route('/', citizenRoutes);
subApp.route('/officer', officerRoutes);
subApp.route('/volunteer', volunteerRoutes);
subApp.route('/cron', cronRoutes);
subApp.route('/uploads', uploadRoutes);
subApp.route('/auth', authRoutes);
subApp.route('/admin', adminRoutes);
subApp.route('/ai', aiRoutes);

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

// Hỗ trợ chuẩn Spec 12 (/api/v1) cùng các tiền tố tương thích ngược (/api và root /)
app.route('/api/v1', subApp);
app.route('/api', subApp);
app.route('/', subApp);

export default app;
