### FR-08 (Bổ sung và fix lỗi luồng logic bị thiếu sót)
- Cư dân có thể chọn đăng nhập app hoặc không
- Khi gửi phản ánh họ phải bắt buộc có số điện thoại 
  + Không có số điện thoại, Cán bộ/TTV không biết hướng liên lạc khi vấn đề không tìm thấy và cần người gửi nội dung gửi bổ sung tài liệu
  + Lưu trữ hồ sơ, để họ kiểm tra lại (qua phương thức lịch sử của account họ hoặc họ tự nhớ mã để tìm).
  + Nếu họ không đăng nhập -> Chức năng đánh giá mức độ hài lòng (chỉ hiển thị cho người phản ứng và cần họ đăng nhập)
- Thêm luồng chặn tôi cũng gặp vấn đề này, hiện trạng 1 người có thể nhấn nhiều lần, chặn chỉ 1 người nhấn 1 lần.
- Nhận tin báo (chỉ hiển thị cho giao diện đã đăng nhập [yêu cầu làm thêm phần thông báo ở trang hồ sơ])
- Thêm phần quét QR để nhận diện QR phản ánh và chuyển tới nhanh
- Loại bị đi chức năng ẩn danh
  + Số điện thoại chỉ hiển thị cho cán bộ/TTV. Bên bài đăng không có chứa SĐT
  + Tránh mơ hồ liên hệ khi gặp vấn đề
  + Bổ sung cột SĐT cho bên Cán Bộ/ TTV liên hệ nếu có vấn đề


# PROJECT PROPOSAL
## TRẤN BIÊN KẾT NỐI
**Một phản ánh – Một hành trình minh bạch**

**Cuộc thi:** Đồng Nai Hackathon 2026  
**Đề bài:** Đề 2 – Phản ánh hiện trường (Chính quyền số – Đô thị thông minh)  
**Phạm vi:** Web Application (Frontend PWA + Cloudflare Workers API)  
**Phiên bản:** v2.2 (25/11/2026) – cập nhật kiến trúc sản phẩm thực tế: Cloudflare Workers API, Gemini Vision thật, Turnstile, Web Push, SLA/CSV, PWA & nền tảng D1/R2

---

## 0. Quy ước đọc tài liệu

Mỗi nội dung trong proposal được gắn một trong ba nhãn:

| Nhãn | Ý nghĩa |
|---|---|
| **[ĐỀ]** | Yêu cầu hoặc dữ liệu do BTC cung cấp trong đề bài |
| **[GIẢ ĐỊNH]** | Quyết định thiết kế của nhóm, cần BTC hoặc phường xác nhận nếu triển khai thật |
| **[CẦN KIỂM CHỨNG]** | Dữ kiện bên ngoài nhóm chưa tự xác minh đầy đủ |

Toàn bộ giới hạn phạm vi và giả định được gom tại Mục 13, không lặp lại ở từng chức năng.

---

## 1. Executive Summary

Người dân phường Trấn Biên gặp đèn đường hỏng, ngập nước, rác thải tự phát, mặt đường hư hỏng nhưng không biết báo ai, và báo xong không biết đã được xử lý chưa **[ĐỀ]**. Vấn đề cốt lõi không nằm ở việc *gửi* phản ánh, mà ở **vòng phản hồi bị đứt**: người dân không thấy hồ sơ của mình đi đến đâu, ai đang xử lý, và kết quả có thật không.

Trấn Biên Kết Nối thiết kế lại toàn bộ vòng đời một phản ánh:

1. **Gửi trong 3 bước** – chụp ảnh, ghim vị trí, chọn loại.
2. **Giao đúng bộ phận** – hệ thống gợi ý loại và hạn xử lý theo loại sự cố; cán bộ xác nhận.
3. **Xác minh độc lập** – thanh niên tình nguyện xác minh tại chỗ khi cần, và nghiệm thu khi người dân báo "chưa giải quyết".
4. **Công khai kết quả** – mọi người dân, không cần đăng nhập, xem được bảng minh bạch của phường và ảnh trước/sau xử lý.
5. **Không bỏ ai lại phía sau** – chế độ chữ lớn, mô tả bằng giọng nói, và kênh "gửi hộ" cho người không dùng điện thoại thông minh.

Sản phẩm là web prototype tương tác: giao diện người dân và tình nguyện viên trên điện thoại, dashboard cán bộ trên máy tính, dùng chung một nguồn dữ liệu mẫu bám đúng số liệu đề bài.

---

## 2. Problem Statement

### 2.1. Bối cảnh địa bàn

- Phường Trấn Biên là "siêu phường" trung tâm của TP. Đồng Nai, hợp nhất từ các phường Bửu Long, Quang Vinh, Trung Dũng, Thống Nhất, Hiệp Hòa và An Bình, quy mô khoảng 200.000 dân.
- Tháng 11/2026, phường ghi nhận 64 phản ánh **[ĐỀ]**.
- Giả thuyết nhóm **[GIẢ ĐỊNH]**: so với quy mô dân số, 64 phản ánh/tháng cho thấy nhiều sự cố có thể chưa được báo, một phần do kênh phản ánh khó tiếp cận hoặc người dân không tin phản ánh sẽ được xử lý. Giả thuyết này dùng để định hướng thiết kế, không phải kết luận.

### 2.2. Điểm đau theo vai trò

| Vai trò | Điểm đau | Hệ quả nếu không giải quyết |
|---|---|---|
| Người dân | Không biết báo ai; không biết hồ sơ đang ở đâu | Không báo lần sau |
| Người cao tuổi | Chữ nhỏ, nhiều bước, phải gõ chữ, phải thao tác bản đồ | Phụ thuộc người khác hoặc bỏ cuộc |
| Cán bộ tiếp nhận | Hồ sơ phân tán, trùng lặp, không rõ bộ phận phụ trách, khó theo dõi hạn | Trễ hạn, giao sai bộ phận |
| Tình nguyện viên | Không rõ cần xác minh gì, ở đâu, gửi kết quả cho ai | Xác minh hình thức, thiếu bằng chứng |

---

## 3. Personas

| Persona | Mục tiêu | Nhu cầu thiết kế then chốt |
|---|---|---|
| **A – Chị Lan, 34 tuổi, nhân viên văn phòng** | Báo nhanh trên đường đi làm, biết khi nào xong | Dưới 60 giây để gửi; thông báo khi đổi trạng thái |
| **B – Ông Tư, 68 tuổi, hưu trí** | Báo ổ gà trước nhà mà không phải hỏi con cháu | Chữ lớn, nút lớn, nói thay vì gõ, không cần tài khoản, có người gửi hộ |
| **C – Anh Minh, cán bộ tiếp nhận phường** | Không bỏ sót, giao đúng, không trễ hạn | Hộp tiếp nhận ưu tiên theo hạn; gợi ý bộ phận; cảnh báo trùng và quá hạn |
| **D – Bạn Vy, 20 tuổi, Đoàn thanh niên** | Hoàn thành nhiệm vụ xác minh nhanh, đúng | Danh sách nhiệm vụ gần mình; biểu mẫu 3 câu; chụp ảnh tại chỗ |

Persona là hình mẫu thiết kế **[GIẢ ĐỊNH]**, không phải kết quả phỏng vấn.

---

## 4. Mô hình nghiệp vụ

### 4.1. Vòng đời phản ánh – hai lớp trạng thái

Cán bộ cần trạng thái chi tiết; người dân cần trạng thái dễ hiểu. Hệ thống dùng **trạng thái nội bộ** cho dashboard và **ánh xạ** sang **nhãn công khai** cho người dân.

| Trạng thái nội bộ | Ai chuyển | Nhãn công khai (người dân thấy) | Thông báo gửi người dân |
|---|---|---|---|
| Mới | Hệ thống (khi gửi) | **Chờ tiếp nhận** | "Phường đã nhận phản ánh #TB-xxxx của bạn." |
| Đã tiếp nhận | Cán bộ | **Đã tiếp nhận** | "Phản ánh đã được tiếp nhận, dự kiến xử lý trước [ngày]." |
| Chờ xác minh | Cán bộ giao TNV | **Đã tiếp nhận** (kèm dòng "Đang kiểm tra tại chỗ") | Không gửi riêng |
| Đã giao xử lý | Cán bộ | **Đang xử lý** | "Đã giao [bộ phận], hạn [ngày]." |
| Hoàn thành (chờ người dân xác nhận) | Cán bộ, kèm ảnh sau | **Đã xử lý** | "Đã xử lý xong. Mời bạn xem ảnh và đánh giá." |
| Đóng | Hệ thống (sau đánh giá hoặc sau 7 ngày không phản hồi **[GIẢ ĐỊNH]**) | **Đã xử lý** | Không gửi |
| Mở lại | Hệ thống (khi người dân chọn "Chưa giải quyết") | **Đang xử lý lại** | "Phường đã nhận ý kiến, sẽ kiểm tra lại." |

**Trạng thái ngoại lệ** (hiển thị riêng, có lý do bắt buộc):

| Trạng thái | Nhãn công khai | Điều kiện |
|---|---|---|
| Cần bổ sung | **Cần bổ sung thông tin** | Ảnh không rõ, vị trí sai; người dân bổ sung trong 3 ngày **[GIẢ ĐỊNH]** |
| Đã gộp | **Đã gộp vào #TB-yyyy** | Cán bộ gộp vào hồ sơ chính; người gửi tự động theo dõi hồ sơ chính |
| Không thuộc thẩm quyền | **Đã chuyển cơ quan khác** | Ghi rõ cơ quan được chuyển tới |
| Không phát hiện sự cố | **Không xác nhận được sự cố** | Có ảnh xác minh của TNV làm bằng chứng |

Nguyên tắc: người dân **không bao giờ thấy quá 4 nhãn chính** (Chờ tiếp nhận → Đã tiếp nhận → Đang xử lý → Đã xử lý – từ vựng quen thuộc với các ứng dụng dịch vụ công); mỗi nhãn luôn đi kèm một câu "Cập nhật mới nhất" và ngày dự kiến. Khi quá hạn, người dân thấy thẳng chip **"Chậm {n} ngày"** – nhóm chọn nói thật thay vì che giấu.

### 4.2. Định tuyến loại sự cố → bộ phận và hạn xử lý

| Loại **[ĐỀ]** | Bộ phận gợi ý **[GIẢ ĐỊNH]** | Hạn mặc định **[GIẢ ĐỊNH, cấu hình được]** | Ưu tiên tự động nâng khi |
|---|---|---|---|
| Đèn đường | Phòng Kinh tế, Hạ tầng và Đô thị → đơn vị chiếu sáng công cộng | 3 ngày | Tuyến đường chính, nhiều người cùng báo |
| Ngập nước | Phòng Kinh tế, Hạ tầng và Đô thị → đơn vị thoát nước | 2 ngày | Ngập kéo dài, có người cùng báo |
| Rác thải | Bộ phận môi trường → đơn vị vệ sinh môi trường / khu phố | 2 ngày | Gần trường học, chợ |
| Mặt đường | Phòng Kinh tế, Hạ tầng và Đô thị → đơn vị duy tu đường | 5 ngày | Ổ gà sâu trên tuyến xe đông |

- UBND phường Trấn Biên có Phòng Kinh tế, Hạ tầng và Đô thị (căn cứ văn bản công khai của phường). Các đơn vị xử lý cấp dưới là **[GIẢ ĐỊNH]** để mô phỏng.
- Hệ thống chỉ **gợi ý**; cán bộ luôn là người xác nhận bộ phận và hạn.
- Hạn mặc định **không** suy ra từ thời gian trung bình 3,2 ngày của đề; đó là cấu hình demo.

### 4.3. Khi nào điều tình nguyện viên

Không phải phản ánh nào cũng cần xác minh. Cán bộ được gợi ý điều TNV khi:

1. Ảnh không đủ rõ để kết luận loại sự cố.
2. Có từ 2 phản ánh nghi trùng nhưng khác mô tả.
3. **Nghiệm thu:** người dân chọn "Vấn đề vẫn chưa được giải quyết" sau khi hồ sơ được đánh dấu xử lý xong.

Trường hợp 3 là điểm khác biệt: kết quả xử lý được kiểm tra bởi một bên **không phải đơn vị xử lý**, giúp tăng niềm tin.

### 4.4. Ma trận phân quyền

| Hành động | Người dân | TNV | Cán bộ tiếp nhận |
|---|:---:|:---:|:---:|
| Gửi phản ánh | ✓ (có SĐT hoặc ẩn danh) | ✓ | ✓ (gửi hộ) |
| Đăng ký nhận tin cho hồ sơ đã gửi ẩn danh | ✓ | – | – |
| Xem bảng minh bạch, bản đồ | ✓ | ✓ | ✓ |
| Xác nhận "Tôi cũng gặp" | ✓ | – | – |
| Gửi kết quả xác minh | – | ✓ | – |
| Phân loại, giao bộ phận, đặt hạn | – | – | ✓ |
| Gộp hồ sơ trùng | – | – | ✓ |
| Đánh dấu hoàn thành, tải ảnh sau | – | – | ✓ |
| Đóng hoặc mở lại hồ sơ | Gián tiếp (qua đánh giá) | – | ✓ |

TNV **không** có quyền kết luận hay đóng hồ sơ.

---

## 5. Functional Requirements

### FR-01: Gửi phản ánh trong 3 bước [ĐỀ]

**Bước 1 – Chụp ảnh**
- Nút "Chụp ảnh" (camera) và "Chọn ảnh có sẵn"; tối đa 3 ảnh.
- Xem trước, thay ảnh, xoá ảnh.
- Nếu có AI (BF-01): hiển thị gợi ý loại ngay dưới ảnh, ví dụ "Có vẻ là: Mặt đường – bạn sẽ xác nhận ở bước 3".

**Bước 2 – Vị trí trên bản đồ**
- Mặc định dùng GPS sau khi người dùng đồng ý; ghim đặt sẵn tại vị trí hiện tại.
- Người dùng chạm lên bản đồ để dời ghim (không bắt buộc kéo).
- Ô "Nhập địa chỉ hoặc tên đường" làm phương án thay thế khi GPS bị từ chối hoặc người dùng không quen bản đồ.
- Hiển thị địa chỉ dạng chữ dưới bản đồ để người dùng kiểm tra.
- Trường "Mô tả thêm vị trí" (tùy chọn), ví dụ "trước số nhà 12, gần cột điện".

**Bước 3 – Chọn loại, xác nhận và gửi**
- 4 thẻ loại lớn có icon và nhãn chữ: Đèn đường, Ngập nước, Rác thải, Mặt đường. Thẻ được AI gợi ý được chọn sẵn, người dùng sửa được.
- Mô tả ngắn tùy chọn: gõ chữ **hoặc** nhấn giữ để nói (BF-04).
- **Kiểm tra trùng chạy tại đây** (sau khi đã biết loại) – xem BF-02.
- Tóm tắt ảnh, vị trí, loại trên cùng màn hình; nút "Gửi phản ánh".
- Hai cách gửi, không cách nào cần tạo tài khoản hay mật khẩu:
  - **Để lại số điện thoại (mặc định):** nhập SĐT, nhận mã OTP (mô phỏng trong demo). Ngay tại ô nhập ghi rõ: *"Số điện thoại chỉ dùng để báo tin cho bạn, không bao giờ hiển thị công khai."*
  - **Gửi ẩn danh:** link nhỏ "Gửi không để lại số điện thoại" dưới nút chính. Trước khi gửi hiện cảnh báo bằng lời đơn giản: *"Bạn sẽ không nhận được tin báo. Máy này sẽ tự nhớ phản ánh; hãy lưu link theo dõi để xem trên máy khác."*
- Màn hình thành công: mã phản ánh dạng **TB-0065**, cỡ chữ lớn, nút "Theo dõi phản ánh".
  - Có SĐT: thông báo "Bạn sẽ nhận tin nhắn khi có cập nhật".
  - Ẩn danh: hiện thêm **mã bí mật 4 số**, mã QR, nút **"Lưu link theo dõi"** (mở menu chia sẻ của điện thoại để gửi vào Zalo của chính mình, ghi chú hoặc chụp màn hình) và dòng nhắc *"Máy này sẽ tự nhớ phản ánh của bạn. Đổi máy thì mở link đã lưu."*
- Chống lạm dụng gửi ẩn danh **[GIẢ ĐỊNH]**: tối đa 5 phản ánh ẩn danh/thiết bị/ngày; hồ sơ ẩn danh gắn nhãn "Ẩn danh" phía cán bộ và được gợi ý giao TNV xác minh trước khi xử lý.

**Trạng thái bắt buộc:** GPS bị từ chối; ảnh lỗi hoặc quá dung lượng; mất mạng khi gửi (lưu nháp, gửi lại); OTP sai.

### FR-02: Theo dõi phản ánh của tôi [ĐỀ]

- Bốn cách theo dõi, từ dễ nhất:
  1. **Máy tự nhớ:** phản ánh gửi từ thiết bị này tự hiện trong "Phản ánh của tôi", không cần nhập gì – áp dụng cho cả gửi ẩn danh.
  2. **Link theo dõi / mã QR:** mở là vào thẳng hồ sơ với đủ quyền của người gửi (đánh giá, báo chưa giải quyết).
  3. **Tra cứu:** mã phản ánh + 4 số cuối SĐT (người để lại số, người được gửi hộ) hoặc mã phản ánh + mã bí mật 4 số (người gửi ẩn danh).
  4. **Đăng nhập bằng SĐT + OTP:** xem mọi phản ánh gắn với số đó trên bất kỳ máy nào.
- Mọi phản ánh vẫn xem được công khai trên bản đồ "Quanh đây" và bảng minh bạch, nên người gửi ẩn danh dù mất hết mã vẫn kiểm tra được kết quả tại đúng vị trí mình báo.
- **Đăng ký nhận tin sau cho riêng một hồ sơ:** trong chi tiết hồ sơ ẩn danh có nút **"Nhận tin báo cho phản ánh này"**. Người gửi để lại SĐT (xác thực OTP) bất cứ lúc nào; số đó chỉ dùng để báo tin cho đúng hồ sơ này và không biến hồ sơ thành có danh tính với cộng đồng. Phù hợp với người lúc đầu còn ngại, sau thấy phường xử lý thật thì mới tin.
- Danh sách thẻ hồ sơ: ảnh thu nhỏ, loại, nhãn trạng thái, ngày dự kiến.
- Chi tiết hồ sơ:
  - Thanh tiến trình 4 bước theo nhãn công khai (Mục 4.1).
  - Timeline từng mốc: thời điểm, nội dung, bộ phận phụ trách.
  - Ảnh trước / sau đặt cạnh nhau.
  - Khu vực đánh giá (FR-06) khi hồ sơ ở trạng thái Đã xử lý.
- Hồ sơ đã gộp: hiển thị "Phản ánh của bạn đã được gộp vào #TB-yyyy cùng N người khác" và chuyển sang theo dõi hồ sơ chính.
- Trung tâm thông báo: danh sách tin cập nhật; demo hiển thị mẫu tin nhắn SMS/Zalo tương ứng.

### FR-03: Bản đồ phản ánh quanh tôi [ĐỀ]

Mục đích: (1) người dân kiểm tra sự cố đã có ai báo chưa trước khi gửi; (2) thấy phường đang xử lý những gì quanh mình.

- Bản đồ OpenStreetMap, mặc định bán kính 1 km quanh vị trí người dùng; nút "Xem toàn phường".
- Marker phân biệt bằng **icon + màu + nhãn chữ** (không chỉ màu).
- Bộ lọc: loại (4), trạng thái (Đang xử lý / Đã xử lý).
- Nhấn marker: thẻ tóm tắt (ảnh, loại, nhãn trạng thái, số người cùng báo) → "Xem chi tiết" → "Tôi cũng gặp vấn đề này".
- Nút chuyển **Bản đồ / Danh sách**; danh sách sắp theo khoảng cách.
- Quyền riêng tư: không hiển thị tên, số điện thoại người gửi; ảnh công khai cần được cán bộ duyệt trước khi hiện trên bản đồ **[GIẢ ĐỊNH]**.

### FR-04: Dashboard cán bộ tiếp nhận [ĐỀ]

**Hộp tiếp nhận (A01)**
- Thẻ KPI: Tổng phản ánh tháng, Đã xử lý, Chưa hoàn tất, Thời gian xử lý trung bình – lấy đúng số liệu đề (Mục 9).
- Biểu đồ cột theo 4 loại.
- Bảng hồ sơ: mã, ảnh, loại, địa chỉ, nhãn trạng thái, bộ phận, hạn, số người cùng báo.
- Sắp xếp mặc định: **quá hạn → sắp đến hạn (≤ 1 ngày) → mới → còn lại**.
- Huy hiệu "Nghi trùng" trên hồ sơ có phản ánh cùng loại trong bán kính gần.
- Bộ lọc: loại, trạng thái, bộ phận, thời gian; ô tìm theo mã hoặc địa chỉ.
- Nút "Tạo phản ánh hộ" cho trường hợp người dân gọi điện hoặc đến trực tiếp.

**Chi tiết và giao xử lý (A02)** – panel bên phải, không rời danh sách
- Ảnh, bản đồ nhỏ, mô tả, lịch sử thao tác.
- Loại (sửa được nếu người dân chọn sai), mức ưu tiên.
- Bộ phận: chọn sẵn theo bảng 4.2, cán bộ xác nhận hoặc đổi.
- Hạn xử lý: điền sẵn theo bảng 4.2, chỉnh được.
- Nút "Giao TNV xác minh" (chọn TNV hoặc để mở cho TNV gần nhất nhận).
- Khối "Phản ánh tương tự": danh sách hồ sơ nghi trùng → nút "Gộp vào hồ sơ này".
- Các nút ngoại lệ: Yêu cầu bổ sung, Chuyển cơ quan khác – mỗi nút bắt buộc nhập lý do.

### FR-05: Xác minh và cập nhật kết quả [ĐỀ]

**Tình nguyện viên (V01, V02)**
- V01: danh sách nhiệm vụ, sắp theo khoảng cách; mỗi nhiệm vụ ghi rõ loại nhiệm vụ: *Xác minh ban đầu* hoặc *Nghiệm thu sau xử lý*.
- V02: bản đồ chỉ đường, ảnh gốc của người dân, biểu mẫu 3 câu:
  1. Sự cố có tồn tại không? (Có / Không / Không tìm thấy vị trí)
  2. Mức độ: Nhẹ / Trung bình / Nguy hiểm
  3. Ảnh tại chỗ (bắt buộc) + ghi chú (tùy chọn)
- Gửi xong, hồ sơ trở về cán bộ kèm kết quả; TNV không đổi trạng thái công khai.

**Cán bộ (A03)**
- Cập nhật tiến độ, tải ảnh sau xử lý (bắt buộc để đánh dấu hoàn thành), mô tả công việc đã làm.
- Xem trước giao diện người dân sẽ thấy (ảnh trước/sau) trước khi xác nhận.
- Hồ sơ gộp: hoàn thành hồ sơ chính sẽ cập nhật cho tất cả người gửi liên quan.

### FR-06: Đánh giá mức độ hài lòng [ĐỀ]

- Xuất hiện trong chi tiết hồ sơ khi ở trạng thái Đã xử lý.
- Câu hỏi đầu tiên: **"Vấn đề đã được giải quyết chưa?"** – Đã giải quyết / Chưa giải quyết.
  - *Đã giải quyết* → đánh giá 1–5 bằng biểu tượng mặt cười có nhãn chữ (Rất không hài lòng … Rất hài lòng) + góp ý tùy chọn → hồ sơ Đóng.
  - *Chưa giải quyết* → chụp ảnh hiện trạng (tùy chọn) → hồ sơ **Mở lại**, sinh nhiệm vụ nghiệm thu cho TNV.
- Đánh giá không sửa lịch sử xử lý; chỉ thêm một mốc mới trong timeline.

### FR-07: Bảng minh bạch phường (công khai) [ĐỀ: "công khai kết quả"]

Màn hình công khai, không cần đăng nhập, truy cập từ trang chủ:

- Số liệu tháng: tổng phản ánh, đã xử lý, chưa hoàn tất, thời gian xử lý trung bình.
- Phân bổ theo 4 loại.
- Danh sách "Vừa xử lý xong" với ảnh trước/sau.
- Ghi chú nguồn: "Số liệu tổng hợp tháng 11/2026 – dữ liệu mẫu cuộc thi".

---

## 6. Bonus Features [ĐỀ: điểm cộng]

### BF-01: Gợi ý phân loại từ ảnh bằng AI

- Chạy ngay sau Bước 1; kết quả chỉ chọn sẵn thẻ ở Bước 3, người dùng luôn sửa được.
- Hiển thị độ tin cậy dạng chữ ("Khá chắc chắn" / "Chưa chắc – vui lòng chọn"); dưới ngưỡng thì không chọn sẵn.
- **Hai mức triển khai, công bố trung thực:**
  - Mức 1 – mô phỏng: kết quả gắn sẵn cho bộ ảnh demo, có nhãn "Mô phỏng".
  - Mức 2 – thật: một serverless function (ví dụ trên Vercel) gọi mô hình thị giác để phân loại 4 nhãn; API key nằm phía server. Chỉ gọi là "AI hoạt động" khi đã chạy thử trên ít nhất 20 ảnh và ghi lại tỷ lệ đúng.

### BF-02: Gộp phản ánh trùng vị trí

Thiết kế hai phía, vì đề yêu cầu **gộp**, không chỉ cảnh báo:

**Phía người dân (gợi ý, tại Bước 3)**
- Điều kiện nghi trùng **[GIẢ ĐỊNH]**: cùng loại, cách ≤ 50 m, gửi trong 14 ngày, hồ sơ chưa đóng.
- Hiển thị: "Đã có 2 người báo *Mặt đường* cách bạn khoảng 30 m" kèm ảnh của hồ sơ đó.
- Lựa chọn:
  - **"Đúng chỗ này – tôi cũng gặp"**: không tạo hồ sơ mới; người dùng được thêm vào danh sách theo dõi và nhận thông báo như người gửi; số người cùng báo tăng lên, đẩy mức ưu tiên.
  - **"Không phải – gửi phản ánh mới"**: tạo hồ sơ mới, gắn cờ "nghi trùng" cho cán bộ.

**Phía cán bộ (gộp thật, tại A02)**
- Cán bộ chọn hồ sơ chính, gộp các hồ sơ phụ vào.
- Hồ sơ phụ chuyển trạng thái Đã gộp; ảnh của hồ sơ phụ được giữ trong hồ sơ chính làm bằng chứng bổ sung.
- Có thể **tách** lại nếu gộp nhầm.

Không bao giờ tự động gộp chỉ dựa trên khoảng cách: hai sự cố khác nhau có thể nằm sát nhau (ví dụ đèn hỏng và ổ gà cùng một góc đường – khác loại nên không bị gộp; hai ổ gà cách 40 m – cán bộ quyết định).

### BF-03: Chế độ chữ lớn cho người cao tuổi

- Nút bật **ngay trên trang chủ** ("Aa Chữ lớn"), ghi nhớ cho lần sau.
- Khi bật: chữ thân bài ≥ 20px, nút ≥ 56px chiều cao, mỗi màn hình chỉ 1 hành động chính, ẩn thông tin phụ.
- Icon luôn đi kèm nhãn chữ; tương phản văn bản tối thiểu 4.5:1 (WCAG 2.2 AA).
- Mỗi bước có một câu hướng dẫn ngắn bằng lời nói đời thường ("Chụp hình chỗ bị hư").
- Bước 2 mặc định "Tôi đang đứng ở chỗ bị hư" (dùng GPS) – không bắt buộc chạm bản đồ.
- Nút "Gọi tổng đài phường" cố định ở chân màn hình **[GIẢ ĐỊNH: số tổng đài do phường cung cấp]**.

### BF-04: Mô tả bằng giọng nói (mở rộng của nhóm)

- Nhấn giữ nút micro để nói mô tả; chuyển thành chữ bằng Web Speech API (tiếng Việt).
- Mức hỗ trợ khác nhau theo trình duyệt **[CẦN KIỂM CHỨNG trên thiết bị demo]**; nếu không hỗ trợ, nút micro tự ẩn và mô tả vẫn là tùy chọn.

### BF-05: Kênh gửi hộ (mở rộng của nhóm)

- Cán bộ (hoặc tổ trưởng khu phố – **[GIẢ ĐỊNH]**) tạo phản ánh thay người dân gọi điện hoặc đến trực tiếp.
- Người được gửi hộ nhận mã phản ánh qua tin nhắn và tra cứu bằng mã + 4 số cuối điện thoại.

---

## 7. Screen Architecture – 13 màn hình

### Người dân – Mobile (390px)

| ID | Màn hình | Đáp ứng | Ghi chú |
|---|---|---|---|
| C01 | Trang chủ | – | Thẻ kêu gọi "Báo sự cố", thẻ "Phản ánh của bạn" có tiến trình, "Quanh đây", số liệu tháng; thanh điều hướng đáy có nút camera nổi |
| C02 | Bước 1 – Chụp ảnh | [ĐỀ] MH1 | Gợi ý AI |
| C03 | Bước 2 – Vị trí | [ĐỀ] MH1 | Fallback nhập địa chỉ |
| C04 | Bước 3 – Loại, xác nhận, gửi | [ĐỀ] MH1 | Cảnh báo trùng, OTP, trạng thái thành công |
| C05 | Phản ánh của tôi | [ĐỀ] MH2 | Tra cứu bằng mã + SĐT; thông báo |
| C06 | Chi tiết phản ánh | [ĐỀ] MH2, MH6 | Timeline, ảnh trước/sau, đánh giá, mở lại |
| C07 | Bản đồ quanh tôi | [ĐỀ] MH3 | Bản đồ / Danh sách |
| C08 | Bảng minh bạch phường | [ĐỀ] "công khai kết quả" | Không cần đăng nhập |

### Cán bộ – Desktop (1440px)

| ID | Màn hình | Đáp ứng |
|---|---|---|
| A01 | Hộp tiếp nhận + KPI | [ĐỀ] MH4 – danh sách |
| A02 | Panel chi tiết: phân loại, giao bộ phận, hạn, giao TNV, gộp trùng | [ĐỀ] MH4 – phân loại, giao, hạn |
| A03 | Cập nhật kết quả + ảnh sau | [ĐỀ] MH5 |

### Tình nguyện viên – Mobile

| ID | Màn hình |
|---|---|
| V01 | Danh sách nhiệm vụ (xác minh / nghiệm thu) |
| V02 | Xác minh tại chỗ – biểu mẫu 3 câu |

### Trạng thái phụ bắt buộc thiết kế

1. GPS bị từ chối → nhập địa chỉ (C03)
2. Mất mạng khi gửi → lưu nháp, gửi lại (C04)
3. Cảnh báo trùng (C04)
4. Gửi thành công kèm mã (C04)
5. Danh sách trống – chưa có phản ánh (C05)
6. Hồ sơ cần bổ sung / đã gộp / chuyển cơ quan khác (C06)
7. Chưa giải quyết → mở lại (C06)
8. Hồ sơ quá hạn và sắp đến hạn (A01)
9. Phiên bản chữ lớn của C01–C06

### Màn hình demo (không tính vào sản phẩm)

**Demo Hub**: một trang chia đôi – khung điện thoại bên trái (người dân / TNV), dashboard cán bộ bên phải, dùng chung dữ liệu. Thao tác ở một bên cập nhật ngay bên kia, giúp giám khảo thấy trọn vòng đời trong một màn hình.

---

## 8. User Flows

### 8.1. Người dân phổ thông – báo ổ gà (mục tiêu < 60 giây)

C01 → "Báo sự cố" → C02 chụp ảnh (AI gợi ý *Mặt đường*) → C03 vị trí GPS, xác nhận → C04 loại đã chọn sẵn → hệ thống kiểm tra trùng (không có) → nhập SĐT + OTP → Gửi → mã TB-0065 → nhận thông báo theo từng mốc → C06 xem ảnh trước/sau → đánh giá.

### 8.2. Người cao tuổi – có hồ sơ trùng

C01 bật "Chữ lớn" → C02 chụp → C03 "Tôi đang đứng ở chỗ bị hư" → C04 thấy "Đã có 2 người báo chỗ này" → "Đúng chỗ này – tôi cũng gặp" → nhập SĐT → kết thúc, nhận thông báo như người gửi.

Biến thể không dùng điện thoại thông minh: gọi tổng đài phường → cán bộ "Tạo phản ánh hộ" ở A01 → ông nhận mã qua tin nhắn.

### 8.3. Cán bộ tiếp nhận

A01 hồ sơ mới lên đầu → mở A02 → kiểm tra ảnh và vị trí → xác nhận loại và bộ phận gợi ý → hạn điền sẵn → (nếu cần) Giao TNV xác minh → sau khi có kết quả xác minh: Giao xử lý → khi đơn vị báo xong: A03 tải ảnh sau, mô tả → Hoàn thành.

Nhánh trùng: A01 huy hiệu "Nghi trùng" → A02 khối "Phản ánh tương tự" → Gộp.

### 8.4. Tình nguyện viên

V01 nhận nhiệm vụ gần nhất → V02 mở chỉ đường → trả lời 3 câu + chụp ảnh → Gửi → nhiệm vụ chuyển "Đã hoàn thành", hồ sơ quay về A02.

Nhánh nghiệm thu: người dân chọn "Chưa giải quyết" ở C06 → V01 xuất hiện nhiệm vụ *Nghiệm thu* → V02 xác nhận hiện trạng → cán bộ quyết định xử lý lại hay đóng.

### 8.5. Người dân gửi ẩn danh – báo rác thải tự phát

C04 → "Gửi không để lại số điện thoại" → đọc cảnh báo → Gửi → màn thành công có mã TB-0066, mã bí mật 4 số, QR → "Lưu link theo dõi" gửi vào Zalo của chính mình → vài ngày sau mở web trên cùng máy: hồ sơ tự hiện trong "Phản ánh của tôi" → thấy phường đã tiếp nhận → bấm "Nhận tin báo cho phản ánh này", để lại SĐT → nhận tin khi xử lý xong → đánh giá.

Phía cán bộ: hồ sơ có nhãn "Ẩn danh", A02 gợi ý "Giao TNV xác minh trước khi xử lý".

---

## 9. Dataset & Demo Data

### 9.1. Số liệu đề bài [ĐỀ]

**Phường Trấn Biên, tháng 11/2026**

| Danh mục | Số lượng |
|---|---:|
| Đèn đường | 18 |
| Ngập nước | 15 |
| Rác thải | 21 |
| Mặt đường | 10 |
| **Tổng** | **64** |
| Đã xử lý | 47 (≈ 73,4%) |
| Chưa hoàn tất | 17 |
| Thời gian xử lý trung bình | 3,2 ngày |

### 9.2. Quy tắc sinh dữ liệu mẫu

- Sinh đúng 64 bản ghi theo số lượng từng loại; đúng 47 bản ghi đã xử lý.
- Thời gian xử lý của 47 bản ghi được sinh sao cho **trung bình cộng đúng 3,2 ngày** (tổng 150,4 ngày); script kiểm tra tự động và thất bại nếu lệch.
- Phân bổ 47 bản ghi đã xử lý và 17 bản ghi chưa hoàn tất giữa 4 loại, cũng như phân bổ 17 bản ghi theo trạng thái nội bộ (Mới, Đã tiếp nhận, Chờ xác minh, Đã giao xử lý) là **[GIẢ ĐỊNH]**, ghi rõ trong tài liệu dữ liệu.
- Tọa độ nằm trong ranh giới phường Trấn Biên, ngày gửi trong tháng 11/2026.
- Có sẵn 2 cụm nghi trùng và 2 hồ sơ quá hạn để demo các trạng thái.
- 6 trong 64 hồ sơ là gửi ẩn danh **[GIẢ ĐỊNH]**, trong đó 1 hồ sơ đã đăng ký nhận tin sau.
- Ảnh minh họa không chứa khuôn mặt hay biển số xe.

### 9.3. Những gì không tự suy ra

Đề không cung cấp: tỷ lệ hài lòng, số hồ sơ quá hạn, thời gian xử lý theo từng loại. Dashboard **không** hiển thị các chỉ số này như số liệu của phường; nếu xuất hiện trong demo (ví dụ điểm đánh giá của vài hồ sơ mẫu), luôn gắn nhãn "Dữ liệu mô phỏng".

---

## 10. UX & Visual Design

### Nguyên tắc

1. **Một màn hình – một việc chính.** Mỗi màn hình mobile có đúng một nút hành động chính.
2. **Trạng thái luôn có câu giải thích và ngày dự kiến**, không để người dân tự đoán.
3. **Không phụ thuộc màu sắc**: mọi trạng thái có icon và nhãn chữ.
4. **Không bắt buộc kỹ năng bản đồ**: luôn có phương án chữ.
5. **Ngôn ngữ đời thường**: "Chỗ bị hư" thay cho "Vị trí sự cố" ở chế độ chữ lớn.

### Hệ thống thị giác

- Màu chủ đạo: xanh teal (tin cậy, dịch vụ công); màu cảnh báo chỉ dùng cho quá hạn và lỗi.
- Bộ màu trạng thái: xám (Chờ tiếp nhận), xanh dương (Đã tiếp nhận), cam (Đang xử lý), xanh lá (Đã xử lý), đỏ (Quá hạn – chỉ cán bộ thấy).
- Font hỗ trợ đầy đủ dấu tiếng Việt (ví dụ Be Vietnam Pro).
- Vùng chạm tối thiểu 44×44px; 56px ở chế độ chữ lớn.

### Kiểm thử nhanh (trước khi nộp)

Nhóm sẽ thử với 5 người (ít nhất 2 người trên 60 tuổi) theo 3 nhiệm vụ: gửi phản ánh, tìm trạng thái hồ sơ, đánh giá. Ghi lại thời gian hoàn thành và chỗ bị vướng; kết quả đưa vào slide thuyết trình như **thử nghiệm sơ bộ**, không phải nghiên cứu người dùng chính thức.

---

## 11. Technical Architecture

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| UI & PWA | React 18 + Vite + Tailwind CSS + Service Worker (`sw.js`, `manifest.webmanifest`) | Tải nhanh (đã tách vendor chunks `react`, `leaflet`, `recharts`, `lucide`), cài được lên màn hình chính điện thoại, lưu nháp ngoại tuyến |
| Điều hướng | React Router | URL riêng cho từng màn hình 3 cổng, có fallback 404 |
| Bản đồ & Định vị | React Leaflet + OpenStreetMap + Geolocation API + Nominatim Reverse Geocoding | Miễn phí, đồng bộ 2 chiều tọa độ GPS ↔ ghim bản đồ ↔ địa chỉ thật |
| Biểu đồ & Báo cáo | Recharts + Xuất CSV (UTF-8 BOM) & In báo cáo PDF | Phục vụ trực tiếp bảng minh bạch công khai và họp giao ban cán bộ |
| Icon | Lucide | Bộ icon đồng nhất, sắc nét |
| Backend API mỏng | **Cloudflare Workers (`api/`)** | Nhẹ, chạy cạnh người dùng, xử lý JWT/RBAC, rate limit, Turnstile Siteverify, Cron SLA, Audit Log và proxy AI không lộ key |
| AI nhận diện ảnh | **Gemini Vision API** (`gemini-flash-lite-latest` → `3.6-flash` → `3.8-flash`) qua `/api/ai/classify` | Phân loại 4 nhóm sự cố từ ảnh thật, tự fallback có nhãn khi offline |
| Dữ liệu & Lưu trữ ảnh | Mock JSON + `localStorage` (local) & sẵn sàng **Cloudflare D1** (`0001_init.sql`) + **Cloudflare R2** (`/api/uploads`) | Chạy tức thì không phụ thuộc hạ tầng và mở rộng sang đồng bộ đa thiết bị thật không cần đổi UI |
| Thông báo đa kênh | Web Push (VAPID + Service Worker) + adapter Zalo ZNS / SMS | Nhắc tiến độ hồ sơ và cảnh báo SLA quá hạn |
| Triển khai | Vercel / Cloudflare Pages (frontend) + Cloudflare Workers (API) | HTTPS bắt buộc cho GPS, Camera, PWA và Web Push |

**Dự phòng mất mạng & WebView:** Service Worker cache app shell, lưu hàng đợi nháp offline, và banner `InAppBrowserBanner` nhắc mở bằng Chrome/Safari khi người dùng bấm link từ Zalo/Facebook.

---

## 12. Scope & Priority

**Cập nhật ngày 25/11/2026 (nhánh `feat/production-p3-p4-p5`):** Đã hoàn thành toàn bộ luồng lõi 3 cổng (P0), các tính năng điểm cộng (B1–B5) và nâng cấp kiến trúc sản phẩm thực tế (P9):

- **Lõi 3 cổng (đã xong):** C01–C09, A01–A03 + Thống kê/Hồ sơ cán bộ, V01–V03 + Thống kê/Hồ sơ TNV; mô hình trạng thái hai lớp, câu "Cập nhật mới nhất", chip "Chậm {n} ngày", thông báo, gửi SĐT/OTP hoặc ẩn danh (link/QR), mở lại hồ sơ + nghiệm thu TNV, dữ liệu mẫu chuẩn 64 / 47 / 3,2 ngày.
- **Bonus B1–B5 (đã xong):** AI nhận diện ảnh thật (Gemini Vision + fallback), cảnh báo & gộp/tách trùng ("Tôi cũng gặp"), 4 mức cỡ chữ, nhập mô tả bằng giọng nói tiếng Việt, tạo phản ánh hộ & tổng đài.
- **Nâng cấp sản phẩm thật P9 (đã xong):** Cloudflare Worker API HTTPS (`tran-bien-ket-noi-api.tran-bien-ket-noi-api.workers.dev`), **Cloudflare D1 4 vai trò (`tran-bien-db`)** đồng bộ 2 chiều (`reports`, `users`, `volunteer_tasks`, `sla_config`, `audit_logs`), **Cổng Quản trị `/admin`** & tách 4 trang web độc lập (`VITE_PORTAL_MODE`), JWT HS256 & RBAC 4 role, **Cloudflare Turnstile thật** + rate limit IP, **thông báo 2 chiều Cán bộ ↔ TNV** (Cán bộ giao xử lý trực tiếp hoặc giao TNV xác minh tùy chọn), gửi Khách/Ẩn danh trực tiếp, Web Push + Cron SLA, Xuất Excel `.xlsx` / CSV / In PDF, PWA cài ứng dụng, đồng bộ GPS ↔ Reverse Geocoding, banner Zalo/FB WebView và hợp nhất bản UI/UX mới nhất (`fc4c476`).

---

## 13. Giả định & Giới hạn phạm vi

1. Đây là mô hình UX đề xuất, không phải quy trình nghiệp vụ chính thức của UBND phường Trấn Biên.
2. Bảng định tuyến bộ phận, hạn xử lý mặc định, ngưỡng nghi trùng (50 m, 14 ngày), thời gian tự đóng hồ sơ (7 ngày) là giả định cấu hình được.
3. OTP, SMS/Zalo, tổng đài được mô phỏng trong demo. Khi triển khai thật, hướng xác thực đề xuất là tích hợp đăng nhập VNeID; prototype không làm phần này.
6. Phản ánh "máy tự nhớ" lưu trên trình duyệt; xoá dữ liệu trình duyệt hoặc đổi máy sẽ mất, nên luôn có link theo dõi và mã bí mật làm dự phòng.
4. Tính năng AI chỉ được gọi là "hoạt động" khi đạt điều kiện ở BF-01.
5. Dữ liệu cá nhân người gửi không bao giờ hiển thị công khai.

### Cần kiểm chứng trước vòng thuyết trình

- [ ] Cài Dong Nai City, ghi lại các bước phản ánh hiện có và những gì người dân thấy sau khi gửi.
- [ ] Đối chiếu thể lệ BTC: định dạng nộp, có yêu cầu Figma không, thời lượng demo.
- [ ] Thử Web Speech API tiếng Việt trên điện thoại sẽ dùng khi demo.

---

## 14. Điểm khác biệt

| Phổ biến (đội nào cũng có) | Khác biệt của Trấn Biên Kết Nối |
|---|---|
| Gửi 3 bước, bản đồ, trạng thái, đánh giá sao | **Vòng phản hồi khép kín**: thông báo từng mốc + ảnh trước/sau + mở lại khi chưa giải quyết |
| Cảnh báo trùng | **"Tôi cũng gặp" = cùng theo dõi**, số người cùng báo đẩy ưu tiên; cán bộ gộp/tách thật |
| Nút chữ lớn | **Tiếp cận đa kênh**: chữ lớn + giọng nói + không cần tài khoản + gửi ẩn danh + gửi hộ qua tổng đài |
| TNV xác minh | **TNV nghiệm thu độc lập** kết quả xử lý |
| Dashboard thống kê | **Bảng minh bạch công khai** cho mọi người dân |

---

## 15. Kịch bản demo – 5 phút

| Thời gian | Nội dung | Màn hình |
|---|---|---|
| 0:00–0:30 | Vấn đề: ông Tư thấy ổ gà, không biết báo ai; báo rồi không biết có ai xử lý | Slide |
| 0:30–1:30 | Ông Tư bật chữ lớn, chụp ảnh, AI gợi ý Mặt đường, GPS, hệ thống báo "đã có người báo chỗ này" → "Tôi cũng gặp" | Demo Hub – trái |
| 1:30–2:30 | Anh Minh thấy hồ sơ có 3 người cùng báo lên đầu danh sách, bộ phận và hạn điền sẵn, giao TNV | Demo Hub – phải |
| 2:30–3:00 | Bạn Vy xác minh 3 câu, chụp ảnh | Demo Hub – trái (chế độ TNV) |
| 3:00–3:45 | Anh Minh tải ảnh sau, hoàn thành → điện thoại ông Tư nhận thông báo, xem ảnh trước/sau | Hai bên cùng lúc |
| 3:45–4:20 | Ông Tư chọn "Chưa giải quyết" → hồ sơ mở lại, sinh nhiệm vụ nghiệm thu | Hai bên |
| 4:20–4:45 | Bảng minh bạch phường: 64 / 47 / 3,2 ngày | C08 |
| 4:45–5:00 | Thông điệp: "Một phản ánh – Một hành trình minh bạch." | Slide |

---

## 16. Câu hỏi giám khảo dự kiến

| Câu hỏi | Hướng trả lời |
|---|---|
| Khác gì Dong Nai City? | Không thay thế; tập trung vòng đời cấp phường, khép kín phản hồi và tiếp cận người cao tuổi; có thể tích hợp như phân hệ. Trả lời bằng kết quả đã tự đối chiếu ứng dụng. |
| Người không có smartphone thì sao? | Tổng đài + cán bộ tạo hộ + tra cứu bằng mã qua tin nhắn. |
| Chống spam, báo sai thế nào? | Mặc định xác thực SĐT bằng OTP; gửi ẩn danh giới hạn số lượng mỗi thiết bị, gắn nhãn cho cán bộ và ưu tiên TNV xác minh; cán bộ duyệt ảnh trước khi công khai. |
| Gửi ẩn danh thì làm sao biết kết quả? | Máy tự nhớ phản ánh, link theo dõi/QR, tra cứu bằng mã bí mật, xem công khai trên bản đồ; muốn nhận tin thì đăng ký SĐT cho riêng hồ sơ đó bất cứ lúc nào. |
| Triển khai thật xác thực thế nào? | Hướng tích hợp VNeID; prototype dùng OTP mô phỏng. |
| Ai chịu trách nhiệm khi gộp nhầm? | Hệ thống chỉ gợi ý; cán bộ gộp và tách được; mọi thao tác có lịch sử. |
| AI có chạy thật không? Sai thì sao? | Nêu đúng mức đang có; AI chỉ chọn sẵn, người dùng luôn sửa; dưới ngưỡng tin cậy thì không gợi ý. |
| Hạn xử lý lấy từ đâu? | Giả định cấu hình được, không suy từ 3,2 ngày; phường tự đặt theo quy định. |
| Dữ liệu 3,2 ngày có khớp mock không? | Có, script kiểm tra trung bình 47 hồ sơ = 3,2 ngày. |
| Đã thử với người dùng chưa? | Trình bày kết quả thử nghiệm sơ bộ 5 người (nếu đã làm), nói rõ quy mô nhỏ. |
| Tình nguyện viên lấy động lực từ đâu? | Gắn với hoạt động Đoàn; ghi nhận số nhiệm vụ hoàn thành **[GIẢ ĐỊNH]**. |
| Bảo vệ quyền riêng tư người gửi? | Không công khai tên, SĐT; có chế độ gửi ẩn danh; ảnh được duyệt; vị trí là vị trí sự cố, không phải nhà người gửi. |

---

## 17. Rủi ro & Phương án

| Rủi ro | Phương án |
|---|---|
| Thiếu thời gian | Chốt P0; Demo Hub là ưu tiên số 1 |
| GPS bị từ chối khi demo | Nhập địa chỉ; dữ liệu demo có vị trí đặt sẵn |
| Mất mạng / bản đồ không tải | Cache tile trước; chuyển chế độ danh sách; video dự phòng |
| Mock data lệch số liệu đề | Script kiểm tra 64 / 18 / 15 / 21 / 10 / 47 / 3,2 chạy trước mỗi lần deploy |
| AI không kịp | Dùng Mức 1, ghi rõ "Mô phỏng" |
| Gộp nhầm hồ sơ | Chỉ cán bộ gộp; có chức năng tách |
| Lộ thông tin cá nhân | Tách trường công khai / nội bộ ngay trong cấu trúc dữ liệu |
| Web Speech không hỗ trợ trên máy demo | Ẩn nút micro; giọng nói là tùy chọn |

---

## 18. Deliverables

- Proposal v2.0 (tài liệu này).
- Web prototype deploy trên Vercel: 13 màn hình + trạng thái phụ + Demo Hub.
- Bộ dữ liệu mẫu JSON và script kiểm tra số liệu.
- Sơ đồ user flow 3 vai trò và sơ đồ vòng đời trạng thái.
- Slide thuyết trình + video demo dự phòng.
- File Figma bộ màn hình tĩnh (nếu BTC yêu cầu).

Định dạng nộp cuối cùng theo thể lệ chính thức của BTC.

---

## 19. Success Criteria

1. Đủ 6 màn hình bắt buộc và cả 3 nhóm người dùng có luồng riêng.
2. Đủ 3 điểm cộng của đề, công bố trung thực mức độ hoàn thiện.
3. Một vòng đời phản ánh chạy trọn trên bản deploy, không có bước cụt.
4. Mọi số liệu dashboard khớp đề bài.
5. Người dân luôn biết: hồ sơ đang ở đâu, ai xử lý, khi nào xong.
6. Người trên 60 tuổi gửi được phản ánh ở chế độ chữ lớn không cần hướng dẫn (đo trong thử nghiệm sơ bộ).

---

## 20. References

- Đại biểu Nhân dân – TP. Đồng Nai xây dựng đô thị thông minh từ các nền tảng số (nền tảng Công dân số Đồng Nai – Dong Nai City): https://daibieunhandan.vn/tp-dong-nai-xay-dung-do-thi-thong-minh-tu-cac-nen-tang-so-10430793.html
- Tuổi Trẻ – Siêu phường Trấn Biên ở Đồng Nai đã sẵn sàng hoạt động: https://tuoitre.vn/thanh-pho-bien-hoa.html
- Tuổi Trẻ – Đồng Nai chính thức lên thành phố: https://tuoitre.vn/dong-nai-chinh-thuc-len-thanh-pho-khai-thac-loi-the-tu-song-tang-ket-noi-voi-tp-hcm-20260424100820764.htm
- Cổng thông tin phường Trấn Biên: https://tranbien.dongnai.gov.vn
- React Leaflet: https://react-leaflet.js.org
- OpenStreetMap Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- html.to.design: https://html.to.design/docs

**End of Proposal – v2.1**
