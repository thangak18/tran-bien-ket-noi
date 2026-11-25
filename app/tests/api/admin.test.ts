// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { app } from '../../server/app';
import { sqlClient } from '../../server/db/client';
import { createStaffToken } from '../../server/middleware/auth';
import { createAuthUser, deleteAuthUser } from '../../scripts/lib/supabase-admin';
import { CB_ID, TNV_MAI_ID, findSensitiveLeaks } from './helpers';

let adminId = '';
const ADMIN_EMAIL = `admin-test-${crypto.randomUUID()}@example.test`;
let adminToken = '';
let officerToken = '';
let volunteerToken = '';
let adminSchemaReady = false;

async function adminRequest(
  token: string | null,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: Record<string, unknown> }> {
  const response = await app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: (await response.json().catch(() => ({}))) as Record<string, unknown>,
  };
}

describe('ADMIN: API quản trị, phân quyền và audit log (Spec 14)', () => {
  beforeAll(async () => {
    const [migration] = await sqlClient`
      SELECT to_regclass('public.admin_audit_log') IS NOT NULL AS has_audit_table,
        EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'staff_role' AND e.enumlabel = 'admin'
        ) AS has_admin_role;
    `;
    if (!migration?.has_audit_table || !migration?.has_admin_role) {
      console.warn(
        'ADMIN integration tests skipped: chưa áp dụng migration Admin trên cơ sở dữ liệu.'
      );
      return;
    }
    adminSchemaReady = true;
    adminId = await createAuthUser({
      email: ADMIN_EMAIL,
      password: `Admin-${crypto.randomBytes(12).toString('hex')}Aa1!`,
    });
    await sqlClient`
      INSERT INTO staff_profiles (user_id, email, role, display_name, is_active)
      VALUES (${adminId}::uuid, ${ADMIN_EMAIL}, 'admin', 'Quản trị viên kiểm thử', true);
    `;
    adminToken = await createStaffToken(adminId, 'admin');
    officerToken = await createStaffToken(CB_ID, 'can_bo');
    volunteerToken = await createStaffToken(TNV_MAI_ID, 'tnv');
  });

  afterAll(async () => {
    if (!adminId) return;
    try {
      await sqlClient`DELETE FROM admin_audit_log WHERE actor_staff_id = ${adminId}::uuid;`;
    } finally {
      await deleteAuthUser(adminId);
    }
  });

  function adminTest(name: string, run: () => Promise<void>) {
    it(name, async (context) => {
      if (!adminSchemaReady) context.skip();
      await run();
    });
  }

  adminTest('ADMIN-API-001..003: yêu cầu token admin đang hoạt động', async () => {
    const anonymous = await adminRequest(null, 'GET', '/admin/overview');
    expect(anonymous.status).toBe(401);

    const officer = await adminRequest(officerToken, 'GET', '/admin/overview');
    const volunteer = await adminRequest(volunteerToken, 'GET', '/admin/overview');
    expect(officer.status).toBe(403);
    expect(volunteer.status).toBe(403);

    const admin = await adminRequest(adminToken, 'GET', '/admin/overview');
    expect(admin.status).toBe(200);
    expect(admin.data).toHaveProperty('kpi');
    expect(admin.data).toHaveProperty('byCategory');
    expect(admin.data).toHaveProperty('byDepartment');
    expect(admin.data).toHaveProperty('accountsByRole');
  });

  adminTest('ADMIN-API-004: admin không được gọi API nghiệp vụ cán bộ hoặc TNV', async () => {
    const officer = await adminRequest(adminToken, 'GET', '/officer/reports');
    const volunteer = await adminRequest(adminToken, 'GET', '/volunteer/tasks');
    expect(officer.status).toBe(403);
    expect(volunteer.status).toBe(403);
  });

  adminTest('ADMIN-SVC-001: email trùng không tạo thêm Auth user hoặc staff profile', async () => {
    const before = await sqlClient`
      SELECT count(*)::int AS count FROM staff_profiles
      WHERE lower(email) = lower('cb.minh@tranbien.gov.vn');
    `;
    const response = await adminRequest(adminToken, 'POST', '/admin/staff', {
      email: 'cb.minh@tranbien.gov.vn',
      displayName: 'Tài khoản trùng',
      role: 'tnv',
    });
    const after = await sqlClient`
      SELECT count(*)::int AS count FROM staff_profiles
      WHERE lower(email) = lower('cb.minh@tranbien.gov.vn');
    `;
    expect(response.status).toBe(409);
    expect(after[0]?.count).toBe(before[0]?.count);
  });

  adminTest('ADMIN-SVC-002: lỗi liên kết bộ phận hoàn tác user Auth tạm', async () => {
    const email = `admin-rollback-${crypto.randomUUID()}@example.test`;
    const response = await adminRequest(adminToken, 'POST', '/admin/staff', {
      email,
      displayName: 'Kiểm thử hoàn tác',
      role: 'tnv',
      departmentId: 'khong-ton-tai',
    });
    const authUsers = await sqlClient`SELECT id FROM auth.users WHERE email = ${email};`;
    const profiles = await sqlClient`SELECT user_id FROM staff_profiles WHERE email = ${email};`;
    expect(response.status).toBe(422);
    expect(authUsers).toHaveLength(0);
    expect(profiles).toHaveLength(0);
  });

  adminTest('ADMIN-SVC-003..004: chặn khoá cán bộ cuối cùng và tự hạ quyền admin', async () => {
    const [activeOfficers] = await sqlClient`
      SELECT count(*)::int AS count FROM staff_profiles
      WHERE role = 'can_bo' AND is_active = true;
    `;
    if (activeOfficers?.count === 1) {
      const response = await adminRequest(adminToken, 'POST', `/admin/staff/${CB_ID}/disable`);
      expect(response.status).toBe(409);
      expect(response.data).toHaveProperty('error');
    }

    const demotion = await adminRequest(adminToken, 'PATCH', `/admin/staff/${adminId}`, {
      role: 'tnv',
    });
    expect(demotion.status).toBe(409);
  });

  adminTest('ADMIN-SVC-005: cập nhật tài khoản tạo audit log cùng actor', async () => {
    const response = await adminRequest(adminToken, 'PATCH', `/admin/staff/${adminId}`, {
      displayName: 'Quản trị viên kiểm thử',
    });
    expect(response.status).toBe(200);
    const [log] = await sqlClient`
      SELECT action, target_id FROM admin_audit_log
      WHERE actor_staff_id = ${adminId}::uuid AND action = 'staff.update'
      ORDER BY created_at DESC LIMIT 1;
    `;
    expect(log).toMatchObject({ action: 'staff.update', target_id: adminId });
  });

  adminTest('ADMIN-LEAK-001: admin response không trả dữ liệu cá nhân hoặc bí mật', async () => {
    const [staff, overview, audit] = await Promise.all([
      adminRequest(adminToken, 'GET', '/admin/staff'),
      adminRequest(adminToken, 'GET', '/admin/overview'),
      adminRequest(adminToken, 'GET', '/admin/audit-log'),
    ]);
    expect([staff.status, overview.status, audit.status]).toEqual([200, 200, 200]);
    for (const response of [staff, overview, audit]) {
      const payload = JSON.stringify(response.data);
      expect(findSensitiveLeaks(response.data)).toEqual([]);
      expect(payload).not.toMatch(/secret_?code|owner_?token|password_hash|service_role_key/i);
    }
  });

  adminTest('ADMIN-API-005: SLA ngoài khoảng hợp lệ không được lưu', async () => {
    const current = await adminRequest(adminToken, 'GET', '/admin/category-settings');
    expect(current.status).toBe(200);
    const body = current.data as { items: Array<Record<string, unknown>> };
    const settings = body.items.map((item) => ({
      category: item.category,
      slaDays: item.category === 'den_duong' ? 31 : item.sla_days,
      defaultDepartmentId: item.default_department_id,
    }));
    const update = await adminRequest(adminToken, 'PATCH', '/admin/category-settings', {
      settings,
    });
    expect(update.status).toBe(422);
  });
});
