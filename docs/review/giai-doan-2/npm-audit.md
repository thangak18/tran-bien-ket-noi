# npm audit (app/)

Chạy ngày 25/11/2026 bằng `npm audit` (chỉ đọc). **Chưa sửa gì.** `npm audit fix --dry-run` không đề xuất thay đổi nào trong phạm vi cho phép vì mọi phụ thuộc được ghim phiên bản chính xác trong `package.json`; các bản vá nằm ngoài khoảng phiên bản hiện tại (cần `--force`, có thay đổi phá vỡ). Bạn đã cấm `--force`.

## Tổng số

37 lỗ hổng: 3 nghiêm trọng (critical), 15 cao (high), 15 trung bình (moderate), 4 thấp (low).

## Gói phụ thuộc chạy ở production (cần xem xét trước khi triển khai thật)

| Gói | Mức | Ghi chú |
|---|---|---|
| `hono` | cao | Framework API. Cần nâng lên bản đã vá |
| `zod` | cao | Có thể bị cạn bộ nhớ khi kiểm tra tập hợp rất lớn; bản vá là 4.x (thay đổi phá vỡ) |
| `react-router-dom` (kéo theo `react-router`, `@remix-run/router`) | cao | Chưa đánh giá mức ảnh hưởng thực tế với cách dùng hiện tại |
| `drizzle-orm` | cao | Mã hiện chủ yếu dùng để khai báo schema; truy vấn viết bằng `postgres` có tham số hoá. Chưa đánh giá chi tiết |
| `@supabase/supabase-js` | thấp | Qua `@supabase/auth-js` |

## Gói chỉ dùng khi phát triển/kiểm thử

- Nghiêm trọng: `vitest` → `tinypool` (prototype pollution dẫn tới thực thi mã khi chạy worker), `supabase` CLI → `tar`.
- Cao: `vite`, `postcss`, `@playwright/test` (`playwright`), `@vercel/node` (`path-to-regexp`, `undici`, `@fastify/busboy`), `supabase`.
- Trung bình/thấp: `esbuild`, `drizzle-kit`, `typescript-eslint` và các gói phụ, `eslint`, `ajv`, `minimatch`, `vite-node`.

Các gói này không đi vào bản build triển khai, nhưng nên nâng để an toàn cho máy phát triển và CI.

## Đề xuất

Nâng một lượt có kiểm soát (cần bạn đồng ý vì có thay đổi phá vỡ): `hono`, `zod`, `react-router-dom`, `vitest`, `vite`, `drizzle-orm`/`drizzle-kit`, rồi chạy lại `npm run verify` và `npm run test:e2e:api`. Mỗi gói thêm vào `docs/plan.md` mục 2 nếu đổi phiên bản chính.
