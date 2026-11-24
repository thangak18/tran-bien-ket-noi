# SPEC – Trấn Biên Kết Nối

Phiên bản: 2.0 · Mục 0–9 = **giai đoạn 1** (prototype UI/UX, đã nộp 24/11/2026, vẫn là chuẩn cho giao diện và nghiệp vụ). **Mục 10–17 = giai đoạn 2** (backend + database, mở 25/11/2026): khi mục 10–17 mâu thuẫn mục 1.2, 1.3, 2, 4.4, 5 thì mục 10–17 thắng. · Nguồn: `proposal_v2.1.md`  
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

*(Áp dụng cho giai đoạn 1. Sang giai đoạn 2 backend, database, xác thực, phân quyền thật **nằm trong phạm vi** – xem mục 10; vẫn ngoài phạm vi: gửi SMS/Zalo thật, AI thật, đa ngôn ngữ, web push – xem 10.3.)*

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
- 3 VolunteerTask `xac_minh` có sẵn cho 3 hồ sơ `cho_xac_minh`, và 1 VolunteerTask `nghiem_thu` cho hồ sơ `mo_lai` (hồ sơ này có `feedback.resolved = false` vì người dân đã báo chưa giải quyết).
- Thao tác của cán bộ/bộ phận (tiếp nhận, giao, hoàn thành…) chỉ rơi vào giờ hành chính 07:00–17:30; người dân gửi và đánh giá được ở mọi giờ 06:00–21:00.
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

---

# GIAI ĐOẠN 2 – Backend và database (mở 25/11/2026)

Nhãn bổ sung: **[ĐĐ]** đề xuất thiết kế chờ chủ dự án duyệt (liệt kê ở 17). Mọi AC của mục 6 vẫn đúng; giai đoạn 2 chỉ đổi **nơi lưu và nơi kiểm tra** (từ localStorage trong trình duyệt sang server), không đổi hành vi nhìn thấy được, trừ những chỗ mục 10–17 nêu rõ.

## 10. Phạm vi giai đoạn 2

### 10.1. Quyết định đã chốt (chủ dự án, 25/11/2026)

| Hạng mục | Quyết định |
|---|---|
| Stack | Supabase (PostgreSQL + PostGIS + Auth + Storage) · Vercel Functions (TypeScript) · Drizzle ORM |
| OTP/SMS/Zalo | **Vẫn mô phỏng** (mã `123456`, nhãn "Mô phỏng"); thiết kế sẵn điểm cắm để thay bằng nhà cung cấp thật sau (10.3) |
| AI nhận diện ảnh (B1) | **Vẫn mô phỏng** theo manifest ảnh demo |
| Trang quản trị | **Không làm** (25/11, đổi quyết định): tài khoản cán bộ/TNV, bộ phận, hạn xử lý quản lý bằng script (mục 14) |

### 10.2. Trong phạm vi

API REST có kiểm tra nghiệp vụ phía server (mục 12) · schema PostgreSQL/PostGIS + migration + seed từ `mock.json` (mục 11) · xác thực và phân quyền (mục 13) · lưu ảnh ở Storage (mục 15) · script quản lý tài khoản/cấu hình (mục 14) · frontend gọi API, giữ **chế độ demo offline** (mục 16) · các bất biến mục 5.1 giữ nguyên, kiểm tra được trên DB.

### 10.3. Điểm cắm dịch vụ mô phỏng

Hai interface phía server, mỗi interface có bản `mock` (mặc định) và chỗ thay bản thật sau, chọn bằng biến môi trường:

| Interface | Biến | Bản mock | Bản thật (chưa làm) |
|---|---|---|---|
| `OtpProvider.send(phone)` / `verify(phone, code)` | `OTP_PROVIDER=mock` | Chấp nhận đúng `123456`, hết hạn 5 phút, tối đa 5 lần sai | Nhà cung cấp SMS/Zalo ZNS – chờ chủ dự án chọn |
| `NotificationChannel.send(phone, message)` | `SMS_PROVIDER=mock` | Ghi vào `notifications` với `channel='sms_mo_phong'`, không gửi đi đâu | Cùng nhà cung cấp trên |

Khi `OTP_PROVIDER=mock`, API trả kèm cờ `mock: true` để UI hiện nhãn "Mô phỏng". **Không được chạy production với `mock` mà không có nhãn trên UI.**

### 10.4. Ngoài phạm vi giai đoạn 2

SMS/Zalo thật, AI thật, web push, đa ngôn ngữ, ứng dụng native, đăng nhập SSO/VNeID, xác thực hai lớp (MFA) cho cán bộ, tích hợp hệ thống một cửa của tỉnh.

---

## 11. Schema cơ sở dữ liệu

PostgreSQL 15+ trên Supabase, extension `postgis`. Mọi thời điểm là `timestamptz` (UTC trong DB, API trả ISO `+07:00` theo 7.6). Định danh nội bộ `uuid`; mã hiển thị (`TB-0065`, `NV-005`) là cột `code` riêng, sinh từ sequence, không dùng làm khoá ngoại.

### 11.1. Enum

`category` (4 mã 3.1) · `report_status` (11 mã 3.2) · `priority` (`cao`, `binh_thuong`) · `task_type` (`xac_minh`, `nghiem_thu`) · `task_status` (`cho_nhan`, `dang_lam`, `xong`) · `staff_role` (`can_bo`, `tnv`) · `follower_source` (`reporter`, `also_me`, `subscribe_later`) · `photo_kind` (`before`, `after`, `verify`, `feedback`) · `actor_type` (`citizen`, `staff`, `system`).

### 11.2. Bảng

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `departments` | `id`, `name` unique, `is_active`, `sort` | 5 dòng seed (3.1). Sửa bằng migration/seed; không xoá cứng nếu đã có hồ sơ tham chiếu |
| `category_settings` | `category` pk, `label`, `default_department_id` → departments, `sla_days` int > 0 | 4 dòng seed (3.1). **Nguồn của "hạn mặc định" và "bộ phận gợi ý"** thay cho `constants.ts` khi chạy server |
| `staff_profiles` | `user_id` pk → `auth.users`, `role` staff_role, `display_name`, `department_id`?, `is_active`, `created_at` | 1–1 với tài khoản Supabase Auth. `is_active=false` → API từ chối dù token còn hạn |
| `reports` | `id` uuid pk, `code` text unique (`TB-0001`…), `category`, `status`, `status_before_merge`?, `priority`, `location` `geography(Point,4326)`, `address`, `location_note`?, `description`?, `department_id`?, `due_at`?, `created_at`, `completed_at`?, `reporter_phone`?, `anonymous` bool, `subscribed_later` bool, `on_behalf` bool, `secret_code_hash`, `owner_token_hash`, `anonymous_follows` int ≥ 0, `merged_into` → reports?, `photos_approved` bool, `result_note`?, `version` int | Chỉ mục: GiST(`location`), (`status`,`due_at`), (`category`,`created_at`), (`reporter_phone`). `lat`/`lng` lấy bằng `ST_Y/ST_X`, không lưu trùng |
| `report_photos` | `id`, `report_id`, `kind` photo_kind, `storage_path`, `sort`, `source` (`storage` \| `static`), `created_at` | `source='static'` cho ảnh demo `/demo-photos/...` từ seed; còn lại là đường dẫn trong bucket |
| `report_followers` | (`report_id`, `phone`) pk, `source` follower_source, `created_at` | Thay mảng `followers`. `followerCount` = số dòng + `anonymous_follows` (3.6) |
| `report_timeline` | `id`, `report_id`, `at`, `status`, `actor_type`, `actor_staff_id`?, `actor_label`, `note`? | Chỉ thêm, không sửa/xoá (trigger chặn UPDATE/DELETE). `actor_label` là nhãn công khai ("Phường Trấn Biên", tên bộ phận, "Tình nguyện viên"); tên cá nhân chỉ lấy từ `actor_staff_id` cho A02 |
| `report_duplicate_flags` | (`report_id`, `other_report_id`) pk | Thay `suspectedDuplicateOf` (B2) |
| `feedback` | `report_id` pk, `resolved`, `rating`? 1–5, `tags` text[], `comment`?, `at` | CHECK: `resolved=true` ⇒ `rating` not null |
| `volunteer_tasks` | `id`, `code` (`NV-001`…), `report_id`, `type`, `status`, `assignee_id`? → staff_profiles, `result_exists`?, `result_severity`?, `result_note`?, `result_at`? | Ảnh kết quả nằm ở `report_photos` (`kind='verify'`). `assignee_id` null = mở cho TNV gần nhất (AC-A02-4) |
| `notifications` | `id`, `phone`, `report_id`, `message`, `channel` (`app` \| `sms_mo_phong`), `read`, `created_at` | Index (`phone`,`created_at` desc) |
| `phone_otps` | `phone`, `code_hash`, `expires_at`, `attempts` | Dùng cả khi mock (để giữ đúng luồng hết hạn/giới hạn lần sai) |
| `anonymous_submissions` | `id`, `device_id`, `ip_hash`, `created_at` | Đếm quota 3.4b phía server (13.4) |
| `access_attempts` | `report_id`, `ip_hash`, `at` | Khoá tạm khi dò mã bí mật (13.4) |
| `pending_uploads` | `path` pk, `device_id`?, `staff_id`?, `created_at`, `attached` bool | Ảnh đã xin ký nhưng chưa gắn hồ sơ; cron xoá sau 24 giờ (15) |
| `app_settings` | `key` pk, `value` jsonb | `clock` (`{mode:'real'\|'fixed', fixedAt}`), `ward` (tâm, ranh giới), `otp_mock_notice` |

### 11.3. Ràng buộc ở mức DB (không chỉ ở code)

1. `reports.anonymous = true` ⇒ `reporter_phone IS NULL` (CHECK). `subscribed_later` không làm `anonymous` đổi.
2. `status IN ('hoan_thanh','dong')` ⇒ `completed_at IS NOT NULL` (CHECK).
3. `merged_into IS NOT NULL` ⇔ `status = 'da_gop'` (CHECK); không tự trỏ về chính nó.
4. `reporter_phone` khớp `^0[0-9]{9}$`; `secret_code` gốc 4 chữ số (chỉ kiểm khi sinh, DB lưu hash).
5. `report_timeline` bất biến (trigger).
6. Mọi bảng bật **RLS, không có policy cho `anon`/`authenticated`** ⇒ trình duyệt không đọc/ghi trực tiếp được; chỉ API (kết nối bằng vai trò server) truy cập. Đây là lớp phòng thủ thứ hai, lớp thứ nhất là phân quyền ở mục 13.
7. Bất biến mục 5.1 kiểm bằng `db:verify` (16.3), không dùng CHECK.

### 11.4. Dùng PostGIS

| Việc | Truy vấn |
|---|---|
| Quanh đây / C07 (bán kính) | `ST_DWithin(location, ST_MakePoint(lng,lat)::geography, r)` + `ST_Distance` để sắp |
| Nghi trùng 3.5 (≤ 50 m, cùng loại, ≤ 14 ngày, trạng thái còn mở) | `ST_DWithin(..., 50)` + điều kiện cột; trả tối đa 3, gần nhất trước |
| Kiểm tra trong phường | `ST_Covers(ward_polygon, point)` – cảnh báo, **không chặn** (AC-C03-2) |
| Khoảng cách V01 | `ST_Distance` theo vị trí TNV gửi lên |

Kết quả phải khớp `haversineMeters` ở client trong sai số 1 m (test đối chiếu).

---

## 12. API

### 12.1. Quy ước

- Gốc `/api/v1`. JSON UTF-8. Mọi thời điểm ISO 8601 `+07:00`. Mã phản ánh trong URL là `code` (`TB-0065`).
- Xác thực: `Authorization: Bearer <JWT>` (nhân viên: JWT Supabase; người dân: JWT do API ký, 13.3). Khoá chủ hồ sơ ẩn danh: header `X-Report-Key` (13.4).
- Kiểm tra đầu vào bằng schema (zod) ở mọi endpoint; trường lạ bị từ chối.
- Lỗi: `{ "error": { "code": "TRANSITION_NOT_ALLOWED", "message": "<tiếng Việt, nói được cách khắc phục>", "details": {…} } }`. Mã HTTP: 400 đầu vào sai · 401 chưa đăng nhập · 403 sai quyền · 404 không có (hồ sơ không có quyền xem cũng trả 404 để không lộ sự tồn tại khi cần) · 409 chuyển trạng thái sai hoặc xung đột `version` · 422 vi phạm điều kiện nghiệp vụ (vd. thiếu ảnh sau) · 429 quá giới hạn.
- Tạo mới (`POST /reports`) nhận `Idempotency-Key`; gửi lại cùng khoá trả về kết quả cũ, không tạo bản sao (phục vụ AC-C04-9 "thử lại khi có mạng").
- Phân trang theo con trỏ: `?limit=50&cursor=…`.
- **Không endpoint nào trả `reporter_phone` đầy đủ, `secret_code`, hash, hoặc `followers`** ngoại trừ: (a) `GET /me/*` trả SĐT của chính người đang đăng nhập; (b) `GET /reports/:code/owner` trả `secretCode` cho chủ hồ sơ (AC-C06-11).
- Mọi chuyển trạng thái chạy trong **một giao dịch**: khoá dòng (`FOR UPDATE`) → kiểm `canTransition` + điều kiện bắt buộc 3.3 → cập nhật → thêm `report_timeline` → sinh `notifications` (3.4). Một bước lỗi thì toàn bộ huỷ.
- Hàm nghiệp vụ trong `src/domain/` được **dùng chung** giữa client và server; server là nơi quyết định, client chỉ dùng để hiện/ẩn nút.

### 12.2. Công khai (không cần đăng nhập)

| Method + đường dẫn | Việc | Trả về |
|---|---|---|
| `GET /public/config` | Loại, bộ phận đang bật, hạn mặc định, tâm và ranh giới phường, cờ `otpMock` | cấu hình |
| `GET /public/reports` | Danh sách cho C07; lọc `near=lat,lng&radius`, `category`, `bucket` (đang xử lý/đã xử lý), `limit` | `PublicReport[]` + `distanceMeters` |
| `GET /public/reports/:code` | C06 cho người ngoài | `PublicReport` (bỏ SĐT, mã bí mật, followers → `followerCount`, timeline bỏ tên cá nhân; ảnh chỉ khi `photos_approved`) |
| `GET /public/kpi?month=2026-11` | KPI C08/A01, **tính bằng SQL từ bảng `reports`** | `{total, resolved, open, avgDays, byCategory[]}` |
| `GET /public/recent-results?limit=6` | AC-C08-3 | thẻ Trước → Sau |

### 12.3. Người dân

| Method + đường dẫn | Quyền | Việc |
|---|---|---|
| `POST /citizen/otp/request` `{phone}` | công khai, giới hạn 5/giờ/SĐT, 20/giờ/IP | Gửi OTP (mock) |
| `POST /citizen/otp/verify` `{phone, code}` | công khai | Đúng → `{token}` (JWT người dân, 30 ngày) |
| `POST /uploads/sign` `{kind:'before', contentType, size}` | token người dân **hoặc** `X-Device-Id` | Trả URL ký sẵn để tải ảnh lên Storage (15) |
| `POST /reports` | token người dân, **hoặc** `anonymous:true` + `X-Device-Id` | Gửi phản ánh: `category`, `photoPaths[1..3]`, `lat`, `lng`, `address`, `locationNote?`, `description?`. Trả `{code, secretCode, ownerToken}` – **lần duy nhất** server trả `secretCode` gốc kèm `ownerToken` |
| `GET /me/reports` | token người dân | Hồ sơ mà SĐT nằm trong `report_followers` |
| `POST /reports/lookup` `{code, proof}` | công khai, giới hạn thử | `proof` = 4 số cuối SĐT hoặc mã bí mật (AC-C05-7) → `{ownerToken}` |
| `POST /reports/:code/claim` `{secretCode}` | công khai, giới hạn thử | Mở link `?k=` (3.4a.3) → `{ownerToken}` |
| `GET /reports/:code/owner` | chủ hồ sơ (13.4) | Bản C06 đầy đủ cho chủ: cờ quyền, `secretCode`, SĐT đã che đang nhận tin |
| `POST /reports/:code/follow` | token người dân hoặc `X-Device-Id` | "Tôi cũng gặp" (B2; ẩn danh → tăng `anonymous_follows`) |
| `POST /reports/:code/subscribe` `{phone, otpToken}` / `DELETE …/subscribe` | chủ hồ sơ ẩn danh | AC-C06-9 |
| `POST /reports/:code/feedback` | chủ hồ sơ | AC-C06-5: `{resolved, rating?, tags?, comment?, photoPaths?}` → `dong` hoặc `mo_lai` + task `nghiem_thu` |
| `POST /reports/:code/supplement` | chủ hồ sơ | AC-C06-7 (`can_bo_sung` → `moi`) |
| `GET /me/notifications`, `POST /me/notifications/read` | token người dân | AC-C05-5. Hồ sơ ẩn danh chưa đăng ký nhận tin không có thông báo (3.4) |

### 12.4. Cán bộ (`can_bo`)

| Method + đường dẫn | Việc | Chuyển trạng thái (3.3) |
|---|---|---|
| `GET /officer/reports` | A01: lọc loại/trạng thái/bộ phận/khoảng ngày/nguồn, tab, tìm mã/địa chỉ, sắp theo 3.6 | – |
| `GET /officer/reports/:code` | A02: SĐT **đã che** (`0909 *** 068`) hoặc nhãn Ẩn danh, timeline có tên người thao tác, kết quả xác minh, phản ánh tương tự | – |
| `GET /officer/kpi` | KPI + quá hạn + sắp đến hạn (3.6) | – |
| `PATCH /officer/reports/:code` `{category?, priority?, departmentId?, dueAt?}` | Sửa trường phân loại (AC-A02-2); gửi kèm `version` | – |
| `POST …/accept` | Tiếp nhận (loại + bộ phận + hạn) | `moi` → `da_tiep_nhan` |
| `POST …/assign-volunteer` `{volunteerId?}` | Tạo task `xac_minh` | → `cho_xac_minh` |
| `POST …/assign-department` | Giao xử lý | `da_tiep_nhan`/`mo_lai` → `da_giao` |
| `POST …/complete` `{photoPaths[1..3], note≥10, completedAt?}` | A03 | `da_giao`/`mo_lai` → `hoan_thanh` |
| `POST …/request-supplement`, `…/transfer`, `…/close`, `…/mark-unverified` `{reason≥10}` | Nút ngoại lệ | theo 3.3 |
| `POST …/merge` `{intoCode}` · `POST …/split` | B2 | → `da_gop` / khôi phục `status_before_merge` |
| `POST /officer/reports` | Tạo phản ánh hộ (B5) | → `da_tiep_nhan`, `on_behalf=true` |
| `GET /officer/volunteers` | Danh sách TNV đang hoạt động để giao | – |

### 12.5. Tình nguyện viên (`tnv`)

| Method + đường dẫn | Việc |
|---|---|
| `GET /volunteer/tasks?lat&lng` | AC-V01: nhiệm vụ giao cho mình + nhiệm vụ mở (`assignee_id IS NULL`), sắp theo khoảng cách, tab Cần làm/Đã xong |
| `GET /volunteer/tasks/:code` | AC-V02-1; **không** có SĐT, mã bí mật, followers |
| `POST /volunteer/tasks/:code/claim` | Nhận nhiệm vụ mở; chỉ một người nhận được (khoá dòng) |
| `POST /volunteer/tasks/:code/result` `{exists, severity?, photoPath, note?}` | AC-V02-2 → 5; kích hoạt chuyển trạng thái 3.3 do hệ thống. TNV **không** có endpoint đóng hồ sơ |

### 12.6. Không có API quản trị

Quản lý tài khoản/cấu hình bằng script (mục 14).

### 12.7. Việc nền (Vercel Cron, 1 lần/ngày)

| Việc | Quy tắc |
|---|---|
| Tự đóng hồ sơ | `hoan_thanh` quá 7 ngày chưa phản hồi → `dong` (3.3), timeline "Tự đóng sau 7 ngày không phản hồi" |
| Dọn ảnh mồ côi | Xoá file trong `pending_uploads` chưa gắn quá 24 giờ |
| Dọn dữ liệu hạn chế | Xoá `phone_otps` hết hạn, `access_attempts` > 24 giờ |

### 12.8. Đồng hồ

Mọi hàm nhận `now` như giai đoạn 1. Server lấy `now` từ `Clock`: `real` (mặc định production) hoặc `fixed` (demo/test, đọc `app_settings.clock`). Seed mock có dữ liệu tới `2026-11-24T09:00+07:00`; ở chế độ `real` các hồ sơ quá hạn của seed sẽ lệch con số "2 quá hạn" – chỉ chế độ `fixed` giữ đúng DV-016.

---

## 13. Xác thực và phân quyền

### 13.1. Vai trò

Giữ **3 nhóm người dùng** như bảng 2. Hai vai trò nhân viên (`can_bo`, `tnv`) có tài khoản thật; người dân không có tài khoản.

| Vai trò | Xác định bằng | Thiết bị | Cấp bởi |
|---|---|---|---|
| ND | SĐT đã xác thực OTP **hoặc** khoá chủ hồ sơ (13.4) **hoặc** không gì (chỉ xem công khai) | Mobile | Tự do |
| CB | Tài khoản Supabase Auth + `staff_profiles.role='can_bo'` | Desktop | Script `staff:create` |
| TNV | như trên, `role='tnv'` | Mobile | Script `staff:create` |

### 13.2. Đăng nhập nhân viên

1. Route `/dang-nhap`: email + mật khẩu → Supabase Auth (`signInWithPassword`). Không có đăng ký tự do; không có "Quên mật khẩu" tự phục vụ ở giai đoạn 2 – nhà phát triển đặt lại bằng `staff:reset-password`.
2. SPA giữ phiên của Supabase (tự làm mới token). Mọi gọi API kèm `Bearer`.
3. API **xác minh JWT** (chữ ký, hạn, `aud`), rồi tra `staff_profiles` mỗi request: không có dòng hoặc `is_active=false` → 403 `ACCOUNT_DISABLED`. Vai trò lấy từ DB, **không** tin claim trong token.
4. Sau đăng nhập chuyển theo vai trò: CB → `/can-bo`, TNV → `/tnv`. Vào route không đúng vai trò → trang "Bạn không có quyền vào trang này" + nút về đúng trang.
5. Đăng xuất xoá phiên; hết phiên giữa chừng → quay về `/dang-nhap` kèm đường dẫn cũ.
6. Mật khẩu tối thiểu 10 ký tự (cấu hình Supabase). Giới hạn đăng nhập sai do Supabase Auth đảm nhiệm.

### 13.3. Phiên người dân

- Xác thực SĐT: `otp/request` → `otp/verify`. Đúng → API ký JWT riêng (`HS256`, khoá `CITIZEN_JWT_SECRET`) với `sub = HMAC(phone)`, claim `phone`, hạn 30 ngày; lưu ở localStorage (thay `settings.phone`).
- Token chỉ chứng minh "tôi sở hữu SĐT này". Quyền chủ hồ sơ = SĐT ∈ `report_followers` của hồ sơ (3.4a.1).
- Đăng xuất = xoá token ở máy; đổi máy = xác thực OTP lại (AC-C05-7).

### 13.4. Quyền chủ hồ sơ cho hồ sơ ẩn danh [ĐĐ]

Giữ nguyên trải nghiệm 3.4a (mã 4 số, link `?k=`, QR) nhưng chống dò mã:

1. Khi gửi, server sinh `secretCode` 4 số (hiện cho người dùng một lần) và `ownerToken` ngẫu nhiên 256 bit. DB chỉ lưu **hash** của cả hai.
2. Thiết bị lưu `{code, ownerToken}` trong `deviceReports` (thay cặp `{id, secretCode}`). Gọi API chủ hồ sơ bằng `X-Report-Key: <ownerToken>`.
3. Mở link `?k=` hoặc tra cứu bằng mã bí mật/4 số cuối SĐT → `claim`/`lookup` kiểm tra rồi trả `ownerToken` mới cho thiết bị đó. Có thể có nhiều `ownerToken` cho một hồ sơ (mỗi thiết bị một cái).
4. **Chống dò**: tối đa **5 lần sai / hồ sơ / IP / 15 phút**, quá thì 429 `TOO_MANY_ATTEMPTS`; tối đa **30 lần sai / hồ sơ / 24 giờ** từ mọi IP thì khoá `claim`/`lookup` hồ sơ đó 24 giờ (chủ thật dùng `ownerToken` đã có nên không bị ảnh hưởng). Mọi lần sai ghi `access_attempts`.
5. Quota ẩn danh (3.4b): đếm ở `anonymous_submissions` theo `device_id` (UUID sinh ở client) **và** `ip_hash`. Thiết bị: 5/ngày (AC-C04-12). IP: 20/ngày (chặn người xoá localStorage để lách).

### 13.5. Ma trận quyền

Ký hiệu: ✓ được · ✗ không · own = chỉ hồ sơ của mình (13.4) · assigned = chỉ nhiệm vụ giao cho mình hoặc mở.

| Hành động | Công khai | ND (SĐT/ẩn danh) | TNV | CB |
|---|:--:|:--:|:--:|:--:|
| Xem hồ sơ công khai, bản đồ, KPI | ✓ | ✓ | ✓ | ✓ |
| Gửi phản ánh (SĐT hoặc ẩn danh) | ✗ | ✓ | ✗ | ✗ |
| Xem chi tiết đầy đủ + mã bí mật | ✗ | own | ✗ | ✗ |
| Đánh giá / báo chưa giải quyết / bổ sung / đăng ký nhận tin | ✗ | own | ✗ | ✗ |
| "Tôi cũng gặp" | ✗ | ✓ | ✗ | ✗ |
| Xem hộp tiếp nhận + panel (SĐT che) | ✗ | ✗ | ✗ | ✓ |
| Tiếp nhận, giao, hoàn thành, ngoại lệ, gộp/tách, gửi hộ | ✗ | ✗ | ✗ | ✓ |
| Xem SĐT **đầy đủ** của người dân | ✗ | chính mình | ✗ | ✗ |
| Xem nhiệm vụ, nhận nhiệm vụ, gửi kết quả xác minh | ✗ | ✗ | assigned | ✗ |
| Đóng hồ sơ | ✗ | ✗ | ✗ | ✓ |

Quyền xem SĐT đầy đủ của người dân: **không vai trò nhân viên nào có**. Khi cần gọi lại người dân (ngoài phạm vi), thêm sau bằng tính năng có nhật ký truy cập riêng.

### 13.6. Tiêu chí chấp nhận

- AC-AUTH-1: Gọi endpoint `/officer/*` không token → 401; token TNV → 403; token CB → 200.
- AC-AUTH-2: Tài khoản `is_active=false` bị 403 ngay request kế tiếp dù token chưa hết hạn.
- AC-AUTH-3: Đổi vai trò trong DB có hiệu lực ở request kế tiếp (không chờ token mới).
- AC-AUTH-4: Người dân A không đọc được `/reports/:code/owner` của hồ sơ do người dân B gửi (SĐT khác, `ownerToken` khác) → 404.
- AC-AUTH-5: Sai mã bí mật 5 lần trong 15 phút từ một IP → lần thứ 6 trả 429 kể cả khi mã đúng.
- AC-AUTH-6: Quét toàn bộ phản hồi của `/public/*` và `/volunteer/*` không chứa chuỗi SĐT (regex `0\d{9}`), `secretCode`, hash (test tự động trên dữ liệu seed).
- AC-AUTH-7: Bản ghi `reports` ẩn danh có `reporter_phone` null kể cả sau `subscribe` (bất biến mục 5).
- AC-AUTH-8: `ownerToken` và `secretCode` không xuất hiện trong log máy chủ.

---

## 14. Quản lý tài khoản và cấu hình bằng script

**Không có trang quản trị và không có vai trò quản trị** (chủ dự án quyết 25/11/2026). Vẫn chỉ 3 nhóm người dùng: người dân, cán bộ, TNV. Việc vận hành do nhà phát triển chạy script trên máy mình (cần `SUPABASE_SERVICE_ROLE_KEY` và `DATABASE_URL_DIRECT`), không có endpoint hay màn hình tương ứng.

| Script | Việc |
|---|---|
| `npm run staff:create -- --email … --name … --role can_bo\|tnv [--department …]` | Tạo tài khoản Supabase Auth + `staff_profiles`; in mật khẩu tạm **một lần** (hoặc nhận từ `--password`) |
| `npm run staff:disable -- --email …` / `staff:enable` | Khoá/mở khoá (`is_active`); khoá có hiệu lực ở request kế tiếp (AC-AUTH-2) |
| `npm run staff:reset-password -- --email …` | Cấp mật khẩu tạm mới |
| `npm run staff:list` | Liệt kê tài khoản, vai trò, trạng thái |
| `npm run config:set-sla -- --category den_duong --days 3 [--department …]` | Đổi hạn/bộ phận gợi ý (`category_settings`); chỉ áp dụng hồ sơ tiếp nhận sau đó |
| `npm run demo:reset` / `demo:clock -- --mode fixed\|real [--at …]` | Đặt lại dữ liệu demo / đồng hồ; **từ chối chạy khi `DEMO_MODE` không bật** |

- Tài khoản mẫu (CB Nguyễn Văn Minh, 3 TNV) do `db:seed` tạo (16.3).
- Bộ phận đổi tên/thêm: sửa `departments` bằng migration hoặc seed; không xoá nếu đã có hồ sơ tham chiếu.
- Việc quản lý tài khoản được Supabase Auth ghi log; không có bảng nhật ký riêng. Mọi thao tác của cán bộ/TNV trên hồ sơ đã có trong `report_timeline` (actor là `actor_staff_id`).

AC-OPS-1: `staff:create` trùng email báo lỗi bằng lời, không để lại bản ghi dở dang (Auth và `staff_profiles` cùng thành công hoặc cùng huỷ). · AC-OPS-2: Không script nào in khoá service hay DB URL. · AC-OPS-3: Không thể khoá tài khoản khiến hệ thống còn 0 cán bộ hoạt động (script cảnh báo, cần `--force`).

---

## 15. Lưu ảnh

| Mục | Quy định |
|---|---|
| Bucket | `report-photos`, **riêng tư**. Không bật URL công khai |
| Tải lên | Client nén (AC-C02-3: ≤ 1280px, JPEG 0,7 → thường < 500 KB) → `POST /uploads/sign` trả URL ký sẵn → client `PUT` thẳng lên Storage. Ảnh không đi qua Vercel Function (tránh giới hạn kích thước) |
| Kiểm ở server | Khi ký: loại `image/jpeg` hoặc `image/webp`, `size ≤ 1,5 MB`, tối đa 3 ảnh `before`/hồ sơ, 3 ảnh `after`. Khi gắn vào hồ sơ: server kiểm file tồn tại, đúng kích cỡ và **magic bytes** đúng định dạng ảnh; sai → 422, xoá file |
| Đường dẫn | `reports/{yyyy}/{mm}/{uuid}.jpg`. Không chứa mã hồ sơ, SĐT hay tên |
| Đọc | API trả **URL ký ngắn hạn** (1 giờ) cho ảnh được phép: công khai chỉ khi `photos_approved`; chủ hồ sơ thấy ảnh của mình; CB thấy mọi ảnh; TNV thấy ảnh của hồ sơ được giao. Ảnh `static` (seed) trả đường dẫn `/demo-photos/...` |
| Quyền riêng tư | Ảnh nén bằng canvas nên mất EXIF (GPS, thiết bị); server không giữ ảnh gốc |
| Mồ côi | `pending_uploads` + cron dọn (12.7) |
| Dung lượng | Xem dung lượng ở bảng điều khiển Supabase; gói miễn phí Supabase 1 GB – cảnh báo khi > 80% |

AC-PHOTO-1: Ảnh tải lên bằng chữ ký hết hạn → 403. · AC-PHOTO-2: File `.exe` đặt tên `.jpg` bị từ chối ở bước gắn hồ sơ. · AC-PHOTO-3: Người dân A không tải được ảnh `before` của hồ sơ B bằng cách đoán đường dẫn (bucket riêng tư, URL ký gắn quyền).

---

## 16. Frontend, chế độ demo và dữ liệu

### 16.1. Hai chế độ chạy

| | `VITE_DATA_SOURCE=local` (**Chế độ demo offline**) | `VITE_DATA_SOURCE=api` (**Chế độ thật**) |
|---|---|---|
| Lưu ở | localStorage + `mock.json` như giai đoạn 1 | PostgreSQL qua API |
| Đăng nhập nhân viên | Không – nút "Đổi vai trò" và Demo Hub như cũ | Có – `/dang-nhap`, ẩn nút "Đổi vai trò" |
| Ảnh | dataURL | Storage |
| Triển khai | Một dự án Vercel riêng (giữ link đã nộp cho giám khảo, không đổi hành vi) | Dự án Vercel chính |

Cả hai chế độ dùng **cùng màn hình và cùng hàm `domain/`**. Giữa UI và dữ liệu có một lớp `DataSource` (interface) với hai bản cài đặt: `LocalDataSource` (bọc `citizenActions`/`officerActions` hiện có) và `ApiDataSource` (gọi API). Màn hình không biết đang ở chế độ nào.

### 16.2. Thay đổi hành vi nhìn thấy được ở chế độ thật

1. Thao tác trở thành **bất đồng bộ**: nút có trạng thái đang gửi; lỗi 409/422 hiện bằng lời tiếng Việt (map từ `error.code`) và dữ liệu tự tải lại.
2. Đồng bộ nhiều thiết bị: thay sự kiện `storage` bằng tải lại khi quay lại tab và làm mới định kỳ 30 giây ở A01/C05 (chưa cần realtime).
3. Nhãn "Mô phỏng" ở OTP/SMS/gợi ý loại **giữ nguyên** (10.3).
4. Offline khi gửi: dùng `Idempotency-Key`, giữ nháp (AC-C04-9).
5. `deviceReports` đổi sang `{code, ownerToken}`; dữ liệu cũ ở localStorage của giai đoạn 1 không di chuyển (chế độ thật bắt đầu từ DB).

### 16.3. Seed và kiểm tra bất biến

- `db:seed` đọc `src/data/mock.json` → ghi DB qua Drizzle, giữ nguyên `code`, thời điểm, timeline, followers, `secretCode` (hash). Ảnh mock là `source='static'`. Tài khoản nhân viên mẫu (CB Nguyễn Văn Minh, 3 TNV) tạo bằng Supabase Admin API; mật khẩu lấy từ biến môi trường lúc seed, **không** ghi vào repo.
- `db:verify` kiểm trên DB đang chạy: 64 hồ sơ; 18/15/21/10; 47 đã xử lý (40 `dong` + 7 `hoan_thanh`); 17 chưa hoàn tất theo phân bổ 5.2; trung bình 3,2 ngày (sai số ≤ 0,005); đúng 6 hồ sơ ẩn danh (1 có `subscribed_later`) và `reporter_phone` rỗng ở cả 6; 2 cụm nghi trùng; mọi hồ sơ có `secret_code_hash`; mọi timeline đủ bước theo 5.3. **Cùng bộ kiểm với `mock:verify`**, chạy ở CI trên DB thử nghiệm.
- Dữ liệu thật phát sinh sau seed (hồ sơ `TB-0065` trở đi) không làm sai `db:verify`: kiểm 5.1 chỉ tính **tháng 11/2026 theo `code ≤ TB-0064`** hoặc cờ `is_seed` [ĐĐ: thêm cột `is_seed bool`].

### 16.4. Tiêu chí chấp nhận

- AC-DATA-1: Cùng một kịch bản (E2E-01, 03, 05, 07) chạy được ở **cả hai chế độ** với kết quả nhìn thấy giống nhau.
- AC-DATA-2: KPI ở C08/A01 chế độ thật bằng với `computeKpi(reports)` tính bằng code trên cùng dữ liệu (test đối chiếu).
- AC-DATA-3: Chuyển trạng thái không hợp lệ gọi thẳng API (bỏ qua UI) → 409 và DB không đổi.
- AC-DATA-4: Hai cán bộ cùng "Tiếp nhận" một hồ sơ → một bên thành công, bên kia nhận 409 `VERSION_CONFLICT`/`TRANSITION_NOT_ALLOWED` và timeline chỉ có một mục.
- AC-DATA-5: Gửi cùng `Idempotency-Key` hai lần → một hồ sơ.

---

## 17. Câu hỏi mở và rủi ro giai đoạn 2

**Cần chủ dự án duyệt trước khi code (đánh dấu [ĐĐ] ở trên):**

1. **Chống dò mã bí mật (13.4):** giữ mã 4 số cho trải nghiệm + `ownerToken` mạnh + khoá thử sai – hay đổi mã thành 6 ký tự (đổi AC-C04-11, link, QR)?
2. **Cột `is_seed` (16.3)** để bất biến 64/47/3,2 không vỡ khi có hồ sơ thật – chấp nhận?
3. **Chế độ demo offline giữ link cũ (16.1):** triển khai thành dự án Vercel riêng để link đã nộp không đổi – chấp nhận?
4. **Vùng đặt dữ liệu:** Supabase gói miễn phí không có máy chủ trong nước (gần nhất Singapore). Hồ sơ chứa SĐT công dân → khi chạy thật cần cân nhắc Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (lưu ở nước ngoài, thông báo xử lý dữ liệu, đồng ý của chủ thể). Phục vụ thi/pilot nhỏ thì chấp nhận được; **triển khai chính thức cho phường cần phương án hạ tầng khác – chủ dự án quyết**.
5. **CB không xem được SĐT đầy đủ (13.5):** có chấp nhận không? Nếu cần gọi lại người dân, phải thêm tính năng riêng có nhật ký.
6. **Không có "Quên mật khẩu" tự phục vụ cho nhân viên (13.2)** – nhà phát triển đặt lại bằng script. Chấp nhận ở giai đoạn 2?
7. **Cron 1 lần/ngày** (giới hạn gói Hobby của Vercel) cho tự đóng hồ sơ 7 ngày – chấp nhận độ trễ tối đa 24 giờ?

**Rủi ro:**

| Rủi ro | Biện pháp |
|---|---|
| Lộ SĐT qua API/log | AC-AUTH-6, 8; serializer công khai duy nhất (`toPublicReport`) dùng cho mọi endpoint ngoài `/me` |
| Gói miễn phí Supabase tạm dừng khi không dùng 7 ngày | Ghi vào hướng dẫn vận hành; cron ping hằng ngày |
| Giới hạn kết nối DB từ Vercel Functions | Dùng chuỗi kết nối **pooler (transaction mode)**, mỗi function tối đa 1–3 kết nối |
| Lệch logic client/server | `domain/` dùng chung; test hợp đồng chạy cùng một bộ case trên hàm thuần và trên API |
| Lạm dụng gửi ẩn danh/spam | Quota 13.4, giới hạn OTP, kích cỡ ảnh; khoá bằng script nếu cần |
| Mock OTP bị bỏ quên khi chạy thật | Cờ `otpMock` trong `/public/config`, UI luôn hiện nhãn; `db:verify`/CI cảnh báo nếu `OTP_PROVIDER=mock` và `NODE_ENV=production` mà không đặt `ALLOW_MOCK_OTP=true` |
