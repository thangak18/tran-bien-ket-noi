# Bảng Truy Vết Giai Đoạn 2 (Traceability Matrix)

Hệ thống: **Trấn Biên Kết Nối**  
Chuỗi truy vết: **Proposal v3 → Spec v3 → Plan → Tasks → Tests → Code Implementation**  
Thời điểm xác thực: **02:00 25/11/2026**  
Trạng thái tổng thể: **100% Khớp - 0 Lỗ hổng - 100% Pass Kiểm thử**

---

## 1. Ma Trận Truy Vết Theo Yêu Cầu Chức Năng (Functional Traceability)

| Mã Yêu Cầu | Đề Mục Proposal v3 | Mục Spec v3 | Task (tasks.md) | Bộ Kiểm Thử (tests.md) | Hiện Thực Mã Nguồn (Code) | Trạng Thái |
|---|---|---|---|---|---|:---:|
| **DB-CORE** | Mục 2 & 6: PostgreSQL + PostGIS | Mục 10: 16 bảng, 9 enum, RLS | G2-03a, G2-03b | DB-SCHEMA-001 → 003, DV-001 → 016 | `server/db/schema.ts`, `migrations/0000_init.sql` | ✅ PASS |
| **SEED-INV** | Mục 4: Bất biến 64/47/3.2 | Mục 16.3: Seed & verify | G2-03c, G2-03d | DV-001 → DV-016 (mock & DB) | `scripts/seed.ts`, `scripts/db-verify.ts` | ✅ PASS |
| **API-PUB** | Mục 3: Cổng công dân & minh bạch | Mục 11: GET /public/reports, kpi | G2-04a, G2-04b | API-PUB-001 → 004, LEAK-001 | `server/routes/public.ts` | ✅ PASS |
| **API-CIT** | Mục 3: Báo sự cố, tra cứu, đánh giá | Mục 11: /citizen/reports, otp, claim | G2-04c, G2-05a | API-CIT-001 → 003, AC-AUTH-1 → 4 | `server/routes/citizen.ts`, `middleware/auth.ts` | ✅ PASS |
| **API-OFF** | Mục 3: Cán bộ tiếp nhận, giao việc | Mục 11: /officer/reports, accept, merge | G2-04d, G2-05b | API-OFF-001, AC-A01, AC-A02 | `server/routes/officer.ts` | ✅ PASS |
| **API-VOL** | Mục 3: TNV nhận và nộp kết quả | Mục 11: /volunteer/tasks, claim, submit | G2-04e, G2-05b | API-VOL-001, AC-V01, AC-V02 | `server/routes/volunteer.ts` | ✅ PASS |
| **PHOTO-S3**| Mục 6: Supabase Storage, ký URL | Mục 15: /uploads/sign (JPEG/PNG/WebP) | G2-06a, G2-06b | PHOTO-001, AC-PHOTO-1 → 4 | `server/routes/uploads.ts`, `src/lib/api.ts` | ✅ PASS |
| **CRON-OPS**| Mục 6: Tự đóng sau 7 ngày, dọn rác | Mục 12.7: /cron/sweep-overdue | G2-04g | CRON-001, AC-OPS-4 | `server/routes/cron.ts`, `vercel.json` | ✅ PASS |
| **AUTH-SEC**| Mục 5: JWT 30 ngày, role check | Mục 13: Middleware xác thực | G2-05a, G2-05b | AC-AUTH-1 → 8 | `server/middleware/auth.ts`, `server/clock.ts` | ✅ PASS |
| **RATE-LIMIT**| Mục 5: 5 lần/15p IP, quota ẩn danh | Mục 13.4: Bảng access_attempts | G2-04f | AC-SEC-1 → 4 | `server/middleware/rateLimit.ts` | ✅ PASS |
| **IDEMP-KEY**| Mục 6: Chống trùng lặp gửi mạng yếu | Mục 11: Header Idempotency-Key | G2-04f | AC-DATA-5 | `server/middleware/idempotency.ts` | ✅ PASS |
| **CLI-STAFF**| Mục 7: Quản lý nhân viên & SLA | Mục 13.2, 14: staff CLI | G2-10a, G2-10b | OPS-STAFF-001 → 003 | `scripts/staff.ts`, `scripts/ops.ts` | ✅ PASS |
| **FE-LOGIN**| Mục 3: Đăng nhập nhân viên/dân | Mục 13: Màn /dang-nhap, bảo vệ route | G2-10c | AC-LOGIN-1 → 5 | `screens/auth/LoginScreen.tsx`, `ProtectedRoute.tsx` | ✅ PASS |
| **FE-DATA** | Mục 6: DataSource Local/API | Mục 16.1: VITE_DATA_SOURCE | G2-07a → G2-07d | DS-001, DS-002, API-CLIENT-001 | `data/DataSource.ts`, `ApiDataSource.ts`, `LocalDataSource.ts` | ✅ PASS |
| **TEST-FIX**| Sửa toàn diện sau Redesign | Toàn bộ Spec 6 & 7 | G2-09 | 39 test files (229 tests pass) | `tests/component/*`, `tests/setup.ts` | ✅ PASS |
| **CI-OPS**  | Mục 6: Vercel & GitHub Actions | Mục 16: CI pipeline | G2-11a, G2-11b | OPS-VERCEL-001, CI-001, DOC-001 | `.github/workflows/ci.yml`, `docs/van-hanh.md` | ✅ PASS |

---

## 2. Truy Vết 16 Bất Biến Dữ Liệu (Invariants DV-001 → DV-016)

| ID | Tên Bất Biến | Giá Trị Mong Đợi | Kết Quả Mock | Kết Quả DB Live | File Kiểm Thử |
|---|---|---|:---:|:---:|---|
| **DV-001** | Tổng số phản ánh tháng 11/2026 | Đúng 64 hồ sơ (`is_seed = true`) | 64 (PASS) | 64 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-002** | Phân bổ theo 4 loại sự cố | Đèn: 18, Ngập: 15, Rác: 21, Đường: 10 | Đạt chuẩn (PASS) | Đạt chuẩn (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-003** | Tỷ lệ xử lý | 47 đã xử lý, 17 chưa hoàn tất | 47 / 17 (PASS) | 47 / 17 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-004** | Thời gian xử lý trung bình 47 hồ sơ | **3,2000 ngày** (sai số ≤ 0,005) | 3.2000 (PASS) | 3.2000 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-005** | Phân bổ trạng thái đã xử lý | 40 đóng (`dong`), 7 hoàn thành (`hoan_thanh`)| 40 / 7 (PASS) | 40 / 7 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-006** | Phân bổ 17 hồ sơ mở | 4 mới, 4 tiếp nhận, 3 xác minh, 4 giao, 1 bổ sung, 1 mở lại | 4/4/3/4/1/1 (PASS) | 4/4/3/4/1/1 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-007** | Số hồ sơ quá hạn tại DEMO_NOW | Đúng 2 hồ sơ quá hạn | 2 (PASS) | 2 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-008** | Hồ sơ ẩn danh & bảo mật SĐT | Đúng 6 hồ sơ, SĐT null, 1 đăng ký nhận tin | Đạt chuẩn (PASS) | Đạt chuẩn (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-009** | Phát hiện cụm nghi trùng | Đúng 2 cụm (khoảng cách 15–50m cùng loại) | Đạt chuẩn (PASS) | Đạt chuẩn (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-010** | Hồ sơ demo theo dõi | Mặt đường `da_tiep_nhan` có ≥ 2 followers | TB-0060 (PASS) | TB-0060 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-011** | Bảo mật mã bí mật | 100% hồ sơ có `secret_code_hash` an toàn | Đạt chuẩn (PASS) | Đạt chuẩn (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-012** | Nhiệm vụ tình nguyện viên | Đúng 4 tasks (3 xác minh, 1 nghiệm thu mở lại) | 4 (PASS) | 4 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-013** | Tính tuần tự timeline | 100% hồ sơ có timeline tăng dần | 64 (PASS) | 64 (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-014** | Giờ hành chính cán bộ/bộ phận | Mọi bước cán bộ nằm trong 07:00–17:30 | 0 lỗi (PASS) | 0 lỗi (PASS) | `scripts/verify-mock.ts`, `scripts/db-verify.ts` |
| **DV-015** | Trigger bất biến lịch sử | Chặn UPDATE/DELETE trên `report_timeline` | N/A (Client) | Bị chặn (PASS) | `scripts/db-verify.ts` |
| **DV-016** | Row-Level Security (RLS) | 100% bảng public kích hoạt RLS | N/A (Client) | 16/16 bảng (PASS) | `scripts/db-verify.ts` |

---

## 3. Kết Quả Kiểm Chứng Tự Động Toàn Hệ Thống

1. **Static Analysis & Formatting:**
   - ESLint: **0 errors, 0 warnings**
   - Prettier: **100% files conform**
   - TypeScript (`tsc --noEmit`): **0 errors**
2. **Automated Test Suite (Vitest):**
   - **39 file kiểm thử**
   - **229 ca kiểm thử**
   - Tỷ lệ đỗ: **100% (229/229)**
3. **Database Live Verification:**
   - Kết nối: PostgreSQL 16 (Live database `tranbien`)
   - Bất biến kiểm tra: **16/16 PASS (100%)**
4. **Production Build:**
   - Vite 6 production bundling: **Thành công trong 1.35s** (output `dist/`).
