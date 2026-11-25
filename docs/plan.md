# PLAN – Trấn Biên Kết Nối

Nguồn: `spec.md` v2.0, `ui-ux-guidelines.md`

**Mục 1–9 = giai đoạn 1 (prototype, đã nộp). Mục 10–18 = giai đoạn 2 (backend + database, từ 25/11/2026); nếu mâu thuẫn mục 2 "Không dùng… SDK backend" thì mục 10+ thắng.**

**Phạm vi mục 1–9: lõi (Functional Requirements).** Bonus B1–B5 nằm ở `tasks.md` mục Backlog Bonus, chưa lên lịch.

---

## 1. Nguyên tắc kỹ thuật

1. **Một SPA, ba giao diện**: người dân, TNV, cán bộ dùng chung store và dữ liệu.
2. **Logic nghiệp vụ tách khỏi UI**: chuyển trạng thái, trùng lặp, sắp xếp, KPI là hàm thuần trong `src/domain/`, test được không cần render.
3. **Dữ liệu sinh từ generator có seed**: không viết tay 64 bản ghi.
4. **KPI luôn tính từ dữ liệu**, không hard-code.
5. **Mỗi màn hình một route** để demo, chụp ảnh và test e2e.

---

## 2. Stack

| Nhóm | Thư viện | Ghi chú |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | Bản ổn định mới nhất lúc init, ghi version cố định trong `package.json` |
| Style | Tailwind CSS | Token trong theme (spec 7.5) |
| Routing | React Router | |
| Bản đồ | Leaflet + React Leaflet | Tile `https://tile.openstreetmap.org/{z}/{x}/{y}.png` + attribution |
| Icon | lucide-react | |
| Biểu đồ | Recharts | Chỉ dùng ở C08/A01 |
| Font | @fontsource/be-vietnam-pro | Self-host, không phụ thuộc Google Fonts |
| Ngày | date-fns (+ locale vi) | |
| Test đơn vị | Vitest + @testing-library/react + jsdom | |
| Test e2e | Playwright (Chromium, viewport mobile + desktop) | |
| Lint | ESLint + Prettier | |
| Seed ngẫu nhiên | Hàm PRNG tự viết (mulberry32) | Không cần thư viện |
| Mã QR | qrcode | Sinh QR link theo dõi ở màn thành công ẩn danh (spec AC-C04-11); chạy hoàn toàn phía client |

Không dùng: state library ngoài (Redux, Zustand), UI kit nặng, axios, bất kỳ SDK backend nào.

---

## 3. Cấu trúc thư mục

```
app/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts            # hoặc cấu hình theo phiên bản Tailwind
├── playwright.config.ts
├── public/
│   ├── demo-photos/
│   │   ├── den_duong/ ngap_nuoc/ rac_thai/ mat_duong/ after/
│   │   └── manifest.json
│   └── icons/                    # favicon, icon PWA nếu làm
├── scripts/
│   ├── generate-mock.ts          # sinh src/data/mock.json
│   └── verify-mock.ts            # kiểm bất biến spec 5.1
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # router
│   ├── domain/                   # hàm thuần, không import React
│   │   ├── types.ts
│   │   ├── constants.ts          # loại, bộ phận, hạn, nhãn trạng thái, đường mẫu
│   │   ├── status.ts             # bảng chuyển trạng thái, ánh xạ nhãn công khai
│   │   ├── geo.ts                # haversineMeters
│   │   ├── latestUpdate.ts       # câu Cập nhật mới nhất, delayDays
│   │   ├── sorting.ts            # overdue, dueSoon, sortInbox
│   │   ├── kpi.ts                # computeKpi
│   │   ├── notifications.ts      # buildNotification
│   │   ├── privacy.ts            # maskPhone, toPublicReport
│   │   ├── access.ts             # hasOwnerAccess (spec 3.4a), anonymous quota (3.4b)
│   │   └── format.ts             # ngày, số thập phân, khoảng cách
│   ├── data/
│   │   ├── mock.json             # do script sinh, commit vào repo
│   │   └── streets.ts            # danh sách đường + tọa độ gần đúng
│   ├── store/
│   │   ├── AppStore.tsx          # Context + reducer
│   │   ├── actions.ts            # submitReport, follow, accept, assign, merge, ...
│   │   ├── persistence.ts        # localStorage + storage event
│   │   └── settings.ts           # phone, demoNow, deviceReports, anonymousLog (seniorMode: bonus B3)
│   ├── lib/
│   │   ├── image.ts              # nén ảnh bằng canvas
│   │   ├── geolocation.ts        # wrapper có timeout 10s
│   │   # speech.ts (B4) – chưa tạo
│   │   ├── share.ts              # Web Share API + fallback clipboard
│   │   # aiMock.ts (B1) – chưa tạo
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, Sheet, Modal, Toast, Stepper, ...
│   │   ├── StatusBadge.tsx
│   │   ├── ProgressTracker.tsx
│   │   ├── BeforeAfter.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── MapView.tsx
│   │   ├── PhoneOtpSheet.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── TrackingLinkCard.tsx  # mã bí mật, QR, Lưu link
│   │   ├── SubscribeCard.tsx     # Nhận tin báo cho phản ánh này
│   │   └── MockLabel.tsx         # nhãn "Mô phỏng"
│   ├── layouts/
│   │   ├── CitizenLayout.tsx     # khung mobile, thanh điều hướng đáy + FAB camera
│   │   ├── OfficerLayout.tsx
│   │   └── VolunteerLayout.tsx
│   ├── screens/
│   │   ├── citizen/  C01Home, C02Photo, C03Location, C04Confirm, C05Mine, C06Detail, C07Nearby, C08Transparency
│   │   ├── officer/  A01Inbox, A02Panel, A03Result, OnBehalfModal
│   │   ├── volunteer/ V01Tasks, V02Verify
│   │   ├── demo/     DemoHub
│   │   └── dev/      DevUiGallery (route `/dev/ui` – chỉ dùng khi dev để review UI)
│   └── styles/index.css
└── tests/
    ├── unit/                     # domain/*
    ├── component/                # screens & components
    └── e2e/                      # Playwright
```

*Ghi chú route dev:* Route `/dev/ui` được mount có điều kiện (`import.meta.env.DEV`) chỉ dùng khi dev để review UI toàn bộ các component dùng chung với dữ liệu mẫu thật từ `mock.json`.

---

## 4. Store và đồng bộ

- `AppState = { reports, tasks, notifications, settings, draft }`.
- Reducer nhận action, gọi hàm domain để tính trạng thái mới, luôn append timeline và notifications trong cùng action.
- `persistence.ts`:
  - Khởi động: đọc `localStorage['tbkn:v1']`; không có → nạp `mock.json`.
  - Mỗi thay đổi: ghi lại (debounce 100ms).
  - Lắng nghe `window.addEventListener('storage')` → dispatch `HYDRATE` → các iframe trong Demo Hub tự đồng bộ.
  - `settings` lưu khoá riêng `tbkn:settings:{frame}` để khung trái và phải có phone / deviceReports riêng; `frame` lấy từ query `?frame=left|right`.
- `deviceReports` và `anonymousLog` nằm trong settings của thiết bị (theo `frame`), không nằm trong dữ liệu chung – mô phỏng đúng việc mỗi điện thoại tự nhớ phản ánh của mình.
- Ảnh người dùng tải lên lưu dataURL đã nén; nếu `localStorage` đầy → báo lỗi bằng lời và đề nghị "Đặt lại dữ liệu demo".

---

## 5. Phases

Ước lượng theo giờ làm việc tập trung của một người + agent. Mốc thời gian lịch cụ thể chờ hạn nộp của BTC.

| Phase | Nội dung | Task | Ước lượng | Đầu ra kiểm tra được |
|---|---|---|---|---|
| P0 – Nền móng | Init project, tooling, token, layout, router rỗng | T-001 → T-006 | 3h | `npm run verify` pass; 14 route render tiêu đề |
| P1 – Domain & dữ liệu | Types, hằng số, status, câu cập nhật & chậm hạn, sorting, KPI, privacy, access, geo, generator, verify-mock | T-010 → T-019 | 5h | Toàn bộ unit test domain pass; `verify-mock` pass |
| P2 – Store | Reducer, actions, persistence, storage sync | T-020 → T-023 | 3h | Unit test action pass |
| P3 – Component dùng chung | UI kit, StatusChip/DelayChip, ProgressBar/Timeline, StepHeader, MapView, OTP sheet, BeforeAfter, CategoryTile, ReportCard, TrackingLink, RatingSheet | T-030 → T-039b | 7h | Component test pass |
| P4 – Luồng người dân | C01–C08, gửi ẩn danh, theo dõi không cần SĐT | T-040 → T-049b | 12h | E2E-01, E2E-07, E2E-08 pass |
| P5 – Cán bộ | A01–A03, bàn phím | T-050 → T-056 | 6h | E2E-03 pass |
| P6 – TNV | V01–V02, nghiệm thu | T-060 → T-062 | 3h | E2E-05 pass |
| P7 – Demo Hub | `/demo`, đồng bộ, nút nhảy bước | T-070 → T-073 | 3h | E2E-06 pass |
| P8 – Hoàn thiện lõi | A11y, trạng thái phụ, rà soát UI theo guidelines, deploy Vercel, test thiết bị thật, video dự phòng | T-080 → T-087 | 6h | Checklist `tests.md` mục 5–7 đạt |
| **Tổng lõi** | | | **≈ 45h** | |

Cắt giảm khi thiếu thời gian (theo thứ tự): T-073 (nhảy bước) → T-056 (bàn phím) → T-084 (banner trình duyệt nhúng). Không cắt P1, 6 màn bắt buộc, công khai kết quả, Demo Hub đồng bộ cơ bản.

Sau lõi, mở bonus theo thứ tự B3 → B2 → B1 → B4 → B5 (B1–B3 là điểm cộng của đề).

---

## 6. Định nghĩa hoàn thành (DoD) cho mọi task

- Test trong `tests.md` của task đã viết trước và pass.
- `npm run verify` pass (eslint, `tsc --noEmit`, vitest, verify-mock).
- Không có placeholder, không `console.log` thừa.
- Màn hình mới đã xem ở 360px, 390px (người dân/TNV) hoặc 1280px, 1440px (cán bộ) và đối chiếu wireframe trong `ui-ux-guidelines.md`.
- Tick trong `tasks.md` kèm ngày.

---

## 7. Scripts npm

| Lệnh | Việc |
|---|---|
| `dev` | Vite dev server |
| `build` | Typecheck + build |
| `preview` | Xem bản build |
| `mock:generate` | Chạy `scripts/generate-mock.ts` → `src/data/mock.json` |
| `mock:verify` | Chạy `scripts/verify-mock.ts`, exit 1 nếu sai bất biến |
| `test` | Vitest |
| `test:e2e` | Playwright |
| `lint` | ESLint |
| `verify` | lint + typecheck + test + mock:verify |

---

## 8. Deploy

- Vercel, framework Vite, SPA rewrite mọi route về `index.html`.
- Kiểm tra trên điện thoại thật qua HTTPS: GPS, camera, Web Speech.
- Mở link qua Zalo để kiểm tra trình duyệt nhúng; nếu camera/GPS lỗi → hiện banner "Mở bằng trình duyệt" (T-084).

---

## 9. Rủi ro kỹ thuật

| Rủi ro | Biện pháp |
|---|---|
| localStorage vượt dung lượng do ảnh | Nén ảnh; ảnh mock dùng đường dẫn `/demo-photos`, không phải dataURL |
| Leaflet icon lỗi đường dẫn khi build | Dùng `L.divIcon` với icon Lucide, không dùng ảnh marker mặc định |
| Tile OSM chậm/mất mạng khi demo | Mở trước khu vực demo để trình duyệt cache; AC-C07-8 chuyển danh sách; video dự phòng |
| Lạm dụng tile OSM | Chỉ dùng cho demo, có attribution, không prefetch hàng loạt |
| iframe Demo Hub không nhận GPS | Thêm `allow="geolocation; camera; microphone"` cho iframe |
| Ngày giờ lệch múi | Mọi tính toán dùng `demoNow` từ settings, định dạng UTC+7 |

---

# GIAI ĐOẠN 2 – Backend và database

Spec tương ứng: `spec.md` mục 10–17.

## 10. Kiến trúc

```
Trình duyệt (SPA React, Vercel static)
   │  HTTPS, Bearer JWT / X-Report-Key / X-Device-Id
   ▼
Vercel Function  app/api/[...path].ts  (Hono, một điểm vào)
   │  ├─ middleware: CORS, request-id, xác thực, phân quyền, giới hạn tốc độ, zod
   │  ├─ routes/: public · citizen · officer · volunteer · cron
   │  ├─ services/: nghiệp vụ trong giao dịch (dùng chung src/domain/)
   │  └─ providers/: OtpProvider, NotificationChannel (mock)  ← điểm cắm dịch vụ thật
   ▼
Supabase
   ├─ PostgreSQL + PostGIS (truy cập qua pooler, vai trò server; RLS bật, không policy cho anon)
   ├─ Auth (chỉ nhân viên: email + mật khẩu)
   └─ Storage (bucket riêng tư report-photos, URL ký)
```

Nguyên tắc:

1. **Trình duyệt không nói chuyện trực tiếp với DB.** Chỉ dùng `@supabase/supabase-js` ở client cho đăng nhập nhân viên; mọi dữ liệu đi qua API.
2. **Server quyết định.** Chuyển trạng thái, phân quyền, quota, kiểm tra ảnh đều ở server; UI chỉ hiện/ẩn.
3. **`src/domain/` là code dùng chung** (không import React, không import Node). Server import trực tiếp (`../src/domain/...`); không sao chép.
4. **Một serializer công khai** (`toPublicReport`) cho mọi phản hồi không phải của chủ hồ sơ.
5. **Giao dịch cho mọi chuyển trạng thái** (spec 12.1); `version` cho xung đột.
6. **`now` là tham số** (Clock), test không phụ thuộc giờ máy.
7. **Tách biến môi trường theo môi trường**: `development`, `preview`, `production`; không khoá bí mật trong repo (AGENTS.md).

## 11. Thư viện bổ sung (ghi lý do theo AGENTS.md)

Các mục dưới đây **ngoại lệ** của câu "Không dùng… SDK backend" ở mục 2, chỉ áp dụng giai đoạn 2. Phiên bản được cố định chính xác (pinned version, không dùng `^` hay `~`) theo quy định của AGENTS.md.

| Thư viện | Phiên bản | Dùng ở | Lý do |
|---|---|---|---|
| `drizzle-orm` | `0.38.3` | server, migration | ORM TypeScript gọn nhẹ, không sinh mã cồng kềnh, tương thích tốt với serverless edge |
| `drizzle-kit` | `0.30.1` | server, dev | Công cụ quản lý schema và sinh file migration SQL từ TypeScript schema |
| `postgres` | `3.4.5` | server | Driver PostgreSQL (postgres.js) hiệu năng cao, hỗ trợ pooler transaction mode của Supabase |
| `hono` | `4.6.14` | server | Router siêu nhẹ cho Vercel Function gom thành một điểm vào duy nhất, middleware dùng chung, test bằng `app.request()` không cần dựng server |
| `zod` | `3.24.1` | server + client | Định nghĩa schema dữ liệu một nguồn duy nhất (SSOT); client dùng lại để validate form, server validate payload |
| `jose` | `5.9.6` | server | Thư viện chuẩn JWK/JWT không phụ thuộc Node crypto, dùng xác minh JWT Supabase và ký/xác minh JWT 30 ngày của người dân |
| `@supabase/supabase-js` | `2.47.10` | client + server | Client dùng để đăng nhập nhân viên (Auth); Server dùng khoá `service_role` cho Admin API tạo user và ký URL Supabase Storage |
| `supabase` | `2.1.1` | dev | CLI Supabase Local để khởi tạo và quản lý bộ dịch vụ Supabase nội bộ (PostgreSQL, PostGIS, Storage, Auth) qua Docker |
| `@vercel/node` | `5.1.3` | dev, server | Cung cấp kiểu dữ liệu TypeScript (types) và adapter cho Vercel Functions |

Không thêm: NestJS/Express, Prisma, Redis (giới hạn tốc độ dùng bảng Postgres), thư viện SMS bên thứ ba (chưa làm thật).

## 12. Cấu trúc thư mục thêm

```
app/
├── api/
│   └── [...path].ts              # Vercel entry: export default handle(app)
├── server/
│   ├── app.ts                    # tạo Hono app, gắn middleware + routes (test import file này)
│   ├── env.ts                    # đọc + kiểm biến môi trường (zod), fail sớm
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema (spec 11)
│   │   ├── client.ts             # kết nối pooler
│   │   ├── migrations/           # SQL sinh bởi drizzle-kit + SQL tay (PostGIS, RLS, trigger, CHECK)
│   │   └── seed.ts               # mock.json → DB
│   ├── middleware/               # auth.ts, role.ts, rateLimit.ts, idempotency.ts, errors.ts
│   ├── routes/                   # public.ts, citizen.ts, reports.ts, officer.ts, volunteer.ts, cron.ts
│   ├── services/                 # reportService, transitionService, taskService, notifyService, ownerAccess, photoService
│   ├── providers/                # otp.ts, notification.ts (mock + interface)
│   └── clock.ts
├── scripts/
│   ├── db-verify.ts              # bất biến spec 16.3
│   ├── staff.ts                  # staff:create/disable/enable/reset-password/list (spec 14)
│   └── ops.ts                    # config:set-sla, demo:reset, demo:clock
├── src/
│   ├── data/                     # DataSource: types.ts, LocalDataSource.ts, ApiDataSource.ts, index.ts
│   ├── lib/api.ts                # fetch wrapper: token, lỗi → thông báo tiếng Việt, Idempotency-Key
│   ├── auth/                     # AuthProvider, RequireRole, LoginPage (/dang-nhap)
└── tests/
    ├── api/                      # test hợp đồng + phân quyền + bất biến trên Postgres thật
    └── e2e/                      # chạy cả hai chế độ (VITE_DATA_SOURCE)
```

## 13. Biến môi trường

Chỉ liệt kê **tên**; giá trị đặt ở `app/.env.local` (được `.gitignore` chặn, không commit) và bảng biến môi trường Vercel / GitHub Actions Secrets. Cung cấp file mẫu `app/.env.example` đầy đủ tên biến và chú thích.

| Biến | Phạm vi | Ghi chú |
|---|---|---|
| `DATABASE_URL` | server | Chuỗi kết nối PostgreSQL pooler (transaction mode) |
| `DATABASE_URL_DIRECT` | máy dev/CI | Chuỗi kết nối trực tiếp phục vụ migration Drizzle |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | server | URL và anon key của Supabase project |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client | Khai báo tiền tố `VITE_` để client React gọi Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Khoá đặc quyền cao nhất: Admin API tạo tài khoản nhân viên, ký URL upload/download Storage |
| `CITIZEN_JWT_SECRET` | server | Khóa bí mật ký JWT 30 ngày cho người dân (chuỗi ngẫu nhiên ≥ 32 bytes) |
| `OWNER_KEY_PEPPER` | server | Pepper cho mã hoá hash `secretCode`, `ownerToken` và `ip_hash` |
| `OTP_PROVIDER`, `SMS_PROVIDER` | server | `mock` (mặc định) |
| `ALLOW_MOCK_OTP` | server | Phải `true` mới cho phép chạy provider `mock` khi `NODE_ENV=production` |
| `DEMO_MODE` | server | `true` mới cho phép chạy script `demo:reset` và `demo:clock` |
| `CRON_SECRET` | server | Khóa bí mật xác thực Vercel Cron khi gọi `/api/v1/cron/*` |
| `VITE_DATA_SOURCE` | client | `local` (mặc định offline) \| `api` (kết nối backend Supabase) |
| `SEED_STAFF_PASSWORD` | máy chạy seed | Mật khẩu tài khoản nhân viên mẫu khi chạy `db:seed`, không ghi vào repo |

## 14. Môi trường và triển khai

| Môi trường | Supabase | Vercel | Ghi chú |
|---|---|---|---|
| Local (Dev/Test) | **Supabase Local** (`npx supabase start` qua Docker) | `vercel dev` / Vite dev | Hỗ trợ 2 chế độ: `VITE_DATA_SOURCE=local` (offline nhanh) và `VITE_DATA_SOURCE=api` (kết nối Supabase local) |
| Preview | Dự án Supabase "staging" (Cloud) | Preview deployment tự động mỗi PR | Seed lại dữ liệu khi cần |
| Production | Dự án Supabase "prod" (Cloud) | Dự án `tran-bien-ket-noi` trên Vercel (Root = `app`) | `VITE_DATA_SOURCE=api`, RLS bật toàn diện |
| Demo offline | Không | Dự án Vercel **riêng** `tran-bien-ket-noi-demo` | `VITE_DATA_SOURCE=local`; bảo toàn nguyên vẹn bản nộp ngày 24/11 |

### Quy trình Supabase Local:
1. Cài đặt `supabase` CLI dạng devDependency.
2. Khởi chạy `npx supabase init` và `npx supabase start` (sử dụng Docker engine).
3. Lấy thông số kết nối qua `npx supabase status` (API URL, anon key, service_role key, connection string).
4. Ghi các khóa bí mật vào `app/.env.local` (tuyệt đối không đưa vào git).

### Triển khai & Vận hành:
- Migration chạy **thủ công có kiểm soát** (`npm run db:migrate`) trước khi deploy bản cần schema mới; không chạy tự động trong build.
- `vercel.json`: cấu hình rewrite `/api/(.*)` → function `api/[...path].ts`, giữ nguyên SPA rewrite cho phần còn lại; định nghĩa cron job hằng ngày `0 20 * * *` (UTC, tương đương 03:00 UTC+7).

## 15. Phases giai đoạn 2

Ước lượng giờ làm việc tập trung (một người + agent). Mỗi phase kết thúc bằng thứ chạy được và `npm run verify` pass.

| Phase | Task | Nội dung | Ước lượng | Đầu ra kiểm tra được |
|---|---|---|---|---|
| Q0 – Tài liệu | G2-01, G2-02 | Chốt stack, spec + plan (file này) | – | Chủ dự án duyệt |
| Q1 – DB | G2-03 | Drizzle schema, migration (PostGIS, enum, CHECK, trigger timeline, RLS), seed từ `mock.json`, `db:verify` | 6h | `db:verify` pass trên DB thử nghiệm; AC bất biến 16.3 |
| Q2 – Lõi API | G2-04 | Hono app, middleware lỗi/zod/Clock, `public/*`, `reports` gửi + chủ hồ sơ, `officer/*`, `volunteer/*`, `transitionService` dùng `domain/status.ts`, thông báo | 14h | Test hợp đồng pass; AC-DATA-3, 4, 5 |
| Q3 – Xác thực | G2-05 | Supabase Auth cho nhân viên, JWT người dân + OTP mock, `X-Report-Key`/`claim`/`lookup`, quota ẩn danh, chống dò | 8h | AC-AUTH-1 → 8 pass |
| Q4 – Ảnh | G2-06 | `uploads/sign`, kiểm magic bytes, URL ký đọc, cron dọn | 4h | AC-PHOTO-1 → 3 |
| Q5 – Tài khoản & vận hành | G2-10 | Script `staff:*`, `config:set-sla`, `demo:*` + màn `/dang-nhap` | 3h | AC-OPS-1 → 3 pass |
| Q6 – Frontend | G2-07 | `DataSource`, `ApiDataSource`, async UI, map lỗi, tách demo | 14h | AC-DATA-1, 2: E2E-01/03/05/07 chạy cả hai chế độ |
| Q7 – Vận hành | G2-11 | Env, 4 môi trường, cron, CI (Postgres service), hướng dẫn vận hành, kiểm thử bảo mật cuối (quét SĐT/mã) | 5h | Deploy production; checklist mục 17 |
| Sau – tuỳ chọn | G2-08, G2-09 | OTP/SMS thật, AI thật (**chờ chủ dự án quyết**); sửa 17 test cũ | – | – |
| **Tổng** | | | **≈ 54h** | |

Thứ tự phụ thuộc: Q1 → Q2 → (Q3, Q4 song song được) → Q5 → Q6 → Q7. Q6 có thể bắt đầu phần "giao diện đăng nhập + lớp `DataSource`" sớm khi Q2 có hợp đồng ổn định.

Cắt giảm khi thiếu thời gian (theo thứ tự): làm mới định kỳ 30 giây (chỉ làm tải lại khi mở màn) → cron dọn ảnh mồ côi (chạy tay). **Không cắt**: kiểm chuyển trạng thái server, phân quyền, che SĐT/mã bí mật, bất biến dữ liệu.

## 16. Chiến lược kiểm thử giai đoạn 2

Chi tiết case ghi vào `tests.md` trước khi code mỗi phase (AGENTS.md quy trình).

| Tầng | Công cụ | Nội dung |
|---|---|---|
| Hàm thuần `domain/` | Vitest | Giữ nguyên; thêm test cho thay đổi nếu có |
| Hợp đồng API | Vitest + `app.request()` + Postgres/PostGIS thật trong Docker | Mọi endpoint: thành công, 400/401/403/404/409/422/429; **cùng bộ case chạy trên hàm thuần và trên API** để bắt lệch |
| Phân quyền | Vitest | Ma trận 13.5 sinh test: mỗi ô "✗" phải trả 401/403/404 |
| Bất biến dữ liệu | `db:verify` + test | Spec 16.3, 5.1 |
| Rò rỉ dữ liệu | Vitest | AC-AUTH-6, 8: quét phản hồi và log tìm SĐT/mã |
| Đồng thời | Vitest | AC-DATA-4: hai giao dịch song song trên cùng hồ sơ |
| E2E | Playwright | Chạy hai lần: `local` và `api` (DB seed) |

CI (GitHub Actions qua `.github/workflows/ci.yml`):
1. `lint` (ESLint + Prettier check).
2. `typecheck` (`tsc --noEmit`).
3. `vitest` unit tests cho `domain/`, `store/`, components.
4. Khởi chạy Postgres container tích hợp PostGIS (`postgis/postgis:15-3.3`).
5. Thực thi migration Drizzle (`npm run db:migrate`), nạp dữ liệu mẫu (`npm run db:seed`), kiểm tra bộ bất biến (`npm run db:verify`).
6. Chạy bộ kiểm thử API backend và phân quyền trên database thật (`npm run test:api`).
7. `build` client và kiểm tra kích thước bundle. E2E Playwright chạy định kỳ hoặc khi gắn nhãn chuẩn bị release.

## 17. Checklist trước khi mở cho người dùng thật

- [ ] `db:verify` pass trên production sau seed.
- [ ] Quét tự động `/public/*`, `/volunteer/*`: không SĐT/mã bí mật (AC-AUTH-6).
- [ ] RLS bật ở **mọi** bảng; thử đọc bằng khoá `anon` trả 0 dòng/403.
- [ ] Bucket `report-photos` không công khai; thử mở URL không ký → 4xx.
- [ ] Không có `SUPABASE_SERVICE_ROLE_KEY` trong bundle client (`grep` thư mục `dist`).
- [ ] `OTP_PROVIDER=mock` ⇒ UI hiện nhãn "Mô phỏng" ở mọi điểm (hoặc đã thay OTP thật).
- [ ] Mật khẩu tài khoản seed mẫu đã đổi, hoặc tài khoản bị khoá, trước khi mở cho người dùng thật.
- [ ] Cron chạy thử một lần; `CRON_SECRET` đã đặt.
- [ ] Sao lưu: bật backup Supabase (gói trả phí) hoặc `pg_dump` định kỳ – ghi cách khôi phục.
- [ ] README và hướng dẫn vận hành cập nhật; xoá câu "chưa có code".

## 18. Rủi ro kỹ thuật giai đoạn 2

Xem bảng rủi ro ở `spec.md` mục 17. Bổ sung kỹ thuật:

| Rủi ro | Biện pháp |
|---|---|
| Vercel Function import `src/domain` ngoài thư mục `api/` | Cấu hình `includeFiles` / dùng bundler của Vercel; kiểm bằng `vercel build` sớm ở Q2 (nếu không được, chuyển `domain/` sang `packages/domain` workspace) |
| Drizzle không biểu diễn hết PostGIS/trigger/RLS | Viết các phần đó bằng SQL tay trong `migrations/`, có test kiểm tồn tại |
| Lệch múi giờ | DB `timestamptz`; chỉ định dạng `+07:00` ở lớp serialize |
| Seed ghi đè dữ liệu thật | `db:seed` từ chối chạy nếu bảng `reports` đã có dòng không phải `is_seed` (trừ cờ `--force` chỉ ở staging) |

## 19. Ghi chú sau review 25/11/2026

- Không thêm `@hono/node-server`: Vite dev server đã có middleware phục vụ `/api` (`vite.config.ts`), đủ cho e2e chế độ API (`playwright.api.config.ts`), nên không có thư viện mới nào ngoài danh sách ở mục 11.
- PostGIS chạy thật bằng Supabase local; không còn lớp tương thích `cube/earthdistance` (các mục nhắc lớp này ở trên không còn hiệu lực).
- Script dùng chung `app/scripts/lib` (env bắt buộc, Supabase Auth admin) thay cho các URL/pepper mặc định.
- E2E chế độ API chạy bằng `npm run test:e2e:api`; dùng Google Chrome cài sẵn (`channel: chrome`, đổi bằng `PW_CHANNEL`).

