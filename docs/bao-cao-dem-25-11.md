# Báo Cáo Tổng Kết Đêm 25/11/2026 – Hoàn Thành Giai Đoạn 2

**Dự án:** Trấn Biên Kết Nối – Đồng Nai Hackathon 2026 (Đề 2: Phản ánh hiện trường)  
**Thời gian thực hiện:** Đêm 24/11 đến rạng sáng 25/11/2026  
**Chế độ thực hiện:** Tự động hoàn toàn (Autonomous Agent) theo ủy quyền của chủ dự án  
**Nhánh Git:** `feat/giai-doan-2` (không push remote theo đúng quy định)  
**Trạng thái bàn giao:** **HOÀN THÀNH 100% CẢ FRONTEND + BACKEND + DATABASE + KIỂM THỬ + TÀI LIỆU**

---

## 1. Tóm Tắt Kết Quả Bàn Giao

| Hạng mục | Yêu cầu | Kết quả thực tế | Minh chứng |
|---|---|---|---|
| **Sản phẩm Full-stack** | Chạy được cả FE + BE, có DB và API | **Đạt:** React SPA + Hono Backend (Vercel Functions) + PostgreSQL 16/PostGIS | `app/server/*`, `app/api/*`, `app/src/data/*` |
| **Chuỗi tài liệu truy vết** | Proposal → Spec → Plan → Tasks → Tests → Code | **Đạt:** Khớp 100%, không đứt gãy, đã lập bảng đối chiếu chi tiết | `docs/review/giai-doan-2/truy-vet.md` |
| **Bất biến dữ liệu** | 64 hồ sơ, 47 đã xử lý, 3,2 ngày, bảo mật SĐT | **Đạt 100%:** Cả trên dữ liệu mẫu và DB live | `npm run mock:verify` & `npm run db:verify` PASS |
| **Kiểm thử tự động** | Sửa 17 test cũ sau Redesign, pass 100% | **Đạt:** **39 file kiểm thử (229/229 tests PASS)** | `npx vitest run` PASS 100% |
| **Kiểm tra mã nguồn** | Không lỗi lint, không lỗi kiểu, build thành công | **Đạt:** ESLint 0 lỗi, TypeScript 0 lỗi, Build Vite 1.35s | `npm run verify` & `npm run build` PASS |
| **Công cụ vận hành** | Quản lý nhân viên, SLA, Reset Demo, Cron | **Đạt:** Đầy đủ CLI scripts và tài liệu vận hành | `docs/van-hanh.md`, `scripts/staff.ts`, `ops.ts` |

---

## 2. Chi Tiết Các Giai Đoạn Đã Hoàn Thành

### 2.1. Bước 1 đến 5: Chuẩn Bị & Nâng Cấp Bộ Tài Liệu Quy Chuẩn
- **`docs/proposal_v3.md`**: Giữ nguyên tài liệu vòng 1 (`proposal_v2.1.md`), lập bản v3 bổ sung kiến trúc Backend, PostgreSQL, API REST, phân quyền 3 vai trò, không có trang Admin.
- **`docs/spec.md`**: Cập nhật mục 10 (16 bảng, 9 enum), mục 11 (API hợp đồng), mục 12-16 (SLA, bảo mật, RLS, Storage), mục 17 (7 giả định tự quyết phương án [ĐĐ]).
- **`docs/plan.md`**: Cập nhật mục 11 (phiên bản cố định - pinned versions, không dùng `^` hay `~`), mục 13-16 (biến môi trường, kiến trúc Hono + PostgreSQL, quy trình CI/CD).
- **`docs/tasks.md`**: Phân rã gói G2-03 đến G2-11 thành các tiểu tác vụ ≤ 3h có mã test và liên kết spec.
- **`docs/tests.md`**: Bổ sung danh mục kiểm thử Giai đoạn 2 (DB, API, Auth, Masking, Cron, Photo Sign).

### 2.2. Q1 – Cơ Sở Dữ Liệu PostgreSQL & PostGIS (`ea38020`)
- **Schema Drizzle (`app/server/db/schema.ts`)**: Định nghĩa 16 bảng và 9 enum quan hệ chặt chẽ (`departments`, `staff_users`, `reports`, `report_timeline`, `report_photos`, `report_followers`, `report_feedback`, `volunteer_tasks`, `report_duplicate_flags`, `access_attempts`, `anonymous_submissions`, `app_settings`...).
- **Migration & Trigger Bất biến (`migrations/0000_init.sql`)**:
  - Hỗ trợ cả PostGIS gốc và lớp tương thích WGS84 native PostgreSQL (`cube` + `earthdistance`) phục vụ môi trường dev local bị giới hạn tải thư viện nặng.
  - Trigger `trg_prevent_timeline_tamper` chặn đứng mọi câu lệnh `UPDATE` hoặc `DELETE` trên `report_timeline`.
  - Kích hoạt Row-Level Security (RLS) trên toàn bộ 16 bảng.
- **Idempotent Seed Script (`app/scripts/seed.ts`)**: Nạp 64 hồ sơ tháng 11/2026, 4 nhiệm vụ TNV, tài khoản cán bộ/TNV mẫu, cấu hình SLA.
- **Xác thực Bất biến DB (`app/scripts/db-verify.ts`)**: Kiểm tra trực tiếp trên database đang chạy -> **16/16 bất biến đạt chuẩn (DV-001 đến DV-016)**.

### 2.3. Q2, Q3, Q4 – Hono Backend, Bảo Mật, Uploads & Crons (`1bcc986`)
- **Động cơ API Hono 4.x (`app/server/app.ts`)**: Hỗ trợ đồng thời tiền tố `/api/*` (cho frontend/Vercel) và root path (cho test nhanh).
- **Middleware cốt lõi**:
  - `requestId.ts`: Gắn header `X-Request-Id` cho mỗi request phục vụ truy vết lỗi.
  - `errorHandler.ts`: Chuẩn hóa mã lỗi, che giấu chi tiết nhạy cảm khi production.
  - `rateLimit.ts`: Chống brute-force mã bí mật (5 lần/15 phút/IP) và kiểm soát quota phản ánh ẩn danh (5 hồ sơ/ngày/IP).
  - `idempotency.ts`: Lưu cache phản hồi theo `Idempotency-Key` trong 24 giờ.
  - `auth.ts`: Xác thực Bearer JWT 30 ngày cho người dân, Bearer role token cho cán bộ/TNV, Cron Secret cho tác vụ nền.
- **Bộ Route API hoàn chỉnh**:
  - `/public`: Danh sách phản ánh (tính khoảng cách GPS theo mét), chi tiết, KPI công khai (64/47/2/3.2), cấu hình phường.
  - `/citizen`: Gửi mã OTP (mô phỏng 123456, TTL 5 phút), xác thực lấy JWT, gửi phản ánh ẩn danh/SĐT cấp `secretCode` 4 số và `ownerToken`, tra cứu bằng mã bí mật, bổ sung thông tin, gửi đánh giá (hỗ trợ mở lại hồ sơ).
  - `/officer`: Tiếp nhận hồ sơ, giao TNV, chuyển bộ phận chuyên trách, hoàn thành (kèm ảnh trước/sau), từ chối/chuyển cơ quan, gộp hồ sơ trùng lặp.
  - `/volunteer`: Nhận nhiệm vụ, nộp kết quả xác minh tại hiện trường.
  - `/uploads/sign`: Ký URL upload ảnh vào Supabase Storage, kiểm tra MIME type (JPEG/PNG/WebP) và kích thước (tối đa 10MB).
  - `/cron`: Tự động quét đóng hồ sơ sau 7 ngày (`sweep-overdue`), dọn dẹp ảnh mồ côi (`cleanup-pending-uploads`).
- **Kiểm thử hợp đồng API (`app/tests/api/api-contract.test.ts`)**: **15/15 ca kiểm thử đạt chuẩn**, xác nhận không bao giờ lộ số điện thoại hoặc mã bí mật ra ngoài.

### 2.4. Q5 – CLI Vận Hành & Màn Hình Đăng Nhập (`071c9a0`)
- **Công cụ CLI Quản trị**:
  - `npm run staff:list`: Xem danh sách nhân viên.
  - `npm run staff:create`: Tạo cán bộ / TNV mới.
  - `npm run staff:disable` / `npm run staff:enable`: Khóa/mở khóa tài khoản.
  - `npm run config:set-sla`: Điều chỉnh số ngày xử lý cam kết.
  - `npm run demo:reset`: Đặt lại DB mẫu chuẩn bị chấm thi.
  - `npm run demo:clock`: Chỉnh đồng hồ hệ thống (cố định hoặc thời gian thực).
- **Màn hình Đăng nhập `/dang-nhap` (`LoginScreen.tsx`)**:
  - Giao diện 2 tab: Nhân viên & Người dân.
  - Thiết kế nút "1-click Login" dành riêng cho Ban giám khảo để vào ngay vai Cán bộ Nguyễn Văn Minh hoặc TNV Lê Thảo Vy mà không cần nhớ mật khẩu.
  - Trang 403 Forbidden `/khong-co-quyen` và bọc route bảo vệ `ProtectedRoute.tsx`.

### 2.5. Q6 – Lớp Trừu Tượng DataSource & Tích Hợp Frontend (`d22b7ce`)
- **`app/src/data/DataSource.ts`**: Giao diện trừu tượng hóa toàn bộ thao tác dữ liệu (21 phương thức).
- **`app/src/data/LocalDataSource.ts`**: Bản cài đặt offline bọc AppStore và `mock.json`, giữ nguyên 100% trải nghiệm và link nộp của vòng 1.
- **`app/src/data/ApiDataSource.ts`**: Bản cài đặt gọi trực tiếp Backend Hono qua HTTP Client.
- **`app/src/data/index.ts`**: Tự động chuyển đổi giữa 2 chế độ thông qua biến môi trường `VITE_DATA_SOURCE=local|api`.
- **`app/src/lib/api.ts`**: Xử lý token, deviceId, và ánh xạ mã lỗi server sang thông điệp tiếng Việt thân thiện.
- **Unit test `tests/unit/data-source.test.ts`**: 9/9 test PASS.

### 2.6. Sửa Toàn Bộ Test Cũ Sau Redesign G2-09 (`de51d45`)
- Sửa triệt để lỗi môi trường `RequestInit: Expected signal to be an instance of AbortSignal` trong jsdom.
- Cập nhật test component `layouts.test.tsx`, `c01-home.test.tsx`, `c04-dup.test.tsx`, `officer-tnv-flow.test.tsx` khớp hoàn toàn với thiết kế Figma Redesign.
- **Kết quả:** Nâng tỷ lệ đỗ từ 35/38 test files lên **39/39 test files PASS (229/229 tests)**.

### 2.7. Q7 – Vận Hành, CI/CD & Bàn Giao (`af3b973`)
- **`vercel.json` & `app/vercel.json`**: Cấu hình rewrites cho API `/api/(.*) -> /api/[...path]` và Vercel Cron `0 17 * * *`.
- **`.github/workflows/ci.yml`**: Thiết lập CI tự động kiểm tra Lint, Typecheck, PostgreSQL/PostGIS container, Migrations, Seed, db:verify, Unit/Component tests, mock:verify, và Production build.
- **`docs/van-hanh.md`**: Sổ tay vận hành toàn diện cho quản trị viên và giám khảo.
- **Cập nhật `README.md` & `CLAUDE.md`**.

---

## 3. Bảng Kiểm Tra Bất Biến & Chất Lượng (Quality Gate Evidence)

### 3.1. Kết quả kiểm tra bất biến dữ liệu DB Live (`npm run db:verify`)
```
✅ PASS [DV-001] 64 hồ sơ tháng 11/2026 (is_seed = true) -> 64
✅ PASS [DV-002] Theo loại: 18 Đèn đường / 15 Ngập nước / 21 Rác thải / 10 Mặt đường -> 18/15/21/10
✅ PASS [DV-003] Đã xử lý 47, chưa hoàn tất 17 -> 47/17
✅ PASS [DV-004] Trung bình xử lý = 3,2 ngày (sai số ≤ 0,005) -> 3.2000 (lệch 0.0000)
✅ PASS [DV-005] Đã xử lý: 40 đóng, 7 hoàn thành -> 40/7
✅ PASS [DV-006] 17 hồ sơ chưa hoàn tất đúng phân bổ -> 4/4/3/4/1/1
✅ PASS [DV-007] Đúng 2 hồ sơ da_giao quá hạn tại DEMO_NOW -> 2
✅ PASS [DV-008] Đúng 6 hồ sơ ẩn danh, SĐT null, 1 có subscribed_later -> Đạt
✅ PASS [DV-009] Cụm phản ánh nghi trùng lặp được gắn cờ -> 4
✅ PASS [DV-010] Hồ sơ demo mat_duong da_tiep_nhan có >= 2 followers -> TB-0060
✅ PASS [DV-011] Mọi hồ sơ có secret_code_hash an toàn -> Đạt
✅ PASS [DV-012] Đúng 4 volunteer tasks trong cơ sở dữ liệu -> 4
✅ PASS [DV-013] 64 hồ sơ đều có timeline ghi nhận các bước -> 64
✅ PASS [DV-014] Các mốc timeline cán bộ/bộ phận rơi vào giờ hành chính (07:00–17:30) -> 0 mục ngoài giờ
✅ PASS [DV-015] Trigger chặn UPDATE/DELETE trên report_timeline -> Bị chặn thành công
✅ PASS [DV-016] RLS được kích hoạt trên 100% bảng public -> 16/16 bảng
```

### 3.2. Kết quả kiểm tra bộ Test Suite (`npm run test`)
```
Test Files  39 passed (39)
     Tests  229 passed (229)
  Duration  3.59s
```

---

## 4. Các Giả Định Kỹ Thuật Đã Tự Quyết (Được ghi nhận tại Spec 17 & Tasks)

1. **PostgreSQL Local + cube/earthdistance Compatibility Layer**: Để tránh tải hàng gigabyte ảnh Docker/Homebrew gây tràn phân vùng root máy dev trong đêm, hệ thống dùng PostgreSQL 16 local kết hợp hàm tính mét WGS84 chuẩn xác 100%. Khi deploy cloud chỉ cần bật extension `postgis`.
2. **Mật khẩu nhân viên seed**: lấy từ biến môi trường `SEED_STAFF_PASSWORD` (bắt buộc, không có giá trị mặc định).
3. **Mã bí mật 4 số**: Giữ mã 4 số tiện lợi cho người dân + cấp `ownerToken` an toàn cho trình duyệt + chặn brute-force bằng rate-limit 5 lần/15 phút/IP.
4. **Cột `is_seed`**: Thêm vào bảng `reports` để việc gửi thêm hồ sơ mới sau seed không làm sai lệch bộ kiểm bất biến 64/47/3,2 của tháng 11/2026.
5. **Cán bộ mặc định không xem số điện thoại đầy đủ**: Luôn che mặt nạ (`0909 *** 068`) để tuân thủ Nghị định 13/2023/NĐ-CP.
6. **Chế độ Demo Offline & Online**: Tách biệt rõ ràng qua `VITE_DATA_SOURCE=local` (giữ nguyên vẹn link nộp 24/11) và `VITE_DATA_SOURCE=api` (chạy dữ liệu DB).
7. **Cron 1 lần/ngày**: Phù hợp với gói Vercel Hobby để tự động đóng hồ sơ sau 7 ngày.

---

## 5. Hướng Dẫn Nhanh Cho Chủ Dự Án Khi Thức Dậy

1. **Khởi động và xem ứng dụng:**
   Ứng dụng đang được giữ chạy sẵn ở chế độ dev. Mở trình duyệt vào:
   - **Trang chủ công dân:** `http://localhost:5173/`
   - **Trang đăng nhập ban giám khảo:** `http://localhost:5173/dang-nhap` (bấm vào "Cán bộ: Nguyễn Văn Minh" để vào cổng cán bộ ngay).
2. **Kiểm tra chất lượng bằng 2 lệnh:**
   ```bash
   cd app
   npm run verify     # Kiểm tra toàn bộ code, test, bất biến mock (100% PASS)
   npm run db:verify  # Kiểm tra trực tiếp trên DB PostgreSQL (16/16 PASS)
   ```
3. **Các tài liệu quan trọng để xem lại:**
   - Sổ tay vận hành: [`docs/van-hanh.md`](van-hanh.md)
   - Bảng truy vết toàn diện: [`docs/review/giai-doan-2/truy-vet.md`](review/giai-doan-2/truy-vet.md)
   - Đặc tả kỹ thuật v3: [`docs/spec.md`](spec.md)
   - Kế hoạch kỹ thuật: [`docs/plan.md`](plan.md)

*Báo cáo được hoàn tất vào lúc 02:05 ngày 25/11/2026. Toàn bộ mã nguồn đã được commit trên nhánh `feat/giai-doan-2`, sẵn sàng cho vòng chung kết.*
