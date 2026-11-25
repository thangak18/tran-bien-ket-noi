// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { app } from '../../server/app';
import { sqlClient } from '../../server/db/client';
import { ensureAuthUser } from '../../scripts/lib/supabase-admin';
import { requireEnv } from '../../scripts/lib/env';

const CB_EMAIL = 'cb.minh@tranbien.gov.vn';
const TNV_EMAIL = 'tnv.mai@tranbien.gov.vn';
const CITIZEN_EMAIL = 'nguoi.dan.thu@example.com';
const DISABLED_EMAIL = 'nv.khoa.dang.nhap@tranbien.gov.vn';
const DISABLED_ID = '88888888-8888-8888-8888-888888888888';
const GENERIC_MESSAGE = 'Email hoặc mật khẩu không chính xác';

async function login(body: unknown) {
  return app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('LOGIN: Đăng nhập nhân viên qua Supabase Auth (Spec 13.2)', () => {
  let seedPassword: string;
  const wrongPassword = `Sai-${crypto.randomBytes(8).toString('hex')}!1`;
  const disabledPassword = `Kh-${crypto.randomBytes(8).toString('hex')}!1`;
  const citizenPassword = `Nd-${crypto.randomBytes(8).toString('hex')}!1`;

  beforeAll(async () => {
    seedPassword = requireEnv('SEED_STAFF_PASSWORD');

    // Tài khoản Supabase của người dân: có mật khẩu đúng nhưng KHÔNG có staff_profiles.
    await ensureAuthUser({ email: CITIZEN_EMAIL, password: citizenPassword });

    // Nhân viên bị khoá: mật khẩu đúng nhưng is_active = false.
    await ensureAuthUser({ id: DISABLED_ID, email: DISABLED_EMAIL, password: disabledPassword });
    await sqlClient`
      INSERT INTO staff_profiles (user_id, email, role, display_name, department_id, is_active)
      VALUES (${DISABLED_ID}, ${DISABLED_EMAIL}, 'tnv', 'Nhân viên bị khoá', NULL, false)
      ON CONFLICT (user_id) DO UPDATE SET is_active = false;
    `;
  });

  afterAll(async () => {
    // Xoá tài khoản thử (staff_profiles bị xoá theo qua ON DELETE CASCADE).
    await sqlClient`DELETE FROM auth.users WHERE email IN (${CITIZEN_EMAIL}, ${DISABLED_EMAIL});`;
  });

  it('LOGIN-001: đúng email và mật khẩu của cán bộ -> 200, role lấy từ DB, token dùng được', async () => {
    const res = await login({ email: CB_EMAIL, password: seedPassword });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.token).toBe('string');
    expect(data.user.role).toBe('can_bo');
    expect(data.user.email).toBe(CB_EMAIL);
    expect(JSON.stringify(data)).not.toContain(seedPassword);

    const officer = await app.request('/api/v1/officer/reports?limit=1', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(officer.status).toBe(200);
  });

  it('LOGIN-002: đăng nhập đúng của TNV -> role tnv, vào được /volunteer nhưng /officer bị 403', async () => {
    const res = await login({ email: TNV_EMAIL, password: seedPassword });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe('tnv');

    const vol = await app.request('/api/v1/volunteer/tasks', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(vol.status).toBe(200);
    const off = await app.request('/api/v1/officer/reports', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(off.status).toBe(403);
  });

  it('LOGIN-003: sai mật khẩu -> 401 INVALID_CREDENTIALS, không cấp token', async () => {
    const res = await login({ email: CB_EMAIL, password: wrongPassword });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.token).toBeUndefined();
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
    expect(data.error.message).toBe(GENERIC_MESSAGE);
  });

  it('LOGIN-004: thiếu mật khẩu hoặc mật khẩu rỗng -> 401 (không phải 400/404), cùng thông báo chung', async () => {
    for (const body of [
      { email: CB_EMAIL },
      { email: CB_EMAIL, password: '' },
      { email: CB_EMAIL, password: null },
      {},
    ]) {
      const res = await login(body);
      expect(res.status, JSON.stringify(body)).toBe(401);
      const data = await res.json();
      expect(data.token).toBeUndefined();
      expect(data.error.message).toBe(GENERIC_MESSAGE);
    }
    const notJson = await app.request('/api/v1/auth/login', {
      method: 'POST',
      body: 'khong-phai-json',
    });
    expect(notJson.status).toBe(401);
  });

  it('LOGIN-005: email không tồn tại -> 401 và phản hồi giống hệt sai mật khẩu (không lộ email)', async () => {
    const unknown = await login({
      email: 'khong.ton.tai@tranbien.gov.vn',
      password: wrongPassword,
    });
    const wrong = await login({ email: CB_EMAIL, password: wrongPassword });
    expect(unknown.status).toBe(401);
    const a = await unknown.json();
    const b = await wrong.json();
    expect(a.error.code).toBe(b.error.code);
    expect(a.error.message).toBe(b.error.message);
  });

  it('LOGIN-006: tài khoản người dân (đúng mật khẩu nhưng không phải nhân viên) -> 401 chung', async () => {
    const res = await login({ email: CITIZEN_EMAIL, password: citizenPassword });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.token).toBeUndefined();
    expect(data.error.message).toBe(GENERIC_MESSAGE);
  });

  it('LOGIN-007: cách đăng nhập cũ không còn hiệu lực (chỉ role, chuỗi con của email, không mật khẩu)', async () => {
    const attempts = [
      { role: 'can_bo' },
      { role: 'tnv', email: 'tnv.mai@tranbien.gov.vn' },
      { email: 'can_bo' },
      { email: 'cb.bat.ky@x.vn' },
      { email: 'minh' },
    ];
    for (const body of attempts) {
      const res = await login(body);
      expect(res.status, JSON.stringify(body)).toBe(401);
      const data = await res.json();
      expect(data.token).toBeUndefined();
    }
  });

  it('LOGIN-008: tài khoản bị khoá, mật khẩu đúng -> 403 ACCOUNT_DISABLED', async () => {
    const res = await login({ email: DISABLED_EMAIL, password: disabledPassword });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error.code).toBe('ACCOUNT_DISABLED');
    expect(data.token).toBeUndefined();
  });

  it('LOGIN-009: /auth/staff-login (đường dẫn cũ) áp dụng cùng quy tắc', async () => {
    const res = await app.request('/api/v1/auth/staff-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CB_EMAIL, password: wrongPassword }),
    });
    expect(res.status).toBe(401);
  });
});
