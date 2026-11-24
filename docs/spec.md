# SPEC – Trấn Biên Kết Nối (UI/UX Prototype)

Phiên bản: 1.2 (ưu tiên tính năng bắt buộc; quy chuẩn UI theo `ui-ux-guidelines.md`) · Nguồn: `proposal_v2.1.md`  
Nhãn: **[ĐỀ]** yêu cầu BTC · **[GĐ]** giả định thiết kế · **[KC]** cần kiểm chứng

---

## 0. Thứ tự ưu tiên phạm vi

**Làm trước – Lõi (Functional Requirements):** 6 màn hình bắt buộc của đề + 3 nhóm người dùng + công khai kết quả + gửi ẩn danh/theo dõi. Mọi AC không gắn nhãn đều thuộc lõi.

**Hoãn – Bonus:** các AC gắn nhãn **[BONUS – HOÃN]** chưa thiết kế chi tiết, chưa code, chưa viết test. Lõi phải chạy trọn trên bản deploy trước khi mở lại bonus.

| Mã | Bonus | Nguồn | AC / mục liên quan |
|---|---|---|---|
| B1 | Gợi ý loại từ ảnh bằng AI | [ĐỀ] điểm cộng | AC-C02-5, phần "Gợi ý" của AC-C04-1 |
| B2 | Phát hiện & gộp phản ánh trùng, "Tôi cũng gặp" | [ĐỀ] điểm cộng | 3.5, AC-C04-3, 7, 8, AC-C06-8 (nút Tôi cũng gặp), AC-A01-5, AC-A02-6, 7 |
| B3 | Chế độ chữ lớn | [ĐỀ] điểm cộng | 7.2 (cột Chữ lớn), 7.4 (cột Chữ lớn), AC-C01-2, AC-C03-7 |
| B4 | Mô tả bằng giọng nói | Mở rộng của nhóm | Phần micro của AC-C04-2 |
| B5 | Gửi hộ & tổng đài | Mở rộng của nhóm | AC-A01-8, AC-C01-4 |

Lưu ý khi làm lõi: vẫn giữ chỗ cho bonus để thêm sau không phải đập lại – kích thước dùng biến CSS (sẵn cho B3), C04 có vùng trống phía trên thẻ loại (sẵn cho B1), store có trường `suspectedDuplicateOf`, `anonymousFollows` (sẵn cho B2).

Quy chuẩn UI/UX chi tiết, wireframe và phân tích mẫu tham khảo: **`docs/ui-ux-guidelines.md`** – bắt buộc đọc trước khi làm bất kỳ màn hình nào.

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
| Phân loại ảnh AI | Mô phỏng theo bộ ảnh demo – **[BONUS – HOÃN]** |
| OTP, SMS/Zalo, tổng đài | Mô phỏng |
| Gửi ẩn danh, máy tự nhớ phản ánh, link theo dõi + QR, đăng ký nhận tin sau | Đầy đủ |
| Chia sẻ link | Web Share API; không hỗ trợ → sao chép link |
| Giọng nói → chữ | Web Speech API, ẩn nếu không hỗ trợ – **[BONUS – HOÃN]** |
| Chế độ chữ lớn | Đầy đủ – **[BONUS – HOÃN]** |

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
| `moi` | Mới | Chờ tiếp nhận | 1 | xám | `Send` |
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

### 3.4c. Câu "Cập nhật mới nhất" [GĐ]

Mỗi hồ sơ luôn có một câu trạng thái cho người dân, sinh từ trạng thái + dữ liệu:

| Trạng thái | Câu |
|---|---|
| `moi` | "Phường đã nhận phản ánh và sẽ xem xét trong ngày làm việc." |
| `da_tiep_nhan` | "Phường đã tiếp nhận, giao {bộ phận}. Dự kiến xong trước {ngày}." |
| `cho_xac_minh` | "Tình nguyện viên đang kiểm tra tại chỗ. Dự kiến xong trước {ngày}." |
| `da_giao`, `mo_lai` | "{Bộ phận} đang xử lý. Dự kiến xong trước {ngày}." |
| quá hạn (3.6a) | Thêm: "Việc xử lý đang chậm hơn dự kiến {n} ngày." |
| `hoan_thanh` | "Đã xử lý xong ngày {ngày}. Mời bạn xem ảnh kết quả và đánh giá." |
| `dong` | "Đã xử lý xong ngày {ngày}." |
| `can_bo_sung` | "Phường cần bạn bổ sung: {lý do}." |
| `da_gop` | "Phản ánh được gộp vào #{id} để xử lý chung." |
| `chuyen_co_quan` | "Phản ánh đã được chuyển đến {cơ quan}: {lý do}." |
| `khong_xac_nhan` | "Khi kiểm tra tại chỗ không thấy sự cố. Bạn có thể gửi lại kèm ảnh mới." |

### 3.5. Phát hiện trùng [GĐ] – **[BONUS – HOÃN]**

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
- **3.6a – Chậm hạn công khai:** hồ sơ quá hạn hiển thị cho người dân chip "⏰ Chậm {n} ngày" (n làm tròn lên) cạnh nhãn trạng thái, ở C01, C05, C06, C07. Người dân không thấy chữ "Quá hạn" – từ này chỉ dùng phía cán bộ.
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
| `feedback` | `{ resolved: boolean, rating?: 1-5, tags?: string[], comment?: string, at: ISO }`? | ✓ (rating) | `tags` lấy từ bộ chip 6.C06 |
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
- `createdAt` trong 01/11–23/11/2026, giờ trong khoảng 06:00–21:00, phân tán ngẫu nhiên theo seed; `completedAt ≤ demoNow`.
- **Timeline đầy đủ:** mỗi hồ sơ có timeline đi qua đủ các bước theo bảng 3.3 tới trạng thái hiện tại, thời điểm tăng dần, có `note` ngắn ở bước giao bộ phận ("Giao {bộ phận}") – vì C06 hiển thị trọn "Hành trình phản ánh" (DV-015).
- **Bộ phận và hạn:** hồ sơ `moi` chưa có `department`; từ lúc tiếp nhận trở đi có `department` theo bảng 3.1 và `dueAt` = thời điểm tiếp nhận + hạn mặc định của loại; 2 hồ sơ quá hạn được chọn để `dueAt < demoNow` (DV-016).
- Mọi thời điểm ghi theo định dạng ISO có `+07:00`.
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

### Khung chung màn người dân

- AC-NAV-1: Thanh điều hướng đáy 5 mục: Trang chủ · Của tôi · **Báo sự cố** (FAB tròn 64px ở giữa) · Bản đồ · Kết quả; icon + nhãn chữ (`ui-ux-guidelines.md` mục 3).
- AC-NAV-2: Trong C02–C04 ẩn thanh điều hướng; header có "←", chỉ báo bước "①──②──③" kèm chữ "Bước {n}/3 – {tên}", và "✕ Huỷ".
- AC-NAV-3: Nút chính mỗi màn nằm ở 1/3 dưới, rộng toàn chiều ngang trừ lề 16px.

### C01 – Trang chủ người dân

- AC-C01-1: Thứ tự khối từ trên xuống: Header ("Phường Trấn Biên" + chuông) → thẻ kêu gọi "Thấy chỗ hư hỏng? Chụp một tấm, phường sẽ lo." + nút "Báo sự cố" → "Phản ánh của bạn" → "Quanh đây" → dải số liệu.
- AC-C01-6: "Phản ánh của bạn": thẻ cho mỗi hồ sơ trong `deviceReports` hoặc của SĐT đã xác thực, mới nhất trước, trượt ngang có chấm phân trang. Mỗi thẻ: icon + tên loại, mã, ProgressBar ngang 4 mốc có giờ, câu "Cập nhật mới nhất" (3.4c), DelayChip nếu chậm (3.6a). Chạm → C06. Không có hồ sơ → ẩn khối.
- AC-C01-7: "Quanh đây": 3 hồ sơ gần nhất (GPS nếu đã cấp, không thì tâm phường) gồm icon loại, nhãn trạng thái, khoảng cách; link "Xem bản đồ" → C07.
- AC-C01-3: Dải số liệu: "Tháng 11: 47/64 phản ánh đã xử lý →" tính từ dữ liệu, chạm → C08.
- AC-C01-5: Không yêu cầu đăng nhập.
- AC-C01-2: **[BONUS – HOÃN – B3]** Nút "Aa Chữ lớn" ở header; bật/tắt có hiệu lực toàn app và được ghi nhớ.
- AC-C01-4: **[BONUS – HOÃN – B5]** Nút "Gọi tổng đài phường" (mô phỏng).

### C02 – Bước 1: Chụp ảnh

- AC-C02-1: Header theo AC-NAV-2, "Bước 1/3 – Ảnh".
- AC-C02-2: Ô chụp lớn ≈ 60% chiều cao vùng nội dung, icon camera + "Chạm để chụp ảnh", dùng `<input type="file" accept="image/*" capture="environment">` (không dựng khung ngắm `getUserMedia`). Nút phụ "Chọn ảnh có sẵn" (không có `capture`). Dòng mẹo: "Lùi xa một chút để thấy cả xung quanh chỗ bị hư."
- AC-C02-3: Sau khi có ảnh: ô chụp thành ảnh xem trước lớn có nút "Chụp lại"; bên dưới dải ảnh nhỏ + ô "+"; tối đa 3 ảnh; nén cạnh dài ≤ 1280px, JPEG 0,7; xoá từng ảnh.
- AC-C02-4: "Tiếp tục" chỉ bật khi có ≥ 1 ảnh.
- AC-C02-6: Ảnh lỗi định dạng hoặc > 15MB trước nén → thông báo bằng lời + cách khắc phục.
- AC-C02-7: Bấm "✕" khi đã có dữ liệu → hỏi "Lưu nháp để gửi sau?" [Lưu nháp] [Bỏ]; nháp khôi phục khi bấm lại "Báo sự cố".
- AC-C02-5: **[BONUS – HOÃN – B1]** Gợi ý loại bằng AI mô phỏng theo manifest.

### C03 – Bước 2: Vị trí

- AC-C03-9: Bố cục: ảnh vừa chụp (cao 120px) cố định phía trên; nội dung trong bottom sheet: tiêu đề "Chỗ bị hư ở đâu?", bản đồ, LocationRow, ô mô tả vị trí; nút chính "Đúng chỗ này rồi".
- AC-C03-1: Vào màn → xin quyền GPS. Đồng ý → ghim tại vị trí, zoom 17.
- AC-C03-2: GPS cách tâm phường > 5 km → banner "Bạn đang ở ngoài phường Trấn Biên. Dùng vị trí mẫu trong phường?" [Dùng vị trí mẫu] [Giữ vị trí của tôi].
- AC-C03-3: Từ chối GPS / lỗi / quá 10 giây → banner "Chưa lấy được vị trí. Bạn bật định vị hoặc gõ tên đường nhé." + ô "Nhập địa chỉ hoặc tên đường" (gợi ý từ danh sách đường mẫu, không gọi geocoding) + "Chọn trên bản đồ".
- AC-C03-4: Chạm bản đồ để dời ghim; không bắt buộc kéo.
- AC-C03-5: LocationRow "📍 {đường gần nhất}, {mô tả nếu có}" + nút "Đổi" (focus vào ô nhập địa chỉ).
- AC-C03-6: Ô "Mô tả thêm vị trí (không bắt buộc)", tối đa 120 ký tự, placeholder "Ví dụ: trước nhà số 12, gần cột điện".
- AC-C03-8: Attribution "© OpenStreetMap contributors".
- AC-C03-7: **[BONUS – HOÃN – B3]** Biến thể chữ lớn.

### C04 – Bước 3: Loại, xác nhận, gửi

- AC-C04-13: Bố cục: ảnh 120px phía trên; sheet gồm tiêu đề "Đây là chuyện gì?", lưới 4 CategoryTile, LocationRow (nút "Đổi" → C03), ô mô tả; nút chính "Gửi cho phường"; link phụ "Gửi không để lại số điện thoại" ngay dưới.
- AC-C04-1: 4 CategoryTile lưới 2×2, ≥ 96px, icon + nhãn; chọn → viền 2px primary + ✓ + `aria-pressed`. "Gửi cho phường" chỉ bật khi đã chọn loại. Không có lựa chọn mức ưu tiên. *(Phần huy hiệu "Gợi ý": [BONUS – HOÃN – B1].)*
- AC-C04-2: Mô tả tùy chọn ≤ 300 ký tự, placeholder "Ví dụ: ổ gà sâu, xe máy dễ té". *(Nút micro: [BONUS – HOÃN – B4].)*
- AC-C04-5: Bấm "Gửi cho phường" khi chưa có SĐT → bottom sheet nhập SĐT (10 số, bắt đầu bằng 0) với dòng "Số điện thoại chỉ dùng để báo tin cho bạn, không bao giờ hiển thị công khai." → OTP; mã đúng `123456` (gợi ý "Mã demo: 123456 · Mô phỏng"). Đã xác thực → bỏ qua.
- AC-C04-6: Thành công → màn thành công theo wireframe: ✅, "Phường đã nhận phản ánh", mã `TB-xxxx` ≥ 32px, đoạn "Tiếp theo: cán bộ phường sẽ xem và tiếp nhận, thường trong ngày làm việc. Bạn sẽ nhận tin nhắn khi có cập nhật.", nút "Theo dõi phản ánh" → C06, link "Về trang chủ". Cặp `{id, secretCode}` thêm vào `deviceReports`.
- AC-C04-10: Link "Gửi không để lại số điện thoại" → sheet cảnh báo: "Bạn sẽ không nhận được tin báo. Máy này sẽ tự nhớ phản ánh; hãy lưu link theo dõi để xem trên máy khác." [Gửi ẩn danh] [Để lại số điện thoại].
- AC-C04-11: Thành công khi ẩn danh: như AC-C04-6 nhưng thay câu nhận tin bằng: **mã bí mật 4 số** (≥ 28px), QR của `{origin}/phan-anh/{id}?k={secretCode}`, nút "Lưu link theo dõi" (Web Share API; không hỗ trợ → sao chép + toast "Đã sao chép link"), dòng "Máy này sẽ tự nhớ phản ánh của bạn. Đổi máy thì mở link đã lưu.", nút phụ "Nhận tin báo cho phản ánh này".
- AC-C04-12: Vượt 5 hồ sơ ẩn danh/ngày → sheet "Hôm nay bạn đã gửi 5 phản ánh ẩn danh. Vui lòng để lại số điện thoại để gửi tiếp."; chỉ còn lựa chọn có SĐT.
- AC-C04-9: Mất mạng khi gửi → giữ nháp, banner "Chưa gửi được – sẽ thử lại khi có mạng", nút "Thử lại".
- AC-C04-3, AC-C04-7, AC-C04-8: **[BONUS – HOÃN – B2]** Kiểm tra trùng, "Tôi cũng gặp", cờ nghi trùng.

### C05 – Phản ánh của tôi

- AC-C05-1: Header "Phản ánh của tôi" + chuông. Ngay dưới: danh sách hồ sơ từ `deviceReports` và SĐT đã xác thực, không cần đăng nhập để thấy hồ sơ gửi từ máy này.
- AC-C05-3: Tab trạng thái cuộn ngang có số đếm: Tất cả · Chờ tiếp nhận · Đã tiếp nhận · Đang xử lý · Đã xử lý · Khác (cần bổ sung / đã chuyển / không xác nhận / đã gộp).
- AC-C05-2: ReportCard: ảnh 64px, icon + tên loại, mã, địa chỉ 1 dòng, StatusChip công khai, DelayChip nếu chậm, câu "Cập nhật mới nhất" rút gọn 1 dòng.
- AC-C05-7: Cuối danh sách (hoặc khi trống): khối "Không thấy phản ánh của bạn?" với 2 lựa chọn "Đăng nhập bằng số điện thoại" (OTP mô phỏng) và "Tra cứu bằng mã phản ánh" (mã + 4 số – nhận cả 4 số cuối SĐT hoặc mã bí mật).
- AC-C05-6: Thẻ của hồ sơ chỉ có trên máy này (không gắn SĐT) có nút "Lưu link"; đầu danh sách có dòng "Xoá dữ liệu trình duyệt sẽ mất các phản ánh chỉ lưu trên máy này – hãy lưu link theo dõi." khi có ít nhất 1 thẻ như vậy.
- AC-C05-4: Trống hoàn toàn: minh hoạ + "Bạn chưa có phản ánh nào" + nút "Báo sự cố".
- AC-C05-5: Chuông có số chưa đọc; danh sách thông báo; mỗi thông báo có "Xem tin nhắn mẫu" (khung SMS "Mô phỏng").

### C06 – Chi tiết phản ánh

- AC-C06-12: Thứ tự khối: ảnh gốc → hàng loại + StatusChip + DelayChip → LocationRow (không có nút Đổi) → hộp "Cập nhật mới nhất" (3.4c) → "Hành trình phản ánh" (timeline dọc) → Trước/Sau → khu vực hành động. Khi `hoan_thanh`/`dong`: khối Trước/Sau lên ngay dưới ảnh gốc.
- AC-C06-1: Timeline dọc gồm đủ 4 mốc công khai: mốc đã qua (chấm đặc, giờ, 1 câu, tên bộ phận khi có), mốc hiện tại (vòng sáng), mốc tương lai (chấm rỗng, màu nhạt, "dự kiến {ngày}" nếu có `dueAt`). Trạng thái ngoại lệ hiện băng màu riêng + lý do phía trên timeline.
- AC-C06-3: Không lộ tên cá nhân; chỉ "Phường Trấn Biên", tên bộ phận, "Tình nguyện viên".
- AC-C06-4: Khối Trước/Sau luôn hiện từ đầu; ô Sau trống ghi "Chưa có ảnh sau xử lý"; có ảnh thì chạm để phóng to; dưới mỗi ảnh là thời điểm.
- AC-C06-5: `hoan_thanh` + quyền chủ hồ sơ → khối "Vấn đề đã được giải quyết chưa?" [Đã giải quyết] [Chưa giải quyết].
  - Đã giải quyết → RatingSheet: tiêu đề "Bạn thấy kết quả thế nào?", phụ đề "Chưa đến 30 giây"; 5 sao có nhãn (Rất tệ · Không hài lòng · Bình thường · Hài lòng · Rất hài lòng); chip chọn nhiều theo số sao – 4–5 sao: "Xử lý nhanh", "Sạch sẽ, gọn gàng", "Làm đúng chỗ", "Được báo tin đầy đủ"; 1–3 sao: "Xử lý chậm", "Chưa triệt để", "Thiếu thông báo", "Ảnh kết quả chưa rõ"; ô "Phường có thể làm tốt hơn điều gì?" tuỳ chọn; nút "Gửi đánh giá" bật khi đã chọn sao → `dong`.
  - Chưa giải quyết → sheet "Điều gì chưa ổn?" với ảnh hiện trạng tuỳ chọn + ghi chú → `mo_lai` + VolunteerTask `nghiem_thu`; màn hiện "Phường đã nhận ý kiến và sẽ kiểm tra lại."
- AC-C06-6: `da_gop` → banner "Đã gộp vào #{id}" + link hồ sơ chính.
- AC-C06-7: `can_bo_sung` → nút chính "Bổ sung ngay" mở lại C02/C03 với dữ liệu cũ.
- AC-C06-8: Người không có quyền chủ hồ sơ (3.4a) xem được nhưng không thấy khu vực hành động. *(Nút "Tôi cũng gặp vấn đề này": [BONUS – HOÃN – B2].)*
- AC-C06-9: Hồ sơ `anonymous` + quyền chủ hồ sơ + chưa có SĐT → thẻ "Nhận tin báo cho phản ánh này" với câu "Số điện thoại chỉ dùng cho phản ánh này." → OTP → `subscribedLater: true` + thông báo xác nhận; thẻ đổi thành "Đang nhận tin qua 0909 *** 068 · Huỷ". Huỷ → gỡ SĐT, `subscribedLater: false`.
- AC-C06-10: Link có `k` sai → xem như người ngoài + dòng "Link theo dõi không đúng – hãy kiểm tra lại mã bí mật."
- AC-C06-11: Chủ hồ sơ thấy nút "⤴ Lưu" ở header (lưu link theo dõi) và mã bí mật (ẩn mặc định, nút "Hiện").

### C07 – Bản đồ quanh tôi

- AC-C07-1: Mặc định tâm theo GPS (nếu đã cấp và trong phường) hoặc tâm phường; vòng bán kính 1 km; ghim "Bạn ở đây".
- AC-C07-2: Nút nổi "Toàn phường" bỏ giới hạn bán kính, fit toàn bộ marker.
- AC-C07-3: Marker = icon loại (Lucide) trắng trên nền tròn màu trạng thái + viền 2px trắng + bóng; nút "ⓘ Chú giải" mở bảng màu/icon có chữ; hồ sơ `da_gop` không hiển thị.
- AC-C07-4: Hàng chip cuộn ngang: Tất cả · 4 loại (chọn nhiều) · Đang xử lý · Đã xử lý.
- AC-C07-5: Chạm marker → thẻ nổi đáy: ảnh, icon + loại, khoảng cách, StatusChip, DelayChip nếu có, "Xem →" sang C06.
- AC-C07-6: Công tắc "Bản đồ | Danh sách" ở header; danh sách dùng ReportCard + "cách {x} m", sắp theo khoảng cách.
- AC-C07-7: Không hiện SĐT hoặc tên người gửi.
- AC-C07-8: Tile lỗi → tự chuyển Danh sách + thông báo.
- AC-C07-9: Thanh điều hướng đáy và FAB "Báo sự cố" vẫn hiện trên bản đồ.

### C08 – Kết quả của phường (bảng minh bạch)

- AC-C08-1: 4 thẻ KPI tính từ dữ liệu: Tổng phản ánh · Đã xử lý (kèm %) · Chưa hoàn tất · Thời gian xử lý TB (1 chữ số thập phân, dấu phẩy).
- AC-C08-2: Biểu đồ cột ngang 4 loại, mỗi cột tách Đã xử lý / Chưa hoàn tất, có nhãn số.
- AC-C08-3: Dòng "Vừa xử lý xong": 6 thẻ mới nhất, mỗi thẻ ảnh Trước → Sau (mũi tên giữa), icon + loại, StatusChip "Đã xử lý", ngày xong, tên bộ phận; chạm → C06.
- AC-C08-4: Chú thích nguồn: "Số liệu tháng 11/2026 · Dữ liệu mẫu cuộc thi". Điểm hài lòng (nếu hiển thị) gắn "Dữ liệu mô phỏng".
- AC-C08-5: Không cần đăng nhập; không có thông tin cá nhân.

### A01 – Hộp tiếp nhận cán bộ

- AC-A01-1: Header: tên cán bộ, ô tìm kiếm (mã/địa chỉ). *(Nút "Tạo phản ánh hộ": [BONUS – HOÃN – B5].)*
- AC-A01-2: 4 thẻ KPI giống C08 + thẻ "Quá hạn" và "Sắp đến hạn" (tính theo 3.6).
- AC-A01-3: Bảng cột: Mã · Ảnh · Loại · Địa chỉ · Trạng thái (nhãn CB) · Bộ phận · Hạn · Cờ (Ẩn danh). *(Cột "Người cùng báo", cờ Nghi trùng / Gửi hộ: bonus B2, B5.)*
- AC-A01-9: Bộ lọc thêm "Nguồn": Có SĐT / Ẩn danh.
- AC-A01-4: Sắp xếp mặc định theo 3.6; hàng quá hạn có nhãn chữ "Quá hạn {n} ngày" + icon, không chỉ tô đỏ.
- AC-A01-5: **[BONUS – HOÃN – B2]** Cờ "Nghi trùng" khi hồ sơ có `suspectedDuplicateOf` hoặc có hồ sơ khác thỏa 3.5.
- AC-A01-6: Bộ lọc: loại, trạng thái, bộ phận, khoảng ngày; tab nhanh: Cần xử lý / Tất cả / Đã xử lý.
- AC-A01-7: Chọn hàng → mở panel A02 bên phải (≈ 480px), danh sách vẫn thấy.
- AC-A01-8: **[BONUS – HOÃN – B5]** "Tạo phản ánh hộ" → modal: SĐT người dân, loại, vị trí (bản đồ nhỏ hoặc chọn đường), mô tả, ảnh tùy chọn → hồ sơ `onBehalf: true`, trạng thái `da_tiep_nhan`; hiện tin nhắn mẫu gửi mã cho người dân.

### A02 – Panel chi tiết & giao xử lý

- AC-A02-1: Ảnh (chuyển ảnh), bản đồ nhỏ, địa chỉ, mô tả, SĐT đã che (hoặc nhãn "Ẩn danh" / "Ẩn danh · đã đăng ký nhận tin"), số người cùng báo.
- AC-A02-2: Trường Loại (sửa được), Ưu tiên, Bộ phận (điền sẵn theo 3.1), Hạn (điền sẵn = createdAt + hạn mặc định, chỉnh được bằng date picker).
- AC-A02-3: Nút theo trạng thái (chỉ hiện nút hợp lệ theo 3.3): Tiếp nhận · Giao TNV xác minh · Giao xử lý · Cập nhật kết quả (→ A03) · Yêu cầu bổ sung · Chuyển cơ quan khác · Đóng.
- AC-A02-4: "Giao TNV xác minh" → chọn TNV hoặc "Để TNV gần nhất nhận" → tạo VolunteerTask `xac_minh`.
- AC-A02-5: Khối "Kết quả xác minh" hiện khi task xong: ảnh TNV, 3 câu trả lời.
- AC-A02-6: **[BONUS – HOÃN – B2]** Khối "Phản ánh tương tự": các hồ sơ thỏa 3.5 + khoảng cách + ảnh; nút "Gộp vào hồ sơ này" → modal xác nhận nêu rõ hồ sơ chính và hồ sơ bị gộp.
- AC-A02-7: **[BONUS – HOÃN – B2]** Gộp: hồ sơ phụ `da_gop`, `mergedInto` = chính; followers hợp nhất; ảnh phụ thêm vào hồ sơ chính; hồ sơ chính có danh sách "Đã gộp" với nút "Tách".
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

### 7.2. Chế độ chữ lớn – **[BONUS – HOÃN – B3]**

Lõi chỉ cần: mọi kích thước chữ, chiều cao nút, vùng chạm khai báo bằng biến CSS để B3 chỉ cần đổi giá trị.

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

Lõi dùng cột "Chuẩn"; cột "Chữ lớn" thuộc B3. Quy tắc viết: `ui-ux-guidelines.md` mục 6.

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
