# Frontend: nối màn hình qua DataSource

## 1. Cách hoạt động

- `VITE_DATA_SOURCE=local` (mặc định): `LocalDataSource` đọc và ghi trực tiếp `AppStore` (lưu localStorage, khoá `tbkn:v1`), chạy offline với 64 hồ sơ mẫu, gắn nhãn "Mô phỏng" như Giai đoạn 1.
- `VITE_DATA_SOURCE=api`: `ApiDataSource` gọi API Hono. Store khởi tạo rỗng, khoá lưu `tbkn:api:v1`, tự tải lại danh sách sau mỗi thao tác ghi, mỗi 30 giây, và khi đăng nhập/đăng xuất.
- Màn hình lấy nguồn dữ liệu bằng `useDataSource()` và chạy thao tác bằng `useAction()` (trạng thái đang xử lý, lỗi tiếng Việt, tự tải lại khi 409).
- Kiểm chứng: `grep -rn "store/officerActions\|store/citizenActions" src/screens src/components src/App.tsx src/layouts` không có kết quả. Chỉ lớp `src/data/` còn import các hàm thuần (ở `LocalDataSource`) và kiểu `SubmitReportPayload`.
- Hàm thuần dùng để hiển thị (`getCategoryConfig`, danh sách `VOLUNTEERS`) đã chuyển vào `src/domain/constants.ts`; `A02Panel` không còn import từ `V01Tasks`.

## 2. Xử lý lỗi

| Mã | Hành vi giao diện |
|---|---|
| Mất mạng | "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại." (`NETWORK_ERROR`), giữ nguyên dữ liệu đã nhập |
| 401 | Xoá phiên; ở `/can-bo` và `/tnv` chuyển về `/dang-nhap?redirect=…` (`AuthEvents`); người dân dùng ẩn danh không bị chuyển trang |
| 403 | "Bạn không có quyền thực hiện thao tác này." (tài khoản bị khoá: thông báo riêng) |
| 409 | Thông báo dữ liệu đã đổi, tự tải lại hồ sơ đang xem rồi để người dùng thử lại |
| 400/404 | Hiện thông báo của server (tiếng Việt) |
| Đang xử lý | Nút bị khoá, chữ "Đang gửi/Đang lưu…" |

Sửa lỗi đi kèm: C04 trước đây nuốt lỗi API rồi âm thầm lưu hồ sơ cục bộ; nay báo lỗi và giữ bản nháp. `PhoneOtpSheet` ở chế độ API gọi OTP mô phỏng qua server (nếu không, hồ sơ có SĐT bị tạo thành ẩn danh) và đồng bộ SĐT đã nhập khi mở hộp.

## 3. Màn hình × thao tác × endpoint (chế độ API)

| Màn hình | Thao tác | DataSource | Endpoint |
|---|---|---|---|
| C04 Xác nhận | Gửi phản ánh | `createReport` | `POST /citizen/reports` (Idempotency-Key) |
| C04 / hộp OTP | Gửi và xác minh OTP mô phỏng | (gọi trực tiếp `apiFetch`) | `POST /citizen/otp/request`, `/citizen/otp/verify` |
| C06 Chi tiết | Xem hồ sơ | `getReportById` | `GET /public/reports/:code` |
| C06 | "Tôi cũng gặp" | `followReport` | `POST /citizen/reports/:id/follow` |
| C06 | "Đã giải quyết" + đánh giá / "Chưa giải quyết" (→ `mo_lai`) | `submitFeedback` | `POST /citizen/reports/:id/feedback` (chủ hồ sơ) |
| A01 Hộp tiếp nhận | Danh sách | (đồng bộ store) | `GET /officer/reports` |
| A01 | Tạo phản ánh hộ | `officerCreateOnBehalf` | `POST /officer/reports` |
| A02 Chi tiết | Tải hồ sơ | `getOfficerReport` | `GET /officer/reports/:code` |
| A02 | Tiếp nhận | `officerAcceptReport` | `POST /officer/reports/:id/accept` |
| A02 | Giao TNV xác minh | `officerAssignVolunteer`, `listVolunteers` | `POST …/assign-volunteer`, `GET /officer/volunteers` |
| A02 | Giao xử lý | `officerAssignDepartment` | `POST …/assign-dept` |
| A02 | Yêu cầu bổ sung | `officerRequestSupplement` | `POST …/request-supplement` |
| A02 | Chuyển cơ quan khác | `officerTransferAgency` | `POST …/transfer` |
| A02 | Xác nhận không có sự cố | `officerMarkUnverified` | `POST …/mark-unverified` |
| A02 | Đóng hồ sơ (chỉ `mo_lai`) | `officerCloseReport` | `POST …/close` |
| A02 | Gộp / Tách | `officerMergeReport`, `officerSplitReport` | `POST …/merge`, `POST …/split` |
| A03 Kết quả | Hoàn thành kèm ảnh sau | `officerCompleteReport` | `POST …/complete` |
| V01 Nhiệm vụ | Danh sách, nhận việc | `claimVolunteerTask` | `GET /volunteer/tasks`, `POST …/claim` |
| V02 Xác minh | Nộp kết quả | `submitVolunteerTask`, `getVolunteerTaskById` | `POST /volunteer/tasks/:id/submit`, `GET …/:id` |
| Đăng nhập | Cán bộ/TNV | (gọi trực tiếp `apiFetch`) | `POST /auth/login` |
| Header A01, V01 | Đăng xuất | – | xoá phiên ở máy (không gọi API) |

Ghi chú: các thao tác của cán bộ gửi `version` của hồ sơ đang xem để server phát hiện xung đột (409).

## 4. Ảnh chụp luồng (Playwright, chế độ API)

Lưu ở `docs/review/giai-doan-2/screenshots/`, sinh bởi `npm run test:e2e:api`:

| Bước | Ảnh |
|---|---|
| Người dân gửi có SĐT: xác nhận, OTP mô phỏng, đã gửi | `01a-dan-co-sdt-xac-nhan.png`, `01a-dan-co-sdt-otp-mo-phong.png`, `01a-dan-co-sdt-da-gui.png` |
| Người dân gửi ẩn danh | `01b-dan-an-danh-xac-nhan.png`, `01b-dan-an-danh-da-gui.png` |
| Đăng nhập sai mật khẩu | `02-dang-nhap-sai-mat-khau.png` |
| Cán bộ: hộp tiếp nhận, chi tiết (SĐT đã che), giao TNV | `03a…`, `03b…`, `03c-can-bo-giao-tnv.png` |
| TNV: danh sách, xác minh | `04a-tnv-danh-sach.png`, `04b-tnv-xac-minh.png` |
| Cán bộ: kết quả xác minh, cập nhật kết quả | `05a-can-bo-ket-qua-xac-minh.png`, `05b-can-bo-cap-nhat-ket-qua.png` |
| Người dân: Trước/Sau và đánh giá; "Chưa giải quyết" → `mo_lai` | `06a-dan-xem-truoc-sau.png`, `06b-dan-chua-giai-quyet-mo-lai.png` |
| Hộp cán bộ có hồ sơ ẩn danh | `07-can-bo-hop-co-an-danh.png` |

## 5. Chưa làm hoặc còn hạn chế

- Chưa có e2e ở viewport điện thoại bằng WebKit: dự án "Mobile Chrome" của `playwright.config.ts` dùng thiết bị iPhone 13 (WebKit), máy này không tải được WebKit. E2E API dùng Chrome ở khung 390×844 cho người dân/TNV nên vẫn kiểm tra bố cục điện thoại.
- Ảnh người dùng chụp ở chế độ API lưu dạng data URL (xem `be.md` mục 6).
- Nút Đăng xuất chỉ thêm ở A01 và V01.
- Cảnh báo trùng ở C04 và A02 vẫn tính ở client từ danh sách đã tải (B2 hoãn); hàm PostGIS ở server chưa có endpoint.
- Danh sách "Phản ánh của tôi" (C01 tab cá nhân, Hồ sơ) chưa dùng `GET /citizen/me/reports`. Ở chế độ API chỉ nhận ra hồ sơ gửi từ chính thiết bị (`deviceReports`); lọc theo SĐT không hoạt động vì API không trả danh sách SĐT người theo dõi.
