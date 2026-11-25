-- Migration 0002: Mở rộng cơ sở dữ liệu cho 4 vai trò (citizen, volunteer, officer, admin)
-- Chạy local:  npx wrangler d1 migrations apply tran-bien-db --local
-- Chạy remote: npx wrangler d1 migrations apply tran-bien-db --remote

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'volunteer', 'officer', 'admin')),
  unit TEXT,
  area TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS volunteer_tasks (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  assignee_phone TEXT,
  assignee_name TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('xac_minh', 'nghiem_thu')),
  status TEXT NOT NULL DEFAULT 'cho_xac_minh',
  note TEXT,
  photos_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_report ON volunteer_tasks(report_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON volunteer_tasks(status);

CREATE TABLE IF NOT EXISTS report_feedbacks (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  rating INTEGER,
  tags_json TEXT NOT NULL DEFAULT '[]',
  comment TEXT,
  reopen_requested INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_report ON report_feedbacks(report_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_phone TEXT,
  report_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sla_config (
  category TEXT PRIMARY KEY,
  default_days INTEGER NOT NULL,
  department TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Khởi tạo cấu hình SLA mặc định 4 loại sự cố
INSERT OR IGNORE INTO sla_config (category, default_days, department, updated_at) VALUES
  ('den_duong', 3, 'Phòng KT-HT&ĐT – Đội chiếu sáng công cộng', '2026-11-25T00:00:00+07:00'),
  ('ngap_nuoc', 2, 'Phòng KT-HT&ĐT – Đội thoát nước', '2026-11-25T00:00:00+07:00'),
  ('rac_thai', 2, 'Bộ phận Môi trường – Đội vệ sinh môi trường', '2026-11-25T00:00:00+07:00'),
  ('mat_duong', 5, 'Phòng KT-HT&ĐT – Đội duy tu đường', '2026-11-25T00:00:00+07:00');

-- Khởi tạo tài khoản mẫu cho 4 vai trò
INSERT OR IGNORE INTO users (id, phone, name, role, unit, area, active, created_at) VALUES
  ('USR-ADM-01', '02513820000', 'Quản trị UBND P. Trấn Biên', 'admin', 'UBND P. Trấn Biên', 'Toàn phường', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-OFF-01', '02513820001', 'Nguyễn Văn Minh', 'officer', 'UBND P. Trấn Biên', 'Đô thị & Hạ tầng', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-OFF-02', '02513820002', 'Trần Quốc Bảo', 'officer', 'UBND P. Trấn Biên', 'Phó Chủ tịch UBND', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-VOL-01', '0908100001', 'Lê Thảo Vy', 'volunteer', 'Đoàn TN P. Trấn Biên', 'Khu phố 1', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-VOL-02', '0908100002', 'Trần Quốc Bảo', 'volunteer', 'Đoàn TN P. Trấn Biên', 'Khu phố 2', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-VOL-03', '0908100003', 'Phạm Ngọc Hân', 'volunteer', 'Đoàn TN P. Trấn Biên', 'Khu phố 3', 1, '2026-11-25T00:00:00+07:00'),
  ('USR-CIT-01', '0909000068', 'Ông Tư', 'citizen', NULL, 'P. Trấn Biên', 1, '2026-11-25T00:00:00+07:00');
