# TESTS – Trấn Biên Kết Nối

Nguồn: `spec.md` v1.2, `tasks.md`, `ui-ux-guidelines.md`

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
6. `canSendAnonymous`: 4 mục `anonymousLog` trong 24h → true; 5 → false; 5 mục nhưng 1 mục cũ hơn 24h → true.

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
3. `submitReport({anonymous:true})` → `anonymous` true, `reporterPhone` rỗng, followers rỗng, anonymousFollows 1, **không** sinh notification SMS; `deviceReports` và `anonymousLog` cập nhật.
4. `submitReport({anonymous:true})` lần thứ 6 trong 24h → lỗi quota, không tạo hồ sơ.
5. `subscribeLater(id, phone)` trên hồ sơ ẩn danh → followers = [phone], `subscribedLater` true, `anonymous` vẫn true, 1 notification xác nhận; gọi trên hồ sơ không ẩn danh → lỗi.
6. `unsubscribe` → gỡ phone, `subscribedLater` false.
7. Sau `subscribeLater`, chuyển hồ sơ sang `hoan_thanh` → phone nhận notification "đã xử lý xong".
8. `claimByLink(id, k)` đúng → thêm vào `deviceReports`; sai → không đổi state.
9. `lookupReport(id, code4)` khớp 4 số cuối SĐT hoặc `secretCode` → trả hồ sơ; không khớp → `null`.
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
| CT-039 | TrackingLinkCard, SubscribeCard | Mã bí mật ≥ 28px, QR mã hoá đúng URL `?k=`; "Lưu link" gọi share hoặc toast "Đã sao chép link"; SubscribeCard → OTP → "Đang nhận tin qua 0909 *** 068 · Huỷ" |
| CT-039b | RatingSheet | Có "Chưa đến 30 giây"; 5 sao có nhãn chữ; chọn 5 sao → chip tích cực, chọn 2 sao → chip "Xử lý chậm"…; "Gửi đánh giá" tắt khi chưa chọn sao; trả `{rating, tags, comment}` |
| CT-040 | C01 | Thứ tự khối đúng AC-C01-1; không có hồ sơ trên máy → ẩn "Phản ánh của bạn"; có 2 hồ sơ → 2 thẻ trượt ngang có ProgressBar; "Quanh đây" đúng 3 mục kèm khoảng cách; dải "47/64" tính từ store và dẫn tới `/minh-bach` |
| CT-042 | C02 | Ô chụp có `capture="environment"`, nút "Chọn ảnh có sẵn" không có `capture`; "Tiếp tục" tắt khi 0 ảnh; ảnh thứ 4 bị chặn kèm thông báo; ✕ khi có ảnh → hỏi lưu nháp |
| CT-043 | C03 | Ảnh đã chụp hiện phía trên; GPS trong phường → ghim + LocationRow có tên đường; GPS ngoài 5 km → banner 2 lựa chọn; denied → câu "Chưa lấy được vị trí…" + ô nhập gợi ý đường; nút "Đúng chỗ này rồi" |
| CT-044 | C04 xác nhận | "Gửi cho phường" tắt khi chưa chọn loại; không có lựa chọn mức ưu tiên; "Đổi" ở LocationRow về C03 giữ dữ liệu; link "Gửi không để lại số điện thoại" hiện dưới nút chính |
| CT-045 | C04 gửi có SĐT | Chưa SĐT → mở OTP; xong → màn thành công có mã `TB-0065`, đoạn "Tiếp theo…", nút "Theo dõi phản ánh"; offline → banner + "Thử lại", draft còn |
| CT-045b | C04 ẩn danh | Sheet cảnh báo đúng câu chữ; "Gửi ẩn danh" → màn thành công có mã bí mật, QR, "Lưu link theo dõi", dòng nhắc, nút "Nhận tin báo…"; không mở OTP; lần thứ 6 trong ngày → sheet quota |
| CT-047 | C05 | Không đăng nhập vẫn thấy hồ sơ gửi từ máy này; tab có số đếm khớp dữ liệu; tab "Đã xử lý" chỉ còn bước 4; thẻ chỉ lưu trên máy có nút "Lưu link" + dòng cảnh báo đầu danh sách; tra cứu mã + mã bí mật đúng → mở hồ sơ, sai → lỗi; trống → EmptyState có "Báo sự cố" |
| CT-048 | C06 | Thứ tự khối theo AC-C06-12; hồ sơ `da_giao` quá hạn → DelayChip + câu "chậm hơn dự kiến"; Trước/Sau luôn hiện, ô Sau trống khi chưa xong; `hoan_thanh` → Trước/Sau lên ngay dưới ảnh gốc + khối "Vấn đề đã được giải quyết chưa?"; "Chưa giải quyết" → "Đang xử lý lại"; người ngoài không thấy khu vực hành động; không có tên cá nhân cán bộ |
| CT-048b | C06 ẩn danh | `/phan-anh/TB-0066?k=<đúng>` ở thiết bị mới → có quyền chủ + thẻ "Nhận tin báo…"; `k` sai → dòng "Link theo dõi không đúng…"; mã bí mật ẩn mặc định, nút "Hiện" |
| CT-049a | C07 | Mặc định có vòng 1 km; "Toàn phường" bỏ vòng; chip lọc giảm số marker; chạm marker → thẻ nổi có "Xem →"; công tắc Danh sách sắp theo khoảng cách; thanh điều hướng + FAB vẫn hiện; không có SĐT trong DOM |
| CT-049b | C08 | KPI 64 / 47 (73,4%) / 17 / 3,2 ngày; biểu đồ 4 nhóm; 6 thẻ Trước → Sau có tên bộ phận; chú thích nguồn; không có SĐT trong DOM |
| CT-050 | A01 | Hai hồ sơ quá hạn lên đầu với chữ "Quá hạn"; tìm "TB-0012" lọc đúng; tab "Đã xử lý" = 47 hàng; lọc Nguồn "Ẩn danh" = 6 hàng có cờ "Ẩn danh" |
| CT-051 | A02 | Hồ sơ `moi` chỉ hiện nút hợp lệ; bộ phận và hạn điền sẵn đúng loại; "Yêu cầu bổ sung" với lý do 5 ký tự → nút tắt; SĐT dạng che; hồ sơ ẩn danh `moi` có gợi ý "nên giao TNV xác minh…" |
| CT-053 | A03 | Không ảnh → Xác nhận tắt + lý do; có ảnh + mô tả → xem trước Trước/Sau; xác nhận → `hoan_thanh` |
| CT-056 | Bàn phím A01 | Tab tới bảng, mũi tên chọn hàng, Enter mở panel, Esc đóng và trả focus |
| CT-060 | V01 | TNV "Lê Thảo Vy" thấy nhiệm vụ của mình + nhiệm vụ mở; nhãn "Xác minh ban đầu"/"Nghiệm thu sau xử lý"; tab "Đã xong" |
| CT-061 | V02 | Thiếu Câu 1 / mức độ / ảnh → Gửi tắt; đủ → gửi, về V01; không có nút đóng hồ sơ |
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
| E2E-07 | Ẩn danh → nhận tin sau: khung trái gửi ẩn danh → lưu link → CB tiếp nhận → khung trái C05 thấy "Đã tiếp nhận" (không có SMS) → "Nhận tin báo…" + OTP → CB hoàn thành → khung trái có thông báo | Demo Hub | Hồ sơ giữ `anonymous` true; chỉ sau khi đăng ký mới có SMS mô phỏng |
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
- [ ] Gửi thành công kèm mã (có SĐT / ẩn danh).
- [ ] Danh sách trống (C05, V01).
- [ ] Cần bổ sung / đã chuyển / không xác nhận (C06).
- [ ] Chưa giải quyết → mở lại.
- [ ] Quá hạn / sắp đến hạn (A01) và "Chậm n ngày" (C01, C05, C06, C07).
- [ ] Quota gửi ẩn danh; link theo dõi sai mã; đăng ký / huỷ nhận tin.
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

---

## 9. Backlog Bonus – CHƯA VIẾT TEST

Chỉ viết khi mở task bonus tương ứng trong `tasks.md`. Danh sách kiểm tra dự kiến:

| ID | Bonus | Nội dung kiểm tra dự kiến |
|---|---|---|
| BT-B3-1 | B3 Chữ lớn | Bật → `<html class="senior">`, chữ thân ≥ 20px, nút ≥ 56px, ghi nhớ sau reload |
| MT-SR | B3 Chữ lớn | Checklist: 1 nút chính/màn, từ ngữ cột Chữ lớn, gửi không cần chạm bản đồ |
| BT-B2-1 | B2 Trùng | `findDuplicates`: cùng loại ≤ 50 m, ≤ 14 ngày, loại trừ trạng thái đóng/gộp/chuyển/không xác nhận; tối đa 3, sắp theo khoảng cách |
| BT-B2-2 | B2 Trùng | Hộp nghi trùng ở C04; "Tôi cũng gặp" có SĐT/ẩn danh không tạo hồ sơ mới; followerCount ≥ 3 → ưu tiên cao |
| BT-B2-3 | B2 Trùng | Gộp: hồ sơ phụ `da_gop`, followers hợp nhất, thông báo; tách khôi phục trạng thái cũ |
| BT-E2E-02 | B2 Trùng | Luồng "Tôi cũng gặp" đầu–cuối |
| BT-E2E-04 | B2 Trùng | Gộp rồi tách cụm trùng 1 |
| BT-B1-1 | B1 AI | Ảnh có trong manifest → gợi ý + nhãn "Mô phỏng"; ảnh lạ → không chọn sẵn |
| BT-B4-1 | B4 Giọng nói | Không hỗ trợ → không có nút micro; có → chèn chữ vào ô mô tả |
| BT-B5-1 | B5 Gửi hộ | Modal tạo hộ: thiếu SĐT không lưu; lưu → `onBehalf`, `da_tiep_nhan`, SMS mô phỏng có mã |
| UX-001 → 004 | Thử nghiệm người dùng | Báo ổ gà; xem trạng thái; báo chưa giải quyết; gửi ẩn danh rồi tìm lại |
