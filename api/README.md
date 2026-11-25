# Trấn Biên Kết Nối – Backend API (Cloudflare Workers)

## Chạy local
```powershell
cd C:\Users\ADMIN\Music\tran-bien-ket-noi
npm run api:dev
```
Worker chạy tại `http://127.0.0.1:8787` (kiểm tra nhanh: `GET /api/health`).

## Các nhóm endpoint
- **Auth & RBAC (Phần 3):** `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `GET /api/auth/me`, `POST /api/turnstile/verify`
- **Thông báo, SLA & Audit (Phần 4):** `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `POST /api/notifications/dispatch`, `POST /api/sla/check`, `GET/POST /api/audit`
- **AI Vision (Phần 5):** `POST /api/ai/classify` (Gemini 3.8 Flash + dự phòng 3.8 Flash Lite)
- **Dữ liệu & Ảnh thật (Phần 1–2):** `GET /api/reports`, `POST /api/reports`, `PATCH /api/reports/:id`, `POST /api/uploads`, `GET /api/uploads/:key`

## Kích hoạt Database D1 & Kho ảnh R2 khi deploy
1. Tạo D1 database & chạy migration:
   ```powershell
   cd api
   npx wrangler d1 create tran-bien-db
   npx wrangler d1 migrations apply tran-bien-db --remote
   ```
2. Tạo R2 bucket lưu ảnh:
   ```powershell
   npx wrangler r2 bucket create tran-bien-media
   ```
3. Mở comment mục `d1_databases` và `r2_buckets` trong `api/wrangler.jsonc`, điền `database_id`, rồi nạp secrets:
   ```powershell
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler deploy
   ```
