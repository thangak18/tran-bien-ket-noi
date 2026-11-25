# Trấn Biên Kết Nối

Đồng Nai Hackathon 2026 · Đề 2 – Phản ánh hiện trường.
Người dân chụp ảnh báo sự cố, cán bộ phường tiếp nhận và xử lý, tình nguyện viên xác minh tại chỗ, người dân theo dõi đến khi có ảnh Trước/Sau.

> **Bắt đầu phiên làm việc mới (người hoặc agent): đọc [`CLAUDE.md`](CLAUDE.md) trước.**

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Prototype giao diện (React) + dữ liệu mẫu + localStorage, deploy Vercel | **Đã nộp 24/11/2026** |
| 2 | Sản phẩm hoàn chỉnh: full-stack React SPA + Hono API + PostgreSQL/PostGIS + tài khoản phân quyền + lưu trữ ảnh Supabase Storage + CLI vận hành | **Hoàn thành trọn vẹn (25/11/2026)** – xem `docs/van-hanh.md` |

## Cấu trúc

```
TranBienKetNoi_Workspace/
├── CLAUDE.md                 # bối cảnh + trạng thái dự án
├── AGENTS.md                 # luật cho agent code
├── README.md                 # tài liệu giới thiệu tổng quan
├── thuyet-minh.md            # bản thuyết minh nộp vòng 1 (+ PDF)
├── assets/                   # sơ đồ luồng và kiến trúc
├── docs/                     # proposal_v3, spec, ui-ux-guidelines, plan, tasks, tests, van-hanh.md
└── app/                      # Full-stack Application
    ├── api/                  # Vercel Function Node.js handler ([...path].ts)
    ├── server/               # Hono backend engine: routes, middleware, db client, schema
    ├── scripts/              # Seed, db-verify, staff CLI, ops CLI
    ├── src/domain/           # nghiệp vụ thuần: types, constants, transitions, duplicates, privacy…
    ├── src/data/             # DataSource abstraction (LocalDataSource, ApiDataSource)
    ├── src/lib/              # api client, auth, geolocation, image, senior, share
    ├── src/store/            # AppStore + citizenActions + officerActions
    ├── src/screens/          # citizen / officer / volunteer / auth / demo
    ├── src/data/mock.json    # 64 hồ sơ mẫu
    └── public/demo-photos/   # ảnh minh hoạ
```

## Lệnh thường dùng

```bash
cd app
npm install           # Cài đặt thư viện pinned dependencies
npm run dev           # Chạy serverless dev & React SPA
npm run verify        # Kiểm tra toàn diện (lint, tsc, 39 files test, 16 bất biến mock)
npm run db:verify     # Kiểm tra 16 bất biến trực tiếp trên PostgreSQL live
npm run seed          # Nạp 64 hồ sơ mẫu và tài khoản nhân viên
npm run build         # Build production frontend
npm run staff:list    # Quản trị danh sách nhân viên
npm run demo:reset    # Đặt lại dữ liệu mẫu cho giám khảo
```

## Quyết định đã chốt

- Database giai đoạn 2: **PostgreSQL + PostGIS** (lý do ở `CLAUDE.md` mục 6.1).
- Bất biến dữ liệu mẫu: 64 phản ánh (18/15/21/10), 47 đã xử lý, TB 3,2 ngày; không lộ số điện thoại và mã bí mật ở phần công khai.
- Mọi thứ chưa làm thật (OTP, SMS/Zalo, AI) phải gắn nhãn "Mô phỏng".
