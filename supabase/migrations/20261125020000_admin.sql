-- Admin access and an isolated audit trail. This migration only adds objects.
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'admin';

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_staff_id uuid NOT NULL REFERENCES staff_profiles(user_id) ON DELETE RESTRICT,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_created_idx
  ON admin_audit_log (actor_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_created_idx
  ON admin_audit_log (action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE admin_audit_log FROM anon, authenticated;
