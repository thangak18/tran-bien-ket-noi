# CODE GUIDELINES – Trấn Biên Kết Nối

Áp dụng cho mọi agent và người viết code trong `app/`. Đọc cùng `AGENTS.md`.

## 1. Ngôn ngữ

- Code, tên biến, tên file: **tiếng Anh**. Riêng giá trị enum nghiệp vụ dùng mã tiếng Việt không dấu theo spec (`den_duong`, `da_tiep_nhan`).
- Mọi chuỗi hiển thị: **tiếng Việt có dấu**, đặt trong `src/domain/constants.ts` hoặc file `src/copy.ts`, không rải rác trong component.
- Chế độ chữ lớn lấy chuỗi qua hàm `t(key, { senior })` trả biến thể theo spec 7.4.

## 2. TypeScript

- `strict: true`, cấm `any` (ESLint `@typescript-eslint/no-explicit-any: error`).
- Kiểu dữ liệu chỉ khai báo ở `src/domain/types.ts`.
- Hàm trong `src/domain/` là hàm thuần: không đọc `Date.now()`, nhận `now` làm tham số; không import React, không chạm `window`.

## 3. Component

- Function component, một component chính mỗi file, tên file = tên component.
- Screen chỉ ghép component và gọi action; không chứa logic nghiệp vụ (đặt ở `domain/`).
- Props có kiểu rõ ràng; không truyền cả object store xuống.
- Component icon-only bắt buộc `aria-label` (ràng buộc trong kiểu props của `Button`).

## 4. Style

- Chỉ dùng Tailwind + token đã khai báo; không màu hex rời trong className.
- Kích thước phụ thuộc chế độ chữ lớn dùng biến CSS (`--fs-body`, `--btn-h`, `--tap`) đổi theo class `.senior`, không viết điều kiện JS cho từng phần tử.
- Mobile-first; breakpoint desktop chỉ dùng trong layout cán bộ và Demo Hub.

## 5. Trạng thái và dữ liệu

- Chỉ thay đổi dữ liệu qua action trong `src/store/actions.ts`.
- Mỗi action đổi trạng thái phải gọi `domain/status.transition` – không gán `status` trực tiếp.
- KPI, danh sách sắp xếp, trùng lặp: luôn gọi hàm domain, không tự tính trong component.
- Màn hình công khai (C07, C08, C06 khi không phải chủ hồ sơ) chỉ nhận dữ liệu đã qua `toPublicReport`.

## 6. Mô phỏng

- Mọi thứ mô phỏng (AI, OTP, SMS, tổng đài, điểm hài lòng) phải render `<MockLabel />` cạnh nội dung.
- Không viết code giả vờ gọi API (fetch tới URL giả).

## 7. Test

- File test đặt theo `tests.md`, tên `*.test.ts(x)` hoặc `*.spec.ts` cho Playwright.
- Mỗi test có tên tiếng Việt mô tả hành vi, ví dụ: `it('không gộp hồ sơ khác loại dù cách 10 m')`.
- Dùng `now` cố định `2026-11-24T09:00:00+07:00`.
- Không snapshot test cho toàn màn hình.

## 8. Git

- Branch `main` luôn chạy được; mỗi task một commit: `T-043: C03 vị trí – GPS, fallback nhập địa chỉ`.
- Không commit `node_modules`, `.env`, ảnh tải từ internet.
- `mock.json` được commit; chỉ thay đổi bằng `npm run mock:generate`.

## 9. Hiệu năng

- Ảnh hiển thị dùng `loading="lazy"`; thumbnail trong bảng A01 giới hạn 48px.
- Bản đồ: tối đa 1 instance Leaflet mỗi màn hình; unmount khi rời màn.
- Bundle chính < 500 KB gzip (kiểm bằng `vite build` report).

## 10. Không được

- Placeholder (`// TODO`, `// ...`, "Lorem ipsum").
- Hard-code số KPI.
- Hiển thị số điện thoại ngoài nơi spec cho phép.
- Truyền trạng thái chỉ bằng màu.
- Thêm route, màn hình, thư viện ngoài spec/plan mà không cập nhật tài liệu trước.
