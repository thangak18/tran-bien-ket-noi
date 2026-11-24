# Trấn Biên Kết Nối – Workspace

Đồng Nai Hackathon 2026 · Đề 2 – Phản ánh hiện trường  
Phạm vi: **UI/UX prototype tương tác** (frontend + dữ liệu mẫu). Không backend, không dịch vụ ngoài trừ tile OpenStreetMap và Geolocation API của trình duyệt.

## Trạng thái hiện tại

Workspace **mới chỉ có tài liệu**. Chưa khởi tạo project, chưa có code.

## Thứ tự làm việc (bắt buộc theo đúng thứ tự)

| Bước | File | Nội dung | Trạng thái |
|---|---|---|---|
| 0 | `docs/proposal_v2.1.md` | Proposal đã phản biện | Xong |
| 1 | `docs/spec.md` | Đặc tả: phạm vi, màn hình, nghiệp vụ, dữ liệu, tiêu chí chấp nhận | Xong – chờ duyệt |
| 2 | `docs/plan.md` | Kiến trúc, cấu trúc thư mục, route, store, các phase | Xong – chờ duyệt |
| 3 | `docs/tasks.md` | Danh sách task có ID, phụ thuộc, tiêu chí hoàn thành | Xong – chờ duyệt |
| 4 | `docs/tests.md` | Test case viết **trước** code cho từng task | Xong – chờ duyệt |
| 5 | `docs/code-guidelines.md` | Quy ước code để Codex/Antigravity tuân theo | Xong – chờ duyệt |
| 6 | `app/` | Code (chưa tạo) | Chưa bắt đầu |

Quy trình cho mỗi task khi bắt đầu code:

1. Đọc task trong `tasks.md` và các mục spec nó tham chiếu.
2. Viết test tương ứng trong `tests.md` (test phải **fail** trước).
3. Code đến khi test pass.
4. Chạy `npm run verify` (lint + typecheck + test + kiểm tra số liệu).
5. Tick task, ghi ngày hoàn thành.

## Cấu trúc dự kiến

```
TranBienKetNoi_Workspace/
├── README.md
├── AGENTS.md                 # luật cho agent code
├── docs/
│   ├── proposal_v2.1.md
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.md
│   ├── tests.md
│   └── code-guidelines.md
└── app/                      # tạo ở task T-001
```

## Quyết định đã chốt

- Web mobile cho người dân và TNV (390px), desktop cho cán bộ (1440px).
- Bản đồ: OpenStreetMap qua React Leaflet. Vị trí: Geolocation API, người dùng chấp nhận quyền GPS.
- Dữ liệu: mock JSON + localStorage; đồng bộ giữa các khung Demo Hub bằng sự kiện `storage`.
- Người dân gửi bằng SĐT + OTP (mặc định) **hoặc ẩn danh**. Theo dõi được qua: máy tự nhớ, link theo dõi/QR, tra cứu mã, đăng nhập SĐT. Hồ sơ ẩn danh có thể **đăng ký nhận tin sau** cho riêng hồ sơ đó.
- AI phân loại ảnh, OTP, SMS/Zalo: **mô phỏng**, luôn gắn nhãn "Mô phỏng".
- Deploy: Vercel (HTTPS bắt buộc để GPS hoạt động trên điện thoại).

## Việc cần chủ dự án xác nhận trước khi code

- [ ] Duyệt ngưỡng nghi trùng: 50 m / 14 ngày.
- [ ] Duyệt giới hạn gửi ẩn danh: 5 phản ánh/thiết bị/ngày.
- [ ] Duyệt hạn xử lý mặc định: Đèn đường 3 ngày, Ngập nước 2, Rác thải 2, Mặt đường 5.
- [ ] Thể lệ BTC có bắt buộc file Figma không.
- [ ] Hạn nộp bài và thời lượng demo.
- [ ] Bộ ảnh demo (nhóm tự chụp, mỗi loại ≥ 4 ảnh, không có mặt người/biển số).
