import crypto from 'node:crypto';
import { sqlClient } from '../db/client';
import { AppError } from './errorHandler';

export function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip || '127.0.0.1')
    .digest('hex');
}

/**
 * Rate limit OTP: tối đa 5 yêu cầu trong 10 phút cho mỗi số điện thoại (AC-API-7)
 */
export async function checkOtpRateLimit(phone: string): Promise<void> {
  // phone_otps tracks current active OTP, attempts column tracks failures
  const [active] = await sqlClient`
    SELECT attempts FROM phone_otps WHERE phone = ${phone} LIMIT 1;
  `;

  if (active && active.attempts >= 5) {
    throw new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Bạn đã thử sai mã OTP quá 5 lần. Vui lòng đợi 10 phút để yêu cầu lại.',
      429
    );
  }
}

/**
 * Anti-brute force cho tra cứu bí mật: tối đa 5 lần thử sai trong 15 phút (Spec 11.2, access_attempts)
 */
export async function checkLookupRateLimit(reportId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const [row] = await sqlClient`
    SELECT count(*)::int as count
    FROM access_attempts
    WHERE (report_id = ${reportId} OR ip_hash = ${ipHash})
      AND at > ${fifteenMinsAgo}::timestamptz;
  `;

  if (row && row.count >= 5) {
    throw new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Đã vượt quá số lần thử tra cứu cho phép. Vui lòng thử lại sau 15 phút.',
      429
    );
  }
}

export async function recordFailedLookup(reportId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  await sqlClient`
    INSERT INTO access_attempts (report_id, ip_hash, at)
    VALUES (${reportId}, ${ipHash}, now());
  `;
}

/**
 * Quota gửi phản ánh ẩn danh: tối đa 3 phản ánh trong 24 giờ cho mỗi device/ip (AC-DATA-5)
 */
export async function checkAnonQuota(deviceId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [row] = await sqlClient`
    SELECT count(*)::int as count
    FROM anonymous_submissions
    WHERE (device_id = ${deviceId} OR ip_hash = ${ipHash})
      AND created_at > ${oneDayAgo}::timestamptz;
  `;

  if (row && row.count >= 3) {
    throw new AppError(
      'ANON_QUOTA_EXCEEDED',
      'Thiết bị của bạn đã đạt giới hạn gửi 3 phản ánh ẩn danh trong 24 giờ. Vui lòng đăng nhập bằng số điện thoại để tiếp tục.',
      429
    );
  }
}

export async function recordAnonSubmission(deviceId: string, ip: string): Promise<void> {
  const ipHash = hashIp(ip);
  await sqlClient`
    INSERT INTO anonymous_submissions (device_id, ip_hash, created_at)
    VALUES (${deviceId}, ${ipHash}, now());
  `;
}
