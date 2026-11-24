# PLAN – Trấn Biên Kết Nối (UI/UX Prototype)

Nguồn: `spec.md` v1.0

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
│   │   ├── duplicates.ts         # haversine, findDuplicates
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
│   │   └── settings.ts           # seniorMode, phone, demoNow
│   ├── lib/
│   │   ├── image.ts              # nén ảnh bằng canvas
│   │   ├── geolocation.ts        # wrapper có timeout 10s
│   │   ├── speech.ts             # phát hiện + wrapper SpeechRecognition
│   │   ├── share.ts              # Web Share API + fallback clipboard
│   │   └── aiMock.ts             # tra manifest
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
│   │   ├── CitizenLayout.tsx     # khung mobile, senior mode
│   │   ├── OfficerLayout.tsx
│   │   └── VolunteerLayout.tsx
│   ├── screens/
│   │   ├── citizen/  C01Home, C02Photo, C03Location, C04Confirm, C05Mine, C06Detail, C07Nearby, C08Transparency
│   │   ├── officer/  A01Inbox, A02Panel, A03Result, OnBehalfModal
│   │   ├── volunteer/ V01Tasks, V02Verify
│   │   └── demo/     DemoHub
│   └── styles/index.css
└── tests/
    ├── unit/                     # domain/*
    ├── component/                # screens & components
    └── e2e/                      # Playwright
```

---

## 4. Store và đồng bộ

- `AppState = { reports, tasks, notifications, settings, draft }`.
- Reducer nhận action, gọi hàm domain để tính trạng thái mới, luôn append timeline và notifications trong cùng action.
- `persistence.ts`:
  - Khởi động: đọc `localStorage['tbkn:v1']`; không có → nạp `mock.json`.
  - Mỗi thay đổi: ghi lại (debounce 100ms).
  - Lắng nghe `window.addEventListener('storage')` → dispatch `HYDRATE` → các iframe trong Demo Hub tự đồng bộ.
  - `settings` lưu khoá riêng `tbkn:settings:{frame}` để khung trái và phải có seniorMode / phone riêng; `frame` lấy từ query `?frame=left|right`.
- `deviceReports` và `anonymousLog` nằm trong settings của thiết bị (theo `frame`), không nằm trong dữ liệu chung – mô phỏng đúng việc mỗi điện thoại tự nhớ phản ánh của mình.
- Ảnh người dùng tải lên lưu dataURL đã nén; nếu `localStorage` đầy → báo lỗi bằng lời và đề nghị "Đặt lại dữ liệu demo".

---

## 5. Phases

Ước lượng theo giờ làm việc tập trung của một người + agent. Mốc thời gian lịch cụ thể chờ hạn nộp của BTC.

| Phase | Nội dung | Task | Ước lượng | Đầu ra kiểm tra được |
|---|---|---|---|---|
| P0 – Nền móng | Init project, tooling, token, layout, router rỗng | T-001 → T-006 | 3h | `npm run verify` pass; 14 route render tiêu đề |
| P1 – Domain & dữ liệu | Types, hằng số, status, duplicates, sorting, KPI, privacy, generator, verify-mock | T-010 → T-019 | 5h | Toàn bộ unit test domain pass; `verify-mock` pass |
| P2 – Store | Reducer, actions, persistence, storage sync | T-020 → T-023 | 3h | Unit test action pass |
| P3 – Component dùng chung | UI kit, StatusBadge, ProgressTracker, MapView, OTP sheet, BeforeAfter | T-030 → T-038 | 5h | Component test pass |
| P4 – Luồng người dân | C01–C08, gửi ẩn danh, theo dõi không cần SĐT | T-040 → T-049c | 12h | E2E-01, E2E-02, E2E-07 pass |
| P5 – Cán bộ | A01–A03, tạo hộ, gộp/tách | T-050 → T-056 | 8h | E2E-03, E2E-04 pass |
| P6 – TNV | V01–V02, nghiệm thu | T-060 → T-062 | 3h | E2E-05 pass |
| P7 – Demo Hub & chữ lớn hoàn thiện | `/demo`, đồng bộ, nút nhảy bước, rà soát senior mode | T-070 → T-074 | 4h | E2E-06 pass; checklist senior mode |
| P8 – Hoàn thiện | A11y, trạng thái phụ, deploy Vercel, test thiết bị thật, video dự phòng | T-080 → T-087 | 5h | Checklist `tests.md` mục 6–8 đạt |
| **Tổng** | | | **≈ 48h** | |

Cắt giảm khi thiếu thời gian (theo thứ tự): T-073 (nhảy bước) → T-046 phần giọng nói → T-055 (tách hồ sơ) → T-052 (tạo hộ). Không cắt P1, Demo Hub đồng bộ cơ bản, chữ lớn.

---

## 6. Định nghĩa hoàn thành (DoD) cho mọi task

- Test trong `tests.md` của task đã viết trước và pass.
- `npm run verify` pass (eslint, `tsc --noEmit`, vitest, verify-mock).
- Không có placeholder, không `console.log` thừa.
- Màn hình mới đã xem ở 360px, 390px (người dân/TNV) hoặc 1280px, 1440px (cán bộ), cả chế độ chữ lớn nếu là màn người dân.
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
