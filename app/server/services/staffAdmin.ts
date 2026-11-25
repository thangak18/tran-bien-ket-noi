import crypto from 'node:crypto';
import { sqlClient } from '../db/client';
import { getDemoNow } from '../clock';
import { AppError } from '../middleware/errorHandler';
import type { StaffRole } from '../middleware/auth';
import {
  AuthEmailAlreadyExistsError,
  createAuthUser,
  deleteAuthUser,
  updateAuthUserPassword,
} from '../../scripts/lib/supabase-admin';

type StaffRow = {
  user_id: string;
  email: string | null;
  role: StaffRole;
  display_name: string;
  department_id: string | null;
  department_name: string | null;
  is_active: boolean;
  created_at: Date | string;
};

type DepartmentRow = {
  id: string;
  name: string;
  is_active: boolean;
  sort: number;
  report_count?: number;
};

type CategorySettingRow = {
  category: string;
  label: string;
  default_department_id: string | null;
  default_department_name?: string | null;
  sla_days: number;
};

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = { [key: string]: JsonValue };

export interface StaffFilters {
  role?: StaffRole;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface StaffInput {
  role: StaffRole;
  displayName: string;
  email: string;
  departmentId?: string | null;
}

export interface CategorySettingInput {
  category: 'den_duong' | 'ngap_nuoc' | 'rac_thai' | 'mat_duong';
  slaDays: number;
  defaultDepartmentId: string | null;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  page: number;
  pageSize: number;
}

function temporaryPassword(): string {
  return `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new AppError('INTERNAL_ERROR', message, 500);
  return row;
}

function toStaff(row: StaffRow) {
  return {
    id: row.user_id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    departmentId: row.department_id,
    departmentName: row.department_name,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function actorFor(tx: typeof sqlClient, actorId?: string): Promise<string> {
  if (actorId) return actorId;
  const [actor] = await tx`
    SELECT user_id FROM staff_profiles
    WHERE role = 'admin' AND is_active = true
    ORDER BY created_at, user_id
    LIMIT 1;
  `;
  if (!actor) {
    throw new AppError('ADMIN_REQUIRED', 'Cần có tài khoản quản trị viên đang hoạt động', 409);
  }
  return actor.user_id;
}

async function writeAudit(
  tx: typeof sqlClient,
  actorId: string | undefined,
  entry: { action: string; targetType: string; targetId: string; detail?: JsonRecord }
): Promise<void> {
  const actor = await actorFor(tx, actorId);
  await tx`
    INSERT INTO admin_audit_log (actor_staff_id, action, target_type, target_id, detail)
    VALUES (
      ${actor}::uuid,
      ${entry.action},
      ${entry.targetType},
      ${entry.targetId},
      -- Không dùng tx.json(): kết nối tắt prepared statement (pooler Supabase) không suy ra kiểu jsonb.
      ${JSON.stringify(entry.detail ?? {})}::jsonb
    );
  `;
}

export async function listStaff(filters: StaffFilters = {}) {
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;
  const role = filters.role ?? null;
  const active = filters.status === 'active' ? true : filters.status === 'inactive' ? false : null;
  const rows = await sqlClient<StaffRow[]>`
    SELECT sp.user_id, sp.email, sp.role, sp.display_name, sp.department_id,
      d.name AS department_name, sp.is_active, sp.created_at
    FROM staff_profiles sp
    LEFT JOIN departments d ON d.id = sp.department_id
    WHERE (${role}::staff_role IS NULL OR sp.role = ${role}::staff_role)
      AND (${active}::boolean IS NULL OR sp.is_active = ${active})
      AND (${search}::text IS NULL OR sp.display_name ILIKE ${search} OR sp.email ILIKE ${search})
    ORDER BY sp.role, sp.display_name
    LIMIT 500;
  `;
  return rows.map(toStaff);
}

export async function createStaff(input: StaffInput, actorId?: string) {
  const email = input.email.trim().toLowerCase();
  const password = temporaryPassword();
  let userId: string;
  try {
    userId = await createAuthUser({ email, password });
  } catch (error) {
    if (error instanceof AuthEmailAlreadyExistsError) {
      throw new AppError('EMAIL_EXISTS', 'Email này đã được sử dụng', 409);
    }
    throw error;
  }

  try {
    const staff = await sqlClient.begin(async (tx) => {
      if (input.departmentId) {
        const [department] = await tx`
          SELECT id FROM departments WHERE id = ${input.departmentId} AND is_active = true;
        `;
        if (!department) {
          throw new AppError(
            'INVALID_DEPARTMENT',
            'Bộ phận không tồn tại hoặc đã ngừng hoạt động',
            422
          );
        }
      }
      const [row] = await tx<StaffRow[]>`
        INSERT INTO staff_profiles (user_id, email, role, display_name, department_id, is_active)
        VALUES (
          ${userId}::uuid,
          ${email},
          ${input.role}::staff_role,
          ${input.displayName.trim()},
          ${input.departmentId ?? null},
          true
        )
        RETURNING user_id, email, role, display_name, department_id, NULL::text AS department_name,
          is_active, created_at;
      `;
      const created = requireRow(row, 'Không đọc lại được tài khoản vừa tạo');
      await writeAudit(tx, actorId, {
        action: 'staff.create',
        targetType: 'staff',
        targetId: userId,
        detail: { role: input.role, departmentId: input.departmentId ?? null },
      });
      return created;
    });
    return { staff: toStaff(staff), temporaryPassword: password };
  } catch (error) {
    try {
      await deleteAuthUser(userId);
    } catch {
      throw new AppError(
        'AUTH_ROLLBACK_FAILED',
        'Không thể hoàn tất tạo tài khoản hoặc thu hồi tài khoản Auth tạm. Vui lòng liên hệ quản trị hệ thống.',
        500
      );
    }
    throw error;
  }
}

async function lockStaffMutations(tx: typeof sqlClient): Promise<void> {
  await tx`SELECT pg_advisory_xact_lock(8102501);`;
}

async function assertAccountCounts(
  tx: typeof sqlClient,
  target: { user_id: string; role: StaffRole; is_active: boolean },
  nextRole: StaffRole,
  nextActive: boolean,
  actorId: string
): Promise<void> {
  const selfDemotion =
    target.user_id === actorId && (target.role !== nextRole || (target.is_active && !nextActive));
  if (selfDemotion) {
    throw new AppError(
      'SELF_ADMIN_CHANGE',
      'Bạn không thể tự khoá hoặc tự hạ quyền tài khoản',
      409
    );
  }

  if (target.is_active && target.role === 'can_bo' && (!nextActive || nextRole !== 'can_bo')) {
    const [result] = await tx<{ count: number }[]>`
      SELECT count(*)::int AS count FROM staff_profiles
      WHERE role = 'can_bo' AND is_active = true AND user_id <> ${target.user_id}::uuid;
    `;
    if (!result || result.count < 1) {
      throw new AppError(
        'LAST_OFFICER',
        'Không thể khoá hoặc hạ quyền cán bộ đang hoạt động cuối cùng',
        409
      );
    }
  }

  if (target.is_active && target.role === 'admin' && (!nextActive || nextRole !== 'admin')) {
    const [result] = await tx<{ count: number }[]>`
      SELECT count(*)::int AS count FROM staff_profiles
      WHERE role = 'admin' AND is_active = true AND user_id <> ${target.user_id}::uuid;
    `;
    if (!result || result.count < 1) {
      throw new AppError(
        'LAST_ADMIN',
        'Hệ thống phải luôn có ít nhất một quản trị viên đang hoạt động',
        409
      );
    }
  }
}

export async function patchStaff(
  userId: string,
  input: { displayName?: string; role?: StaffRole; departmentId?: string | null },
  actorId?: string
) {
  return sqlClient.begin(async (tx) => {
    await lockStaffMutations(tx);
    const [currentRow] = await tx<
      { user_id: string; role: StaffRole; is_active: boolean; department_id: string | null }[]
    >`
      SELECT user_id, role, is_active, department_id FROM staff_profiles
      WHERE user_id = ${userId}::uuid FOR UPDATE;
    `;
    if (!currentRow) throw new AppError('NOT_FOUND', 'Không tìm thấy tài khoản nhân viên', 404);
    const current = currentRow;
    const actor = await actorFor(tx, actorId);
    const nextRole = input.role ?? current.role;
    await assertAccountCounts(tx, current, nextRole, current.is_active, actor);
    if (input.departmentId) {
      const [department] = await tx`
        SELECT id FROM departments WHERE id = ${input.departmentId} AND is_active = true;
      `;
      if (!department) {
        throw new AppError(
          'INVALID_DEPARTMENT',
          'Bộ phận không tồn tại hoặc đã ngừng hoạt động',
          422
        );
      }
    }
    const [updated] = await tx<StaffRow[]>`
      UPDATE staff_profiles
      SET display_name = COALESCE(${input.displayName?.trim() ?? null}, display_name),
          role = ${nextRole}::staff_role,
          department_id = CASE WHEN ${input.departmentId !== undefined}
            THEN ${input.departmentId ?? null} ELSE department_id END
      WHERE user_id = ${userId}::uuid
      RETURNING user_id, email, role, display_name, department_id, NULL::text AS department_name,
        is_active, created_at;
    `;
    const saved = requireRow(updated, 'Không đọc lại được tài khoản đã cập nhật');
    await writeAudit(tx, actor, {
      action: 'staff.update',
      targetType: 'staff',
      targetId: userId,
      detail: {
        displayNameChanged: input.displayName !== undefined,
        role: nextRole,
        departmentId: input.departmentId === undefined ? current.department_id : input.departmentId,
      },
    });
    return toStaff(saved);
  });
}

export async function setStaffActive(userId: string, active: boolean, actorId?: string) {
  return sqlClient.begin(async (tx) => {
    await lockStaffMutations(tx);
    const [currentRow] = await tx<{ user_id: string; role: StaffRole; is_active: boolean }[]>`
      SELECT user_id, role, is_active FROM staff_profiles
      WHERE user_id = ${userId}::uuid FOR UPDATE;
    `;
    if (!currentRow) throw new AppError('NOT_FOUND', 'Không tìm thấy tài khoản nhân viên', 404);
    const current = currentRow;
    const actor = await actorFor(tx, actorId);
    await assertAccountCounts(tx, current, current.role, active, actor);
    const [updated] = await tx<StaffRow[]>`
      UPDATE staff_profiles SET is_active = ${active}
      WHERE user_id = ${userId}::uuid
      RETURNING user_id, email, role, display_name, department_id, NULL::text AS department_name,
        is_active, created_at;
    `;
    const saved = requireRow(updated, 'Không đọc lại được trạng thái tài khoản');
    await writeAudit(tx, actor, {
      action: active ? 'staff.enable' : 'staff.disable',
      targetType: 'staff',
      targetId: userId,
      detail: { isActive: active },
    });
    return toStaff(saved);
  });
}

export async function resetStaffPassword(userId: string, actorId?: string) {
  const password = temporaryPassword();
  await sqlClient.begin(async (tx) => {
    const [staff] = await tx`
      SELECT user_id FROM staff_profiles WHERE user_id = ${userId}::uuid FOR UPDATE;
    `;
    if (!staff) throw new AppError('NOT_FOUND', 'Không tìm thấy tài khoản nhân viên', 404);
    await updateAuthUserPassword(userId, password);
    await writeAudit(tx, actorId, {
      action: 'staff.reset_password',
      targetType: 'staff',
      targetId: userId,
      detail: { temporaryPasswordIssued: true },
    });
  });
  return { temporaryPassword: password };
}

export async function listDepartments() {
  return sqlClient<DepartmentRow[]>`
    SELECT d.id, d.name, d.is_active, d.sort,
      count(r.id)::int AS report_count
    FROM departments d
    LEFT JOIN reports r ON r.department_id = d.id
    GROUP BY d.id
    ORDER BY d.sort, d.name;
  `;
}

function departmentIdFromName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `bo_phan_${crypto.randomUUID().slice(0, 8)}`;
}

export async function createDepartment(input: { name: string; sort?: number }, actorId: string) {
  const id = departmentIdFromName(input.name);
  return sqlClient.begin(async (tx) => {
    const [departmentRow] = await tx<DepartmentRow[]>`
      INSERT INTO departments (id, name, sort)
      VALUES (${id}, ${input.name.trim()}, ${input.sort ?? 0})
      RETURNING id, name, is_active, sort;
    `;
    const department = requireRow(departmentRow, 'Không đọc lại được bộ phận vừa tạo');
    await writeAudit(tx, actorId, {
      action: 'department.create',
      targetType: 'department',
      targetId: department.id,
      detail: { name: department.name, sort: department.sort },
    });
    return department;
  });
}

export async function patchDepartment(
  id: string,
  input: { name?: string; sort?: number; isActive?: boolean },
  actorId: string
) {
  return sqlClient.begin(async (tx) => {
    const [current] = await tx<DepartmentRow[]>`
      SELECT id, name, is_active, sort FROM departments WHERE id = ${id} FOR UPDATE;
    `;
    if (!current) throw new AppError('NOT_FOUND', 'Không tìm thấy bộ phận', 404);
    const [departmentRow] = await tx<DepartmentRow[]>`
      UPDATE departments
      SET name = COALESCE(${input.name?.trim() ?? null}, name),
          sort = COALESCE(${input.sort ?? null}, sort),
          is_active = COALESCE(${input.isActive ?? null}, is_active)
      WHERE id = ${id}
      RETURNING id, name, is_active, sort;
    `;
    const department = requireRow(departmentRow, 'Không đọc lại được bộ phận đã cập nhật');
    await writeAudit(tx, actorId, {
      action: 'department.update',
      targetType: 'department',
      targetId: id,
      detail: {
        before: { name: current.name, sort: current.sort, isActive: current.is_active },
        after: { name: department.name, sort: department.sort, isActive: department.is_active },
      },
    });
    return department;
  });
}

export async function listCategorySettings(): Promise<CategorySettingRow[]> {
  return sqlClient<CategorySettingRow[]>`
    SELECT cs.category, cs.label, cs.default_department_id, d.name AS default_department_name,
      cs.sla_days
    FROM category_settings cs
    LEFT JOIN departments d ON d.id = cs.default_department_id
    ORDER BY cs.category;
  `;
}

export async function updateCategorySettings(settings: CategorySettingInput[], actorId?: string) {
  return sqlClient.begin(async (tx) => {
    const updated: CategorySettingRow[] = [];
    for (const setting of settings) {
      if (setting.defaultDepartmentId) {
        const [department] = await tx`
          SELECT id FROM departments WHERE id = ${setting.defaultDepartmentId} AND is_active = true;
        `;
        if (!department) {
          throw new AppError(
            'INVALID_DEPARTMENT',
            'Bộ phận mặc định không tồn tại hoặc đã ngừng hoạt động',
            422
          );
        }
      }
      const [row] = await tx<CategorySettingRow[]>`
        UPDATE category_settings
        SET sla_days = ${setting.slaDays}, default_department_id = ${setting.defaultDepartmentId}
        WHERE category = ${setting.category}::category
        RETURNING category, label, default_department_id, sla_days;
      `;
      if (!row) {
        throw new AppError('NOT_FOUND', `Không tìm thấy cấu hình loại ${setting.category}`, 404);
      }
      await writeAudit(tx, actorId, {
        action: 'category_setting.update',
        targetType: 'category_setting',
        targetId: setting.category,
        detail: {
          slaDays: setting.slaDays,
          defaultDepartmentId: setting.defaultDepartmentId,
        },
      });
      updated.push(row);
    }
    return updated;
  });
}

export async function getAdminOverview() {
  const now = await getDemoNow();
  const [statsRow] = await sqlClient<
    { total: number; resolved: number; avg_resolution_days: number; overdue: number }[]
  >`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status IN ('hoan_thanh', 'dong'))::int AS resolved,
      COALESCE(
        avg(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
          FILTER (WHERE status IN ('hoan_thanh', 'dong') AND completed_at IS NOT NULL),
        0
      )::float8 AS avg_resolution_days,
      count(*) FILTER (
        WHERE due_at < ${now}::timestamptz
          AND status IN ('da_tiep_nhan', 'cho_xac_minh', 'da_giao', 'mo_lai')
      )::int AS overdue
    FROM reports;
  `;
  const stats = requireRow(statsRow, 'Không tính được thống kê quản trị');
  const categories = await sqlClient`
    SELECT r.category, cs.label, count(*)::int AS count
    FROM reports r JOIN category_settings cs ON cs.category = r.category
    GROUP BY r.category, cs.label ORDER BY r.category;
  `;
  const departments = await sqlClient`
    SELECT d.id, d.name, count(r.id)::int AS count
    FROM departments d LEFT JOIN reports r ON r.department_id = d.id
    GROUP BY d.id, d.name ORDER BY d.sort, d.name;
  `;
  const accounts = await sqlClient`
    SELECT role, count(*)::int AS total,
      count(*) FILTER (WHERE is_active = true)::int AS active
    FROM staff_profiles GROUP BY role ORDER BY role;
  `;
  return {
    kpi: {
      totalReports: stats.total,
      resolvedReports: stats.resolved,
      averageResolutionDays: Number(Number(stats.avg_resolution_days).toFixed(2)),
      overdueReports: stats.overdue,
    },
    byCategory: categories,
    byDepartment: departments,
    accountsByRole: accounts,
  };
}

export async function listAdminAudit(filters: AuditFilters) {
  const offset = (filters.page - 1) * filters.pageSize;
  const actorId = filters.actorId ?? null;
  const action = filters.action?.trim() ? `%${filters.action.trim()}%` : null;
  const [countRow] = await sqlClient<{ total: number }[]>`
    SELECT count(*)::int AS total
    FROM admin_audit_log a
    WHERE (${actorId}::uuid IS NULL OR a.actor_staff_id = ${actorId}::uuid)
      AND (${action}::text IS NULL OR a.action ILIKE ${action});
  `;
  const count = requireRow(countRow, 'Không đếm được nhật ký quản trị');
  const items = await sqlClient`
    SELECT a.id, a.actor_staff_id AS actor_id, sp.display_name AS actor_name, sp.email AS actor_email,
      a.action, a.target_type, a.target_id, a.detail, a.created_at
    FROM admin_audit_log a
    JOIN staff_profiles sp ON sp.user_id = a.actor_staff_id
    WHERE (${actorId}::uuid IS NULL OR a.actor_staff_id = ${actorId}::uuid)
      AND (${action}::text IS NULL OR a.action ILIKE ${action})
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ${filters.pageSize} OFFSET ${offset};
  `;
  return { items, page: filters.page, pageSize: filters.pageSize, total: count.total };
}
