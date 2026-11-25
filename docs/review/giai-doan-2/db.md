# Cơ sở dữ liệu (Giai đoạn 2)

Đo ngày 25/11/2026 trên Supabase local 2.1.1 (Docker), PostgreSQL 15, PostGIS thật.

## 1. Schema

- 16 bảng ở schema `public`, 9 kiểu enum. Nguồn: `supabase/migrations/20261125000000_init.sql` (cấu trúc) và `20261125010000_hardening.sql` (siết chặt).
- PostGIS cài trong schema `extensions` (`CREATE EXTENSION postgis WITH SCHEMA extensions`), nên bảng `spatial_ref_sys` của PostGIS không nằm ở `public` và không làm DV-016 (RLS toàn bảng) thất bại.
- `reports.location` là `geography(Point,4326)` có index GiST `idx_reports_location_gist`. `geography_columns` báo `Point / 4326`.
- `staff_profiles.user_id` là khoá ngoại tới `auth.users` (ON DELETE CASCADE), có cột `email` duy nhất (không phân biệt hoa thường).
- Ràng buộc: `anonymous = true ⇒ reporter_phone IS NULL`, `completed_at` bắt buộc khi `hoan_thanh`/`dong`, `rating` 1–5, định dạng SĐT `^0[0-9]{9}$`, hồ sơ gộp trỏ đúng một hồ sơ chính.
- Index khoá ngoại bổ sung: `reports(department_id)`, `reports(merged_into)`, `notifications(report_id)`, `report_timeline(actor_staff_id)`, `report_duplicate_flags(other_report_id)`, `staff_profiles(department_id)`.
- Trigger `report_timeline_immutable_trigger` chặn UPDATE/DELETE trên `report_timeline`.

## 2. Quyền truy cập và lộ dữ liệu

- RLS bật trên mọi bảng `public`; migration hardening `REVOKE ALL` trên bảng, sequence, hàm cho `anon` và `authenticated` (đo lại: 0 quyền trực tiếp). Mọi truy cập đi qua API (kết nối role `postgres`).
- `reporter_phone` và `secret_code_hash` không có view công khai. Các endpoint công khai và TNV tự chọn cột; test `LEAK-*`, `VOL-000/001` và e2e kiểm tra phản hồi không chứa SĐT, `secretCode`, `ownerToken`.
- Mã bí mật chỉ lưu dạng HMAC-SHA256 với `OWNER_KEY_PEPPER` (biến môi trường bắt buộc, ≥ 16 ký tự).

## 3. Lỗi đã sửa trong đợt này

1. Migration gốc có khối `EXCEPTION WHEN OTHERS` nuốt lỗi khi cài PostGIS rồi tạo kiểu và hàm `ST_*` giả. Đã bỏ hoàn toàn. Lý do sửa thẳng migration cũ: nó chưa từng chạy trên DB thật.
2. Cột `location` khai báo `geography` không kiểu chặt nên PostGIS báo `Geometry / SRID 0`. Nay là `geography(Point,4326)`.
3. Server gọi `ST_X(r.location)`; PostGIS thật không có `ST_X(geography)` nên mọi truy vấn có toạ độ sẽ lỗi. Đã ép `r.location::geometry` ở 22 chỗ.
4. `.env.local` trỏ vào Postgres Homebrew ở cổng 5432 (có lớp giả `cube/earthdistance`), nên `db:verify` từng báo "16/16" trên DB giả. Nay script không còn URL mặc định, bắt buộc `DATABASE_URL` và in ra DB đang kiểm.
5. Bộ phận thứ 5 trong seed là "Kinh tế – Hạ tầng đô thị" (không có trong spec). Đã đổi thành "Khu phố (tổ dân phố)" theo spec 3.1; cán bộ mẫu không gắn bộ phận.
6. `/public/kpi` có giá trị `3.2` cứng khi chưa có hồ sơ xử lý xong. Nay trả 0.
7. Cờ nghi trùng của seed tính bằng vòng lặp JS xấp xỉ; nay tính bằng `ST_DWithin` trong SQL (cùng kết quả: 2 cụm, 4 dòng cờ).

## 4. Tìm trùng bằng PostGIS

Hàm `find_duplicate_reports(lng, lat, category, now, exclude_id)`: `ST_DWithin(location, điểm, 50)`, cùng loại, trạng thái không thuộc `dong/da_gop/chuyen_co_quan/khong_xac_nhan`, `created_at` trong 14 ngày tính đến `now`, tối đa 3 kết quả gần nhất trước. Không cấp quyền thực thi cho `anon`/`authenticated`.

Test `tests/api/postgis-dwithin.test.ts`:
- PG-002: hai điểm cách 30 m (tạo bằng `ST_Project`) thì trùng.
- PG-003: cách 80 m thì không trùng.
- PG-004: khác loại, quá 14 ngày, hoặc đã đóng thì không trùng.
- PG-005: với cả 64 hồ sơ mẫu, kết quả của PostGIS khớp `domain/duplicates.ts` (đối chiếu theo mã hồ sơ).

## 5. Bất biến và `db:verify`

Đạt 17/17 (DV-001…DV-017) trên Supabase local; output nguyên văn ở `ket-qua-kiem-chung.md`. Số liệu đếm trực tiếp: 64 hồ sơ (18/15/21/10), 47 đã xử lý (40 `dong` + 7 `hoan_thanh`), 17 chưa xong, trung bình 3,2000 ngày, 6 ẩn danh và 0 hồ sơ ẩn danh có SĐT, 4 nhiệm vụ TNV, 269 mục timeline.

`npm run demo:reset` xoá toàn bộ hồ sơ phát sinh (kể cả hồ sơ thử), nhiệm vụ, thông báo, OTP, hạn mức rồi nạp lại đúng bộ 64 hồ sơ. Test API tự dọn hồ sơ mình tạo, nhưng một số test cũ vẫn để lại vài hồ sơ `is_seed=false` (không ảnh hưởng `db:verify`); chạy `demo:reset` trước khi trình diễn.
