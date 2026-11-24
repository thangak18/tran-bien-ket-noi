-- ==============================================================================
-- TRẤN BIÊN KẾT NỐI - GIAI ĐOẠN 2: POSTGRESQL + POSTGIS SCHEMA MIGRATION
-- Spec 11 & Spec 15
-- ==============================================================================

-- 1. PostGIS Extensions / Cube + Earthdistance Fallback
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  -- Fallback khi môi trường không có sẵn binary postgis
  CREATE EXTENSION IF NOT EXISTS cube;
  CREATE EXTENSION IF NOT EXISTS earthdistance;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geography') THEN
    CREATE TYPE geography AS (lng double precision, lat double precision);
  END IF;

  CREATE OR REPLACE FUNCTION ST_GeographyFromText(txt text) RETURNS geography AS $fn$
  DECLARE
    coords text;
    parts text[];
  BEGIN
    coords := substring(txt from '(?i)POINT\s*\(\s*([^)]+)\s*\)');
    IF coords IS NULL THEN
      RAISE EXCEPTION 'Invalid WKT Point: %', txt;
    END IF;
    parts := regexp_split_to_array(trim(coords), '\s+');
    RETURN (parts[1]::double precision, parts[2]::double precision)::geography;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_MakePoint(lng double precision, lat double precision) RETURNS geography AS $fn$
  BEGIN
    RETURN (lng, lat)::geography;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_SetSRID(geo geography, srid integer) RETURNS geography AS $fn$
  BEGIN
    RETURN geo;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_X(geo geography) RETURNS double precision AS $fn$
  BEGIN
    RETURN (geo).lng;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_Y(geo geography) RETURNS double precision AS $fn$
  BEGIN
    RETURN (geo).lat;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_Distance(geo1 geography, geo2 geography) RETURNS double precision AS $fn$
  BEGIN
    RETURN earth_distance(ll_to_earth((geo1).lat, (geo1).lng), ll_to_earth((geo2).lat, (geo2).lng));
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_DWithin(geo1 geography, geo2 geography, distance_meters double precision) RETURNS boolean AS $fn$
  BEGIN
    RETURN earth_distance(ll_to_earth((geo1).lat, (geo1).lng), ll_to_earth((geo2).lat, (geo2).lng)) <= distance_meters;
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;

  CREATE OR REPLACE FUNCTION ST_AsGeoJSON(geo geography) RETURNS text AS $fn$
  BEGIN
    RETURN format('{"type":"Point","coordinates":[%s,%s]}', (geo).lng, (geo).lat);
  END;
  $fn$ LANGUAGE plpgsql IMMUTABLE;
END $$;

-- 2. Enums (Spec 11.1)
DO $$ BEGIN
  CREATE TYPE category AS ENUM ('den_duong', 'ngap_nuoc', 'rac_thai', 'mat_duong');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'moi', 'da_tiep_nhan', 'cho_xac_minh', 'da_giao',
    'hoan_thanh', 'dong', 'mo_lai', 'can_bo_sung',
    'da_gop', 'chuyen_co_quan', 'chuyen_co_quan_khac', 'khong_xac_nhan'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE priority AS ENUM ('cao', 'binh_thuong');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM ('xac_minh', 'nghiem_thu');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('cho_nhan', 'dang_lam', 'xong');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('can_bo', 'tnv');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE follower_source AS ENUM ('reporter', 'also_me', 'subscribe_later');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE photo_kind AS ENUM ('before', 'after', 'verify', 'feedback');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE actor_type AS ENUM ('citizen', 'staff', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Departments
CREATE TABLE IF NOT EXISTS departments (
  id text PRIMARY KEY,
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);

-- 4. Category Settings (SLA & Gợi ý bộ phận)
CREATE TABLE IF NOT EXISTS category_settings (
  category category PRIMARY KEY,
  label text NOT NULL,
  default_department_id text REFERENCES departments(id),
  sla_days integer NOT NULL
);

-- 5. Staff Profiles (Cán bộ / TNV)
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id uuid PRIMARY KEY,
  role staff_role NOT NULL,
  display_name text NOT NULL,
  department_id text REFERENCES departments(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Reports (Hồ sơ phản ánh)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  category category NOT NULL,
  status report_status NOT NULL DEFAULT 'moi',
  status_before_merge report_status,
  priority priority NOT NULL DEFAULT 'binh_thuong',
  location geography NOT NULL,
  address text NOT NULL,
  location_note text,
  description text,
  department_id text REFERENCES departments(id),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  reporter_phone text,
  anonymous boolean NOT NULL DEFAULT false,
  subscribed_later boolean NOT NULL DEFAULT false,
  on_behalf boolean NOT NULL DEFAULT false,
  secret_code_hash text NOT NULL,
  owner_token_hash text,
  anonymous_follows integer NOT NULL DEFAULT 0,
  merged_into uuid REFERENCES reports(id),
  photos_approved boolean NOT NULL DEFAULT false,
  result_note text,
  version integer NOT NULL DEFAULT 1,
  is_seed boolean NOT NULL DEFAULT false,

  -- CHECK constraints (Spec 11.3)
  CONSTRAINT reports_anonymous_phone_check CHECK (
    (anonymous = true AND reporter_phone IS NULL) OR (anonymous = false)
  ),
  CONSTRAINT reports_completed_at_check CHECK (
    (status IN ('hoan_thanh', 'dong') AND completed_at IS NOT NULL) OR 
    (status NOT IN ('hoan_thanh', 'dong'))
  ),
  CONSTRAINT reports_merged_check CHECK (
    (merged_into IS NOT NULL AND status = 'da_gop') OR 
    (merged_into IS NULL AND status <> 'da_gop')
  ),
  CONSTRAINT reports_merged_self_check CHECK (
    merged_into IS NULL OR merged_into <> id
  ),
  CONSTRAINT reports_phone_format_check CHECK (
    reporter_phone IS NULL OR reporter_phone ~ '^0[0-9]{9}$'
  )
);

-- Chỉ mục Reports (Spec 11.2 & 11.4)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_reports_location_gist ON reports USING GIST (location);
EXCEPTION WHEN OTHERS THEN
  CREATE INDEX IF NOT EXISTS idx_reports_location_gist ON reports (location);
END $$;
CREATE INDEX IF NOT EXISTS reports_status_due_idx ON reports (status, due_at);
CREATE INDEX IF NOT EXISTS reports_category_created_idx ON reports (category, created_at);
CREATE INDEX IF NOT EXISTS reports_phone_idx ON reports (reporter_phone);

-- 7. Report Photos
CREATE TABLE IF NOT EXISTS report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind photo_kind NOT NULL,
  storage_path text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'storage',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_photos_report_id_idx ON report_photos(report_id);

-- 8. Report Followers
CREATE TABLE IF NOT EXISTS report_followers (
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  phone text NOT NULL,
  source follower_source NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, phone)
);
CREATE INDEX IF NOT EXISTS report_followers_phone_idx ON report_followers(phone);

-- 9. Report Timeline (Bất biến)
CREATE TABLE IF NOT EXISTS report_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  status report_status NOT NULL,
  actor_type actor_type NOT NULL,
  actor_staff_id uuid REFERENCES staff_profiles(user_id),
  actor_label text NOT NULL,
  note text
);
CREATE INDEX IF NOT EXISTS report_timeline_report_id_idx ON report_timeline(report_id, at);

-- Trigger bất biến cho report_timeline (Spec 11.3.5)
CREATE OR REPLACE FUNCTION prevent_report_timeline_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'report_timeline is immutable. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS report_timeline_immutable_trigger ON report_timeline;
CREATE TRIGGER report_timeline_immutable_trigger
BEFORE UPDATE OR DELETE ON report_timeline
FOR EACH ROW
EXECUTE FUNCTION prevent_report_timeline_modification();

-- 10. Report Duplicate Flags
CREATE TABLE IF NOT EXISTS report_duplicate_flags (
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  other_report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, other_report_id)
);

-- 11. Feedback
CREATE TABLE IF NOT EXISTS feedback (
  report_id uuid PRIMARY KEY REFERENCES reports(id) ON DELETE CASCADE,
  resolved boolean NOT NULL,
  rating integer,
  tags jsonb,
  comment text,
  at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_rating_check CHECK (
    (resolved = true AND rating IS NOT NULL) OR (resolved = false)
  )
);

-- 12. Volunteer Tasks
CREATE TABLE IF NOT EXISTS volunteer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type task_type NOT NULL,
  status task_status NOT NULL DEFAULT 'cho_nhan',
  assignee_id uuid REFERENCES staff_profiles(user_id),
  result_exists text,
  result_severity text,
  result_note text,
  result_at timestamptz
);
CREATE INDEX IF NOT EXISTS volunteer_tasks_report_id_idx ON volunteer_tasks(report_id);
CREATE INDEX IF NOT EXISTS volunteer_tasks_assignee_idx ON volunteer_tasks(assignee_id, status);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'sms_mo_phong',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_phone_created_idx ON notifications(phone, created_at DESC);

-- 14. Phone OTPs
CREATE TABLE IF NOT EXISTS phone_otps (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0
);

-- 15. Anonymous Submissions (Quota)
CREATE TABLE IF NOT EXISTS anonymous_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anon_sub_device_idx ON anonymous_submissions(device_id, created_at);
CREATE INDEX IF NOT EXISTS anon_sub_ip_idx ON anonymous_submissions(ip_hash, created_at);

-- 16. Access Attempts (Anti-Brute Force)
CREATE TABLE IF NOT EXISTS access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL,
  ip_hash text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_attempts_lookup_idx ON access_attempts(report_id, ip_hash, at);

-- 17. Pending Uploads
CREATE TABLE IF NOT EXISTS pending_uploads (
  path text PRIMARY KEY,
  device_id text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  attached boolean NOT NULL DEFAULT false
);

-- 18. App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

-- 19. Row Level Security (RLS) - Bật toàn diện, không cấp quyền direct cho anon/authenticated (Spec 11.3.6)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_duplicate_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 20. Tạo Storage Bucket riêng tư 'report-photos' nếu có schema storage
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('report-photos', 'report-photos', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
  END IF;
END $$;
