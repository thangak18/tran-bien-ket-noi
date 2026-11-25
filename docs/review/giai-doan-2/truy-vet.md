# Bảng truy vết Giai đoạn 2

Chuỗi truy vết: `docs/spec.md` → `docs/plan.md` → `docs/tasks.md` → `docs/tests.md` → mã nguồn (file:dòng).
Số dòng tính tại commit cuối của đợt 25/11/2026 trên nhánh `feat/giai-doan-2`; có thể lệch vài dòng khi mã thay đổi.
Kết quả chạy thật nằm ở `ket-qua-kiem-chung.md`.

Trạng thái: ✅ đã làm và có test chạy thật · ⚠ làm một phần · ❌ chưa làm.

## 1. Yêu cầu chức năng

| Yêu cầu | Spec | Test (docs/tests.md) | Mã nguồn | Trạng thái |
|---|---|---|---|---|
| Schema PostGIS thật, RLS, trigger bất biến | 11.1–11.4 | DB-002, DB-017, DV-001…017 | `supabase/migrations/20261125000000_init.sql`, `scripts/db-verify.ts:298` | ✅ |
| Hardening: email nhân viên, FK `auth.users`, thu hồi quyền `anon`, index FK | 11.2, 13 | DV-016, DV-017 | `supabase/migrations/20261125010000_hardening.sql` | ✅ |
| Tìm trùng ≤ 50 m, 14 ngày, cùng loại bằng `ST_DWithin` | 3.5, 11.5 | PG-001…005 | `supabase/migrations/20261125010000_hardening.sql:41` (`find_duplicate_reports`), `tests/api/postgis-dwithin.test.ts` | ⚠ hàm DB và test đạt; chưa có endpoint, màn A02/C04 vẫn dùng `domain/duplicates.ts` (B2 đang hoãn) |
| Đăng nhập cán bộ/TNV bằng mật khẩu qua Supabase Auth | 13.2, AC-LOGIN-1…5 | LOGIN-001…009 | `server/routes/auth.ts:26` (xác thực mật khẩu), `:69` (`handleStaffLogin`) | ✅ |
| Phân quyền theo vai trò, 401/403, tài khoản bị khoá | 13.5, AC-AUTH-1…3 | AUTH-001…009, AUTHZ-003/004/006 | `server/middleware/auth.ts:111` (`requireStaffAuth`), `server/routes/volunteer.ts:15` (`tnvOnly`) | ✅ |
| Cron chỉ nhận `Authorization: Bearer` | 12.6 | OFF-010 | `server/middleware/auth.ts:180` | ✅ |
| Chuyển trạng thái qua một dịch vụ (khoá dòng, version, ma trận) | 3.3 | TRANS-001…006, OFF-002/003/005/006 | `server/services/transition.ts:46`, `:84` (tách hồ sơ) | ✅ |
| TNV nhận/nộp kết quả, không lộ SĐT | 12.5, AC-V01/V02 | VOL-000…007 | `server/routes/volunteer.ts:174` (claim), `:236` (nộp kết quả) | ✅ |
| Cán bộ tiếp nhận, giao TNV, hoàn thành, đóng, tách, tạo hộ | 3.3, AC-A02, B5 | OFF-001…009 | `server/routes/officer.ts:242`, `:296`, `:427`, `:790`, `:841`, `:876` | ✅ |
| Mã bí mật tạo hộ ngẫu nhiên bằng `crypto`, trả một lần | 13.4 | OFF-007, OFF-008 | `server/services/identifiers.ts`, `server/routes/officer.ts:876` | ✅ |
| Chỉ chủ hồ sơ đánh giá / bổ sung | 13.4, AC-AUTH-4, AUTHZ-009 | OWNER-001…005 | `server/services/ownership.ts:31`, `server/routes/citizen.ts:397`, `:488` | ✅ |
| Biến môi trường bắt buộc, không giá trị mặc định giả | 13.1 | (khởi động API) | `server/env.ts`, `scripts/lib/env.ts` | ✅ |
| Tài khoản nhân viên thật trong Supabase Auth khi seed / `staff:create` | 14, AC-OPS-1 | OPS-001, LOGIN-001 | `scripts/seed.ts`, `scripts/staff.ts`, `scripts/lib/supabase-admin.ts` | ✅ |
| Frontend nối qua DataSource, `local` và `api` | 16.1, AC-DATA-1 | DS-001…003, e2e API | `src/data/DataSource.ts`, `ApiDataSource.ts:113`, `LocalDataSource.ts:66`, `useDataSource.ts:12`, `useAction.ts:15` | ✅ |
| Xử lý 401/403/409/mất mạng, đăng xuất | 16, AC-LOGIN-5/6 | e2e bước 02, 06, 07 | `src/lib/errors.ts`, `src/components/auth/AuthEvents.tsx`, `LogoutButton.tsx` | ✅ |
| Luồng e2e đầy đủ ở chế độ API | 1.1 | e2e API 7 bước | `tests/e2e-api/full-flow.spec.ts` | ✅ |
| Upload ảnh lên Supabase Storage bằng URL ký | 15 (PHOTO-001…004) | PHOTO-001 chỉ kiểm tra loại file/kích thước | `server/routes/uploads.ts` | ❌ `/uploads/sign` là bản giả: URL tải lên không tồn tại; ảnh người dùng chụp lưu dạng data URL |
| Idempotency-Key bền vững | 12.1 | AC-DATA-5 | `server/middleware/idempotency.ts` | ⚠ lưu trong bộ nhớ tiến trình, không bền trên Vercel Functions |
| OTP thật | 10.1 | (mô phỏng có chủ đích) | `server/routes/citizen.ts:36` | ⚠ mô phỏng, luôn nhận `123456`; biến `OTP_PROVIDER`/`ALLOW_MOCK_OTP` chưa được kiểm |

## 2. Bất biến dữ liệu

`npm run db:verify` chạy trên Supabase local: DV-001…DV-016 là các bất biến 64/47/17/3,2 ngày/6 ẩn danh… (xem `docs/van-hanh.md` mục 4.2); DV-017 xác nhận PostGIS thật. Kết quả 17/17 ở `ket-qua-kiem-chung.md`.
`npm run mock:verify` kiểm các bất biến tương ứng trên `mock.json` (không sửa `mock.json`).

## 3. Thay đổi sau khi review ngày 25/11/2026

Các mục báo cáo trước đây ghi "100%" nay được thay bằng số đo thật. Lỗi đã sửa nằm ở `be.md` mục 2 và `db.md` mục 3.
