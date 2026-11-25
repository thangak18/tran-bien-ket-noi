import crypto from 'node:crypto';
import type { Sql } from 'postgres';
import { hashPepper } from '../middleware/auth';

export interface OwnershipSubject {
  id: string;
  reporter_phone: string | null;
  owner_token_hash: string | null;
}

export interface OwnershipCredentials {
  /** Giá trị header X-Report-Key (ownerToken của hồ sơ ẩn danh hoặc đã tra cứu). */
  reportKey?: string;
  /** SĐT trong JWT người dân đã đăng nhập OTP. */
  citizenPhone?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Chủ hồ sơ (Spec 13.4) là một trong:
 *  (a) người giữ X-Report-Key khớp owner_token_hash;
 *  (b) người dân đăng nhập OTP có SĐT trùng reporter_phone;
 *  (c) SĐT là người theo dõi nguồn `reporter` hoặc `subscribe_later`.
 * Người chỉ bấm "Tôi cũng gặp" (nguồn `also_me`) KHÔNG phải chủ hồ sơ.
 */
export async function isReportOwner(
  sql: Sql,
  report: OwnershipSubject,
  creds: OwnershipCredentials
): Promise<boolean> {
  if (creds.reportKey && report.owner_token_hash) {
    if (constantTimeEqual(hashPepper(creds.reportKey), report.owner_token_hash)) return true;
  }
  if (creds.citizenPhone) {
    if (report.reporter_phone && report.reporter_phone === creds.citizenPhone) return true;
    const [row] = await sql`
      SELECT 1 FROM report_followers
      WHERE report_id = ${report.id}
        AND phone = ${creds.citizenPhone}
        AND source IN ('reporter', 'subscribe_later')
      LIMIT 1;
    `;
    if (row) return true;
  }
  return false;
}
