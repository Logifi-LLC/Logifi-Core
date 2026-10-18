-- Digifi scan monitoring: one row per Gemini API call plus optional import correction aggregates.
-- Service role only — no client reads (analytics uses service role / Logifi-Analytics).
-- Apply after review. This file does not run against production by itself.

SET search_path TO public, pg_catalog, pg_temp;

CREATE TABLE IF NOT EXISTS public.digifi_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  scan_session_id UUID REFERENCES public.digifi_scan_sessions(id) ON DELETE SET NULL,
  spread_id TEXT,
  page_side TEXT CHECK (page_side IS NULL OR page_side IN ('left', 'right')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model TEXT,
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens INTEGER CHECK (total_tokens IS NULL OR total_tokens >= 0),
  estimated_cost_usd NUMERIC(14, 8) CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'import')),
  error_code TEXT,
  column_corrections JSONB
);

CREATE INDEX IF NOT EXISTS digifi_scan_events_created_at_idx
  ON public.digifi_scan_events (created_at DESC);

CREATE INDEX IF NOT EXISTS digifi_scan_events_user_id_idx
  ON public.digifi_scan_events (user_id);

COMMENT ON TABLE public.digifi_scan_events IS
  'Digifi Gemini call metrics and import-time column correction counts (field keys only, no PII).';

COMMENT ON COLUMN public.digifi_scan_events.column_corrections IS
  'Map of logbook field_key -> count of cells edited in Review vs AI value at import.';

ALTER TABLE public.digifi_scan_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.digifi_scan_events FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.digifi_scan_events TO service_role;
