-- Đồng bộ cột tiêu đề phản ánh (title) và bảng idempotency_keys bền vững trên PostgreSQL
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS title text;

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  status integer NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx
  ON public.idempotency_keys (created_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
