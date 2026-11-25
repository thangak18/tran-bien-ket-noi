import crypto from 'node:crypto';
import type { Sql } from 'postgres';

/** Mã bí mật 4 chữ số, sinh bằng bộ sinh số ngẫu nhiên mật mã (không dùng Math.random). */
export function generateSecretCode(): string {
  return String(crypto.randomInt(1000, 10000));
}

/**
 * Mã hồ sơ tiếp theo dạng TB-0065. Phải gọi trong transaction: khoá advisory (cùng khoá với
 * POST /citizen/reports) tuần tự hoá việc sinh mã để không bao giờ trùng khi gửi đồng thời.
 */
export async function nextReportCode(tx: Sql): Promise<string> {
  await tx`SELECT pg_advisory_xact_lock(1001);`;
  const [row] = await tx`
    SELECT code FROM reports WHERE code ~ '^TB-[0-9]{4}$' ORDER BY code DESC LIMIT 1;
  `;
  let next = 65;
  if (row?.code) {
    const parsed = parseInt(String(row.code).replace('TB-', ''), 10);
    if (!isNaN(parsed)) next = parsed + 1;
  }
  return `TB-${next.toString().padStart(4, '0')}`;
}

/** Mã nhiệm vụ TNV tiếp theo dạng NV-005. Phải gọi trong transaction. */
export async function nextTaskCode(tx: Sql): Promise<string> {
  await tx`SELECT pg_advisory_xact_lock(1002);`;
  const [row] = await tx`
    SELECT code FROM volunteer_tasks WHERE code ~ '^NV-[0-9]{3,}$' ORDER BY length(code) DESC, code DESC LIMIT 1;
  `;
  let next = 5;
  if (row?.code) {
    const parsed = parseInt(String(row.code).replace('NV-', ''), 10);
    if (!isNaN(parsed)) next = parsed + 1;
  }
  return `NV-${next.toString().padStart(3, '0')}`;
}
