# AGENTS.md – Luật cho agent code (Codex / Antigravity / Claude Code)

## Phạm vi (nhánh `feat/production-p3-p4-p5` – nâng cấp sản phẩm thật)

- Frontend React (`app/`) + Backend mỏng Cloudflare Worker (`api/`) cho Phần 3–4–5:
  - **Phần 3:** Xác thực phiên & phân quyền RBAC (`citizen`, `officer`, `volunteer`), hash `secretCode`, Cloudflare Turnstile siteverify & rate limit chống spam.
  - **Phần 4:** Web Push Notification (VAPID + Service Worker), adapter Zalo ZNS / SMS (chạy dry-run khi chưa điền secret), Cron SLA cảnh báo quá hạn, Audit log bất biến và xuất báo cáo CSV / In PDF.
  - **Phần 5:** AI nhận diện ảnh thật qua Gemini Vision proxy trên server (`/api/ai/classify`, không lộ API key ở frontend) và PWA (manifest, Service Worker, cài đặt ứng dụng, hàng đợi offline).
- Các tích hợp có secret (`GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`, `VAPID_*`, `ZALO_OA_ACCESS_TOKEN`, `JWT_SECRET`) tự động fallback an toàn khi chạy local chưa điền secret và vẫn giữ nguyên nhãn minh bạch khi ở chế độ fallback/mô phỏng.

## Ưu tiên

- Chỉ làm task lõi (P0–P8 trong `docs/tasks.md`). **Không** code, không viết test cho AC gắn nhãn `[BONUS – HOÃN]` hay task trong mục Backlog Bonus cho tới khi chủ dự án mở lại.
- Trước khi làm bất kỳ màn hình nào, đọc `docs/ui-ux-guidelines.md` (khoảnh khắc người dùng, wireframe, component pattern).

## Nguồn sự thật

Thứ tự ưu tiên khi có mâu thuẫn: `docs/spec.md` > `docs/ui-ux-guidelines.md` > `docs/plan.md` > `docs/tasks.md` > `docs/proposal_v2.1.md`.  
Không tự thêm tính năng ngoài spec. Nếu spec thiếu, dừng và ghi câu hỏi vào cuối `docs/tasks.md` mục "Câu hỏi mở".

## Quy trình mỗi task

1. Đọc task + mục spec được tham chiếu.
2. Viết test theo `docs/tests.md` trước, xác nhận test fail.
3. Code tối thiểu để test pass.
4. `npm run verify` phải pass.
5. Tick task trong `docs/tasks.md`.

## Bất biến dữ liệu (không được phá)

- Đúng 64 phản ánh tháng 11/2026: Đèn đường 18, Ngập nước 15, Rác thải 21, Mặt đường 10.
- Đúng 47 hồ sơ đã xử lý, 17 chưa hoàn tất.
- Trung bình thời gian xử lý của 47 hồ sơ = 3,2 ngày (sai số ≤ 0,005).
- Dữ liệu cá nhân (số điện thoại) và `secretCode` không bao giờ hiển thị trên màn hình công khai.
- Hồ sơ ẩn danh phải giữ `anonymous: true` kể cả sau khi đăng ký nhận tin.

## Cấm

- Placeholder kiểu `// TODO`, `// rest of code`, "Lorem ipsum".
- Hard-code số KPI trên dashboard: KPI phải tính từ dữ liệu.
- Màu là cách duy nhất truyền đạt trạng thái.
- Cài thư viện ngoài danh sách trong `docs/plan.md` mục 2 mà không ghi lý do vào `docs/plan.md`.
- Đưa ảnh tải từ internet vào `public/`.
