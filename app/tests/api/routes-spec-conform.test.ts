// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../server/app';
import { createStaffToken } from '../../server/middleware/auth';
import crypto from 'node:crypto';

describe('Spec 12 Route Conformance Test Suite (/api/v1)', () => {
  let officerToken: string;
  let volunteerToken: string;
  let citizenToken: string;

  beforeAll(async () => {
    // Tạo token cho cán bộ hợp lệ từ DB
    officerToken = await createStaffToken('11111111-1111-1111-1111-111111111111', 'can_bo');

    // Tạo token cho tình nguyện viên hợp lệ từ DB
    volunteerToken = await createStaffToken('22222222-2222-2222-2222-222222222222', 'tnv');

    // Tạo token cho người dân qua OTP endpoint
    const reqRes = await app.request('/api/v1/citizen/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0901234567' }),
    });
    expect(reqRes.status).toBe(200);

    const verifyRes = await app.request('/api/v1/citizen/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '0901234567', code: '123456' }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    citizenToken = verifyData.token;
  });

  describe('12.2 Public Endpoints', () => {
    it('GET /api/v1/public/config trả về cấu hình phường', async () => {
      const res = await app.request('/api/v1/public/config');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ward).toBeDefined();
      expect(data.categories).toBeDefined();
    });

    it('GET /api/v1/public/reports trả về danh sách phản ánh', async () => {
      const res = await app.request('/api/v1/public/reports?limit=5');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.reports || data.items)).toBe(true);
    });

    it('GET /api/v1/public/reports/:code trả về chi tiết công khai (không lộ SĐT)', async () => {
      const res = await app.request('/api/v1/public/reports/TB-0001');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.code).toBe('TB-0001');
      expect(data.reporterPhone).toBeUndefined();
      expect(data.reporter_phone).toBeUndefined();
      expect(data.secretCode).toBeUndefined();
    });

    it('GET /api/v1/public/kpi trả về KPI trực tiếp từ DB', async () => {
      const res = await app.request('/api/v1/public/kpi?month=2026-11');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeGreaterThanOrEqual(64);
      expect(data.resolved).toBeGreaterThanOrEqual(47);
    });

    it('GET /api/v1/public/recent-results trả về kết quả trước/sau gần nhất', async () => {
      const res = await app.request('/api/v1/public/recent-results?limit=3');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('12.3 Citizen Endpoints', () => {
    let createdCode: string;
    let createdSecretCode: string;
    let validOwnerToken: string;

    it('POST /api/v1/reports tạo phản ánh mới và trả secretCode + ownerToken', async () => {
      const idempotencyKey = crypto.randomUUID();
      const testDeviceId = `dev-test-${crypto.randomUUID()}`;
      const res = await app.request('/api/v1/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'X-Device-Id': testDeviceId,
          'x-forwarded-for': '127.0.0.88',
        },
        body: JSON.stringify({
          category: 'den_duong',
          lat: 10.952,
          lng: 106.821,
          address: '100 Nguyễn Văn Trị',
          description: 'Đèn đường chập chờn ban đêm',
          anonymous: true,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.code).toMatch(/^TB-[0-9]{4}$/);
      expect(data.secretCode).toBeDefined();
      expect(data.ownerToken).toBeDefined();
      createdCode = data.code;
      createdSecretCode = data.secretCode;
      validOwnerToken = data.ownerToken;
    });

    it('POST /api/v1/reports/lookup tra cứu bằng proof mã bí mật trả về ownerToken', async () => {
      const res = await app.request('/api/v1/reports/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createdCode,
          proof: createdSecretCode,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ownerToken).toBeDefined();
      validOwnerToken = data.ownerToken; // Cập nhật token mới nhất được cấp
    });

    it('GET /api/v1/reports/:code/owner với X-Report-Key trả về chi tiết chủ sở hữu', async () => {
      const res = await app.request(`/api/v1/reports/${createdCode}/owner`, {
        headers: {
          'X-Report-Key': validOwnerToken,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.code).toBe(createdCode);
      expect(data.isOwner).toBe(true);
    });

    it('GET /api/v1/me/reports với token người dân', async () => {
      const res = await app.request('/api/v1/me/reports', {
        headers: {
          Authorization: `Bearer ${citizenToken}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('GET /api/v1/me/notifications với token người dân', async () => {
      const res = await app.request('/api/v1/me/notifications', {
        headers: {
          Authorization: `Bearer ${citizenToken}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('12.4 Officer Endpoints', () => {
    it('GET /api/v1/officer/reports trả về danh sách cho cán bộ', async () => {
      const res = await app.request('/api/v1/officer/reports', {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('GET /api/v1/officer/kpi trả về KPI nội bộ với quá hạn và sắp đến hạn', async () => {
      const res = await app.request('/api/v1/officer/kpi', {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeDefined();
      expect(data.resolved).toBeDefined();
      expect(data.overdue).toBeDefined();
      expect(data.dueSoon).toBeDefined();
    });

    it('GET /api/v1/officer/volunteers trả về danh sách TNV', async () => {
      const res = await app.request('/api/v1/officer/volunteers', {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('12.5 Volunteer Endpoints', () => {
    it('GET /api/v1/volunteer/tasks trả về danh sách nhiệm vụ', async () => {
      const res = await app.request('/api/v1/volunteer/tasks', {
        headers: { Authorization: `Bearer ${volunteerToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    });
  });
});
