# CLAUDE.md – Bối cảnh cho phiên Claude Code mới

> Đọc file này trước tiên. Nó tóm tắt toàn bộ việc đã làm ở vòng 1 và việc đang làm tiếp (backend).
> Trả lời chủ dự án bằng **tiếng Việt**, ngắn gọn, đi thẳng vào việc. Thuật ngữ kỹ thuật giữ tiếng Anh.

## 1. Dự án là gì

**Trấn Biên Kết Nối** – bài dự thi **Đồng Nai Hackathon 2026, Đề 2 "Phản ánh hiện trường"** (chính quyền số).
Người dân chụp ảnh báo sự cố (đèn đường, ngập nước, rác thải, mặt đường), cán bộ phường tiếp nhận – giao việc – cập nhật kết quả, tình nguyện viên (TNV) xác minh tại chỗ, người dân theo dõi đến khi có ảnh Trước/Sau và đánh giá.

- 3 nhóm người dùng: **người dân** (gồm người lớn tuổi, người muốn ẩn danh), **cán bộ**, **tình nguyện viên**.
- Repo GitHub (private): `thangak18/tran-bien-ket-noi`. Deploy: Vercel project `tran-bien-ket-noi` (Root Directory = `app`, SPA rewrite trong `vercel.json`).
- Bài thuyết minh đã nộp: `thuyet-minh.md` + `Tran-Bien-Ket-Noi_Thuyet-minh.pdf`, sơ đồ trong `assets/`.

## 2. Trạng thái hiện tại (25/11/2026)

**Giai đoạn 2 đã HOÀN THÀNH TRỌN VẸN trong đêm 25/11/2026** trên nhánh `feat/giai-doan-2`:
- Full-stack hoàn chỉnh: Hono API + PostgreSQL/PostGIS + Drizzle ORM + React SPA + DataSource Abstraction.
- Toàn bộ 39 test files (229 tests) PASS 100%. Đã sửa toàn bộ 17 test cũ sau đợt Redesign giao diện.
- Toàn bộ 16 bất biến cơ sở dữ liệu (DV-001 đến DV-016) được kiểm tra trực tiếp qua `npm run db:verify` và ĐẠT 100%.
- Đầy đủ tài liệu theo chuỗi truy vết: `docs/proposal_v3.md` -> `docs/spec.md` -> `docs/plan.md` -> `docs/tasks.md` -> `docs/tests.md` -> `docs/van-hanh.md`.
- Báo cáo tổng kết đêm: `docs/bao-cao-dem-25-11.md`.
- Sổ tay vận hành: `docs/van-hanh.md`.
- Lệnh kiểm tra nhanh: `npm run verify` và `npm run db:verify`.

## 3. Stack frontend

React 18 + Vite 6 + TypeScript strict + Tailwind 3.4 + React Router 6 + React Leaflet/OpenStreetMap + Recharts + lucide-react + date-fns + qrcode. Test: Vitest + Testing Library + Playwright.
Môi trường dev của chủ dự án: macOS Apple Silicon, zsh.

```bash
cd app
npm run dev          # Vite
npm run build        # tsc --noEmit && vite build
npm run lint
npx vitest run       # 186 pass / 17 fail – 17 test cũ của UI trước redesign (layouts, router titles, c01-home, status-chip, timeline), KHÔNG phải lỗi mới
npm run mock:verify  # kiểm tra bất biến dữ liệu
```

⚠️ **Tailwind 3.4, không phải v4**: dùng `bg-gradient-to-*` (không phải `bg-linear-to-*`), chỉ dùng màu có trong `tailwind.config.ts`.

## 4. Bản đồ mã nguồn (quan trọng cho backend)

Toàn bộ nghiệp vụ đã là **hàm thuần** `(state, ..., now) => newState` – đây chính là thứ cần chuyển lên server:

| File | Nội dung |
|---|---|
| `app/src/domain/types.ts` | `Report`, `ReportStatus` (11 trạng thái), `VolunteerTask`, `Notification`, `Feedback`, `Settings`, `ReportDraft` |
| `app/src/domain/constants.ts` | `CATEGORY_CONFIGS` (bộ phận gợi ý, SLA), `DEFAULT_DEADLINES`, tag phản hồi, `DEMO_NOW` |
| `app/src/domain/*.ts` | transitions (bảng chuyển trạng thái), duplicates (≤50 m, 14 ngày, cùng loại), latestUpdate/`computeDelayDays`, privacy masking, sorting/priority, notifications, format |
| `app/src/store/citizenActions.ts` | gửi phản ánh (SĐT/ẩn danh, quota ẩn danh 5/ngày, secretCode), theo dõi, "Tôi cũng gặp", đánh giá / "Chưa giải quyết" → `mo_lai` + task nghiệm thu |
| `app/src/store/officerActions.ts` | `acceptReport`, `assignVolunteer`, `submitVerification`, `assignDepartment`, `completeReport`, `requestSupplement`, `transferAgency`, `closeReport`, `mergeReports`, `splitReportAction`, `createOnBehalf` |
| `app/src/store/AppStore.tsx` + `persistence.ts` | Context + reducer, UI gọi action rồi `dispatch({type:'HYDRATE', payload})` |
| `app/src/screens/{citizen,officer,volunteer}/` | C01–C08, Profile, Search · A01Inbox, A02Panel, A03Result · V01Tasks, V02Verify |
| `app/src/domain/generator.ts`, `scripts/verify-mock.ts` | sinh và kiểm tra dữ liệu mẫu |

Thời gian "hiện tại" luôn truyền vào dưới dạng tham số `now` (`state.settings.demoNow` = `2026-11-24T09:00:00+07:00`). Giữ nguyên nguyên tắc này ở backend để test được.

## 5. Bất biến không được phá

- Dữ liệu mẫu: **64** phản ánh tháng 11/2026 (đèn đường 18, ngập nước 15, rác thải 21, mặt đường 10); **47** đã xử lý (40 `dong` + 7 `hoan_thanh`), 17 chưa xong; thời gian xử lý TB **3,2 ngày**; 6 hồ sơ ẩn danh.
- KPI phải **tính từ dữ liệu**, không hard-code.
- Số điện thoại và `secretCode` **không bao giờ** trả ra ở API/màn hình công khai. Hồ sơ ẩn danh giữ `anonymous: true` kể cả khi đăng ký nhận tin sau.
- Nhãn công khai 4 bước: Chờ tiếp nhận → Đã tiếp nhận → Đang xử lý → Đã xử lý (trạng thái nội bộ chi tiết hơn).
- Không placeholder kiểu `// TODO`, không Lorem ipsum. Mọi thứ không thật phải gắn nhãn "Mô phỏng".

## 6. Backend – việc cần chốt với chủ dự án TRƯỚC khi code

Hỏi ngắn gọn (dùng câu hỏi trắc nghiệm) những điểm sau, đừng tự quyết:

1. **Mục tiêu**: chuẩn bị cho vòng chung kết 24h, hay làm sản phẩm thật lâu dài? (quyết định độ nặng của giải pháp)
2. **Stack**: gợi ý mặc định – giữ deploy trên Vercel: **Vercel Functions (Node/TypeScript) + Postgres (Neon/Supabase) + Prisma/Drizzle**, tái dùng nguyên các hàm trong `domain/` và `store/*Actions.ts`. Phương án khác: Supabase (Auth + DB + Storage + RLS), hoặc Spring Boot / NestJS tách riêng.
3. **Phạm vi tối thiểu đề xuất**:
   - API REST cho reports / volunteer tasks / notifications / feedback, kiểm tra chuyển trạng thái phía server.
   - Lưu ảnh (object storage) thay cho data URL.
   - Xác thực cán bộ & TNV (tài khoản + vai trò); người dân theo SĐT+OTP hoặc ẩn danh với `secretCode` / link `?k=`.
   - Seed DB từ `mock.json`, giữ các bất biến ở mục 5.
   - Frontend chuyển từ localStorage sang gọi API (giữ chế độ demo offline nếu chủ dự án muốn).
4. **Dịch vụ thật** (OTP/SMS/Zalo, AI nhận diện ảnh): làm thật hay vẫn mô phỏng?

## 7. Việc dọn dẹp còn treo

- Thư mục `.wt/officer` là git worktree tạm (nhánh `fix/officer-tnv`, đã merge vào `main`). Dọn: `git worktree remove --force .wt/officer && git branch -d fix/officer-tnv`.
- Thư mục `Claude outputs/` không thuộc dự án – không commit.
- Kiểm tra `git status` / `git log origin/main..main` xem còn commit chưa push không.
- 17 test cũ (mục 3) nên cập nhật theo UI redesign khi có thời gian.

## 8. Cách làm việc chủ dự án mong muốn

- Ra kết quả hoàn chỉnh, dùng được ngay; không placeholder.
- Hỏi ngắn trước nếu yêu cầu mơ hồ hoặc thiếu ràng buộc quan trọng.
- Commit theo từng phần, message tiếng Việt dạng `Feat: …` / `Fix: …` / `Docs: …`. Chỉ push khi được yêu cầu.
- Kiểm chứng bằng code/test/screenshot, không tin báo cáo của agent khác khi chưa xem code.
