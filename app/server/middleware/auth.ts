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

export interface StaffProfile {
  userId: string;
  role: 'can_bo' | 'tnv';
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

export async function createStaffToken(userId: string, role: 'can_bo' | 'tnv'): Promise<string> {
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
      throw new AppError('UNAUTHORIZED', 'Mã xác thực nhân viên không hợp lệ', 401);
    }
    return { sub: payload.sub, role: payload.role as string | undefined };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('UNAUTHORIZED', 'Mã xác thực nhân viên không hợp lệ hoặc đã hết hạn', 401);
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
export function requireStaffAuth(allowedRoles?: ('can_bo' | 'tnv')[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Yêu cầu đăng nhập tài khoản cán bộ / TNV', 401);
    }
    const token = authHeader.slice(7);

    // Xác thực mã hóa nghiêm ngặt: không chấp nhận UUID thô, không chấp nhận mock token
    const { sub: staffUserId } = await verifyStaffToken(token);

    // Tra cứu staff_profiles trong DB
    const [profile] = await sqlClient`
      SELECT user_id, role, display_name, department_id, is_active
      FROM staff_profiles
      WHERE user_id = ${staffUserId}::uuid
      LIMIT 1;
    `;

    if (!profile) {
      throw new AppError('FORBIDDEN', 'Tài khoản nhân viên không tồn tại trong hệ thống', 403);
    }

    if (!profile.is_active) {
      throw new AppError('INACTIVE_STAFF', 'Tài khoản nhân viên đã bị vô hiệu hóa', 403);
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

/**
 * Middleware kiểm tra Cron Secret
 */
export const requireCronSecret = createMiddleware(async (c, next) => {
  const secret = c.req.header('X-Cron-Secret');
  if (!secret || secret !== env.CRON_SECRET) {
    throw new AppError('UNAUTHORIZED', 'Mã bảo mật cron không hợp lệ', 401);
  }
  await next();
});
