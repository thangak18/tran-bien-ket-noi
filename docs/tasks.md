# TASKS – Trấn Biên Kết Nối

Nguồn: `spec.md` v1.2, `plan.md`, `ui-ux-guidelines.md`  
Cột **Test** tham chiếu ID trong `tests.md`. Mỗi task: viết test trước → code → `npm run verify` → tick.

Ký hiệu trạng thái: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong (ghi ngày)

**Ưu tiên:** làm hết P0 → P8 (lõi – Functional Requirements). Mục **Backlog Bonus** ở cuối chỉ mở khi lõi đã chạy trọn trên bản deploy.

---

## P0 – Nền móng

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-001 | Khởi tạo `app/` bằng Vite React TS strict; cài thư viện theo plan 2; ghi version cố định | – | plan 2–3 | UT-000 |
| [x] (24/11) | T-002 | Cấu hình ESLint, Prettier, Vitest (jsdom), Playwright (2 project: mobile 390×844, desktop 1440×900); script npm theo plan 7 | T-001 | plan 7 | UT-000 |
| [x] (24/11) | T-003 | Tailwind + design token (màu, bo góc, font Be Vietnam Pro); **mọi cỡ chữ, chiều cao nút, vùng chạm khai báo bằng biến CSS** (`--fs-body`, `--fs-title`, `--btn-h`, `--tap`) | T-001 | spec 7.2, 7.5 | CT-001 |
| [x] (24/11) | T-004 | Router với các route spec 8; mỗi route render tiêu đề màn hình | T-001 | spec 8 | E2E-00 |
| [x] (24/11) | T-005 | `CitizenLayout` (khung mobile ≤ 430px, thanh điều hướng đáy 5 mục + FAB camera 64px, ẩn trong `/bao-su-co/*`), `OfficerLayout`, `VolunteerLayout` | T-003, T-004 | AC-NAV-1 → 3, spec 7.1 | CT-002 |
| [x] (24/11) | T-006 | Cấu hình Vercel SPA rewrite (`vercel.json`) | T-004 | plan 8 | – |

## P1 – Domain & dữ liệu

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-010 | `domain/types.ts`: Report, VolunteerTask, Notification, Settings, enum (gồm trường chừa sẵn cho bonus: `suspectedDuplicateOf`, `anonymousFollows`, `onBehalf`) | T-001 | spec 4 | UT-010 |
| [x] (24/11) | T-011 | `domain/constants.ts`: 4 loại, 5 bộ phận, hạn mặc định, nhãn trạng thái (CB + công khai "Chờ tiếp nhận"… + bước + màu + icon), TNV mẫu, `DEMO_NOW`, bộ chip đánh giá | T-010 | spec 2, 3.1, 3.2, AC-C06-5 | UT-011 |
| [x] (24/11) | T-012 | `domain/status.ts`: `canTransition`, `transition`, `publicLabel`, `progressStep`, `publicTimeline` (gồm mốc tương lai + ngày dự kiến) | T-011 | spec 3.2, 3.3, AC-C06-1 | UT-012 |
| [x] (24/11) | T-013 | `domain/latestUpdate.ts`: câu "Cập nhật mới nhất" theo 3.4c + `delayDays` theo 3.6a | T-012, T-014 | spec 3.4c, 3.6a | UT-013 |
| [x] (24/11) | T-014 | `domain/sorting.ts`: `isOverdue`, `isDueSoon`, `sortInbox`, `computePriority` | T-011 | spec 3.6 | UT-014 |
| [x] (24/11) | T-015 | `domain/kpi.ts`: `computeKpi(reports, month)` | T-014 | spec 5.1, AC-C08-1, AC-A01-2 | UT-015 |
| [x] (24/11) | T-016 | `domain/privacy.ts`: `maskPhone`, `toPublicReport` (bỏ SĐT, `secretCode`, followers → `followerCount`, timeline bỏ actor cá nhân) | T-010 | spec 4.1 | UT-016 |
| [x] (24/11) | T-016b | `domain/access.ts`: `hasOwnerAccess`, `followerCount`, `canSendAnonymous` (quota 5/ngày) | T-010 | spec 3.4a, 3.4b | UT-016b |
| [x] (24/11) | T-017 | `domain/format.ts` (ngày, số thập phân, khoảng cách) + `domain/notifications.ts` + `domain/geo.ts` (`haversineMeters` dùng cho "Quanh đây" và khoảng cách) | T-011 | spec 3.4, 7.6, AC-C01-7 | UT-017 |
| [x] (24/11) | T-018 | `data/streets.ts`: ≥ 10 đường trong phường với tọa độ gần đúng; `nearestStreet(lat,lng)` | T-010 | spec 5.3, AC-C03-5 | UT-018 |
| [x] (24/11) | T-019 | `scripts/generate-mock.ts` (seed cố định) + `scripts/verify-mock.ts`; commit `mock.json` | T-012 → T-018 | spec 5 | UT-019, DV-001 → DV-016 |

## P2 – Store

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-020 | `AppStore` Context + reducer, hydrate từ mock | T-019 | plan 4 | UT-020 |
| [x] (24/11) | T-021 | Actions người dân: `submitReport` (có SĐT / ẩn danh), `subscribeLater`, `unsubscribe`, `submitFeedback` (rating + tags + comment / chưa giải quyết), `supplementReport`, `verifyPhone`, `markNotificationsRead`, `claimByLink`, `lookupReport` | T-020, T-016b | spec 3.3, 3.4a, 3.4b, AC-C04, AC-C05, AC-C06 | UT-021 |
| [x] (24/11) | T-022 | Actions cán bộ/TNV: `accept`, `assignVolunteer`, `assignDepartment`, `complete`, `requestSupplement`, `transferAgency`, `close`, `submitVerification` | T-020 | spec 3.3, AC-A02, AC-A03, AC-V02 | UT-022 |
| [x] (24/11) | T-023 | `persistence.ts`: localStorage, debounce, `storage` event, settings theo `frame` (gồm `deviceReports`, `anonymousLog`), reset | T-020 | plan 4, AC-DEMO-3/4 | UT-023 |

## P3 – Component dùng chung

Quy chuẩn từng component: `ui-ux-guidelines.md` mục 5.

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-030 | UI kit: Button, Card, BottomSheet (tay nắm, nút chính cố định đáy), Modal (focus trap), Toast, Tabs cuộn ngang có số đếm, Chip, TextField, EmptyState | T-003 | spec 7, guidelines 5 | CT-030 |
| [x] (24/11) | T-031 | `StatusChip` (icon + chữ + màu; biến thể CB / công khai) + `DelayChip` | T-011, T-013, T-030 | spec 3.2, 3.6a | CT-031 |
| [x] (24/11) | T-032 | `ProgressBar` ngang 4 mốc có giờ + `Timeline` dọc có mốc tương lai + băng ngoại lệ | T-012, T-030 | AC-C01-6, AC-C06-1 | CT-032 |
| [x] (24/11) | T-033 | `StepHeader` (←, ①──②──③ + "Bước n/3 – tên", ✕ Huỷ) | T-030 | AC-NAV-2 | CT-033 |
| [x] (24/11) | T-034 | `MapView` (React Leaflet, marker icon loại trên nền màu trạng thái + viền, chú giải, attribution, onTap, vòng bán kính, fallback khi tile lỗi) | T-011 | AC-C03, AC-C07 | CT-034 |
| [x] (24/11) | T-035 | `lib/geolocation.ts` (timeout 10s, phân loại lỗi) + `lib/image.ts` (nén) | T-010 | AC-C02, AC-C03 | UT-035 |
| [x] (24/11) | T-036 | `PhoneOtpSheet` (validate SĐT, dòng cam kết riêng tư, OTP 123456, nhãn Mô phỏng) | T-030 | AC-C04-5 | CT-036 |
| [x] (24/11) | T-037 | `BeforeAfter` (ô Sau trống "Chưa có ảnh sau xử lý") + `CategoryTile` + `LocationRow` + `ReportCard` + `LatestUpdate` | T-030, T-031 | AC-C06-4, AC-C04-1, AC-C05-2 | CT-037 |
| [x] (24/11) | T-038 | `NotificationBell` + `SmsPreview` + `MockLabel` | T-030, T-017 | AC-C05-5 | CT-038 |
| [x] (24/11) | T-039 | `lib/share.ts` + `TrackingLinkCard` (mã bí mật, QR, Lưu link) + `SubscribeCard` | T-030, T-036 | AC-C04-11, AC-C06-9, AC-C06-11 | UT-039, CT-039 |
| [x] (24/11) | T-039b | `RatingSheet` (5 sao có nhãn, chip theo số sao, góp ý tuỳ chọn, "Chưa đến 30 giây") | T-030, T-011 | AC-C06-5 | CT-039b |

## P4 – Người dân

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (24/11) | T-040 | C01 Trang chủ: thẻ kêu gọi, "Phản ánh của bạn" (trượt ngang), "Quanh đây", dải số liệu | T-005, T-015, T-032, T-037 | AC-C01-1, 3, 5, 6, 7 | CT-040 |
| [x] (25/11) | T-041 | Draft gửi phản ánh trong store (lưu/khôi phục, hỏi khi ✕) | T-021 | AC-C02-7 | UT-041 |
| [x] (25/11) | T-042 | C02 Chụp ảnh (ô chụp lớn, mẹo, xem trước, dải ảnh, chụp lại) | T-033, T-035, T-041 | AC-C02 (trừ AC-C02-5) | CT-042 |
| [x] (25/11) | T-043 | C03 Vị trí (ảnh trên + sheet; GPS đồng bộ reverse-geocoding Nominatim, ngoài phường, từ chối, nhập địa chỉ, chạm bản đồ) | T-034, T-035, T-041 | AC-C03 (trừ AC-C03-7) | CT-043 |
| [x] (25/11) | T-044 | C04 Loại & xác nhận (ảnh trên + sheet, 4 CategoryTile, vị trí đồng bộ GPS/bản đồ, mô tả + giọng nói) | T-037, T-041 | AC-C04-1, 2, 13 | CT-044 |
| [x] (25/11) | T-045 | C04 Gửi có SĐT: OTP, màn thành công, mất mạng | T-036, T-021 | AC-C04-5, 6, 9 | CT-045 |
| [x] (25/11) | T-045b | C04 Gửi ẩn danh: link, sheet cảnh báo, màn thành công ẩn danh, quota | T-039, T-045 | AC-C04-10 → 12 | CT-045b |
| [x] (25/11) | T-047 | C05 Phản ánh của tôi (danh sách máy này + SĐT, tab trạng thái có số đếm, ReportCard, lưu link, đăng nhập/tra cứu, trống, thông báo) | T-031, T-037, T-038, T-039, T-021 | AC-C05 | CT-047 |
| [x] (25/11) | T-048 | C06 Chi tiết (thứ tự khối, LatestUpdate, Timeline dọc, Trước/Sau, đánh giá, chưa giải quyết, gộp, bổ sung) | T-032, T-037, T-039b, T-021 | AC-C06-1, 3 → 8, 12 | CT-048 |
| [x] (25/11) | T-048b | C06 quyền chủ hồ sơ qua link `?k=`, đăng ký/huỷ nhận tin, link sai, nút Lưu | T-048, T-039 | AC-C06-9 → 11 | CT-048b, E2E-07 |
| [x] (25/11) | T-049 | C07 Bản đồ quanh tôi (marker, chú giải, chip lọc, thẻ nổi, Bản đồ/Danh sách, FAB vẫn hiện) | T-034, T-016, T-037 | AC-C07 | CT-049a |
| [x] (25/11) | T-049b | C08 Kết quả của phường (KPI, biểu đồ, thẻ Trước → Sau) | T-015, T-016, T-037 | AC-C08 | CT-049b |

## P5 – Cán bộ

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (25/11) | T-050 | A01 Hộp tiếp nhận: KPI, bảng, sắp xếp, cờ Ẩn danh, lọc (gồm Nguồn), tab, tìm kiếm | T-014, T-015, T-031 | AC-A01-1 → 4, 6, 7, 9 | CT-050 |
| [x] (25/11) | T-051 | A02 Panel: thông tin, trường phân loại, nút theo trạng thái, giao TNV, kết quả xác minh, lý do ngoại lệ, lịch sử, gợi ý xác minh hồ sơ ẩn danh | T-022, T-050 | AC-A02-1 → 5, 8 → 10 | CT-051 |
| [x] (25/11) | T-053 | A03 Cập nhật kết quả + xem trước | T-022, T-037 | AC-A03 | CT-053 |
| [ ] | T-056 | Điều hướng bàn phím dashboard | T-051 | spec 7.3 | CT-056 |

## P6 – Tình nguyện viên

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [x] (25/11) | T-060 | V01 Danh sách nhiệm vụ | T-022, T-031 | AC-V01 | CT-060 |
| [x] (25/11) | T-061 | V02 Xác minh tại chỗ | T-034, T-035, T-022 | AC-V02 | CT-061 |
| [x] (25/11) | T-062 | Nối nhiệm vụ nghiệm thu từ "Chưa giải quyết" (C06) → V01 → A02 | T-048, T-060, T-061 | spec 3.3 | E2E-05 |

## P7 – Demo Hub

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-070 | `/demo` 2 iframe, `allow` geolocation/camera, scale khung desktop | T-023 | AC-DEMO-1 | E2E-06 |
| [ ] | T-071 | Bộ chọn vai trò khung trái (Người dân / TNV + tên) | T-070 | AC-DEMO-2 | E2E-06 |
| [ ] | T-072 | Đặt lại dữ liệu + chỉnh `demoNow` | T-070 | AC-DEMO-4 | CT-072 |
| [ ] | T-073 | Nút "Bỏ qua tới bước…" theo kịch bản demo | T-070 | AC-DEMO-5 | CT-073 |

## P8 – Hoàn thiện lõi

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-080 | Rà soát đủ trạng thái phụ | P4–P6 | proposal 7 | MT-ST |
| [ ] | T-081 | Accessibility: axe trên mọi route, tương phản, focus, aria | P4–P7 | spec 7.3 | A11Y-001 → 006 |
| [ ] | T-081b | Rà soát UI theo `ui-ux-guidelines.md` (khoảnh khắc người dùng, vùng ngón cái, ngôn ngữ) | P4–P7 | guidelines 1, 5, 6 | MT-UI |
| [x] (25/11) | T-082 | Bộ ảnh demo thật + ảnh after | – | spec 5.4 | DV-013 |
| [ ] | T-083 | Deploy Vercel + kiểm tra HTTPS | T-006 | plan 8 | MT-DEV |
| [x] (25/11) | T-084 | Phát hiện trình duyệt nhúng (Zalo/Facebook) + banner "Mở bằng trình duyệt" (`InAppBrowserBanner`) | T-083 | plan 8 | `production-p3-p4-p5.test.ts` |
| [ ] | T-085 | Test thiết bị thật | T-083 | – | MT-DEV |
| [ ] | T-087 | Quay video demo dự phòng | T-085 | proposal 15 | – |

## P9 – Nâng cấp sản phẩm thật (nhánh `feat/production-p3-p4-p5`)

| | ID | Hạng mục | Chi tiết đã triển khai | Kiểm chứng |
|---|---|---|---|---|
| [x] (25/11) | T-P3 | Bảo mật, RBAC & Turnstile | Cloudflare Worker `api/src/security.ts` (JWT HS256, RBAC `requireRole`, SHA-256 `secretCode`, rate limit IP, Turnstile Siteverify) + `TurnstileWidget` & `apiClient` | `production-p3-p4-p5.test.ts` |
| [x] (25/11) | T-P4 | Web Push, SLA & Xuất báo cáo | `api/src/notifications.ts` (Push subscribe, Zalo ZNS/SMS adapter, Cron SLA, Audit log) + `webPush.ts` + `exportReport.ts` (CSV UTF-8 BOM, In PDF trên `OfficerStats`) | `production-p3-p4-p5.test.ts` |
| [x] (25/11) | T-P5 | AI Vision thật & PWA | `api/src/aiVision.ts` (Gemini Flash Lite / 3.6 / 3.8 Flash proxy) + `AiCategoryBanner` tự phân tích ảnh + PWA (`manifest.webmanifest`, `sw.js`, `PwaStatusBanner`, offline queue) | `production-p3-p4-p5.test.ts` + live HTTP 200 |
| [x] (25/11) | T-P12 | Nền tảng D1/R2 & tối ưu bundle | `api/migrations/0001_init.sql`, `api/src/reportsDb.ts` (`/api/reports`, `/api/uploads`), tách vendor chunks `vite.config.ts`, đồng bộ GPS ↔ Nominatim `geocoding.ts` | `npm run verify` + `npm run build` |
| [x] (25/11) | T-P13 | Database D1 4 vai trò, Admin & Tách 4 web | `api/migrations/0002_roles_and_tasks.sql` (local + remote `tran-bien-db`), `api/src/rolesDb.ts`, `AdminDashboard.tsx` (`/admin`), `portalMode.ts` (`VITE_PORTAL_MODE`), deploy Cloudflare Worker HTTPS | `npm run verify` + `wrangler deploy` |
| [x] (25/11) | T-P14 | Đồng bộ 2 chiều D1 & Chuông thông báo Cán bộ / TNV | Đồng bộ 2 chiều `AppStore.tsx` ↔ D1 (upsert `PATCH /api/reports/:id` + `POST /api/tasks`), gửi Khách/Ẩn danh trực tiếp Bước 3, Cán bộ giao xử lý trực tiếp (TNV xác minh tùy chọn) + `PortalNotificationBell` trên `/can-bo` và `/tnv` | `officer-tnv-flow.test.tsx` + `npm run verify` |
| [x] (25/11) | T-P15 | Hợp nhất bản UI/UX mới (`fc4c476`) | Cập nhật 40 file UI/UX mới (logo mới, dark theme, `OnBehalfWizard`, xuất Excel `.xlsx`, `DateInputDdMmYyyy`, `gpsSettings`, làm sạch dữ liệu demo `tbkn:v2`) giữ nguyên 100% tính năng sản phẩm thật | `npm run verify` (40/40 test files) + `npm run build` |

---

## Backlog Bonus

| | ID | Bonus | Task | Spec | Test |
|---|---|---|---|---|---|
| [x] (25/11) | T-B3-1 | B3 Chữ lớn | 4 mức cỡ chữ (Nhỏ / Thường / Lớn / Rất lớn) đồng bộ toàn cổng & màn hình chào | AC-C01-2, spec 7.2 | `senior-mode.test.tsx` |
| [x] (25/11) | T-B2-1 | B2 Trùng | `domain/duplicates.ts` `findDuplicates` | spec 3.5 | `duplicates.test.ts` |
| [x] (25/11) | T-B2-2 | B2 Trùng | C04 modal đối chiếu nghi trùng + "Tôi cũng gặp" | AC-C04-3, 7, 8, AC-C06-8 | `C04Confirm.tsx` |
| [x] (25/11) | T-B2-3 | B2 Trùng | A01 cờ Nghi trùng + A02 gộp/tách hồ sơ | AC-A01-5, AC-A02-6, 7 | `officer-actions.test.ts` |
| [x] (25/11) | T-B1-1 | B1 AI | `AiCategoryBanner` gọi `/api/ai/classify` (Gemini Vision thật + fallback dự phòng) | AC-C04-1 | `production-p3-p4-p5.test.ts` |
| [x] (25/11) | T-B4-1 | B4 Giọng nói | Web Speech API `vi-VN` tích hợp trực tiếp ở Bước 3 `C04Confirm.tsx` | AC-C04-2 | `C04Confirm.tsx` |
| [x] (25/11) | T-B5-1 | B5 Gửi hộ | Tạo phản ánh hộ ở A01 + cờ Gửi hộ; modal tổng đài | AC-A01-8, AC-C01-4 | `officer-actions.test.ts` |

---

## Đường găng (critical path)

T-001 → T-010 → T-011 → T-012 → T-019 → T-020 → T-021/T-022 → T-030 → T-037 → T-041 → T-042 → T-043 → T-044 → T-045 → T-045b → T-048 → T-050 → T-051 → T-053 → T-070 → T-083

## Việc cần người thật làm (agent không làm được)

- T-082: chụp ảnh demo.
- T-085: cầm điện thoại thật thử GPS/camera.
- T-087: quay video.

## Câu hỏi mở

1. Hạn mặc định theo loại – chờ duyệt.
2. Giới hạn gửi ẩn danh 5/thiết bị/ngày – chờ duyệt.
3. Figma có bắt buộc không.
4. Hạn nộp bài → quy đổi phase sang ngày cụ thể.
5. Ngưỡng trùng 50 m / 14 ngày – chỉ cần chốt khi mở B2.
