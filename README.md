# Trấn Biên Kết Nối

Đồng Nai Hackathon 2026 · Đề 2 – Phản ánh hiện trường  
> **Một phản ánh – một hành trình minh bạch.**

## Trạng thái hiện tại (25/11/2026)

Dự án đã hợp nhất **bản UI/UX mới nhất (`fc4c476`)** cùng hệ thống **sản phẩm thực tế 4 vai trò** (Người dân, Tình nguyện viên, Cán bộ phường, Quản trị viên) trên nhánh `feat/production-p3-p4-p5`:

- **Frontend PWA (`app/`):** React 18 + TypeScript + Vite + Tailwind CSS + React Leaflet + Recharts + SheetJS (`xlsx`), hỗ trợ tách **4 trang web độc lập** qua `VITE_PORTAL_MODE` (`all | citizen | officer | volunteer | admin`).
- **Backend API & D1 thật (`api/`):** Đã deploy Cloudflare Worker tại `https://tran-bien-ket-noi-api.tran-bien-ket-noi-api.workers.dev` kết nối **Cloudflare D1 (`tran-bien-db`)** 4 vai trò (`0001_init.sql` + `0002_roles_and_tasks.sql`), đồng bộ 2 chiều tự động với `AppStore`.
- **Quy trình linh hoạt & Thông báo 2 chiều:** Người dân (Khách/Ẩn danh hoặc SĐT) gửi bài → Cán bộ có thể **Giao xử lý trực tiếp** hoặc tùy chọn gửi TNV xác minh khi cần → **Chuông thông báo (`PortalNotificationBell`)** cố định trên cả Cổng Cán bộ và Cổng TNV (badge số + dropdown + nút Bật đẩy).
- **Kiểm chứng:** `npm run verify` pass 100% (ESLint, Prettier, TypeScript, **40/40 test files**, kiểm tra bất biến dữ liệu) và `npm run build` pass.

## Cấu trúc thư mục

```text
tran-bien-ket-noi/
├── README.md
├── AGENTS.md                 # phạm vi và luật cho agent
├── thuyet-minh.md            # tài liệu thuyết minh sản phẩm
├── package.json              # script điều phối app/ và api/
├── api/                      # Backend Cloudflare Worker (Phần 1–5)
│   ├── migrations/0001_init.sql
│   ├── src/
│   │   ├── index.ts          # Router API + CORS + Cron SLA
│   │   ├── security.ts       # JWT HS256, RBAC, Rate limit, Turnstile, SHA-256 secretCode
│   │   ├── aiVision.ts       # Gemini Vision proxy (3.8-flash / flash-lite) + fallback
│   │   ├── notifications.ts  # Web Push, Zalo ZNS, SMS, SLA evaluator, Audit log
│   │   └── reportsDb.ts      # D1 CRUD & R2 media upload
│   ├── wrangler.jsonc
│   ├── .dev.vars.example
│   └── README.md
├── app/                      # Frontend React + PWA
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── sw.js             # Service Worker (cache app shell + Web Push)
│   │   └── icons/
│   ├── src/
│   │   ├── components/       # UI kit, TurnstileWidget, AiCategoryBanner, PwaStatusBanner, InAppBrowserBanner
│   │   ├── domain/           # Nghiệp vụ thuần (status, kpi, sorting, duplicates, privacy, access)
│   │   ├── lib/              # apiClient, geocoding (Nominatim), exportReport, webPush, pwa
│   │   ├── screens/          # citizen/, officer/, volunteer/
│   │   └── store/            # AppStore, citizenActions, officerActions, persistence
│   ├── tests/                # Unit, Component & E2E tests
│   └── .env.example
├── assets/                   # Sơ đồ luồng và kiến trúc SVG
└── docs/                     # spec.md, ui-ux-guidelines.md, plan.md, tasks.md, tests.md
```

## Tính năng chính đã triển khai

### 1. Luồng lõi 3 cổng
- **Người dân (`/`):** Chào mừng 2 bước + 4 mức cỡ chữ, gửi phản ánh 3 bước (ảnh/video, vị trí GPS đồng bộ Reverse Geocoding + bản đồ OpenStreetMap, loại sự cố & mô tả bằng văn bản/giọng nói), cảnh báo phản ánh trùng (≤ 50 m / 14 ngày) & *"Tôi cũng gặp"*, gửi có SĐT/OTP hoặc ẩn danh (mã bí mật + link/QR), theo dõi tiến trình, đánh giá hoặc bấm *"Chưa giải quyết"*.
- **Cán bộ phường (`/can-bo`):** Hộp tiếp nhận có sắp xếp theo hạn/quá hạn, lọc theo trạng thái/loại/nguồn, phân loại & giao bộ phận hoặc TNV, cập nhật ảnh sau xử lý, bảng thống kê điều hành (`/can-bo/thong-ke`).
- **Tình nguyện viên (`/tnv`):** Danh sách nhiệm vụ xác minh/nghiệm thu theo khoảng cách GPS, bản đồ nhiệm vụ, gửi báo cáo & ảnh hiện trường quay về hồ sơ cán bộ.

### 2. Nâng cấp sản phẩm thật (Phần 3, 4, 5 + nền tảng Phần 1–2)
- **Bảo mật & Chống spam:** JWT phiên (`HS256`), phân quyền RBAC ở server, băm SHA-256 `secretCode`, rate limit theo IP, widget & xác minh **Cloudflare Turnstile**.
- **Thông báo, SLA & Báo cáo:** Đăng ký **Web Push** qua Service Worker, adapter Zalo ZNS / SMS, Cron SLA cảnh báo hồ sơ quá hạn, Audit Log, nút **Xuất CSV (Excel UTF-8 BOM)** và **In báo cáo PDF** trên `/can-bo/thong-ke`.
- **AI & PWA:** Nhận diện ảnh sự cố bằng **Gemini Vision** qua server proxy (`/api/ai/classify`, không lộ key ở frontend), cài đặt ứng dụng **PWA**, lưu nháp ngoại tuyến, banner nhắc thoát trình duyệt nhúng Zalo/Facebook.
- **Sẵn sàng D1 & R2:** Schema SQL và API `/api/reports`, `/api/uploads` sẵn sàng bật trên Cloudflare (xem [api/README.md](file:///C:/Users/ADMIN/Music/tran-bien-ket-noi/api/README.md)).

## Hướng dẫn chạy local

1. **Cài dependencies frontend:**
   ```powershell
   npm --prefix app ci
   ```
2. **Cấu hình biến môi trường (không commit lên Git):**
   - Tạo `api/.dev.vars` từ [api/.dev.vars.example](file:///C:/Users/ADMIN/Music/tran-bien-ket-noi/api/.dev.vars.example) (điền `JWT_SECRET`, `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`...).
   - Tạo `app/.env` từ [app/.env.example](file:///C:/Users/ADMIN/Music/tran-bien-ket-noi/app/.env.example) (`VITE_API_BASE_URL=http://127.0.0.1:8787`, `VITE_TURNSTILE_SITE_KEY`).
3. **Chạy đồng thời 2 terminal tại thư mục gốc:**
   ```powershell
   # Terminal 1 – Backend Worker API (cổng 8787)
   npm run api:dev

   # Terminal 2 – Frontend Vite (cổng 5173/5174)
   npm run dev
   ```
4. **Kiểm thử & Build:**
   ```powershell
   npm run verify
   npm run build
   ```
