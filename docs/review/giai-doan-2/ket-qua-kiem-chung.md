# Kết quả kiểm chứng tổng

Chạy ngày 25/11/2026 trên máy của chủ dự án (macOS, Docker Desktop, Supabase CLI 2.1.1, Node v24.22.1). Nhánh `feat/giai-doan-2`.
Mọi số liệu dưới đây là output thật của lệnh; không có số nào lấy từ báo cáo cũ.

## Tóm tắt

| Lệnh | Giờ chạy | Kết quả |
|---|---|---|
| `cd app && npm run lint` | 15:44 | ESLint 0 lỗi, Prettier "All matched files use Prettier code style!" |
| `cd app && npm run build` | 15:44 | `tsc --noEmit` 0 lỗi, `vite build` thành công ("built in 1.55s"), cảnh báo chunk > 500 kB |
| `cd app && npx vitest run` | 15:44 | **49 file, 303 test, 303 pass, 0 fail** |
| `npm run verify` (gốc repo: lint + tsc + test + mock:verify) | 16:23 | exit 0; 49 file, **303/303 pass**; mock:verify 100% |
| `cd app && npm run db:verify` | 16:43 | **17/17 đạt** (Supabase local, cổng 54322) |
| `cd app && npm run mock:verify` | 15:44 | "TOÀN BỘ BẤT BIẾN DỮ LIỆU ĐÃ ĐƯỢC XÁC THỰC THÀNH CÔNG (100% PASS)" |
| `cd app && npm run test:e2e:api` (Playwright, chế độ API) | 16:31 | **7/7 pass** (53,6 giây) |
| `cd app && npx playwright test` (e2e Giai đoạn 1) | 16:00 | project Desktop **5/5 pass** khi chạy tuần tự; project Mobile **không chạy được** (xem mục 3) |

## 1. Vitest và verify

```
 Test Files  49 passed (49)
      Tests  303 passed (303)
   Duration  145.09s
```

Gồm 11 file test API chạy trên PostGIS và Supabase Auth thật (89 test: auth, đăng nhập, TNV, cán bộ, chủ hồ sơ, PostGIS, chuyển trạng thái và đồng thời, KPI, rò rỉ, hợp đồng route).

Lưu ý khi chạy: lần chạy `npm run verify` đầu tiên (16:14) có 1 file fail (`routes-spec-conform`: OTP request trả 500 ở `beforeAll`) và lần trước đó 16 test timeout 5 giây; lúc đó máy quá tải (load average 38–43 do Docker, Chrome, Kiro và các ứng dụng khác). Chạy riêng các file đó đều đạt (3/3 lần), và lần chạy lại lúc load giảm (19) đạt toàn bộ. Tôi nâng `testTimeout` lên 15 giây và `hookTimeout` lên 30 giây trong `vite.config.ts`. Không sửa logic test hay bỏ test nào. Nếu chạy `npm run verify` khi máy bận có thể vẫn gặp lỗi 500/timeout ngắt quãng ở test cần DB.

## 2. db:verify (16:43, sau `npm run demo:reset`)

```
Kết nối DB: postgresql://postgres:***@127.0.0.1:54322/postgres
✅ PASS [DV-001] 64 hồ sơ tháng 11/2026 (is_seed = true)
✅ PASS [DV-002] Theo loại: 18 Đèn đường / 15 Ngập nước / 21 Rác thải / 10 Mặt đường
✅ PASS [DV-003] Đã xử lý 47, chưa hoàn tất 17
✅ PASS [DV-004] Trung bình xử lý = 3,2 ngày (sai số ≤ 0,005)
✅ PASS [DV-005] Đã xử lý: 40 đóng, 7 hoàn thành
✅ PASS [DV-006] 17 hồ sơ chưa hoàn tất đúng phân bổ (4/4/3/4/1/1)
✅ PASS [DV-007] Đúng 2 hồ sơ da_giao quá hạn tại DEMO_NOW
✅ PASS [DV-008] Đúng 6 hồ sơ ẩn danh, SĐT null, 1 có subscribed_later
✅ PASS [DV-009] Cụm phản ánh nghi trùng lặp được gắn cờ
✅ PASS [DV-010] Hồ sơ demo mat_duong da_tiep_nhan có >= 2 followers
✅ PASS [DV-011] Mọi hồ sơ có secret_code_hash an toàn
✅ PASS [DV-012] Đúng 4 volunteer tasks trong cơ sở dữ liệu
✅ PASS [DV-013] 64 hồ sơ đều có timeline ghi nhận các bước
✅ PASS [DV-014] Các mốc timeline cán bộ/bộ phận rơi vào giờ hành chính (07:00–17:30)
✅ PASS [DV-015] Trigger chặn UPDATE/DELETE trên report_timeline
✅ PASS [DV-016] RLS được kích hoạt trên 100% bảng public
✅ PASS [DV-017] PostGIS thật: postgis_version(), cột location geography(Point,4326), index GIST
🎉 TOÀN BỘ 17 KIỂM TRA CƠ SỞ DỮ LIỆU ĐỀU ĐẠT CHUẨN!
```

## 3. Playwright

**E2E chế độ API** (`npm run test:e2e:api`, Google Chrome có sẵn vì không tải được Chromium của Playwright):

```
  ✓  1 … 01 Người dân gửi phản ánh có SĐT (OTP mô phỏng) và gửi ẩn danh
  ✓  2 … 02 Cán bộ chưa đăng nhập bị chuyển về /dang-nhap; sai mật khẩu báo lỗi chung
  ✓  3 … 03 Cán bộ đăng nhập thật, tiếp nhận và giao TNV xác minh
  ✓  4 … 04 TNV đăng nhập, xác minh "Có sự cố" kèm ảnh
  ✓  5 … 05 Cán bộ xem kết quả xác minh, giao xử lý và hoàn thành kèm ảnh sau
  ✓  6 … 06 Người dân xem Trước/Sau, bấm "Chưa giải quyết" -> hồ sơ mở lại
  ✓  7 … 07 Người không phải chủ hồ sơ không đánh giá được (403), hồ sơ ẩn danh hiện ở hộp cán bộ
  7 passed (53.6s)
```

Mỗi lần chạy `globalSetup` gọi `npm run demo:reset` để đưa DB về 64 hồ sơ. Ảnh chụp ở `screenshots/`.

**E2E Giai đoạn 1** (`npx playwright test`, chế độ local):
- Dự án "Desktop Chrome (1440x900)": 5/5 đạt khi chạy tuần tự (`--workers=1`). Khi chạy song song lúc máy quá tải, 2 test chụp màn hình quá thời gian 30 giây; không phải lỗi mã.
- Dự án "Mobile Chrome (390x844)": dùng thiết bị `iPhone 13` nên chạy bằng WebKit. Máy chưa có WebKit và không tải được (`Download failure`); khi ép `channel: chrome` Playwright báo "Unsupported webkit channel". Chưa chạy được 4 test của dự án này. Chúng chỉ chụp ảnh cho tài liệu Giai đoạn 1, không kiểm tra hành vi.
- Chạy xong, ảnh trong `docs/review/redesign/` bị ghi đè nên tôi khôi phục từ git.

## 4. Đăng nhập cán bộ bằng curl (API chạy bởi Vite dev, `VITE_DATA_SOURCE=api`)

```
1) Khong mat khau (chi co email):
HTTP 401
{"error":{"code":"INVALID_CREDENTIALS","message":"Email hoặc mật khẩu không chính xác","requestId":"..."}}
2) Chi gui role (cach dang nhap cu):
HTTP 401
{"error":{"code":"INVALID_CREDENTIALS","message":"Email hoặc mật khẩu không chính xác","requestId":"..."}}
3) Sai mat khau:
HTTP 401
{"error":{"code":"INVALID_CREDENTIALS","message":"Email hoặc mật khẩu không chính xác","requestId":"..."}}
4) Email la:
HTTP 401
{"error":{"code":"INVALID_CREDENTIALS","message":"Email hoặc mật khẩu không chính xác","requestId":"..."}}
5) Dung mat khau:
HTTP 200
{'token': 'eyJhbGciOiJI... (rut gon)', 'user': {'id': '11111111-1111-1111-1111-111111111111', 'role': 'can_bo', 'displayName': 'Nguyễn Văn Minh', 'departmentId': None, 'email': 'cb.minh@tranbien.gov.vn'}}
6) GET /officer/reports khong token:
HTTP 401
7) GET /officer/reports voi token vua cap:
HTTP 200
```

(Token và mật khẩu không in ra đầy đủ.) Cách đăng nhập cũ (chỉ gửi `role`, hoặc chỉ email) trước đây trả token; nay trả 401.

## 5. Việc chưa kiểm chứng được

- GitHub Actions (`ci.yml` mới dùng Supabase local và secret sinh lúc chạy) chưa chạy vì không được push.
- Chưa thử với Supabase cloud / Vercel (không được đăng nhập dịch vụ cloud).
- E2E trên WebKit/điện thoại thật.

## 6. Kiểm chứng lại sau khi merge vào `main` (25/11/2026)

Thứ tự merge: `origin/feat/ui-upgrade-portals-theme` (commit `2999dd8`), rồi `feat/giai-doan-2` (commit `36b3689`). Xung đột ở màn hình được giải bằng bản UI của ui-upgrade, sau đó nối lại thao tác ghi qua DataSource.

| Lệnh | Kết quả |
|---|---|
| `npx vitest run` (sau `npm run demo:reset`) | 52 file, 313 pass, 0 fail |
| `npm run db:verify` | 17/17 |
| `npm run mock:verify` | 100% |
| `npm run lint`, `npm run build` | đạt |
| `npm run test:e2e:api` | 7/7 (spec viết lại cho UI mới: C02 chọn ảnh → C04 ba bước → OTP 6 ô mô phỏng) |

Sửa thêm trong lúc kiểm chứng: C06 hỏi máy chủ quyền chủ hồ sơ (`GET /citizen/reports/:code/owner`) ở chế độ API; danh sách đồng bộ không còn xoá lịch sử xử lý đã tải; màn đăng nhập mô phỏng của cổng cán bộ/TNV không hiện ở chế độ API.

Một lần chạy vitest đầy đủ có 2 test DB fail (dữ liệu TB-0001 khác `mock.json`) rồi tự hết ở 3 lần chạy sau; nghi có tiến trình khác ghi vào cùng DB local lúc đó, chưa xác định được.
