# PROJECT PROPOSAL
## TRẤN BIÊN KẾT NỐI
**Một phản ánh – Một hành trình minh bạch**

**Cuộc thi:** Đồng Nai Hackathon 2026  
**Đề bài:** Đề 2 – Phản ánh hiện trường (Chính quyền số – Đô thị thông minh)  
**Phạm vi:** Sản phẩm hoàn chỉnh – Kiến trúc Client-Server & Cơ sở dữ liệu PostGIS (Giai đoạn 2)  
**Phiên bản:** v3.0 – Sản phẩm hoàn chỉnh có backend, cơ sở dữ liệu quan hệ và bảo mật đa tầng  
**Ngày phát hành:** 25/11/2026

---

## Bảng thay đổi so với v2.1

| Hạng mục | v2.1 (Prototype Giai đoạn 1 - 24/11) | v3.0 (Sản phẩm Giai đoạn 2 - 25/11) | Lý do thay đổi |
|---|---|---|---|
| **Kiến trúc hệ thống** | Client-only SPA, dữ liệu lưu trong memory và `localStorage` | Client-Server hoàn chỉnh: SPA React + Vercel Functions (Hono TypeScript) + Supabase (PostgreSQL 15+, PostGIS, Auth, Storage) | Chuyển từ bản trình diễn giao diện sang sản phẩm phần mềm thực thụ có lưu trữ và bảo mật tập trung |
| **Quản trị người dùng & Phân quyền** | Chuyển đổi vai trò giả định trên giao diện qua thanh điều hướng / Demo Hub | 3 nhóm người dùng rõ ràng: Người dân (không cần tài khoản / xác thực OTP), Cán bộ và TNV (tài khoản Supabase Auth thật). Phân quyền kiểm soát chặt chẽ ở tầng API | Không cho phép đổi vai trò tuỳ tiện ở chế độ thật; đảm bảo an toàn dữ liệu công quyền |
| **Quản trị hệ thống** | Ban đầu dự kiến trang Admin giao diện web | Không làm trang Admin giao diện; chuyển sang vận hành tự động bằng CLI Scripts (`staff:*`, `config:*`, `demo:*`) | Tối ưu hóa nguồn lực, tập trung vào nghiệp vụ cốt lõi, giảm bề mặt tấn công |
| **Lưu trữ dữ liệu & Ảnh hiện trường** | Mock JSON + nén ảnh base64 lưu tạm trong trình duyệt | PostgreSQL + PostGIS (truy vấn không gian, trigger bất biến timeline, RLS toàn bảng) + Storage bucket riêng tư (URL ký có hạn 1 giờ) | Tránh tràn bộ nhớ client; hỗ trợ tải ảnh thật và định vị địa lý chính xác |
| **Bảo mật danh tính & SĐT** | Mã hoá lỏng lẻo phía client | Server hash bảo vệ `secretCode` và `ownerToken` với pepper (`OWNER_KEY_PEPPER`); SĐT luôn che mặt nạ (`0909 *** 068`) trên mọi API công khai/TNV; chống dò brute-force | Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân |
| **Chế độ dữ liệu (Dual-mode)** | Chỉ có 1 chế độ localStorage | Hai chế độ: `VITE_DATA_SOURCE=local` (giữ nguyên v2.1 nộp 24/11) và `VITE_DATA_SOURCE=api` (kết nối backend Supabase thực tế) | Đảm bảo tính liên tục của bản demo dự phòng khi mất kết nối mạng và khả năng vận hành trực tiếp trên cloud |
| **Dịch vụ tích hợp ngoài (OTP, AI)** | Giả định hoàn toàn | Kiến trúc Plug-and-Play: OTP và AI vẫn **mô phỏng** có nhãn minh bạch trên UI, đồng thời cung cấp sẵn Interface chuẩn để cắm nhà cung cấp thật (Zalo ZNS, Twilio, Gemini Vision) khi được duyệt | Minh bạch về mặt công nghệ, tránh quảng cáo sai sự thật |

---

## 0. Quy ước đọc tài liệu

Mỗi nội dung trong proposal được gắn một trong ba nhãn:

| Nhãn | Ý nghĩa |
|---|---|
| **[ĐỀ]** | Yêu cầu hoặc số liệu do BTC cung cấp trong đề bài cuộc thi |
| **[THỰC HIỆN G2]** | Chức năng chạy thật trên backend và cơ sở dữ liệu giai đoạn 2 |
| **[MÔ PHỎNG]** | Dịch vụ được mô phỏng có kiểm soát và gắn nhãn rõ ràng trên UI (OTP demo `123456`, AI theo manifest, SMS giả lập) |

---

## 1. Executive Summary

Người dân phường Trấn Biên gặp đèn đường hỏng, ngập nước, rác thải tự phát, mặt đường hư hỏng nhưng không biết báo ai, và báo xong không biết đã được xử lý chưa **[ĐỀ]**. Vấn đề cốt lõi không nằm ở việc *gửi* phản ánh, mà ở **vòng phản hồi bị đứt**: người dân không thấy hồ sơ của mình đi đến đâu, ai đang xử lý, và kết quả có thật không.

Trấn Biên Kết Nối giai đoạn 2 thiết kế và vận hành trọn vẹn vòng đời một phản ánh với hạ tầng kỹ thuật thực tế:

1. **Gửi trong 3 bước linh hoạt** – Chụp ảnh, ghim vị trí, chọn loại. Không cần tạo tài khoản; hỗ trợ gửi kèm SĐT nhận tin hoặc gửi ẩn danh với mã bí mật tự quản lý.
2. **Định tuyến & Giám sát SLA phía Server** – Hệ thống tự động gán bộ phận, tính toán hạn xử lý theo loại sự cố; cán bộ tiếp nhận duyệt và theo dõi trạng thái quá hạn tức thời qua cơ sở dữ liệu quan hệ.
3. **Xác minh & Nghiệm thu độc lập** – Tình nguyện viên nhận nhiệm vụ tại hiện trường qua thiết bị di động, chụp ảnh xác minh thực địa và nghiệm thu khi người dân báo "chưa giải quyết".
4. **Công khai kết quả & Minh bạch tuyệt đối** – Bảng minh bạch phường và ảnh Trước/Sau công khai cho toàn thể nhân dân, không thể can thiệp lịch sử xử lý nhờ ràng buộc trigger cơ sở dữ liệu không thể sửa/xoá.
5. **Tiếp cận toàn dân (Inclusivity)** – Chế độ chữ lớn cho người cao tuổi, mô tả bằng giọng nói, kênh tiếp nhận hộ từ cán bộ cơ sở cho người không có điện thoại thông minh.

### Định vị

Trấn Biên Kết Nối là giải pháp chuyên sâu cho **quy trình vận hành và tương tác cấp cơ sở (xã/phường)**, có khả năng vận hành độc lập hoặc tích hợp liền mạch như một phân hệ tiếp nhận hiện trường của nền tảng Công dân số Đồng Nai (Dong Nai City).

---

## 2. Bài toán và 3 nhóm người dùng

Hệ thống thiết lập ranh giới phân quyền rõ ràng trên 3 nhóm người dùng chính thức (không có vai trò quản trị chung):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        3 NHÓM NGƯỜI DÙNG CHÍNH THỨC                   │
├──────────────────────────┬──────────────────────┬──────────────────────┤
│ 1. NGƯỜI DÂN             │ 2. CÁN BỘ PHƯỜNG     │ 3. TÌNH NGUYỆN VIÊN  │
│ - Không cần tài khoản    │ - Tài khoản xác thực │ - Tài khoản xác thực │
│ - Gửi sự cố & vị trí     │ - Tiếp nhận hồ sơ    │ - Nhận nhiệm vụ gần  │
│ - Tra cứu theo SĐT/Mã    │ - Giao việc bộ phận  │ - Xác minh tại chỗ   │
│ - Đánh giá kết quả       │ - Cập nhật kết quả   │ - Nghiệm thu kết quả │
│ - Mobile (360-430px)     │ - Desktop (≥1024px)  │ - Mobile (360-430px) │
└──────────────────────────┴──────────────────────┴──────────────────────┘
```

### 2.1. Bối cảnh địa bàn

- Phường Trấn Biên là đô thị trung tâm TP. Đồng Nai, hợp nhất từ các phường Bửu Long, Quang Vinh, Trung Dũng, Thống Nhất, Hiệp Hòa và An Bình, quy mô khoảng 200.000 dân.
- Tháng 11/2026, phường ghi nhận 64 phản ánh **[ĐỀ]** (18 Đèn đường, 15 Ngập nước, 21 Rác thải, 10 Mặt đường). 47 hồ sơ đã xử lý, thời gian xử lý trung bình đạt 3,2 ngày.

### 2.2. Nhu cầu then chốt theo nhóm người dùng

| Nhóm người dùng | Mục tiêu nghiệp vụ | Trải nghiệm then chốt |
|---|---|---|
| **Người dân** | Báo sự cố dưới 60 giây, biết chắc phường đã nhận và giải quyết thật | Gửi không cần đăng nhập; thông báo qua SMS/tra cứu nhanh; đối chiếu ảnh Trước/Sau; có quyền bấm "Chưa giải quyết" để mở lại hồ sơ |
| **Cán bộ tiếp nhận** | Phân loại chính xác, không trễ hạn, không bỏ sót | Hộp thư tiếp nhận ưu tiên theo hạn xử lý; hệ thống gợi ý bộ phận phụ trách; phát hiện và gộp hồ sơ trùng tự động; hỗ trợ tạo hồ sơ gửi hộ |
| **Tình nguyện viên** | Hỗ trợ xác minh nhanh chóng, độc lập, có bằng chứng | Nhận nhiệm vụ theo khoảng cách GPS; bảng hỏi 3 câu chuẩn hóa kèm ảnh chụp hiện trường; không can thiệp sâu vào quyết định hành chính |

---

## 3. Kiến trúc kỹ thuật giai đoạn 2

Hệ thống được xây dựng theo kiến trúc Client-Server hiện đại, chia tách rõ ràng giữa giao diện người dùng, tầng API trung gian và nền tảng dữ liệu tập trung:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 TRÌNH DUYỆT NGƯỜI DÙNG                  │
                  │   (React SPA, Tailwind CSS, Vite, PWA-ready on Vercel)  │
                  └──────────────┬────────────────────────────┬─────────────┘
                                 │                            │
             [Chế độ API]        │                            │  [Chế độ Local Demo]
            HTTPS + Bearer JWT   │                            │  Offline LocalStorage
                                 ▼                            ▼
                  ┌───────────────────────────────┐     ┌───────────────────┐
                  │        VERCEL FUNCTION        │     │  LocalDataSource  │
                  │   api/[...path].ts (Hono TS)  │     │  (In-Memory Store │
                  ├───────────────────────────────┤     │  & mock.json)     │
                  │ - Middleware: Auth, Role,     │     └───────────────────┘
                  │   RateLimit, Idempotency, Zod │
                  │ - Routes: /public, /citizen,  │
                  │   /officer, /volunteer, /cron │
                  │ - Domain logic: Transition,   │
                  │   SLA, KPI, Duplicates        │
                  │ - Pluggable Providers:        │
                  │   OtpProvider, NotifyProvider │
                  └──────────────┬────────────────┘
                                 │ Drizzle ORM (postgres pooler)
                                 ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                  NỀN TẢNG SUPABASE                      │
                  ├─────────────────────────────────────────────────────────┤
                  │ 1. PostgreSQL 15+ & PostGIS:                            │
                  │    - Geometry Point(4326), GiST index                   │
                  │    - Trigger bất biến: report_timeline không sửa/xoá   │
                  │    - RLS bảo vệ toàn diện (không mở anon/auth policy)   │
                  │    - Transaction FOR UPDATE chống race-condition        │
                  │ 2. Supabase Auth:                                       │
                  │    - Tài khoản Cán bộ & TNV (Email + Password)         │
                  │ 3. Supabase Storage (report-photos):                    │
                  │    - Bucket riêng tư (Private)                          │
                  │    - URL ký (Signed URL) có thời hạn 1 giờ              │
                  └─────────────────────────────────────────────────────────┘
```

### Nguyên tắc kiến trúc bất di bất dịch

1. **Server là nơi duy nhất quyết định:** Mọi chuyển đổi trạng thái, phân quyền, kiểm tra hạn SLA, tính toán trùng lặp không gian và xác thực ảnh đều được thực thi tại server. Client chỉ phản ánh trạng thái dữ liệu.
2. **src/domain là nguồn sự thật dùng chung:** Các luật nghiệp vụ (`status.ts`, `kpi.ts`, `duplicates.ts`, `geo.ts`, `format.ts`) được dùng chung trực tiếp giữa Client và Server, không sao chép trùng lặp mã nguồn.
3. **Serializer công khai duy nhất (`toPublicReport`):** Mọi phản hồi API trả về cho công chúng hoặc người dùng không phải chủ sở hữu đều đi qua bộ lọc serializer để loại bỏ hoàn toàn thông tin nhạy cảm.
4. **Tính toàn vẹn dữ liệu giao dịch:** Mọi cập nhật trạng thái hồ sơ phải chạy trong Database Transaction có khoá dòng (`FOR UPDATE`) để ngăn ngừa tranh chấp dữ liệu khi nhiều cán bộ cùng thao tác.

---

## 4. Cái gì Thật và Cái gì Mô phỏng

Để đảm bảo tính trung thực kỹ thuật tuyệt đối trước hội đồng giám khảo, toàn bộ các thành phần trong hệ thống được phân định rõ ràng:

| Thành phần | Trạng thái kỹ thuật | Chi tiết hiện thực |
|---|---|---|
| **Cơ sở dữ liệu & Không gian** | **THẬT 100%** | PostgreSQL 15+ tích hợp PostGIS, lưu trữ toạ độ chuẩn EPSG:4326, truy vấn bán kính trùng lặp bằng ST_DWithin trên GiST index |
| **API Backend & Phân quyền** | **THẬT 100%** | Hono REST API kiểm soát JWT Supabase Auth cho cán bộ/TNV, JWT 30 ngày cho người dân, chặn 401/403/409/422/429 đúng chuẩn |
| **Lưu trữ ảnh hiện trường** | **THẬT 100%** | Upload ảnh thật lên Supabase Storage qua URL ký có hạn, xác minh magic bytes phía server |
| **Tính toán KPI & Minh bạch** | **THẬT 100%** | Tính toán động từ dữ liệu thực tế bằng SQL / domain logic; không hard-code bất kỳ con số nào |
| **Xác thực OTP Người dân** | **MÔ PHỎNG** | Mã OTP cố định `123456`, hạn 5 phút, khoá sau 5 lần nhập sai. Gắn nhãn "Mô phỏng" rõ ràng trên UI |
| **Gửi tin nhắn SMS / Zalo** | **MÔ PHỎNG** | Lưu nội dung vào bảng `notifications` với kênh `sms_mo_phong`. Xem trước tin nhắn SMS mô phỏng trên giao diện |
| **AI nhận diện ảnh sự cố** | **MÔ PHỎNG** | Nhận diện dựa trên bảng ánh xạ đặc trưng ảnh mẫu có sẵn, luôn gắn nhãn "Gợi ý mô phỏng" và cho phép người dùng tự do sửa đổi |

---

## 5. Bảo mật dữ liệu & Quyền riêng tư cá nhân

Tuân thủ nghiêm ngặt tinh thần Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân trong môi trường số:

1. **Che giấu số điện thoại tuyệt đối:**
   - Số điện thoại người dân chỉ lưu trữ trong bảng nghiệp vụ an toàn.
   - Khi trả về qua API công khai hoặc API dành cho Tình nguyện viên, số điện thoại luôn bị che: `0909 *** 068`.
   - Cán bộ tiếp nhận chỉ thấy số điện thoại đã che mặt nạ trên màn hình A02 để bảo đảm quyền riêng tư, trừ khi có nghiệp vụ liên lạc khẩn cấp được ghi nhật ký truy cập.
2. **Bảo vệ hồ sơ ẩn danh:**
   - Người dân có quyền gửi phản ánh hoàn toàn ẩn danh (`anonymous = true`).
   - Cấp một **Mã bí mật 4 chữ số** (`secretCode`) và một chuỗi **Khóa chủ quyền 256-bit** (`ownerToken`).
   - Cả hai giá trị trên được băm mật mã (SHA-256) kèm muối và tiêu bảo mật (`OWNER_KEY_PEPPER`) trước khi lưu vào DB. Server không lưu chuỗi thô.
   - Giữ nguyên trạng thái `anonymous: true` vĩnh viễn trong cơ sở dữ liệu kể cả khi người dân sau đó quyết định đăng ký nhận tin nhắn thông báo.
3. **Chống tấn công dò mã (Anti-Brute-Force & Quota):**
   - Giới hạn tra cứu mã bí mật: Tối đa 5 lần thử sai trong 15 phút trên mỗi địa chỉ IP (khoá tạm thời), tối đa 30 lần trong 24 giờ.
   - Hạn mức gửi phản ánh ẩn danh: Tối đa 5 hồ sơ/ngày trên một thiết bị và tối đa 20 hồ sơ/ngày trên một địa chỉ IP nhằm ngăn ngừa hành vi spam phá hoại hệ thống.
4. **Không rò rỉ khóa bí mật:**
   - Tuyệt đối không commit file `.env.local` hoặc khóa `SUPABASE_SERVICE_ROLE_KEY` vào mã nguồn Git hay bundle client.

---

## 6. Vận hành hệ thống bằng Script tự động

Không triển khai giao diện quản trị cồng kềnh, hệ thống áp dụng mô hình vận hành hiện đại thông qua bộ CLI Scripts được chuẩn hóa, giúp kỹ thuật viên dễ dàng triển khai và kiểm soát:

```
npm run staff:create -- --email=cb@tranbien.vn --name="Nguyễn Văn Minh" --role=can_bo
npm run staff:disable -- --email=cb@tranbien.vn
npm run staff:enable -- --email=cb@tranbien.vn
npm run staff:reset-password -- --email=cb@tranbien.vn --password=...
npm run staff:list
npm run config:set-sla -- --category=den_duong --days=3
npm run demo:reset
npm run demo:clock -- --set="2026-11-24T09:00:00+07:00"
```

Toàn bộ thao tác can thiệp quản trị đều được kiểm tra điều kiện an toàn (ví dụ: các lệnh demo bị từ chối tuyệt đối khi cờ `DEMO_MODE` tắt trên production).

---

## 7. Chế độ Hoạt động Kép (Dual-Mode Architecture)

Nhằm đảm bảo sản phẩm luôn sẵn sàng trình diễn trong mọi hoàn cảnh thực tế của cuộc thi và vận hành thực địa:

1. **Chế độ Ngoại tuyến (Local Mode - `VITE_DATA_SOURCE=local`):**
   - Khởi chạy hoàn toàn độc lập, sử dụng dữ liệu từ `mock.json` và lưu trữ cục bộ `localStorage`.
   - Giữ nguyên vẹn 100% trải nghiệm và các chỉ số đo lường đã hoàn thành tại Giai đoạn 1 (24/11).
   - Đảm bảo ban giám khảo có thể xem bài thi mượt mà ngay cả khi hội trường thi đấu bị mất kết nối Internet.
2. **Chế độ Đám mây (API Mode - `VITE_DATA_SOURCE=api`):**
   - Kết nối trực tiếp tới REST API serverless trên Vercel và hệ quản trị cơ sở dữ liệu Supabase.
   - Cho phép nhiều thiết bị thật (điện thoại người dân, laptop cán bộ, máy tính bảng TNV) tương tác thời gian thực với nhau.
   - Dữ liệu đồng bộ tập trung, hỗ trợ tải ảnh thật lên đám mây và xử lý hàng trăm yêu cầu đồng thời.

---

## 8. Lộ trình tích hợp Dịch vụ Thực tế (Post-Hackathon)

Hệ thống được thiết kế với tính mở cao, sẵn sàng chuyển đổi từ mô phỏng sang thực tế chỉ qua việc bổ sung nhà cung cấp dịch vụ mà không cần tái cấu trúc mã nguồn:

1. **Tích hợp SMS / Zalo ZNS Thật:**
   - Hiện thực hóa class `RealZaloZnsOtpProvider` và `RealZaloNotificationChannel` kế thừa interface chuẩn.
   - Thay đổi biến môi trường `OTP_PROVIDER=zalo_zns` và `SMS_PROVIDER=zalo_zns`.
   - Chi phí ước tính: 200 - 300 VNĐ / tin thông báo ZNS chăm sóc khách hàng.
2. **Tích hợp Trí tuệ Nhân tạo Phân loại Hiện trường (AI Real):**
   - Kết nối API Gemini 1.5 Flash hoặc Cloud Vision API qua Vercel Function bí mật phía server.
   - Huấn luyện nhẹ (few-shot prompting) với tập dữ liệu đặc trưng đô thị Việt Nam (ổ gà, nắp cống hỏng, rác thải vỉa hè).
3. **Đăng nhập Định danh Điện tử VNeID:**
   - Tích hợp cổng OpenID Connect của VNeID cho vai trò Người dân khi UBND tỉnh Đồng Nai cấp quyền kết nối API chính thống.

---

## 9. Phân tích Rủi ro & Giải pháp Kiểm soát

| Rủi ro kỹ thuật | Mức độ | Giải pháp kiểm soát |
|---|---|---|
| **Cold Start của Serverless Function** | Trung bình | Gom toàn bộ API vào 1 endpoint Hono duy nhất (`api/[...path].ts`) thay vì hàng chục hàm riêng lẻ, giúp giữ ấm container và giảm độ trễ dưới 200ms |
| **Xung đột ghi đè khi xử lý đồng thời** | Cao | Áp dụng Database Transaction với cơ chế khóa bi quan (`FOR UPDATE`) và kiểm tra tính hợp lệ của chuyển trạng thái (`canTransition`) trước khi ghi |
| **Lạm dụng gửi ẩn danh gây nghẽn rác dữ liệu** | Cao | Giới hạn 5 hồ sơ/ngày/thiết bị và 20 hồ sơ/ngày/IP; phân loại hồ sơ ẩn danh vào luồng cần TNV xác minh thực địa trước khi cán bộ duyệt giao việc |
| **Lệch múi giờ và mốc thời gian** | Thấp | Toàn bộ cơ sở dữ liệu lưu chuẩn UTC `timestamptz`; định dạng hiển thị duy nhất `+07:00` tại tầng chuyển đổi dữ liệu |
| **Lộ khóa bảo mật trên mã nguồn Client** | Nghiêm trọng | Phân tách ranh giới biến môi trường rõ ràng; chặn CI/CD tự động quét kiểm tra `SUPABASE_SERVICE_ROLE_KEY` trong thư mục `dist/` |

---

## 10. Kết luận

Trấn Biên Kết Nối v3.0 là bước chuyển mình từ một ý tưởng thiết kế giao diện sang một **sản phẩm chuyển đổi số đô thị hoàn chỉnh, an toàn, có khả năng triển khai thực tiễn ngay tại UBND phường Trấn Biên**. Với nền tảng kiến trúc vững chắc, tôn trọng quyền riêng tư cá nhân và cam kết minh bạch tối đa, sản phẩm thể hiện trọn vẹn tinh thần: **"Một phản ánh – Một hành trình minh bạch"**.
