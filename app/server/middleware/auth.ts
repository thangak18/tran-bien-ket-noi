import { createMiddleware } from 'hono/factory';
import { jwtVerify, SignJWT } from 'jose';
import crypto from 'node:crypto';
import { env } from '../env';
import { AppError } from './errorHandler';
import { sqlClient } from '../db/client';
import type { AppEnv } from '../types';

const citizenSecretKey = new TextEncoder().encode(env.CITIZEN_JWT_SECRET);
const staffSecretKey = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

export interface CitizenTokenPayload {
  phone: string;
  role: 'citizen';
}

export type StaffRole = 'can_bo' | 'tnv' | 'admin';

export interface StaffProfile {
  userId: string;
  role: StaffRole;
  displayName: string;
  departmentId: string | null;
  isActive: boolean;
}

export async function createCitizenToken(phone: string): Promise<string> {
  return await new SignJWT({ phone, role: 'citizen' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(citizenSecretKey);
}

export async function verifyCitizenToken(token: string): Promise<CitizenTokenPayload> {
  const { payload } = await jwtVerify(token, citizenSecretKey);
  if (payload.role !== 'citizen' || typeof payload.phone !== 'string') {
    throw new AppError('UNAUTHORIZED', 'Mã xác thực người dân không hợp lệ', 401);
  }
  return { phone: payload.phone, role: 'citizen' };
}

export async function createStaffToken(userId: string, role: StaffRole): Promise<string> {
  return await new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(staffSecretKey);
}

export async function verifyStaffToken(token: string): Promise<{ sub: string; role?: string }> {
  try {
    const { payload } = await jwtVerify(token, staffSecretKey);
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new AppError('INVALID_TOKEN', 'Mã xác thực nhân viên không hợp lệ', 401);
    }
    return { sub: payload.sub, role: payload.role as string | undefined };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if ((err as { code?: string })?.code === 'ERR_JWT_EXPIRED') {
      throw new AppError(
        'TOKEN_EXPIRED',
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        401
      );
    }
    throw new AppError('INVALID_TOKEN', 'Mã xác thực nhân viên không hợp lệ', 401);
  }
}

export function hashPepper(val: string): string {
  return crypto.createHmac('sha256', env.OWNER_KEY_PEPPER).update(val).digest('hex');
}

/**
 * Middleware bắt buộc xác thực Người dân (Bearer token 30 ngày)
 */
export const requireCitizenAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Yêu cầu đăng nhập người dân', 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifyCitizenToken(token);
    c.set('citizenPhone', payload.phone);
    await next();
  } catch {
    throw new AppError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ', 401);
  }
});

/**
 * Middleware tùy chọn xác thực Người dân (nếu có token thì nạp, không thì bỏ qua)
 */
export const optionalCitizenAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyCitizenToken(token);
      c.set('citizenPhone', payload.phone);
    } catch {
      // Ignored for optional
    }
  }
  await next();
});

/**
 * Middleware bắt buộc xác thực Cán bộ / Tình nguyện viên
 */
export function requireStaffAuth(allowedRoles?: StaffRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Yêu cầu đăng nhập tài khoản cán bộ / TNV', 401);
    }
    const token = authHeader.slice(7);

    // Xác thực mã hóa nghiêm ngặt: không chấp nhận UUID thô, không chấp nhận mock token
    let staffUserId: string;
    try {
      ({ sub: staffUserId } = await verifyStaffToken(token));
    } catch (err) {
      // Token hợp lệ của người dân nhưng gọi endpoint nhân viên: đã đăng nhập, sai quyền -> 403 (AUTHZ-004).
      if (err instanceof AppError && err.code === 'INVALID_TOKEN') {
        const isCitizen = await verifyCitizenToken(token).then(
          () => true,
          () => false
        );
        if (isCitizen) {
          throw new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này', 403);
        }
      }
      throw err;
    }

    // Tra cứu staff_profiles trong DB
    const [profile] = await sqlClient`
      SELECT user_id, role, display_name, department_id, is_active
      FROM staff_profiles
      WHERE user_id = ${staffUserId}::uuid
      LIMIT 1;
    `;

    // Không có hồ sơ nhân viên hoặc đã bị khoá: cùng mã ACCOUNT_DISABLED (Spec 13.2 mục 3).
    if (!profile) {
      throw new AppError('ACCOUNT_DISABLED', 'Tài khoản không có quyền truy cập hệ thống', 403);
    }

    if (!profile.is_active) {
      throw new AppError('ACCOUNT_DISABLED', 'Tài khoản nhân viên đã bị vô hiệu hóa', 403);
    }

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      throw new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này', 403);
    }

    c.set('staff', {
      userId: profile.user_id,
      role: profile.role,
      displayName: profile.display_name,
      departmentId: profile.department_id,
      isActive: profile.is_active,
    } as StaffProfile);

    await next();
  });
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Middleware kiểm tra Cron Secret: `Authorization: Bearer <CRON_SECRET>`.
 * Đây cũng là header mà Vercel Cron tự gửi khi dự án có biến CRON_SECRET.
 */
export const requireCronSecret = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !safeEqual(token, env.CRON_SECRET)) {
    throw new AppError('UNAUTHORIZED', 'Mã bảo mật cron không hợp lệ', 401);
  }
  await next();
});
