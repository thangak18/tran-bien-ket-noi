import { requireEnv } from './env';

interface AdminUser {
  id: string;
  email?: string;
}

function adminHeaders(): Record<string, string> {
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  // Khoá mới của Supabase (sb_secret_...) không phải JWT: chỉ gửi qua header apikey.
  // Khoá cũ service_role (JWT, bắt đầu bằng eyJ) gửi thêm Authorization như trước.
  const isJwt = key.startsWith('eyJ');
  return {
    apikey: key,
    ...(isJwt ? { Authorization: `Bearer ${key}` } : {}),
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

/** Tạo user mới trong Supabase Auth; email đã tồn tại thì báo lỗi, không đổi mật khẩu của tài khoản cũ. */
export async function createAuthUser(params: { email: string; password: string }): Promise<string> {
  if (await findUserByEmail(params.email)) {
    throw new Error(`Email ${params.email} đã tồn tại trong hệ thống`);
  }
  const res = await fetch(authUrl('/admin/users'), {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ email: params.email, password: params.password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`Tạo user ${params.email} thất bại (HTTP ${res.status})`);
  }
  return ((await res.json()) as AdminUser).id;
}

/** Xoá user khỏi Supabase Auth (dùng để hoàn tác khi bước ghi profile thất bại). */
export async function deleteAuthUser(id: string): Promise<void> {
  const res = await fetch(authUrl(`/admin/users/${id}`), {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Xoá user ${id} thất bại (HTTP ${res.status})`);
  }
}
