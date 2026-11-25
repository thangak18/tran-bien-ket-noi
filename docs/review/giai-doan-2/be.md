# Backend (Hono API)

## 1. Xác thực và phân quyền

| Vai trò | Cách xác thực | Ghi chú |
|---|---|---|
| Người dân | OTP mô phỏng `123456` → JWT 30 ngày (`CITIZEN_JWT_SECRET`) | Hồ sơ ẩn danh dùng `X-Report-Key` (ownerToken) |
| Cán bộ `can_bo`, TNV `tnv` | Email + mật khẩu kiểm tra bởi Supabase Auth → JWT 1 ngày (`SUPABASE_JWT_SECRET`) | Vai trò lấy từ `staff_profiles` theo user id, tra DB ở mỗi request |

Không có vai trò admin. Quy tắc:

- `/officer/*`: chỉ `can_bo`. `/volunteer/*` đọc: `tnv` và `can_bo`; nhận việc và nộp kết quả: chỉ `tnv`.
- Người dân gọi endpoint nhân viên: 403. Không token: 401. Token hết hạn: 401 `TOKEN_EXPIRED`. Token sai: 401 `INVALID_TOKEN`.
- Tài khoản không có hồ sơ nhân viên hoặc `is_active=false`: 403 `ACCOUNT_DISABLED`, hiệu lực ngay ở request kế tiếp.
- Cron: `Authorization: Bearer <CRON_SECRET>`, so sánh hằng thời gian (cũng là header Vercel Cron tự gửi).

## 2. Lỗi bảo mật đã sửa

1. **Đăng nhập không kiểm tra mật khẩu** (`/auth/login`): cấp token cán bộ cho bất kỳ request nào, chọn user theo `role` hoặc chuỗi con của email (`can_bo`, `cb.`, `minh`). Nay: xác thực qua Supabase Auth, mọi thất bại (thiếu/sai mật khẩu, email lạ, tài khoản không phải nhân viên) trả 401 cùng một thông báo "Email hoặc mật khẩu không chính xác"; tài khoản bị khoá trả 403.
2. **Mật khẩu và secret cứng**: `TranBien@2026!` có trong 6 file, pepper/khoá Supabase/CI có giá trị mặc định cố định. Nay `git grep "TranBien@2026"` không còn kết quả; `env.ts` và các script không có giá trị mặc định, thiếu biến thì báo đúng tên biến; `ci.yml` sinh secret ngẫu nhiên lúc chạy.
3. **TNV lấy được SĐT người dân**: truy vấn của `volunteer.ts` chọn `reporter_phone`. Đã bỏ khỏi cả 3 truy vấn.
4. **Đánh giá và bổ sung không kiểm tra chủ hồ sơ**: ai cũng đóng hoặc mở lại được hồ sơ của người khác. Nay cần `X-Report-Key` khớp hoặc JWT có SĐT người gửi / người đăng ký nhận tin (người chỉ bấm "Tôi cũng gặp" không phải chủ hồ sơ).
5. **Chuyển trạng thái bỏ qua `transition.ts`**: `volunteer.ts` tự `UPDATE reports SET status`, không khoá dòng, không kiểm tra người nhận việc. Nay chạy trong transaction với `SELECT … FOR UPDATE`, TNV chỉ nộp việc của mình, đúng bảng 3.3 (xác minh "Có" → hệ thống chuyển `da_tiep_nhan`; "Không có" và nghiệm thu chỉ ghi kết quả, cán bộ xác nhận).
6. **Cán bộ đóng được hồ sơ `hoan_thanh`** (vai trò `system`): làm mất bước đánh giá của người dân. Nay `close` chạy với vai trò CB, chỉ hợp lệ với `mo_lai`.
7. **Mã bí mật tạo hộ là `0000`** (2 chỗ) và mã của người dân sinh bằng `Math.random`. Nay `crypto.randomInt`, chỉ lưu hash, trả đúng một lần.
8. **Hoàn thành có ảnh và mô tả mặc định giả** khi thiếu đầu vào, vượt qua kiểm tra bắt buộc ảnh/mô tả. Đã bỏ.
9. **Lỗi 500 khi chuyển trạng thái hồ sơ đã có hạn xử lý** (do e2e phát hiện): `due_at` đọc về là chuỗi. Đã chuẩn hoá, có test TRANS-006.

## 3. Chuyển trạng thái

Mọi thay đổi `reports.status` đi qua `executeTransition` (`server/services/transition.ts`): transaction, `SELECT … FOR UPDATE`, kiểm tra version (409 `VERSION_CONFLICT`), `canTransition` theo vai trò (409 `TRANSITION_NOT_ALLOWED`), ghi timeline bất biến, tạo thông báo cho người theo dõi. Hàm nhận transaction có sẵn để TNV nộp kết quả, giao việc, đánh giá cùng thành công hoặc cùng huỷ. "Tách hồ sơ đã gộp" là trường hợp riêng của CB, chỉ về đúng trạng thái trước khi gộp.

Kiểm tra bằng grep: ngoài `transition.ts`, không còn `UPDATE reports SET status` trong `server/routes`.

## 4. Endpoint chính

| Nhóm | Endpoint | Ghi chú |
|---|---|---|
| Công khai | `GET /public/reports`, `/public/reports/:code`, `/public/kpi`, `/public/config`, `/public/recent-results` | Không có SĐT, `secretCode`, `ownerToken`; KPI tính từ dữ liệu |
| Người dân | `POST /citizen/otp/request`, `/otp/verify`, `/reports`, `/reports/lookup`, `/reports/:id/claim`, `/feedback`, `/supplement`, `/follow`, `/subscribe`; `GET /me/reports`, `/me/notifications`, `/reports/:code/owner` | `feedback`/`supplement` chỉ chủ hồ sơ |
| Cán bộ | `GET /officer/reports`, `/reports/:code`, `/kpi`, `/volunteers`; `POST /reports/:id/accept`, `assign-volunteer`, `assign-dept`, `complete`, `request-supplement`, `transfer`, `close`, `mark-unverified`, `merge`, `split`; `POST /officer/reports` (tạo hộ); `PATCH /reports/:code` | Nhận `version` để phát hiện xung đột |
| TNV | `GET /volunteer/tasks`, `/tasks/:id`; `POST /tasks/:id/claim`, `/submit` | Không có SĐT |
| Nhân viên | `POST /auth/login`, `/auth/staff-login` | Hai đường dẫn cùng một xử lý |
| Vận hành | `POST /cron/sweep-overdue`, `/cron/cleanup-pending-uploads` | Bearer `CRON_SECRET` |

## 5. Kết quả test API

Chạy trên DB và Supabase Auth thật (xem `ket-qua-kiem-chung.md`): 11 file test trong `tests/api/`, gồm `staff-login` (9), `volunteer-flow` (8), `officer-flow` (10), `citizen-owner` (5), `postgis-dwithin` (5), `auth-matrix` (9), `transition-concurrency` (6) và các bộ có sẵn. Các yêu cầu bạn nêu:

- Đăng nhập đúng → 200 (LOGIN-001/002); sai mật khẩu → 401 (LOGIN-003); thiếu mật khẩu → 401 (LOGIN-004).
- Người dân gọi endpoint cán bộ/TNV → 403 (AUTH-006, VOL-002, OFF-009).
- Chuyển trạng thái sai → 409 (OFF-003, TRANS-002).
- Hai request đồng thời cùng version → đúng một thành công, một 409, timeline đúng 1 mục (OFF-002, TRANS-005).

## 6. Chưa làm hoặc còn hạn chế

- Upload ảnh: `/uploads/sign` là bản giả. Chưa ghi vào Supabase Storage; ảnh người dùng chụp lưu dạng data URL trong `report_photos.storage_path`. Server chưa kiểm tra chuỗi ảnh (loại, kích thước).
- Idempotency-Key lưu trong bộ nhớ tiến trình (`Map`), không bền khi chạy nhiều instance Vercel.
- OTP mô phỏng luôn nhận `123456`; `OTP_PROVIDER` và `ALLOW_MOCK_OTP` được đọc nhưng chưa dùng để chặn.
- Lỗi kiểm tra đầu vào trả 400 (một số route), trong khi spec AC-API-4 ghi 422; chưa thống nhất.
- Đăng nhập chưa có giới hạn tần suất riêng ở API; dựa vào giới hạn của Supabase Auth (Spec 13.2 mục 6).
- Spec nhắc `staff:reset-password`; chưa có script này (chỉ có `staff:create`, `staff:disable`, `staff:enable`).
