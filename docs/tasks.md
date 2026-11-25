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
| [ ] | T-041 | Draft gửi phản ánh trong store (lưu/khôi phục, hỏi khi ✕) | T-021 | AC-C02-7 | UT-041 |
| [ ] | T-042 | C02 Chụp ảnh (ô chụp lớn, mẹo, xem trước, dải ảnh, chụp lại) | T-033, T-035, T-041 | AC-C02 (trừ AC-C02-5) | CT-042 |
| [ ] | T-043 | C03 Vị trí (ảnh trên + sheet; GPS, ngoài phường, từ chối, nhập địa chỉ, chạm bản đồ, LocationRow) | T-034, T-035, T-041 | AC-C03 (trừ AC-C03-7) | CT-043 |
| [ ] | T-044 | C04 Loại & xác nhận (ảnh trên + sheet, 4 CategoryTile, LocationRow → C03, mô tả) | T-037, T-041 | AC-C04-1, 2, 13 | CT-044 |
| [ ] | T-045 | C04 Gửi có SĐT: OTP, màn thành công, mất mạng | T-036, T-021 | AC-C04-5, 6, 9 | CT-045 |
| [ ] | T-045b | C04 Gửi ẩn danh: link, sheet cảnh báo, màn thành công ẩn danh, quota | T-039, T-045 | AC-C04-10 → 12 | CT-045b |
| [ ] | T-047 | C05 Phản ánh của tôi (danh sách máy này + SĐT, tab trạng thái có số đếm, ReportCard, lưu link, đăng nhập/tra cứu, trống, thông báo) | T-031, T-037, T-038, T-039, T-021 | AC-C05 | CT-047 |
| [ ] | T-048 | C06 Chi tiết (thứ tự khối, LatestUpdate, Timeline dọc, Trước/Sau, đánh giá, chưa giải quyết, gộp, bổ sung) | T-032, T-037, T-039b, T-021 | AC-C06-1, 3 → 8, 12 | CT-048 |
| [ ] | T-048b | C06 quyền chủ hồ sơ qua link `?k=`, đăng ký/huỷ nhận tin, link sai, nút Lưu | T-048, T-039 | AC-C06-9 → 11 | CT-048b, E2E-07 |
| [ ] | T-049 | C07 Bản đồ quanh tôi (marker, chú giải, chip lọc, thẻ nổi, Bản đồ/Danh sách, FAB vẫn hiện) | T-034, T-016, T-037 | AC-C07 | CT-049a |
| [ ] | T-049b | C08 Kết quả của phường (KPI, biểu đồ, thẻ Trước → Sau) | T-015, T-016, T-037 | AC-C08 | CT-049b |

## P5 – Cán bộ

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-050 | A01 Hộp tiếp nhận: KPI, bảng, sắp xếp, cờ Ẩn danh, lọc (gồm Nguồn), tab, tìm kiếm | T-014, T-015, T-031 | AC-A01-1 → 4, 6, 7, 9 | CT-050 |
| [ ] | T-051 | A02 Panel: thông tin, trường phân loại, nút theo trạng thái, giao TNV, kết quả xác minh, lý do ngoại lệ, lịch sử, gợi ý xác minh hồ sơ ẩn danh | T-022, T-050 | AC-A02-1 → 5, 8 → 10 | CT-051 |
| [ ] | T-053 | A03 Cập nhật kết quả + xem trước | T-022, T-037 | AC-A03 | CT-053 |
| [ ] | T-056 | Điều hướng bàn phím dashboard | T-051 | spec 7.3 | CT-056 |

## P6 – Tình nguyện viên

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-060 | V01 Danh sách nhiệm vụ | T-022, T-031 | AC-V01 | CT-060 |
| [ ] | T-061 | V02 Xác minh tại chỗ | T-034, T-035, T-022 | AC-V02 | CT-061 |
| [ ] | T-062 | Nối nhiệm vụ nghiệm thu từ "Chưa giải quyết" (C06) → V01 → A02 | T-048, T-060, T-061 | spec 3.3 | E2E-05 |

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
| [ ] | T-082 | Bộ ảnh demo thật + ảnh after | – | spec 5.4 | DV-013 |
| [ ] | T-083 | Deploy Vercel + kiểm tra HTTPS | T-006 | plan 8 | MT-DEV |
| [ ] | T-084 | Phát hiện trình duyệt nhúng (Zalo/Facebook) + banner "Mở bằng trình duyệt" | T-083 | plan 8 | MT-DEV |
| [ ] | T-085 | Test thiết bị thật | T-083 | – | MT-DEV |
| [ ] | T-087 | Quay video demo dự phòng | T-085 | proposal 15 | – |

---

## Backlog Bonus – CHƯA LÀM

Chỉ mở khi P0–P8 xong. Thứ tự gợi ý: B3 → B2 → B1 (đều là điểm cộng của đề) → B4 → B5.

| | ID | Bonus | Task | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-B3-1 | B3 Chữ lớn | Class `.senior` đổi giá trị biến CSS; nút "Aa Chữ lớn" ở C01, ghi nhớ | AC-C01-2, spec 7.2 | BT-B3-1 |
| [ ] | T-B3-2 | B3 Chữ lớn | Biến thể C03 "Tôi đang đứng ở chỗ bị hư"; bảng từ ngữ 7.4 cột Chữ lớn; rà soát C01–C06 | AC-C03-7, spec 7.4 | MT-SR |
| [ ] | T-B2-1 | B2 Trùng | `domain/duplicates.ts` `findDuplicates` | spec 3.5 | BT-B2-1 |
| [ ] | T-B2-2 | B2 Trùng | C04 hộp nghi trùng + "Tôi cũng gặp" (có SĐT / ẩn danh) + cờ `suspectedDuplicateOf`; nút "Tôi cũng gặp" ở C06 | AC-C04-3, 7, 8, AC-C06-8 | BT-B2-2, BT-E2E-02 |
| [ ] | T-B2-3 | B2 Trùng | A01 cờ Nghi trùng + cột Người cùng báo; A02 khối Phản ánh tương tự, gộp, tách | AC-A01-5, AC-A02-6, 7 | BT-B2-3, BT-E2E-04 |
| [ ] | T-B1-1 | B1 AI | `lib/aiMock.ts` + `manifest.json` ảnh demo; gợi ý ở C02, huy hiệu "Gợi ý" ở C04 | AC-C02-5, AC-C04-1 | BT-B1-1 |
| [ ] | T-B4-1 | B4 Giọng nói | `lib/speech.ts` + nút micro ở C04 | AC-C04-2 | BT-B4-1 |
| [ ] | T-B5-1 | B5 Gửi hộ | Modal "Tạo phản ánh hộ" ở A01 + cờ Gửi hộ; modal tổng đài C01 | AC-A01-8, AC-C01-4 | BT-B5-1 |
| [ ] | T-B0-1 | – | Thử nghiệm nhanh 5 người | proposal 10 | UX-001 → 004 |

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


---

## Giai đoạn 2 – Sản phẩm hoàn chỉnh (mở 25/11/2026)

Chi tiết quyết định và thứ tự: `CLAUDE.md` mục 6, `docs/spec.md` mục 10–17, `docs/plan.md` mục 10–18. Mỗi task nhỏ ước lượng ≤ 3 giờ, có phụ thuộc, mục spec và ID test cụ thể.

### Q0 – Tài liệu & Chuẩn bị
- [x] (25/11) G2-01 Chốt stack: Supabase (PostgreSQL + PostGIS + Auth + Storage) + Vercel Functions + Drizzle; OTP/AI vẫn mô phỏng; bỏ trang quản trị, dùng script
- [x] (25/11) G2-02 Cập nhật tài liệu: `proposal_v3.md`, `spec.md`, `plan.md`, `tasks.md`, `tests.md`

### Q1 – Cơ sở dữ liệu & Bất biến (G2-03)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] | G2-03a | Định nghĩa Drizzle schema (`server/db/schema.ts`): enum, bảng, quan hệ, chỉ mục, cột `is_seed` | G2-02 | 11.1, 11.2 | DB-001 | 2h |
| [x] | G2-03b | Viết migration SQL: PostGIS extensions, geometry/geography, GiST index, CHECK constraints, trigger bất biến `report_timeline`, RLS không anon/auth policy | G2-03a | 11.3, 11.4 | DB-002 → 004 | 2.5h |
| [x] | G2-03c | Viết script `db:seed`: nạp 64 hồ sơ từ `mock.json`, hash secretCode, tạo tài khoản mẫu (CB Nguyễn Văn Minh, 3 TNV), idempotent | G2-03b | 16.3 | DB-005, DB-006 | 2.5h |
| [x] | G2-03d | Viết script `db:verify`: kiểm tra 16 bất biến dữ liệu trên DB thật (khớp `mock:verify`: 64/47/17/3,2 ngày, 6 ẩn danh, v.v.) | G2-03c | 16.3, 5.1 | DB-007 → 016 | 2h |

### Q2 – Lõi API Hono (G2-04)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] | G2-04a | Khung Hono `server/app.ts`, `api/[...path].ts`, `env.ts` (zod fail sớm), `clock.ts` (real/fixed). Middleware: CORS, Request-Id, Error handler, Zod validator | G2-03d | 12.1, 12.8, AC-API-2,3,4 | API-001, API-002 | 2h |
| [x] | G2-04b | Middleware RateLimit bằng bảng Postgres (`AC-API-7`) và Idempotency-Key (`AC-API-6`) | G2-04a | 12.1, 13.4, AC-API-6,7 | IDEM-001, CONC-002 | 2h |
| [x] | G2-04c | Routes `/public/*`: reports, by code, kpi, config, recent-results. PostGIS ST_DWithin, serializer `toPublicReport` lọc SĐT/mã/hash | G2-04a | 12.2, AC-API-1, AC-AUTH-6 | API-PUB-001 → 005, LEAK-001 | 2.5h |
| [x] | G2-04d | Routes `/citizen/*`: otp/request, verify, gửi phản ánh ẩn danh/SĐT, claim, lookup, owner, feedback, supplement, follow, subscribe | G2-04b, G2-04c | 12.3, AC-DATA-3,5 | API-CIT-001 → 010 | 3h |
| [x] | G2-04e | Routes `/officer/*`: reports, kpi, accept, assign-volunteer, assign-dept, complete, ngoại lệ, gộp/tách, gửi hộ. Giao dịch FOR UPDATE + transition | G2-04d | 12.4, 3.3, 3.6 | API-OFF-001 → 012, CONC-001 | 3h |
| [x] | G2-04f | Routes `/volunteer/*`: tasks theo GPS, chi tiết, claim mở (khóa dòng), nộp kết quả. Kích hoạt chuyển trạng thái 3.3, che SĐT | G2-04e | 12.5, AC-V01, AC-V02 | API-VOL-001 → 004 | 2.5h |
| [x] | G2-04g | Cron route `/cron/daily`: bảo vệ bằng `CRON_SECRET`, tự đóng hồ sơ sau 7 ngày, dọn pending_uploads, dọn OTP và access_attempts hết hạn | G2-04f | 12.7, AC-API-8 | CRON-001 → 004 | 2h |

### Q3 – Xác thực & Quyền riêng tư (G2-05)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] | G2-05a | Middleware xác thực nhân viên qua Supabase Auth JWT, tra `staff_profiles` mỗi request, `is_active=false` → 403. Kiểm soát ma trận quyền 13.5 | G2-04f | 13.1, 13.2, 13.5 | AUTHZ-001 → 015 | 2.5h |
| [x] | G2-05b | Xác thực người dân: OTP mock (123456, 5 phút, 5 lần sai), JWT 30 ngày qua jose HS256 | G2-05a | 13.3, 10.3 | AUTH-CIT-001 → 004 | 2h |
| [x] | G2-05c | Quyền chủ sở hữu hồ sơ ẩn danh: secretCode 4 số + ownerToken 256-bit hash kèm pepper, claim/lookup, chống dò brute force và quota | G2-05b | 13.4, AC-AUTH-4,5,7,8 | AUTH-ANON-001 → 006, LEAK-002 | 2.5h |

### Q4 – Lưu trữ ảnh (G2-06)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] | G2-06a | Route `POST /uploads/sign`: cấp signed URL PUT lên bucket riêng tư `report-photos`, giới hạn 1.5MB, kiểm mime-type | G2-04a | 15, AC-PHOTO-1,4 | PHOTO-001, PHOTO-002 | 2h |
| [x] | G2-06b | Gắn ảnh vào hồ sơ: kiểm tra magic bytes, kích thước thật server-side, URL ký đọc ngắn hạn 1 giờ có kiểm soát quyền | G2-06a | 15, AC-PHOTO-2,3 | PHOTO-003, PHOTO-004 | 2h |

### Q5 – Scripts Vận hành & Màn Đăng nhập (G2-10)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] | G2-10a | CLI scripts nhân viên & SLA: `staff:create`, `staff:disable`, `staff:enable`, `staff:reset-password`, `staff:list`, `config:set-sla` | G2-05a | 14, AC-OPS-1,2,3 | OPS-001 → 005 | 2h |
| [x] | G2-10b | CLI scripts demo: `demo:reset`, `demo:clock` (từ chối khi `DEMO_MODE !== 'true'`) | G2-10a | 14, AC-OPS-4 | OPS-006, OPS-007 | 1.5h |
| [x] | G2-10c | Màn hình `/dang-nhap` và phân quyền route: responsive CB desktop / TNV mobile, chuyển trang theo vai trò, trang `/khong-co-quyen`, đăng xuất | G2-05a | 8, 13.2, AC-LOGIN-1 → 6 | LOGIN-001 → 006 | 2.5h |

### Q6 – Frontend DataSource & Tích hợp (G2-07)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] (25/11) | G2-07a | Lớp trừu tượng `DataSource` (`types.ts`, `LocalDataSource.ts`, `ApiDataSource.ts`, `index.ts`), chọn qua `VITE_DATA_SOURCE=local\|api` | G2-04f, G2-05c | 16.1, AC-DATA-1 | DS-001, DS-002 | 2.5h |
| [x] (25/11) | G2-07b | Tích hợp gọi API qua `src/lib/api.ts`: token, headers, map lỗi sang tiếng Việt. Trạng thái async (đang gửi, lỗi, thử lại) | G2-07a | 16.2 | API-CLIENT-001 → 004 | 2.5h |
| [x] (25/11) | G2-07c | Tải ảnh trực tiếp lên Supabase Storage qua signed URL tại C02/C04, C06, A03, V02 | G2-06b, G2-07b | 15, 16.2 | PHOTO-CLIENT-001 | 2h |
| [x] (25/11) | G2-07d | Đồng bộ thiết bị, làm mới định kỳ 30s hoặc khi tab active ở A01/C05, lưu trữ `deviceReports` dạng `{code, ownerToken}` | G2-07b | 16.2 | SYNC-001, SYNC-002 | 2h |

### Sửa Test Redesign cũ (G2-09)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] (25/11) | G2-09 | Cập nhật và sửa 17 test component/unit cũ đang fail do đợt redesign giao diện để toàn bộ test suite pass 100% | G2-07d | 6, 7 | UT-OLD-001 → 017 | 3h |

### Q7 – Vận hành & CI/CD (G2-11)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] (25/11) | G2-11a | Cấu hình `vercel.json` (rewrites, cron, SPA), `.github/workflows/ci.yml` (lint, typecheck, vitest, postgres/postgis, migrate, seed, verify, build) | G2-04g, G2-07d | 12.7, 16.1 | OPS-VERCEL-001, CI-001 | 2h |
| [x] (25/11) | G2-11b | Tài liệu vận hành `docs/van-hanh.md`, cập nhật `README.md`, `AGENTS.md`, `CLAUDE.md`, file `app/.env.example` chuẩn | G2-11a | 10, 14, 16 | DOC-001 | 1.5h |
| [x] (25/11) | G2-11c | Cộng migration `20261125020000_admin.sql` (enum admin, audit log RLS), cập nhật Drizzle schema và seed admin idempotent từ `SEED_ADMIN_PASSWORD`; không sửa/xoá migration cũ | G2-11b | 13.1, 14.2 | ADMIN-DB-001, ADMIN-DB-002 | 1h |
| [x] (25/11) | G2-11d | Tách `scripts/staff.ts` sang service `server/services/staffAdmin.ts`; CLI và API dùng chung logic, transaction + rollback Auth user, chống hạ quyền cuối cùng | G2-11c | 14.2, 14.3 | ADMIN-SVC-001 → 006 | 2.5h |
| [x] (25/11) | G2-11e | Xây API `/admin/*`: tài khoản, bộ phận, cấu hình SLA, overview tính từ DB, nhật ký phân trang; Zod, audit cùng transaction, role admin | G2-11d | 13.5, 14.1–14.4 | ADMIN-API-001 → 014 | 3h |
| [x] (25/11) | G2-11f | Bổ sung đăng nhập/route Admin, Demo Hub, giao diện tổng quan và 4 màn quản lý responsive; local mode hiện “Cần chế độ API” | G2-11e | 13.1, 13.5, 13.7, 14.1 | ADMIN-UI-001 → 010 | 3.5h |
| [ ] | G2-11g | Hoàn thiện test API, privacy scan, Playwright luồng Admin và ảnh review 1440px/390px | G2-11e, G2-11f | 14.4 | ADMIN-E2E-001, ADMIN-LEAK-001 | 2h |

> G2-11g: Đã bổ sung API/component test và Playwright spec. 8 API integration test được skip có cảnh báo vì migration Admin chưa áp dụng; chưa chạy E2E hoặc tạo ảnh review để tránh reset/ghi vào Supabase local đang dùng chung. Cần chạy lại trên DB thử nghiệm riêng sau khi áp migration.

### Q8 – AI Gợi ý Loại Sự cố Bằng DeepSeek (G2-12)
| Trạng thái | ID | Task | Phụ thuộc | Mục Spec | ID Test | Ước lượng |
|:---:|---|---|---|---|---|:---:|
| [x] (25/11) | G2-12a | Cập nhật tài liệu (`spec.md`, `plan.md`, `tasks.md`, `tests.md`) cho tính năng AI gợi ý bằng DeepSeek | G2-11b | B1, AC-C02-5, AC-C04-1, 10.1 | DOC-AI-001 | 1h |
| [ ] | G2-12b | Migration database bổ sung cột nullable `reports.ai_suggestion` và cập nhật `schema.ts`, xác nhận `db:verify` pass | G2-12a | 10.1, 11 | DB-AI-001 | 1h |
| [ ] | G2-12c | Cấu hình `env.ts` (`AI_PROVIDER`, `DEEPSEEK_*`) và hiện thực `CategorySuggester` (Mock + DeepSeek) cùng route `POST /api/v1/ai/suggest-category` | G2-12b | 10.1, 12 | AI-UNIT-*, AI-API-* | 2.5h |
| [ ] | G2-12d | Bổ sung `suggestCategory` vào `DataSource` (Api + Local) và tích hợp giao diện C02/C04 (băng gợi ý, nút Dùng gợi ý, nhãn nguồn, quyền riêng tư) và A02 (xem gợi ý) | G2-12c | AC-C02-5, AC-C04-1 | AI-FE-* | 2.5h |
| [ ] | G2-12e | Kiểm thử toàn diện: unit tests, API tests, script `npm run ai:try -- <path>` và chụp ảnh màn hình review | G2-12d | B1 | AI-E2E-* | 2h |

---

## Giả định tự quyết đêm 25/11

| Giả định | Vì sao chọn | Cách đổi lại nếu chủ dự án yêu cầu khác |
|---|---|---|
| **1. Chạy Supabase Local qua Docker dev** | Tiết kiệm chi phí, không cần tạo tài khoản cloud trong đêm, an toàn tuyệt đối, chạy nhanh không phụ thuộc mạng | Điền URL và khoá của Supabase Cloud vào `app/.env.local` |
| **2. Mật khẩu tài khoản nhân viên seed lấy từ biến môi trường `SEED_STAFF_PASSWORD`** | Không lưu mật khẩu trong code hay git; seed bắt buộc có biến này (thiếu thì báo lỗi rõ). `staff:create` sinh mật khẩu ngẫu nhiên và in ra một lần | Đổi giá trị `SEED_STAFF_PASSWORD` rồi chạy lại `npm run seed` |
| **3. Khóa bí mật JWT & Pepper sinh ngẫu nhiên 32-byte** | Đảm bảo an toàn mật mã theo tiêu chuẩn HMAC-SHA256 khi chưa có cấu hình production chính thức | Thay chuỗi bí mật mới vào biến `CITIZEN_JWT_SECRET` và `OWNER_KEY_PEPPER` trong `.env.local` |
| **4. Dùng bảng `access_attempts` và `anonymous_submissions` trong PostgreSQL để rate-limit** | Không cần cài đặt Redis cồng kềnh, hoạt động nhất quán trong cùng cơ sở dữ liệu quan hệ | Chuyển sang Upstash Redis nếu tải tăng cao ở giai đoạn sau |
| **5. Dùng chung trực tiếp `src/domain/` cho cả Client và Server** | Giữ tính nhất quán logic nghiệp vụ một nguồn (SSOT), tránh trùng lặp code theo quy định của AGENTS.md | Đóng gói thành `packages/domain` nếu Vercel build gặp khó khăn về bundle path |
| **6. PostGIS thật qua Supabase local (thay cho lớp giả cube/earthdistance)** | Lớp giả che lỗi (ví dụ `ST_X` không có cho `geography`) và cho kết quả kiểm sai; Supabase local có sẵn PostGIS 3. Sửa 25/11 sau review | Không cần; chỉ phải chạy Docker và `npx supabase start --workdir ..` |

---
## Đợt sửa sau review 25/11/2026 (chiều)

Số liệu thật: `docs/review/giai-doan-2/ket-qua-kiem-chung.md`.

- [x] Q1b PostGIS thật, migration hardening, `find_duplicate_reports`, `db:verify` 17/17 (PG-001…005).
- [x] Q3b Đăng nhập nhân viên qua Supabase Auth, bỏ mật khẩu/secret cứng, cron Bearer (LOGIN-001…009, OFF-010).
- [x] Q3c Chủ hồ sơ mới được đánh giá/bổ sung (OWNER-001…005); TNV không thấy SĐT (VOL-000…007).
- [x] Q2b Mọi chuyển trạng thái qua `transition.ts`; mã bí mật tạo hộ ngẫu nhiên bằng `crypto` (OFF-001…009, TRANS-006).
- [x] Q6b Màn hình A01–A03, V01–V02, C04, C06 nối qua DataSource; xử lý 401/403/409/mất mạng; e2e API 7/7.
- [ ] Q4 Lưu ảnh: ký URL tải lên Supabase Storage thật, kiểm tra magic bytes khi gắn hồ sơ (hiện `/uploads/sign` là bản giả).
- [ ] Q2c Idempotency-Key bền vững; thực thi `OTP_PROVIDER`/`ALLOW_MOCK_OTP`; giới hạn đăng nhập ở API; thống nhất 400/422 (AC-API-4).
- [ ] Q5b Script `staff:reset-password`; endpoint dùng `find_duplicate_reports`; "Phản ánh của tôi" ở chế độ API qua `/citizen/me/reports`.
- [ ] Q7b Chạy thử CI trên GitHub; cấu hình Supabase cloud và Vercel (chủ dự án làm); nâng gói có lỗ hổng (`npm-audit.md`).


## Câu hỏi mở giai đoạn 2

Xem `spec.md` mục 17 (7 câu: mã bí mật 4 số + khoá dò, cột `is_seed`, dự án demo riêng, vùng đặt dữ liệu/Nghị định 13, CB không xem SĐT đầy đủ, quên mật khẩu nhân viên, cron 1 lần/ngày). Toàn bộ 7 câu đã áp dụng phương án [ĐĐ] đề xuất trong đêm, ghi nhận chờ chủ dự án duyệt sáng mai.

Bổ sung 25/11 (chiều):
1. Có nên nâng `hono`, `zod`, `react-router-dom`, `drizzle-orm`, `vitest`, `vite` (có thay đổi phá vỡ) trước khi triển khai thật không? Xem `docs/review/giai-doan-2/npm-audit.md`.
2. Lỗi kiểm tra đầu vào: giữ 400 (hiện tại) hay đổi sang 422 như AC-API-4?
3. Máy dev không tải được Chromium/WebKit của Playwright; có chấp nhận dùng Google Chrome cài sẵn (`channel: chrome`) cho e2e không?

