# TESTS – Trấn Biên Kết Nối

Nguyên tắc: **test viết trước code** cho mỗi task. Test domain và dữ liệu là bắt buộc tự động; UX thiết bị thật là checklist thủ công.

| Tầng | Công cụ | Thư mục | Chạy trong `verify` |
|---|---|---|---|
| UT – Unit | Vitest | `tests/unit/` | ✓ |
| DV – Data validation | `scripts/verify-mock.ts` + Vitest | `tests/unit/mock.test.ts` | ✓ |
| CT – Component | Vitest + Testing Library | `tests/component/` | ✓ |
| E2E | Playwright (mobile 390×844, desktop 1440×900) | `tests/e2e/` | Chạy riêng `test:e2e` |
| A11Y | @axe-core/playwright | `tests/e2e/a11y.spec.ts` | Chạy riêng |
| MT / UX | Checklist thủ công | mục 6–8 file này | – |

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
4. `publicLabel('cho_xac_minh')` chứa "Đang kiểm tra tại chỗ".
5. Có 5 bộ phận và 3 TNV mẫu.

### UT-012 – Status
1. `canTransition('moi','da_tiep_nhan','CB')` = true; `('moi','hoan_thanh','CB')` = false.
2. `transition` sang `hoan_thanh` khi không có `resultPhotos` → ném lỗi có thông điệp tiếng Việt.
3. `transition` sang `hoan_thanh` lần đầu set `completedAt`; lần hai (sau `mo_lai` → `da_giao` → `hoan_thanh`) giữ nguyên `completedAt` cũ.
4. Mọi `transition` thành công thêm đúng 1 mục timeline với `at = now`.
5. TNV không thể chuyển bất kỳ trạng thái nào trực tiếp (`canTransition(..., 'TNV')` luôn false).
6. `split` khôi phục `statusBeforeMerge`.
7. `progressStep`: moi→1, da_tiep_nhan→2, cho_xac_minh→2, da_giao→3, mo_lai→3, hoan_thanh→4, dong→4, da_gop→`exception`.
8. Chuyển sang `can_bo_sung`, `chuyen_co_quan` không có lý do hoặc lý do < 10 ký tự → lỗi.

### UT-013 – Duplicates
1. `haversineMeters` giữa 2 điểm cách nhau 0,0004° vĩ độ ≈ 44,5 m (sai số ±1 m).
2. Cùng loại, 30 m, 3 ngày, trạng thái `da_giao` → là trùng.
3. Khác loại, 10 m → không trùng.
4. Cùng loại, 51 m → không trùng; đúng 50 m → trùng.
5. Cùng loại, 20 m, 15 ngày trước → không trùng.
6. Cùng loại, 20 m, trạng thái `dong` / `da_gop` / `chuyen_co_quan` / `khong_xac_nhan` → không trùng.
7. Trả tối đa 3 kết quả, sắp theo khoảng cách tăng dần.
8. Không tự so sánh với chính nó.

### UT-014 – Sorting & priority
1. `dueAt` = now − 1h, trạng thái `da_giao` → overdue.
2. `dueAt` = now − 1h, trạng thái `dong` → không overdue.
3. `dueAt` = now + 23h → dueSoon; now + 25h → không.
4. `sortInbox` với tập [moi, overdue 2 ngày, overdue 1 ngày, dueSoon, da_giao bình thường] → thứ tự: overdue 2 ngày, overdue 1 ngày, dueSoon, moi, da_giao.
5. `computePriority`: followerCount 3 → `cao`; 2 → `binh_thuong`; followers 1 + anonymousFollows 2 → `cao`; CB đặt tay `cao` giữ nguyên dù followerCount 1.

### UT-015 – KPI
1. Với `mock.json`: total 64; byCategory {18,15,21,10}; resolved 47; open 17; avgDays làm tròn 1 chữ số = 3,2.
2. Tập rỗng → mọi số 0, avgDays `null` (UI hiện "–").
3. Hồ sơ `da_gop` không tính vào open.
4. Thêm 1 hồ sơ tháng 12 → KPI tháng 11 không đổi.

### UT-016 – Privacy
1. `maskPhone('0909000068')` = `0909 *** 068`.
2. `toPublicReport` không có khoá `reporterPhone`, `followers`; có `followerCount`.
3. Timeline công khai không chứa tên cán bộ/TNV; actor thay bằng "Phường Trấn Biên" hoặc "Tình nguyện viên".
4. Serialize JSON của `toPublicReport` cho mọi hồ sơ mock không chứa chuỗi khớp regex `0\d{9}`.
5. `toPublicReport` không có khoá `secretCode`, `subscribedLater`.

### UT-016b – Access
1. SĐT thiết bị nằm trong `followers` → `hasOwnerAccess` true.
2. `deviceReports` chứa `{id, secretCode}` đúng → true; `secretCode` sai → false.
3. Tham số `k` khớp → true; `k` sai → false.
4. Người lạ không SĐT, không deviceReports, không `k` → false.
5. `followerCount` = followers.length + anonymousFollows.
6. `canSendAnonymous`: 4 mục `anonymousLog` trong 24h → true; 5 → false; 5 mục nhưng 1 mục cũ hơn 24h → true.

### UT-017 – Format & notifications
1. `formatDays(3.2)` = "3,2 ngày"; `formatDistance(950)` = "950 m"; `formatDistance(1250)` = "1,3 km".
2. `formatDate` = `dd/MM/yyyy` theo UTC+7 (ISO `2026-11-23T18:00:00Z` → "24/11/2026").
3. `buildNotification` cho mỗi sự kiện spec 3.4 thay đúng biến, không còn ký tự `{`.
4. Chuyển `cho_xac_minh` → `da_tiep_nhan` không sinh thông báo (nhãn công khai không đổi bước).

### UT-018 – Streets
1. ≥ 10 đường, mỗi đường có tên và tọa độ trong khung spec 5.3.
2. `nearestStreet` tại tọa độ của đường X trả về X.

### UT-019 – Generator
1. Cùng seed → 2 lần chạy cho JSON giống hệt.
2. Seed khác → dữ liệu khác nhưng vẫn qua DV-001 → DV-012.

### UT-020 – Store
1. Khởi tạo không có localStorage → state = mock.
2. Có localStorage hợp lệ → state = localStorage.
3. localStorage hỏng (JSON lỗi) → fallback mock + không crash.

### UT-021 – Actions người dân
1. `submitReport` → id `TB-0065`, status `moi`, followers = [phone], 1 timeline, 1 notification "đã nhận"; `secretCode` 4 số; `deviceReports` của thiết bị thêm `{TB-0065, secretCode}`.
1b. `submitReport({anonymous:true})` → `anonymous` true, `reporterPhone` rỗng, followers rỗng, anonymousFollows 1, **không** sinh notification SMS; `deviceReports` và `anonymousLog` cập nhật.
1c. `submitReport({anonymous:true})` lần thứ 6 trong 24h → lỗi quota, không tạo hồ sơ.
2. Gửi tiếp → `TB-0066`.
3. `followReport` lần 3 người → priority `cao`; gọi lại với cùng SĐT → không nhân đôi.
3b. `followReport` ẩn danh → anonymousFollows + 1, followers không đổi.
3c. `subscribeLater(id, phone)` trên hồ sơ ẩn danh → followers = [phone], `subscribedLater` true, `anonymous` vẫn true, 1 notification xác nhận; gọi trên hồ sơ không ẩn danh → lỗi.
3d. `unsubscribe` → gỡ phone, `subscribedLater` false.
3e. Sau `subscribeLater`, chuyển hồ sơ sang `hoan_thanh` → phone nhận notification "đã xử lý xong".
3f. `claimByLink(id, k)` đúng → thêm vào `deviceReports`; sai → không đổi state.
3g. `lookupReport(id, code4)` khớp 4 số cuối SĐT hoặc `secretCode` → trả hồ sơ; không khớp → `null`.
4. `submitFeedback({resolved:true, rating:4})` khi `hoan_thanh` → `dong`.
5. `submitFeedback({resolved:false})` → `mo_lai` + 1 VolunteerTask `nghiem_thu` + thông báo "kiểm tra lại".
6. `submitFeedback` khi status ≠ `hoan_thanh` → lỗi.
7. `supplementReport` khi `can_bo_sung` → `moi`.

### UT-022 – Actions cán bộ/TNV
1. `accept` set department + dueAt mặc định = createdAt + hạn loại.
2. `assignVolunteer` → `cho_xac_minh` + task `xac_minh`.
3. `submitVerification(exists:'co')` → task `xong`, report `da_tiep_nhan`; `exists:'khong'` → report giữ `cho_xac_minh`, có cờ chờ CB xác nhận `khong_xac_nhan`.
4. `complete` thông báo tới **mọi** follower của hồ sơ chính và hồ sơ đã gộp.
5. `merge(main, [a,b])` → a,b `da_gop`, `mergedInto = main`; followers main = hợp của 3; ảnh a,b nối vào main; main.mergedChildren = [a,b].
6. `merge` hồ sơ `dong` → lỗi.
7. `split(main, a)` → a về trạng thái cũ, rời followers đã thêm từ a khỏi main.
8. `createOnBehalf` → `onBehalf: true`, status `da_tiep_nhan`, notification `sms_mo_phong` có mã.

### UT-023 – Persistence
1. Dispatch → localStorage cập nhật sau ≤ 150ms.
2. Giả lập `storage` event với state mới → store hydrate.
3. Settings ghi theo khoá `tbkn:settings:left` / `right` độc lập.
4. `reset` xoá dữ liệu và nạp lại mock.
5. `setItem` ném `QuotaExceededError` → action trả lỗi có thông điệp tiếng Việt, state không mất.
6. `deviceReports` khung `left` không xuất hiện ở khung `right` (mỗi "máy" tự nhớ riêng).

### UT-035 – lib
1. `geolocation`: mock `getCurrentPosition` không gọi callback → reject `timeout` sau 10s (fake timers); `PERMISSION_DENIED` → `denied`.
2. `image`: ảnh 4000×3000 → kết quả cạnh dài 1280; định dạng `image/jpeg`.
3. `aiMock`: tên file có trong manifest → category; không có → `null`.
4. `speech.isSupported()` false khi không có `SpeechRecognition`/`webkitSpeechRecognition`.

### UT-039 – Share
1. Có `navigator.share` → gọi với `{ title, text, url }` chứa `?k=`.
2. Không có `navigator.share` → ghi `navigator.clipboard.writeText(url)` và trả `'copied'`.
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
| DV-009 | Có đúng 2 cụm nghi trùng theo spec 3.5 |
| DV-010 | Có hồ sơ demo `mat_duong` `da_tiep_nhan` với 2 followers, cách tâm phường ≤ 300 m |
| DV-011 | Mọi `id` duy nhất, dạng `TB-\d{4}`, liên tục 0001–0064 |
| DV-012 | 40 hồ sơ `dong` có `feedback.rating` 1–5; 7 hồ sơ `hoan_thanh` không có feedback; 3 VolunteerTask khớp 3 hồ sơ `cho_xac_minh` |
| DV-014 | Đúng 6 hồ sơ `anonymous` (3 rác thải, 1 mỗi loại còn lại), có ở cả nhóm đã xử lý và chưa hoàn tất; hồ sơ ẩn danh không có `reporterPhone`; đúng 1 hồ sơ `subscribedLater`; mọi hồ sơ có `secretCode` 4 số |
| DV-013 | Mọi đường dẫn ảnh trong mock tồn tại trong `public/demo-photos/`; mỗi loại ≥ 4 ảnh; `manifest.json` phủ toàn bộ ảnh |

`verify-mock` in bảng kết quả và **exit 1** nếu bất kỳ dòng nào sai.

---

## 3. Component tests (CT)

| ID | Đối tượng | Kiểm tra chính |
|---|---|---|
| CT-001 | Token & senior | Bật `seniorMode` → `<html>` có class `senior`; nút chính đo chiều cao ≥ 56px (qua style tính toán) |
| CT-002 | Layouts | CitizenLayout rộng tối đa 430px; OfficerLayout có sidebar |
| CT-030 | UI kit | Modal giữ focus bên trong, Esc đóng; Toast có `role="status"`; Button icon-only bắt buộc `aria-label` (test type) |
| CT-031 | StatusBadge | Mỗi status render icon + chữ; biến thể công khai của `cho_xac_minh` hiện "Đã tiếp nhận" |
| CT-032 | ProgressTracker | Bước hiện tại có `aria-current="step"`; `da_gop` hiện băng ngoại lệ + link hồ sơ chính |
| CT-033 | Stepper | Hiện "Bước 2/3 – Vị trí" dạng chữ |
| CT-034 | MapView | Render attribution OSM; onTap trả lat/lng; tile lỗi → gọi `onTileError` |
| CT-036 | PhoneOtpSheet | SĐT 9 số → lỗi; `0909000068` → sang OTP; OTP sai → lỗi; `123456` → `onVerified`; có nhãn "Mô phỏng" |
| CT-037 | BeforeAfter, CategoryCard | 2 ảnh có alt "Trước xử lý"/"Sau xử lý"; CategoryCard chọn được bằng bàn phím, `aria-pressed` |
| CT-038 | NotificationBell | Số chưa đọc đúng; mở danh sách → đánh dấu đã đọc; SmsPreview có "Mô phỏng" |
| CT-039 | TrackingLinkCard, SubscribeCard | Hiện mã bí mật ≥ 28px và QR mã hoá đúng URL `?k=`; nút "Lưu link" gọi share hoặc toast "Đã sao chép link"; SubscribeCard → OTP → đổi thành "Đang nhận tin qua 0909 *** 068 · Huỷ" |
| CT-040 | C01 | 4 nút đúng thứ tự; dải "47/64" tính từ store; bật chữ lớn ghi nhớ sau remount |
| CT-042 | C02 | "Tiếp tục" tắt khi 0 ảnh; thêm ảnh thứ 4 bị chặn kèm thông báo; file manifest → "Có vẻ là: Mặt đường · Mô phỏng"; file lạ → "Chưa nhận diện được" |
| CT-043 | C03 | GPS trong phường → ghim; GPS ngoài 5 km → banner 2 lựa chọn; denied → ô nhập địa chỉ hiện và gợi ý đường; chữ lớn → nút "Tôi đang đứng ở chỗ bị hư" |
| CT-044 | C04 xác nhận | Loại AI chọn sẵn có huy hiệu "Gợi ý"; chọn `mat_duong` tại tọa độ cụm trùng → hộp "Đã có … người báo" với khoảng cách; nút Sửa quay đúng bước |
| CT-045 | C04 gửi | Chưa SĐT → mở OTP; xong → mã `TB-0065` hiển thị; "Tôi cũng gặp" → không tạo hồ sơ mới, hiện mã cũ; offline → banner + nút Thử lại, draft còn |
| CT-045b | C04 ẩn danh | Link "Gửi không để lại số điện thoại" hiện cả ở chế độ chữ lớn; bấm → sheet cảnh báo đúng câu chữ; "Gửi ẩn danh" → màn thành công có mã bí mật, QR, "Lưu link theo dõi", dòng nhắc; không mở OTP; lần thứ 6 trong ngày → sheet quota, chỉ còn lựa chọn có SĐT |
| CT-046 | Micro | Không hỗ trợ → không render nút; hỗ trợ (mock) → nhấn giữ, kết quả chèn vào ô mô tả |
| CT-047 | C05 | Chưa xác thực → 2 lựa chọn; tra cứu mã + 4 số cuối đúng → hiện hồ sơ; sai → lỗi; lọc "Đã xử lý" chỉ còn hồ sơ bước 4; trống → EmptyState có nút "Báo sự cố" |
| CT-048 | C06 | `hoan_thanh` + là follower → khối "đã được giải quyết chưa?"; không phải follower → không có khối, có "Tôi cũng gặp"; "Chưa giải quyết" → trạng thái hiển thị "Đang xử lý lại"; `da_gop` → banner + link; timeline không có tên cán bộ |
| CT-049a | C07 | Mặc định có vòng 1 km; "Toàn phường" bỏ vòng; lọc loại giảm số marker; chuyển Danh sách sắp theo khoảng cách; không có chuỗi SĐT trong DOM |
| CT-049b | C08 | KPI 64 / 47 (73,4%) / 17 / 3,2 ngày; biểu đồ có 4 nhóm; có chú thích nguồn; không có SĐT trong DOM |
| CT-049c | C05 máy tự nhớ | Không đăng nhập vẫn thấy mục "Gửi từ máy này" có hồ sơ vừa gửi ẩn danh + chú thích xoá dữ liệu; tra cứu "TB-0066" + mã bí mật đúng → mở hồ sơ với quyền chủ |
| CT-049d | C06 ẩn danh | Mở `/phan-anh/TB-0066?k=<đúng>` ở thiết bị mới → có khối chủ hồ sơ + thẻ "Nhận tin báo cho phản ánh này"; `k` sai → dòng "Link theo dõi không đúng…", không có khối chủ; mã bí mật ẩn mặc định, nút "Hiện" |
| CT-050 | A01 | Hai hồ sơ quá hạn lên đầu với chữ "Quá hạn"; cờ "Nghi trùng" ở 4 hồ sơ thuộc 2 cụm; tìm "TB-0012" lọc đúng; tab "Đã xử lý" = 47 hàng; lọc Nguồn "Ẩn danh" = 6 hàng, có cờ "Ẩn danh" |
| CT-051 | A02 | Hồ sơ `moi` chỉ hiện nút hợp lệ (Tiếp nhận, Giao TNV, Yêu cầu bổ sung, Chuyển cơ quan); bộ phận và hạn điền sẵn đúng loại; "Yêu cầu bổ sung" với lý do 5 ký tự → nút tắt; SĐT hiển thị dạng che; hồ sơ ẩn danh `moi` hiện gợi ý "nên giao TNV xác minh trước khi xử lý" và nhãn "Ẩn danh" thay SĐT |
| CT-052 | Tạo hộ | Thiếu SĐT → không lưu; lưu → hàng mới trong bảng có nhãn "Gửi hộ"; hiện SmsPreview mã |
| CT-053 | A03 | Không ảnh → Xác nhận tắt + lý do; có ảnh + mô tả → xem trước Trước/Sau; xác nhận → status `hoan_thanh` |
| CT-054 | Gộp | Khối tương tự liệt kê đúng hồ sơ cùng cụm; modal nêu rõ hồ sơ chính/phụ; sau gộp hồ sơ phụ biến mất khỏi tab "Cần xử lý" |
| CT-055 | Tách | Nút "Tách" trên hồ sơ chính → hồ sơ phụ trở lại bảng với trạng thái cũ |
| CT-056 | Bàn phím A01 | Tab tới bảng, mũi tên chọn hàng, Enter mở panel, Esc đóng và trả focus về hàng |
| CT-060 | V01 | TNV "Lê Thảo Vy" thấy nhiệm vụ của mình + nhiệm vụ mở; nhãn "Xác minh ban đầu"/"Nghiệm thu sau xử lý"; tab "Đã xong" |
| CT-061 | V02 | Chưa trả lời Câu 1 → Gửi tắt; Câu 1 "Có" mà chưa chọn mức độ → tắt; chưa ảnh → tắt; đủ → gửi, quay lại V01; không có nút đóng hồ sơ |
| CT-072 | Reset / demoNow | Reset hỏi xác nhận; đổi demoNow sang 30/11 → số "Quá hạn" ở A01 tăng |
| CT-073 | Nhảy bước | "Tới bước: Đã giao xử lý" đặt hồ sơ demo về `da_giao` kèm timeline hợp lệ |

---

## 4. End-to-end (E2E)

| ID | Kịch bản | Viewport | Kết quả mong đợi |
|---|---|---|---|
| E2E-00 | Mở lần lượt 14 route | cả hai | Mỗi route có tiêu đề đúng, không lỗi console |
| E2E-01 | Người dân gửi mới: C01 → C02 (ảnh manifest `mat_duong`) → C03 (mock GPS trong phường) → C04 (loại chọn sẵn, không trùng) → OTP → thành công → C06 | mobile | Mã `TB-0065`, C06 hiện bước 1 "Đã gửi", có 1 thông báo |
| E2E-02 | Người cao tuổi "Tôi cũng gặp": bật chữ lớn → gửi tại tọa độ hồ sơ demo → hộp trùng → "Tôi cũng gặp" → OTP | mobile | Không tạo hồ sơ mới; hồ sơ demo followers = 3, ưu tiên Cao; C05 hiện hồ sơ với nhãn "Đang theo dõi" |
| E2E-03 | Cán bộ xử lý trọn: A01 mở hồ sơ demo → Giao xử lý → A03 ảnh + mô tả → Hoàn thành | desktop | Hồ sơ `hoan_thanh`; người dân (cùng localStorage) có thông báo "đã xử lý xong" |
| E2E-04 | Gộp cụm trùng 1 rồi tách | desktop | Sau gộp: 1 hồ sơ `da_gop`; sau tách: trở về như cũ |
| E2E-05 | Mở lại → nghiệm thu: người dân "Chưa giải quyết" → TNV V01 thấy nhiệm vụ nghiệm thu → V02 gửi → A02 thấy kết quả | mobile + desktop | Task `xong`; A02 hiển thị kết quả nghiệm thu |
| E2E-07 | Ẩn danh → nhận tin sau: khung trái gửi ẩn danh → lưu link → khung phải CB tiếp nhận → khung trái mở C05 thấy "Đã tiếp nhận" (không có SMS) → "Nhận tin báo cho phản ánh này" + OTP → CB hoàn thành → khung trái nhận thông báo "đã xử lý xong" | Demo Hub | Hồ sơ giữ `anonymous` true; chỉ sau khi đăng ký mới có SMS mô phỏng |
| E2E-06 | Demo Hub: thao tác "Tiếp nhận" ở khung phải | desktop 1440 | Khung trái (C06 hồ sơ đó) đổi sang "Đã tiếp nhận" trong ≤ 1 giây |

Mock GPS trong Playwright: `context.setGeolocation({ latitude: 10.9505, longitude: 106.8225 })` + `grantPermissions(['geolocation'])`.

---

## 5. Accessibility (A11Y)

| ID | Kiểm tra |
|---|---|
| A11Y-001 | axe-core: 0 vi phạm `serious`/`critical` trên mọi route, cả chế độ thường và chữ lớn |
| A11Y-002 | Tương phản: chữ ≥ 4.5:1, thành phần UI ≥ 3:1 (axe + kiểm tay bảng màu trạng thái) |
| A11Y-003 | Phóng to 200% ở 360px: không mất nội dung, không cuộn ngang |
| A11Y-004 | Mọi trạng thái hiển thị có chữ (kiểm bằng chế độ grayscale) |
| A11Y-005 | Dashboard thao tác được hoàn toàn bằng bàn phím (CT-056) |
| A11Y-006 | `prefers-reduced-motion: reduce` → không còn animation chuyển màn |

---

## 6. Checklist thủ công

### MT-SR – Chế độ chữ lớn (T-074)
- [ ] C01–C06: mỗi màn chỉ 1 nút chính.
- [ ] Từ ngữ theo bảng spec 7.4.
- [ ] Gửi phản ánh không cần chạm bản đồ.
- [ ] Không có chữ < 20px ở thân bài.

### MT-ST – Trạng thái phụ (T-080)
- [ ] GPS từ chối → nhập địa chỉ.
- [ ] Mất mạng khi gửi → lưu nháp, thử lại.
- [ ] Cảnh báo trùng.
- [ ] Gửi thành công kèm mã.
- [ ] Danh sách trống (C05, V01).
- [ ] Cần bổ sung / đã gộp / chuyển cơ quan khác (C06).
- [ ] Chưa giải quyết → mở lại.
- [ ] Gửi ẩn danh: cảnh báo, màn thành công có mã bí mật + QR, quota 5/ngày.
- [ ] Link theo dõi sai mã bí mật.
- [ ] Đăng ký / huỷ nhận tin cho hồ sơ ẩn danh.
- [ ] Quá hạn / sắp đến hạn (A01).
- [ ] Bản đồ lỗi → danh sách (C07).

---

## 7. Ma trận thiết bị (MT-DEV)

| Thiết bị | Trình duyệt | GPS | Camera | Giọng nói | Mở từ Zalo |
|---|---|:---:|:---:|:---:|:---:|
| Android (Chrome) | Chrome | [ ] | [ ] | [ ] | [ ] |
| iPhone (Safari) | Safari | [ ] | [ ] | [ ] (có thể không hỗ trợ – nút phải ẩn) | [ ] |
| MacBook | Chrome | [ ] | – | – | – |
| Laptop trình chiếu | Chrome, 1440px và 1280px | – | – | – | – |

Ghi chú lỗi ngay vào bảng; lỗi chặn demo → tạo task mới trong `tasks.md`.

---

## 8. Thử nghiệm người dùng nhanh (UX)

5 người, trong đó ≥ 2 người trên 60 tuổi; không hướng dẫn trước; ghi thời gian và chỗ vướng.

| ID | Nhiệm vụ | Mục tiêu |
|---|---|---|
| UX-001 | "Báo cái ổ gà trước nhà bác" | Hoàn thành; người dùng phổ thông < 60 giây |
| UX-002 | "Xem phản ánh của bác đang tới đâu rồi" | Nói đúng nhãn trạng thái và ngày dự kiến |
| UX-003 | "Phường báo sửa xong, bác thấy chưa ổn – báo lại" | Tìm được nút "Chưa giải quyết" |
| UX-004 | "Báo mà không muốn để lại số điện thoại, rồi hôm sau xem lại" | Tìm được link gửi ẩn danh; hôm sau tìm lại được hồ sơ (máy tự nhớ hoặc link đã lưu) |

Kết quả ghi vào `docs/ux-test-results.md` (tạo khi làm T-086), trình bày trên slide là **thử nghiệm sơ bộ**.
