# TASKS – Trấn Biên Kết Nối

Nguồn: `spec.md` v1.0, `plan.md`  
Cột **Test** tham chiếu ID trong `tests.md`. Mỗi task: viết test trước → code → `npm run verify` → tick.

Ký hiệu trạng thái: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong (ghi ngày)

---

## P0 – Nền móng

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-001 | Khởi tạo `app/` bằng Vite React TS strict; cài thư viện theo plan 2; ghi version cố định | – | plan 2–3 | UT-000 |
| [x] (24/11) | T-002 | Cấu hình ESLint, Prettier, Vitest (jsdom), Playwright (2 project: mobile 390×844, desktop 1440×900); script npm theo plan 7 | T-001 | plan 7 | UT-000 |
| [x] (24/11) | T-003 | Tailwind + design token (màu, bo góc, font Be Vietnam Pro), class `.senior` trên `<html>` cho chế độ chữ lớn | T-001 | spec 7.2, 7.5 | CT-001 |
| [x] (24/11) | T-004 | Router với 14 route spec 8; mỗi route render tiêu đề màn hình | T-001 | spec 8 | E2E-00 |
| [x] (24/11) | T-005 | `CitizenLayout`, `OfficerLayout`, `VolunteerLayout` (khung mobile tối đa 430px; desktop sidebar) | T-003, T-004 | spec 7.1 | CT-002 |
| [x] (24/11) | T-006 | Cấu hình Vercel SPA rewrite (`vercel.json`) | T-004 | plan 8 | – |

## P1 – Domain & dữ liệu

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-010 | `domain/types.ts`: Report, VolunteerTask, Notification, Settings, enum | T-001 | spec 4 | UT-010 (typecheck) |
| [x] (24/11) | T-011 | `domain/constants.ts`: 4 loại, 5 bộ phận, hạn mặc định, nhãn trạng thái (CB + công khai + bước + màu + icon), TNV mẫu, `DEMO_NOW` | T-010 | spec 2, 3.1, 3.2 | UT-011 |
| [x] (24/11) | T-012 | `domain/status.ts`: `canTransition`, `transition` (trả report mới + timeline entry), `publicLabel`, `progressStep` | T-011 | spec 3.2, 3.3 | UT-012 |
| [x] (24/11) | T-013 | `domain/duplicates.ts`: `haversineMeters`, `findDuplicates(candidate, reports, now)` | T-010 | spec 3.5 | UT-013 |
| [x] (24/11) | T-014 | `domain/sorting.ts`: `isOverdue`, `isDueSoon`, `sortInbox`, `computePriority` | T-011 | spec 3.6 | UT-014 |
| [x] (24/11) | T-015 | `domain/kpi.ts`: `computeKpi(reports, month)` → tổng, theo loại, đã xử lý, chưa hoàn tất, TB ngày, quá hạn, sắp hạn | T-014 | spec 5.1, AC-C08-1, AC-A01-2 | UT-015 |
| [x] (24/11) | T-016 | `domain/privacy.ts`: `maskPhone`, `toPublicReport` (bỏ SĐT, `secretCode`, followers → `followerCount`, timeline bỏ actor) | T-010 | spec 4.1 | UT-016 |
| [x] (24/11) | T-016b | `domain/access.ts`: `hasOwnerAccess`, `followerCount`, `canSendAnonymous` (quota 5/ngày) | T-010 | spec 3.4a, 3.4b, 3.6 | UT-016b |
| [x] (24/11) | T-017 | `domain/format.ts` + `domain/notifications.ts` | T-011 | spec 3.4, 7.6 | UT-017 |
| [x] (24/11) | T-018 | `data/streets.ts`: ≥ 10 đường trong phường với tọa độ gần đúng; `nearestStreet(lat,lng)` | T-010 | spec 5.3, AC-C03-5 | UT-018 |
| [x] (24/11) | T-019 | `scripts/generate-mock.ts` (seed cố định) + `scripts/verify-mock.ts`; commit `mock.json` | T-012 → T-018 | spec 5 | UT-019, DV-001 → DV-012, DV-014 |

## P2 – Store

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-020 | `AppStore` Context + reducer, hydrate từ mock | T-019 | plan 4 | UT-020 |
| [x] (24/11) | T-021 | Actions người dân: `submitReport` (có SĐT / ẩn danh), `followReport` (có SĐT / ẩn danh), `subscribeLater`, `unsubscribe`, `submitFeedback`, `supplementReport`, `verifyPhone`, `markNotificationsRead`, `claimByLink`, `lookupReport` | T-020, T-016b | spec 3.3, 3.4a, 3.4b, AC-C04, AC-C05, AC-C06 | UT-021 |
| [ ] | T-022 | Actions cán bộ/TNV: `accept`, `assignVolunteer`, `assignDepartment`, `complete`, `requestSupplement`, `transferAgency`, `close`, `merge`, `split`, `createOnBehalf`, `submitVerification` | T-020 | spec 3.3, AC-A02, AC-A03, AC-V02 | UT-022 |
| [ ] | T-023 | `persistence.ts`: localStorage, debounce, `storage` event, settings theo `frame` (gồm `deviceReports`, `anonymousLog`), reset | T-020 | plan 4, AC-DEMO-3/4 | UT-023 |

## P3 – Component dùng chung

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-030 | UI kit: Button, Card, Badge, Sheet, Modal (focus trap), Toast, Tabs, Chip, TextField, EmptyState | T-003 | spec 7 | CT-030 |
| [ ] | T-031 | `StatusBadge` (icon + chữ + màu; biến thể CB / công khai) | T-011, T-030 | spec 3.2 | CT-031 |
| [ ] | T-032 | `ProgressTracker` 4 bước + băng ngoại lệ | T-012, T-030 | AC-C06-1 | CT-032 |
| [ ] | T-033 | `Stepper` 3 bước gửi phản ánh | T-030 | AC-C02-1 | CT-033 |
| [ ] | T-034 | `MapView` (React Leaflet, divIcon Lucide, attribution, onTap, vòng bán kính, fallback khi tile lỗi) | T-011 | AC-C03, AC-C07 | CT-034 |
| [ ] | T-035 | `lib/geolocation.ts` (timeout 10s, phân loại lỗi) + `lib/image.ts` (nén) + `lib/aiMock.ts` + `lib/speech.ts` | T-010 | AC-C02, AC-C03, AC-C04-2 | UT-035 |
| [ ] | T-036 | `PhoneOtpSheet` (validate SĐT, OTP 123456, nhãn Mô phỏng) | T-030 | AC-C04-5 | CT-036 |
| [ ] | T-037 | `BeforeAfter` (2 ảnh, phóng to) + `CategoryCard` | T-030 | AC-C06-4, AC-C04-1 | CT-037 |
| [ ] | T-038 | `NotificationBell` + `SmsPreview` + `MockLabel` | T-030, T-017 | AC-C05-5 | CT-038 |
| [ ] | T-039 | `lib/share.ts` + `TrackingLinkCard` (mã bí mật, QR, Lưu link) + `SubscribeCard` | T-030, T-036 | AC-C04-11, AC-C06-9, AC-C06-11 | UT-039, CT-039 |

## P4 – Người dân

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-040 | C01 Trang chủ + nút chữ lớn + modal tổng đài | T-005, T-015, T-030 | AC-C01 | CT-040 |
| [ ] | T-041 | Draft gửi phản ánh trong store (lưu/khôi phục, hỏi khi thoát) | T-021 | AC-C02-7 | UT-041 |
| [ ] | T-042 | C02 Chụp ảnh | T-033, T-035, T-041 | AC-C02 | CT-042 |
| [ ] | T-043 | C03 Vị trí (GPS, ngoài phường, từ chối, nhập địa chỉ, chạm bản đồ) | T-034, T-035, T-041 | AC-C03 | CT-043 |
| [ ] | T-044 | C04 Xác nhận: thẻ loại, mô tả, kiểm tra trùng, tóm tắt | T-013, T-037, T-041 | AC-C04-1 → 4, 8 | CT-044 |
| [ ] | T-045 | C04 Gửi: OTP, thành công, "Tôi cũng gặp", mất mạng | T-036, T-021 | AC-C04-5 → 7, 9 | CT-045 |
| [ ] | T-045b | C04 gửi ẩn danh: link, sheet cảnh báo, màn thành công ẩn danh, quota | T-039, T-045 | AC-C04-10 → 12 | CT-045b |
| [ ] | T-046 | Nút micro (Web Speech) trong C04 | T-035 | AC-C04-2 | CT-046 |
| [ ] | T-047 | C05 Phản ánh của tôi (đăng nhập SĐT, tra cứu mã, lọc, trống, thông báo) | T-031, T-038, T-021 | AC-C05 | CT-047 |
| [ ] | T-048 | C06 Chi tiết (tiến trình, timeline, trước/sau, đánh giá, mở lại, gộp, bổ sung, người xem ngoài) | T-032, T-037, T-021 | AC-C06 | CT-048 |
| [ ] | T-049 | C07 Bản đồ quanh tôi + C08 Bảng minh bạch | T-034, T-015, T-016 | AC-C07, AC-C08 | CT-049a, CT-049b |
| [ ] | T-049b | C05 mục "Gửi từ máy này" + tra cứu bằng mã bí mật | T-047, T-039 | AC-C05-1, AC-C05-6 | CT-049c |
| [ ] | T-049c | C06 quyền chủ hồ sơ qua link `?k=`, thẻ đăng ký nhận tin / huỷ, link sai | T-048, T-039 | AC-C06-8 → 11 | CT-049d, E2E-07 |

## P5 – Cán bộ

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-050 | A01 Hộp tiếp nhận: KPI, bảng, sắp xếp, cờ (Nghi trùng / Ẩn danh / Gửi hộ), lọc (gồm Nguồn), tab, tìm kiếm | T-014, T-015, T-031 | AC-A01-1 → 7, 9 | CT-050 |
| [ ] | T-051 | A02 Panel: thông tin, trường phân loại, nút theo trạng thái, giao TNV, kết quả xác minh, lý do ngoại lệ, lịch sử, gợi ý xác minh hồ sơ ẩn danh | T-022, T-050 | AC-A02-1 → 5, 8 → 10 | CT-051 |
| [ ] | T-052 | Modal "Tạo phản ánh hộ" | T-022, T-034 | AC-A01-8 | CT-052 |
| [ ] | T-053 | A03 Cập nhật kết quả + xem trước | T-022, T-037 | AC-A03 | CT-053 |
| [ ] | T-054 | Khối "Phản ánh tương tự" + modal gộp | T-013, T-022 | AC-A02-6, 7 | CT-054 |
| [ ] | T-055 | Tách hồ sơ đã gộp | T-054 | AC-A02-7 | CT-055 |
| [ ] | T-056 | Điều hướng bàn phím dashboard (bảng, panel, phím Esc đóng panel) | T-051 | spec 7.3 | CT-056 |

## P6 – Tình nguyện viên

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-060 | V01 Danh sách nhiệm vụ | T-022, T-031 | AC-V01 | CT-060 |
| [ ] | T-061 | V02 Xác minh tại chỗ | T-034, T-035, T-022 | AC-V02 | CT-061 |
| [ ] | T-062 | Nối nhiệm vụ nghiệm thu từ "Chưa giải quyết" (C06) → V01 → A02 | T-048, T-060, T-061 | spec 3.3 | E2E-05 |

## P7 – Demo Hub & chữ lớn

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-070 | `/demo` 2 iframe, `allow` geolocation/camera/microphone, scale khung desktop | T-023 | AC-DEMO-1 | E2E-06 |
| [ ] | T-071 | Bộ chọn vai trò khung trái (Người dân / TNV + tên) | T-070 | AC-DEMO-2 | E2E-06 |
| [ ] | T-072 | Đặt lại dữ liệu + chỉnh `demoNow` | T-070 | AC-DEMO-4 | CT-072 |
| [ ] | T-073 | Nút "Bỏ qua tới bước…" theo kịch bản 5 phút | T-070 | AC-DEMO-5 | CT-073 |
| [ ] | T-074 | Rà soát chế độ chữ lớn C01–C06 + bảng từ ngữ 7.4 | T-040 → T-048 | spec 7.2, 7.4 | MT-SR |

## P8 – Hoàn thiện

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-080 | Rà soát đủ trạng thái phụ (spec / proposal mục 7) | P4–P6 | proposal 7 | MT-ST |
| [ ] | T-081 | Accessibility: axe trên mọi route, tương phản, focus, aria | P4–P7 | spec 7.3 | A11Y-001 → 006 |
| [ ] | T-082 | Bộ ảnh demo thật + `manifest.json` + ảnh after | – | spec 5.4 | DV-013 |
| [ ] | T-083 | Deploy Vercel + kiểm tra HTTPS | T-006 | plan 8 | MT-DEV |
| [ ] | T-084 | Phát hiện trình duyệt nhúng (Zalo/Facebook) + banner "Mở bằng trình duyệt" | T-083 | plan 8 | MT-DEV |
| [ ] | T-085 | Test thiết bị thật (ma trận `tests.md` mục 7) | T-083 | – | MT-DEV |
| [ ] | T-086 | Thử nghiệm nhanh 5 người (≥ 2 người > 60 tuổi) | T-083 | proposal 10 | UX-001 → 004 |
| [ ] | T-087 | Quay video demo dự phòng theo kịch bản 5 phút | T-085 | proposal 15 | – |

---

## Đường găng (critical path)

T-001 → T-010 → T-011 → T-012 → T-019 → T-020 → T-021/T-022 → T-041 → T-042 → T-043 → T-044 → T-045 → T-045b → T-048 → T-050 → T-051 → T-053 → T-070 → T-083

## Việc cần người thật làm (agent không làm được)

- T-082: chụp ảnh demo.
- T-085: cầm điện thoại thật thử GPS/camera.
- T-086: mời người thử.
- T-087: quay video.

## Câu hỏi mở

1. Ngưỡng trùng 50 m / 14 ngày – chờ duyệt.
2. Hạn mặc định theo loại – chờ duyệt.
3. Giới hạn gửi ẩn danh 5/thiết bị/ngày – chờ duyệt.
4. Figma có bắt buộc không.
5. Hạn nộp bài → quy đổi phase sang ngày cụ thể.
