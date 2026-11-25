# Sổ Tay Vận Hành – Trấn Biên Kết Nối (Giai đoạn 2)

Tài liệu hướng dẫn cài đặt, vận hành, kiểm tra chất lượng và xử trị sự cố cho hệ thống **Trấn Biên Kết Nối** phiên bản Giai đoạn 2 (Full-stack: React SPA + Hono API + PostgreSQL/PostGIS + Supabase Storage).

---

## 1. Tổng quan Kiến trúc

```
+-------------------------------------------------------------------+
|                        NGƯỜI DÙNG & THIẾT BỊ                      |
|  - Người dân (Mobile Web / PWA, không cần cài đặt)                 |
|  - Cán bộ phường & Tình nguyện viên (Desktop / Mobile Web)       |
+----------------------------------+--------------------------------+
                                   | HTTPS
+----------------------------------v--------------------------------+
|                        FRONTEND SPA & ROUTER                      |
|  - React 18 + Vite 6 + Tailwind CSS (Be Vietnam Pro token)        |
|  - Lớp DataSource Abstraction (chọn Local hoặc API)              |
|  - Client HTTP Client (Token, Device-Id, Error Mapping)           |
+----------------------------------+--------------------------------+
                                   | /api/*
+----------------------------------v--------------------------------+
|                   BACKEND API ENGINE (HONO 4.x)                   |
|  - Serverless Handler (Vercel Functions Node.js runtime)          |
|  - Middleware: CORS, Request-Id, Rate Limiter, Idempotency       |
|  - Xác thực: JWT 30 ngày (Dân) / Bearer Role Token (Cán bộ/TNV)   |
|  - Routes: /public, /citizen, /officer, /volunteer, /uploads, /cron|
+----------------------------------+--------------------------------+
                                   | SQL (Drizzle ORM + postgres-js)
+----------------------------------v--------------------------------+
|               CƠ SỞ DỮ LIỆU & LƯU TRỮ ĐÁM MÂY                    |
|  - PostgreSQL 15 + PostGIS 3 thật (Supabase local qua Docker)    |
|  - RLS (Row Level Security) kích hoạt 100% các bảng               |
|  - Trigger bất biến: chặn UPDATE/DELETE trên report_timeline     |
|  - Storage: Supabase Storage (S3-compatible) cho ảnh hiện trường  |
+-------------------------------------------------------------------+
```

---

## 2. Chuẩn bị Môi trường

### 2.1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 20.x trở lên.
- **Docker Desktop** và **Supabase CLI 2.1.1** (có sẵn trong `app/package.json`, chạy bằng `npx supabase`). Supabase local cung cấp PostgreSQL 15 + PostGIS 3 thật, Auth và Storage. Không còn lớp giả lập `cube/earthdistance`.
- **Trình duyệt**: Chrome, Safari, Edge, Firefox hiện đại.

### 2.2. Biến môi trường (`app/.env.local`)
Sao chép từ file mẫu `app/.env.example` và cấu hình các giá trị cần thiết:

```bash
cd app
cp .env.example .env.local
```

Chi tiết các biến (không có giá trị mặc định cho khoá, secret, pepper hay chuỗi kết nối; thiếu biến nào API dừng và báo đúng tên biến đó):
| Tên biến | Bắt buộc | Mô tả |
|---|:---:|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL. Supabase local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `DATABASE_URL_DIRECT` | Tùy chọn | Kết nối trực tiếp cho script (seed, db:verify); thiếu thì dùng `DATABASE_URL` |
| `SUPABASE_URL` | Có | URL Supabase. Local: `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | Có | Khoá công khai, dùng để xác thực mật khẩu cán bộ/TNV qua Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Khoá quản trị, chỉ dùng ở server và script (tạo tài khoản nhân viên) |
| `SUPABASE_JWT_SECRET` | Có (≥ 32 ký tự) | Khoá ký token cán bộ/TNV |
| `CITIZEN_JWT_SECRET` | Có (≥ 32 ký tự) | Khoá ký JWT 30 ngày cho người dân |
| `OWNER_KEY_PEPPER` | Có (≥ 16 ký tự) | Pepper băm `secretCode` và `ownerToken` |
| `CRON_SECRET` | Có (≥ 16 ký tự) | Khoá bảo vệ `/cron/*`, gửi bằng `Authorization: Bearer <CRON_SECRET>` |
| `SEED_STAFF_PASSWORD` | Chỉ khi seed | Mật khẩu ban đầu của 4 tài khoản nhân viên mẫu |
| `DEMO_MODE` | Có | `true` cho phép `demo:reset` / `demo:clock` và OTP mô phỏng `123456` |
| `VITE_DATA_SOURCE` | Có | `local` (offline, mô phỏng) hoặc `api` (kết nối API + DB) |

Sinh giá trị cho máy local (không commit `app/.env.local`):
```bash
openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-48   # dùng cho CITIZEN_JWT_SECRET, OWNER_KEY_PEPPER, CRON_SECRET
npx supabase status -o env --workdir ..                # lấy ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET của Supabase local
```

---|:---:|---|---|
| `DATABASE_URL` | Có | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (Supabase local) | Chuỗi kết nối PostgreSQL (pooling) |
| `DATABASE_URL_DIRECT` | Tùy chọn | Giống `DATABASE_URL` | Kết nối trực tiếp cho migrations |
| `CITIZEN_JWT_SECRET` | Có | `tran-bien-citizen-jwt-secret-min-32-chars-long` | Khóa bí mật ký JWT 30 ngày cho người dân (≥ 32 ký tự) |
| `OWNER_KEY_PEPPER` | Có | `tran-bien-ket-noi-secret-pepper-2026` | Chuỗi pepper băm secretCode |
| `CRON_SECRET` | Có | `tran-bien-cron-secret-key-2026` | Khóa bảo vệ endpoint `/cron/*` |
| `SUPABASE_URL` | Tùy chọn | `http://127.0.0.1:54321` | URL dự án Supabase |
| `SUPABASE_ANON_KEY` | Tùy chọn | `local-anon-key` | Khóa công khai Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tùy chọn | `local-service-role-key` | Khóa quản trị Supabase |
| `DEMO_MODE` | Có | `true` | Bật chế độ chấm thi / demo (mã OTP mô phỏng 123456) |
| `VITE_DATA_SOURCE` | Có | `local` (hoặc `api`) | Chế độ dữ liệu frontend: `local` (offline mock) hoặc `api` (kết nối DB) |

---

## 3. Khởi chạy và Seed Dữ liệu

### 3.1. Cài đặt thư viện
```bash
cd app
npm ci
```

### 3.2. Khởi động Supabase local và áp dụng Migration
Thư mục `supabase/` nằm ở gốc repo, nên khi chạy từ `app/` phải thêm `--workdir ..`:
```bash
cd app
npx supabase start --workdir ..      # lần đầu sẽ pull image Docker
npx supabase db reset --workdir ..   # áp dụng supabase/migrations/*.sql (PostGIS thật)
```
Cổng mặc định: API `54321`, Postgres `54322`, Studio `54323`. Lệnh `npx supabase status -o env --workdir ..` in URL và khoá local để điền vào `app/.env.local`.

### 3.3. Nạp Dữ liệu Mẫu (Seed)
Nạp 64 hồ sơ tháng 11/2026, 4 nhiệm vụ TNV, tài khoản nhân viên, SLA bộ phận:
```bash
npm run seed
```
> **Đặc tính Idempotent:** Lệnh seed có thể chạy lại nhiều lần mà không làm nhân bản dữ liệu hay lỗi khóa chính.

### 3.4. Khởi chạy Ứng dụng Chế độ Phát triển
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:5173`

---

## 4. Bộ Công cụ Kiểm tra Chất lượng (Verification)

Hệ thống có hai cấp độ kiểm tra bất biến dữ liệu bắt buộc phải đạt 100% trước khi triển khai:

### 4.1. Kiểm tra toàn diện Frontend & Mã nguồn (`npm run verify`)
Chạy chuỗi kiểm tra nghiêm ngặt gồm:
1. `npm run lint`: Kiểm tra quy chuẩn ESLint và định dạng Prettier.
2. `tsc --noEmit`: Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript.
3. `npm run test`: Chạy 39 file kiểm thử với 229 ca kiểm thử (Unit, Component, Router, API Security).
4. `npm run mock:verify`: Xác thực 16 bất biến dữ liệu trên tập dữ liệu mẫu.

```bash
cd app
npm run verify
```

### 4.2. Kiểm tra Bất biến Cơ sở Dữ liệu Trực tiếp (`npm run db:verify`)
Chạy kiểm tra trực tiếp trên các bảng PostgreSQL đang hoạt động:
```bash
cd app
npm run db:verify
```
Kết quả kiểm tra 17 mục:
- `DV-001`: Đúng 64 hồ sơ tháng 11/2026 (`is_seed = true`).
- `DV-002`: Phân bổ chuẩn: 18 Đèn đường, 15 Ngập nước, 21 Rác thải, 10 Mặt đường.
- `DV-003`: Đúng 47 hồ sơ đã xử lý, 17 hồ sơ đang xử lý.
- `DV-004`: Thời gian xử lý trung bình đạt đúng **3,2 ngày** (sai số 0,0000).
- `DV-005`: 40 hồ sơ `dong` và 7 hồ sơ `hoan_thanh`.
- `DV-006`: Phân bổ 17 hồ sơ mở: 4 mới, 4 đã tiếp nhận, 3 chờ xác minh, 4 đã giao, 1 cần bổ sung, 1 mở lại.
- `DV-007`: Đúng 2 hồ sơ quá hạn tại mốc `DEMO_NOW`.
- `DV-008`: Đúng 6 hồ sơ ẩn danh, SĐT ẩn danh hoàn toàn null, 1 hồ sơ đăng ký nhận tin sau.
- `DV-009`: Các cụm phản ánh nghi trùng lặp được phát hiện và gắn cờ tự động.
- `DV-010`: Hồ sơ demo mặt đường đã tiếp nhận có ≥ 2 người theo dõi.
- `DV-011`: 100% hồ sơ có chuỗi băm mã bí mật an toàn `secret_code_hash`.
- `DV-012`: Đúng 4 nhiệm vụ tình nguyện viên (3 xác minh, 1 nghiệm thu mở lại).
- `DV-013`: 100% hồ sơ có timeline tuần tự thời gian tăng dần.
- `DV-014`: Toàn bộ mốc xử lý của cán bộ/bộ phận rơi vào giờ hành chính (07:00–17:30).
- `DV-015`: PostgreSQL Trigger chặn thành công hành vi sửa/xóa trên `report_timeline`.
- `DV-016`: 100% bảng cơ sở dữ liệu đã kích hoạt Row-Level Security (RLS).
- `DV-017`: PostGIS thật (`postgis_version()` có giá trị), cột `reports.location` là `geography(Point,4326)` và có index GIST.

---

## 5. Các Lệnh CLI Vận Hành & Quản trị

### 5.1. Quản lý Nhân viên
```bash
# 1. Liệt kê danh sách cán bộ và tình nguyện viên
npm run staff:list

# 2. Tạo tài khoản nhân viên mới
npm run staff:create <can_bo|tnv> "Tên Nhân Viên" [mã_bộ_phận]
# Ví dụ:
npm run staff:create can_bo "Lê Văn An" do_thi
npm run staff:create tnv "Nguyễn Thị Hoa"

# 3. Tạm khóa quyền tài khoản nhân viên
npm run staff:disable <staff_user_id>

# 4. Kích hoạt lại tài khoản
npm run staff:enable <staff_user_id>
```

### 5.2. Cấu hình Hạn SLA cho Loại Sự cố
```bash
# Đặt lại thời hạn xử lý (ngày) cho từng danh mục
npm run config:set-sla <category> <số_ngày>
# Ví dụ: Đặt hạn xử lý rác thải là 2 ngày:
npm run config:set-sla rac_thai 2
```

### 5.3. Điều khiển Demo & Giám khảo
```bash
# 1. Đặt lại toàn bộ cơ sở dữ liệu về trạng thái ban đầu chuẩn
npm run demo:reset

# 2. Chuyển đồng hồ hệ thống sang thời gian thực
npm run demo:clock real

# 3. Cố định đồng hồ hệ thống tại thời điểm kiểm thử
npm run demo:clock fixed 2026-11-24T09:00:00+07:00
```

---

## 6. Tác vụ Nền và Cron Jobs

Hệ thống cung cấp 2 endpoint bảo trì chạy qua Vercel Crons hoặc công cụ gọi định kỳ:

### 6.1. Tự động đóng hồ sơ hoàn thành sau 7 ngày (`/api/cron/sweep-overdue`)
- **Tần suất**: Chạy mỗi ngày một lần vào 17:00 UTC (00:00 giờ Việt Nam).
- **Yêu cầu Header**: `Authorization: Bearer <CRON_SECRET>`
- **Hành động**: Tìm các hồ sơ ở trạng thái `hoan_thanh` có `completed_at` quá 7 ngày mà người dân không phản hồi/đánh giá, tự động chuyển sang `dong` và ghi nhận mốc timeline hệ thống.

```bash
curl -X POST http://localhost:5173/api/cron/sweep-overdue \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 6.2. Dọn dẹp ảnh mồ côi (`/api/cron/cleanup-pending-uploads`)
- **Hành động**: Xóa các bản ghi ảnh trong `pending_uploads` quá 2 giờ mà không được liên kết vào hồ sơ phản ánh chính thức.

---

## 7. An Toàn Thông Tin & Quyền Riêng Tư (Nghị định 13/2023/NĐ-CP)

1. **Che mặt nạ số điện thoại**: Mọi API công khai (`/public/*`) và API nghiệp vụ cho TNV/cán bộ mặc định che số điện thoại người dân (`0909 *** 068`). Số điện thoại gốc chỉ lưu ở trường bảo vệ trong DB.
2. **Ẩn danh tuyệt đối**: Hồ sơ ẩn danh giữ nguyên cờ `anonymous: true` vĩnh viễn, không lưu số điện thoại, không truy vết ngược.
3. **Mã bí mật 4 số**: Người dùng xem mã 4 số tiện lợi, nhưng trên máy chủ chỉ lưu chuỗi băm HMAC-SHA256 kèm Pepper.
4. **Chống dò quét mã bí mật**: Giới hạn 5 lần thử sai trong 15 phút trên mỗi địa chỉ IP. Vượt ngưỡng sẽ bị khóa truy cập 429.
5. **Tính bất biến của nhật ký**: Trigger cơ sở dữ liệu `trg_prevent_timeline_tamper` chặn đứng mọi câu lệnh `UPDATE` hoặc `DELETE` trên bảng `report_timeline`, đảm bảo hồ sơ minh bạch không thể bị can thiệp hay sửa đổi hồi tố.
