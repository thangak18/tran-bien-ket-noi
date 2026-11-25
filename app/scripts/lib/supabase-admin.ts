import { requireEnv } from './env';

interface AdminUser {
  id: string;
  email?: string;
}

function adminHeaders(): Record<string, string> {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function authUrl(pathname: string): string {
  return `${requireEnv('SUPABASE_URL').replace(/\/$/, '')}/auth/v1${pathname}`;
}

async function findUserByEmail(email: string): Promise<AdminUser | null> {
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(authUrl(`/admin/users?page=${page}&per_page=100`), {
      headers: adminHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Supabase Auth liệt kê người dùng thất bại (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { users?: AdminUser[] };
    const users = body.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < 100) return null;
  }
  return null;
}

/**
 * Tạo (hoặc cập nhật mật khẩu của) user trong Supabase Auth LOCAL, email đã xác nhận.
 * Idempotent: chạy lại nhiều lần vẫn cho cùng một id.
 */
export async function ensureAuthUser(params: {
  id?: string;
  email: string;
  password: string;
}): Promise<string> {
  const existing = await findUserByEmail(params.email);
  if (existing) {
    const res = await fetch(authUrl(`/admin/users/${existing.id}`), {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ password: params.password, email_confirm: true }),
    });
    if (!res.ok) {
      throw new Error(`Cập nhật user ${params.email} thất bại (HTTP ${res.status})`);
    }
    return existing.id;
  }

  const res = await fetch(authUrl('/admin/users'), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      ...(params.id ? { id: params.id } : {}),
      email: params.email,
      password: params.password,
      email_confirm: true,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Tạo user ${params.email} thất bại (HTTP ${res.status}) ${detail.slice(0, 200)}`
    );
  }
  const created = (await res.json()) as AdminUser;
  return created.id;
}
