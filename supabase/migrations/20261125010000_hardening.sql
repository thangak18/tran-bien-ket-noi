-- ==============================================================================
-- TRẤN BIÊN KẾT NỐI - GIAI ĐOẠN 2: HARDENING (bảo mật, ràng buộc, index, tìm trùng bằng PostGIS)
-- ==============================================================================

-- 1. staff_profiles gắn với Supabase Auth: có email, user_id trỏ tới auth.users
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_email_key ON staff_profiles (lower(email));

DO $$ BEGIN
  ALTER TABLE staff_profiles
    ADD CONSTRAINT staff_profiles_user_fk
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Ràng buộc bổ sung
DO $$ BEGIN
  ALTER TABLE feedback
    ADD CONSTRAINT feedback_rating_range_check
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE reports
    ADD CONSTRAINT reports_secret_hash_not_empty_check
    CHECK (length(secret_code_hash) >= 16);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Index cho khoá ngoại (tránh quét toàn bảng khi join / xoá cascade)
CREATE INDEX IF NOT EXISTS reports_department_idx ON reports (department_id);
CREATE INDEX IF NOT EXISTS reports_merged_into_idx ON reports (merged_into) WHERE merged_into IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_report_idx ON notifications (report_id);
CREATE INDEX IF NOT EXISTS report_timeline_actor_idx ON report_timeline (actor_staff_id);
CREATE INDEX IF NOT EXISTS report_duplicate_flags_other_idx ON report_duplicate_flags (other_report_id);
CREATE INDEX IF NOT EXISTS staff_profiles_department_idx ON staff_profiles (department_id);

-- 4. Thu hồi quyền trực tiếp của anon / authenticated trên schema public.
--    Mọi truy cập dữ liệu đi qua API (kết nối bằng role postgres); trình duyệt không được gọi thẳng bảng.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 5. Tìm hồ sơ nghi trùng (Spec 3.5): cùng loại, ≤ 50 m, trong 14 ngày, trạng thái còn hiệu lực.
--    Dùng ST_DWithin trên geography nên tận dụng index GIST.
CREATE OR REPLACE FUNCTION find_duplicate_reports(
  p_lng double precision,
  p_lat double precision,
  p_category category,
  p_now timestamptz,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, code text, distance_meters double precision)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT r.id,
         r.code,
         ST_Distance(r.location, pt.geog) AS distance_meters
  FROM reports r,
       LATERAL (SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS geog) pt
  WHERE ST_DWithin(r.location, pt.geog, 50)
    AND r.category = p_category
    AND r.status NOT IN ('dong', 'da_gop', 'chuyen_co_quan', 'khong_xac_nhan')
    AND r.created_at <= p_now
    AND r.created_at >= p_now - interval '14 days'
    AND (p_exclude_id IS NULL OR r.id <> p_exclude_id)
  ORDER BY distance_meters ASC
  LIMIT 3;
$$;

REVOKE ALL ON FUNCTION find_duplicate_reports(double precision, double precision, category, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
