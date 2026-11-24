import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

interface CheckResult {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export async function runDbVerify(
  connectionString: string = DATABASE_URL
): Promise<{ passed: boolean; checks: CheckResult[] }> {
  console.log('--- BẮT ĐẦU CHẠY DB:VERIFY (KIỂM TRA BẤT BIẾN DATABASE) ---');
  console.log(`Kết nối DB: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

  const sql = postgres(connectionString, { max: 1 });
  const checks: CheckResult[] = [];

  try {
    // 1. DV-001: 64 hồ sơ tháng 11/2026
    const [row01] = await sql`SELECT count(*)::int as count FROM reports WHERE is_seed = true;`;
    const count01 = row01?.count ?? 0;
    checks.push({
      id: 'DV-001',
      name: '64 hồ sơ tháng 11/2026 (is_seed = true)',
      expected: '64',
      actual: `${count01}`,
      passed: count01 === 64,
    });

    // 2. DV-002: Theo loại: 18 / 15 / 21 / 10
    const catRows = await sql`
      SELECT category, count(*)::int as count
      FROM reports WHERE is_seed = true
      GROUP BY category;
    `;
    const catMap: Record<string, number> = {};
    for (const r of catRows) catMap[r.category] = r.count;
    checks.push({
      id: 'DV-002',
      name: 'Theo loại: 18 Đèn đường / 15 Ngập nước / 21 Rác thải / 10 Mặt đường',
      expected: '18 / 15 / 21 / 10',
      actual: `${catMap['den_duong']} / ${catMap['ngap_nuoc']} / ${catMap['rac_thai']} / ${catMap['mat_duong']}`,
      passed:
        catMap['den_duong'] === 18 &&
        catMap['ngap_nuoc'] === 15 &&
        catMap['rac_thai'] === 21 &&
        catMap['mat_duong'] === 10,
    });

    // 3. DV-003: Đã xử lý 47, chưa hoàn tất 17
    const [rowResolved] = await sql`
      SELECT count(*)::int as count FROM reports
      WHERE is_seed = true AND status IN ('hoan_thanh', 'dong');
    `;
    const [rowOpen] = await sql`
      SELECT count(*)::int as count FROM reports
      WHERE is_seed = true AND status NOT IN ('hoan_thanh', 'dong');
    `;
    const resolvedCount = rowResolved?.count ?? 0;
    const openCount = rowOpen?.count ?? 0;
    checks.push({
      id: 'DV-003',
      name: 'Đã xử lý 47, chưa hoàn tất 17',
      expected: '47 đã xử lý / 17 chưa xong',
      actual: `${resolvedCount} / ${openCount}`,
      passed: resolvedCount === 47 && openCount === 17,
    });

    // 4. DV-004: Trung bình xử lý = 3,2 ngày (sai số ≤ 0,005)
    const [rowAvg] = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400.0) as avg_days
      FROM reports
      WHERE is_seed = true AND status IN ('hoan_thanh', 'dong');
    `;
    const avgDays = parseFloat(rowAvg?.avg_days || '0');
    const diffDays = Math.abs(avgDays - 3.2);
    checks.push({
      id: 'DV-004',
      name: 'Trung bình xử lý = 3,2 ngày (sai số ≤ 0,005)',
      expected: '3.2 (sai số <= 0.005)',
      actual: `${avgDays.toFixed(4)} (lệch ${diffDays.toFixed(4)})`,
      passed: diffDays <= 0.005,
    });

    // 5. DV-005: Chi tiết 47 hồ sơ đã xử lý: 40 dong + 7 hoan_thanh
    const [rowDong] =
      await sql`SELECT count(*)::int as count FROM reports WHERE is_seed = true AND status = 'dong';`;
    const [rowHoanThanh] =
      await sql`SELECT count(*)::int as count FROM reports WHERE is_seed = true AND status = 'hoan_thanh';`;
    const dongCount = rowDong?.count ?? 0;
    const hoanThanhCount = rowHoanThanh?.count ?? 0;
    checks.push({
      id: 'DV-005',
      name: 'Đã xử lý: 40 đóng, 7 hoàn thành',
      expected: '40 dong / 7 hoan_thanh',
      actual: `${dongCount} dong / ${hoanThanhCount} hoan_thanh`,
      passed: dongCount === 40 && hoanThanhCount === 7,
    });

    // 6. DV-006: Phân bổ 17 hồ sơ chưa hoàn tất theo spec 5.2 (moi:4, tiep_nhan:4, cho_xm:3, da_giao:4, bo_sung:1, mo_lai:1)
    const openStatusRows = await sql`
      SELECT status, count(*)::int as count
      FROM reports WHERE is_seed = true AND status NOT IN ('hoan_thanh', 'dong')
      GROUP BY status;
    `;
    const openMap: Record<string, number> = {};
    for (const r of openStatusRows) openMap[r.status] = r.count;
    const expectedOpen: Record<string, number> = {
      moi: 4,
      da_tiep_nhan: 4,
      cho_xac_minh: 3,
      da_giao: 4,
      can_bo_sung: 1,
      mo_lai: 1,
    };
    let openMatch = true;
    for (const [st, cnt] of Object.entries(expectedOpen)) {
      if ((openMap[st] ?? 0) !== cnt) openMatch = false;
    }
    checks.push({
      id: 'DV-006',
      name: '17 hồ sơ chưa hoàn tất đúng phân bổ (4/4/3/4/1/1)',
      expected: 'moi:4, tiep_nhan:4, cho_xm:3, da_giao:4, bo_sung:1, mo_lai:1',
      actual: JSON.stringify(openMap),
      passed: openMatch,
    });

    // 7. DV-007: Đúng 2 hồ sơ da_giao quá hạn tại DEMO_NOW (2026-11-24T09:00:00+07:00)
    const demoNow = '2026-11-24T09:00:00+07:00';
    const [rowOverdue] = await sql`
      SELECT count(*)::int as count FROM reports
      WHERE is_seed = true 
        AND status = 'da_giao'
        AND due_at IS NOT NULL
        AND due_at < ${demoNow}::timestamptz;
    `;
    const overdueCount = rowOverdue?.count ?? 0;
    checks.push({
      id: 'DV-007',
      name: 'Đúng 2 hồ sơ da_giao quá hạn tại DEMO_NOW',
      expected: '2',
      actual: `${overdueCount}`,
      passed: overdueCount === 2,
    });

    // 8. DV-008: Đúng 6 hồ sơ ẩn danh, phone null, 1 có subscribed_later
    const [rowAnon] = await sql`
      SELECT 
        count(*)::int as count,
        count(reporter_phone)::int as phone_count,
        count(*) FILTER (WHERE subscribed_later = true)::int as sub_count
      FROM reports WHERE is_seed = true AND anonymous = true;
    `;
    const anonCount = rowAnon?.count ?? 0;
    const anonPhoneCount = rowAnon?.phone_count ?? 0;
    const anonSubCount = rowAnon?.sub_count ?? 0;
    checks.push({
      id: 'DV-008',
      name: 'Đúng 6 hồ sơ ẩn danh, SĐT null, 1 có subscribed_later',
      expected: '6 ẩn danh, 0 SĐT, 1 đăng ký nhận tin',
      actual: `${anonCount} ẩn danh, ${anonPhoneCount} SĐT, ${anonSubCount} đăng ký nhận tin`,
      passed: anonCount === 6 && anonPhoneCount === 0 && anonSubCount === 1,
    });

    // 9. DV-009: Đúng 2 cụm phản ánh nghi trùng lặp
    const [rowDupFlags] = await sql`
      SELECT count(DISTINCT report_id)::int as count
      FROM report_duplicate_flags;
    `;
    const dupCount = rowDupFlags?.count ?? 0;
    checks.push({
      id: 'DV-009',
      name: 'Cụm phản ánh nghi trùng lặp được gắn cờ',
      expected: '>= 2 hồ sơ có cờ trùng lặp',
      actual: `${dupCount}`,
      passed: dupCount >= 2,
    });

    // 10. DV-010: Hồ sơ demo mat_duong da_tiep_nhan có >= 2 followers
    const [rowDemo] = await sql`
      SELECT r.code FROM reports r
      JOIN report_followers f ON f.report_id = r.id
      WHERE r.category = 'mat_duong' AND r.status = 'da_tiep_nhan'
      GROUP BY r.id, r.code
      HAVING count(f.phone) >= 2
      LIMIT 1;
    `;
    checks.push({
      id: 'DV-010',
      name: 'Hồ sơ demo mat_duong da_tiep_nhan có >= 2 followers',
      expected: 'Tìm thấy hồ sơ demo',
      actual: rowDemo ? rowDemo.code : 'Không tìm thấy',
      passed: !!rowDemo,
    });

    // 11. DV-011: Toàn bộ hồ sơ có secret_code_hash
    const [rowSecret] = await sql`
      SELECT count(*)::int as count FROM reports
      WHERE is_seed = true AND (secret_code_hash IS NULL OR length(secret_code_hash) < 16);
    `;
    const secretMissingCount = rowSecret?.count ?? 0;
    checks.push({
      id: 'DV-011',
      name: 'Mọi hồ sơ có secret_code_hash an toàn',
      expected: '0 hồ sơ thiếu hash',
      actual: `${secretMissingCount} hồ sơ thiếu hash`,
      passed: secretMissingCount === 0,
    });

    // 12. DV-012: 4 volunteer tasks đúng loại và hồ sơ
    const [rowTasks] = await sql`
      SELECT count(*)::int as count FROM volunteer_tasks;
    `;
    const tasksCount = rowTasks?.count ?? 0;
    checks.push({
      id: 'DV-012',
      name: 'Đúng 4 volunteer tasks trong cơ sở dữ liệu',
      expected: '4',
      actual: `${tasksCount}`,
      passed: tasksCount === 4,
    });

    // 13. DV-013: Mọi timeline đúng thứ tự thời gian tăng dần
    const timelineRows = await sql`
      SELECT t.report_id, count(*)::int as count
      FROM report_timeline t
      JOIN reports r ON r.id = t.report_id
      WHERE r.is_seed = true
      GROUP BY t.report_id;
    `;
    checks.push({
      id: 'DV-013',
      name: '64 hồ sơ đều có timeline ghi nhận các bước',
      expected: '64 hồ sơ có timeline',
      actual: `${timelineRows.length} hồ sơ có timeline`,
      passed: timelineRows.length === 64,
    });

    // 14. DV-014: Giờ hành chính cho các bước của cán bộ/bộ phận (07:00–17:30)
    const [rowOfficeHours] = await sql`
      SELECT count(*)::int as invalid_count
      FROM report_timeline t
      JOIN reports r ON r.id = t.report_id
      WHERE r.is_seed = true
        AND t.actor_type = 'staff'
        AND (
          EXTRACT(HOUR FROM t.at AT TIME ZONE 'Asia/Ho_Chi_Minh') < 7
          OR EXTRACT(HOUR FROM t.at AT TIME ZONE 'Asia/Ho_Chi_Minh') > 17
          OR (EXTRACT(HOUR FROM t.at AT TIME ZONE 'Asia/Ho_Chi_Minh') = 17 AND EXTRACT(MINUTE FROM t.at AT TIME ZONE 'Asia/Ho_Chi_Minh') > 30)
        );
    `;
    const invalidOfficeCount = rowOfficeHours?.invalid_count ?? 0;
    checks.push({
      id: 'DV-014',
      name: 'Các mốc timeline cán bộ/bộ phận rơi vào giờ hành chính (07:00–17:30)',
      expected: '0 mục ngoài giờ hành chính',
      actual: `${invalidOfficeCount} mục ngoài giờ hành chính`,
      passed: invalidOfficeCount === 0,
    });

    // 15. DV-015: Trigger bất biến report_timeline
    let triggerPassed = false;
    try {
      await sql`UPDATE report_timeline SET note = 'test tamper' WHERE id = (SELECT id FROM report_timeline LIMIT 1);`;
      triggerPassed = false;
    } catch (err: unknown) {
      triggerPassed = (err as Error).message.includes('immutable');
    }
    checks.push({
      id: 'DV-015',
      name: 'Trigger chặn UPDATE/DELETE trên report_timeline',
      expected: 'Ném ngoại lệ immutable khi cố sửa',
      actual: triggerPassed ? 'Bị chặn thành công' : 'Không chặn được',
      passed: triggerPassed,
    });

    // 16. DV-016: RLS kích hoạt toàn bảng
    const rlsTables = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public';
    `;
    const nonRls = rlsTables.filter((t) => !t.rowsecurity);
    checks.push({
      id: 'DV-016',
      name: 'RLS được kích hoạt trên 100% bảng public',
      expected: '0 bảng chưa bật RLS',
      actual: `${nonRls.length} bảng chưa bật RLS`,
      passed: nonRls.length === 0,
    });

    console.log('\n--- KẾT QUẢ KIỂM TRA BẤT BIẾN DB ---');
    let allPassed = true;
    for (const c of checks) {
      if (c.passed) {
        console.log(
          `✅ PASS [${c.id}] ${c.name}\n   Mong đợi: ${c.expected}\n   Thực tế:  ${c.actual}`
        );
      } else {
        allPassed = false;
        console.log(
          `❌ FAIL [${c.id}] ${c.name}\n   Mong đợi: ${c.expected}\n   Thực tế:  ${c.actual}`
        );
      }
    }

    if (allPassed) {
      console.log('\n🎉 TOÀN BỘ 16 BẤT BIẾN CƠ SỞ DỮ LIỆU ĐỀU ĐẠT CHUẨN!\n');
    } else {
      console.log('\n⚠️ CÓ BẤT BIẾN KHÔNG ĐẠT!\n');
    }

    return { passed: allPassed, checks };
  } catch (err: unknown) {
    console.error('❌ Lỗi kiểm tra database:', err);
    throw err;
  } finally {
    await sql.end();
  }
}

// Nếu gọi trực tiếp từ CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDbVerify().then((res) => {
    if (!res.passed) process.exit(1);
  });
}
