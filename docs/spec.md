# SPEC – Trấn Biên Kết Nối

Phiên bản: **3.1 (26/11/2026)** – bổ sung phiên đăng nhập theo cổng và nút chuyển cổng cho demo (mục 13.3a, AC-SESSION-*, AC-ROLE-1, AC-API-13). Nền: **3.0 (25/11/2026)** · Mục 0–9 = nghiệp vụ và giao diện (nền là giai đoạn 1, đã nộp 24/11/2026, **đã sửa theo FR-08**). **Mục 10–17 = giai đoạn 2** (backend + database, mở 25/11/2026): khi mục 10–17 mâu thuẫn mục 1.2, 1.3, 2, 4.4, 5 thì mục 10–17 thắng.  
Nhãn: **[ĐỀ]** yêu cầu BTC · **[GĐ]** giả định thiết kế · **[KC]** cần kiểm chứng · **[ĐĐ]** đề xuất chờ chủ dự án duyệt

## Nguồn và thứ tự ưu tiên của v3.0

| Nguồn | Dùng cho | Ghi chú |
|---|---|---|
| Khối **FR-08** ở đầu `docs/proposal_v2.1.md` | **Luồng người dùng** (đăng nhập, SĐT, "Tôi cũng gặp", thông báo, QR, bỏ ẩn danh) | Quyết định mới nhất của nhóm, cao nhất. Phần thân proposal_v2.1 chưa cập nhật theo FR-08, khi mâu thuẫn thì theo FR-08 |
| `docs/proposal_v3.md` | Kỹ thuật giai đoạn 2 (kiến trúc, DB, API, bảo mật) | Các câu về "gửi ẩn danh", "SĐT luôn che", "3 nhóm người dùng, không có admin" **không còn hiệu lực** (xem bảng dưới) |
| Quyết định của chủ dự án | Vai trò Quản trị viên phường (mục 13, 14); AI gợi ý loại sự cố bằng DeepSeek (B1) | Đã áp dụng ở mục 13, 14, 10.1 |

## Thay đổi so với v1.x

"Thêm" = AC mới · "Sửa" = AC giữ ID, đổi nội dung · "Bỏ" = AC không còn hiệu lực (dòng vẫn giữ trong file, ghi "Đã bỏ theo FR-08").

| Màn / mục | Thêm | Sửa | Bỏ |
|---|---|---|---|
| Mục 0, 1.2, 1.3, 2, khung chung | AC-ROLE-1, AC-NAV-4 | Phạm vi, bảng vai trò (4 vai trò), bảng "Trong phạm vi" | Chọn vai trò không cần mật khẩu (chỉ còn ở chế độ local) |
| 3.3, 3.4, 3.4a, 3.4b, 3.6 | – | 3.4a quyền chủ hồ sơ theo SĐT đăng nhập; 3.4b chỉ còn quy tắc cho hồ sơ ẩn danh cũ; 3.4 người nhận tin; 3.6 `followerCount` | Hạn mức 5 hồ sơ ẩn danh/thiết bị/ngày (3.4b); `chuyen_co_quan` không còn thao tác trên UI cán bộ |
| 4.1, 4.4 | `aiSuggestion` | `reporterPhone`, `anonymous`, `secretCode`, `followers`, `anonymousFollows`, `deviceReports` | `settings.anonymousLog` |
| 5.3 | – | 6 hồ sơ ẩn danh là dữ liệu lịch sử, không tạo mới | – |
| C01 | AC-C01-8 (quét QR) | AC-C01-1, 5, 6 | – |
| C02 | – | AC-C02-5 (gợi ý lưu vào bản nháp) | – |
| C04 | AC-C04-14 (chưa đăng nhập → đăng nhập → quay lại bước 3), AC-C04-15 (không chọn sẵn loại, nút tiếp tục) | AC-C04-1, 5, 6, 13 | **AC-C04-10, AC-C04-11, AC-C04-12** (gửi ẩn danh, thành công ẩn danh, quota ẩn danh) |
| C05 | – | AC-C05-1, 5, 6, 7 | – |
| C06 | AC-C06-13 ("Tôi cũng gặp"), AC-C06-14 (lời mời đăng nhập thay cho đánh giá), AC-C06-15 (nhận tin báo) | AC-C06-5, 8, 9, 10, 11 | – |
| C07, C08 | AC-C07-10 (xem không cần đăng nhập) | – | – |
| C09 | AC-C09-1, 2, 3 (Thông báo `/thong-bao`) | AC-C05-5 trỏ sang C09 | – |
| A01 | AC-A01-10 (cột SĐT) | AC-A01-3, 9 | – |
| A02 | AC-A02-11 (SĐT đầy đủ + nút "Gọi"), AC-A02-12 (xem gợi ý AI) | AC-A02-1, 3, 8, 10 | **AC-A02-3 phần "Chuyển cơ quan khác"** |
| V01, V02, V03 | AC-V02-6 (SĐT + "Gọi" có điều kiện), AC-V03-1 → 3 (bản đồ nhiệm vụ) | AC-V01-1, AC-V02-1 → 5 (V02 dạng 3 bước, ảnh hoặc video) | – |
| 7.7, 8, DEMO | Mục 7.7 "Hiển thị số điện thoại"; route `/thong-bao`, `/tnv/ban-do`, `/ho-so`, `/quan-tri/*`, các route phụ | AC-DEMO-1, 2 (chỉ chế độ local); mục 8 Route | "Demo Hub" làm cách duy nhất chọn vai trò |
| 10.1, 10.5, 10.6 | Mục 10.5 "Thật / Mô phỏng"; AC-AI-1 → 4 | 10.1 (AI thật, có trang quản trị), 10.4 | "Trang quản trị: Không làm"; "AI thật" ngoài phạm vi |
| 11 | Cột `reports.ai_suggestion` | Bảng `anonymous_submissions` (không còn dùng) | – |
| 12.3, 12.4, 12.5, 12.6 | `CITIZEN_LOGIN_REQUIRED`; `alreadyFollowed`; AC-API-10, 11, 12 | `POST /citizen/reports` bắt buộc token; follow; feedback, supplement; `/officer/*` và `/volunteer/tasks/:code` trả SĐT đầy đủ có điều kiện; 12.6 có `/admin/*` | `anonymous:true` + `X-Device-Id` khi gửi |
| 13.3 → 13.6 | AC-AUTH-9, 10; AC-LOGIN-2 thêm Quản trị viên | 13.3, 13.4 (chỉ cho hồ sơ ẩn danh cũ), 13.5 (SĐT đầy đủ), AC-AUTH-6 | Hạn mức ẩn danh theo thiết bị/IP (13.4 mục 5) |
| 16 | AC-DATA-6 | 16.1, 16.2 (hai chế độ, đăng nhập người dân) | – |
| 17 | Câu hỏi mở FR-08 (mục 17.1) | Mục 17, bảng rủi ro | Quyết định "CB không xem SĐT đầy đủ" (đảo ngược có chủ đích) |

**Thay đổi có chủ đích về SĐT (D7):** spec v1.x/v2.0 ghi cán bộ chỉ thấy SĐT đã che (`0909 *** 068`) và TNV không thấy SĐT. FR-08 đảo lại để cán bộ/TNV liên lạc được khi cần bổ sung thông tin. SĐT vẫn **không bao giờ** xuất hiện ở màn hình công khai và API công khai (bất biến AGENTS.md).

---

## 0. Thứ tự ưu tiên phạm vi

**Làm trước – Lõi (Functional Requirements):** 6 màn hình bắt buộc của đề + 3 nhóm người dùng nghiệp vụ (cộng Quản trị viên vận hành) + công khai kết quả + gửi phản ánh bằng SĐT đã đăng nhập, theo dõi, "Tôi cũng gặp", thông báo, quét QR (FR-08). Mọi AC không gắn nhãn đều thuộc lõi.

**Hoãn – Bonus:** các AC gắn nhãn **[BONUS – HOÃN]** chưa thiết kế chi tiết, chưa code, chưa viết test. Lõi phải chạy trọn trên bản deploy trước khi mở lại bonus.

| Mã | Bonus | Nguồn | AC / mục liên quan |
|---|---|---|---|
| B1 | Gợi ý loại từ ảnh bằng AI | [ĐỀ] điểm cộng | AC-C02-5, phần "Gợi ý" của AC-C04-1, mục 10.1, 10.3 |
| B2 | Phát hiện & gộp phản ánh trùng | [ĐỀ] điểm cộng | 3.5, AC-C04-3, 7, 8, AC-A01-5, AC-A02-6, 7. **Nút "Tôi cũng gặp" đã chuyển sang lõi** (AC-C06-13, FR-08) |
| B3 | Chế độ chữ lớn | [ĐỀ] điểm cộng | 7.2 (cột Chữ lớn), 7.4 (cột Chữ lớn), AC-C01-2, AC-C03-7 |
| B4 | Mô tả bằng giọng nói | Mở rộng của nhóm | Phần micro của AC-C04-2 |
| B5 | Gửi hộ & tổng đài | Mở rộng của nhóm | AC-A01-8, AC-C01-4 |

Lưu ý khi làm lõi: vẫn giữ chỗ cho bonus để thêm sau không phải đập lại – kích thước dùng biến CSS (sẵn cho B3), C04 có vùng trống phía trên thẻ loại (sẵn cho B1), store có trường `suspectedDuplicateOf` (sẵn cho B2).

Quy chuẩn UI/UX chi tiết, wireframe và phân tích mẫu tham khảo: **`docs/ui-ux-guidelines.md`** – bắt buộc đọc trước khi làm bất kỳ màn hình nào.

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

Sản phẩm web (giao diện + backend giai đoạn 2) thể hiện trọn vòng đời một phản ánh hiện trường: người dân đăng nhập SĐT và gửi → cán bộ tiếp nhận, phân loại, giao xử lý → TNV xác minh → cán bộ cập nhật kết quả kèm ảnh → người dân xem, đánh giá hoặc mở lại → kết quả công khai.

### 1.2. Trong phạm vi

| Hạng mục | Mức độ |
|---|---|
| Màn hình người dân C01–C09, cán bộ A01–A03, TNV V01–V03, đăng nhập, quản trị `/quan-tri/*`, trạng thái phụ; Demo Hub (chỉ chế độ local) | Đầy đủ, tương tác được |
| Bản đồ OpenStreetMap, GPS trình duyệt | Thật |
| Chụp/chọn ảnh, nén ảnh phía client | Thật |
| Lưu dữ liệu | Chế độ API: PostgreSQL + PostGIS (Supabase). Chế độ local: localStorage (mock) |
| Gợi ý loại sự cố từ ảnh (B1) | AI thật (DeepSeek) khi `AI_PROVIDER=deepseek`; mô phỏng khi `AI_PROVIDER=mock` (mục 10.5) |
| OTP, SMS/Zalo, tổng đài | Mô phỏng (nhãn "Mô phỏng" trên UI) |
| Đăng nhập SĐT để gửi phản ánh, "Tôi cũng gặp" 1 lần/SĐT, thông báo, quét QR mở nhanh hồ sơ | Đầy đủ (FR-08) |
| Gửi ẩn danh, máy tự nhớ phản ánh, link theo dõi + QR, đăng ký nhận tin sau | **Đã bỏ theo FR-08** cho hồ sơ mới. Chỉ còn đọc/theo dõi 6 hồ sơ ẩn danh cũ trong dữ liệu mẫu (3.4b) |
| Chia sẻ link | Web Share API; không hỗ trợ → sao chép link |
| Giọng nói → chữ | Web Speech API, ẩn nếu không hỗ trợ – **[BONUS – HOÃN]** |
| Chế độ chữ lớn | Đầy đủ – **[BONUS – HOÃN]** |

### 1.3. Ngoài phạm vi

*(Áp dụng cho giai đoạn 1. Sang giai đoạn 2, backend, database, xác thực, phân quyền thật, trang quản trị và **AI gợi ý loại sự cố bằng DeepSeek** **nằm trong phạm vi** – xem mục 10, 14; vẫn ngoài phạm vi: gửi SMS/Zalo thật qua telco, đa ngôn ngữ, web push – xem 10.3, 10.4.)*

Backend, database, xác thực thật, gửi tin nhắn thật qua telco, phân quyền bảo mật thật, đa ngôn ngữ, thông báo đẩy (web push).

---

## 2. Vai trò

Có **4 vai trò**: Người dân, Cán bộ, Tình nguyện viên, Quản trị viên phường (chi tiết quyền ở 13.5, quản trị ở mục 14).

| Mã | Vai trò | Thiết bị | Đăng nhập |
|---|---|---|---|
| ND | Người dân | Mobile 390px | **Xem không cần đăng nhập** (C01, C06 công khai, C07, C08). **Gửi phản ánh, "Tôi cũng gặp", thông báo, đánh giá bắt buộc đăng nhập** bằng SĐT + OTP mô phỏng (`123456`, nhãn "Mô phỏng") |
| CB | Cán bộ tiếp nhận | Desktop 1440px | Chế độ API: `/dang-nhap` (email + mật khẩu, Supabase Auth). Cả hai chế độ có nút chuyển cổng `PortalSwitcherFab`; chế độ local vào không cần mật khẩu, chế độ API vẫn phải đăng nhập |
| TNV | Thanh niên tình nguyện | Mobile 390px | Như CB |
| QTV | Quản trị viên phường | Desktop 1440px | Chế độ API: `/dang-nhap`. Chế độ local: không dùng được, trang `/quan-tri/*` báo "Cần chế độ API" |

- AC-ROLE-1: Chế độ API không có chỗ nào cho phép **vào** vai trò nhân viên mà không đăng nhập; không còn "Demo Hub" làm đường vào. Nút chuyển cổng `PortalSwitcherFab` (Người dân, Cán bộ, Tình nguyện viên, Quản trị) **hiện ở cả hai chế độ** để demo chuyển nhanh giữa các cổng: đây chỉ là đường tắt điều hướng. Ở chế độ API, mở cổng khi chưa đăng nhập → `/dang-nhap?redirect=`; đăng nhập sai vai trò → `/khong-co-quyen?redirect=`, nút "Đổi tài khoản" đăng nhập lại rồi quay về đúng cổng. (Sửa 25/11/2026 theo yêu cầu chủ dự án, trước đó ẩn nút ở chế độ API.)

Tài khoản mẫu **[GĐ]**:
- CB: "Nguyễn Văn Minh – Cán bộ tiếp nhận".
- TNV: "Lê Thảo Vy", "Trần Quốc Bảo", "Phạm Ngọc Hân".
- ND demo: "Ông Tư" – SĐT `0909 000 068` (đăng nhập bằng OTP mô phỏng `123456`).
- Quản trị viên: "Quản trị viên Phường" (mục 14).

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
| `hoan_thanh` | `dong` | Hệ thống | **Chủ hồ sơ** (3.4a) chọn "Đã giải quyết" + đánh giá; hoặc 7 ngày không phản hồi [GĐ] |
| `hoan_thanh` | `mo_lai` | Hệ thống | **Chủ hồ sơ** chọn "Chưa giải quyết" → sinh nhiệm vụ nghiệm thu |
| `mo_lai` | `dong` | CB | TNV nghiệm thu xác nhận đã ổn; CB đóng kèm lý do |
| `moi`, `da_tiep_nhan` | `can_bo_sung` | CB | Lý do bắt buộc |
| `can_bo_sung` | `moi` | ND (chủ hồ sơ) | Bổ sung ảnh hoặc vị trí |
| bất kỳ trừ `dong`, `da_gop` | `da_gop` | CB | Chọn hồ sơ chính |
| `da_gop` | trạng thái trước khi gộp | CB | Thao tác "Tách" |
| `moi`, `da_tiep_nhan` | `chuyen_co_quan` | – | **Không còn thao tác trên UI cán bộ** (A02 đã bỏ nút "Chuyển cơ quan khác" theo FR-08/D10). Trạng thái và dữ liệu cũ vẫn hiển thị; quyết định giữ hay bỏ API ở mục 17.1 |

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

| Đăng ký nhận tin (chỉ hồ sơ ẩn danh cũ) | "Bạn đã đăng ký nhận tin cho #{id}. Số này chỉ dùng cho phản ánh này." |

Người nhận: mọi SĐT trong `followers` của hồ sơ (người gửi, người bấm "Tôi cũng gặp", người đăng ký nhận tin sau ở hồ sơ ẩn danh cũ) và của hồ sơ đã gộp vào nó. Hồ sơ ẩn danh cũ chưa đăng ký nhận tin không sinh thông báo SMS.

**Thông báo chỉ dành cho người đã đăng nhập (D5):** chuông và trang C09 `/thong-bao` chỉ hiện danh sách khi đã đăng nhập SĐT; chưa đăng nhập hiện lời mời đăng nhập. "Nhận tin báo" (cả "Tôi cũng gặp" lẫn đăng ký nhận tin của hồ sơ ẩn danh cũ) cũng chỉ hiện với người đã đăng nhập.

Hiển thị: chuông + trang C09 (AC-C09-1 → 3), toast khi có thông báo mới, xem trước dạng tin nhắn SMS có nhãn "Mô phỏng".

### 3.4a. Quyền "chủ hồ sơ" [GĐ]

**Chủ hồ sơ** là người dân **đã đăng nhập** có SĐT trùng `reporterPhone` của hồ sơ. Với 6 hồ sơ ẩn danh cũ (3.4b), `reporterPhone` rỗng nên chủ hồ sơ là người thoả **một trong**: (a) SĐT đã đăng nhập nằm trong `followers` với nguồn `subscribe_later`; (b) thiết bị còn cặp `{id, secretCode}` trong `settings.deviceReports` (khoá thiết bị cũ); (c) URL có `?k=` khớp `secretCode` (chỉ hồ sơ ẩn danh cũ).

Quyền theo vai trò đối với một hồ sơ:

| Người xem | Xem công khai | Đánh giá hài lòng | "Chưa giải quyết" (mở lại) | Bổ sung khi `can_bo_sung` | "Tôi cũng gặp" | Nhận tin báo |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Chưa đăng nhập | ✓ | ✗ (thấy lời mời đăng nhập) | ✗ | ✗ | ✗ (chuyển đăng nhập) | ✗ |
| Đã đăng nhập, chủ hồ sơ | ✓ | ✓ | ✓ | ✓ | ✗ (không thấy nút) | ✓ (đã là người nhận) |
| Đã đăng nhập, **không phải chủ** (kể cả người đã bấm "Tôi cũng gặp") | ✓ | ✗ | ✗ | ✗ | ✓ (1 lần/SĐT) | ✓ (chỉ nhận tin) |

Người bấm "Tôi cũng gặp" **không** thành chủ hồ sơ. Họ được thêm vào `followers` (nguồn `also_me`) chỉ để nhận tin báo. Mọi hồ sơ mới gửi từ v3.0 là hồ sơ có SĐT, nên không còn cơ chế `secretCode` cho hồ sơ mới.

### 3.4b. Hồ sơ ẩn danh cũ [GĐ] – gửi ẩn danh **đã bỏ theo FR-08**

**Đã bỏ theo FR-08:** không còn gửi ẩn danh ở giao diện và API; không còn hạn mức 5 hồ sơ ẩn danh/thiết bị/ngày (`settings.anonymousLog`) và 20/ngày/IP. Chống spam khi gửi chuyển sang theo SĐT (12.3, 13.4).

Phần còn lại áp dụng **chỉ cho 6 hồ sơ `anonymous: true` trong dữ liệu mẫu** (5.3, là dữ liệu lịch sử; không tạo mới được):
- Giữ nguyên `anonymous: true`, `reporterPhone` rỗng. Cán bộ vẫn thấy nhãn "Ẩn danh" (hoặc "Ẩn danh · đã đăng ký nhận tin" với hồ sơ có `subscribedLater`).
- "Đăng ký nhận tin sau" (AC-C06-9) và link theo dõi `?k=` (AC-C06-10, 11) **chỉ còn áp dụng cho các hồ sơ này**. Không có luồng gửi mới nào dẫn tới chúng.
- Đăng ký nhận tin sau: SĐT đã đăng nhập được thêm vào `followers` của **riêng hồ sơ đó**, `subscribedLater: true`; hồ sơ vẫn giữ `anonymous: true` với cộng đồng và cán bộ (bất biến AGENTS.md).
- `anonymousFollows` chỉ còn là **số liệu lịch sử** của dữ liệu mẫu (gồm cả người gửi ẩn danh cũ). "Tôi cũng gặp" mới luôn thêm một SĐT vào `followers`, không tăng `anonymousFollows`.

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

- Số người cùng báo `followerCount = followers.length + anonymousFollows` (`anonymousFollows` > 0 chỉ ở dữ liệu ẩn danh cũ; người gửi ẩn danh cũ tính là 1 trong đó).
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
| `reporterPhone` | string? | **✗** | **Bắt buộc với hồ sơ mới** (SĐT của token đăng nhập). Rỗng chỉ ở 6 hồ sơ ẩn danh cũ. Không bao giờ render ở màn công khai hay API công khai. Hiển thị **đầy đủ** chỉ ở: A01 (cột SĐT), A02 (kèm nút "Gọi"), V02 khi nhiệm vụ đang giao cho chính TNV và chưa xong (7.7); người đăng nhập thấy SĐT của chính mình ở C05/hồ sơ cá nhân |
| `anonymous` | boolean | – | `true` chỉ ở 6 hồ sơ lịch sử (3.4b). Hồ sơ mới luôn `false` |
| `subscribedLater` | boolean | – | Hồ sơ ẩn danh cũ đã đăng ký nhận tin sau |
| `secretCode` | string 4 số | **✗** | Chỉ còn ý nghĩa với hồ sơ ẩn danh cũ (link `?k=`). Không bao giờ render ngoài C06 của chủ hồ sơ ẩn danh cũ và link theo dõi |
| `aiSuggestion` | `{ category: Category \| null, confidence: number, reason: string, provider: 'deepseek' \| 'mock' }`? | – | Gợi ý AI lúc gửi (B1), lưu vào bản nháp và gửi kèm hồ sơ (cột `reports.ai_suggestion`). Chỉ cán bộ xem ở A02 (AC-A02-12); không công khai |
| `onBehalf` | boolean | – | Gửi hộ |
| `followers` | string[] (SĐT) | – | Người gửi, người bấm "Tôi cũng gặp" (mỗi SĐT tối đa 1 lần), người đăng ký nhận tin sau ở hồ sơ ẩn danh cũ; UI công khai chỉ hiện số lượng |
| `anonymousFollows` | number | – | **Số liệu lịch sử** của dữ liệu mẫu (người ẩn danh cùng báo, gồm người gửi ẩn danh cũ). Không tăng nữa |
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
| `result` | `{ exists: 'co' \| 'khong' \| 'khong_tim_thay', severity?: 'nhe' \| 'trung_binh' \| 'nguy_hiem', photo: string, note?: string, at: ISO }`? (`photo` là ảnh; V02 có thể nhận video, xem câu hỏi mở 17.1) |

### 4.3. Notification

`{ id, phone, reportId, message, createdAt, read: boolean, channel: 'app' | 'sms_mo_phong' }`

### 4.4. Settings (localStorage, theo thiết bị)

`{ seniorMode: boolean, phone?: string, demoNow: ISO, deviceReports: { id: string, secretCode: string }[] }`

- `phone` là SĐT đã đăng nhập (OTP mô phỏng). Không có `phone` = chưa đăng nhập.
- `deviceReports` chỉ còn dùng cho hồ sơ ẩn danh cũ ("máy tự nhớ"). Hồ sơ mới gắn với SĐT đăng nhập, không lưu theo thiết bị.
- `anonymousLog` **đã bỏ theo FR-08** (không còn hạn mức ẩn danh).
- Chế độ local lưu thêm danh sách `{SĐT, mã hồ sơ}` đã bấm "Tôi cũng gặp" để áp dụng quy tắc 1 lần/SĐT (khoá `tbkn:followed-reports`); chế độ API do server giữ (12.3).

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
- 6 hồ sơ `anonymous: true` (3 rác thải, 1 mỗi loại còn lại) phân bổ ở cả nhóm đã xử lý và chưa hoàn tất; đúng 1 hồ sơ ẩn danh có `subscribedLater: true`. **Giữ nguyên theo FR-08 (D2):** đây là dữ liệu lịch sử, cán bộ vẫn thấy nhãn "Ẩn danh", người dân không tạo mới được; sinh dữ liệu và `mock:verify`/`db:verify` không đổi.
- Các hồ sơ không ẩn danh có `reporterPhone` (SĐT mẫu, không công khai).
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
- AC-NAV-4: Ghi chú cấu trúc luồng gửi trong UI hiện tại: C02 (chụp ảnh) → **C04 gồm 3 bước nội bộ** ① Phân loại ② Vị trí ③ Mô tả và Gửi (`/bao-su-co/xac-nhan?step=1|2|3`). Quy tắc AC-C03-* là quy tắc của bước ② (route riêng `/bao-su-co/vi-tri` vẫn tồn tại). Việc đánh số "Bước n/3" ở C02 trùng với wizard C04 là điểm cần chốt (17.1, câu 9).

### C01 – Trang chủ người dân

- AC-C01-1: Thứ tự khối từ trên xuống: Header ("Phường Trấn Biên" + nút quét QR + chuông; chuông chưa đăng nhập dẫn tới lời mời đăng nhập ở C09) → thẻ kêu gọi "Thấy chỗ hư hỏng? Chụp một tấm, phường sẽ lo." + nút "Báo sự cố" → "Phản ánh của bạn" → "Quanh đây" → dải số liệu.
- AC-C01-6: "Phản ánh của bạn": thẻ cho mỗi hồ sơ của **SĐT đã đăng nhập** (cộng hồ sơ ẩn danh cũ còn trong `deviceReports`), mới nhất trước, trượt ngang có chấm phân trang. Mỗi thẻ: icon + tên loại, mã, ProgressBar ngang 4 mốc có giờ, câu "Cập nhật mới nhất" (3.4c), DelayChip nếu chậm (3.6a). Chạm → C06. **Chưa đăng nhập hoặc không có hồ sơ → ẩn khối.**
- AC-C01-7: "Quanh đây": 3 hồ sơ gần nhất (GPS nếu đã cấp, không thì tâm phường) gồm icon loại, nhãn trạng thái, khoảng cách; link "Xem bản đồ" → C07.
- AC-C01-3: Dải số liệu: "Tháng 11: 47/64 phản ánh đã xử lý →" tính từ dữ liệu, chạm → C08.
- AC-C01-5: Xem trang chủ, "Quanh đây", dải số liệu **không yêu cầu đăng nhập**. Bấm "Báo sự cố" vào được C02 và C04 không cần đăng nhập; chỉ bước gửi (AC-C04-14) mới đòi đăng nhập.
- AC-C01-8: **Quét QR (D6):** nút "Quét QR" ở header C01 mở khung quét (camera `getUserMedia`, hoặc chọn ảnh QR, hoặc dán/nhập mã `TB-xxxx` hoặc link). Đọc được mã hợp lệ → chuyển thẳng `/phan-anh/:id` (giữ `?k=` nếu link có). Không đọc được hoặc không có mã `TB-\d+` → thông báo bằng lời "Không nhận diện được mã phản ánh (ví dụ: TB-0001 hoặc link phản ánh)." và ở lại khung quét. Đọc QR bằng camera dựa vào `BarcodeDetector` của trình duyệt; trình duyệt không hỗ trợ → báo bằng lời và dùng nhập mã. Thiết bị không có camera hoặc bị từ chối quyền → thông báo bằng lời kèm cách khắc phục, vẫn dùng được chọn ảnh QR và nhập mã. Tắt khung quét thì tắt camera. QR chứa link `{origin}/phan-anh/{id}` (thẻ QR chia sẻ ở C06, AC-C06-11); QR không chứa SĐT.
- AC-C01-2: **[BONUS – HOÃN – B3]** Nút "Aa Chữ lớn" ở header; bật/tắt có hiệu lực toàn app và được ghi nhớ.
- AC-C01-4: **[BONUS – HOÃN – B5]** Nút "Gọi tổng đài phường" (mô phỏng).

### C02 – Bước 1: Chụp ảnh

- AC-C02-1: Header theo AC-NAV-2, "Bước 1/3 – Ảnh".
- AC-C02-2: Ô chụp lớn ≈ 60% chiều cao vùng nội dung, icon camera + "Chạm để chụp ảnh", dùng `<input type="file" accept="image/*" capture="environment">` (không dựng khung ngắm `getUserMedia`). Nút phụ "Chọn ảnh có sẵn" (không có `capture`). Dòng mẹo: "Lùi xa một chút để thấy cả xung quanh chỗ bị hư."
- AC-C02-3: Sau khi có ảnh: ô chụp thành ảnh xem trước lớn có nút "Chụp lại"; bên dưới dải ảnh nhỏ + ô "+"; tối đa 3 ảnh; nén cạnh dài ≤ 1280px, JPEG 0,7; xoá từng ảnh.
- AC-C02-4: "Tiếp tục" chỉ bật khi có ≥ 1 ảnh.
- AC-C02-6: Ảnh lỗi định dạng hoặc > 15MB trước nén → thông báo bằng lời + cách khắc phục.
- AC-C02-7: Bấm "✕" khi đã có dữ liệu → hỏi "Lưu nháp để gửi sau?" [Lưu nháp] [Bỏ]; nháp khôi phục khi bấm lại "Báo sự cố".
- AC-C02-5: **[B1 – AI thật DeepSeek]** Sau khi người dân chụp hoặc chọn ảnh, hệ thống gọi dịch vụ AI ngầm để gợi ý loại sự cố từ ảnh. Gợi ý chỉ mang tính tham khảo, người dân luôn là người quyết định cuối cùng, không bao giờ tự chọn thay người dân và không chặn luồng gửi phản ánh. **Gợi ý được lưu vào bản nháp (AC-C02-7) và gửi kèm hồ sơ khi gửi** (`aiSuggestion`, cột `reports.ai_suggestion`); gợi ý không mất khi người dân phải đăng nhập giữa chừng (AC-C04-14). Chưa đăng nhập vẫn dùng được gợi ý. Kỹ thuật ở 10.6 (AC-AI-1 → 4).

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

### C04 – Xác nhận và gửi (3 bước nội bộ: ① Phân loại · ② Vị trí · ③ Mô tả và Gửi)

- AC-C04-13: Bố cục: ảnh 120px phía trên; sheet theo từng bước. Bước ①: tiêu đề "Chọn loại phản ánh", lưới 4 CategoryTile, nút chính "Tiếp tục chọn vị trí". Bước ②: LocationRow (nút "Đổi" → C03) và bản đồ theo AC-C03-*. Bước ③: ô mô tả, nút chính **"Gửi phản ánh"**. ~~Link phụ "Gửi không để lại số điện thoại"~~ **Đã bỏ theo FR-08**.
- AC-C04-15: **Không chọn sẵn loại (D8).** Vào bước ① không có CategoryTile nào được chọn (kể cả khi AI đã có gợi ý). Nút "Tiếp tục chọn vị trí" **tắt** cho tới khi người dân chọn một loại; khi tắt có dòng nhắc bằng chữ "Hãy chọn một loại sự cố để tiếp tục" (không chỉ dùng màu). Chọn lại loại khác được; không có lựa chọn mức ưu tiên.
- AC-C04-1: 4 CategoryTile lưới 2×2, ≥ 96px, icon + nhãn; chọn → viền 2px primary + ✓ + `aria-pressed`. Điều kiện bật nút theo AC-C04-15.
  - **[B1 – AI gợi ý DeepSeek]**: Băng gợi ý hiển thị trên lưới 4 loại (trên desktop nằm đầu cột form phải):
    * Trạng thái đang phân tích: icon ✨ + "Đang phân tích ảnh...".
    * Có kết quả (confidence ≥ 0,5): "AI gợi ý: <Tên Loại> – <Lý do>" + nút "Dùng gợi ý" (người dùng bấm mới chọn loại đó, không tự động chọn thay, không ghi đè nếu đã chọn loại khác trừ khi bấm nút).
    * Không nhận diện được hoặc confidence < 0,5 hoặc lỗi: "Không nhận ra loại sự cố, bạn chọn giúp nhé" (nhẹ nhàng, không báo lỗi đỏ, không chặn việc gửi).
    * Bỏ hoàn toàn số giả "(94%)".
    * Nhãn nguồn: nhà cung cấp `deepseek` → "Gợi ý bởi AI – vui lòng kiểm tra lại"; `mock` → "Gợi ý mô phỏng".
    * Dưới ô ảnh có dòng cam kết quyền riêng tư: "Ảnh được gửi tới dịch vụ AI (DeepSeek) để gợi ý loại sự cố".
    * Gợi ý (kể cả "không nhận ra") được lưu vào bản nháp và gửi kèm hồ sơ (AC-C02-5).
- AC-C04-2: Mô tả tùy chọn ≤ 300 ký tự, placeholder "Ví dụ: ổ gà sâu, xe máy dễ té". *(Nút micro: [BONUS – HOÃN – B4].)*
- AC-C04-5: **Gửi phản ánh bắt buộc đã đăng nhập SĐT (D1).** Đăng nhập = nhập SĐT (10 số, bắt đầu bằng 0) + OTP mô phỏng `123456` (nhãn "Mô phỏng", gợi ý "Mã demo: 123456"), thực hiện ở `/ho-so?login=1`. Dòng cam kết: "Số điện thoại chỉ dùng để báo tin và để cán bộ liên hệ khi cần bổ sung, không hiển thị công khai." (SĐT cán bộ/TNV có thể thấy, xem 7.7). Đã đăng nhập → bấm "Gửi phản ánh" gửi ngay, không hỏi lại.
- AC-C04-14: **Chưa đăng nhập bấm "Gửi phản ánh" ở bước ③ (D1):** chuyển tới `/ho-so?login=1&redirect=/bao-su-co/xac-nhan?step=3`. **Bản nháp giữ nguyên** (ảnh, loại, vị trí, mô tả, `aiSuggestion`). Đăng nhập xong quay lại đúng bước ③ với dữ liệu cũ; người dân bấm "Gửi phản ánh" lần nữa để gửi (không tự gửi). Nếu bản nháp đã mất (xoá dữ liệu trình duyệt) → về C02 kèm thông báo bằng lời. API từ chối nếu thiếu token (AC-API-10).
- AC-C04-6: Thành công → màn thành công theo wireframe: ✅, "Phường đã nhận phản ánh", mã `TB-xxxx` ≥ 32px, đoạn "Tiếp theo: cán bộ phường sẽ xem và tiếp nhận, thường trong ngày làm việc. Bạn sẽ nhận tin nhắn khi có cập nhật.", nút "Theo dõi phản ánh" → C06, link "Về trang chủ". Hồ sơ gắn với SĐT đăng nhập (`reporterPhone`, `anonymous: false`) và hiện trong C05 của SĐT đó; **không** còn mã bí mật, link `?k=` hay `deviceReports` cho hồ sơ mới.
- ~~AC-C04-10~~: **Đã bỏ theo FR-08** (link "Gửi không để lại số điện thoại" và sheet cảnh báo gửi ẩn danh).
- ~~AC-C04-11~~: **Đã bỏ theo FR-08** (màn thành công ẩn danh với mã bí mật, QR `?k=`, "Lưu link theo dõi").
- ~~AC-C04-12~~: **Đã bỏ theo FR-08** (quota 5 hồ sơ ẩn danh/ngày). Giới hạn chống spam theo SĐT: xem 13.4 và câu hỏi mở 17.1.
- AC-C04-9: Mất mạng khi gửi → giữ nháp, banner "Chưa gửi được – sẽ thử lại khi có mạng", nút "Thử lại".
- AC-C04-3, AC-C04-7, AC-C04-8: **[BONUS – HOÃN – B2]** Kiểm tra trùng, "Tôi cũng gặp", cờ nghi trùng.

### C05 – Phản ánh của tôi

- AC-C05-1: Route `/cua-toi` và `/ho-so` (tài khoản người dân). Header "Phản ánh của tôi" + chuông. **Đã đăng nhập:** danh sách hồ sơ có `reporterPhone` = SĐT đăng nhập, cộng hồ sơ người dân đã bấm "Tôi cũng gặp" (nhóm riêng "Tôi cũng gặp") và hồ sơ ẩn danh cũ còn trong `deviceReports`. **Chưa đăng nhập:** không có danh sách; hiện lời mời "Đăng nhập để xem phản ánh của bạn" + form SĐT/OTP mô phỏng + "Tra cứu bằng mã phản ánh". `?login=1` mở sẵn form đăng nhập; `?redirect=<đường dẫn nội bộ bắt đầu bằng />` quay lại sau khi đăng nhập thành công (chỉ chấp nhận đường dẫn nội bộ).
- AC-C05-3: Tab trạng thái cuộn ngang có số đếm: Tất cả · Chờ tiếp nhận · Đã tiếp nhận · Đang xử lý · Đã xử lý · Khác (cần bổ sung / đã chuyển / không xác nhận / đã gộp).
- AC-C05-2: ReportCard: ảnh 64px, icon + tên loại, mã, địa chỉ 1 dòng, StatusChip công khai, DelayChip nếu chậm, câu "Cập nhật mới nhất" rút gọn 1 dòng.
- AC-C05-7: Cuối danh sách (hoặc khi trống): khối "Không thấy phản ánh của bạn?" với 2 lựa chọn "Đăng nhập bằng số điện thoại" (OTP mô phỏng) và "Tra cứu bằng mã phản ánh". Tra cứu bằng mã `TB-xxxx` mở C06 ở chế độ xem công khai (không cấp quyền chủ hồ sơ; quyền chủ chỉ qua đăng nhập, 3.4a). Riêng hồ sơ ẩn danh cũ: nhập thêm mã bí mật hoặc 4 số cuối SĐT đã đăng ký nhận tin để lấy lại quyền chủ (FR-08: "tự nhớ mã để tìm").
- AC-C05-6: *(Chỉ hồ sơ ẩn danh cũ)* Thẻ của hồ sơ chỉ có trên máy này (`deviceReports`, không gắn SĐT) có nút "Lưu link"; đầu danh sách có dòng "Xoá dữ liệu trình duyệt sẽ mất các phản ánh chỉ lưu trên máy này – hãy lưu link theo dõi." khi có ít nhất 1 thẻ như vậy. Hồ sơ mới gắn với SĐT nên không cần.
- AC-C05-4: Trống hoàn toàn: minh hoạ + "Bạn chưa có phản ánh nào" + nút "Báo sự cố".
- AC-C05-5: Chuông có số chưa đọc (chỉ khi đã đăng nhập); chạm chuông mở C09 `/thong-bao` (AC-C09-1 → 3). Nội dung danh sách thông báo mô tả ở C09.

### C06 – Chi tiết phản ánh

- AC-C06-12: Thứ tự khối: ảnh gốc → hàng loại + StatusChip + DelayChip → LocationRow (không có nút Đổi) → hộp "Cập nhật mới nhất" (3.4c) → "Hành trình phản ánh" (timeline dọc) → Trước/Sau → khu vực hành động. Khi `hoan_thanh`/`dong`: khối Trước/Sau lên ngay dưới ảnh gốc.
- AC-C06-1: Timeline dọc gồm đủ 4 mốc công khai: mốc đã qua (chấm đặc, giờ, 1 câu, tên bộ phận khi có), mốc hiện tại (vòng sáng), mốc tương lai (chấm rỗng, màu nhạt, "dự kiến {ngày}" nếu có `dueAt`). Trạng thái ngoại lệ hiện băng màu riêng + lý do phía trên timeline.
- AC-C06-3: Không lộ tên cá nhân; chỉ "Phường Trấn Biên", tên bộ phận, "Tình nguyện viên".
- AC-C06-4: Khối Trước/Sau luôn hiện từ đầu; ô Sau trống ghi "Chưa có ảnh sau xử lý"; có ảnh thì chạm để phóng to; dưới mỗi ảnh là thời điểm.
- AC-C06-5: `hoan_thanh` + **chủ hồ sơ đã đăng nhập** (3.4a) → khối "Vấn đề đã được giải quyết chưa?" [Đã giải quyết] [Chưa giải quyết].
  - Đã giải quyết → RatingSheet: tiêu đề "Bạn thấy kết quả thế nào?", phụ đề "Chưa đến 30 giây"; 5 sao có nhãn (Rất tệ · Không hài lòng · Bình thường · Hài lòng · Rất hài lòng); chip chọn nhiều theo số sao – 4–5 sao: "Xử lý nhanh", "Sạch sẽ, gọn gàng", "Làm đúng chỗ", "Được báo tin đầy đủ"; 1–3 sao: "Xử lý chậm", "Chưa triệt để", "Thiếu thông báo", "Ảnh kết quả chưa rõ"; ô "Phường có thể làm tốt hơn điều gì?" tuỳ chọn; nút "Gửi đánh giá" bật khi đã chọn sao → `dong`.
  - Chưa giải quyết → sheet "Điều gì chưa ổn?" với ảnh hiện trạng tuỳ chọn + ghi chú → `mo_lai` + VolunteerTask `nghiem_thu`; màn hiện "Phường đã nhận ý kiến và sẽ kiểm tra lại."
- AC-C06-6: `da_gop` → banner "Đã gộp vào #{id}" + link hồ sơ chính.
- AC-C06-7: `can_bo_sung` + chủ hồ sơ đã đăng nhập → nút chính "Bổ sung ngay" mở lại C02/C03 với dữ liệu cũ. Người khác chỉ thấy lý do cần bổ sung, không có nút.
- AC-C06-8: Người không phải chủ hồ sơ (3.4a: chưa đăng nhập, hoặc đã đăng nhập nhưng SĐT khác, kể cả người đã bấm "Tôi cũng gặp") xem được nhưng **không thấy** khối đánh giá, "Chưa giải quyết", "Bổ sung". "Tôi cũng gặp" xem AC-C06-13.
- AC-C06-9: *(Chỉ hồ sơ `anonymous` cũ.)* Chủ hồ sơ (3.4a, khoá thiết bị cũ hoặc `?k=`) + chưa có SĐT đăng ký → thẻ "Nhận tin báo cho phản ánh này" với câu "Số điện thoại chỉ dùng cho phản ánh này." Chưa đăng nhập → chuyển đăng nhập rồi quay lại. Đã đăng nhập → xác nhận → `subscribedLater: true` + thông báo xác nhận; thẻ đổi thành "Đang nhận tin qua 0909 *** 068 · Huỷ" (SĐT của chính người đó, dạng che). Huỷ → gỡ SĐT, `subscribedLater: false`. Hồ sơ vẫn `anonymous: true`. Hồ sơ có `reporterPhone` không có thẻ này.
- AC-C06-10: *(Chỉ hồ sơ ẩn danh cũ.)* Link có `k` sai → xem như người ngoài + dòng "Link theo dõi không đúng – hãy kiểm tra lại mã bí mật." Hồ sơ có `reporterPhone` bỏ qua `k`.
- AC-C06-11: Header có nút "⤴ Chia sẻ" mở thẻ QR + link `{origin}/phan-anh/{id}` (QR này quét được bằng AC-C01-8; không chứa SĐT). Riêng chủ hồ sơ ẩn danh cũ: link kèm `?k=` và thấy mã bí mật (ẩn mặc định, nút "Hiện").
- AC-C06-13: **"Tôi cũng gặp vấn đề này" (D4).** Hiện ở hàng hành động của C06 với hồ sơ còn đang xử lý (không ở `hoan_thanh`, `dong`, `da_gop`, `chuyen_co_quan`, `khong_xac_nhan` [GĐ]) và **không hiện cho người gửi** hồ sơ đó (SĐT đăng nhập = `reporterPhone`) hoặc chủ hồ sơ ẩn danh cũ.
  - Chưa đăng nhập bấm → chuyển `/ho-so?login=1&redirect=/phan-anh/:id`; đăng nhập xong quay lại C06, **chưa ghi nhận** cho tới khi bấm lại.
  - Đã đăng nhập, lần đầu → thêm SĐT vào `followers` (nguồn `also_me`), số "người cùng báo" +1, nút đổi thành "Đã ghi nhận bạn cũng gặp vấn đề này" (có chữ, không chỉ màu).
  - Bấm lần 2 với cùng SĐT → thông báo "Bạn đã báo vấn đề này", **số không tăng**.
  - Người này **không** thành chủ hồ sơ; chỉ nhận tin báo (3.4a). `anonymousFollows` không đổi.
- AC-C06-14: **Chưa đăng nhập ở khu vực đánh giá (D3).** Hồ sơ `hoan_thanh` mà người xem chưa đăng nhập: thay hai nút [Đã giải quyết] [Chưa giải quyết] bằng lời mời "Đăng nhập để đánh giá kết quả (chỉ người đã gửi phản ánh này đánh giá được)" + nút "Đăng nhập" → `/ho-so?login=1&redirect=/phan-anh/:id`. Đã đăng nhập nhưng không phải chủ hồ sơ: không hiện khu vực này (AC-C06-8).
- AC-C06-15: **Nhận tin báo ở trang hồ sơ (D5).** Khối "Tin báo của phản ánh này": đã đăng nhập và là người nhận (người gửi, người đã bấm "Tôi cũng gặp", người đăng ký nhận tin ở hồ sơ ẩn danh cũ) → hiện dòng "Bạn đang nhận tin báo cho phản ánh này" và danh sách thông báo thuộc hồ sơ này (mới nhất trước, mỗi mục có "Xem tin nhắn mẫu", nhãn "Mô phỏng"). Đã đăng nhập nhưng chưa là người nhận → gợi ý bấm "Tôi cũng gặp" (nếu được phép theo AC-C06-13). Chưa đăng nhập → chỉ hiện lời mời đăng nhập, không có danh sách.

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
- AC-C07-10: Xem bản đồ và danh sách **không cần đăng nhập** (D1).

### C08 – Kết quả của phường (bảng minh bạch)

- AC-C08-1: 4 thẻ KPI tính từ dữ liệu: Tổng phản ánh · Đã xử lý (kèm %) · Chưa hoàn tất · Thời gian xử lý TB (1 chữ số thập phân, dấu phẩy).
- AC-C08-2: Biểu đồ cột ngang 4 loại, mỗi cột tách Đã xử lý / Chưa hoàn tất, có nhãn số.
- AC-C08-3: Dòng "Vừa xử lý xong": 6 thẻ mới nhất, mỗi thẻ ảnh Trước → Sau (mũi tên giữa), icon + loại, StatusChip "Đã xử lý", ngày xong, tên bộ phận; chạm → C06.
- AC-C08-4: Chú thích nguồn: "Số liệu tháng 11/2026 · Dữ liệu mẫu cuộc thi". Điểm hài lòng (nếu hiển thị) gắn "Dữ liệu mô phỏng".
- AC-C08-5: Không cần đăng nhập; không có thông tin cá nhân.

### C09 – Thông báo (`/thong-bao`)

- AC-C09-1: **Đã đăng nhập:** header "Thông báo" + nút "Đánh dấu đã đọc"; tab Tất cả / Chưa đọc (kèm số); danh sách thông báo của SĐT đăng nhập, mới nhất trước, mỗi mục là một thẻ kiểu tin nhắn có mã hồ sơ, nội dung theo 3.4, thời điểm và dấu chưa đọc có chữ. Chạm → `/phan-anh/:id` của hồ sơ đó. Trống → "Bạn đã đọc hết thông báo" hoặc "Chưa có thông báo".
- AC-C09-2: **Chưa đăng nhập (D5):** không hiện danh sách; hiện "Đăng nhập để xem thông báo" + nút "Đăng nhập ngay" → `/ho-so?login=1&redirect=/thong-bao`.
- AC-C09-3: Mỗi thông báo có "Xem tin nhắn mẫu" mở khung SMS có nhãn "Mô phỏng" (kênh `sms_mo_phong`, 10.3). Không thông báo nào chứa SĐT đầy đủ của người khác.

### A01 – Hộp tiếp nhận cán bộ

- AC-A01-1: Header: tên cán bộ, ô tìm kiếm (mã/địa chỉ). *(Nút "Tạo phản ánh hộ": [BONUS – HOÃN – B5].)*
- AC-A01-2: 4 thẻ KPI giống C08 + thẻ "Quá hạn" và "Sắp đến hạn" (tính theo 3.6).
- AC-A01-3: Bảng cột: Mã · Ảnh · Loại · Địa chỉ · **SĐT** (AC-A01-10) · Trạng thái (nhãn CB) · Bộ phận · Hạn · Cờ (Ẩn danh). *(Cột "Người cùng báo", cờ Nghi trùng / Gửi hộ: bonus B2, B5.)*
- AC-A01-9: Bộ lọc thêm "Nguồn": Có SĐT / Ẩn danh (nhóm "Ẩn danh" chỉ gồm 6 hồ sơ cũ, 3.4b).
- AC-A01-10: **Cột "SĐT" (D7):** hiển thị SĐT **đầy đủ** của người gửi (ví dụ `0909000068`, định dạng nhóm `0909 000 068`). Hồ sơ ẩn danh cũ ghi "Ẩn danh" (không có số). Dùng để cán bộ liên hệ khi cần bổ sung; số này không xuất hiện ở bất kỳ màn công khai hay API công khai nào.
- AC-A01-4: Sắp xếp mặc định theo 3.6; hàng quá hạn có nhãn chữ "Quá hạn {n} ngày" + icon, không chỉ tô đỏ.
- AC-A01-5: **[BONUS – HOÃN – B2]** Cờ "Nghi trùng" khi hồ sơ có `suspectedDuplicateOf` hoặc có hồ sơ khác thỏa 3.5.
- AC-A01-6: Bộ lọc: loại, trạng thái, bộ phận, khoảng ngày; tab nhanh: Cần xử lý / Tất cả / Đã xử lý.
- AC-A01-7: Chọn hàng → mở panel A02 bên phải (≈ 480px), danh sách vẫn thấy.
- AC-A01-8: **[BONUS – HOÃN – B5]** "Tạo phản ánh hộ" → modal: SĐT người dân, loại, vị trí (bản đồ nhỏ hoặc chọn đường), mô tả, ảnh tùy chọn → hồ sơ `onBehalf: true`, trạng thái `da_tiep_nhan`; hiện tin nhắn mẫu gửi mã cho người dân.

### A02 – Panel chi tiết & giao xử lý

- AC-A02-1: Ảnh (chuyển ảnh), bản đồ nhỏ, địa chỉ, mô tả, **SĐT đầy đủ** (AC-A02-11) hoặc nhãn "Ẩn danh" / "Ẩn danh · đã đăng ký nhận tin", số người cùng báo.
- AC-A02-2: Trường Loại (sửa được), Ưu tiên, Bộ phận (điền sẵn theo 3.1), Hạn (điền sẵn = createdAt + hạn mặc định, chỉnh được bằng date picker).
- AC-A02-3: Nút theo trạng thái (chỉ hiện nút hợp lệ theo 3.3): Tiếp nhận · Giao TNV xác minh · Giao xử lý · Cập nhật kết quả (→ A03) · Yêu cầu bổ sung · Đóng. ~~Chuyển cơ quan khác~~ **Đã bỏ theo FR-08/D10** (A02 không còn nút này; không còn AC giao diện cho trạng thái `chuyen_co_quan`).
- AC-A02-4: "Giao TNV xác minh" → chọn TNV hoặc "Để TNV gần nhất nhận" → tạo VolunteerTask `xac_minh`.
- AC-A02-5: Khối "Kết quả xác minh" hiện khi task xong: ảnh TNV, 3 câu trả lời.
- AC-A02-6: **[BONUS – HOÃN – B2]** Khối "Phản ánh tương tự": các hồ sơ thỏa 3.5 + khoảng cách + ảnh; nút "Gộp vào hồ sơ này" → modal xác nhận nêu rõ hồ sơ chính và hồ sơ bị gộp.
- AC-A02-7: **[BONUS – HOÃN – B2]** Gộp: hồ sơ phụ `da_gop`, `mergedInto` = chính; followers hợp nhất; ảnh phụ thêm vào hồ sơ chính; hồ sơ chính có danh sách "Đã gộp" với nút "Tách".
- AC-A02-8: Nút ngoại lệ (Yêu cầu bổ sung, Đóng, Không xác nhận được) yêu cầu nhập lý do (≥ 10 ký tự) trước khi xác nhận.
- AC-A02-9: Tab "Lịch sử": timeline đầy đủ có tên người thao tác.
- AC-A02-10: Hồ sơ ẩn danh ở `moi` → gợi ý "Hồ sơ ẩn danh: nên giao TNV xác minh trước khi xử lý" ngay trên nhóm nút; CB vẫn được bỏ qua. Nút "Yêu cầu bổ sung" với hồ sơ ẩn danh cũ chưa đăng ký nhận tin có cảnh báo "Người gửi sẽ chỉ thấy yêu cầu khi tự mở hồ sơ". Hồ sơ có SĐT không cần cảnh báo này vì người gửi nhận tin và cán bộ có thể gọi.
- AC-A02-11: **SĐT đầy đủ và nút "Gọi" (D7):** hồ sơ có `reporterPhone` → hiện số đầy đủ cùng nút "Gọi" mở liên kết `tel:{số}` (hiện số bằng chữ, không chỉ biểu tượng). Hồ sơ ẩn danh cũ → hiện "Ẩn danh", không có nút "Gọi".
- AC-A02-12: **Gợi ý AI (B1):** hồ sơ có `aiSuggestion` → khối "Gợi ý của AI khi gửi": loại AI gợi ý (hoặc "Không nhận ra"), lý do, nhãn nguồn ("Gợi ý bởi AI" / "Gợi ý mô phỏng"). Chỉ để tham khảo; cán bộ vẫn tự xác nhận loại (AC-A02-2). Không có `aiSuggestion` → không hiện khối.

### A03 – Cập nhật kết quả

- AC-A03-1: Mở từ A02 khi trạng thái `da_giao` hoặc `mo_lai`.
- AC-A03-2: Trường: ảnh sau (1–3, bắt buộc), mô tả công việc (≥ 10 ký tự), ngày hoàn thành (mặc định demoNow).
- AC-A03-3: Khối "Người dân sẽ thấy": xem trước khối Trước/Sau của C06.
- AC-A03-4: Xác nhận → `hoan_thanh`, `completedAt` (chỉ set lần đầu), thông báo cho tất cả followers kể cả hồ sơ đã gộp.
- AC-A03-5: Thiếu ảnh hoặc mô tả → nút Xác nhận tắt + chú thích lý do.

### V01 – Nhiệm vụ TNV

- AC-V01-1: TNV đã đăng nhập (chế độ API) hoặc đã chọn TNV mẫu bằng nút chuyển cổng (chế độ local); danh sách gồm nhiệm vụ giao cho mình + nhiệm vụ mở, sắp theo khoảng cách. **Không có SĐT ở danh sách** (D7).
- AC-V01-2: Mỗi thẻ: nhãn loại nhiệm vụ "Xác minh ban đầu" / "Nghiệm thu sau xử lý", loại sự cố, địa chỉ, khoảng cách.
- AC-V01-3: Tab: Cần làm / Đã xong. Trống → "Hiện chưa có nhiệm vụ".

### V02 – Xác minh tại chỗ

- AC-V02-1: V02 gồm **3 bước**: ① Thực tế · ② Ảnh / Video · ③ Ghi chú và Gửi, có chỉ báo bước và nút quay lại. Phần đầu (mọi bước): ảnh gốc của người dân, mô tả, bản đồ có ghim; nút "Chỉ đường" mở `https://www.openstreetmap.org/directions?...` hoặc link geo: trên tab mới.
- AC-V02-2: Bước ① Thực tế, câu 1: Sự cố có tồn tại? (Có / Không / Không tìm thấy vị trí) – bắt buộc.
- AC-V02-3: Bước ① Thực tế, câu 2: Mức độ (Nhẹ / Trung bình / Nguy hiểm) – bắt buộc khi câu 1 = Có. Nút sang bước ② chỉ bật khi đủ điều kiện.
- AC-V02-4: Bước ② Ảnh / Video tại chỗ – bắt buộc có ít nhất một ảnh hoặc video chụp/quay tại chỗ. Bước ③ Ghi chú hiện trường – tùy chọn; nút "Gửi" ở bước ③. Lưu trữ và giới hạn video: câu hỏi mở 17.1 (câu 8).
- AC-V02-5: Gửi → task `xong`; áp dụng chuyển trạng thái 3.3; TNV không thấy nút đóng hồ sơ.
- AC-V02-6: **SĐT người gửi (D7).** Nhiệm vụ **đang giao cho chính TNV này** (đã được giao hoặc đã nhận) và `status ≠ xong` → hiện SĐT đầy đủ của người gửi + nút "Gọi" (`tel:`). **Không hiện SĐT** khi: nhiệm vụ mở chưa ai nhận (`assignee` rỗng), nhiệm vụ giao cho TNV khác, nhiệm vụ đã `xong`. Hồ sơ ẩn danh cũ → "Ẩn danh", không nút "Gọi".

### V03 – Bản đồ nhiệm vụ TNV (`/tnv/ban-do`)

- AC-V03-1: Bản đồ OpenStreetMap có ghim vị trí TNV (GPS nếu đã cấp và trong phường, không thì tâm phường) và marker của nhiệm vụ giao cho mình + nhiệm vụ mở; marker dùng icon loại sự cố trên nền màu theo loại nhiệm vụ; có chú giải bằng chữ (không chỉ màu).
- AC-V03-2: Chạm marker → thẻ: loại sự cố, nhãn "Xác minh ban đầu" / "Nghiệm thu sau xử lý", địa chỉ, khoảng cách, nút mở V02.
- AC-V03-3: **Không có SĐT hoặc tên người gửi** ở V03 (D7). Có nút quay lại V01.

### DEMO – Demo Hub

*(Chỉ chế độ `VITE_DATA_SOURCE=local`. Chế độ API không có Demo Hub, 16.1.)*

- AC-DEMO-1: Route `/demo`: khung điện thoại 390×844 bên trái (iframe), khung desktop bên phải (iframe, scale vừa màn hình).
- AC-DEMO-2: Bộ chọn vai trò cho khung trái: Người dân / TNV (chọn tên), có nhãn "Mô phỏng". Người dân mẫu cần đăng nhập OTP `123456` để gửi (D1), giống chế độ API.
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

### 7.7. Hiển thị số điện thoại (D7, FR-08)

Bất biến AGENTS.md: SĐT và `secretCode` **không bao giờ** hiện ở màn hình công khai hay API công khai. Bảng dưới là toàn bộ nơi được hiện SĐT của người gửi.

| Màn / API | Ai thấy | Điều kiện | Dạng hiển thị |
|---|---|---|---|
| C01, C06 (người ngoài), C07, C08 và `/public/*` | Không ai | – | Không có |
| C05, hồ sơ cá nhân | Chính người dân | Đã đăng nhập, SĐT của mình | Dạng che `0909 *** 068` hoặc đầy đủ của chính mình |
| A01 cột "SĐT" (AC-A01-10), A02 (AC-A02-11) | Cán bộ | Đã đăng nhập vai trò CB | **Đầy đủ**; A02 có nút "Gọi" (`tel:`) |
| V02 (AC-V02-6) | TNV | Nhiệm vụ đang giao cho chính TNV đó và `status ≠ xong` | **Đầy đủ** + nút "Gọi" |
| V01, V03, nhiệm vụ mở chưa ai nhận, nhiệm vụ đã xong | TNV | – | Không có |
| `/quan-tri/*` | Quản trị viên | – | Không có (mục 14.2) |
| Hồ sơ ẩn danh cũ ở mọi màn nhân viên | – | `reporterPhone` rỗng | Nhãn "Ẩn danh", không có nút "Gọi" |

---

## 8. Route

| Route | Màn |
|---|---|
| `/` và `/tim-kiem` | C01 (`/tim-kiem` hiển thị cùng C01) |
| `/bao-su-co/anh` | C02 |
| `/bao-su-co/vi-tri` | C03 |
| `/bao-su-co/xac-nhan` (tùy chọn `?step=1\|2\|3`) | C04 |
| `/cua-toi` và `/ho-so` (tùy chọn `?login=1&redirect=<đường dẫn nội bộ>`) | C05 + đăng nhập SĐT người dân |
| `/thong-bao` | C09 Thông báo |
| `/phan-anh/:id` (tùy chọn `?k=<mã bí mật>`, chỉ hồ sơ ẩn danh cũ) | C06 |
| `/quanh-day` | C07 |
| `/minh-bach` | C08 |
| `/can-bo` | A01 |
| `/can-bo/:id` | A01 + A02 |
| `/can-bo/:id/ket-qua` | A03 |
| `/can-bo/thong-ke`, `/can-bo/ho-so` | Thống kê và hồ sơ cá nhân của cán bộ (đã có trong UI, chưa có AC riêng; 17.1) |
| `/tnv` | V01 |
| `/tnv/ban-do` | V03 Bản đồ nhiệm vụ |
| `/tnv/:taskId` | V02 (3 bước) |
| `/tnv/thong-ke`, `/tnv/ho-so` | Thống kê và hồ sơ cá nhân của TNV (đã có trong UI, chưa có AC riêng; 17.1) |
| `/dang-nhap` (tùy chọn `?redirect=`) | Đăng nhập nhân viên (Cán bộ / TNV / Quản trị viên), chỉ chế độ API |
| `/khong-co-quyen` | Trang báo không có quyền truy cập |
| `/quan-tri`, `/quan-tri/tai-khoan`, `/quan-tri/bo-phan`, `/quan-tri/cau-hinh`, `/quan-tri/nhat-ky` | Trang quản trị (mục 14) |
| `/demo` | Demo Hub (chỉ chế độ local) |
| `/dev/ui` | Thư viện component, **chỉ môi trường phát triển**, không có trên bản deploy |

Chưa đăng nhập vào C05 (`/cua-toi`, `/ho-so`) và C09 không bị chặn: màn hiện lời mời đăng nhập (AC-C05-1, AC-C09-2). Không route công khai nào đòi đăng nhập trước khi xem.

---

## 9. Câu hỏi mở

1. Ngưỡng trùng 50 m / 14 ngày – chờ chủ dự án duyệt.
2. Hạn mặc định theo loại – chờ duyệt.
3. Có cần xuất Figma không – chờ thể lệ.
4. Số tổng đài phường hiển thị trong demo – dùng số giả định có nhãn "Mô phỏng" cho tới khi có số chính thức.
5. Các câu hỏi phát sinh từ FR-08 (ví dụ nhật ký truy cập SĐT, giới hạn gửi theo SĐT): xem **17.1**.

---

# GIAI ĐOẠN 2 – Backend và database (mở 25/11/2026)

Nhãn bổ sung: **[ĐĐ]** đề xuất thiết kế chờ chủ dự án duyệt (liệt kê ở 17). Mọi AC của mục 6 (đã sửa theo FR-08 ở bản v3.0 này) vẫn đúng; giai đoạn 2 chỉ đổi **nơi lưu và nơi kiểm tra** (từ localStorage trong trình duyệt sang server), không đổi hành vi nhìn thấy được, trừ những chỗ mục 10–17 nêu rõ.

## 10. Phạm vi giai đoạn 2

### 10.1. Quyết định đã chốt (chủ dự án, 25/11/2026)

| Hạng mục | Quyết định |
|---|---|
| Stack | Supabase (PostgreSQL + PostGIS + Auth + Storage) · Vercel Functions (TypeScript) · Drizzle ORM |
| OTP/SMS/Zalo | **Vẫn mô phỏng** (mã `123456`, nhãn "Mô phỏng"); thiết kế sẵn điểm cắm để thay bằng nhà cung cấp thật sau (10.3) |
| AI nhận diện ảnh (B1) | **AI thật dùng DeepSeek Vision API** (model `deepseek-flash`, OpenAI-compatible) khi `AI_PROVIDER=deepseek`; fallback mô phỏng (`AI_PROVIDER=mock`) khi chưa có key hoặc ngoại tuyến. Chi tiết 10.6 |
| Trang quản trị | **Có** (chủ dự án đổi lại quyết định ngày 25/11): vai trò Quản trị viên phường, trang `/quan-tri/*` và API `/admin/*` (mục 13, 14). Script CLI vẫn dùng chung service |
| Luồng người dân (FR-08) | Xem không cần đăng nhập; gửi, "Tôi cũng gặp", thông báo, đánh giá bắt buộc đăng nhập SĐT; bỏ gửi ẩn danh; SĐT hiện đầy đủ cho cán bộ và TNV có điều kiện (7.7) |

### 10.2. Trong phạm vi

API REST có kiểm tra nghiệp vụ phía server (mục 12) · schema PostgreSQL/PostGIS + migration + seed từ `mock.json` (mục 11) · xác thực và phân quyền (mục 13) · lưu ảnh ở Storage (mục 15) · trang quản trị và script quản lý tài khoản/cấu hình dùng chung service (mục 14) · frontend gọi API, giữ **chế độ demo offline** (mục 16) · các bất biến mục 5.1 giữ nguyên, kiểm tra được trên DB.

### 10.3. Điểm cắm dịch vụ mô phỏng

Hai interface phía server, mỗi interface có bản `mock` (mặc định) và chỗ thay bản thật sau, chọn bằng biến môi trường:

| Interface | Biến | Bản mock | Bản thật (chưa làm) |
|---|---|---|---|
| `OtpProvider.send(phone)` / `verify(phone, code)` | `OTP_PROVIDER=mock` | Chấp nhận đúng `123456`, hết hạn 5 phút, tối đa 5 lần sai | Nhà cung cấp SMS/Zalo ZNS – chờ chủ dự án chọn |
| `NotificationChannel.send(phone, message)` | `SMS_PROVIDER=mock` | Ghi vào `notifications` với `channel='sms_mo_phong'`, không gửi đi đâu | Cùng nhà cung cấp trên |

Khi `OTP_PROVIDER=mock`, API trả kèm cờ `mock: true` để UI hiện nhãn "Mô phỏng". **Không được chạy production với `mock` mà không có nhãn trên UI.**

### 10.4. Ngoài phạm vi giai đoạn 2

SMS/Zalo thật (AI gợi ý ảnh bằng DeepSeek **đã nằm trong phạm vi**, 10.6), web push, đa ngôn ngữ, ứng dụng native, đăng nhập SSO/VNeID, xác thực hai lớp (MFA) cho cán bộ, tích hợp hệ thống một cửa của tỉnh.

### 10.5. Thật và Mô phỏng (D11)

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Cơ sở dữ liệu PostgreSQL + PostGIS (Supabase) | **Thật** | Chế độ API. Chế độ local dùng localStorage nên **không** phải DB thật |
| Đăng nhập nhân viên (Supabase Auth), phân quyền, trang quản trị | **Thật** | Chế độ API |
| Gợi ý loại sự cố từ ảnh | **Thật** khi `AI_PROVIDER=deepseek`; **Mô phỏng** khi `AI_PROVIDER=mock` | UI luôn có nhãn nguồn: "Gợi ý bởi AI – vui lòng kiểm tra lại" hoặc "Gợi ý mô phỏng" |
| OTP đăng nhập người dân (mã `123456`) | **Mô phỏng** | Nhãn "Mô phỏng" trên mọi màn nhập OTP |
| SMS/Zalo | **Mô phỏng** | Ghi `notifications` kênh `sms_mo_phong`; khung xem trước có nhãn "Mô phỏng" |
| Tổng đài, số điện thoại phường | **Mô phỏng** | Nhãn "Mô phỏng" |
| Điểm hài lòng của 40 hồ sơ `dong` trong dữ liệu mẫu | **Mô phỏng** | Nhãn "Dữ liệu mô phỏng" (AC-C08-4) |
| Lưu ảnh | **Chưa thật hoàn toàn** | Ảnh hiện lưu dạng data URL trong DB. Upload lên Supabase Storage (mục 15) **chưa làm**, ghi ở 17.1 và bảng rủi ro |

### 10.6. AI gợi ý loại sự cố (B1)

Giữ nguyên hành vi giao diện ở AC-C02-5 và AC-C04-1. Phần kỹ thuật:

- AC-AI-1: Server gọi DeepSeek (model `deepseek-flash`, mặc định theo `DEEPSEEK_MODEL`) với `thinking: { type: 'disabled' }` (tắt chế độ suy nghĩ để câu trả lời nằm trong `content`). Timeout theo `AI_TIMEOUT_MS` (mặc định 8000 ms); hết giờ hoặc lỗi HTTP → trả `category: null` kèm lý do bằng lời, không trả 5xx.
- AC-AI-2: Giới hạn: tối đa `AI_DAILY_LIMIT` lượt/ngày toàn hệ thống (mặc định 500); hết lượt → `category: null`, lý do "Tạm hết lượt gợi ý hôm nay", không gọi DeepSeek. Giới hạn theo IP/thiết bị: 10 lượt/10 phút (429 `TOO_MANY_ATTEMPTS`).
- AC-AI-3: Khoá `DEEPSEEK_API_KEY` chỉ ở server (không có tiền tố `VITE_`, không vào bundle client, không vào log, không vào phản hồi). Ảnh gửi lên tối đa 1,5 MB, đúng định dạng JPEG/PNG/WebP (magic bytes), sai → 422 `INVALID_IMAGE`. Endpoint `POST /api/v1/ai/suggest-category` không yêu cầu đăng nhập.
- AC-AI-4: Kết quả AI **chỉ là gợi ý**: không bao giờ tự chọn loại, không chặn gửi. Gợi ý được lưu vào bản nháp và gửi kèm hồ sơ (cột `reports.ai_suggestion`, kiểu JSON nullable, nhãn `provider`), cán bộ xem ở A02 (AC-A02-12). Không công khai.

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
| `reports` | `id` uuid pk, `code` text unique (`TB-0001`…), `category`, `status`, `status_before_merge`?, `priority`, `location` `geography(Point,4326)`, `address`, `location_note`?, `description`?, `department_id`?, `due_at`?, `created_at`, `completed_at`?, `reporter_phone`?, `anonymous` bool, `subscribed_later` bool, `on_behalf` bool, `secret_code_hash`, `owner_token_hash`, `anonymous_follows` int ≥ 0, `merged_into` → reports?, `photos_approved` bool, `result_note`?, `ai_suggestion` jsonb? (AC-A02-12), `version` int, `is_seed` bool default false | Chỉ mục: GiST(`location`), (`status`,`due_at`), (`category`,`created_at`), (`reporter_phone`). `lat`/`lng` lấy bằng `ST_Y/ST_X`, không lưu trùng |
| `report_photos` | `id`, `report_id`, `kind` photo_kind, `storage_path`, `sort`, `source` (`storage` \| `static`), `created_at` | `source='static'` cho ảnh demo `/demo-photos/...` từ seed; còn lại là đường dẫn trong bucket |
| `report_followers` | (`report_id`, `phone`) pk, `source` follower_source, `created_at` | Thay mảng `followers`. `followerCount` = số dòng + `anonymous_follows` (3.6) |
| `report_timeline` | `id`, `report_id`, `at`, `status`, `actor_type`, `actor_staff_id`?, `actor_label`, `note`? | Chỉ thêm, không sửa/xoá (trigger chặn UPDATE/DELETE). `actor_label` là nhãn công khai ("Phường Trấn Biên", tên bộ phận, "Tình nguyện viên"); tên cá nhân chỉ lấy từ `actor_staff_id` cho A02 |
| `report_duplicate_flags` | (`report_id`, `other_report_id`) pk | Thay `suspectedDuplicateOf` (B2) |
| `feedback` | `report_id` pk, `resolved`, `rating`? 1–5, `tags` text[], `comment`?, `at` | CHECK: `resolved=true` ⇒ `rating` not null |
| `volunteer_tasks` | `id`, `code` (`NV-001`…), `report_id`, `type`, `status`, `assignee_id`? → staff_profiles, `result_exists`?, `result_severity`?, `result_note`?, `result_at`? | Ảnh kết quả nằm ở `report_photos` (`kind='verify'`). `assignee_id` null = mở cho TNV gần nhất (AC-A02-4) |
| `notifications` | `id`, `phone`, `report_id`, `message`, `channel` (`app` \| `sms_mo_phong`), `read`, `created_at` | Index (`phone`,`created_at` desc) |
| `phone_otps` | `phone`, `code_hash`, `expires_at`, `attempts` | Dùng cả khi mock (để giữ đúng luồng hết hạn/giới hạn lần sai) |
| `anonymous_submissions` | `id`, `device_id`, `ip_hash`, `created_at` | **Không còn dùng từ v3.0** (gửi ẩn danh đã bỏ theo FR-08). Giữ bảng để không sửa migration cũ (AGENTS.md); không ghi thêm |
| `access_attempts` | `report_id`, `ip_hash`, `at` | Khoá tạm khi dò mã bí mật (13.4) |
| `pending_uploads` | `path` pk, `device_id`?, `staff_id`?, `created_at`, `attached` bool | Ảnh đã xin ký nhưng chưa gắn hồ sơ; cron xoá sau 24 giờ (15) |
| `app_settings` | `key` pk, `value` jsonb | `clock` (`{mode:'real'\|'fixed', fixedAt}`), `ward` (tâm, ranh giới), `otp_mock_notice` |

### 11.3. Ràng buộc ở mức DB (không chỉ ở code)

1. `reports.anonymous = true` ⇒ `reporter_phone IS NULL` (CHECK). `subscribed_later` không làm `anonymous` đổi. (Việc hồ sơ **mới** phải có `reporter_phone` do API bảo đảm, AC-API-10, không phải CHECK, vì 6 hồ sơ ẩn danh cũ vẫn tồn tại.)
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
- Xác thực: `Authorization: Bearer <JWT>` (nhân viên: JWT Supabase; người dân: JWT do API ký, 13.3). Khoá chủ hồ sơ **ẩn danh cũ**: header `X-Report-Key` (13.4). `X-Device-Id` không còn thay được token người dân.
- Kiểm tra đầu vào bằng schema (zod) ở mọi endpoint; trường lạ bị từ chối.
- Lỗi: `{ "error": { "code": "TRANSITION_NOT_ALLOWED", "message": "<tiếng Việt, nói được cách khắc phục>", "details": {…} } }`. Mã HTTP: 400 đầu vào sai · 401 chưa đăng nhập · 403 sai quyền · 404 không có (hồ sơ không có quyền xem cũng trả 404 để không lộ sự tồn tại khi cần) · 409 chuyển trạng thái sai hoặc xung đột `version` · 422 vi phạm điều kiện nghiệp vụ (vd. thiếu ảnh sau) · 429 quá giới hạn.
- Tạo mới (`POST /citizen/reports`) nhận `Idempotency-Key`; gửi lại cùng khoá trả về kết quả cũ, không tạo bản sao (phục vụ AC-C04-9 "thử lại khi có mạng").
- Phân trang theo con trỏ: `?limit=50&cursor=…`.
- **SĐT đầy đủ (`reporter_phone`) chỉ xuất hiện ở các phản hồi sau (7.7), mọi nơi khác không có:** (a) `GET /citizen/me/*` trả SĐT của chính người đang đăng nhập; (b) `/officer/reports` và `/officer/reports/:code` (token `can_bo`); (c) `GET /volunteer/tasks/:code` chỉ khi `assignee` là TNV đang gọi và `status ≠ xong`. **Không endpoint nào trả** `secret_code`, hash hoặc `followers` (danh sách SĐT), ngoại trừ `GET /citizen/reports/:code/owner` trả `secretCode` cho chủ hồ sơ ẩn danh cũ (AC-C06-11). `/public/*`, `/volunteer/tasks` (danh sách) và `/admin/*` không bao giờ có SĐT.
- Đường dẫn ở 12.3 nằm dưới tiền tố `/citizen` (ví dụ `POST /citizen/reports`), trừ `/uploads/sign`. Mã lỗi `CITIZEN_LOGIN_REQUIRED` (401): "Vui lòng đăng nhập số điện thoại để gửi phản ánh" khi thiếu token người dân ở thao tác bắt buộc đăng nhập (gửi, "Tôi cũng gặp", đánh giá, bổ sung, thông báo).
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
| `POST /uploads/sign` `{kind:'before', contentType, size}` | token người dân | Trả URL ký sẵn để tải ảnh lên Storage (15). *(Ảnh hiện lưu data URL, 10.5)* |
| `POST /citizen/reports` | **token người dân bắt buộc (D1)** | Gửi phản ánh: `category`, ảnh (1–3), `lat`, `lng`, `address`, `locationNote?`, `description?`, `aiSuggestion?`. Server lấy SĐT từ token: `reporter_phone` = SĐT token, `anonymous=false`. **Không token → 401 `CITIZEN_LOGIN_REQUIRED`**, không tạo hồ sơ. Trường `anonymous` không còn được chấp nhận. Trả `{code}`; không trả `secretCode`/`ownerToken` cho hồ sơ mới. Giới hạn chống spam theo SĐT: 13.4 mục 5 |
| `GET /citizen/me/reports` | token người dân | Hồ sơ có `reporter_phone` = SĐT token và hồ sơ đã bấm "Tôi cũng gặp" (`report_followers`) |
| `POST /citizen/reports/lookup` `{code, proof}` | công khai, giới hạn thử | **Chỉ hồ sơ ẩn danh cũ.** `proof` = 4 số cuối SĐT đã đăng ký nhận tin hoặc mã bí mật (AC-C05-7) → `{ownerToken}`. Hồ sơ có SĐT: không cấp `ownerToken` (quyền chủ chỉ qua đăng nhập) |
| `POST /citizen/reports/:code/claim` `{secretCode}` | công khai, giới hạn thử | **Chỉ hồ sơ ẩn danh cũ.** Mở link `?k=` (3.4a.c) → `{ownerToken}` |
| `GET /citizen/reports/:code/owner` | chủ hồ sơ (3.4a) | Bản C06 đầy đủ cho chủ: cờ quyền; với hồ sơ ẩn danh cũ có thêm `secretCode`, SĐT đã che đang nhận tin. Không phải chủ → 404 |
| `POST /citizen/reports/:code/follow` | **token người dân bắt buộc (D4)** | "Tôi cũng gặp". Không token → 401 `CITIZEN_LOGIN_REQUIRED`. Lần đầu của SĐT này với hồ sơ này → 200, thêm vào `report_followers` (`also_me`), số cùng báo +1, `alreadyFollowed: false`. SĐT đã theo dõi → 200 với `alreadyFollowed: true`, **số không tăng**. SĐT là người gửi hồ sơ → 403 `FORBIDDEN` |
| `POST /citizen/reports/:code/subscribe` `{phone, otpToken}` / `DELETE …/subscribe` | token người dân + chủ hồ sơ ẩn danh cũ | AC-C06-9 |
| `POST /citizen/reports/:code/feedback` | **token người dân là chủ hồ sơ (D3)** | AC-C06-5: `{resolved, rating?, tags?, comment?, photoPaths?}` → `dong` hoặc `mo_lai` + task `nghiem_thu`. Không token → 401 `CITIZEN_LOGIN_REQUIRED`; token không phải chủ (kể cả người "Tôi cũng gặp") → 403 `FORBIDDEN` |
| `POST /citizen/reports/:code/supplement` | token người dân là chủ hồ sơ | AC-C06-7 (`can_bo_sung` → `moi`). Không token → 401; không phải chủ → 403 |
| `GET /citizen/me/notifications`, `POST /citizen/me/notifications/read` | token người dân | AC-C09-1. Không token → 401 `CITIZEN_LOGIN_REQUIRED` (UI hiện lời mời đăng nhập, AC-C09-2) |

### 12.4. Cán bộ (`can_bo`)

| Method + đường dẫn | Việc | Chuyển trạng thái (3.3) |
|---|---|---|
| `GET /officer/reports` | A01: lọc loại/trạng thái/bộ phận/khoảng ngày/nguồn, tab, tìm mã/địa chỉ, sắp theo 3.6; mỗi dòng có `reporterPhone` đầy đủ (cột "SĐT") hoặc `null` | – |
| `GET /officer/reports/:code` | A02: SĐT **đầy đủ** (`reporterPhone`) hoặc `null` + nhãn Ẩn danh, `aiSuggestion`, timeline có tên người thao tác, kết quả xác minh, phản ánh tương tự | – |
| `GET /officer/kpi` | KPI + quá hạn + sắp đến hạn (3.6) | – |
| `PATCH /officer/reports/:code` `{category?, priority?, departmentId?, dueAt?}` | Sửa trường phân loại (AC-A02-2); gửi kèm `version` | – |
| `POST …/accept` | Tiếp nhận (loại + bộ phận + hạn) | `moi` → `da_tiep_nhan` |
| `POST …/assign-volunteer` `{volunteerId?}` | Tạo task `xac_minh` | → `cho_xac_minh` |
| `POST …/assign-department` | Giao xử lý | `da_tiep_nhan`/`mo_lai` → `da_giao` |
| `POST …/complete` `{photoPaths[1..3], note≥10, completedAt?}` | A03 | `da_giao`/`mo_lai` → `hoan_thanh` |
| `POST …/request-supplement`, `…/close`, `…/mark-unverified` `{reason≥10}` | Nút ngoại lệ trên A02 | theo 3.3 |
| `POST …/transfer` `{reason≥10, agency}` | **Không có nút trên A02 từ v3.0 (D10).** Endpoint hiện còn trong code; giữ hay xoá: 17.1 | `moi`/`da_tiep_nhan` → `chuyen_co_quan` |
| `POST …/merge` `{intoCode}` · `POST …/split` | B2 | → `da_gop` / khôi phục `status_before_merge` |
| `POST /officer/reports` | Tạo phản ánh hộ (B5) | → `da_tiep_nhan`, `on_behalf=true` |
| `GET /officer/volunteers` | Danh sách TNV đang hoạt động để giao | – |

### 12.5. Tình nguyện viên (`tnv`)

| Method + đường dẫn | Việc |
|---|---|
| `GET /volunteer/tasks?lat&lng` | AC-V01, AC-V03: nhiệm vụ giao cho mình + nhiệm vụ mở (`assignee_id IS NULL`), sắp theo khoảng cách, tab Cần làm/Đã xong. **Không có SĐT**, mã bí mật, followers |
| `GET /volunteer/tasks/:code` | AC-V02-1. Có trường `reporterPhone` (đầy đủ) **chỉ khi** `assignee` là TNV đang gọi **và** `status ≠ xong` (AC-V02-6); mọi trường hợp khác không có trường này. Không bao giờ có mã bí mật, followers |
| `POST /volunteer/tasks/:code/claim` | Nhận nhiệm vụ mở; chỉ một người nhận được (khoá dòng) |
| `POST /volunteer/tasks/:code/result` `{exists, severity?, photoPath, note?}` | AC-V02-2 → 5; kích hoạt chuyển trạng thái 3.3 do hệ thống. TNV **không** có endpoint đóng hồ sơ |

### 12.6. API quản trị

Có nhóm `/api/v1/admin/*` cho vai trò Quản trị viên (mục 14.3). Script CLI dùng chung service với API.

### 12.7. Việc nền (Vercel Cron, 1 lần/ngày)

| Việc | Quy tắc |
|---|---|
| Tự đóng hồ sơ | `hoan_thanh` quá 7 ngày chưa phản hồi → `dong` (3.3), timeline "Tự đóng sau 7 ngày không phản hồi" |
| Dọn ảnh mồ côi | Xoá file trong `pending_uploads` chưa gắn quá 24 giờ |
| Dọn dữ liệu hạn chế | Xoá `phone_otps` hết hạn, `access_attempts` > 24 giờ |

### 12.8. Đồng hồ

Mọi hàm nhận `now` như giai đoạn 1. Server lấy `now` từ `Clock`: `real` (mặc định production) hoặc `fixed` (demo/test, đọc `app_settings.clock`). Seed mock có dữ liệu tới `2026-11-24T09:00+07:00`; ở chế độ `real` các hồ sơ quá hạn của seed sẽ lệch con số "2 quá hạn" – chỉ chế độ `fixed` giữ đúng DV-016.

### 12.9. Tiêu chí chấp nhận API

- AC-API-1: Endpoint công khai (`/public/*`) trả đúng dữ liệu, không đòi hỏi xác thực; serializer công khai duy nhất `toPublicReport` loại bỏ hoàn toàn các trường bí mật (`reporter_phone`, `secret_code_hash`, `owner_token_hash`).
- AC-API-2: Phản hồi lỗi chuẩn hoá: mọi mã lỗi (400, 401, 403, 404, 409, 422, 429) trả JSON cấu trúc `{ error: { code: string, message: string, details?: unknown } }`.
- AC-API-3: Request-ID: Mọi phản hồi API đều mang header `X-Request-Id` (giữ nguyên từ client gửi lên hoặc server tự sinh) phục vụ đối soát log.
- AC-API-4: Kiểm tra schema request bằng Zod; dữ liệu sai định dạng hoặc thiếu trường bắt buộc trả HTTP 422 `UNPROCESSABLE_ENTITY` với mảng `details` chi tiết.
- AC-API-5: Chuyển trạng thái bất hợp pháp (sai bảng chuyển trạng thái 3.3) trả về HTTP 409 `INVALID_TRANSITION` và trạng thái trong DB không đổi.
- AC-API-6: Idempotency: `POST /citizen/reports` kèm `Idempotency-Key` lặp lại trong 24 giờ trả về đúng kết quả hồ sơ đã tạo ban đầu (HTTP 200/201), không tạo thêm bản ghi DB.
- AC-API-7: Rate limit: Tần suất request vượt ngưỡng quy định trả về HTTP 429 `TOO_MANY_REQUESTS` kèm header `Retry-After`.
- AC-API-8: Endpoint `/cron/*` bảo vệ bằng secret: gọi thiếu hoặc sai header `Authorization: Bearer <CRON_SECRET>` trả về HTTP 401 `UNAUTHORIZED`.
- AC-API-10: **Gửi phản ánh bắt buộc đăng nhập.** `POST /citizen/reports` không có token người dân (hoặc chỉ có `X-Device-Id`) → HTTP 401 `CITIZEN_LOGIN_REQUIRED`, thông điệp "Vui lòng đăng nhập số điện thoại để gửi phản ánh", không tạo bản ghi. Có token → HTTP 201, hồ sơ `anonymous=false`, `reporter_phone` = SĐT trong token.
- AC-API-11: **"Tôi cũng gặp" một lần cho mỗi SĐT.** `POST /citizen/reports/:code/follow` theo 12.3: không token → 401 `CITIZEN_LOGIN_REQUIRED`; lần đầu → 200 `alreadyFollowed:false`; lần sau cùng SĐT → 200 `alreadyFollowed:true` và `followerCount` không đổi (chặn cả khi hai request đến đồng thời, nhờ khoá `(report_id, phone)`).
- AC-API-13: **Kết nối DB trên serverless (v3.1).** Function Vercel có thể bị đóng băng giữa hai lần gọi. Pool kết nối nhỏ (1 kết nối mỗi instance trên Vercel), đóng kết nối nhàn rỗi sau 20 giây và tối đa 5 phút mỗi kết nối, để lần gọi sau không dùng lại kết nối đã bị pooler cắt. Thư viện postgres.js tự mở kết nối mới cho truy vấn kế tiếp.
- AC-API-12: **Phạm vi trả SĐT.** Chỉ các phản hồi liệt kê ở 12.1 mới có SĐT đầy đủ; test quét (AC-AUTH-6) và test quyền (AC-AUTH-9, 10) kiểm từng loại.
- AC-API-9: Toàn vẹn giao dịch: Mọi thao tác đổi trạng thái thực thi trong Transaction với khóa bi quan `FOR UPDATE`, đảm bảo tính toàn vẹn và timeline không bị phân nhánh sai.

---

## 13. Xác thực và phân quyền

### 13.1. Vai trò

Hệ thống có **4 vai trò**: ba nhóm người dùng nghiệp vụ (người dân, cán bộ, TNV) và Quản trị viên phường. Người dân không có tài khoản nhân viên; người dân **xem** không cần đăng nhập nhưng **gửi và tương tác** phải đăng nhập SĐT (D1).

| Vai trò | Xác định bằng | Thiết bị | Cấp bởi |
|---|---|---|---|
| ND | SĐT đã xác thực OTP (token người dân) để gửi và tương tác; **không đăng nhập** = chỉ xem công khai. Khoá chủ hồ sơ (13.4) chỉ còn cho hồ sơ ẩn danh cũ | Mobile | Tự do |
| CB | Tài khoản Supabase Auth + `staff_profiles.role='can_bo'` | Desktop | Quản trị viên hoặc script |
| TNV | Tài khoản Supabase Auth + `staff_profiles.role='tnv'` | Mobile | Quản trị viên hoặc script |
| Admin | Tài khoản Supabase Auth + `staff_profiles.role='admin'` | Desktop | Seed / quản trị viên hiện hữu |

### 13.2. Đăng nhập nhân viên

1. Route `/dang-nhap`: email + mật khẩu → Supabase Auth (`signInWithPassword`). Không có đăng ký tự do; không có "Quên mật khẩu" tự phục vụ ở giai đoạn 2 – nhà phát triển đặt lại bằng `staff:reset-password`.
2. SPA giữ phiên của Supabase (tự làm mới token). Mọi gọi API kèm `Bearer`.
3. API **xác minh JWT** (chữ ký, hạn, `aud`), rồi tra `staff_profiles` mỗi request: không có dòng hoặc `is_active=false` → 403 `ACCOUNT_DISABLED`. Vai trò lấy từ DB, **không** tin claim trong token.
4. Sau đăng nhập chuyển theo vai trò: CB → `/can-bo`, TNV → `/tnv`. Vào route không đúng vai trò → trang "Bạn không có quyền vào trang này" + nút về đúng trang.
5. Đăng xuất xoá phiên; hết phiên giữa chừng → quay về `/dang-nhap` kèm đường dẫn cũ.
6. Mật khẩu tối thiểu 10 ký tự (cấu hình Supabase). Giới hạn đăng nhập sai do Supabase Auth đảm nhiệm.

### 13.3. Phiên người dân

- Xác thực SĐT: `otp/request` → `otp/verify`. Đúng → API ký JWT riêng (`HS256`, khoá `CITIZEN_JWT_SECRET`) với `sub = HMAC(phone)`, claim `phone`, hạn 30 ngày; lưu ở localStorage (thay `settings.phone`).
- Token chỉ chứng minh "tôi sở hữu SĐT này". **Quyền chủ hồ sơ = SĐT trong token trùng `reports.reporter_phone`** (3.4a). Người đã bấm "Tôi cũng gặp" nằm trong `report_followers` nhưng **không** là chủ hồ sơ. Với hồ sơ ẩn danh cũ: SĐT có nguồn `subscribe_later` hoặc `ownerToken` (13.4).
- Token hết hạn hoặc thiếu ở thao tác bắt buộc đăng nhập → 401; UI chuyển tới `/ho-so?login=1&redirect=<trang hiện tại>` (AC-C04-14).
- Đăng xuất = xoá token ở máy; đổi máy = xác thực OTP lại (AC-C05-7).

### 13.3a. Phiên theo cổng trên cùng một thiết bị (v3.1)
Lúc demo, một trình duyệt lần lượt đóng vai người dân, cán bộ, TNV, quản trị. Hai loại phiên phải **độc lập**:
- **Phiên người dân**: token người dân (`tb_citizen_token`) + SĐT hiển thị. Ở chế độ API, "đã đăng nhập SĐT" **chỉ đúng khi còn token người dân hợp lệ**; `settings.phone` chỉ là bản sao để hiển thị, không bao giờ đứng một mình.
- **Phiên nhân viên**: token nhân viên (`tb_staff_token`), vai trò, tên hiển thị, phiên cổng cán bộ/TNV.
- AC-SESSION-1: Đăng nhập hoặc đăng xuất nhân viên **không** xoá phiên người dân; đăng xuất người dân **không** xoá phiên nhân viên.
- AC-SESSION-2: Ở chế độ API, khi tải trang hoặc khi phiên thay đổi mà không còn token người dân thì xoá `settings.phone`: giao diện hiện trạng thái chưa đăng nhập (lời mời đăng nhập), không bao giờ hiện "đã đăng nhập" trong khi server sẽ trả 401.
- AC-SESSION-3: API trả 401 ở thao tác người dân (gửi, "Tôi cũng gặp", đánh giá, bổ sung, thông báo) → chỉ xoá phiên **người dân**, giữ bản nháp, chuyển `/ho-so?login=1&redirect=<trang hiện tại>`. 401 ở thao tác nhân viên → chỉ xoá phiên **nhân viên**, chuyển `/dang-nhap?redirect=` (giữ hành vi cũ).
- AC-SESSION-4: Gọi API người dân luôn gửi token người dân, gọi API nhân viên luôn gửi token nhân viên, kể cả khi thiết bị đang giữ cả hai.

### 13.4. Quyền chủ hồ sơ cho hồ sơ ẩn danh cũ [ĐĐ] (chỉ 6 hồ sơ lịch sử)

Từ v3.0 không còn gửi ẩn danh, nên mục này **chỉ áp dụng cho hồ sơ `anonymous=true` có sẵn** (3.4b). Giữ cơ chế mã 4 số, link `?k=`, chống dò mã:

1. *(Lịch sử)* Hồ sơ ẩn danh có `secretCode` 4 số và `ownerToken` 256 bit; DB chỉ lưu **hash**. Hồ sơ mới không trả hai giá trị này (12.3), nhưng server vẫn sinh `secret_code_hash` để giữ bất biến DV-014.
2. Thiết bị lưu `{code, ownerToken}` trong `deviceReports` (thay cặp `{id, secretCode}`). Gọi API chủ hồ sơ bằng `X-Report-Key: <ownerToken>`.
3. Mở link `?k=` hoặc tra cứu bằng mã bí mật/4 số cuối SĐT → `claim`/`lookup` kiểm tra rồi trả `ownerToken` mới cho thiết bị đó. Có thể có nhiều `ownerToken` cho một hồ sơ (mỗi thiết bị một cái).
4. **Chống dò**: tối đa **5 lần sai / hồ sơ / IP / 15 phút**, quá thì 429 `TOO_MANY_ATTEMPTS`; tối đa **30 lần sai / hồ sơ / 24 giờ** từ mọi IP thì khoá `claim`/`lookup` hồ sơ đó 24 giờ (chủ thật dùng `ownerToken` đã có nên không bị ảnh hưởng). Mọi lần sai ghi `access_attempts`.
5. ~~Quota ẩn danh theo thiết bị 5/ngày và IP 20/ngày~~ **Đã bỏ theo FR-08.** Chống spam khi gửi nay theo SĐT: (a) OTP: 5 lần xin/giờ/SĐT và 20/giờ/IP (12.3); (b) hạn mức số hồ sơ/SĐT/ngày: server hiện cài **10 hồ sơ/SĐT/24 giờ** (429 `RATE_LIMIT_EXCEEDED`), con số này chưa có trong spec cũ nên ghi là **[ĐĐ] chờ chủ dự án duyệt** (17.1, câu 4). Spec không đặt hạn mức mới.

### 13.5. Ma trận quyền

Ký hiệu: ✓ được · ✗ không · own = chỉ hồ sơ của mình (13.4) · assigned = chỉ nhiệm vụ giao cho mình hoặc mở.

| Hành động | Công khai | ND (SĐT/ẩn danh) | TNV | CB | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Xem hồ sơ công khai, bản đồ, KPI | ✓ | ✓ | ✓ | ✓ | ✓ |
| Gửi phản ánh (**bắt buộc đã đăng nhập SĐT**) | ✗ (401) | ✓ | ✗ | ✗ | ✗ |
| Xem chi tiết đầy đủ của hồ sơ mình gửi (và mã bí mật nếu ẩn danh cũ) | ✗ | own | ✗ | ✗ | ✗ |
| Đánh giá / báo chưa giải quyết / bổ sung / đăng ký nhận tin (hồ sơ ẩn danh cũ) | ✗ | own (chủ hồ sơ) | ✗ | ✗ | ✗ |
| "Tôi cũng gặp" (1 lần/SĐT, không phải người gửi) | ✗ (401) | ✓ | ✗ | ✗ | ✗ |
| Nhận thông báo, xem C09 | ✗ (lời mời đăng nhập) | ✓ | ✗ | ✗ | ✗ |
| Xem hộp tiếp nhận + panel (SĐT **đầy đủ**) | ✗ | ✗ | ✗ | ✓ | ✗ |
| Tiếp nhận, giao, hoàn thành, ngoại lệ, gộp/tách, gửi hộ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Xem SĐT **đầy đủ** của người gửi | ✗ | chính mình | **assigned và chưa xong** (V02) | ✓ (A01, A02) | ✗ |
| Xem nhiệm vụ, nhận nhiệm vụ, gửi kết quả xác minh | ✗ | ✗ | assigned | ✗ | ✗ |
| Đóng hồ sơ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Quản lý tài khoản, bộ phận, cấu hình xử lý | ✗ | ✗ | ✗ | ✗ | ✓ |
| Xem thống kê quản trị và nhật ký quản trị | ✗ | ✗ | ✗ | ✗ | ✓ |

Quyền xem SĐT đầy đủ của người gửi (đảo ngược có chủ đích so với v2.0, theo FR-08): **cán bộ** thấy ở A01, A02; **TNV** chỉ thấy ở V02 khi nhiệm vụ đang giao cho chính mình và chưa xong; **Quản trị viên và mọi API công khai không bao giờ thấy**. Có ghi nhật ký truy cập SĐT của nhân viên hay không: câu hỏi mở 17.1 (câu 5).

### 13.6. Tiêu chí chấp nhận

- AC-AUTH-1: Gọi endpoint `/officer/*` không token → 401; token TNV → 403; token CB → 200.
- AC-AUTH-2: Tài khoản `is_active=false` bị 403 ngay request kế tiếp dù token chưa hết hạn.
- AC-AUTH-3: Đổi vai trò trong DB có hiệu lực ở request kế tiếp (không chờ token mới).
- AC-AUTH-4: Người dân A không đọc được `/reports/:code/owner` của hồ sơ do người dân B gửi (SĐT khác, `ownerToken` khác) → 404.
- AC-AUTH-5: Sai mã bí mật 5 lần trong 15 phút từ một IP → lần thứ 6 trả 429 kể cả khi mã đúng.
- AC-AUTH-6: Quét toàn bộ phản hồi của `/public/*` và **`/volunteer/tasks` (danh sách)** không chứa chuỗi SĐT (regex `0\d{9}`), `secretCode`, hash (test tự động trên dữ liệu seed). Với `/volunteer/tasks/:code` quét ở hai trạng thái: nhiệm vụ của TNV khác hoặc đã xong → không có SĐT; nhiệm vụ của chính TNV và chưa xong → có đúng một `reporterPhone` (AC-V02-6). Không bao giờ có `secretCode`, `ownerToken`, hash, followers.
- AC-AUTH-7: Bản ghi `reports` ẩn danh có `reporter_phone` null kể cả sau `subscribe` (bất biến mục 5).
- AC-AUTH-8: `ownerToken` và `secretCode` không xuất hiện trong log máy chủ. SĐT đầy đủ cũng không được ghi vào log.
- AC-AUTH-9: **Quyền chủ hồ sơ qua SĐT.** `POST /citizen/reports/:code/feedback` và `…/supplement`: token có SĐT trùng `reporter_phone` → 200; token của người đã "Tôi cũng gặp" hoặc SĐT khác → 403 `FORBIDDEN`, hồ sơ không đổi; không token → 401 `CITIZEN_LOGIN_REQUIRED`.
- AC-AUTH-10: **Phạm vi SĐT của nhân viên.** `/officer/reports` và `/officer/reports/:code` trả `reporterPhone` đầy đủ (hồ sơ ẩn danh cũ: `null`). Token `admin` gọi hai endpoint này → 403. Mọi phản hồi `/admin/*` không có SĐT (AC-ADMIN-9).

### 13.7. Tiêu chí chấp nhận Đăng nhập (AC-LOGIN-*)

- AC-LOGIN-1: Màn hình `/dang-nhap` có bố cục responsive: Cán bộ trên desktop (≥1024px) có giao diện chuyên dụng, TNV trên mobile (<768px) có giao diện tối ưu chạm.
- AC-LOGIN-2: Đăng nhập thành công qua Supabase Auth: Cán bộ tự động chuyển hướng tới `/can-bo`, TNV chuyển hướng tới `/tnv`, Quản trị viên chuyển hướng tới `/quan-tri`.
- AC-LOGIN-3: Đăng nhập thất bại (sai email hoặc mật khẩu) hiển thị thông báo lỗi tiếng Việt dễ hiểu ("Email hoặc mật khẩu không chính xác"), không tiết lộ sự tồn tại của email trong hệ thống.
- AC-LOGIN-4: Tài khoản bị khoá (`is_active=false` trong `staff_profiles`): API trả về 403 `ACCOUNT_DISABLED`, màn hình hiển thị thông báo tài khoản bị tạm khoá.
- AC-LOGIN-5: Phân quyền route: Người dùng truy cập route không đúng vai trò (ví dụ TNV vào `/can-bo` hoặc Cán bộ vào `/tnv`) được chuyển tới trang `/khong-co-quyen` có nút quay về đúng trang vai trò.
- AC-LOGIN-6: Đăng xuất nhân viên xoá phiên nhân viên (token, vai trò, tên, phiên cổng) trong client và điều hướng về `/dang-nhap`; phiên người dân trên cùng thiết bị giữ nguyên (AC-SESSION-1).

---

## 14. Trang quản trị

Trang `/quan-tri/*` dành riêng cho `admin`, được bảo vệ ở cả SPA và API. Admin quản lý tài khoản nhân viên, bộ phận, cấu hình SLA; xem thống kê và nhật ký quản trị. Admin **không** xem SĐT đầy đủ, không truy cập API nghiệp vụ `/officer/*` hoặc `/volunteer/*`, và không tiếp nhận/giao/đóng hồ sơ.

### 14.1. Chức năng

| Trang | Nội dung |
|---|---|
| `/quan-tri` | Tổng hồ sơ, đã xử lý, trung bình ngày xử lý, quá hạn; phân bổ theo loại/bộ phận; số tài khoản theo vai trò. Mọi KPI truy vấn từ DB. |
| `/quan-tri/tai-khoan` | Tìm/lọc tài khoản theo tên, email, vai trò, trạng thái; tạo, sửa tên/vai trò/bộ phận, khoá/mở khoá, cấp lại mật khẩu. Mật khẩu tạm chỉ trả một lần. |
| `/quan-tri/bo-phan` | Xem, thêm, đổi tên, sắp xếp và bật/tắt bộ phận. Bộ phận đã có hồ sơ tham chiếu chỉ được ngừng hoạt động, không xoá. |
| `/quan-tri/cau-hinh` | SLA 1–30 ngày và bộ phận mặc định cho từng loại; thay đổi chỉ áp dụng cho hồ sơ được tiếp nhận sau đó. |
| `/quan-tri/nhat-ky` | Nhật ký thao tác quản trị, lọc người/hành động, phân trang. |

### 14.2. Bảo vệ và toàn vẹn

- Mọi endpoint `/admin/*` yêu cầu token nhân viên có `staff_profiles.role='admin'`; vai trò luôn đọc từ DB. Không token → 401, sai vai trò → 403. Gọi `/officer/*` hoặc `/volunteer/*` bằng Admin → 403.
- Không thể tự khoá hoặc tự hạ quyền admin hiện tại; luôn còn ít nhất một admin hoạt động. Không thể khoá/hạ quyền cán bộ cuối cùng đang hoạt động (AC-OPS-3) → 409.
- Tạo Supabase Auth user và `staff_profiles` là một thao tác nguyên tử theo nghĩa thành công/cùng hoàn tác; không để tài khoản dở dang khi lỗi. Mọi thao tác ghi cấu hình/tài khoản và bộ phận ghi `admin_audit_log` trong cùng transaction với người thực hiện, mục tiêu và chi tiết đã loại dữ liệu nhạy cảm.
- `admin_audit_log` bật RLS và không cấp policy cho `anon`/`authenticated`. Không ghi mật khẩu, token, service key, SĐT hoặc hash bí mật vào nhật ký/log.
- Các endpoint quản trị không trả SĐT, `secretCode`, `ownerToken`, hash mật khẩu hoặc dữ liệu xác thực. Email tài khoản nhân viên chỉ hiển thị trong trang quản trị đã xác thực.

### 14.3. API và CLI dùng chung

API: `GET/POST /admin/staff`, `PATCH /admin/staff/:id`, `POST /admin/staff/:id/{disable|enable|reset-password}`, `GET/POST/PATCH /admin/departments`, `GET/PATCH /admin/category-settings`, `GET /admin/overview`, `GET /admin/audit-log`. Request được validate bằng Zod; lỗi trả thông báo tiếng Việt.

CLI `scripts/staff.ts` tiếp tục được hỗ trợ và dùng chung service nghiệp vụ với API: liệt kê/tạo/khoá/mở khoá tài khoản, đặt lại mật khẩu và cập nhật SLA. Không nhận mật khẩu tùy chọn từ tham số dòng lệnh; mật khẩu tạm sinh ngẫu nhiên và chỉ hiển thị một lần. Seed tạo tài khoản “Quản trị viên Phường” idempotent, mật khẩu lấy từ `SEED_ADMIN_PASSWORD`.

AC-OPS-1: Email trùng khi tạo nhân viên báo lỗi và không để lại Auth user/profile dở dang. · AC-OPS-2: Không script/API nào log service key, DB URL hay mật khẩu tạm. · AC-OPS-3: Không thể khoá/hạ quyền cán bộ cuối cùng đang hoạt động; API trả 409. · AC-OPS-4: Script demo (`demo:reset`, `demo:clock`) từ chối chạy khi `DEMO_MODE` không bật.

### 14.4. Tiêu chí chấp nhận (AC-ADMIN-*)

- AC-ADMIN-1: `/admin/*` không token → 401; token `can_bo`/`tnv` → 403; token admin đang hoạt động → truy cập được.
- AC-ADMIN-2: Admin gọi bất kỳ endpoint `/officer/*` hoặc `/volunteer/*` → 403.
- AC-ADMIN-3: Tạo email trùng không để lại Auth user/profile; mật khẩu tạm chỉ trả một lần và không xuất hiện trong log.
- AC-ADMIN-4: Khoá/hạ quyền cán bộ cuối cùng đang hoạt động → 409; admin không thể tự khoá/tự hạ quyền và luôn còn admin hoạt động.
- AC-ADMIN-5: Thao tác ghi thành công có audit log; nếu transaction lỗi thì cả thao tác và audit cùng rollback.
- AC-ADMIN-6: Bộ phận được tham chiếu bởi hồ sơ không bị xoá; có thể đánh dấu không hoạt động.
- AC-ADMIN-7: SLA ngoài 1–30 ngày hoặc bộ phận mặc định không hợp lệ → 422; thay đổi chỉ ảnh hưởng hồ sơ tiếp nhận sau đó.
- AC-ADMIN-8: KPI tổng quan được tính từ DB và thống kê theo loại, bộ phận, vai trò; không có số KPI hard-code.
- AC-ADMIN-9: Quét toàn bộ response `/admin/*` không tìm thấy SĐT (`0\d{9}`), `secretCode`, `ownerToken`, password hash hoặc service secret.
- AC-ADMIN-10: Chế độ `VITE_DATA_SOURCE=local` hiển thị “Cần chế độ API” thay vì lỗi.

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

AC-PHOTO-1: Ảnh tải lên bằng chữ ký hết hạn → 403. · AC-PHOTO-2: File `.exe` đặt tên `.jpg` bị từ chối ở bước gắn hồ sơ. · AC-PHOTO-3: Người dân A không tải được ảnh `before` của hồ sơ B bằng cách đoán đường dẫn (bucket riêng tư, URL ký gắn quyền). · AC-PHOTO-4: File ảnh vượt quá 1.5MB hoặc không đúng định dạng `image/jpeg` hoặc `image/webp` bị từ chối ký URL (422).

---

## 16. Frontend, chế độ demo và dữ liệu

### 16.1. Hai chế độ chạy

| | `VITE_DATA_SOURCE=local` (**Chế độ demo offline**) | `VITE_DATA_SOURCE=api` (**Chế độ thật**) |
|---|---|---|
| Lưu ở | localStorage + `mock.json` như giai đoạn 1 | PostgreSQL qua API |
| Đăng nhập nhân viên | Không – nút chuyển cổng `PortalSwitcherFab` và Demo Hub | Có – `/dang-nhap`; `PortalSwitcherFab` chỉ điều hướng, không có Demo Hub (AC-ROLE-1) |
| Đăng nhập người dân (SĐT + OTP mô phỏng `123456`) | Có, nhãn "Mô phỏng" (D1 áp dụng cả hai chế độ) | Có, nhãn "Mô phỏng" |
| Ảnh | data URL | data URL trong DB. Upload Supabase Storage chưa làm (10.5, 15) |
| Triển khai | Một dự án Vercel riêng (giữ link đã nộp cho giám khảo, không đổi hành vi) | Dự án Vercel chính |

Cả hai chế độ dùng **cùng màn hình và cùng hàm `domain/`**. Giữa UI và dữ liệu có một lớp `DataSource` (interface) với hai bản cài đặt: `LocalDataSource` (bọc `citizenActions`/`officerActions` hiện có) và `ApiDataSource` (gọi API). Màn hình không biết đang ở chế độ nào.

### 16.2. Thay đổi hành vi nhìn thấy được ở chế độ thật

1. Thao tác trở thành **bất đồng bộ**: nút có trạng thái đang gửi; lỗi 409/422 hiện bằng lời tiếng Việt (map từ `error.code`) và dữ liệu tự tải lại.
2. Đồng bộ nhiều thiết bị: thay sự kiện `storage` bằng tải lại khi quay lại tab và làm mới định kỳ 30 giây ở A01/C05 (chưa cần realtime).
3. Nhãn "Mô phỏng" ở OTP/SMS/gợi ý loại **giữ nguyên** (10.3).
4. Offline khi gửi: dùng `Idempotency-Key`, giữ nháp (AC-C04-9).
5. `deviceReports` chỉ còn cho hồ sơ ẩn danh cũ và đổi sang `{code, ownerToken}`; dữ liệu cũ ở localStorage của giai đoạn 1 không di chuyển (chế độ thật bắt đầu từ DB). Hồ sơ mới gắn với SĐT đăng nhập.
6. Chưa đăng nhập: chỉ xem; gửi, "Tôi cũng gặp", thông báo, đánh giá đều dẫn tới đăng nhập (D1, D3, D4, D5).

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
- AC-DATA-6: Ở **cả hai chế độ**, gửi phản ánh khi chưa đăng nhập không tạo hồ sơ và dẫn tới đăng nhập; sau khi đăng nhập quay lại bước ③ với bản nháp còn nguyên (AC-C04-14). Chế độ API còn kiểm bằng 401 `CITIZEN_LOGIN_REQUIRED` (AC-API-10).

---

## 17. Câu hỏi mở và rủi ro giai đoạn 2

**Các quyết định thiết kế đã áp dụng phương án [ĐĐ] đề xuất (ghi nhận chờ chủ dự án duyệt):**

1. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Chống dò mã bí mật (13.4):** Giữ mã 4 số cho trải nghiệm người dùng + cấp `ownerToken` 256-bit cho máy + khoá dò thử sai (5 lần/15 phút/IP, 30 lần/24h).
2. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Cột `is_seed` (16.3):** Thêm cột `is_seed bool default false` vào bảng `reports` để bộ kiểm bất biến 64/47/3,2 không bị vỡ khi phát sinh hồ sơ mới sau seed.
3. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Chế độ demo offline (16.1):** Tách biệt qua biến môi trường `VITE_DATA_SOURCE=local` giữ nguyên vẹn 100% trải nghiệm và link nộp 24/11.
4. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Vùng đặt dữ liệu:** Dùng Supabase Singapore cho đợt thi hackathon/demo; tài liệu vận hành ghi rõ lộ trình chuyển vùng hạ tầng trong nước theo Nghị định 13/2023/NĐ-CP khi đưa vào thực tế chính thức.
5. ~~CB không xem SĐT đầy đủ (13.5)~~ **Đã đảo ngược theo FR-08/D7:** cán bộ thấy SĐT đầy đủ (A01, A02); TNV chỉ thấy ở V02 theo điều kiện AC-V02-6; mọi màn/API công khai và Quản trị viên không thấy (7.7).
6. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Quên mật khẩu nhân viên (13.2):** Không làm tính năng tự phục vụ; nhà phát triển đặt lại mật khẩu qua script CLI `staff:reset-password`.
7. **[ĐĐ áp dụng, chờ chủ dự án duyệt] Cron 1 lần/ngày (12.7):** Chấp nhận cron 1 lần/ngày cho tự đóng hồ sơ sau 7 ngày trên hạ tầng Vercel Hobby (độ trễ tối đa 24 giờ).

**Rủi ro:**

| Rủi ro | Biện pháp |
|---|---|
| Lộ SĐT qua API/log | AC-AUTH-6, 8, 10; serializer công khai duy nhất (`toPublicReport`) dùng cho mọi endpoint công khai; SĐT đầy đủ chỉ qua 3 nhóm phản hồi ở 12.1. Sau FR-08 bề mặt rủi ro lớn hơn (cán bộ/TNV thấy SĐT) nên test quét phải chạy ở CI |
| Gói miễn phí Supabase tạm dừng khi không dùng 7 ngày | Ghi vào hướng dẫn vận hành; cron ping hằng ngày |
| Giới hạn kết nối DB từ Vercel Functions | Dùng chuỗi kết nối **pooler (transaction mode)**, mỗi function tối đa 1–3 kết nối |
| Lệch logic client/server | `domain/` dùng chung; test hợp đồng chạy cùng một bộ case trên hàm thuần và trên API |
| Lạm dụng gửi/spam sau khi bỏ ẩn danh | Bắt buộc đăng nhập SĐT; giới hạn OTP theo SĐT/IP; hạn mức hồ sơ/SĐT/ngày (17.1, câu 4); kích cỡ ảnh; khoá bằng script nếu cần. OTP mô phỏng nên chống spam thực chất còn yếu cho tới khi có OTP thật |
| Ảnh lưu data URL trong DB làm bảng phình, truy vấn chậm | Giới hạn 3 ảnh/hồ sơ, nén ≤ 1280px JPEG 0,7; chuyển sang Supabase Storage (mục 15) là việc chưa làm, cần lập kế hoạch trước khi mở cho người dùng thật |
| Cán bộ/TNV gọi và lưu SĐT ngoài hệ thống | Chưa có nhật ký truy cập SĐT (17.1, câu 5); cân nhắc trước khi mở cho người dùng thật (Nghị định 13/2023/NĐ-CP) |
| Mock OTP bị bỏ quên khi chạy thật | Cờ `otpMock` trong `/public/config`, UI luôn hiện nhãn; `db:verify`/CI cảnh báo nếu `OTP_PROVIDER=mock` và `NODE_ENV=production` mà không đặt `ALLOW_MOCK_OTP=true` |

### 17.1. Câu hỏi mở phát sinh từ FR-08 và spec v3.0

Mỗi câu ghi **cách đã xử lý tạm trong spec** để code không bị chặn; chủ dự án duyệt hoặc đổi.

1. **"Người phản ứng" trong FR-08 là ai?** FR-08 ghi chức năng đánh giá "chỉ hiển thị cho người phản ứng". Đã hiểu là người gửi phản ánh (chủ hồ sơ, 3.4a), không gồm người bấm "Tôi cũng gặp" (theo quyết định D3).
2. **Phần thông báo ở trang hồ sơ (FR-08).** FR-08 chỉ ghi "yêu cầu làm thêm phần thông báo ở trang hồ sơ". Đã viết AC-C06-15 (khối "Tin báo của phản ánh này") và C09; nội dung chi tiết là **[GĐ]**.
3. **"Tôi cũng gặp" hiện ở trạng thái nào, có gỡ được không.** FR-08 không nói. Đã giả định hiện khi hồ sơ chưa ở `hoan_thanh`, `dong`, `da_gop`, `chuyen_co_quan`, `khong_xac_nhan` (AC-C06-13) và **không có thao tác bỏ "Tôi cũng gặp"**. Chưa có thông báo cho chủ hồ sơ khi có người cùng báo. API trả 403 khi chính người gửi gọi `follow` (spec đặt thêm ở 12.3, FR-08 chỉ nói người gửi không thấy nút).
4. **Hạn mức gửi theo SĐT.** Spec cũ chỉ có hạn mức ẩn danh (đã bỏ). Server hiện giới hạn 10 hồ sơ/SĐT/24 giờ (429 `RATE_LIMIT_EXCEEDED`) nhưng spec chưa ghi. Đã ghi nhận số này là **[ĐĐ]** ở 13.4 mục 5, không đặt số mới; cần chủ dự án chốt.
5. **Nhật ký truy cập SĐT của cán bộ/TNV.** FR-08 cho cán bộ/TNV thấy SĐT nhưng không nói có ghi vết. Spec **không** yêu cầu nhật ký; proposal_v3 từng nhắc nhật ký truy cập cho trường hợp khẩn cấp. Cần chốt trước khi dùng dữ liệu thật.
6. **Phạm vi SĐT cho TNV.** FR-08 viết "cán bộ/TTV" thấy SĐT. Đã thu hẹp theo quyết định D7: chỉ V02, nhiệm vụ đang giao cho chính TNV và chưa xong. Nhiệm vụ mở chưa ai nhận không có SĐT cho tới khi TNV nhận.
7. **Thiếu token ở feedback/supplement: 401 hay 403.** D3 chỉ nêu 403 khi không phải chủ. Spec đặt: không token → 401 `CITIZEN_LOGIN_REQUIRED`, có token nhưng không phải chủ → 403 `FORBIDDEN`. Test `OWNER-001` cũ (không có xác thực → 403) cần cập nhật theo.
8. **Video ở V02 (D10).** UI nhận "Ảnh / Video". Spec chưa có kích thước tối đa, định dạng, nơi lưu video (bảng `report_photos` chỉ có ảnh). Chưa có AC cho phần video ngoài việc "bắt buộc ảnh hoặc video".
9. **Số bước và quan hệ C02, C03, C04.** UI hiện C02 ghi "Bước 1/3 – Ảnh" còn wizard C04 có "Bước 1/3 Phân loại". Cần chốt cách đánh số (AC-NAV-4). Quan hệ giữa route `/bao-su-co/vi-tri` (C03) và bước ② của C04 cần xác nhận.
10. **`transfer` và `chuyen_co_quan`.** A02 đã bỏ nút "Chuyển cơ quan khác" nhưng API `…/transfer`, trạng thái `chuyen_co_quan` và 1 hồ sơ dữ liệu mẫu (DB-010) còn. Chưa quyết định xoá hay giữ API.
11. **`lookup`/`claim` với hồ sơ có SĐT.** Đã ghi: không cấp `ownerToken` (quyền chủ chỉ qua đăng nhập). Mã lỗi trả về chưa chốt.
12. **Trường `anonymous` trong body `POST /citizen/reports`.** Chưa chốt từ chối (400/422, câu hỏi cũ về 400 hay 422) hay bỏ qua; spec chỉ bắt buộc kết quả luôn `anonymous=false`.
13. **QR hiển thị ở đâu.** FR-08 chỉ nói "quét QR". Đã giả định QR là link `/phan-anh/:id` hiển thị ở thẻ chia sẻ C06 (AC-C06-11); màn thành công không còn QR (đã bỏ cùng gửi ẩn danh).
14. **Màn đã có trong UI nhưng chưa có AC:** màn chào `WelcomeScreen` (chọn cỡ chữ lần đầu), `/can-bo/thong-ke`, `/can-bo/ho-so`, `/tnv/thong-ke`, `/tnv/ho-so`, `/tim-kiem`, `/dev/ui` (chỉ dev). Spec chỉ liệt kê route (mục 8).
15. **B2 trong UI.** UI đã có hộp nghi trùng và "tham gia hồ sơ trùng" ở C04 trong khi spec còn đánh dấu B2 [BONUS – HOÃN] (trừ "Tôi cũng gặp" đã chuyển sang lõi). Cần quyết định mở B2 chính thức hay tắt trên UI.
16. **Ảnh data URL (D11).** Ảnh vẫn lưu trong DB, chưa upload Supabase Storage; ghi ở 10.5 và bảng rủi ro. Mục 15 vẫn là thiết kế đích.
17. **`secret_code_hash` cho hồ sơ mới.** Server vẫn sinh để giữ DV-014 ("mọi hồ sơ có `secretCode` 4 số"); không trả cho người dân. Có thể bỏ ràng buộc này ở lần cập nhật sau.
