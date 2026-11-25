# TESTS – Trấn Biên Kết Nối

Nguồn: `spec.md` v3.0 (25/11/2026, theo FR-08), `tasks.md`, `ui-ux-guidelines.md`

Nguyên tắc: **test viết trước code** cho mỗi task. Test domain và dữ liệu là bắt buộc tự động; UX thiết bị thật là checklist thủ công. Mục 9 (Backlog Bonus) **chưa viết** cho tới khi mở lại bonus.

| Tầng | Công cụ | Thư mục | Chạy trong `verify` |
|---|---|---|---|
| UT – Unit | Vitest | `tests/unit/` | ✓ |
| DV – Data validation | `scripts/verify-mock.ts` + Vitest | `tests/unit/mock.test.ts` | ✓ |
| CT – Component | Vitest + Testing Library | `tests/component/` | ✓ |
| E2E | Playwright (mobile 390×844, desktop 1440×900) | `tests/e2e/` | Chạy riêng `test:e2e` |
| A11Y | @axe-core/playwright | `tests/e2e/a11y.spec.ts` | Chạy riêng |
| MT | Checklist thủ công | mục 6–7 | – |

Quy ước thời gian: mọi test dùng `now = 2026-11-24T09:00:00+07:00` trừ khi ghi khác.

---

## 1. Unit tests (UT)

### UT-000 – Tooling
- `npm run lint`, `tsc --noEmit`, `vitest run` chạy được với 1 test mẫu.

### UT-010 – Types
- `tsc --noEmit` pass; enum `Category` có đúng 4 giá trị; enum `Status` có đúng 11 giá trị.

### UT-011 – Constants
1. Có đúng 4 loại theo thứ tự Đèn đường, Ngập nước, Rác thải, Mặt đường.
2. Hạn mặc định: den_duong 3, ngap_nuoc 2, rac_thai 2, mat_duong 5.
3. Mỗi status có đủ: nhãn CB, nhãn công khai, bước (1–4 hoặc `exception`), màu, icon.
4. `publicLabel('moi')` = "Chờ tiếp nhận"; `publicLabel('cho_xac_minh')` chứa "Đang kiểm tra tại chỗ".
5. Có 5 bộ phận và 3 TNV mẫu.
6. Bộ chip đánh giá: 4 chip tích cực, 4 chip chưa tốt, đúng câu chữ AC-C06-5.

### UT-012 – Status
1. `canTransition('moi','da_tiep_nhan','CB')` = true; `('moi','hoan_thanh','CB')` = false.
2. `transition` sang `hoan_thanh` khi không có `resultPhotos` → ném lỗi có thông điệp tiếng Việt.
3. `transition` sang `hoan_thanh` lần đầu set `completedAt`; lần hai (sau `mo_lai` → `da_giao` → `hoan_thanh`) giữ nguyên `completedAt` cũ.
4. Mọi `transition` thành công thêm đúng 1 mục timeline với `at = now`.
5. TNV không thể chuyển bất kỳ trạng thái nào trực tiếp (`canTransition(..., 'TNV')` luôn false).
6. `progressStep`: moi→1, da_tiep_nhan→2, cho_xac_minh→2, da_giao→3, mo_lai→3, hoan_thanh→4, dong→4, da_gop→`exception`.
7. Chuyển sang `can_bo_sung`, `chuyen_co_quan` không có lý do hoặc lý do < 10 ký tự → lỗi.
8. `publicTimeline` hồ sơ `da_tiep_nhan` có `dueAt` → mốc 1 `done` (có giờ), mốc 2 `current` (có giờ), mốc 3 `upcoming`, mốc 4 `upcoming` kèm `expected = dueAt`. Quy tắc chung: bước n của trạng thái hiện tại là `current`, các bước < n là `done`, > n là `upcoming`.
9. `publicTimeline` hồ sơ `dong` → 4 mốc đều `done`, mỗi mốc có giờ lấy từ timeline.
10. `publicTimeline` hồ sơ `moi` → mốc 1 `current`, 3 mốc còn lại `upcoming`.
11. Trạng thái ngoại lệ (`can_bo_sung`, `chuyen_co_quan`, `khong_xac_nhan`, `da_gop`): bước được tính theo trạng thái thường gần nhất trong timeline; một mốc chỉ `done` khi timeline thực sự có mục tương ứng (ví dụ `can_bo_sung` ngay từ `moi` → mốc 2 KHÔNG được `done`).
12. `mo_lai` → mốc 3 `current`; mốc 4 `upcoming` (không hiển thị giờ `completedAt` cũ cho mốc 4).

### UT-013 – Latest update & delay
1. Mỗi trạng thái trong 3.4c sinh đúng câu, thay hết biến (không còn ký tự `{`).
2. `da_giao`, `dueAt` = now − 26h → `delayDays` = 2 (làm tròn lên); câu có thêm "chậm hơn dự kiến 2 ngày".
3. `dong` có `dueAt` trong quá khứ → `delayDays` = 0 (đã xong thì không báo chậm).
4. Không có `dueAt` → câu không chứa "Dự kiến".

### UT-014 – Sorting & priority
1. `dueAt` = now − 1h, trạng thái `da_giao` → overdue.
2. `dueAt` = now − 1h, trạng thái `dong` → không overdue.
3. `dueAt` = now + 23h → dueSoon; now + 25h → không.
4. `sortInbox` với tập [moi, overdue 2 ngày, overdue 1 ngày, dueSoon, da_giao bình thường] → thứ tự: overdue 2 ngày, overdue 1 ngày, dueSoon, moi, da_giao.
5. `computePriority`: CB đặt tay `cao` → `cao`; mặc định `binh_thuong`.

### UT-015 – KPI
1. Với `mock.json`: total 64; byCategory {18,15,21,10}; resolved 47; open 17; avgDays làm tròn 1 chữ số = 3,2.
2. Tập rỗng → mọi số 0, avgDays `null` (UI hiện "–").
3. Hồ sơ `da_gop` không tính vào open.
4. Thêm 1 hồ sơ tháng 12 → KPI tháng 11 không đổi.

### UT-016 – Privacy
1. `maskPhone('0909000068')` = `0909 *** 068`.
2. `toPublicReport` không có khoá `reporterPhone`, `followers`, `secretCode`, `subscribedLater`; có `followerCount`.
3. Timeline công khai không chứa tên cá nhân cán bộ/TNV; được phép chứa tên bộ phận.
4. Serialize JSON của `toPublicReport` cho mọi hồ sơ mock không chứa chuỗi khớp regex `0\d{9}`.

### UT-016b – Access
1. SĐT thiết bị nằm trong `followers` → `hasOwnerAccess` true.
2. `deviceReports` chứa `{id, secretCode}` đúng → true; `secretCode` sai → false.
3. Tham số `k` khớp → true; `k` sai → false.
4. Người lạ không SĐT, không deviceReports, không `k` → false.
5. `followerCount` = followers.length + anonymousFollows.
6. **[Đã bỏ theo FR-08]** `canSendAnonymous`: 4 mục `anonymousLog` trong 24h → true; 5 → false; 5 mục nhưng 1 mục cũ hơn 24h → true.

### UT-017 – Format, notifications, geo
1. `formatDays(3.2)` = "3,2 ngày"; `formatDistance(950)` = "950 m"; `formatDistance(1250)` = "1,3 km".
2. `formatDate` = `dd/MM/yyyy` theo UTC+7 (ISO `2026-11-23T18:00:00Z` → "24/11/2026").
3. `buildNotification` cho mỗi sự kiện spec 3.4 thay đúng biến, không còn ký tự `{`.
4. Chuyển `cho_xac_minh` → `da_tiep_nhan` không sinh thông báo (nhãn công khai không đổi bước).
5. `haversineMeters` giữa 2 điểm cách nhau 0,0004° vĩ độ ≈ 44,5 m (sai số ±1 m).

### UT-018 – Streets
1. ≥ 10 đường, mỗi đường có tên và tọa độ trong khung spec 5.3.
2. `nearestStreet` tại tọa độ của đường X trả về X.

### UT-019 – Generator
1. Cùng seed → 2 lần chạy cho JSON giống hệt.
2. Seed khác → dữ liệu khác nhưng vẫn qua toàn bộ DV.

### UT-020 – Store
1. Khởi tạo không có localStorage → state = mock.
2. Có localStorage hợp lệ → state = localStorage.
3. localStorage hỏng (JSON lỗi) → fallback mock + không crash.

### UT-021 – Actions người dân
1. `submitReport` → id `TB-0065`, status `moi`, followers = [phone], 1 timeline, 1 notification "đã nhận"; `secretCode` 4 số; `deviceReports` thêm `{TB-0065, secretCode}`.
2. Gửi tiếp → `TB-0066`.
3. **[Đã bỏ theo FR-08]** `submitReport({anonymous:true})` → `anonymous` true, `reporterPhone` rỗng, followers rỗng, anonymousFollows 1, **không** sinh notification SMS; `deviceReports` và `anonymousLog` cập nhật.
4. **[Đã bỏ theo FR-08]** `submitReport({anonymous:true})` lần thứ 6 trong 24h → lỗi quota, không tạo hồ sơ.
5. **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** `subscribeLater(id, phone)` trên hồ sơ ẩn danh → followers = [phone], `subscribedLater` true, `anonymous` vẫn true, 1 notification xác nhận; gọi trên hồ sơ không ẩn danh → lỗi.
6. **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** `unsubscribe` → gỡ phone, `subscribedLater` false.
7. **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** Sau `subscribeLater`, chuyển hồ sơ sang `hoan_thanh` → phone nhận notification "đã xử lý xong".
8. **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** `claimByLink(id, k)` đúng → thêm vào `deviceReports`; sai → không đổi state.
9. **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** `lookupReport(id, code4)` khớp 4 số cuối SĐT hoặc `secretCode` → trả hồ sơ; không khớp → `null`.
10. `submitFeedback({resolved:true, rating:4, tags:['Xử lý nhanh']})` khi `hoan_thanh` → `dong`, feedback lưu đủ tags.
11. `submitFeedback({resolved:false})` → `mo_lai` + 1 VolunteerTask `nghiem_thu` + thông báo "kiểm tra lại".
12. `submitFeedback` khi status ≠ `hoan_thanh` → lỗi.
13. `supplementReport` khi `can_bo_sung` → `moi`.

### UT-022 – Actions cán bộ/TNV
1. `accept` set department + dueAt mặc định = createdAt + hạn loại.
2. `assignVolunteer` → `cho_xac_minh` + task `xac_minh`.
3. `submitVerification(exists:'co')` → task `xong`, report `da_tiep_nhan`; `exists:'khong'` → report giữ `cho_xac_minh`, có cờ chờ CB xác nhận `khong_xac_nhan`.
4. `complete` thông báo tới mọi SĐT trong followers.
5. `requestSupplement`, `transferAgency` lưu lý do vào timeline.

### UT-023 – Persistence
1. Dispatch → localStorage cập nhật sau ≤ 150ms.
2. Giả lập `storage` event với state mới → store hydrate.
3. Settings ghi theo khoá `tbkn:settings:left` / `right` độc lập.
4. `reset` xoá dữ liệu và nạp lại mock.
5. `setItem` ném `QuotaExceededError` → action trả lỗi có thông điệp tiếng Việt, state không mất.
6. `deviceReports` khung `left` không xuất hiện ở khung `right`.

### UT-035 – lib
1. `geolocation`: mock `getCurrentPosition` không gọi callback → reject `timeout` sau 10s (fake timers); `PERMISSION_DENIED` → `denied`.
2. `image`: ảnh 4000×3000 → kết quả cạnh dài 1280; định dạng `image/jpeg`.

### UT-039 – Share
1. Có `navigator.share` → gọi với `{ title, text, url }` chứa `?k=`.
2. Không có `navigator.share` → `navigator.clipboard.writeText(url)` và trả `'copied'`.
3. Người dùng huỷ share (`AbortError`) → không báo lỗi.

### UT-041 – Draft
1. Lưu ảnh + vị trí → reload store → draft còn nguyên.
2. `submitReport` thành công → draft bị xoá.

---

## 2. Data validation (DV) – `npm run mock:verify`

| ID | Kiểm tra |
|---|---|
| DV-001 | Có đúng 64 hồ sơ `createdAt` trong tháng 11/2026 |
| DV-002 | Theo loại: den_duong 18, ngap_nuoc 15, rac_thai 21, mat_duong 10 |
| DV-003 | `hoan_thanh` + `dong` = 47; còn lại = 17 |
| DV-004 | Trung bình `completedAt − createdAt` của 47 hồ sơ = 3,2 ngày, sai số ≤ 0,005 |
| DV-005 | Phân bổ đã xử lý theo loại 13/11/16/7 và trạng thái 17 hồ sơ mở theo spec 5.2 |
| DV-006 | Mọi `completedAt ≤ demoNow` và `> createdAt`; thời gian xử lý từng hồ sơ trong [0,5; 8] ngày |
| DV-007 | Mọi tọa độ trong khung lat 10.925–10.975, lng 106.790–106.860 |
| DV-008 | Đúng 2 hồ sơ `da_giao` quá hạn tại demoNow |
| DV-009 | Có đúng 2 cụm gần nhau cùng loại (dữ liệu chừa sẵn cho bonus B2) |
| DV-010 | Có hồ sơ demo `mat_duong` `da_tiep_nhan` cách tâm phường ≤ 300 m |
| DV-011 | Mọi `id` duy nhất, dạng `TB-\d{4}`, liên tục 0001–0064 |
| DV-012 | 40 hồ sơ `dong` có `feedback.rating` 1–5 và `tags` thuộc bộ chip; 7 hồ sơ `hoan_thanh` không có feedback; 3 VolunteerTask `xac_minh` khớp 3 hồ sơ `cho_xac_minh` và 1 VolunteerTask `nghiem_thu` (`cho_nhan`) khớp hồ sơ `mo_lai`; hồ sơ `mo_lai` có `feedback.resolved = false`; mọi mục timeline do cán bộ/bộ phận thực hiện có giờ trong 07:00–17:30 |
| DV-013 | Mọi đường dẫn ảnh trong mock tồn tại trong `public/demo-photos/`; mỗi loại ≥ 4 ảnh |
| DV-015 | Timeline mạch lạc: mục cuối của `timeline` có `status` = `status` hiện tại; timeline đi qua đủ các bước trước đó theo bảng chuyển 3.3 (ví dụ `dong` phải có `moi → da_tiep_nhan → da_giao → hoan_thanh → dong`; `cho_xac_minh` phải có `moi → da_tiep_nhan → cho_xac_minh` hoặc `moi → cho_xac_minh`); thời điểm tăng dần; `hoan_thanh` trong timeline trùng `completedAt` |
| DV-016 | `department` rỗng ở hồ sơ `moi`; mọi trạng thái từ `da_tiep_nhan` trở đi có `department` đúng bộ phận gợi ý của loại (spec 3.1) và có `dueAt` = thời điểm tiếp nhận + hạn mặc định của loại (spec 3.1), trừ 2 hồ sơ quá hạn được chỉnh để quá hạn; mọi thời điểm ghi cùng định dạng `+07:00` |
| DV-014 | Đúng 6 hồ sơ `anonymous` (3 rác thải, 1 mỗi loại còn lại), có ở cả nhóm đã xử lý và chưa hoàn tất; không có `reporterPhone`; đúng 1 hồ sơ `subscribedLater`; mọi hồ sơ có `secretCode` 4 số |

`verify-mock` in bảng kết quả và **exit 1** nếu bất kỳ dòng nào sai.

---

## 3. Component tests (CT)

| ID | Đối tượng | Kiểm tra chính |
|---|---|---|
| CT-001 | Token | `:root` khai báo đủ `--fs-body`, `--fs-title`, `--btn-h`, `--tap`; nút chính đọc chiều cao từ `--btn-h` |
| CT-002 | Layouts | CitizenLayout rộng tối đa 430px, có thanh điều hướng 5 mục với nhãn chữ và FAB "Báo sự cố" 64px; route `/bao-su-co/*` không render thanh điều hướng; OfficerLayout có sidebar |
| CT-030 | UI kit | BottomSheet có tay nắm, nút chính cố định đáy; Modal giữ focus, Esc đóng; Toast `role="status"`; Tabs hiện số đếm; Button icon-only bắt buộc `aria-label` (kiểu props) |
| CT-031 | StatusChip, DelayChip | Mỗi status render icon + chữ; công khai `moi` = "Chờ tiếp nhận"; DelayChip "Chậm 2 ngày" chỉ render khi `delayDays > 0` |
| CT-032 | ProgressBar, Timeline | ProgressBar: 4 mốc có nhãn, mốc hiện tại `aria-current="step"`, giờ dưới mốc đã qua. Timeline: mốc tương lai có class nhạt + "dự kiến dd/MM"; `da_gop` hiện băng ngoại lệ |
| CT-033 | StepHeader | Hiện "Bước 2/3 – Vị trí"; ✕ gọi `onCancel` |
| CT-034 | MapView | Marker có icon loại + nhãn `aria-label` "{loại} – {trạng thái}"; nút "Chú giải" mở bảng có chữ; attribution OSM; onTap trả lat/lng; tile lỗi → `onTileError` |
| CT-036 | PhoneOtpSheet | Có dòng "chỉ dùng để báo tin cho bạn…"; SĐT 9 số → lỗi; `0909000068` → OTP; sai → lỗi; `123456` → `onVerified`; nhãn "Mô phỏng" |
| CT-037 | BeforeAfter, CategoryTile, LocationRow, ReportCard, LatestUpdate | BeforeAfter không có ảnh sau → ô "Chưa có ảnh sau xử lý"; alt "Trước xử lý"/"Sau xử lý". CategoryTile `aria-pressed`, chọn bằng bàn phím, có ✓ khi chọn. LocationRow có nút "Đổi" khi truyền `onChange`. ReportCard hiện ảnh, loại, mã, StatusChip, câu cập nhật 1 dòng |
| CT-038 | NotificationBell | Số chưa đọc đúng; mở danh sách → đánh dấu đã đọc; SmsPreview có "Mô phỏng" |
| CT-039 | **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** TrackingLinkCard, SubscribeCard | Mã bí mật ≥ 28px, QR mã hoá đúng URL `?k=`; "Lưu link" gọi share hoặc toast "Đã sao chép link"; SubscribeCard → OTP → "Đang nhận tin qua 0909 *** 068 · Huỷ" |
| CT-039b | RatingSheet | Có "Chưa đến 30 giây"; 5 sao có nhãn chữ; chọn 5 sao → chip tích cực, chọn 2 sao → chip "Xử lý chậm"…; "Gửi đánh giá" tắt khi chưa chọn sao; trả `{rating, tags, comment}` |
| CT-040 | C01 | Thứ tự khối đúng AC-C01-1; không có hồ sơ trên máy → ẩn "Phản ánh của bạn"; có 2 hồ sơ → 2 thẻ trượt ngang có ProgressBar; "Quanh đây" đúng 3 mục kèm khoảng cách; dải "47/64" tính từ store và dẫn tới `/minh-bach` **[FR-08: chưa đăng nhập cũng ẩn khối 'Phản ánh của bạn']** |
| CT-042 | C02 | Ô chụp có `capture="environment"`, nút "Chọn ảnh có sẵn" không có `capture`; "Tiếp tục" tắt khi 0 ảnh; ảnh thứ 4 bị chặn kèm thông báo; ✕ khi có ảnh → hỏi lưu nháp |
| CT-043 | C03 | Ảnh đã chụp hiện phía trên; GPS trong phường → ghim + LocationRow có tên đường; GPS ngoài 5 km → banner 2 lựa chọn; denied → câu "Chưa lấy được vị trí…" + ô nhập gợi ý đường; nút "Đúng chỗ này rồi" |
| CT-044 | C04 xác nhận | "Gửi cho phường" tắt khi chưa chọn loại; không có lựa chọn mức ưu tiên; "Đổi" ở LocationRow về C03 giữ dữ liệu; link "Gửi không để lại số điện thoại" hiện dưới nút chính **[FR-08: bỏ mệnh đề 'link Gửi không để lại số điện thoại hiện dưới nút chính'; nút nay là 'Gửi phản ánh', thêm C04-CAT-001]** |
| CT-045 | C04 gửi có SĐT | Chưa SĐT → mở OTP; xong → màn thành công có mã `TB-0065`, đoạn "Tiếp theo…", nút "Theo dõi phản ánh"; offline → banner + "Thử lại", draft còn |
| CT-045b | **[Đã bỏ theo FR-08]** C04 ẩn danh | Sheet cảnh báo đúng câu chữ; "Gửi ẩn danh" → màn thành công có mã bí mật, QR, "Lưu link theo dõi", dòng nhắc, nút "Nhận tin báo…"; không mở OTP; lần thứ 6 trong ngày → sheet quota |
| CT-047 | C05 | Không đăng nhập vẫn thấy hồ sơ gửi từ máy này; tab có số đếm khớp dữ liệu; tab "Đã xử lý" chỉ còn bước 4; thẻ chỉ lưu trên máy có nút "Lưu link" + dòng cảnh báo đầu danh sách; tra cứu mã + mã bí mật đúng → mở hồ sơ, sai → lỗi; trống → EmptyState có "Báo sự cố" **[FR-08: câu 'Không đăng nhập vẫn thấy hồ sơ gửi từ máy này' không còn đúng với hồ sơ mới; xem C05-LOGIN-001]** |
| CT-048 | C06 | Thứ tự khối theo AC-C06-12; hồ sơ `da_giao` quá hạn → DelayChip + câu "chậm hơn dự kiến"; Trước/Sau luôn hiện, ô Sau trống khi chưa xong; `hoan_thanh` → Trước/Sau lên ngay dưới ảnh gốc + khối "Vấn đề đã được giải quyết chưa?"; "Chưa giải quyết" → "Đang xử lý lại"; người ngoài không thấy khu vực hành động; không có tên cá nhân cán bộ |
| CT-048b | **[Chỉ áp dụng hồ sơ ẩn danh cũ, FR-08]** C06 ẩn danh | `/phan-anh/TB-0066?k=<đúng>` ở thiết bị mới → có quyền chủ + thẻ "Nhận tin báo…"; `k` sai → dòng "Link theo dõi không đúng…"; mã bí mật ẩn mặc định, nút "Hiện" |
| CT-049a | C07 | Mặc định có vòng 1 km; "Toàn phường" bỏ vòng; chip lọc giảm số marker; chạm marker → thẻ nổi có "Xem →"; công tắc Danh sách sắp theo khoảng cách; thanh điều hướng + FAB vẫn hiện; không có SĐT trong DOM |
| CT-049b | C08 | KPI 64 / 47 (73,4%) / 17 / 3,2 ngày; biểu đồ 4 nhóm; 6 thẻ Trước → Sau có tên bộ phận; chú thích nguồn; không có SĐT trong DOM |
| CT-050 | A01 | Hai hồ sơ quá hạn lên đầu với chữ "Quá hạn"; tìm "TB-0012" lọc đúng; tab "Đã xử lý" = 47 hàng; lọc Nguồn "Ẩn danh" = 6 hàng có cờ "Ẩn danh" |
| CT-051 | A02 | Hồ sơ `moi` chỉ hiện nút hợp lệ; bộ phận và hạn điền sẵn đúng loại; "Yêu cầu bổ sung" với lý do 5 ký tự → nút tắt; SĐT dạng che; hồ sơ ẩn danh `moi` có gợi ý "nên giao TNV xác minh…" **[FR-08: 'SĐT dạng che' đổi thành SĐT đầy đủ + nút Gọi, xem A02-PHONE-001]** |
| CT-053 | A03 | Không ảnh → Xác nhận tắt + lý do; có ảnh + mô tả → xem trước Trước/Sau; xác nhận → `hoan_thanh` |
| CT-056 | Bàn phím A01 | Tab tới bảng, mũi tên chọn hàng, Enter mở panel, Esc đóng và trả focus |
| CT-060 | V01 | TNV "Lê Thảo Vy" thấy nhiệm vụ của mình + nhiệm vụ mở; nhãn "Xác minh ban đầu"/"Nghiệm thu sau xử lý"; tab "Đã xong" |
| CT-061 | V02 | Thiếu Câu 1 / mức độ / ảnh → Gửi tắt; đủ → gửi, về V01; không có nút đóng hồ sơ **[FR-08: V02 nay 3 bước và có SĐT có điều kiện, xem V02-PHONE-001]** |
| CT-072 | Reset / demoNow | Reset hỏi xác nhận; đổi demoNow sang 30/11 → số "Quá hạn" ở A01 tăng, DelayChip xuất hiện ở C05 |
| CT-073 | Nhảy bước | "Tới bước: Đang xử lý" đặt hồ sơ demo về `da_giao` kèm timeline hợp lệ |

---

## 4. End-to-end (E2E)

| ID | Kịch bản | Viewport | Kết quả mong đợi |
|---|---|---|---|
| E2E-00 | Mở lần lượt mọi route | cả hai | Mỗi route có tiêu đề đúng, không lỗi console |
| E2E-01 | Người dân gửi có SĐT: C01 FAB → C02 chụp → C03 (mock GPS trong phường) → "Đúng chỗ này rồi" → C04 chọn Mặt đường → OTP → thành công → "Theo dõi phản ánh" → C06; quay về C01 | mobile | Mã `TB-0065`; C06 bước 1 "Chờ tiếp nhận", câu cập nhật đúng 3.4c; C01 có thẻ "Phản ánh của bạn" TB-0065 |
| E2E-03 | Cán bộ xử lý trọn: A01 mở hồ sơ demo → Giao xử lý → A03 ảnh + mô tả → Hoàn thành | desktop | Hồ sơ `hoan_thanh`; người dân có thông báo "đã xử lý xong"; C06 có ảnh Sau |
| E2E-05 | Mở lại → nghiệm thu: người dân "Chưa giải quyết" → TNV V01 thấy nhiệm vụ nghiệm thu → V02 gửi → A02 thấy kết quả | mobile + desktop | Task `xong`; A02 hiện kết quả nghiệm thu |
| E2E-06 | Demo Hub: "Tiếp nhận" ở khung phải | desktop 1440 | Khung trái (C06 hồ sơ đó) đổi sang "Đã tiếp nhận" ≤ 1 giây |
| E2E-07 | **[Đã bỏ theo FR-08]** (phần gửi ẩn danh). Ẩn danh → nhận tin sau: khung trái gửi ẩn danh → lưu link → CB tiếp nhận → khung trái C05 thấy "Đã tiếp nhận" (không có SMS) → "Nhận tin báo…" + OTP → CB hoàn thành → khung trái có thông báo | Demo Hub | Hồ sơ giữ `anonymous` true; chỉ sau khi đăng ký mới có SMS mô phỏng |
| E2E-08 | Đánh giá: hồ sơ `hoan_thanh` của người dân → "Đã giải quyết" → 5 sao + 2 chip → Gửi | mobile | Hồ sơ `dong`; C08 cập nhật danh sách "Vừa xử lý xong" |

Mock GPS trong Playwright: `context.setGeolocation({ latitude: 10.9505, longitude: 106.8225 })` + `grantPermissions(['geolocation'])`.

---

## 5. Accessibility (A11Y)

| ID | Kiểm tra |
|---|---|
| A11Y-001 | axe-core: 0 vi phạm `serious`/`critical` trên mọi route |
| A11Y-002 | Tương phản: chữ ≥ 4.5:1, thành phần UI ≥ 3:1 (axe + kiểm tay bảng màu trạng thái và marker) |
| A11Y-003 | Phóng to 200% ở 360px: không mất nội dung, không cuộn ngang |
| A11Y-004 | Mọi trạng thái hiển thị có chữ (kiểm bằng chế độ grayscale) |
| A11Y-005 | Dashboard thao tác được hoàn toàn bằng bàn phím (CT-056) |
| A11Y-006 | `prefers-reduced-motion: reduce` → không còn animation chuyển màn |

---

## 6. Checklist thủ công

### MT-UI – Rà soát theo `ui-ux-guidelines.md` (T-081b)
- [ ] Mỗi màn mobile chỉ có 1 nút chính, nằm ở 1/3 dưới.
- [ ] Luồng gửi C02–C04 không có thanh điều hướng, luôn thấy ảnh vừa chụp ở C03–C04.
- [ ] Mọi hồ sơ trả lời được 3 câu: đang ở bước nào · ai lo · khi nào xong.
- [ ] Hồ sơ quá hạn hiện "Chậm {n} ngày" phía người dân; chữ "Quá hạn" chỉ ở phía cán bộ.
- [ ] Ô Sau trong Trước/Sau luôn hiện, kể cả khi chưa có ảnh.
- [ ] Không có chỗ nào cho người dân chọn mức ưu tiên.
- [ ] Mọi câu lỗi có cách khắc phục; không còn thuật ngữ nội bộ trên màn người dân.
- [ ] Không có màu, logo, minh hoạ sao chép từ mẫu tham khảo.

### MT-ST – Trạng thái phụ (T-080)
- [ ] GPS từ chối → nhập địa chỉ.
- [ ] Mất mạng khi gửi → lưu nháp, thử lại.
- [ ] Gửi thành công kèm mã (có SĐT / ẩn danh). **[FR-08: chỉ còn nhánh có SĐT]**
- [ ] Danh sách trống (C05, V01).
- [ ] Cần bổ sung / đã chuyển / không xác nhận (C06).
- [ ] Chưa giải quyết → mở lại.
- [ ] Quá hạn / sắp đến hạn (A01) và "Chậm n ngày" (C01, C05, C06, C07).
- [ ] Quota gửi ẩn danh; link theo dõi sai mã; đăng ký / huỷ nhận tin. **[FR-08: quota ẩn danh đã bỏ; link `?k=` sai mã và đăng ký/huỷ nhận tin chỉ cho hồ sơ ẩn danh cũ]**
- [ ] Bản đồ lỗi → danh sách (C07).

---

## 7. Ma trận thiết bị (MT-DEV)

| Thiết bị | Trình duyệt | GPS | Camera | Chia sẻ link | Mở từ Zalo |
|---|---|:---:|:---:|:---:|:---:|
| Android | Chrome | [ ] | [ ] | [ ] | [ ] |
| iPhone | Safari | [ ] | [ ] | [ ] | [ ] |
| MacBook | Chrome | [ ] | – | – | – |
| Laptop trình chiếu | Chrome, 1440px và 1280px | – | – | – | – |

---

## 8. Ghi chú về test cũ đã đổi

- Test trùng lặp (trước là UT-013) chuyển sang BT-B2-1; UT-013 nay là "Cập nhật mới nhất & chậm hạn".
- E2E-02 ("Tôi cũng gặp") và E2E-04 (gộp/tách) chuyển sang Backlog Bonus.
- CT-049c, CT-049d gộp vào CT-047 và CT-048b.
- **Spec v3.0 (FR-08):** các test về gửi ẩn danh được đánh dấu "Đã bỏ theo FR-08" tại chỗ (UT-016b mục 6, UT-021 mục 3 và 4, CT-045b, AUTHZ-013, AUTHZ-014, phần ẩn danh của E2E-07); các test về hồ sơ ẩn danh cũ ghi "Chỉ áp dụng hồ sơ ẩn danh cũ". Test mới ở mục 19.

---

## 9. Backlog Bonus – CHƯA VIẾT TEST

Chỉ viết khi mở task bonus tương ứng trong `tasks.md`. Danh sách kiểm tra dự kiến:

| ID | Bonus | Nội dung kiểm tra dự kiến |
|---|---|---|
| BT-B3-1 | B3 Chữ lớn | Bật → `<html class="senior">`, chữ thân ≥ 20px, nút ≥ 56px, ghi nhớ sau reload |
| MT-SR | B3 Chữ lớn | Checklist: 1 nút chính/màn, từ ngữ cột Chữ lớn, gửi không cần chạm bản đồ |
| BT-B2-1 | B2 Trùng | `findDuplicates`: cùng loại ≤ 50 m, ≤ 14 ngày, loại trừ trạng thái đóng/gộp/chuyển/không xác nhận; tối đa 3, sắp theo khoảng cách |
| BT-B2-2 | B2 Trùng | Hộp nghi trùng ở C04; "Tôi cũng gặp" có SĐT/ẩn danh không tạo hồ sơ mới; followerCount ≥ 3 → ưu tiên cao **[FR-08: 'Tôi cũng gặp' ẩn danh đã bỏ; xem FOLLOW-001 → 004]** |
| BT-B2-3 | B2 Trùng | Gộp: hồ sơ phụ `da_gop`, followers hợp nhất, thông báo; tách khôi phục trạng thái cũ |
| BT-E2E-02 | B2 Trùng | Luồng "Tôi cũng gặp" đầu–cuối **[FR-08: 'Tôi cũng gặp' nay thuộc lõi, đăng nhập bắt buộc]** |
| BT-E2E-04 | B2 Trùng | Gộp rồi tách cụm trùng 1 |
| BT-B1-1 | B1 AI | Ảnh có trong manifest → gợi ý + nhãn "Mô phỏng"; ảnh lạ → không chọn sẵn |
| BT-B4-1 | B4 Giọng nói | Không hỗ trợ → không có nút micro; có → chèn chữ vào ô mô tả |
| BT-B5-1 | B5 Gửi hộ | Modal tạo hộ: thiếu SĐT không lưu; lưu → `onBehalf`, `da_tiep_nhan`, SMS mô phỏng có mã |
| UX-001 → 004 | Thử nghiệm người dùng | Báo ổ gà; xem trạng thái; báo chưa giải quyết; gửi ẩn danh rồi tìm lại **[FR-08: bỏ tình huống 'gửi ẩn danh rồi tìm lại']** |

---

# GIAI ĐOẠN 2 – KẾ HOẠCH KIỂM THỬ BACKEND, DATABASE VÀ TÍCH HỢP

Áp dụng cho sản phẩm hoàn chỉnh Client-Server với Supabase (PostgreSQL 15+, PostGIS, Auth, Storage) và Vercel Functions (Hono TypeScript).

## 10. Hợp đồng API (API-*)

Kiểm thử toàn bộ endpoints: thành công (200/201) và các mã lỗi chuẩn (400, 401, 403, 404, 409, 422, 429).

| ID | Endpoint | Tình huống | Kết quả mong đợi |
|---|---|---|---|
| API-001 | Mọi endpoint | Request bất kỳ | Header `X-Request-Id` luôn có trong phản hồi |
| API-002 | Mọi endpoint | Lỗi nghiệp vụ / hệ thống | Cấu trúc `{ error: { code, message, details? } }` |
| API-PUB-001 | `GET /public/reports` | Xem danh sách phản ánh công khai | 200, danh sách lọc và phân trang đúng, không lộ thông tin cá nhân |
| API-PUB-002 | `GET /public/reports/:code` | Xem chi tiết 1 hồ sơ | 200, thông tin công khai, 4 bước tiến trình |
| API-PUB-003 | `GET /public/kpi` | Lấy KPI tháng 11/2026 | 200, tính từ bảng `reports`: 64 tổng, 47 đã xử lý, 3,2 ngày |
| API-PUB-004 | `GET /public/config` | Lấy cấu hình phường | 200, tâm và ranh giới Trấn Biên, cờ `otpMock: true` |
| API-PUB-005 | `GET /public/recent-results` | Danh sách vừa xử lý xong | 200, tối đa 6 hồ sơ có ảnh trước/sau |
| API-CIT-001 | `POST /citizen/otp/request` | Xin OTP với SĐT hợp lệ | 200, cờ mock: true |
| API-CIT-002 | `POST /citizen/otp/request` | Xin OTP quá 5 lần/giờ | 429 `TOO_MANY_REQUESTS` |
| API-CIT-003 | `POST /citizen/otp/verify` | Nhập mã OTP đúng `123456` | 200, cấp JWT người dân hạn 30 ngày |
| API-CIT-004 | `POST /citizen/otp/verify` | Nhập sai OTP 5 lần | 429 hoặc 400 khoá mã |
| API-CIT-005 | `POST /citizen/reports` | Gửi hồ sơ có SĐT hoặc ẩn danh | 201, trả `{code, secretCode, ownerToken}` **[FR-08: ẩn danh đã bỏ; xem AUTH-CIT-001, AUTH-CIT-002; không còn trả secretCode/ownerToken cho hồ sơ mới]** |
| API-CIT-006 | `POST /citizen/reports` | Dữ liệu thiếu loại hoặc vị trí | 422 `UNPROCESSABLE_ENTITY` kèm details |
| API-CIT-007 | `POST /citizen/reports/lookup` | Tra cứu bằng mã + 4 số cuối SĐT | 200, trả `ownerToken` mới **[FR-08: chỉ hồ sơ ẩn danh cũ]** |
| API-CIT-008 | `POST /citizen/reports/:code/claim` | Mở link `?k=` với mã bí mật | 200, trả `ownerToken` **[FR-08: chỉ hồ sơ ẩn danh cũ]** |
| API-CIT-009 | `GET /citizen/reports/:code/owner` | Chủ hồ sơ xem chi tiết | 200, thấy `secretCode` và SĐT đã che **[FR-08: secretCode chỉ có với hồ sơ ẩn danh cũ; SĐT của chính người gọi]** |
| API-CIT-010 | `POST /citizen/reports/:code/feedback` | Đánh giá kết quả (hài lòng/chưa giải quyết) | 200, đổi trạng thái sang `dong` hoặc `mo_lai` |
| API-OFF-001 | `GET /officer/reports` | Cán bộ xem hộp thư tiếp nhận A01 | 200, danh sách đầy đủ, SĐT che `0909 *** 068` **[FR-08: đổi thành SĐT đầy đủ, xem PHONE-002]** |
| API-OFF-002 | `GET /officer/reports/:code` | Cán bộ xem chi tiết A02 | 200, lịch sử timeline, kết quả xác minh |
| API-OFF-003 | `GET /officer/kpi` | KPI cán bộ (quá hạn, sắp đến hạn) | 200, số liệu tính toán động |
| API-OFF-004 | `POST /officer/reports/:code/accept` | Tiếp nhận hồ sơ `moi` → `da_tiep_nhan` | 200, ghi timeline cán bộ tiếp nhận |
| API-OFF-005 | `POST /officer/reports/:code/assign-volunteer` | Giao TNV xác minh | 200, tạo task `xac_minh`, trạng thái `cho_xac_minh` |
| API-OFF-006 | `POST /officer/reports/:code/assign-dept` | Giao bộ phận xử lý | 200, trạng thái `da_giao` |
| API-OFF-007 | `POST /officer/reports/:code/complete` | Cập nhật kết quả kèm ảnh sau | 200, trạng thái `hoan_thanh` |
| API-OFF-008 | `POST /officer/reports/:code/complete` | Thiếu ảnh sau hoặc mô tả < 10 ký tự | 422 `UNPROCESSABLE_ENTITY` |
| API-OFF-009 | `POST /officer/reports/:code/close` | Đóng hồ sơ kèm lý do | 200, trạng thái `dong` |
| API-OFF-010 | `POST /officer/reports/:code/merge` | Gộp hồ sơ phụ vào hồ sơ chính | 200, hồ sơ phụ chuyển `da_gop` |
| API-OFF-011 | `POST /officer/reports/:code/split` | Tách hồ sơ đã gộp | 200, khôi phục `status_before_merge` |
| API-OFF-012 | `POST /officer/reports` | Cán bộ tạo phản ánh hộ dân | 201, cờ `on_behalf=true`, `da_tiep_nhan` |
| API-VOL-001 | `GET /volunteer/tasks` | TNV xem nhiệm vụ theo GPS | 200, sắp theo khoảng cách tăng dần |
| API-VOL-002 | `GET /volunteer/tasks/:code` | Chi tiết nhiệm vụ TNV V02 | 200, không chứa SĐT hay mã bí mật của dân **[FR-08: có `reporterPhone` khi giao cho chính TNV và chưa xong, xem PHONE-004]** |
| API-VOL-003 | `POST /volunteer/tasks/:code/claim` | TNV nhận nhiệm vụ mở | 200, khoá dòng gán cho TNV này |
| API-VOL-004 | `POST /volunteer/tasks/:code/result` | Nộp kết quả xác minh 3 câu + ảnh | 200, task `xong`, kích hoạt transition 3.3 |

---

## 11. Phân quyền và Bảo mật (AUTHZ-*, LEAK-*)

Sinh trực tiếp từ ma trận phân quyền mục 13.5:

| ID | Mô tả case kiểm thử | Kết quả mong đợi |
|---|---|---|
| AUTHZ-001 | Không có token gọi endpoint yêu cầu cán bộ (`/officer/*`) | 401 `UNAUTHORIZED` |
| AUTHZ-002 | Token TNV gọi endpoint cán bộ (`/officer/reports`) | 403 `FORBIDDEN` |
| AUTHZ-003 | Token Cán bộ gọi endpoint nhận việc của TNV (`claim`) | 403 `FORBIDDEN` |
| AUTHZ-004 | Người dân gọi endpoint của cán bộ hoặc TNV | 403 `FORBIDDEN` |
| AUTHZ-005 | Người dân A gọi `/citizen/reports/:code/owner` của người B | 404 `NOT_FOUND` |
| AUTHZ-006 | Tài khoản bị vô hiệu hoá (`is_active=false`) gọi API | 403 `ACCOUNT_DISABLED` |
| AUTHZ-007 | Token hết hạn gọi API | 401 `TOKEN_EXPIRED` |
| AUTHZ-008 | Token bị sai chữ ký hoặc giải mã lỗi | 401 `INVALID_TOKEN` |
| AUTHZ-009 | Người không phải chủ sở hữu gửi đánh giá feedback | 403 `FORBIDDEN` hoặc 404 |
| AUTHZ-010 | TNV gọi API đóng hồ sơ của cán bộ | 403 `FORBIDDEN` |
| AUTHZ-011 | Thử dò mã bí mật sai quá 5 lần / 15 phút từ 1 IP | 429 `TOO_MANY_ATTEMPTS` |
| AUTHZ-012 | Thử dò mã bí mật sai quá 30 lần / 24 giờ trên 1 hồ sơ | Khoá claim/lookup hồ sơ đó 24h (429) |
| AUTHZ-013 | Gửi ẩn danh quá 5 hồ sơ / ngày / thiết bị | 429 `QUOTA_EXCEEDED` **[Đã bỏ theo FR-08]** |
| AUTHZ-014 | Gửi ẩn danh quá 20 hồ sơ / ngày / IP | 429 `QUOTA_EXCEEDED` **[Đã bỏ theo FR-08]** |
| AUTHZ-015 | Đổi vai trò trong DB có hiệu lực ngay request kế tiếp | Quyền mới được áp dụng không cần cấp token mới |
| LEAK-001 | Quét response `/public/*` và `/volunteer/*` tìm SĐT dạng `0\d{9}` | 0 kết quả (SĐT luôn che mặt nạ hoặc null) **[FR-08: `/volunteer/tasks` (danh sách) vẫn 0 kết quả; `/volunteer/tasks/:code` theo PHONE-004]** |
| LEAK-002 | Quét response công khai tìm `secretCode`, `ownerToken`, chuỗi hash | 0 kết quả (hoàn toàn bị loại bỏ bởi serializer) |
| LEAK-003 | Quét toàn bộ server console log tìm chuỗi nhạy cảm | 0 kết quả rò rỉ token, password, secretCode |

---

## 12. Bất biến Cơ sở dữ liệu (DB-*)

Kiểm tra trực tiếp trên PostgreSQL + PostGIS thật bằng `npm run db:verify`:

| ID | Tiêu chí bất biến | Kết quả mong đợi |
|---|---|---|
| DB-001 | Định nghĩa bảng và quan hệ | Đủ 16 bảng, quan hệ khoá ngoại toàn vẹn |
| DB-002 | PostGIS không gian | `postgis_version()` có giá trị; cột `reports.location` là `geography(Point,4326)`; index GiST hoạt động (`db:verify` DV-017) |
| DB-003 | Bất biến timeline | Trigger chặn UPDATE/DELETE trên `report_timeline` |
| DB-004 | RLS kích hoạt toàn bảng | Không thể đọc/ghi bằng Supabase anon key trực tiếp |
| DB-005 | CHECK ràng buộc | `anonymous=true` ⇒ `reporter_phone IS NULL`; `hoan_thanh/dong` ⇒ `completed_at NOT NULL` |
| DB-006 | Tính Idempotent của seed | Chạy `npm run db:seed` 2 lần liên tiếp không làm nhân đôi dữ liệu |
| DB-007 | Tổng số hồ sơ tháng 11/2026 | Đúng 64 hồ sơ (`code <= TB-0064` hoặc `is_seed=true`) |
| DB-008 | Phân bổ danh mục | 18 Đèn đường, 15 Ngập nước, 21 Rác thải, 10 Mặt đường |
| DB-009 | Hồ sơ đã xử lý | Đúng 47 hồ sơ (40 `dong` + 7 `hoan_thanh`) |
| DB-010 | Hồ sơ chưa hoàn tất | Đúng 17 hồ sơ (1 `moi`, 4 `da_tiep_nhan`, 2 `cho_xac_minh`, 5 `da_giao`, 1 `can_bo_sung`, 1 `da_gop`, 1 `chuyen_co_quan_khac`, 1 `khong_xac_nhan`, 1 `mo_lai`) |
| DB-011 | Thời gian xử lý trung bình | Đúng 3,2 ngày cho 47 hồ sơ (sai số ≤ 0,005) |
| DB-012 | Hồ sơ ẩn danh | Đúng 6 hồ sơ ẩn danh, trong đó 1 hồ sơ đã đăng ký nhận tin sau |
| DB-013 | Cụm phản ánh nghi trùng | Đúng 2 cụm nghi trùng được gắn cờ |
| DB-014 | Băm mã bí mật | Mọi hồ sơ có `secret_code_hash` (không lưu mã thô) |
| DB-015 | Tiến trình timeline | Mọi hồ sơ có timeline đầy đủ các bước theo bảng chuyển trạng thái 3.3 |
| DB-016 | Giờ hành chính | Mọi mục timeline do cán bộ/bộ phận ghi rơi vào 07:00–17:30 |
| DB-017 | PostGIS thật | `npm run db:verify` báo 17/17 ĐẠT, gồm DV-017 (không còn lớp giả `cube/earthdistance`) |
| PG-001…005 | Tìm trùng bằng `ST_DWithin` | `tests/api/postgis-dwithin.test.ts`: 30 m thì trùng, 80 m thì không; loại khác, quá 14 ngày, đã đóng thì không; kết quả khớp `domain/duplicates.ts` trên 64 hồ sơ mẫu |

---

## 13. Đồng thời & Idempotency (CONC-*, IDEM-*)

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| CONC-001 | Hai cán bộ cùng gọi tiếp nhận một hồ sơ đồng thời | Chỉ 1 request thành công, 1 request nhận 409, timeline có đúng 1 bản ghi |
| CONC-002 | Hai TNV cùng nhấn nhận một nhiệm vụ mở đồng thời | Chỉ 1 TNV nhận được (khoá dòng FOR UPDATE), bên kia nhận thông báo đã được nhận |
| IDEM-001 | Client gửi lặp lại 2 request tạo hồ sơ với cùng `Idempotency-Key` | Chỉ tạo 1 hồ sơ duy nhất trong DB, 2 request trả về cùng mã hồ sơ |

---

## 14. Ảnh hiện trường, Vận hành và Cron (PHOTO-*, OPS-*, CRON-*, LOGIN-*)

| ID | Nhóm | Kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| PHOTO-001 | Ảnh | `POST /uploads/sign` với payload hợp lệ | 200, trả signed URL PUT lên bucket riêng tư |
| PHOTO-002 | Ảnh | Upload bằng chữ ký hết hạn | 403 `FORBIDDEN` |
| PHOTO-003 | Ảnh | Gắn file giả mạo đuôi ảnh (.exe đổi thành .jpg) | 422 `UNPROCESSABLE_ENTITY` (kiểm tra magic bytes thất bại) |
| PHOTO-004 | Ảnh | Người ngoài đoán đường dẫn ảnh hiện trường trong bucket | 403/404 (bucket riêng tư, URL ký 1 giờ) |
| OPS-001 | Scripts | `npm run staff:create` tạo tài khoản nhân viên | Tạo thành công Auth user + profile, in mật khẩu 1 lần |
| OPS-002 | Scripts | `npm run staff:disable` khoá tài khoản | `is_active=false`, API từ chối ngay lập tức |
| OPS-003 | Scripts | `npm run staff:reset-password` cấp mật khẩu mới | Đặt lại mật khẩu thành công |
| OPS-004 | Scripts | `npm run config:set-sla` đổi hạn xử lý | Cập nhật cấu hình bảng `category_settings` |
| OPS-005 | Scripts | `npm run demo:reset` khi `DEMO_MODE=false` | Bị từ chối thực thi với thông báo lỗi |
| CRON-001 | Cron | Gọi `/cron/daily` không có `CRON_SECRET` | 401 `UNAUTHORIZED` |
| CRON-002 | Cron | Chạy cron tự đóng hồ sơ `hoan_thanh` quá 7 ngày | Chuyển thành công sang `dong`, timeline "Tự đóng sau 7 ngày" |
| CRON-003 | Cron | Chạy cron dọn ảnh `pending_uploads` quá 24h | File rác chưa gắn hồ sơ bị xoá sạch |
| CRON-004 | Cron | Chạy cron dọn OTP và access_attempts hết hạn | Bản ghi quá hạn bị xoá khỏi database |
| LOGIN-001 | Đăng nhập | Màn hình `/dang-nhap` ở mobile (<768px) và desktop (≥1024px) | Bố cục responsive chuẩn: desktop cho CB, mobile cho TNV |
| LOGIN-002 | Đăng nhập | Cán bộ đăng nhập đúng email/mật khẩu | Chuyển hướng tự động tới `/can-bo` |
| LOGIN-003 | Đăng nhập | TNV đăng nhập đúng email/mật khẩu | Chuyển hướng tự động tới `/tnv` |
| LOGIN-004 | Đăng nhập | Đăng nhập sai mật khẩu | Báo lỗi tiếng Việt: "Email hoặc mật khẩu không chính xác" |
| LOGIN-005 | Đăng nhập | Tài khoản bị khoá đăng nhập | Báo lỗi tài khoản bị tạm khoá (403) |
| LOGIN-006 | Đăng nhập | Đăng xuất | Xoá phiên Supabase Auth, chuyển hướng về `/dang-nhap` |

---

## 15. Tích hợp Hai chế độ (E2E-*-local, E2E-*-api, INT-*)

| ID | Luồng nghiệp vụ | Chế độ | Kết quả mong đợi |
|---|---|:---:|---|
| E2E-01-local | Người dân gửi phản ánh (có SĐT) | `local` | Tạo hồ sơ thành công, lưu localStorage |
| E2E-01-api | Người dân gửi phản ánh (có SĐT) | `api` | Tạo hồ sơ thành công trong PostgreSQL, ảnh lưu Storage |
| E2E-03-local | Cán bộ tiếp nhận và giao xử lý | `local` | Đổi trạng thái `da_giao`, lưu store |
| E2E-03-api | Cán bộ tiếp nhận và giao xử lý | `api` | Đổi trạng thái qua API, cập nhật DB giao dịch |
| E2E-05-local | TNV xác minh tại chỗ | `local` | Nộp kết quả 3 câu, cập nhật store |
| E2E-05-api | TNV xác minh tại chỗ | `api` | Nộp kết quả qua API, ghi DB và timeline |
| E2E-07-local | Trọn vẹn vòng đời phản ánh | `local` | Chạy xuyên suốt từ gửi → đóng/đánh giá |
| E2E-07-api | Trọn vẹn vòng đời phản ánh | `api` | Chạy xuyên suốt qua API và cơ sở dữ liệu thật |
| INT-001 | Đối chiếu dữ liệu UI ↔ API ↔ DB | `api` | Mọi trường hiển thị trên UI khớp 100% với response API và bản ghi DB |
| INT-002 | Đối chiếu KPI | `api` | Số liệu KPI trên C01, C08, A01 khớp đúng với truy vấn SQL và API `/public/kpi` |
| INT-003 | Thử nghiệm mất mạng (ngắt API) | `api` | UI hiển thị thông báo lỗi mạng tiếng Việt kèm nút "Thử lại", không crash |

---

## 16. Checklist Kiểm tra UI Giai đoạn 2 (UI-G2-*)

- [ ] **UI-G2-01**: Nhãn "Mô phỏng" hiển thị rõ ràng tại: ô nhập OTP, xem trước tin nhắn SMS/Zalo, gợi ý phân loại AI.
- [ ] **UI-G2-02**: Không hiển thị số điện thoại ở bất kỳ màn hình công khai nào (C01, C06 người ngoài, C07, C08). SĐT đầy đủ chỉ ở A01, A02 (cán bộ) và V02 (TNV, nhiệm vụ của chính mình và chưa xong); hồ sơ ẩn danh cũ hiện nhãn Ẩn danh. *(Đã sửa theo FR-08/D7; trước đây ghi chỉ hiện `0909 *** 068`.)*
- [ ] **UI-G2-03**: Nút "Đổi vai trò" ở thanh điều hướng tự động ẩn khi chạy ở chế độ `VITE_DATA_SOURCE=api`.
- [ ] **UI-G2-04**: Màn hình `/dang-nhap` không bị tràn ngang ở 360px, hiển thị đầy đủ nhãn và form nhập.
- [ ] **UI-G2-05**: Khi truy cập trái quyền, hiển thị trang `/khong-co-quyen` thân thiện có nút quay về.
- [ ] **UI-G2-06**: Nút bấm đang gửi yêu cầu hiển thị spinner hoặc trạng thái đang xử lý, ngăn bấm liên tiếp.
- [ ] **UI-G2-07**: Chế độ chữ lớn (Senior Mode) hoạt động mượt mà ở cả 2 chế độ `local` và `api`.


---

## 15. Kiểm thử BE bổ sung (đăng nhập, TNV, cán bộ) – chạy trên Supabase local

Các test này gọi `app.request` trên DB PostGIS thật và Supabase Auth thật (`npm run test`).

| ID | File | Kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| LOGIN-001…002 | `tests/api/staff-login.test.ts` | Đăng nhập đúng email + mật khẩu (cán bộ, TNV) | 200, vai trò lấy từ `staff_profiles`, token dùng được; TNV vào `/officer` bị 403 |
| LOGIN-003…004 | `staff-login.test.ts` | Sai mật khẩu; thiếu hoặc rỗng mật khẩu; body không phải JSON | 401 `INVALID_CREDENTIALS`, thông báo chung, không cấp token (thiếu mật khẩu cũng 401, không phải 400) |
| LOGIN-005…006 | `staff-login.test.ts` | Email không tồn tại; tài khoản người dân đúng mật khẩu nhưng không phải nhân viên | 401, cùng mã và cùng thông báo với sai mật khẩu (không lộ email nào tồn tại) |
| LOGIN-007 | `staff-login.test.ts` | Cách đăng nhập cũ: chỉ `role`, chuỗi con `can_bo`/`cb.`/`minh`, không mật khẩu | 401, không cấp token |
| LOGIN-008 | `staff-login.test.ts` | Tài khoản bị khoá, mật khẩu đúng | 403 `ACCOUNT_DISABLED` |
| VOL-000…001 | `tests/api/volunteer-flow.test.ts` | Danh sách, chi tiết, kết quả nhiệm vụ của TNV | Không có SĐT, `secretCode`, `ownerToken` (có test kiểm chứng hàm dò rò rỉ) **[FR-08: chi tiết nhiệm vụ có SĐT có điều kiện, xem PHONE-004]** |
| VOL-002…003 | `volunteer-flow.test.ts` | Cán bộ/người dân nhận hoặc nộp nhiệm vụ TNV; TNV nộp thay TNV khác | 403 (AUTHZ-003, AUTHZ-004), nhiệm vụ không đổi |
| VOL-004 | `volunteer-flow.test.ts` | Thiếu ảnh, thiếu mức độ khi "Có", giá trị lạ | 400, nhiệm vụ vẫn `dang_lam` |
| VOL-005 | `volunteer-flow.test.ts` | Giao TNV → TNV báo "Có" | Hồ sơ `cho_xac_minh` → `da_tiep_nhan` qua `transition.ts`, version +1, timeline có `actor_staff_id` của TNV; nộp lần hai → 409 |
| VOL-006…007 | `volunteer-flow.test.ts` | TNV báo "Không có"; nhiệm vụ nghiệm thu | Chỉ ghi kết quả; cán bộ xác nhận `khong_xac_nhan` hoặc đóng `mo_lai` → `dong` (Spec 3.3) |
| OFF-001…002 | `tests/api/officer-flow.test.ts` | Tiếp nhận; hai yêu cầu đồng thời cùng version | Bộ phận + hạn mặc định; đúng 1 thành công, 1 `409`, timeline đúng 1 mục |
| OFF-003…005 | `officer-flow.test.ts` | Chuyển sai ma trận; hoàn thành thiếu ảnh/mô tả; cán bộ đóng `hoan_thanh` | 409 `TRANSITION_NOT_ALLOWED` / 400 / 409, hồ sơ không đổi |
| OFF-006 | `officer-flow.test.ts` | Gộp rồi tách | Khôi phục đúng trạng thái trước khi gộp qua `transition.ts` |
| OFF-007…008 | `officer-flow.test.ts` | Tạo hồ sơ hộ | Mã bí mật 4 số ngẫu nhiên (crypto), chỉ lưu hash, trả một lần, không còn `0000`; đầu vào sai → 400 |
| OFF-009 | `officer-flow.test.ts` | Người dân/không token/TNV gọi endpoint cán bộ | 403 / 401 / 403 |
| OFF-010 | `officer-flow.test.ts` | Cron | Chỉ nhận `Authorization: Bearer <CRON_SECRET>`; header cũ `X-Cron-Secret` bị 401 |
| PG-001…005 | `tests/api/postgis-dwithin.test.ts` | Tìm trùng bằng `ST_DWithin` | Xem mục 12 |

## 17. Trang quản trị (ADMIN-*)

| ID | File | Kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| ADMIN-API-001 | `tests/api/admin.test.ts` | Không token gọi `/admin/overview` | 401 `UNAUTHORIZED` |
| ADMIN-API-002 | `admin.test.ts` | Token cán bộ hoặc TNV gọi `/admin/overview` | 403 `FORBIDDEN` |
| ADMIN-API-003 | `admin.test.ts` | Admin đang hoạt động gọi `/admin/overview` | 200, overview có đủ các chỉ số và nhóm thống kê |
| ADMIN-API-004 | `admin.test.ts` | Admin gọi `/officer/*` và `/volunteer/*` | 403; dữ liệu nghiệp vụ không đổi |
| ADMIN-SVC-001 | `tests/api/admin-staff.test.ts` | Tạo tài khoản với email đã tồn tại | 409; không thêm Auth user/profile |
| ADMIN-SVC-002 | `admin-staff.test.ts` | Lỗi ghi profile hoặc audit khi tạo tài khoản | Auth user được hoàn tác; profile và audit không để lại bản ghi dở dang |
| ADMIN-SVC-003 | `admin-staff.test.ts` | Khoá/hạ quyền cán bộ cuối cùng đang hoạt động | 409; trạng thái tài khoản không đổi |
| ADMIN-SVC-004 | `admin-staff.test.ts` | Admin tự khoá hoặc tự hạ quyền | 409; tài khoản hiện tại vẫn admin và hoạt động |
| ADMIN-SVC-005 | `admin-staff.test.ts` | Mỗi thao tác ghi tài khoản/bộ phận/cấu hình | Có audit log đúng actor, action, target; rollback cùng transaction khi lỗi |
| ADMIN-API-005 | `tests/api/admin-config.test.ts` | SLA ngoài 1–30 hoặc department không tồn tại | 422; không cập nhật cấu hình |
| ADMIN-API-006 | `admin-config.test.ts` | Vô hiệu hoá bộ phận đang được hồ sơ tham chiếu | 200, bộ phận vẫn tồn tại và hồ sơ cũ không đổi |
| ADMIN-API-007 | `tests/api/admin-overview.test.ts` | Thay đổi seed DB rồi truy vấn overview | Các KPI, số liệu loại/bộ phận/vai trò được tính đúng từ DB |
| ADMIN-API-008 | `tests/api/admin-audit.test.ts` | Lọc nhật ký theo actor/action, phân trang | Thứ tự mới nhất trước, lọc và metadata trang đúng |
| ADMIN-LEAK-001 | `tests/api/admin-privacy.test.ts` | Quét mọi response `/admin/*` theo regex `0\d{9}` và từ khoá nhạy cảm | Không có SĐT, `secretCode`, `ownerToken`, hash mật khẩu hoặc service secret |
| ADMIN-DB-001 | migration/schema tests | Chạy migration mới trên schema hiện tại | Thêm enum `admin` và bảng audit; không thay đổi/xoá schema hoặc migration cũ |
| ADMIN-DB-002 | database policy test | Đọc `admin_audit_log` bằng anon/authenticated | Bị từ chối, không có policy đọc/ghi công khai |
| ADMIN-UI-001 | component tests | Admin truy cập 5 route quản trị; local mode | API mode hiển thị đúng màn; local mode báo “Cần chế độ API” |
| ADMIN-E2E-001 | `tests/e2e/admin.spec.ts` | Đăng nhập admin → tạo TNV → khoá → thử đăng nhập TNV → mở khoá → đổi SLA đèn đường | Các thao tác thành công; trong lúc khoá login báo “tài khoản bị tạm khoá” |
| ADMIN-UI-002 | kiểm tra thủ công / screenshot | Dashboard, danh sách và modal tài khoản, cấu hình, nhật ký tại 1440px; danh sách tại 390px | Không tràn ngang; bảng desktop đầy đủ; mobile hiển thị card; ảnh lưu ở `docs/review/admin/` |

---

## 18. Kiểm thử AI Gợi ý Loại Sự cố (B1 - DeepSeek Vision)

### 18.1. Unit tests (`tests/unit/ai-suggester.test.ts`)
- **AI-UNIT-001**: Parse câu trả lời JSON có văn bản thừa trước/sau (ví dụ markdown code block ```json ... ``` hoặc lời chào) trích xuất đúng category, confidence, reason.
- **AI-UNIT-002**: Model trả category lạ / ngoài 4 loại hoặc "khong_ro" → chuẩn hoá về `category: null`.
- **AI-UNIT-003**: Confidence ngoài khoảng 0..1 (ví dụ <0 hoặc >1 hoặc NaN) → chuẩn hoá về null/0.
- **AI-UNIT-004**: Timeout (AbortController) sau 8s → trả `{ category: null, reason: 'Quá thời gian phản hồi...' }`, không throw exception.
- **AI-UNIT-005**: Lỗi HTTP (400, 401, 429, 500) hoặc refusal do kiểm duyệt nội dung → trả `{ category: null, reason: '...' }`, không ném 500.

### 18.2. API integration tests (`tests/api/ai-suggest.test.ts`)
- **AI-API-001**: Gửi ảnh > 1.5 MB → 422 `INVALID_IMAGE`.
- **AI-API-002**: Sai magic bytes (không phải JPEG, PNG, WebP) → 422 `INVALID_IMAGE`.
- **AI-API-003**: Rate limit 10 lượt / 10 phút / IP-thiết bị → lần thứ 11 trả 429 `TOO_MANY_ATTEMPTS`.
- **AI-API-004**: Hạn ngạch toàn hệ thống `AI_DAILY_LIMIT` vượt quá → trả `{ category: null, reason: 'Tạm hết lượt gợi ý hôm nay' }` mà không gọi fetch DeepSeek.
- **AI-API-005**: Khi cấu hình `AI_PROVIDER=mock` → dùng MockSuggester phân tích ảnh demo/path, không gọi DeepSeek API.
- **AI-API-006**: Phản hồi API không chứa API key, raw prompt hay raw response từ model.

### 18.3. Frontend tests (`tests/component/ai-suggestion.test.tsx`)
- **AI-FE-001**: Màn hình C04 hiển thị băng "Đang phân tích ảnh..." khi vừa nạp ảnh, sau đó hiện "AI gợi ý: <Tên> - <Lý do>" khi confidence ≥ 0.5.
- **AI-FE-002**: Bấm nút "Dùng gợi ý" chọn đúng loại CategoryTile tương ứng; người dùng không bấm thì không tự ý chọn thay.
- **AI-FE-003**: Bỏ hoàn toàn số giả "(94%)". Nhãn hiển thị chính xác theo provider: "Gợi ý bởi AI – vui lòng kiểm tra lại" (`deepseek`) hoặc "Gợi ý mô phỏng" (`mock`).
- **AI-FE-004**: Lỗi AI hoặc confidence < 0.5 hiển thị "Không nhận ra loại sự cố, bạn chọn giúp nhé" và không chặn nút gửi phản ánh.
- **AI-FE-005**: Dưới ô ảnh hiển thị cam kết quyền riêng tư: "Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố".
- **AI-FE-006**: Màn hình A02 hiển thị dòng thông tin nếu hồ sơ có trường `aiSuggestion`.

---

## 19. Kiểm thử luồng FR-08 (spec v3.0)

Áp dụng `spec.md` v3.0: gửi phản ánh bắt buộc đăng nhập SĐT (D1), quyền chủ hồ sơ theo SĐT (D3), "Tôi cũng gặp" một lần cho mỗi SĐT (D4), phạm vi hiển thị SĐT (D7), không chọn sẵn loại sự cố (D8). Theo AGENTS.md: viết test trước, xác nhận test fail, rồi mới code (các task tương ứng ở `tasks.md` nhóm "Spec v3.0 – FR-08").

**Lưu ý trùng ID.** `AUTH-CIT-001…004` trước đây chỉ được nhắc ở task G2-05b (OTP, JWT người dân) và chưa có file test; từ v3.0 `AUTH-CIT-001`, `AUTH-CIT-002` là hai case ở 19.1. Phần OTP/JWT dùng `API-CIT-001…004` (mục 10). `OWNER-001…005` đã có trong `tests/api/citizen-owner.test.ts`: `OWNER-001`, `OWNER-002` ở 19.2 **mở rộng** hai case cũ (xem cột "Ghi chú với test hiện có"), `OWNER-003…005` giữ nguyên.

### 19.1. Gửi phản ánh bắt buộc đăng nhập (D1) – `tests/api/auth-citizen.test.ts`

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| AUTH-CIT-001 | `POST /api/v1/citizen/reports` với body hợp lệ, **không có token người dân** (kể cả khi có `X-Device-Id`, hoặc body có `anonymous: true`) | 401, `error.code = 'CITIZEN_LOGIN_REQUIRED'`, `message = "Vui lòng đăng nhập số điện thoại để gửi phản ánh"`; số dòng `reports` không đổi; không sinh `notifications`; có header `X-Request-Id` |
| AUTH-CIT-002 | Cùng body, **có token người dân** (sau `otp/verify` với `123456`) | 201, trả `{code}` dạng `TB-\d{4}`; bản ghi DB có `anonymous = false` và `reporter_phone` = đúng SĐT trong token; SĐT đó nằm trong `report_followers` (nguồn `reporter`); phản hồi không có `secretCode`, `ownerToken`; gửi lại cùng `Idempotency-Key` vẫn một hồ sơ (AC-API-6) |

### 19.2. Quyền chủ hồ sơ (D3) – `tests/api/citizen-owner.test.ts`

| ID | Tình huống | Kết quả mong đợi | Ghi chú với test hiện có |
|---|---|---|---|
| OWNER-001 | Hồ sơ `hoan_thanh`. Người dân B đã bấm "Tôi cũng gặp" (SĐT B ≠ `reporter_phone`) gọi `POST /citizen/reports/:code/feedback`. Lặp lại với `…/supplement` trên hồ sơ `can_bo_sung` | 403 `FORBIDDEN`; hồ sơ giữ nguyên `hoan_thanh`/`can_bo_sung`, không sinh `feedback`, không sinh nhiệm vụ `nghiem_thu` | Test cũ `OWNER-001` gộp ba case ("không xác thực", "khoá sai", "chỉ Tôi cũng gặp" đều 403). Case "không có token" nay phải **401 `CITIZEN_LOGIN_REQUIRED`** (spec 12.3, câu hỏi mở 17.1 câu 7); hai case còn lại giữ 403 |
| OWNER-002 | Cùng hồ sơ `hoan_thanh`. Chủ hồ sơ (token có SĐT = `reporter_phone`) gọi `feedback {resolved:true, rating:4, tags:['Xử lý nhanh']}` | 200; hồ sơ `dong`; `feedback` lưu đủ `rating`, `tags`. Chủ hồ sơ gọi `supplement` trên `can_bo_sung` → 200, hồ sơ `moi` | Test cũ `OWNER-002` dùng `X-Report-Key`; với hồ sơ có SĐT, quyền chủ chỉ qua token SĐT. `X-Report-Key` chỉ còn test cho hồ sơ ẩn danh cũ |

### 19.3. "Tôi cũng gặp" một lần cho mỗi SĐT (D4)

| ID | File | Tình huống | Kết quả mong đợi |
|---|---|---|---|
| FOLLOW-001 | `tests/api/citizen-follow.test.ts` | `POST /citizen/reports/:code/follow` không token | 401 `CITIZEN_LOGIN_REQUIRED`; `report_followers` và số cùng báo không đổi |
| FOLLOW-002 | `citizen-follow.test.ts` | Cùng SĐT (có token) gọi `follow` hai lần liên tiếp, và một biến thể gọi đồng thời hai request | Lần 1: 200 `alreadyFollowed:false`, `followerCount` +1. Lần 2: 200 `alreadyFollowed:true`, `followerCount` **không đổi**; DB có đúng 1 dòng `(report_id, phone)` với nguồn `also_me`; `anonymous_follows` không đổi. Người gửi gọi `follow` hồ sơ của chính mình → 403 |
| FOLLOW-003 | `tests/component/c06-follow.test.tsx` (CT) | C06 của hồ sơ mà SĐT đăng nhập = `reporterPhone` | **Không có** nút "Tôi cũng gặp vấn đề này". Với người khác đã đăng nhập: có nút; sau khi bấm nút đổi thành "Đã ghi nhận bạn cũng gặp vấn đề này"; bấm lần 2 (chế độ local) hiện "Bạn đã báo vấn đề này", số không tăng |

### 19.4. Hiển thị SĐT (D7) – `tests/api/phone-privacy.test.ts`

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| PHONE-001 | Gọi mọi endpoint `/public/*` (config, reports, reports/:code cho cả 64 hồ sơ seed + 1 hồ sơ mới tạo, kpi, recent-results) | Không khớp regex `0\d{9}` và `0\d{3} \d{3} \d{3}`; không có khoá `reporterPhone`, `reporter_phone`, `followers`, `secretCode`, `ownerToken`; có `followerCount` |
| PHONE-002 | Token cán bộ gọi `GET /officer/reports/:code` (hồ sơ có SĐT, hồ sơ ẩn danh cũ) và `GET /officer/reports` | Hồ sơ có SĐT: `reporterPhone` là SĐT **đầy đủ**; hồ sơ ẩn danh cũ: `null`; không có `secretCode`, hash, danh sách `followers`. Token admin gọi cùng endpoint → 403 |
| PHONE-003 | Token TNV gọi `GET /volunteer/tasks` (nhiệm vụ của mình, nhiệm vụ mở, nhiệm vụ đã xong) | Không có SĐT ở bất kỳ phần tử nào (regex + khoá `reporterPhone`) |
| PHONE-004 | `GET /volunteer/tasks/:code` trong 5 tình huống: (a) giao cho chính TNV, `cho_nhan`/`dang_lam`; (b) giao cho TNV khác; (c) nhiệm vụ mở chưa ai nhận; (d) nhiệm vụ của chính TNV nhưng `xong`; (e) nhiệm vụ mở sau khi chính TNV gọi `claim` | (a) có `reporterPhone` đầy đủ. (b), (c), (d) **không có** trường này và không khớp regex SĐT. (e) có `reporterPhone` (đã thành nhiệm vụ của TNV). Hồ sơ ẩn danh cũ: không có trường ở mọi tình huống. Mọi tình huống không có `secretCode`, `ownerToken`, followers |

### 19.5. Không chọn sẵn loại sự cố (D8)

| ID | File | Tình huống | Kết quả mong đợi |
|---|---|---|---|
| C04-CAT-001 | `tests/component/c04-category.test.tsx` (CT) | Mở C04 bước ① với bản nháp có ảnh (kể cả khi `aiSuggestion` đã có `category`) | Không CategoryTile nào có `aria-pressed="true"`; nút "Tiếp tục chọn vị trí" có `disabled` và có dòng chữ nhắc chọn loại; chọn một loại → nút bật; bấm "Dùng gợi ý" mới chọn loại được gợi ý (không tự chọn); `userEvent` chọn loại khác ghi đè lựa chọn trước |

### 19.6. Test bổ sung cho AC mới của spec v3.0

Các ID dưới đây ngoài danh sách yêu cầu ban đầu, thêm để mỗi AC mới có ít nhất một test (AGENTS.md: test trước code).

| ID | Loại | AC | Tình huống | Kết quả mong đợi |
|---|---|---|---|---|
| C04-LOGIN-001 | CT | AC-C04-14 | Chưa đăng nhập, bản nháp đủ ảnh, loại, vị trí; bấm "Gửi phản ánh" ở bước ③ | Chuyển tới `/ho-so?login=1&redirect=` + `/bao-su-co/xac-nhan?step=3` (đã mã hoá); bản nháp (gồm `aiSuggestion`) còn nguyên; đăng nhập OTP `123456` xong quay lại bước ③; chưa tự gửi |
| C06-FOLLOW-LOGIN-001 | CT | AC-C06-13 | Chưa đăng nhập bấm "Tôi cũng gặp" ở C06 | Chuyển `/ho-so?login=1&redirect=/phan-anh/:id`; chưa ghi nhận cho tới khi đăng nhập và bấm lại |
| C06-RATING-LOGIN-001 | CT | AC-C06-14, AC-C06-8 | Hồ sơ `hoan_thanh`: (a) chưa đăng nhập; (b) đã đăng nhập, không phải chủ; (c) chủ hồ sơ | (a) lời mời đăng nhập thay hai nút, không có nút "Đã giải quyết"/"Chưa giải quyết"; (b) không có khu vực đánh giá; (c) có hai nút |
| C06-NOTI-001 | CT | AC-C06-15 | C06 khi chưa đăng nhập / đã đăng nhập và là người nhận | Chưa đăng nhập: chỉ lời mời đăng nhập, không có danh sách. Đã là người nhận: dòng "Bạn đang nhận tin báo cho phản ánh này" + thông báo của riêng hồ sơ đó |
| C05-LOGIN-001 | CT | AC-C05-1 | C05 `/cua-toi` chưa đăng nhập; sau đăng nhập | Chưa đăng nhập: lời mời + form SĐT/OTP + "Tra cứu bằng mã phản ánh", không có danh sách; `?redirect=` ngoại lai (ví dụ `//evil.com`) bị bỏ qua; đăng nhập xong thấy hồ sơ có `reporterPhone` = SĐT |
| C09-001 | CT | AC-C09-1 → 3 | C09 chưa đăng nhập / đã đăng nhập | Chưa đăng nhập: "Đăng nhập để xem thông báo" + nút "Đăng nhập ngay" → `/ho-so?login=1&redirect=%2Fthong-bao`; đã đăng nhập: danh sách mới nhất trước, tab "Chưa đọc (n)", "Xem tin nhắn mẫu" có nhãn "Mô phỏng" |
| NOTI-API-001 | API | 12.3 | `GET /citizen/me/notifications` không token | 401 `CITIZEN_LOGIN_REQUIRED` |
| QR-001 | UT + CT | AC-C01-8 | `parseReportQrPayload` với `https://x/phan-anh/TB-0001?k=1234`, `TB-0007`, chuỗi rác, chuỗi rỗng; khung quét ở C01 | Hai chuỗi đầu → `{id, key?}` đúng và chuyển `/phan-anh/TB-xxxx` (giữ `?k=`); chuỗi rác/rỗng → `null` và hiện "Không nhận diện được mã phản ánh…"; không có camera → vẫn nhập mã được; đóng khung thì tắt camera |
| A01-PHONE-001 | CT | AC-A01-10 | A01 với hồ sơ có SĐT và hồ sơ ẩn danh cũ | Có cột "SĐT" hiển thị SĐT đầy đủ; hồ sơ ẩn danh cũ ghi "Ẩn danh" |
| A02-PHONE-001 | CT | AC-A02-11 | A02 với hồ sơ có SĐT / ẩn danh cũ | Có SĐT đầy đủ + nút "Gọi" có `href="tel:…"`; ẩn danh cũ: nhãn "Ẩn danh", không nút "Gọi" |
| A02-AI-001 | CT | AC-A02-12 | A02 với hồ sơ có `aiSuggestion` / không có | Có: khối "Gợi ý của AI khi gửi" với loại, lý do, nhãn nguồn; không có: không hiện khối. (Trùng ý với AI-FE-006) |
| V02-PHONE-001 | CT | AC-V02-6 | V02 theo 4 tình huống như PHONE-004 (a)–(d) | (a) SĐT đầy đủ + nút "Gọi"; (b), (c), (d) không có SĐT, không nút "Gọi" |
| V02-STEPS-001 | CT | AC-V02-1 → 4 | V02 3 bước | Bước ① cần câu 1 (và mức độ khi "Có") mới sang được bước ②; bước ② cần ảnh/video; bước ③ ghi chú tùy chọn rồi "Gửi"; không có nút đóng hồ sơ |
| V03-001 | CT | AC-V03-1 → 3 | `/tnv/ban-do` | Có marker nhiệm vụ của mình + nhiệm vụ mở, chú giải bằng chữ, thẻ marker không có SĐT hay tên người gửi |
| AI-DRAFT-001 | CT | AC-C02-5, AC-C04-14 | Có `aiSuggestion` trong bản nháp rồi đăng nhập giữa chừng | `aiSuggestion` còn nguyên sau khi quay lại; `POST /citizen/reports` gửi kèm `aiSuggestion`; DB `reports.ai_suggestion` lưu đúng; chưa đăng nhập vẫn gọi được `POST /ai/suggest-category` |
| ROLE-001 | CT | AC-ROLE-1 | Chế độ API | Không có `PortalSwitcherFab`, không có đường tới `/demo`; vào `/can-bo` khi chưa đăng nhập → `/dang-nhap?redirect=` |

### 19.7. Bất biến dữ liệu không đổi sau FR-08

Giữ nguyên `DV-001 → DV-016` và `DB-007 → DB-016`: 64 hồ sơ (18/15/21/10), 47 đã xử lý, 17 chưa hoàn tất, trung bình 3,2 ngày (sai số ≤ 0,005), đúng 6 hồ sơ `anonymous` trong đó 1 `subscribedLater`, `reporter_phone` rỗng ở cả 6, mọi hồ sơ có `secret_code_hash`. Hồ sơ tạo bởi AUTH-CIT-002 (từ `TB-0065`) không làm sai các kiểm tra này (`is_seed`).

## 20. Phiên theo cổng và demo (spec v3.1)
| ID | File | Kiểm tra | Kết quả mong đợi |
|---|---|---|---|
| SESSION-001 | `tests/unit/session.test.ts` | Có token người dân và token nhân viên, gọi `clearStaffSession()` rồi `clearCitizenSession()` | Mỗi hàm chỉ xoá khoá của phiên mình |
| SESSION-002 | `tests/unit/session.test.ts` | Chế độ API, `settings.phone` còn nhưng không có token người dân | Store xoá `settings.phone` |
| SESSION-003 | `tests/unit/session.test.ts` | API `/citizen/*` trả 401 khi đang giữ cả hai phiên | Chỉ mất token người dân, phát sự kiện yêu cầu đăng nhập người dân |
| SESSION-004 | `tests/unit/session.test.ts` | Giữ cả hai token, gọi `/citizen/me/reports` và `/officer/reports` | Header `Authorization` đúng loại token cho từng đường dẫn |
| DB-GUARD-002 | `tests/unit/sql-json-guard.test.ts` | Đọc cấu hình `server/db/client.ts` | Có `prepare: false`, `idle_timeout`, `max_lifetime`; `max` = 1 khi chạy trên Vercel |
| ROLE-001 | `tests/component/spec-v3-fr08.test.tsx` | Render App ở chế độ API | Có nút "Chuyển cổng nghiệp vụ" với 4 cổng |
| E2E-DEMO-01 | `tests/e2e-api/demo-role-switch.spec.ts` | Một trình duyệt: người dân đăng nhập OTP và gửi → đăng nhập cán bộ → TNV → quay lại người dân gửi tiếp | Lần gửi thứ hai 201, không phải đăng nhập lại; cán bộ/TNV vào đúng cổng |
| C04-DRAFT-001 | `tests/component/c04-dup.test.tsx` | Chế độ API, đã đăng nhập, gửi phản ánh thành công | Về trang chủ, bản nháp không còn ảnh |

