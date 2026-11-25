/**
 * @vitest-environment node
 */
// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../server/app';
import { env } from '../../server/env';
import { createStaffToken } from '../../server/middleware/auth';

describe('API Contract & Security Suite', () => {
  beforeAll(async () => {
    // Ensure test environment is loaded
  });

  describe('API-001: Health & Request ID', () => {
    it('GET /health should return 200 and X-Request-Id header', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('Trấn Biên Kết Nối API');
      expect(res.headers.get('X-Request-Id')).toBeDefined();
    });

    it('GET /api/health should also work with /api prefix', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
    });
  });

  describe('API-PUB: Public Endpoints & Privacy Leaks', () => {
    it('API-PUB-001: GET /public/reports should return reports list', async () => {
      const res = await app.request('/public/reports?limit=10');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.limit).toBe(10);
    });

    it('LEAK-001: Public reports MUST NEVER leak reporterPhone or secretCode', async () => {
      const res = await app.request('/public/reports?limit=64');
      const text = await res.text();
      // Kiểm tra không chứa số điện thoại đầy đủ 0909000068
      expect(text).not.toContain('0909000068');
      expect(text).not.toContain('secretCode');
      expect(text).not.toContain('secret_code_hash');
      expect(text).not.toContain('owner_token_hash');
    });

    it('API-PUB-002: GET /public/reports/TB-0001 should return detail with sanitized timeline', async () => {
      const res = await app.request('/public/reports/TB-0001');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe('TB-0001');
      expect(data.category).toBe('rac_thai');
      expect(data.status).toBe('dong');
      expect(Array.isArray(data.timeline)).toBe(true);

      // Verify sanitized timeline actors
      for (const item of data.timeline) {
        expect(['Người dân', 'Phường Trấn Biên', 'Tình nguyện viên']).toContain(item.actor);
      }
    });

    it('API-PUB-003: GET /public/kpi should return exact verified numbers', async () => {
      const res = await app.request('/public/kpi?seed=true');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(64);
      expect(data.resolved).toBe(47);
      expect(data.overdue).toBe(2);
      expect(data.avgResolutionDays).toBe(3.2);
      expect(data.byCategory.den_duong).toBe(18);
      expect(data.byCategory.ngap_nuoc).toBe(15);
      expect(data.byCategory.rac_thai).toBe(21);
      expect(data.byCategory.mat_duong).toBe(10);
    });

    it('API-PUB-004: GET /public/config should return ward config and simulation badge', async () => {
      const res = await app.request('/public/config');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ward.name).toBe('Phường Trấn Biên');
      expect(data.simulationBadge).toBe('Mô phỏng');
      expect(data.demoMode).toBe(true);
    });

    it('GET /public/recent-results should return 5 resolved reports with photos', async () => {
      const res = await app.request('/public/recent-results');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('API-CIT: Citizen Endpoints & Auth', () => {
    it('API-CIT-001: OTP flow: request -> verify -> receive JWT', async () => {
      const testPhone = `090${Math.floor(1000000 + Math.random() * 8999999)}`;

      // 1. Request OTP
      const reqRes = await app.request('/citizen/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });
      expect(reqRes.status).toBe(200);
      const reqData = await reqRes.json();
      expect(reqData.success).toBe(true);
      expect(reqData.simulation).toBe(true);

      // 2. Verify with wrong OTP
      const wrongRes = await app.request('/citizen/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, code: '999999' }),
      });
      expect(wrongRes.status).toBe(400);

      // 3. Verify with correct mock OTP
      const verifyRes = await app.request('/citizen/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, code: '123456' }),
      });
      expect(verifyRes.status).toBe(200);
      const verifyData = await verifyRes.json();
      expect(verifyData.token).toBeDefined();
      expect(verifyData.phone).toBe(testPhone);
      expect(verifyData.expiresIn).toBe('30d');
    });

    it('API-CIT-002: Anonymous report submission generates 4-digit secretCode and ownerToken', async () => {
      const randIp = `10.50.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200) + 1}`;
      const res = await app.request('/citizen/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': `test-device-${Date.now()}`,
          'x-forwarded-for': randIp,
        },
        body: JSON.stringify({
          category: 'den_duong',
          lat: 10.952,
          lng: 106.824,
          address: 'Gần chợ Biên Hòa',
          description: 'Đèn đường chập chờn lúc sáng lúc tắt',
          photos: ['/demo-photos/den_duong/1.jpg'],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.code).toMatch(/^TB-[0-9]{4}$/);
      expect(data.secretCode).toMatch(/^[0-9]{4}$/);
      expect(data.ownerToken).toBeDefined();
    });

    it('API-CIT-003: Lookup report by secret code', async () => {
      const randIp = `10.50.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200) + 1}`;
      // Create report first
      const createRes = await app.request('/citizen/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': `test-lookup-${Date.now()}`,
          'x-forwarded-for': randIp,
        },
        body: JSON.stringify({
          category: 'rac_thai',
          lat: 10.951,
          lng: 106.822,
          address: 'Bờ kè sông Đồng Nai',
          photos: [],
        }),
      });
      expect(createRes.status).toBe(201);
      const created = await createRes.json();

      // Lookup with wrong secret code
      const wrongRes = await app.request(
        `/citizen/reports/lookup?code=${created.code}&secretCode=0000`,
        { headers: { 'x-forwarded-for': randIp } }
      );
      expect(wrongRes.status).toBe(400);

      // Lookup with correct secret code
      const lookupRes = await app.request(
        `/citizen/reports/lookup?code=${created.code}&secretCode=${created.secretCode}`,
        { headers: { 'x-forwarded-for': '10.10.10.3' } }
      );
      expect(lookupRes.status).toBe(200);
      const lookupData = await lookupRes.json();
      expect(lookupData.id).toBe(created.code);
      expect(lookupData.ownerToken).toBeDefined();
    });
  });

  describe('API-VOL & API-OFF: Staff Access & Masking', () => {
    it('API-VOL-001: Volunteer tasks endpoint returns tasks with masked reporter phone', async () => {
      const tnvToken = await createStaffToken('22222222-2222-2222-2222-222222222222', 'tnv');
      const res = await app.request('/volunteer/tasks', {
        headers: { Authorization: `Bearer ${tnvToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);

      for (const t of data.items) {
        if (t.reporterPhone) {
          expect(t.reporterPhone).toContain('***');
          expect(t.reporterPhone).not.toMatch(/^0[0-9]{9}$/);
        }
      }
    });

    it('API-OFF-001: Officer reports endpoint requires officer auth and masks phone', async () => {
      // Without auth
      const noAuth = await app.request('/officer/reports');
      expect(noAuth.status).toBe(401);

      // With auth
      const staffToken = await createStaffToken('11111111-1111-1111-1111-111111111111', 'can_bo');
      const res = await app.request('/officer/reports?limit=5', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);

      for (const r of data.items) {
        if (r.reporterPhone) {
          expect(r.reporterPhone).toContain('***');
        }
      }
    });
  });

  describe('CRON & Photo Uploads', () => {
    it('CRON-001: POST /cron/sweep-overdue requires secret and identifies overdue reports', async () => {
      // Without secret
      const noSecret = await app.request('/cron/sweep-overdue', { method: 'POST' });
      expect(noSecret.status).toBe(401);

      // With secret
      const res = await app.request('/cron/sweep-overdue', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.overdueCount).toBe(2);
    });

    it('PHOTO-001: POST /uploads/sign validates mime type and size', async () => {
      // Invalid mime type
      const badMime = await app.request('/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'application/pdf', sizeBytes: 1000 }),
      });
      expect(badMime.status).toBe(400);

      // File too large (> 10MB)
      const tooLarge = await app.request('/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'image/jpeg', sizeBytes: 15 * 1024 * 1024 }),
      });
      expect(tooLarge.status).toBe(400);

      // Valid image
      const valid = await app.request('/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'image/jpeg', sizeBytes: 500 * 1024 }),
      });
      expect(valid.status).toBe(200);
      const data = await valid.json();
      expect(data.path).toMatch(/^reports\/\d{4}\/\d{2}\/.*\.jpg$/);
      expect(data.uploadUrl).toBeDefined();
    });
  });
});
