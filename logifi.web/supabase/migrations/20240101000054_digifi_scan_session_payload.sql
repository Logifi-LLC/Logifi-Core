-- Persist Digifi OCR output on scan sessions for spread-scoped recovery (24h TTL).

ALTER TABLE digifi_scan_sessions
  ADD COLUMN IF NOT EXISTS scan_payload JSONB;

COMMENT ON COLUMN digifi_scan_sessions.scan_payload IS
  'Extracted rows and diagnostics for client recovery by spreadId before import';
