import { CATEGORY_CONFIGS, DEMO_NOW, DEPARTMENTS, VOLUNTEERS } from '../domain/constants';
import { computeKpi } from '../domain/kpi';
import { isOverdue } from '../domain/sorting';
import { Report } from '../domain/types';

export type AdminStaffRole = 'can_bo' | 'tnv' | 'admin';

export interface AdminStaffItem {
  id: string;
  email: string;
  role: AdminStaffRole;
  displayName: string;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminDepartmentItem {
  id: string;
  name: string;
  is_active: boolean;
  sort: number;
  report_count: number;
}

export interface AdminCategorySettingRow {
  category: string;
  label: string;
  sla_days: number;
  default_department_id: string | null;
}

export interface AdminAuditItem {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface AdminOverviewData {
  kpi: {
    totalReports: number;
    resolvedReports: number;
    averageResolutionDays: number;
    overdueReports: number;
  };
  byCategory: Array<{ category: string; label: string; count: number }>;
  byDepartment: Array<{ id: string; name: string; count: number }>;
  accountsByRole: Array<{ role: AdminStaffRole; total: number; active: number }>;
}

interface StoredDepartment {
  id: string;
  name: string;
  is_active: boolean;
  sort: number;
}

interface StoredStaff {
  id: string;
  email: string;
  role: AdminStaffRole;
  displayName: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface LocalAdminState {
  staff: StoredStaff[];
  departments: StoredDepartment[];
  categorySettings: AdminCategorySettingRow[];
  auditLog: AdminAuditItem[];
}

const STORAGE_KEY = 'tbkn:admin:local:v1';
const LOCAL_ADMIN_ACTOR = {
  id: 'local-admin-1',
  name: 'Quản trị viên Phường',
  email: 'admin@tranbien.gov.vn',
};

function createInitialState(): LocalAdminState {
  const departments: StoredDepartment[] = DEPARTMENTS.map((name, idx) => ({
    id: `dept_${idx + 1}`,
    name,
    is_active: true,
    sort: idx + 1,
  }));

  const categorySettings: AdminCategorySettingRow[] = CATEGORY_CONFIGS.map((cfg, idx) => ({
    category: cfg.key,
    label: cfg.label,
    sla_days: cfg.defaultDays,
    default_department_id: departments[idx]?.id ?? null,
  }));

  const staff: StoredStaff[] = [
    {
      id: LOCAL_ADMIN_ACTOR.id,
      email: LOCAL_ADMIN_ACTOR.email,
      role: 'admin',
      displayName: LOCAL_ADMIN_ACTOR.name,
      departmentId: null,
      isActive: true,
      createdAt: '2026-11-01T08:00:00+07:00',
    },
    {
      id: 'local-cb-1',
      email: 'cb.minh@tranbien.gov.vn',
      role: 'can_bo',
      displayName: 'Nguyễn Văn Minh',
      departmentId: null,
      isActive: true,
      createdAt: '2026-11-01T08:05:00+07:00',
    },
    ...VOLUNTEERS.map((name, idx) => ({
      id: `local-tnv-${idx + 1}`,
      email: `tnv.${idx + 1}@tranbien.gov.vn`,
      role: 'tnv' as const,
      displayName: name,
      departmentId: null,
      isActive: true,
      createdAt: `2026-11-01T08:${String(10 + idx).padStart(2, '0')}:00+07:00`,
    })),
  ];

  const auditLog: AdminAuditItem[] = [
    {
      id: 'audit-init-1',
      actor_id: LOCAL_ADMIN_ACTOR.id,
      actor_name: LOCAL_ADMIN_ACTOR.name,
      actor_email: LOCAL_ADMIN_ACTOR.email,
      action: 'category_setting.update',
      target_type: 'category_settings',
      target_id: 'all',
      detail: { note: 'Khởi tạo cấu hình SLA mặc định (mô phỏng)' },
      created_at: DEMO_NOW,
    },
  ];

  return { staff, departments, categorySettings, auditLog };
}

function loadAdminState(): LocalAdminState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<LocalAdminState>;
    if (
      !Array.isArray(parsed.staff) ||
      !Array.isArray(parsed.departments) ||
      !Array.isArray(parsed.categorySettings) ||
      !Array.isArray(parsed.auditLog)
    ) {
      return createInitialState();
    }
    return parsed as LocalAdminState;
  } catch {
    return createInitialState();
  }
}

function saveAdminState(state: LocalAdminState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function appendAudit(
  state: LocalAdminState,
  action: string,
  targetType: string,
  targetId: string,
  detail: Record<string, unknown>
): void {
  state.auditLog.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor_id: LOCAL_ADMIN_ACTOR.id,
    actor_name: LOCAL_ADMIN_ACTOR.name,
    actor_email: LOCAL_ADMIN_ACTOR.email,
    action,
    target_type: targetType,
    target_id: targetId,
    detail,
    created_at: new Date().toISOString(),
  });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let out = 'TB';
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)] ?? '9';
  }
  return out;
}

export function getLocalAdminOverview(reports: Report[], demoNow: string): AdminOverviewData {
  const state = loadAdminState();
  const month = demoNow.slice(0, 7);
  const kpi = computeKpi(reports, month, demoNow);
  const overdueReports = reports.filter((r) => isOverdue(r, demoNow)).length;

  const byCategory = CATEGORY_CONFIGS.map((cfg) => ({
    category: cfg.key,
    label: cfg.label,
    count: reports.filter((r) => r.category === cfg.key).length,
  }));

  const byDepartment = state.departments
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((dept) => ({
      id: dept.id,
      name: dept.name,
      count: reports.filter((r) => r.department === dept.name).length,
    }));

  const roles: AdminStaffRole[] = ['can_bo', 'tnv', 'admin'];
  const accountsByRole = roles.map((role) => {
    const group = state.staff.filter((s) => s.role === role);
    return {
      role,
      total: group.length,
      active: group.filter((s) => s.isActive).length,
    };
  });

  return {
    kpi: {
      totalReports: kpi.total,
      resolvedReports: kpi.resolved,
      averageResolutionDays: kpi.avgDays ?? 0,
      overdueReports,
    },
    byCategory,
    byDepartment,
    accountsByRole,
  };
}

export function listLocalStaff(filters?: {
  search?: string;
  role?: string;
  status?: string;
}): AdminStaffItem[] {
  const state = loadAdminState();
  const deptMap = new Map(state.departments.map((d) => [d.id, d.name]));
  const q = filters?.search?.trim().toLowerCase() ?? '';

  return state.staff
    .filter((s) => {
      if (q && !s.displayName.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) {
        return false;
      }
      if (filters?.role && s.role !== filters.role) return false;
      if (filters?.status === 'active' && !s.isActive) return false;
      if (filters?.status === 'inactive' && s.isActive) return false;
      return true;
    })
    .map((s) => ({
      ...s,
      departmentName: s.departmentId ? (deptMap.get(s.departmentId) ?? null) : null,
    }));
}

export function createLocalStaff(input: {
  displayName: string;
  email: string;
  role: AdminStaffRole;
  departmentId: string | null;
}): { temporaryPassword: string } {
  const state = loadAdminState();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (state.staff.some((s) => s.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Email này đã tồn tại trong hệ thống.');
  }
  const id = `local-staff-${Date.now()}`;
  state.staff.unshift({
    id,
    email: normalizedEmail,
    role: input.role,
    displayName: input.displayName.trim(),
    departmentId: input.departmentId,
    isActive: true,
    createdAt: new Date().toISOString(),
  });
  appendAudit(state, 'staff.create', 'staff', id, {
    role: input.role,
    displayName: input.displayName.trim(),
  });
  saveAdminState(state);
  return { temporaryPassword: generateTempPassword() };
}

export function updateLocalStaff(
  id: string,
  input: { displayName: string; role: AdminStaffRole; departmentId: string | null }
): void {
  const state = loadAdminState();
  const target = state.staff.find((s) => s.id === id);
  if (!target) throw new Error('Không tìm thấy tài khoản.');

  if (target.role === 'can_bo' && input.role !== 'can_bo' && target.isActive) {
    const activeOfficers = state.staff.filter((s) => s.role === 'can_bo' && s.isActive);
    if (activeOfficers.length <= 1) {
      throw new Error('Không thể hạ quyền cán bộ cuối cùng đang hoạt động.');
    }
  }
  if (target.id === LOCAL_ADMIN_ACTOR.id && input.role !== 'admin') {
    throw new Error('Không thể tự hạ quyền quản trị viên hiện tại.');
  }

  target.displayName = input.displayName.trim();
  target.role = input.role;
  target.departmentId = input.departmentId;
  appendAudit(state, 'staff.update', 'staff', id, {
    role: input.role,
    displayName: target.displayName,
  });
  saveAdminState(state);
}

export function toggleLocalStaffActive(id: string, nextActive: boolean): void {
  const state = loadAdminState();
  const target = state.staff.find((s) => s.id === id);
  if (!target) throw new Error('Không tìm thấy tài khoản.');

  if (!nextActive && target.id === LOCAL_ADMIN_ACTOR.id) {
    throw new Error('Không thể tự khoá tài khoản quản trị viên hiện tại.');
  }
  if (!nextActive && target.role === 'can_bo' && target.isActive) {
    const activeOfficers = state.staff.filter((s) => s.role === 'can_bo' && s.isActive);
    if (activeOfficers.length <= 1) {
      throw new Error('Không thể khoá cán bộ cuối cùng đang hoạt động.');
    }
  }

  target.isActive = nextActive;
  appendAudit(state, nextActive ? 'staff.enable' : 'staff.disable', 'staff', id, {
    isActive: nextActive,
  });
  saveAdminState(state);
}

export function resetLocalStaffPassword(id: string): { temporaryPassword: string } {
  const state = loadAdminState();
  const target = state.staff.find((s) => s.id === id);
  if (!target) throw new Error('Không tìm thấy tài khoản.');
  appendAudit(state, 'staff.reset_password', 'staff', id, { email: target.email });
  saveAdminState(state);
  return { temporaryPassword: generateTempPassword() };
}

export function listLocalDepartments(reports: Report[]): AdminDepartmentItem[] {
  const state = loadAdminState();
  return state.departments
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((dept) => ({
      ...dept,
      report_count: reports.filter((r) => r.department === dept.name).length,
    }));
}

export function createLocalDepartment(input: { name: string; sort: number }): void {
  const state = loadAdminState();
  const trimmed = input.name.trim();
  if (state.departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Tên bộ phận đã tồn tại.');
  }
  const id = `dept_${Date.now()}`;
  state.departments.push({ id, name: trimmed, is_active: true, sort: input.sort });
  appendAudit(state, 'department.create', 'department', id, { name: trimmed, sort: input.sort });
  saveAdminState(state);
}

export function updateLocalDepartment(
  id: string,
  patch: { name?: string; sort?: number; isActive?: boolean }
): void {
  const state = loadAdminState();
  const target = state.departments.find((d) => d.id === id);
  if (!target) throw new Error('Không tìm thấy bộ phận.');
  if (patch.name !== undefined) target.name = patch.name.trim();
  if (patch.sort !== undefined) target.sort = patch.sort;
  if (patch.isActive !== undefined) target.is_active = patch.isActive;
  appendAudit(state, 'department.update', 'department', id, { ...patch });
  saveAdminState(state);
}

export function listLocalCategorySettings(): AdminCategorySettingRow[] {
  return loadAdminState().categorySettings;
}

export function saveLocalCategorySettings(
  settings: Array<{ category: string; slaDays: number; defaultDepartmentId: string | null }>
): void {
  const state = loadAdminState();
  state.categorySettings = state.categorySettings.map((row) => {
    const match = settings.find((s) => s.category === row.category);
    if (!match) return row;
    return {
      ...row,
      sla_days: match.slaDays,
      default_department_id: match.defaultDepartmentId,
    };
  });
  appendAudit(state, 'category_setting.update', 'category_settings', 'all', {
    count: settings.length,
  });
  saveAdminState(state);
}

export function listLocalAuditLog(params: {
  actorId?: string;
  action?: string;
  page: number;
  pageSize: number;
}): { items: AdminAuditItem[]; total: number } {
  const state = loadAdminState();
  const actionQuery = params.action?.trim().toLowerCase() ?? '';
  const filtered = state.auditLog.filter((item) => {
    if (params.actorId && item.actor_id !== params.actorId) return false;
    if (actionQuery && !item.action.toLowerCase().includes(actionQuery)) return false;
    return true;
  });
  const start = (params.page - 1) * params.pageSize;
  return {
    items: filtered.slice(start, start + params.pageSize),
    total: filtered.length,
  };
}
