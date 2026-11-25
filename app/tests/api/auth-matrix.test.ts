// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import { app } from '../../server/app';
import { env } from '../../server/env';
import { createCitizenToken, createStaffToken } from '../../server/middleware/auth';
import { sqlClient } from '../../server/db/client';
import { ensureAuthUser } from '../../scripts/lib/supabase-admin';
import crypto from 'node:crypto';

describe('L1: Auth Matrix & Privilege Escalation Prevention (Spec 13.5)', () => {
  afterAll(async () => {
    await sqlClient`DELETE FROM auth.users WHERE email = 'nv.bi.khoa@tranbien.gov.vn';`;
  });

  it('AUTH-001: Rejects missing Authorization header with 401', async () => {
    const res = await app.request('/officer/reports');
    expect(res.status).toBe(401);
  });

  it('AUTH-002: Rejects raw UUID string (e.g. Bearer 11111111-...) with 401', async () => {
    const res = await app.request('/officer/reports', {
      headers: { Authorization: 'Bearer 11111111-1111-1111-1111-111111111111' },
    });
    expect(res.status).toBe(401);
  });

  it('AUTH-003: Rejects mock tokens (e.g. Bearer can_bo_anything) with 401', async () => {
    const res = await app.request('/officer/kpi', {
      headers: { Authorization: 'Bearer can_bo_anything' },
    });
    expect(res.status).toBe(401);

    const res2 = await app.request('/officer/kpi', {
      headers: { Authorization: 'Bearer mock_can_bo' },
    });
    expect(res2.status).toBe(401);
  });

  it('AUTH-004: Rejects JWT with invalid signature with 401', async () => {
    const fakeSecret = new TextEncoder().encode('wrong-secret-key-that-is-at-least-32-chars-long!');
    const forgedToken = await new SignJWT({
      sub: '11111111-1111-1111-1111-111111111111',
      role: 'can_bo',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(fakeSecret);

    const res = await app.request('/officer/reports', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('AUTH-005: Rejects expired JWT with 401', async () => {
    const secretKey = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const expiredToken = await new SignJWT({
      sub: '11111111-1111-1111-1111-111111111111',
      role: 'can_bo',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
      .sign(secretKey);

    const res = await app.request('/officer/reports', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(res.status).toBe(401);
  });

  it('AUTH-006: Citizen token calling officer endpoint is rejected with 403 (AUTHZ-004)', async () => {
    const citizenToken = await createCitizenToken('0901234567');
    const res = await app.request('/officer/reports', {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('AUTH-007: Volunteer calling officer endpoint is rejected with 403 (FORBIDDEN)', async () => {
    // 22222222-2222-2222-2222-222222222222 is volunteer Tran Thi Mai
    const volunteerToken = await createStaffToken('22222222-2222-2222-2222-222222222222', 'tnv');
    const res = await app.request('/officer/reports', {
      headers: { Authorization: `Bearer ${volunteerToken}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.message).toContain('không có quyền');
  });

  it('AUTH-008: Disabled staff calling endpoint is rejected with 403 (ACCOUNT_DISABLED)', async () => {
    // Create or disable a test staff
    const disabledStaffId = '99999999-9999-9999-9999-999999999999';
    // staff_profiles.user_id tham chiếu auth.users (Spec 11) nên phải có user Supabase Auth thật.
    await ensureAuthUser({
      id: disabledStaffId,
      email: 'nv.bi.khoa@tranbien.gov.vn',
      password: `Kh${crypto.randomUUID()}!1`,
    });
    await sqlClient`
      INSERT INTO staff_profiles (user_id, email, role, display_name, department_id, is_active)
      VALUES (${disabledStaffId}, 'nv.bi.khoa@tranbien.gov.vn', 'can_bo', 'Nhan Vien Bi Khoa', 'kinh_te', false)
      ON CONFLICT (user_id) DO UPDATE SET is_active = false;
    `;

    const disabledToken = await createStaffToken(disabledStaffId, 'can_bo');
    const res = await app.request('/officer/reports', {
      headers: { Authorization: `Bearer ${disabledToken}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.message).toContain('vô hiệu hóa');
  });

  it('AUTH-009: Valid officer token successfully accesses officer endpoints with 200', async () => {
    const officerToken = await createStaffToken('11111111-1111-1111-1111-111111111111', 'can_bo');
    const res = await app.request('/officer/reports?limit=1', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    expect(res.status).toBe(200);
  });
});
