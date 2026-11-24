# SPEC – Trấn Biên Kết Nối (UI/UX Prototype)

Phiên bản: 1.1 (bổ sung gửi ẩn danh) · Nguồn: `proposal_v2.1.md`  
Nhãn: **[ĐỀ]** yêu cầu BTC · **[GĐ]** giả định thiết kế · **[KC]** cần kiểm chứng

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

Prototype web tương tác thể hiện trọn vòng đời một phản ánh hiện trường: người dân gửi → cán bộ tiếp nhận, phân loại, giao xử lý → TNV xác minh → cán bộ cập nhật kết quả kèm ảnh → người dân xem, đánh giá hoặc mở lại → kết quả công khai.

### 1.2. Trong phạm vi

| Hạng mục | Mức độ |
|---|---|
| 13 màn hình + trạng thái phụ + Demo Hub | Đầy đủ, tương tác được |
| Bản đồ OpenStreetMap, GPS trình duyệt | Thật |
| Chụp/chọn ảnh, nén ảnh phía client | Thật |
| Lưu dữ liệu | localStorage (mock) |
| Phân loại ảnh AI | Mô phỏng theo bộ ảnh demo |
| OTP, SMS/Zalo, tổng đài | Mô phỏng |
| Gửi ẩn danh, máy tự nhớ phản ánh, link theo dõi + QR, đăng ký nhận tin sau | Đầy đủ |
| Chia sẻ link | Web Share API; không hỗ trợ → sao chép link |
| Giọng nói → chữ | Web Speech API, ẩn nếu không hỗ trợ |
| Chế độ chữ lớn | Đầy đủ |

### 1.3. Ngoài phạm vi

Backend, database, xác thực thật, gửi tin nhắn thật, AI thật, phân quyền bảo mật thật, đa ngôn ngữ, thông báo đẩy (web push).

---

## 2. Vai trò

| Mã | Vai trò | Thiết bị | Đăng nhập trong demo |
|---|---|---|---|
| ND | Người dân | Mobile 390px | Không bắt buộc. Gửi bằng SĐT + OTP mô phỏng (`123456`) **hoặc** ẩn danh |
| CB | Cán bộ tiếp nhận | Desktop 1440px | Chọn vai trò ở Demo Hub, không cần mật khẩu |
| TNV | Thanh niên tình nguyện | Mobile 390px | Chọn TNV mẫu ở Demo Hub |

Tài khoản mẫu **[GĐ]**:
- CB: "Nguyễn Văn Minh – Cán bộ tiếp nhận".
- TNV: "Lê Thảo Vy", "Trần Quốc Bảo", "Phạm Ngọc Hân".
- ND demo: "Ông Tư" – SĐT `0909 000 068`.

---

## 3. Mô hình nghiệp vụ

### 3.1. Loại sự cố [ĐỀ]

| Mã | Nhãn | Icon (Lucide) | Bộ phận gợi ý [GĐ] | Hạn mặc định [GĐ] |
|---|---|---|---|---|
| `den_duong` | Đèn đường | `Lightbulb` | Phòng KT-HT&ĐT – Đội chiếu sáng công cộng | 3 ngày |
| `ngap_nuoc` | Ngập nước | `Droplets` | Phòng KT-HT&ĐT – Đội thoát nước | 2 ngày |
| `rac_thai` | Rác thải | `Trash2` | Bộ phận Môi trường – Đội vệ sinh môi trường | 2 ngày |
| `mat_duong` | Mặt đường | `Construction` | Phòng KT-HT&ĐT – Đội duy tu đường | 5 ngày |

Danh sách bộ phận chọn được ở A02 (đủ 5): 4 bộ phận trên + "Khu phố (tổ dân phố)".

### 3.2. Trạng thái nội bộ và nhãn công khai

| Mã nội bộ | Nhãn CB | Nhãn công khai | Bước tiến trình (1–4) | Màu | Icon |
|---|---|---|---|---|---|
| `moi` | Mới | Đã gửi | 1 | xám | `Send` |
| `da_tiep_nhan` | Đã tiếp nhận | Đã tiếp nhận | 2 | xanh dương | `Inbox` |
| `cho_xac_minh` | Chờ xác minh | Đã tiếp nhận · Đang kiểm tra tại chỗ | 2 | xanh dương | `Search` |
| `da_giao` | Đã giao xử lý | Đang xử lý | 3 | cam | `Wrench` |
| `hoan_thanh` | Hoàn thành – chờ người dân | Đã xử lý | 4 | xanh lá | `CheckCircle2` |
| `dong` | Đã đóng | Đã xử lý | 4 | xanh lá | `CheckCircle2` |
| `mo_lai` | Mở lại | Đang xử lý lại | 3 | cam | `RotateCcw` |
| `can_bo_sung` | Cần bổ sung | Cần bổ sung thông tin | ngoại lệ | vàng | `AlertCircle` |
| `da_gop` | Đã gộp | Đã gộp vào #… | ngoại lệ | tím | `Merge` |
| `chuyen_co_quan` | Chuyển cơ quan khác | Đã chuyển cơ quan khác | ngoại lệ | xám | `ArrowRightLeft` |
| `khong_xac_nhan` | Không xác nhận được | Không xác nhận được sự cố | ngoại lệ | xám | `XCircle` |

"Đã xử lý" trong KPI = `hoan_thanh` + `dong`.

### 3.3. Chuyển trạng thái hợp lệ

| Từ | Sang | Người thực hiện | Điều kiện bắt buộc |
|---|---|---|---|
| `moi` | `da_tiep_nhan` | CB | Đã xác nhận loại + bộ phận + hạn |
| `moi`, `da_tiep_nhan` | `cho_xac_minh` | CB | Chọn TNV |
| `cho_xac_minh` | `da_tiep_nhan` | Hệ thống | TNV gửi kết quả "Có sự cố" |
| `cho_xac_minh` | `khong_xac_nhan` | CB | TNV gửi "Không có" / "Không tìm thấy"; CB xác nhận |
| `da_tiep_nhan`, `mo_lai` | `da_giao` | CB | Có bộ phận + hạn |
| `da_giao` | `hoan_thanh` | CB | ≥ 1 ảnh sau + mô tả công việc ≥ 10 ký tự |
| `hoan_thanh` | `dong` | Hệ thống | ND chọn "Đã giải quyết" + đánh giá; hoặc 7 ngày không phản hồi [GĐ] |
| `hoan_thanh` | `mo_lai` | Hệ thống | ND chọn "Chưa giải quyết" → sinh nhiệm vụ nghiệm thu |
| `mo_lai` | `dong` | CB | TNV nghiệm thu xác nhận đã ổn; CB đóng kèm lý do |
| `moi`, `da_tiep_nhan` | `can_bo_sung` | CB | Lý do bắt buộc |
| `can_bo_sung` | `moi` | ND | Bổ sung ảnh hoặc vị trí |
| bất kỳ trừ `dong`, `da_gop` | `da_gop` | CB | Chọn hồ sơ chính |
| `da_gop` | trạng thái trước khi gộp | CB | Thao tác "Tách" |
| `moi`, `da_tiep_nhan` | `chuyen_co_quan` | CB | Tên cơ quan + lý do |

Mọi chuyển trạng thái phải: (1) thêm 1 mục timeline; (2) sinh thông báo cho người gửi và người theo dõi nếu nhãn công khai thay đổi.

### 3.4. Thông báo

| Sự kiện | Nội dung mẫu |
|---|---|
| Gửi thành công | "Phường Trấn Biên đã nhận phản ánh #{id}. Bạn sẽ nhận tin khi có cập nhật." |
| → Đã tiếp nhận | "Phản ánh #{id} đã được tiếp nhận. Dự kiến xử lý trước {ngày}." |
| → Đang xử lý | "#{id} đã giao {bộ phận}, hạn {ngày}." |
| → Đã xử lý | "#{id} đã xử lý xong. Mời bạn xem ảnh kết quả và đánh giá." |
| → Cần bổ sung | "#{id} cần bổ sung: {lý do}." |
| → Đã gộp | "#{id} được gộp vào #{idChính} cùng {n} người. Bạn sẽ nhận cập nhật của hồ sơ chung." |
| → Mở lại | "Phường đã nhận ý kiến về #{id} và sẽ kiểm tra lại." |

| Đăng ký nhận tin (hồ sơ ẩn danh) | "Bạn đã đăng ký nhận tin cho #{id}. Số này chỉ dùng cho phản ánh này." |

Người nhận: mọi SĐT trong `followers` của hồ sơ (và của hồ sơ đã gộp vào nó). Hồ sơ ẩn danh chưa đăng ký nhận tin không sinh thông báo SMS; thay đổi vẫn hiện trong C05/C06 của thiết bị đã gửi.

Hiển thị: chuông + danh sách trong C05, toast khi có thông báo mới, xem trước dạng tin nhắn SMS có nhãn "Mô phỏng".

### 3.4a. Quyền "chủ hồ sơ" [GĐ]

Người xem có quyền chủ hồ sơ (thấy khối đánh giá, báo chưa giải quyết, bổ sung, đăng ký nhận tin) khi **một trong** các điều kiện đúng:
1. SĐT đã xác thực trên thiết bị nằm trong `followers` của hồ sơ.
2. Thiết bị có cặp `{id, secretCode}` của hồ sơ trong `settings.deviceReports`.
3. URL có tham số `k` khớp `secretCode` (`/phan-anh/TB-0066?k=4821`); khi mở bằng link này, cặp `{id, secretCode}` được thêm vào `deviceReports`.
4. Tra cứu thành công bằng mã + 4 số cuối SĐT hoặc mã + mã bí mật.

Mọi hồ sơ (có SĐT hay ẩn danh) đều có `secretCode` và được lưu vào `deviceReports` khi gửi từ thiết bị đó.

### 3.4b. Gửi ẩn danh [GĐ]

- Giới hạn 5 hồ sơ ẩn danh/thiết bị/ngày (đếm theo `settings.anonymousLog`); vượt giới hạn → thông báo bằng lời + gợi ý gửi có SĐT.
- Hồ sơ ẩn danh: `anonymous: true`, `reporterPhone` rỗng.
- "Tôi cũng gặp" ẩn danh: tăng `anonymousFollows`, không thêm vào `followers`.
- Đăng ký nhận tin sau: SĐT xác thực OTP được thêm vào `followers` của **riêng hồ sơ đó**, `subscribedLater: true`; hồ sơ vẫn giữ `anonymous: true` với cộng đồng và cán bộ thấy nhãn "Ẩn danh · đã đăng ký nhận tin".

### 3.5. Phát hiện trùng [GĐ]

Hồ sơ B nghi trùng với hồ sơ đang tạo/hồ sơ A khi **tất cả** đúng:
- Cùng `category`.
- Khoảng cách Haversine ≤ 50 m.
- `createdAt` của B trong 14 ngày gần nhất.
- B không ở trạng thái `dong`, `da_gop`, `chuyen_co_quan`, `khong_xac_nhan`.

Kết quả sắp xếp theo khoảng cách tăng dần, tối đa 3.

### 3.6. Ưu tiên và sắp xếp

- Số người cùng báo `followerCount = followers.length + anonymousFollows` (người gửi ẩn danh tính là 1 trong `anonymousFollows`).
- Ưu tiên `cao` khi `followerCount ≥ 3` hoặc CB đặt tay; mặc định `binh_thuong`.
- Hồ sơ "quá hạn": `dueAt < now` và trạng thái thuộc {`da_tiep_nhan`, `cho_xac_minh`, `da_giao`, `mo_lai`}.
- Hồ sơ "sắp đến hạn": `0 ≤ dueAt − now ≤ 24h`, cùng tập trạng thái.
- Thứ tự A01 mặc định: quá hạn → sắp đến hạn → `moi` → còn lại; trong nhóm sắp `dueAt` tăng dần, rồi `createdAt` giảm dần.
- "Hiện tại" của demo cố định: **24/11/2026 09:00 (UTC+7)**, có thể chỉnh trong Demo Hub.

---

## 4. Mô hình dữ liệu

### 4.1. Report

| Trường | Kiểu | Công khai | Ghi chú |
|---|---|:---:|---|
| `id` | string `TB-0001` | ✓ | Tăng dần; hồ sơ mới bắt đầu `TB-0065` |
| `category` | enum 3.1 | ✓ | |
| `photos` | string[] (dataURL hoặc đường dẫn `/demo-photos/...`) | ✓* | *Chỉ khi `photosApproved` |
| `photosApproved` | boolean | – | Mock data: true |
| `lat`, `lng` | number | ✓ | |
| `address` | string | ✓ | |
| `locationNote` | string? | ✓ | |
| `description` | string? | ✓ | |
| `createdAt` | ISO string | ✓ | |
| `status` | enum 3.2 | ✓ (qua nhãn công khai) | |
| `statusBeforeMerge` | enum? | – | Dùng khi tách |
| `priority` | `cao` \| `binh_thuong` | – | |
| `department` | string? | ✓ | |
| `dueAt` | ISO string? | ✓ (dạng "trước ngày …") | |
| `reporterPhone` | string? | **✗** | Rỗng khi ẩn danh. Không bao giờ render ngoài C05 của chính người đó và A02 (che giữa: `0909 *** 068`) |
| `anonymous` | boolean | – | Gửi ẩn danh |
| `subscribedLater` | boolean | – | Hồ sơ ẩn danh đã đăng ký nhận tin sau |
| `secretCode` | string 4 số | **✗** | Không bao giờ render ngoài màn thành công, C06 của chủ hồ sơ và link theo dõi |
| `onBehalf` | boolean | – | Gửi hộ |
| `followers` | string[] (SĐT) | – | Gồm người gửi có SĐT, người "tôi cũng gặp" có SĐT, người đăng ký nhận tin sau; UI chỉ hiện số lượng |
| `anonymousFollows` | number | – | Số người ẩn danh cùng báo (gồm người gửi ẩn danh) |
| `mergedInto` | string? | ✓ | |
| `mergedChildren` | string[] | – | |
| `suspectedDuplicateOf` | string[] | – | Cờ cho CB |
| `resultPhotos` | string[] | ✓ | |
| `resultNote` | string? | ✓ | |
| `completedAt` | ISO string? | ✓ | Thời điểm vào `hoan_thanh` lần đầu |
| `feedback` | `{ resolved: boolean, rating?: 1-5, comment?: string, at: ISO }`? | ✓ (rating) | |
| `timeline` | `{ at, status, actor, note? }[]` | ✓ (bỏ `actor` nội bộ) | |

### 4.2. VolunteerTask

| Trường | Kiểu |
|---|---|
| `id` | `NV-001` |
| `reportId` | string |
| `type` | `xac_minh` \| `nghiem_thu` |
| `assignee` | tên TNV hoặc `null` (mở cho TNV gần nhất) |
| `status` | `cho_nhan` \| `dang_lam` \| `xong` |
| `result` | `{ exists: 'co' \| 'khong' \| 'khong_tim_thay', severity?: 'nhe' \| 'trung_binh' \| 'nguy_hiem', photo: string, note?: string, at: ISO }`? |

### 4.3. Notification

`{ id, phone, reportId, message, createdAt, read: boolean, channel: 'app' | 'sms_mo_phong' }`

### 4.4. Settings (localStorage, theo thiết bị)

`{ seniorMode: boolean, phone?: string, demoNow: ISO, deviceReports: { id: string, secretCode: string }[], anonymousLog: ISO[] }`

`deviceReports` là cơ chế "máy tự nhớ": xoá dữ liệu trình duyệt sẽ mất, nên link theo dõi và mã bí mật là dự phòng.

---

## 5. Dữ liệu mẫu

### 5.1. Bất biến [ĐỀ]

| Chỉ số | Giá trị |
|---|---|
| Tổng tháng 11/2026 | 64 |
| Đèn đường / Ngập nước / Rác thải / Mặt đường | 18 / 15 / 21 / 10 |
| Đã xử lý (`hoan_thanh` + `dong`) | 47 |
| Chưa hoàn tất | 17 |
| Trung bình (`completedAt − createdAt`) của 47 hồ sơ | 3,2 ngày (tổng 150,4 ngày) |

### 5.2. Phân bổ [GĐ]

| Loại | Đã xử lý | Chưa hoàn tất |
|---|---:|---:|
| Đèn đường | 13 | 5 |
| Ngập nước | 11 | 4 |
| Rác thải | 16 | 5 |
| Mặt đường | 7 | 3 |
| **Tổng** | **47** | **17** |

47 đã xử lý: 40 `dong` (có feedback), 7 `hoan_thanh` (chưa feedback).  
17 chưa hoàn tất: `moi` 4, `da_tiep_nhan` 4, `cho_xac_minh` 3, `da_giao` 4 (trong đó 2 quá hạn), `can_bo_sung` 1, `mo_lai` 1.

### 5.3. Quy tắc sinh

- Generator có seed cố định → dữ liệu giống nhau mỗi lần build.
- `createdAt` trong 01/11–23/11/2026; `completedAt ≤ demoNow`.
- Thời gian xử lý từng hồ sơ trong khoảng 0,5–8 ngày; hồ sơ cuối được hiệu chỉnh để tổng đúng 150,4 ngày.
- Tọa độ trong khung ranh giới gần đúng của phường Trấn Biên: lat 10.925–10.975, lng 106.790–106.860 [KC – kiểm tra trên bản đồ, loại điểm rơi xuống sông].
- Tâm phường dùng làm mặc định bản đồ: `10.950, 106.822` [KC].
- Có sẵn **2 cụm nghi trùng** trong nhóm chưa hoàn tất (mỗi cụm 2 hồ sơ cùng loại, cách 20–45 m).
- Hồ sơ cho kịch bản demo: 1 hồ sơ `mat_duong` `da_tiep_nhan` có 2 followers, đặt gần tâm phường, để ông Tư bấm "Tôi cũng gặp".
- Địa chỉ dùng tên đường có thật trong phường (ví dụ: Cách Mạng Tháng Tám, Hưng Đạo Vương, Nguyễn Văn Trị, Phan Đình Phùng, Huỳnh Văn Nghệ) [KC].
- Rating của 40 hồ sơ `dong` là dữ liệu mô phỏng; mọi chỗ hiển thị điểm hài lòng phải gắn nhãn "Dữ liệu mô phỏng".
- 3 VolunteerTask có sẵn cho 3 hồ sơ `cho_xac_minh`.
- 6 hồ sơ `anonymous: true` (3 rác thải, 1 mỗi loại còn lại) phân bổ ở cả nhóm đã xử lý và chưa hoàn tất; đúng 1 hồ sơ ẩn danh có `subscribedLater: true`.
- Mọi hồ sơ có `secretCode` 4 số sinh theo seed.

### 5.4. Ảnh demo

- `public/demo-photos/{category}/` mỗi loại ≥ 4 ảnh do nhóm tự chụp; không mặt người, không biển số.
- `public/demo-photos/manifest.json`: tên file → `category` (dùng cho AI mô phỏng).
- Ảnh sau xử lý: `public/demo-photos/after/`.

---

## 6. Màn hình và tiêu chí chấp nhận

Quy ước ID tiêu chí: `AC-<màn>-<số>`.

### C01 – Trang chủ người dân

- AC-C01-1: Có 4 nút lớn theo thứ tự: **Báo sự cố**, **Phản ánh của tôi**, **Quanh đây**, **Kết quả của phường**; mỗi nút có icon + nhãn.
- AC-C01-2: Nút "Aa Chữ lớn" ở góc trên; bật/tắt có hiệu lực toàn app và được ghi nhớ.
- AC-C01-3: Dải số liệu nhỏ: "Tháng 11: 47/64 phản ánh đã xử lý" – tính từ dữ liệu.
- AC-C01-4: Chân trang: nút "Gọi tổng đài phường" (mô phỏng: mở modal hiển thị số giả định và nhãn "Mô phỏng").
- AC-C01-5: Không yêu cầu đăng nhập.

### C02 – Bước 1: Chụp ảnh

- AC-C02-1: Thanh bước "1 Ảnh · 2 Vị trí · 3 Loại" hiện bước hiện tại bằng số + chữ + màu.
- AC-C02-2: Nút "Chụp ảnh" dùng `capture="environment"`; nút "Chọn ảnh có sẵn" không có `capture`.
- AC-C02-3: Tối đa 3 ảnh; ảnh được nén về cạnh dài ≤ 1280px, JPEG chất lượng 0,7; xem trước, xoá từng ảnh.
- AC-C02-4: "Tiếp tục" chỉ bật khi có ≥ 1 ảnh.
- AC-C02-5: AI mô phỏng: nếu tên file khớp manifest → hiện "Có vẻ là: {loại} · Mô phỏng"; không khớp → "Chưa nhận diện được – bạn sẽ chọn ở bước 3".
- AC-C02-6: Ảnh lỗi định dạng hoặc > 15MB trước nén → thông báo lỗi bằng lời và cách khắc phục.
- AC-C02-7: Thoát giữa chừng → hỏi "Lưu nháp?"; nháp được khôi phục khi quay lại.

### C03 – Bước 2: Vị trí

- AC-C03-1: Vào màn → xin quyền GPS. Đồng ý → ghim tại vị trí, bản đồ zoom 17.
- AC-C03-2: GPS cách tâm phường > 5 km → banner "Bạn đang ở ngoài phường Trấn Biên. Dùng vị trí mẫu trong phường?" [Dùng vị trí mẫu] [Giữ vị trí của tôi].
- AC-C03-3: Từ chối GPS / lỗi / quá 10 giây → banner giải thích + ô "Nhập địa chỉ hoặc tên đường" (gợi ý từ danh sách đường trong dữ liệu mẫu, không gọi API geocoding) + nút "Chọn trên bản đồ".
- AC-C03-4: Chạm bản đồ để dời ghim; không bắt buộc kéo.
- AC-C03-5: Hiện địa chỉ dạng chữ dưới bản đồ (đường gần nhất trong danh sách đường mẫu).
- AC-C03-6: Ô "Mô tả thêm vị trí" tùy chọn, tối đa 120 ký tự.
- AC-C03-7: Chế độ chữ lớn: nút chính là "Tôi đang đứng ở chỗ bị hư", bản đồ thu nhỏ còn 40% chiều cao.
- AC-C03-8: Có attribution "© OpenStreetMap contributors".

### C04 – Bước 3: Loại, xác nhận, gửi

- AC-C04-1: 4 thẻ loại dạng lưới 2×2, mỗi thẻ ≥ 96px cao, icon + nhãn; thẻ AI gợi ý được chọn sẵn và có huy hiệu "Gợi ý".
- AC-C04-2: Mô tả tùy chọn ≤ 300 ký tự; nút micro chỉ hiện khi trình duyệt hỗ trợ `SpeechRecognition` (lang `vi-VN`).
- AC-C04-3: Khi đã chọn loại → chạy kiểm tra trùng (3.5). Có kết quả → hộp "Đã có {n} người báo {loại} cách bạn khoảng {x} m" + ảnh + 2 nút: **"Đúng chỗ này – tôi cũng gặp"**, **"Không phải – gửi phản ánh mới"**.
- AC-C04-4: Tóm tắt ảnh, vị trí, loại trên cùng màn hình; nút "Sửa" quay lại đúng bước.
- AC-C04-5: Bấm Gửi (hoặc "tôi cũng gặp") khi chưa có SĐT → bottom sheet nhập SĐT (10 số, bắt đầu bằng 0) → OTP; mã đúng `123456` (hiện gợi ý "Mã demo: 123456 · Mô phỏng"). Ô nhập có dòng "Số điện thoại chỉ dùng để báo tin cho bạn, không bao giờ hiển thị công khai." Đã xác thực trước đó → bỏ qua.
- AC-C04-6: Gửi thành công → trạng thái thành công trong cùng route: mã `TB-xxxx` cỡ ≥ 32px, câu "Bạn sẽ nhận tin nhắn khi có cập nhật", nút "Theo dõi phản ánh" → C06. Cặp `{id, secretCode}` được thêm vào `deviceReports`.
- AC-C04-7: "Tôi cũng gặp" → không tạo hồ sơ mới; có SĐT → thêm vào `followers`; ẩn danh → `anonymousFollows + 1`; `followerCount ≥ 3` → priority `cao`; màn thành công hiện mã hồ sơ cũ.
- AC-C04-10: Dưới nút chính có link "Gửi không để lại số điện thoại". Bấm → sheet cảnh báo: "Bạn sẽ không nhận được tin báo. Máy này sẽ tự nhớ phản ánh; hãy lưu link theo dõi để xem trên máy khác." [Gửi ẩn danh] [Để lại số điện thoại]. Chế độ chữ lớn giữ nguyên link này (không ẩn vào "Thêm").
- AC-C04-11: Thành công khi ẩn danh: mã phản ánh, **mã bí mật 4 số** (≥ 28px), mã QR của link theo dõi `{origin}/phan-anh/{id}?k={secretCode}`, nút "Lưu link theo dõi" (Web Share API; không hỗ trợ → sao chép + toast "Đã sao chép link"), dòng nhắc "Máy này sẽ tự nhớ phản ánh của bạn. Đổi máy thì mở link đã lưu.", nút phụ "Nhận tin báo cho phản ánh này".
- AC-C04-12: Vượt 5 hồ sơ ẩn danh/ngày trên thiết bị → sheet "Hôm nay bạn đã gửi 5 phản ánh ẩn danh. Vui lòng để lại số điện thoại để gửi tiếp." chỉ còn lựa chọn có SĐT.
- AC-C04-8: "Gửi phản ánh mới" khi có nghi trùng → hồ sơ mới có `suspectedDuplicateOf`.
- AC-C04-9: Mất mạng (`navigator.onLine === false`) khi gửi → giữ nháp, banner "Chưa gửi được – sẽ thử lại khi có mạng", nút "Thử lại".

### C05 – Phản ánh của tôi

- AC-C05-1: Luôn hiện ngay mục "Gửi từ máy này" (từ `deviceReports`), không cần đăng nhập. Bên dưới 2 lựa chọn: "Đăng nhập bằng số điện thoại" (OTP mô phỏng) và "Tra cứu bằng mã phản ánh" (mã + 4 số cuối SĐT **hoặc** mã + mã bí mật – một ô 4 số chấp nhận cả hai).
- AC-C05-6: Mục "Gửi từ máy này" có dòng chú thích "Xoá dữ liệu trình duyệt sẽ mất danh sách này – hãy lưu link theo dõi." và mỗi thẻ có nút "Lưu link".
- AC-C05-2: Danh sách thẻ: ảnh, loại, nhãn công khai (icon + chữ + màu), "Dự kiến trước {ngày}" nếu có; gồm hồ sơ đã gửi và đang theo dõi (ghi "Đang theo dõi").
- AC-C05-3: Bộ lọc: Tất cả / Đang xử lý / Đã xử lý.
- AC-C05-4: Trạng thái trống: minh hoạ + "Bạn chưa có phản ánh nào" + nút "Báo sự cố".
- AC-C05-5: Chuông thông báo có số chưa đọc; mở danh sách thông báo; mỗi thông báo có nút "Xem tin nhắn mẫu" hiển thị khung SMS "Mô phỏng".

### C06 – Chi tiết phản ánh

- AC-C06-1: Thanh tiến trình 4 bước theo nhãn công khai; trạng thái ngoại lệ hiện băng màu riêng + lý do.
- AC-C06-2: Dòng giải thích dưới tiến trình, ví dụ "Đã giao Đội duy tu đường · Dự kiến xong trước 27/11".
- AC-C06-3: Timeline đảo ngược thời gian; không lộ tên cán bộ, chỉ "Phường Trấn Biên" / "Tình nguyện viên".
- AC-C06-4: Khi có `resultPhotos`: khối "Trước / Sau" 2 ảnh cạnh nhau, chạm để phóng to.
- AC-C06-5: Trạng thái `hoan_thanh` và người xem là người gửi/theo dõi → khối "Vấn đề đã được giải quyết chưa?" [Đã giải quyết] [Chưa giải quyết].
  - Đã giải quyết → 5 mặt cười có nhãn chữ + góp ý tùy chọn → Gửi → `dong`.
  - Chưa giải quyết → ảnh hiện trạng tùy chọn + ghi chú → `mo_lai` + tạo VolunteerTask `nghiem_thu`.
- AC-C06-6: `da_gop` → banner "Đã gộp vào #{id} cùng {n} người" + link sang hồ sơ chính.
- AC-C06-7: `can_bo_sung` → nút "Bổ sung ngay" mở lại C02/C03 với dữ liệu cũ.
- AC-C06-8: Người không có quyền chủ hồ sơ (3.4a) xem được (từ C07/C08) nhưng không thấy khối đánh giá; có nút "Tôi cũng gặp vấn đề này" nếu hồ sơ chưa đóng.
- AC-C06-9: Hồ sơ `anonymous` + người xem có quyền chủ hồ sơ + chưa có SĐT trong `followers` → thẻ "Nhận tin báo cho phản ánh này" với câu "Số điện thoại chỉ dùng cho phản ánh này." → OTP → `subscribedLater: true`, thông báo xác nhận; thẻ đổi thành "Đang nhận tin qua 0909 *** 068 · Huỷ". Huỷ → gỡ SĐT khỏi `followers`, `subscribedLater: false`.
- AC-C06-10: Mở bằng link có `k` sai → xem như người ngoài, hiện dòng "Link theo dõi không đúng – hãy kiểm tra lại mã bí mật." (không tiết lộ hồ sơ có tồn tại mã hay không ngoài nội dung công khai).
- AC-C06-11: Chủ hồ sơ thấy nút "Lưu link theo dõi" và mã bí mật (ẩn mặc định, nút "Hiện").

### C07 – Bản đồ quanh tôi

- AC-C07-1: Mặc định tâm theo GPS (nếu đã cấp và trong phường) hoặc tâm phường; vòng tròn bán kính 1 km.
- AC-C07-2: Nút "Toàn phường" bỏ giới hạn bán kính và fit toàn bộ marker.
- AC-C07-3: Marker = icon loại trên nền màu trạng thái + viền; hồ sơ `da_gop` không hiển thị.
- AC-C07-4: Bộ lọc chip: 4 loại (chọn nhiều) + Đang xử lý / Đã xử lý.
- AC-C07-5: Chạm marker → thẻ tóm tắt: ảnh, loại, nhãn trạng thái, "{n} người cùng báo", nút "Xem chi tiết".
- AC-C07-6: Nút chuyển "Bản đồ / Danh sách"; danh sách sắp theo khoảng cách, hiện "cách {x} m".
- AC-C07-7: Không hiện SĐT hoặc tên người gửi ở bất kỳ đâu.
- AC-C07-8: Bản đồ không tải được (tile lỗi) → tự chuyển sang Danh sách + thông báo.

### C08 – Bảng minh bạch phường

- AC-C08-1: 4 thẻ KPI tính từ dữ liệu: Tổng phản ánh · Đã xử lý (kèm %) · Chưa hoàn tất · Thời gian xử lý TB (1 chữ số thập phân, dấu phẩy).
- AC-C08-2: Biểu đồ cột ngang 4 loại, mỗi cột tách Đã xử lý / Chưa hoàn tất, có nhãn số.
- AC-C08-3: Danh sách "Vừa xử lý xong" 6 hồ sơ mới nhất có ảnh trước/sau.
- AC-C08-4: Chú thích nguồn: "Số liệu tháng 11/2026 · Dữ liệu mẫu cuộc thi". Nếu hiển thị điểm hài lòng → thêm "Dữ liệu mô phỏng".
- AC-C08-5: Truy cập không cần đăng nhập; không có thông tin cá nhân.

### A01 – Hộp tiếp nhận cán bộ

- AC-A01-1: Header: tên cán bộ, ô tìm kiếm (mã/địa chỉ), nút "Tạo phản ánh hộ".
- AC-A01-2: 4 thẻ KPI giống C08 + thẻ "Quá hạn" và "Sắp đến hạn" (tính theo 3.6).
- AC-A01-3: Bảng cột: Mã · Ảnh · Loại · Địa chỉ · Trạng thái (nhãn CB) · Bộ phận · Hạn · Người cùng báo · Cờ (Nghi trùng / Ẩn danh / Gửi hộ).
- AC-A01-9: Bộ lọc thêm "Nguồn": Có SĐT / Ẩn danh / Gửi hộ.
- AC-A01-4: Sắp xếp mặc định theo 3.6; hàng quá hạn có nhãn chữ "Quá hạn {n} ngày" + icon, không chỉ tô đỏ.
- AC-A01-5: Cờ "Nghi trùng" khi hồ sơ có `suspectedDuplicateOf` hoặc có hồ sơ khác thỏa 3.5.
- AC-A01-6: Bộ lọc: loại, trạng thái, bộ phận, khoảng ngày; tab nhanh: Cần xử lý / Tất cả / Đã xử lý.
- AC-A01-7: Chọn hàng → mở panel A02 bên phải (≈ 480px), danh sách vẫn thấy.
- AC-A01-8: "Tạo phản ánh hộ" → modal: SĐT người dân, loại, vị trí (bản đồ nhỏ hoặc chọn đường), mô tả, ảnh tùy chọn → hồ sơ `onBehalf: true`, trạng thái `da_tiep_nhan`; hiện tin nhắn mẫu gửi mã cho người dân.

### A02 – Panel chi tiết & giao xử lý

- AC-A02-1: Ảnh (chuyển ảnh), bản đồ nhỏ, địa chỉ, mô tả, SĐT đã che (hoặc nhãn "Ẩn danh" / "Ẩn danh · đã đăng ký nhận tin"), số người cùng báo.
- AC-A02-2: Trường Loại (sửa được), Ưu tiên, Bộ phận (điền sẵn theo 3.1), Hạn (điền sẵn = createdAt + hạn mặc định, chỉnh được bằng date picker).
- AC-A02-3: Nút theo trạng thái (chỉ hiện nút hợp lệ theo 3.3): Tiếp nhận · Giao TNV xác minh · Giao xử lý · Cập nhật kết quả (→ A03) · Yêu cầu bổ sung · Chuyển cơ quan khác · Đóng.
- AC-A02-4: "Giao TNV xác minh" → chọn TNV hoặc "Để TNV gần nhất nhận" → tạo VolunteerTask `xac_minh`.
- AC-A02-5: Khối "Kết quả xác minh" hiện khi task xong: ảnh TNV, 3 câu trả lời.
- AC-A02-6: Khối "Phản ánh tương tự": các hồ sơ thỏa 3.5 + khoảng cách + ảnh; nút "Gộp vào hồ sơ này" → modal xác nhận nêu rõ hồ sơ chính và hồ sơ bị gộp.
- AC-A02-7: Gộp: hồ sơ phụ `da_gop`, `mergedInto` = chính; followers hợp nhất; ảnh phụ thêm vào hồ sơ chính; hồ sơ chính có danh sách "Đã gộp" với nút "Tách".
- AC-A02-8: Nút ngoại lệ yêu cầu nhập lý do (≥ 10 ký tự) trước khi xác nhận.
- AC-A02-9: Tab "Lịch sử": timeline đầy đủ có tên người thao tác.
- AC-A02-10: Hồ sơ ẩn danh ở `moi` → gợi ý "Hồ sơ ẩn danh: nên giao TNV xác minh trước khi xử lý" ngay trên nhóm nút; CB vẫn được bỏ qua. Nút "Yêu cầu bổ sung" với hồ sơ ẩn danh chưa đăng ký nhận tin có cảnh báo "Người gửi sẽ chỉ thấy yêu cầu khi tự mở hồ sơ".

### A03 – Cập nhật kết quả

- AC-A03-1: Mở từ A02 khi trạng thái `da_giao` hoặc `mo_lai`.
- AC-A03-2: Trường: ảnh sau (1–3, bắt buộc), mô tả công việc (≥ 10 ký tự), ngày hoàn thành (mặc định demoNow).
- AC-A03-3: Khối "Người dân sẽ thấy": xem trước khối Trước/Sau của C06.
- AC-A03-4: Xác nhận → `hoan_thanh`, `completedAt` (chỉ set lần đầu), thông báo cho tất cả followers kể cả hồ sơ đã gộp.
- AC-A03-5: Thiếu ảnh hoặc mô tả → nút Xác nhận tắt + chú thích lý do.

### V01 – Nhiệm vụ TNV

- AC-V01-1: Chọn TNV (ở Demo Hub); danh sách gồm nhiệm vụ giao cho mình + nhiệm vụ mở, sắp theo khoảng cách.
- AC-V01-2: Mỗi thẻ: nhãn loại nhiệm vụ "Xác minh ban đầu" / "Nghiệm thu sau xử lý", loại sự cố, địa chỉ, khoảng cách.
- AC-V01-3: Tab: Cần làm / Đã xong. Trống → "Hiện chưa có nhiệm vụ".

### V02 – Xác minh tại chỗ

- AC-V02-1: Ảnh gốc của người dân, mô tả, bản đồ có ghim; nút "Chỉ đường" mở `https://www.openstreetmap.org/directions?...` hoặc link geo: trên tab mới.
- AC-V02-2: Câu 1: Sự cố có tồn tại? (Có / Không / Không tìm thấy vị trí) – bắt buộc.
- AC-V02-3: Câu 2: Mức độ (Nhẹ / Trung bình / Nguy hiểm) – bắt buộc khi Câu 1 = Có.
- AC-V02-4: Câu 3: Ảnh tại chỗ – bắt buộc; ghi chú tùy chọn.
- AC-V02-5: Gửi → task `xong`; áp dụng chuyển trạng thái 3.3; TNV không thấy nút đóng hồ sơ.

### DEMO – Demo Hub

- AC-DEMO-1: Route `/demo`: khung điện thoại 390×844 bên trái (iframe), khung desktop bên phải (iframe, scale vừa màn hình).
- AC-DEMO-2: Bộ chọn vai trò cho khung trái: Người dân / TNV (chọn tên).
- AC-DEMO-3: Thao tác ở khung này cập nhật khung kia ≤ 1 giây (sự kiện `storage`).
- AC-DEMO-4: Nút "Đặt lại dữ liệu demo" (xác nhận trước khi xoá) và ô chỉnh `demoNow`.
- AC-DEMO-5: Nút "Bỏ qua tới bước…" cho kịch bản 5 phút (ví dụ: đặt hồ sơ demo về `da_giao`).

---

## 7. Yêu cầu chung UI/UX

### 7.1. Responsive

- Người dân/TNV: thiết kế 390px, hoạt động 360–430px; trên desktop hiển thị khung giữa rộng tối đa 430px.
- Cán bộ: thiết kế 1440px, tối thiểu 1280px.

### 7.2. Chế độ chữ lớn

| Thuộc tính | Thường | Chữ lớn |
|---|---|---|
| Cỡ chữ thân bài | 16px | 20px |
| Tiêu đề màn hình | 22px | 28px |
| Chiều cao nút chính | 48px | 56px |
| Vùng chạm tối thiểu | 44×44px | 56×56px |
| Số hành động chính / màn | 1 | 1, ẩn hành động phụ vào "Thêm" |
| Từ ngữ | Chuẩn | Đời thường (bảng 7.4) |

Không mất nội dung khi phóng to 200% (WCAG 1.4.4); không cuộn ngang ở 360px.

### 7.3. Accessibility (mục tiêu WCAG 2.2 AA)

- Tương phản chữ ≥ 4.5:1; thành phần UI ≥ 3:1.
- Trạng thái luôn có icon + chữ.
- Mọi control có nhãn (`aria-label` khi chỉ có icon).
- Focus nhìn thấy được; điều hướng bàn phím đầy đủ trên dashboard.
- Bản đồ luôn có phương án danh sách / nhập chữ.
- `prefers-reduced-motion` tắt animation.

### 7.4. Từ ngữ

| Chuẩn | Chữ lớn |
|---|---|
| Báo sự cố | Báo chỗ bị hư |
| Chọn vị trí | Chỗ bị hư ở đâu? |
| Chọn loại sự cố | Đây là chuyện gì? |
| Gửi phản ánh | Gửi cho phường |

### 7.5. Hệ thống thị giác

| Token | Giá trị |
|---|---|
| Primary | teal-700 `#0F766E` |
| Primary hover | teal-800 `#115E59` |
| Nền | `#F8FAFC` |
| Chữ chính | slate-900 `#0F172A` |
| Chữ phụ | slate-600 `#475569` |
| Trạng thái | xám slate-500 · xanh dương blue-600 · cam orange-600 · xanh lá green-700 · vàng amber-600 · tím violet-600 · đỏ red-700 (chỉ CB) |
| Font | Be Vietnam Pro (self-host qua `@fontsource/be-vietnam-pro`) |
| Bo góc | 12px thẻ, 10px nút |

### 7.6. Định dạng

- Ngày: `dd/MM/yyyy`; giờ 24h; múi giờ UTC+7.
- Số thập phân dùng dấu phẩy: "3,2 ngày".
- Khoảng cách: < 1000 m → "{n} m"; còn lại "{n,n} km".

---

## 8. Route

| Route | Màn |
|---|---|
| `/` | C01 |
| `/bao-su-co/anh` | C02 |
| `/bao-su-co/vi-tri` | C03 |
| `/bao-su-co/xac-nhan` | C04 |
| `/cua-toi` | C05 |
| `/phan-anh/:id` (tùy chọn `?k=<mã bí mật>`) | C06 |
| `/quanh-day` | C07 |
| `/minh-bach` | C08 |
| `/can-bo` | A01 |
| `/can-bo/:id` | A01 + A02 |
| `/can-bo/:id/ket-qua` | A03 |
| `/tnv` | V01 |
| `/tnv/:taskId` | V02 |
| `/demo` | Demo Hub |

---

## 9. Câu hỏi mở

1. Ngưỡng trùng 50 m / 14 ngày – chờ chủ dự án duyệt.
2. Hạn mặc định theo loại – chờ duyệt.
3. Có cần xuất Figma không – chờ thể lệ.
4. Số tổng đài phường hiển thị trong demo – dùng số giả định có nhãn "Mô phỏng" cho tới khi có số chính thức.
