import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch (_e) {
  void _e;
}

const DATABASE_URL =
  process.env.DATABASE_URL_DIRECT ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/tranbien';

const sql = postgres(DATABASE_URL, { max: 1 });

async function listStaff() {
  console.log('--- DANH SÁCH NHÂN VIÊN (STAFF PROFILES) ---');
  const rows = await sql`
    SELECT sp.user_id, sp.role, sp.display_name, sp.is_active, d.name as dept_name
    FROM staff_profiles sp
    LEFT JOIN departments d ON d.id = sp.department_id
    ORDER BY sp.role, sp.display_name;
  `;
  console.table(
    rows.map((r) => ({
      ID: r.user_id,
      'Họ tên': r.display_name,
      'Vai trò': r.role,
      'Bộ phận': r.dept_name || 'Không',
      'Hoạt động': r.is_active ? '✅ Hoạt động' : '❌ Đã khoá',
    }))
  );
}

async function createStaff(role: string, displayName: string, departmentId?: string) {
  if (role !== 'can_bo' && role !== 'tnv') {
    throw new Error('Vai trò phải là "can_bo" hoặc "tnv"');
  }
  const userId = crypto.randomUUID();
  await sql`
    INSERT INTO staff_profiles (user_id, role, display_name, department_id, is_active)
    VALUES (${userId}, ${role}, ${displayName}, ${departmentId || null}, true);
  `;
  console.log(`✅ Đã tạo nhân viên "${displayName}" (${role}) với ID: ${userId}`);
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
        if (!process.argv[3] || !process.argv[4])
          throw new Error('Thiếu tham số vai trò hoặc họ tên');
        await createStaff(process.argv[3], process.argv[4], process.argv[5]);
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
  npm run staff:create <can_bo|tnv> <tên> [mã_bộ_phận]
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
