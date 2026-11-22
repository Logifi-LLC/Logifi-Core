-- FC View OAuth tokens: anon and authenticated can no longer read or write
-- access_token / refresh_token. Does not rewrite stored token values.
--
-- The browser never queries this table. Server routes that still use the
-- user JWT only need non-secret columns or DELETE:
--   GET  /api/fcv/status       select id (filtered by user_id)
--   POST /api/fcv/fetch        select id (filtered by user_id)
--   POST /api/fcv/disconnect   delete own row
-- Token reads and writes use the service role (OAuth callback upsert,
-- fcvToken refresh).
--
-- Deploy the server that seals tokens before applying this file. The previous
-- server selects token columns with the user JWT, which this revoke rejects.
--
-- No new environment variable. Sealing uses the existing FLICA_CREDENTIALS_KEY.
-- Row Level Security stays enabled (policies from 20240101000042 /
-- 20260811171321). INSERT and UPDATE policies remain, but those commands are
-- not granted to anon or authenticated.

SET search_path TO public, pg_catalog, pg_temp;

ALTER TABLE public.fcv_integrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.fcv_integrations FROM PUBLIC, anon, authenticated;

-- status and fetch select id and filter on user_id. expires_at, created_at, and
-- updated_at are not read by the client or by those user-JWT routes.
GRANT SELECT (id, user_id) ON TABLE public.fcv_integrations TO authenticated;

GRANT DELETE ON TABLE public.fcv_integrations TO authenticated;

GRANT ALL ON TABLE public.fcv_integrations TO service_role;

COMMENT ON TABLE public.fcv_integrations IS
  'FC View OAuth tokens. access_token and refresh_token are service-role only and AES-256-GCM sealed on write. Legacy plaintext remains until the next refresh.';

COMMENT ON COLUMN public.fcv_integrations.access_token IS
  'FC View access token. Server-sealed AES-256-GCM envelope (logifi.fcv.sbx1) or legacy plaintext until the next refresh. Not granted to anon or authenticated.';

COMMENT ON COLUMN public.fcv_integrations.refresh_token IS
  'FC View refresh token. Same sealing and grants as access_token.';
