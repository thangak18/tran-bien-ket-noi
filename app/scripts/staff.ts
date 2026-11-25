import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { loadLocalEnv, databaseUrl } from './lib/env';
import { createAuthUser, deleteAuthUser } from './lib/supabase-admin';

loadLocalEnv();

const sql = postgres(databaseUrl(), { max: 1 });

async function listStaff() {
  console.log('--- DANH SÁCH NHÂN VIÊN (STAFF PROFILES) ---');
  const rows = await sql`
    SELECT sp.user_id, sp.email, sp.role, sp.display_name, sp.is_active, d.name as dept_name
    FROM staff_profiles sp
    LEFT JOIN departments d ON d.id = sp.department_id
    ORDER BY sp.role, sp.display_name;
  `;
  console.table(
    rows.map((r) => ({
      ID: r.user_id,
      Email: r.email,
      'Họ tên': r.display_name,
      'Vai trò': r.role,
      'Bộ phận': r.dept_name || 'Không',
      'Hoạt động': r.is_active ? '✅ Hoạt động' : '❌ Đã khoá',
    }))
  );
}

async function createStaff(
  role: string,
  displayName: string,
  email: string,
  departmentId?: string
) {
  if (role !== 'can_bo' && role !== 'tnv') {
    throw new Error('Vai trò phải là "can_bo" hoặc "tnv"');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email không hợp lệ');
  }
  // Mật khẩu sinh ngẫu nhiên, chỉ in ra một lần. Không lưu vào code hay git.
  const password = `${crypto.randomBytes(9).toString('base64url')}Aa1!`;
  const userId = await createAuthUser({ email, password });
  try {
    await sql`
      INSERT INTO staff_profiles (user_id, email, role, display_name, department_id, is_active)
      VALUES (${userId}, ${email.toLowerCase()}, ${role}, ${displayName}, ${departmentId || null}, true);
    `;
  } catch (err) {
    // Auth và staff_profiles cùng thành công hoặc cùng huỷ (AC-OPS-1).
    await deleteAuthUser(userId);
    throw err;
  }
  console.log(`✅ Đã tạo nhân viên "${displayName}" (${role}), email ${email}, ID: ${userId}`);
  console.log(`   Mật khẩu (chỉ hiển thị một lần): ${password}`);
}

async function setStaffActive(userId: string, active: boolean) {
  const [res] = await sql`
    UPDATE staff_profiles
    SET is_active = ${active}
    WHERE user_id = ${userId}::uuid
    RETURNING display_name;
  `;
  if (!res) {
    throw new Error(`Không tìm thấy nhân viên với ID: ${userId}`);
  }
  console.log(`✅ Đã ${active ? 'kích hoạt' : 'vô hiệu hoá'} tài khoản "${res.display_name}"`);
}

async function setSla(category: string, slaDays: number) {
  const [res] = await sql`
    UPDATE category_settings
    SET sla_days = ${slaDays}
    WHERE category = ${category}::category
    RETURNING label, sla_days;
  `;
  if (!res) {
    throw new Error(`Không tìm thấy danh mục: ${category}`);
  }
  console.log(`✅ Đã cập nhật SLA danh mục "${res.label}" thành ${res.sla_days} ngày.`);
}

async function main() {
  const action = process.argv[2];
  try {
    switch (action) {
      case 'list':
        await listStaff();
        break;
      case 'create':
        if (!process.argv[3] || !process.argv[4] || !process.argv[5])
          throw new Error('Thiếu tham số vai trò, họ tên hoặc email');
        await createStaff(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
        break;
      case 'disable':
        if (!process.argv[3]) throw new Error('Thiếu user_id');
        await setStaffActive(process.argv[3], false);
        break;
      case 'enable':
        if (!process.argv[3]) throw new Error('Thiếu user_id');
        await setStaffActive(process.argv[3], true);
        break;
      case 'set-sla':
        if (!process.argv[3] || !process.argv[4])
          throw new Error('Thiếu danh mục hoặc số ngày SLA');
        await setSla(process.argv[3], parseInt(process.argv[4], 10));
        break;
      default:
        console.log(`
Sử dụng:
  npm run staff:list
  npm run staff:create <can_bo|tnv> <tên> <email> [mã_bộ_phận]
  npm run staff:disable <user_id>
  npm run staff:enable <user_id>
  npm run config:set-sla <category> <số_ngày>
        `);
    }
  } catch (err: unknown) {
    console.error('❌ Lỗi:', (err as Error).message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
