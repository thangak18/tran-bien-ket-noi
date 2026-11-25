# Báo cáo Giai đoạn 2 – Trấn Biên Kết Nối (đã hiệu chỉnh theo số đo thật)

Bản đầu của báo cáo này (đêm 25/11/2026) ghi "hoàn thành 100%, 229 test pass, 16/16 bất biến". Review ngày 25/11/2026 cho thấy điều đó không đúng: các số đó đo trên Postgres giả lập (`cube/earthdistance`, cổng 5432) và còn lỗ hổng bảo mật. Bản này thay bằng số liệu đo lại trên Supabase local (PostGIS thật). Output đầy đủ: `docs/review/giai-doan-2/ket-qua-kiem-chung.md`.

## 1. Trạng thái

| Hạng mục | Trạng thái | Số liệu đo |
|---|---|---|
| Cơ sở dữ liệu PostGIS thật, RLS, trigger bất biến | Xong | `db:verify` 17/17 |
| API Hono, phân quyền 3 vai trò | Xong, còn hạn chế (mục 3) | 89 test API pass |
| Đăng nhập cán bộ/TNV qua Supabase Auth | Xong sau khi sửa lỗ hổng | LOGIN-001…009 pass |
| Frontend nối `DataSource` (`local` và `api`) | Xong | e2e API 7/7 |
| Upload ảnh lên Supabase Storage | **Chưa làm** | – |
| CI GitHub Actions | Đã viết lại, **chưa chạy** (không được push) | – |
| Triển khai Vercel / Supabase cloud | **Chưa làm** (chờ chủ dự án) | – |

Kiểm thử: `npm run verify` (lint + tsc + vitest + mock:verify) đạt, **49 file / 303 test pass / 0 fail**; `npm run build` và `npm run lint` đạt; e2e chế độ API **7/7**; e2e Giai đoạn 1 project Desktop 5/5, project Mobile không chạy được vì thiếu WebKit.

## 2. Lỗi nghiêm trọng của bản cũ đã sửa

1. `/auth/login` cấp token cán bộ không cần mật khẩu.
2. Mật khẩu mẫu và secret cứng trong code, tài liệu và CI.
3. Lớp PostGIS giả che lỗi; truy vấn `ST_X` sẽ lỗi trên PostGIS thật.
4. TNV nhận được SĐT người dân; đánh giá/bổ sung không kiểm tra chủ hồ sơ.
5. Trạng thái hồ sơ bị đổi trực tiếp, bỏ qua dịch vụ chuyển trạng thái; cán bộ đóng được hồ sơ `hoan_thanh`.
6. Mã bí mật tạo hộ cố định `0000`; hoàn thành có ảnh/mô tả mặc định giả; KPI có giá trị `3,2` cứng.
7. Frontend: ghi dữ liệu trực tiếp vào store thay vì qua `DataSource`; C04 nuốt lỗi API rồi lưu cục bộ; hộp OTP không nhận SĐT đã nhập.

Chi tiết và cách kiểm chứng: `docs/review/giai-doan-2/be.md`, `db.md`, `fe.md`.

## 3. Việc còn lại

1. Upload ảnh bằng URL ký lên Supabase Storage (hiện `/uploads/sign` là bản giả; ảnh lưu dạng data URL).
2. Idempotency-Key bền vững (hiện trong bộ nhớ), thực thi `OTP_PROVIDER`/`ALLOW_MOCK_OTP`, giới hạn đăng nhập ở API.
3. Thiết lập Supabase cloud và Vercel (chủ dự án làm), chạy thử CI trên GitHub.
4. Nâng các gói có lỗ hổng (`docs/review/giai-doan-2/npm-audit.md`: 37 lỗ hổng, trong đó `hono`, `zod`, `react-router-dom`, `drizzle-orm` ở mã chạy thật).
5. Script `staff:reset-password`; endpoint cho tìm trùng PostGIS; "Phản ánh của tôi" ở chế độ API qua `/citizen/me/reports`.

## 4. Quyết định kỹ thuật

1. **PostGIS thật**, cài trong schema `extensions`; không còn lớp giả. Chạy local bằng Supabase CLI 2.1.1 (`npx supabase … --workdir ..`).
2. **Không ghi mật khẩu vào repo**: `SEED_STAFF_PASSWORD`, khoá Supabase, pepper, secret đều lấy từ `app/.env.local` (không commit). `staff:create` sinh mật khẩu ngẫu nhiên, in một lần.
3. **Mã bí mật 4 số** sinh bằng `crypto`, chỉ lưu hash HMAC-SHA256 + pepper; chống dò 5 lần/15 phút/IP.
4. **Không thêm `@hono/node-server`**: Vite dev server đã có middleware phục vụ `/api`, đủ cho e2e.
5. **Trình duyệt e2e**: dùng Google Chrome có sẵn (`channel: chrome`) vì máy không tải được Chromium/WebKit của Playwright.
