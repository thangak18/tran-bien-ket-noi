-- Khởi tạo cơ sở dữ liệu Cloudflare D1 cho Trấn Biên Kết Nối
-- Chạy local:  npx wrangler d1 migrations apply tran-bien-db --local
-- Chạy prod:   npx wrangler d1 migrations apply tran-bien-db --remote

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT,
  description TEXT,
  photos_json TEXT NOT NULL DEFAULT '[]',
  result_photos_json TEXT NOT NULL DEFAULT '[]',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT NOT NULL,
  location_note TEXT,
  status TEXT NOT NULL DEFAULT 'moi',
  department TEXT,
  created_at TEXT NOT NULL,
  due_at TEXT,
  completed_at TEXT,
  anonymous INTEGER NOT NULL DEFAULT 0,
  phone TEXT,
  secret_code_hash TEXT,
  timeline_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  report_id TEXT,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT,
  auth TEXT,
  role TEXT,
  phone TEXT,
  created_at TEXT NOT NULL
);
