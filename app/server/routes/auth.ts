import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { sqlClient } from '../db/client';
import { env } from '../env';
import { AppError } from '../middleware/errorHandler';
import { createStaffToken } from '../middleware/auth';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

/** Thông báo chung cho mọi lỗi đăng nhập: không cho biết email tồn tại hay sai mật khẩu (AC-LOGIN-3). */
const INVALID_CREDENTIALS_MESSAGE = 'Email hoặc mật khẩu không chính xác';

const invalidCredentials = () =>
  new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE, 401);

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(256),
});

/**
 * Xác thực email + mật khẩu qua Supabase Auth (grant_type=password).
 * Trả về id người dùng Supabase khi đúng; trả null khi sai thông tin; ném 503 khi dịch vụ xác thực lỗi.
 */
async function verifyPasswordWithSupabase(email: string, password: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new AppError(
      'AUTH_SERVICE_UNAVAILABLE',
      'Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng thử lại sau.',
      503
    );
  }

  if (res.status === 400 || res.status === 401 || res.status === 422) return null;
  if (res.status === 429) {
    throw new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
      429
    );
  }
  if (!res.ok) {
    throw new AppError(
      'AUTH_SERVICE_UNAVAILABLE',
      'Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng thử lại sau.',
      503
    );
  }

  const body = (await res.json().catch(() => null)) as { user?: { id?: string } } | null;
  const userId = body?.user?.id;
  return typeof userId === 'string' ? userId : null;
}

/**
 * POST /auth/login & POST /auth/staff-login - Đăng nhập Cán bộ / Tình nguyện viên (Spec 13.2).
 * Mật khẩu được kiểm tra bởi Supabase Auth; vai trò lấy từ bảng staff_profiles theo user id,
 * không bao giờ suy ra từ email hay từ dữ liệu client gửi lên.
 */
const handleStaffLogin = async (c: Context<AppEnv>) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  // Thiếu email/mật khẩu cũng trả 401 cùng thông báo, không phân biệt với sai mật khẩu.
  if (!parsed.success) throw invalidCredentials();

  const email = parsed.data.email.toLowerCase();
  const userId = await verifyPasswordWithSupabase(email, parsed.data.password);
  if (!userId) throw invalidCredentials();

  const [staff] = await sqlClient`
    SELECT user_id, role, display_name, department_id, is_active, email
    FROM staff_profiles
    WHERE user_id = ${userId}::uuid
    LIMIT 1;
  `;

  // Tài khoản Supabase hợp lệ nhưng không phải cán bộ/TNV (ví dụ tài khoản khác) -> 401 chung.
  if (!staff) throw invalidCredentials();

  if (!staff.is_active) {
    throw new AppError('ACCOUNT_DISABLED', 'Tài khoản này đã bị tạm khoá', 403);
  }

  const token = await createStaffToken(staff.user_id, staff.role);

  return c.json({
    token,
    user: {
      id: staff.user_id,
      role: staff.role,
      displayName: staff.display_name,
      departmentId: staff.department_id,
      email: staff.email ?? email,
    },
  });
};

authRoutes.post('/login', handleStaffLogin);
authRoutes.post('/staff-login', handleStaffLogin);
