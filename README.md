# Trấn Biên Kết Nối

Đồng Nai Hackathon 2026 · Đề 2 – Phản ánh hiện trường.
Người dân chụp ảnh báo sự cố, cán bộ phường tiếp nhận và xử lý, tình nguyện viên xác minh tại chỗ, người dân theo dõi đến khi có ảnh Trước/Sau.

> **Bắt đầu phiên làm việc mới (người hoặc agent): đọc [`CLAUDE.md`](CLAUDE.md) trước.**

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Prototype giao diện (React) + dữ liệu mẫu + localStorage, deploy Vercel | **Đã nộp 24/11/2026** |
| 2 | Sản phẩm hoàn chỉnh: backend + PostgreSQL/PostGIS + tài khoản + lưu ảnh | **Đang bắt đầu (25/11/2026)** – kế hoạch ở `CLAUDE.md` mục 6 |

## Cấu trúc

```
TranBienKetNoi_Workspace/
├── CLAUDE.md                 # bối cảnh + kế hoạch giai đoạn 2 (đọc đầu tiên)
├── AGENTS.md                 # luật cho agent code
├── README.md
├── thuyet-minh.md            # bản thuyết minh nộp vòng 1 (+ PDF)
├── assets/                   # sơ đồ luồng và kiến trúc
├── docs/                     # spec, ui-ux-guidelines, plan, tasks, tests, code-guidelines, review/
└── app/                      # React + Vite + TypeScript + Tailwind 3.4
    ├── src/domain/           # nghiệp vụ thuần: types, constants, transitions, duplicates, privacy…
    ├── src/store/            # AppStore + citizenActions + officerActions (hàm thuần state → state)
    ├── src/screens/          # citizen / officer / volunteer / demo
    ├── src/data/mock.json    # 64 hồ sơ mẫu
    └── public/demo-photos/   # ảnh minh hoạ
```

## Lệnh thường dùng

```bash
cd app
npm install
npm run dev        # chạy local
npm run build      # tsc + vite build
npm run lint
npx vitest run
npm run mock:verify
```

## Quyết định đã chốt

- Database giai đoạn 2: **PostgreSQL + PostGIS** (lý do ở `CLAUDE.md` mục 6.1).
- Bất biến dữ liệu mẫu: 64 phản ánh (18/15/21/10), 47 đã xử lý, TB 3,2 ngày; không lộ số điện thoại và mã bí mật ở phần công khai.
- Mọi thứ chưa làm thật (OTP, SMS/Zalo, AI) phải gắn nhãn "Mô phỏng".
