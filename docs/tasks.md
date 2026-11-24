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
| [ ] | T-034 | `MapView` (React Leaflet, marker icon loại trên nền màu trạng thái + viền, chú giải, attribution, onTap, vòng bán kính, fallback khi tile lỗi) | T-011 | AC-C03, AC-C07 | CT-034 |
| [ ] | T-035 | `lib/geolocation.ts` (timeout 10s, phân loại lỗi) + `lib/image.ts` (nén) | T-010 | AC-C02, AC-C03 | UT-035 |
| [ ] | T-036 | `PhoneOtpSheet` (validate SĐT, dòng cam kết riêng tư, OTP 123456, nhãn Mô phỏng) | T-030 | AC-C04-5 | CT-036 |
| [ ] | T-037 | `BeforeAfter` (ô Sau trống "Chưa có ảnh sau xử lý") + `CategoryTile` + `LocationRow` + `ReportCard` + `LatestUpdate` | T-030, T-031 | AC-C06-4, AC-C04-1, AC-C05-2 | CT-037 |
| [ ] | T-038 | `NotificationBell` + `SmsPreview` + `MockLabel` | T-030, T-017 | AC-C05-5 | CT-038 |
| [ ] | T-039 | `lib/share.ts` + `TrackingLinkCard` (mã bí mật, QR, Lưu link) + `SubscribeCard` | T-030, T-036 | AC-C04-11, AC-C06-9, AC-C06-11 | UT-039, CT-039 |
| [ ] | T-039b | `RatingSheet` (5 sao có nhãn, chip theo số sao, góp ý tuỳ chọn, "Chưa đến 30 giây") | T-030, T-011 | AC-C06-5 | CT-039b |

## P4 – Người dân

| | ID | Task | Phụ thuộc | Spec | Test |
|---|---|---|---|---|---|
| [ ] | T-040 | C01 Trang chủ: thẻ kêu gọi, "Phản ánh của bạn" (trượt ngang), "Quanh đây", dải số liệu | T-005, T-015, T-032, T-037 | AC-C01-1, 3, 5, 6, 7 | CT-040 |
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
