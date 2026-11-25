import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { loadLocalEnv, requireEnv, databaseUrl, maskDbUrl } from './lib/env';
import { ensureAuthUser } from './lib/supabase-admin';

loadLocalEnv();

function hashSecret(val: string): string {
  return crypto.createHmac('sha256', requireEnv('OWNER_KEY_PEPPER')).update(val).digest('hex');
}

export function idToUuid(id: string): string {
  const hash = crypto.createHash('md5').update(`report_${id}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function runSeed(connectionString: string = databaseUrl()) {
  console.log('--- BẮT ĐẦU CHẠY SEED DỮ LIỆU ---');
  console.log(`Kết nối DB: ${maskDbUrl(connectionString)}`);

  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Seed Departments
    console.log('1. Nạp danh sách bộ phận (departments)...');
    const departments = [
      { id: 'doi_ve_sinh', name: 'Bộ phận Môi trường – Đội vệ sinh môi trường', sort: 1 },
      { id: 'doi_chieu_sang', name: 'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng', sort: 2 },
      { id: 'doi_thoat_nuoc', name: 'Phòng KT-HT&ĐT – Đội thoát nước', sort: 3 },
      { id: 'doi_duy_tu', name: 'Phòng KT-HT&ĐT – Đội duy tu đường', sort: 4 },
      { id: 'kinh_te', name: 'Bộ phận Kinh tế – Hạ tầng đô thị', sort: 5 },
    ];

    for (const d of departments) {
      await sql`
        INSERT INTO departments (id, name, is_active, sort)
        VALUES (${d.id}, ${d.name}, true, ${d.sort})
        ON CONFLICT (id) DO UPDATE SET name = ${d.name}, sort = ${d.sort};
      `;
    }

    // 2. Seed Category Settings
    console.log('2. Nạp cấu hình SLA & Gợi ý bộ phận (category_settings)...');
    const categorySettings = [
      {
        category: 'den_duong',
        label: 'Đèn đường',
        default_department_id: 'doi_chieu_sang',
        sla_days: 3,
      },
      {
        category: 'ngap_nuoc',
        label: 'Ngập nước',
        default_department_id: 'doi_thoat_nuoc',
        sla_days: 2,
      },
      {
        category: 'rac_thai',
        label: 'Rác thải',
        default_department_id: 'doi_ve_sinh',
        sla_days: 2,
      },
      {
        category: 'mat_duong',
        label: 'Mặt đường',
        default_department_id: 'doi_duy_tu',
        sla_days: 5,
      },
    ];

    for (const cs of categorySettings) {
      await sql`
        INSERT INTO category_settings (category, label, default_department_id, sla_days)
        VALUES (${cs.category}, ${cs.label}, ${cs.default_department_id}, ${cs.sla_days})
        ON CONFLICT (category) DO UPDATE SET
          label = ${cs.label},
          default_department_id = ${cs.default_department_id},
          sla_days = ${cs.sla_days};
      `;
    }

    // 3. Seed Staff: tạo user thật trong Supabase Auth (mật khẩu lấy từ biến môi trường), rồi ghi staff_profiles
    console.log('3. Tạo tài khoản cán bộ/TNV trong Supabase Auth và nạp staff_profiles...');
    const staffPassword = requireEnv('SEED_STAFF_PASSWORD');
    const staff = [
      {
        user_id: '11111111-1111-1111-1111-111111111111',
        email: 'cb.minh@tranbien.gov.vn',
        role: 'can_bo',
        display_name: 'Nguyễn Văn Minh',
        department_id: 'kinh_te',
      },
      {
        user_id: '22222222-2222-2222-2222-222222222222',
        email: 'tnv.mai@tranbien.gov.vn',
        role: 'tnv',
        display_name: 'Trần Thị Mai',
        department_id: null,
      },
      {
        user_id: '33333333-3333-3333-3333-333333333333',
        email: 'tnv.nam@tranbien.gov.vn',
        role: 'tnv',
        display_name: 'Lê Hoàng Nam',
        department_id: null,
      },
      {
        user_id: '44444444-4444-4444-4444-444444444444',
        email: 'tnv.quynhanh@tranbien.gov.vn',
        role: 'tnv',
        display_name: 'Phạm Quỳnh Anh',
        department_id: null,
      },
    ];

    for (const s of staff) {
      const authId = await ensureAuthUser({
        id: s.user_id,
        email: s.email,
        password: staffPassword,
      });
      if (authId !== s.user_id) {
        throw new Error(
          `User ${s.email} đã tồn tại trong Supabase Auth với id khác (${authId}). Chạy "supabase db reset" rồi seed lại.`
        );
      }
      await sql`
        INSERT INTO staff_profiles (user_id, email, role, display_name, department_id, is_active)
        VALUES (${s.user_id}, ${s.email}, ${s.role}, ${s.display_name}, ${s.department_id}, true)
        ON CONFLICT (user_id) DO UPDATE SET
          email = ${s.email},
          display_name = ${s.display_name},
          role = ${s.role},
          department_id = ${s.department_id};
      `;
    }

    // 4. Seed Reports from mock.json
    console.log('4. Đọc src/data/mock.json và nạp 64 hồ sơ...');
    const mockFile = path.resolve(__dirname, '../src/data/mock.json');
    if (!fs.existsSync(mockFile)) {
      throw new Error(`Không tìm thấy file mock.json tại ${mockFile}`);
    }

    const raw = fs.readFileSync(mockFile, 'utf-8');
    const { reports, volunteerTasks } = JSON.parse(raw);

    // Tắt trigger report_timeline tạm thời nếu cần re-seed xóa timeline cũ
    await sql`ALTER TABLE report_timeline DISABLE TRIGGER report_timeline_immutable_trigger;`;

    for (const r of reports) {
      const reportUuid = idToUuid(r.id);
      const secretHash = hashSecret(r.secretCode || '1234');
      const ownerTokenHash = hashSecret(`token_${r.id}`);

      const lng = r.lng ?? r.location?.lng ?? 106.8225;
      const lat = r.lat ?? r.location?.lat ?? 10.9505;
      const address = r.address ?? r.location?.address ?? 'UBND Phường Trấn Biên';
      const locationNote = r.locationNote ?? r.location?.note ?? null;
      const pointSql = `POINT(${lng} ${lat})`;

      let deptId: string | null = null;
      if (r.department) {
        if (r.department.includes('vệ sinh') || r.department.includes('Môi trường'))
          deptId = 'doi_ve_sinh';
        else if (r.department.includes('chiếu sáng')) deptId = 'doi_chieu_sang';
        else if (r.department.includes('thoát nước')) deptId = 'doi_thoat_nuoc';
        else if (r.department.includes('duy tu')) deptId = 'doi_duy_tu';
        else if (r.department.includes('Kinh tế')) deptId = 'kinh_te';
      }

      // Xác định merged_into uuid
      const mergedIntoUuid = r.mergedInto ? idToUuid(r.mergedInto) : null;

      await sql`
        INSERT INTO reports (
          id, code, category, status, status_before_merge, priority,
          location, address, location_note, description, department_id,
          due_at, created_at, completed_at, reporter_phone, anonymous,
          subscribed_later, on_behalf, secret_code_hash, owner_token_hash,
          anonymous_follows, merged_into, photos_approved, is_seed, version
        ) VALUES (
          ${reportUuid}, ${r.id}, ${r.category}, ${r.status}, ${r.statusBeforeMerge || null}, ${r.priority},
          ST_GeographyFromText(${pointSql}), ${address}, ${locationNote}, ${r.description || null},
          ${deptId}, ${r.dueAt || null}, ${r.createdAt}, ${r.completedAt || null},
          ${r.anonymous ? null : r.reporterPhone || null}, ${Boolean(r.anonymous)},
          ${Boolean(r.subscribedLater)}, ${Boolean(r.onBehalf)}, ${secretHash}, ${ownerTokenHash},
          ${r.anonymousFollows || 0}, ${mergedIntoUuid}, true, true, 1
        )
        ON CONFLICT (code) DO UPDATE SET
          status = EXCLUDED.status,
          due_at = EXCLUDED.due_at,
          completed_at = EXCLUDED.completed_at,
          photos_approved = true,
          is_seed = true;
      `;

      // 4a. Photos
      await sql`DELETE FROM report_photos WHERE report_id = ${reportUuid};`;
      const beforePhotos = r.photos ?? r.photoPaths ?? [];
      let sortOrder = 0;
      for (const p of beforePhotos) {
        await sql`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${reportUuid}, 'before', ${p}, ${sortOrder++}, 'static');
        `;
      }
      const afterPhotos = r.resultPhotos ?? r.afterPhotoPaths ?? [];
      sortOrder = 0;
      for (const p of afterPhotos) {
        await sql`
          INSERT INTO report_photos (report_id, kind, storage_path, sort, source)
          VALUES (${reportUuid}, 'after', ${p}, ${sortOrder++}, 'static');
        `;
      }

      // 4b. Followers
      await sql`DELETE FROM report_followers WHERE report_id = ${reportUuid};`;
      if (Array.isArray(r.followers)) {
        for (const f of r.followers) {
          await sql`
            INSERT INTO report_followers (report_id, phone, source)
            VALUES (${reportUuid}, ${f}, 'also_me')
            ON CONFLICT DO NOTHING;
          `;
        }
      }

      // 4c. Timeline
      await sql`DELETE FROM report_timeline WHERE report_id = ${reportUuid};`;
      if (Array.isArray(r.timeline)) {
        for (const item of r.timeline) {
          let actorType = 'system';
          const actorLabel = item.actor || 'Hệ thống';
          let actorStaffId = null;

          if (actorLabel.includes('Nguyễn Văn Minh')) {
            actorType = 'staff';
            actorStaffId = '11111111-1111-1111-1111-111111111111';
          } else if (
            actorLabel.includes('Tình nguyện viên') ||
            actorLabel.includes('Trần Thị Mai')
          ) {
            actorType = 'staff';
            actorStaffId = '22222222-2222-2222-2222-222222222222';
          } else if (actorLabel.includes('Người dân')) {
            actorType = 'citizen';
          } else if (
            actorLabel.includes('Bộ phận') ||
            actorLabel.includes('Đội') ||
            actorLabel.includes('Phòng')
          ) {
            actorType = 'staff';
          }

          await sql`
            INSERT INTO report_timeline (report_id, at, status, actor_type, actor_staff_id, actor_label, note)
            VALUES (${reportUuid}, ${item.at}, ${item.status}, ${actorType}, ${actorStaffId}, ${actorLabel}, ${item.note || null});
          `;
        }
      }

      // 4d. Feedback
      if (r.feedback) {
        await sql`
          INSERT INTO feedback (report_id, resolved, rating, tags, comment, at)
          VALUES (
            ${reportUuid},
            ${Boolean(r.feedback.resolved)},
            ${r.feedback.rating ?? null},
            ${sql.json(r.feedback.tags || [])},
            ${r.feedback.comment || null},
            ${r.feedback.at || r.completedAt || r.createdAt}
          )
          ON CONFLICT (report_id) DO UPDATE SET
            resolved = EXCLUDED.resolved,
            rating = EXCLUDED.rating,
            tags = EXCLUDED.tags,
            comment = EXCLUDED.comment;
        `;
      }
    }

    // 4e. Cờ nghi trùng: cùng loại, cách nhau ≤ 50 m (ST_DWithin), cả hai hồ sơ còn mở
    console.log('4e. Gắn cờ các phản ánh nghi trùng lặp (ST_DWithin)...');
    await sql`DELETE FROM report_duplicate_flags;`;
    await sql`
      INSERT INTO report_duplicate_flags (report_id, other_report_id)
      SELECT a.id, b.id
      FROM reports a
      JOIN reports b
        ON a.id <> b.id
       AND a.category = b.category
       AND ST_DWithin(a.location, b.location, 50)
      WHERE a.is_seed AND b.is_seed
        AND a.status NOT IN ('dong', 'hoan_thanh')
        AND b.status NOT IN ('dong', 'hoan_thanh')
      ON CONFLICT DO NOTHING;
    `;

    // Bật lại trigger immutable
    await sql`ALTER TABLE report_timeline ENABLE TRIGGER report_timeline_immutable_trigger;`;

    // 5. Seed Volunteer Tasks
    console.log('5. Nạp danh sách nhiệm vụ tình nguyện viên (volunteer_tasks)...');
    if (Array.isArray(volunteerTasks)) {
      for (const t of volunteerTasks) {
        const taskUuid = idToUuid(t.id);
        const reportUuid = idToUuid(t.reportId);
        let assigneeId = null;
        if (t.assignee === 'Trần Thị Mai' || t.assigneeId === 'tnv_01') {
          assigneeId = '22222222-2222-2222-2222-222222222222';
        }

        await sql`
          INSERT INTO volunteer_tasks (
            id, code, report_id, type, status, assignee_id,
            result_exists, result_severity, result_note, result_at
          ) VALUES (
            ${taskUuid}, ${t.id}, ${reportUuid}, ${t.type}, ${t.status}, ${assigneeId},
            ${t.result?.exists || null}, ${t.result?.severity || null}, ${t.result?.note || null}, ${t.result?.at || null}
          )
          ON CONFLICT (code) DO UPDATE SET
            status = EXCLUDED.status,
            result_exists = EXCLUDED.result_exists,
            result_severity = EXCLUDED.result_severity,
            result_note = EXCLUDED.result_note,
            result_at = EXCLUDED.result_at;
        `;
      }
    }

    // 6. Seed App Settings
    console.log('6. Nạp cấu hình hệ thống (app_settings)...');
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES (
        'clock',
        ${sql.json({ mode: 'fixed', fixedAt: '2026-11-24T09:00:00+07:00' })}
      )
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;

    await sql`
      INSERT INTO app_settings (key, value)
      VALUES (
        'ward',
        ${sql.json({
          name: 'Phường Trấn Biên',
          city: 'Thành phố Biên Hòa',
          center: { lat: 10.9505, lng: 106.8225 },
          boundaryRadiusMeters: 5000,
        })}
      )
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `;

    console.log('✅ SEED DỮ LIỆU THÀNH CÔNG VÀ TOÀN VẸN!');
  } catch (error) {
    console.error('❌ LỖI KHI CHẠY SEED:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Nếu gọi trực tiếp từ CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed().catch(() => process.exit(1));
}
