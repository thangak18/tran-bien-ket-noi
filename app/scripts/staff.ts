import { fileURLToPath } from 'node:url';
import {
  createStaff as createStaffAdmin,
  listCategorySettings,
  listStaff as listStaffAdmin,
  resetStaffPassword,
  setStaffActive,
  updateCategorySettings,
} from '../server/services/staffAdmin';
import { sqlClient } from '../server/db/client';

async function listStaff() {
  const rows = await listStaffAdmin();
  console.table(
    rows.map((row) => ({
      ID: row.id,
      Email: row.email,
      'Họ tên': row.displayName,
      'Vai trò': row.role,
      'Bộ phận': row.departmentName || 'Không',
      'Hoạt động': row.isActive ? 'Đang hoạt động' : 'Đã khoá',
    }))
  );
}

async function createStaff(
  role: string,
  displayName: string,
  email: string,
  departmentId?: string
) {
  if (role !== 'can_bo' && role !== 'tnv' && role !== 'admin') {
    throw new Error('Vai trò phải là "can_bo", "tnv" hoặc "admin"');
  }
  const result = await createStaffAdmin({
    role,
    displayName,
    email,
    departmentId,
  });
  console.log(`Đã tạo tài khoản "${result.staff.displayName}" (${result.staff.role}).`);
  console.log(`Mật khẩu tạm (chỉ hiển thị một lần): ${result.temporaryPassword}`);
}

async function setSla(category: string, rawDays: string) {
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new Error('Số ngày SLA phải là số nguyên từ 1 đến 30');
  }
  const settings = await listCategorySettings();
  const target = settings.find((setting) => setting.category === category);
  if (!target) throw new Error(`Không tìm thấy danh mục: ${category}`);
  const result = await updateCategorySettings(
    settings.map((setting) => ({
      category: setting.category as 'den_duong' | 'ngap_nuoc' | 'rac_thai' | 'mat_duong',
      slaDays: setting.category === category ? days : setting.sla_days,
      defaultDepartmentId: setting.default_department_id,
    }))
  );
  const updated = result.find((setting) => setting.category === category);
  console.log(`Đã cập nhật SLA "${updated?.label}" thành ${updated?.sla_days} ngày.`);
}

async function main() {
  const action = process.argv[2];
  try {
    switch (action) {
      case 'list':
        await listStaff();
        break;
      case 'create':
        if (!process.argv[3] || !process.argv[4] || !process.argv[5]) {
          throw new Error('Thiếu tham số vai trò, họ tên hoặc email');
        }
        await createStaff(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
        break;
      case 'disable':
        if (!process.argv[3]) throw new Error('Thiếu user_id');
        await setStaffActive(process.argv[3], false);
        console.log('Đã khoá tài khoản.');
        break;
      case 'enable':
        if (!process.argv[3]) throw new Error('Thiếu user_id');
        await setStaffActive(process.argv[3], true);
        console.log('Đã mở khoá tài khoản.');
        break;
      case 'reset-password': {
        if (!process.argv[3]) throw new Error('Thiếu user_id');
        const password = await resetStaffPassword(process.argv[3]);
        console.log(`Mật khẩu tạm (chỉ hiển thị một lần): ${password.temporaryPassword}`);
        break;
      }
      case 'set-sla':
        if (!process.argv[3] || !process.argv[4]) {
          throw new Error('Thiếu danh mục hoặc số ngày SLA');
        }
        await setSla(process.argv[3], process.argv[4]);
        break;
      default:
        console.log(`
Sử dụng:
  npm run staff:list
  npm run staff:create -- <can_bo|tnv|admin> <tên> <email> [mã_bộ_phận]
  npm run staff:disable -- <user_id>
  npm run staff:enable -- <user_id>
  npm run staff:reset-password -- <user_id>
  npm run config:set-sla -- <category> <số_ngày>
        `);
    }
  } catch (error) {
    console.error('Lỗi:', error instanceof Error ? error.message : 'Thao tác thất bại');
    process.exitCode = 1;
  } finally {
    await sqlClient.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
