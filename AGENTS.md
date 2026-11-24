# AGENTS.md – Luật cho agent code (Codex / Antigravity / Claude Code)

## Phạm vi

- **Giai đoạn 1 (đã nộp 24/11/2026):** UI/UX prototype, dữ liệu mẫu + localStorage.
- **Giai đoạn 2 (từ 25/11/2026): sản phẩm hoàn chỉnh** – được phép tạo backend, database (PostgreSQL + PostGIS), API, xác thực, lưu ảnh. Kế hoạch và các quyết định ở `CLAUDE.md` mục 6.
- Dịch vụ ngoài (OTP/SMS/Zalo, AI nhận diện ảnh) chỉ tích hợp thật khi chủ dự án đồng ý; nếu chưa, vẫn là **mô phỏng** và phải có nhãn "Mô phỏng" trên UI.
- Không đưa khoá bí mật (API key, DB URL) vào code hay git; dùng biến môi trường (`.env.local`, Vercel env).

## Ưu tiên

- Giai đoạn 2: làm theo thứ tự ở `CLAUDE.md` mục 6.4; cập nhật `docs/spec.md`, `docs/plan.md`, `docs/tasks.md` trước khi code phần mới.
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
