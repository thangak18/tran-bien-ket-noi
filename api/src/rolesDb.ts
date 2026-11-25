import { Env, IncidentCategory, UserRole } from './types';

export interface UserRow {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  unit: string | null;
  area: string | null;
  active: number;
  created_at: string;
}

export interface SlaConfigRow {
  category: IncidentCategory;
  default_days: number;
  department: string;
  updated_at: string;
}

export interface VolunteerTaskRow {
  id: string;
  report_id: string;
  assignee_phone: string | null;
  assignee_name: string | null;
  task_type: 'xac_minh' | 'nghiem_thu';
  status: string;
  note: string | null;
  photos_json: string;
  created_at: string;
  completed_at: string | null;
}

export async function listUsers(env: Env, role?: UserRole): Promise<UserRow[] | null> {
  if (!env.DB) return null;
  if (role) {
    const { results } = await env.DB.prepare(
      `SELECT id, phone, name, role, unit, area, active, created_at
       FROM users WHERE role = ? ORDER BY created_at DESC`
    )
      .bind(role)
      .all<UserRow>();
    return results;
  }
  const { results } = await env.DB.prepare(
    `SELECT id, phone, name, role, unit, area, active, created_at
     FROM users ORDER BY role ASC, created_at DESC`
  ).all<UserRow>();
  return results;
}

export async function createUser(
  env: Env,
  input: { phone: string; name: string; role: UserRole; unit?: string; area?: string }
): Promise<UserRow | null> {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const id = `USR-${input.role.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  await env.DB.prepare(
    `INSERT INTO users (id, phone, name, role, unit, area, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  )
    .bind(id, input.phone, input.name, input.role, input.unit ?? null, input.area ?? null, now)
    .run();
  return {
    id,
    phone: input.phone,
    name: input.name,
    role: input.role,
    unit: input.unit ?? null,
    area: input.area ?? null,
    active: 1,
    created_at: now,
  };
}

export async function toggleUserActive(
  env: Env,
  id: string,
  active: boolean
): Promise<boolean | null> {
  if (!env.DB) return null;
  await env.DB.prepare(`UPDATE users SET active = ? WHERE id = ?`)
    .bind(active ? 1 : 0, id)
    .run();
  return true;
}

export async function listSlaConfigs(env: Env): Promise<SlaConfigRow[] | null> {
  if (!env.DB) return null;
  const { results } = await env.DB.prepare(
    `SELECT category, default_days, department, updated_at FROM sla_config ORDER BY category ASC`
  ).all<SlaConfigRow>();
  return results;
}

export async function updateSlaConfig(
  env: Env,
  category: IncidentCategory,
  defaultDays: number,
  department?: string
): Promise<boolean | null> {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE sla_config
     SET default_days = ?, department = COALESCE(?, department), updated_at = ?
     WHERE category = ?`
  )
    .bind(defaultDays, department ?? null, now, category)
    .run();
  return true;
}

export async function listVolunteerTasks(env: Env): Promise<VolunteerTaskRow[] | null> {
  if (!env.DB) return null;
  const { results } = await env.DB.prepare(
    `SELECT id, report_id, assignee_phone, assignee_name, task_type, status, note, photos_json, created_at, completed_at
     FROM volunteer_tasks ORDER BY created_at DESC LIMIT 100`
  ).all<VolunteerTaskRow>();
  return results;
}

export async function createVolunteerTask(
  env: Env,
  input: {
    reportId: string;
    assigneePhone?: string;
    assigneeName?: string;
    taskType: 'xac_minh' | 'nghiem_thu';
  }
): Promise<{ id: string; createdAt: string } | null> {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const id = `NV-${Date.now().toString().slice(-4)}`;
  await env.DB.prepare(
    `INSERT INTO volunteer_tasks (id, report_id, assignee_phone, assignee_name, task_type, status, photos_json, created_at)
     VALUES (?, ?, ?, ?, ?, 'cho_xac_minh', '[]', ?)`
  )
    .bind(id, input.reportId, input.assigneePhone ?? null, input.assigneeName ?? null, input.taskType, now)
    .run();
  return { id, createdAt: now };
}
