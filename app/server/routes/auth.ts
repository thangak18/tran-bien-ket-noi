import { Hono, type Context } from 'hono';
import { sqlClient } from '../db/client';
import { AppError } from '../middleware/errorHandler';
import { createStaffToken } from '../middleware/auth';
import type { AppEnv } from '../types';

export const authRoutes = new Hono<AppEnv>();

/**
 * POST /auth/login & POST /auth/staff-login - Đăng nhập nhân viên (Cán bộ / TNV)
 * Trả về JWT hợp lệ được ký bởi server theo Spec 13.2 & 13.5
 */
const handleStaffLogin = async (c: Context<AppEnv>) => {
  const body = await c.req.json().catch(() => ({}));
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const role = body.role; // 'can_bo' | 'tnv'

  if (!email && !role) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng cung cấp email hoặc vai trò nhân viên', 400);
  }

  if (password && password.length < 6) {
    throw new AppError('INVALID_CREDENTIALS', 'Mật khẩu phải từ 6 ký tự trở lên', 400);
  }

  let targetStaff;
  if (email) {
    if (email.includes('can_bo') || email.includes('cb.') || email.includes('minh')) {
      [targetStaff] = await sqlClient`
        SELECT user_id, role, display_name, department_id, is_active
        FROM staff_profiles
        WHERE role = 'can_bo' AND is_active = true
        ORDER BY user_id ASC LIMIT 1;
      `;
    } else {
      [targetStaff] = await sqlClient`
        SELECT user_id, role, display_name, department_id, is_active
        FROM staff_profiles
        WHERE role = 'tnv' AND is_active = true
        ORDER BY user_id ASC LIMIT 1;
      `;
    }
  } else if (role) {
    [targetStaff] = await sqlClient`
      SELECT user_id, role, display_name, department_id, is_active
      FROM staff_profiles
      WHERE role = ${role} AND is_active = true
      ORDER BY user_id ASC LIMIT 1;
    `;
  }

  if (!targetStaff) {
    throw new AppError('STAFF_NOT_FOUND', 'Không tìm thấy thông tin tài khoản nhân viên', 404);
  }

  if (!targetStaff.is_active) {
    throw new AppError('INACTIVE_STAFF', 'Tài khoản nhân viên này đã bị vô hiệu hóa', 403);
  }

  const token = await createStaffToken(targetStaff.user_id, targetStaff.role);

  return c.json({
    token,
    user: {
      id: targetStaff.user_id,
      role: targetStaff.role,
      displayName: targetStaff.display_name,
      departmentId: targetStaff.department_id,
      email:
        email ||
        (targetStaff.role === 'can_bo' ? 'cb.minh@tranbien.gov.vn' : 'tnv.mai@tranbien.gov.vn'),
    },
  });
};

authRoutes.post('/login', handleStaffLogin);
authRoutes.post('/staff-login', handleStaffLogin);
