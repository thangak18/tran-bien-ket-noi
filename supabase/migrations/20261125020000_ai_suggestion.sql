-- ==============================================================================
-- TRẤN BIÊN KẾT NỐI - GIAI ĐOẠN 2 MIGRATION
-- Bổ sung cột ai_suggestion cho tính năng AI gợi ý loại sự cố bằng DeepSeek (B1)
-- ==============================================================================

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS ai_suggestion jsonb DEFAULT NULL;

COMMENT ON COLUMN public.reports.ai_suggestion IS 'Thông tin gợi ý loại sự cố từ AI: {category, confidence, provider, reason}';
