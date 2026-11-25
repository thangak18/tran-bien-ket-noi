// @vitest-environment node
// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../server/app';
import { sqlClient } from '../../server/db/client';
import { createCitizenToken, createStaffToken, hashPepper } from '../../server/middleware/auth';
import crypto from 'node:crypto';

describe('L7: Security, Privacy & Anti-Abuse Test Suite', () => {
  let tnvToken: string;

  beforeAll(async () => {
    // Cấp token cho TNV seeded
    tnvToken = await createStaffToken('22222222-2222-2222-2222-222222222222', 'tnv');
  });

  describe('1. Privacy & Zero-Leakage Checks', () => {
    it('LEAK-PUB: Public report list and detail MUST NEVER leak sensitive fields', async () => {
      // 1. List
      const listRes = await app.request('/api/v1/public/reports?limit=10');
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(Array.isArray(listData.items)).toBe(true);

      for (const item of listData.items) {
        expect(item.reporterPhone).toBeUndefined();
        expect(item.reporter_phone).toBeUndefined();
        expect(item.secretCode).toBeUndefined();
        expect(item.secret_code).toBeUndefined();
        expect(item.ownerToken).toBeUndefined();
        expect(item.owner_token).toBeUndefined();
        expect(item.secret_code_hash).toBeUndefined();
        expect(item.owner_token_hash).toBeUndefined();
      }

      // 2. Detail
      const detailRes = await app.request('/api/v1/public/reports/TB-0001');
      expect(detailRes.status).toBe(200);
      const detail = await detailRes.json();
      expect(detail.reporterPhone).toBeUndefined();
      expect(detail.secretCode).toBeUndefined();
      expect(detail.ownerToken).toBeUndefined();
      expect(detail.secret_code_hash).toBeUndefined();
    });

    it('LEAK-VON: Volunteer tasks MUST NOT expose citizen phone numbers or secret codes', async () => {
      // 1. List tasks
      const listRes = await app.request('/api/v1/volunteer/tasks', {
        headers: { Authorization: `Bearer ${tnvToken}` },
      });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(Array.isArray(listData.items)).toBe(true);

      for (const t of listData.items) {
        expect(t.reporterPhone).toBeUndefined();
        expect(t.reporter_phone).toBeUndefined();
        expect(t.secretCode).toBeUndefined();
        expect(t.secret_code).toBeUndefined();
        expect(t.ownerToken).toBeUndefined();
      }

      // 2. Detail task if available
      if (listData.items.length > 0) {
        const taskId = listData.items[0].id;
        const detailRes = await app.request(`/api/v1/volunteer/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${tnvToken}` },
        });
        expect(detailRes.status).toBe(200);
        const detail = await detailRes.json();
        expect(detail.reporterPhone).toBeUndefined();
        expect(detail.secretCode).toBeUndefined();
        expect(detail.ownerToken).toBeUndefined();
      }
    });
  });

  describe('2. Anti-Brute Force Protection', () => {
    it('BRUTE-LOOKUP: 5 failed secret code lookups from same IP triggers 429 TOO_MANY_ATTEMPTS', async () => {
      const testIp = `10.99.1.${Math.floor(Math.random() * 200 + 10)}`;
      const targetCode = 'TB-0001';

      // 5 lần thử sai liên tiếp
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/v1/citizen/reports/lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({
            code: targetCode,
            proof: '999999', // Sai mã
          }),
        });
        // 4 lần đầu hoặc lần 5 trả về 400 INVALID_SECRET
        expect([400, 429]).toContain(res.status);
      }

      // Lần thứ 6: Bị chặn hoàn toàn với 429 TOO_MANY_ATTEMPTS
      const blockedRes = await app.request('/api/v1/citizen/reports/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          code: targetCode,
          proof: '999999',
        }),
      });

      expect(blockedRes.status).toBe(429);
      const blockedData = await blockedRes.json();
      expect(blockedData.error?.code).toBe('TOO_MANY_ATTEMPTS');
    });

    it('RATE-OTP: Max 5 OTP requests per phone per hour triggers 429 TOO_MANY_ATTEMPTS', async () => {
      const testPhone = `099999${Math.floor(1000 + Math.random() * 9000)}`;

      // 5 lần gửi OTP
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/v1/citizen/otp/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: testPhone }),
        });
        expect(res.status).toBe(200);
      }

      // Lần thứ 6 trong vòng 1 giờ: Chặn 429
      const blockedRes = await app.request('/api/v1/citizen/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });

      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.error?.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('3. Rate Limiting & Abuse Prevention', () => {
    it('ANON-REJECT: gửi ẩn danh (không token, anonymous: true) bị từ chối 401, không tạo hồ sơ (spec v3.0 D1)', async () => {
      const [before] = await sqlClient`SELECT count(*)::int AS n FROM reports`;
      const res = await app.request('/api/v1/citizen/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': `device-anon-${crypto.randomUUID()}`,
          'Idempotency-Key': `idem-anon-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'den_duong',
          address: 'Hẻm 12 Huỳnh Văn Nghệ, P. Trấn Biên',
          lat: 10.9555,
          lng: 106.8255,
          anonymous: true,
        }),
      });
      expect(res.status).toBe(401);
      expect((await res.json()).error?.code).toBe('CITIZEN_LOGIN_REQUIRED');
      const [after] = await sqlClient`SELECT count(*)::int AS n FROM reports`;
      expect(after?.n).toBe(before?.n);
    });
    it('FOLLOW-001: "Tôi cũng gặp" không có token → 401 CITIZEN_LOGIN_REQUIRED', async () => {
      const res = await app.request('/api/v1/citizen/reports/TB-0002/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': `dev-${Date.now()}` },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
      expect((await res.json()).error?.code).toBe('CITIZEN_LOGIN_REQUIRED');
    });
    it('FOLLOW-002: cùng SĐT bấm 2 lần → lần 2 alreadyFollowed, số người cùng báo không đổi; người gửi → 403', async () => {
      const phone = `09${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
      const token = await createCitizenToken(phone);
      const follow = async (t: string) => {
        const res = await app.request('/api/v1/citizen/reports/TB-0002/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({}),
        });
        return { status: res.status, data: await res.json() };
      };
      try {
        const first = await follow(token);
        expect(first.status).toBe(200);
        expect(first.data.alreadyFollowed).toBe(false);
        const second = await follow(token);
        expect(second.status).toBe(200);
        expect(second.data.alreadyFollowed).toBe(true);
        expect(second.data.followerCount).toBe(first.data.followerCount);

        const [owner] = await sqlClient`SELECT reporter_phone FROM reports WHERE code = 'TB-0002'`;
        if (owner?.reporter_phone) {
          const self = await follow(await createCitizenToken(String(owner.reporter_phone)));
          expect(self.status).toBe(403);
        }
      } finally {
        await sqlClient`
          DELETE FROM report_followers
          WHERE phone = ${phone}
            AND report_id = (SELECT id FROM reports WHERE code = 'TB-0002');
        `;
      }
    });
    it('RATE-RATING: Submitting feedback twice on the same report is blocked with ALREADY_RATED', async () => {
      // Tạo một phản ánh mới ở trạng thái hoan_thanh để test feedback
      const testCode = `TB-RATE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const [inserted] = await sqlClient`
        INSERT INTO reports (
          code, category, status, priority, location, address,
          created_at, completed_at, anonymous, photos_approved, is_seed, version,
          secret_code_hash, owner_token_hash
        ) VALUES (
          ${testCode}, 'den_duong', 'hoan_thanh', 'binh_thuong',
          ST_GeographyFromText('POINT(106.8225 10.9505)'), 'Đường 30/4',
          now() - interval '2 days', now() - interval '1 hour', false, true, false, 1,
          ${hashPepper('1234')}, ${hashPepper('token123')}
        )
        RETURNING id, code;
      `;

      expect(inserted).toBeDefined();

      // Lần 1: Đánh giá thành công
      const fb1 = await app.request(`/api/v1/citizen/reports/${inserted!.code}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Report-Key': 'token123' },
        body: JSON.stringify({
          resolved: true,
          rating: 5,
          tags: ['Xử lý nhanh'],
          comment: 'Rất hài lòng',
        }),
      });
      expect(fb1.status).toBe(200);

      // Lần 2: Thử đánh giá lại -> Bị chặn 400 ALREADY_RATED
      const fb2 = await app.request(`/api/v1/citizen/reports/${inserted!.code}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Report-Key': 'token123' },
        body: JSON.stringify({
          resolved: true,
          rating: 4,
          tags: ['Nhiệt tình'],
        }),
      });
      expect(fb2.status).toBe(400);
      const data2 = await fb2.json();
      expect(data2.error?.code).toBe('ALREADY_RATED');
    });
  });
});
