-- Behavioral check for 20261008000078_lock_entry_revision_inserts.sql.
-- Uses a scratch database. Does not touch a hosted Supabase project.
--
--   sudo -u postgres createdb entry_revision_lockdown_test
--   sudo -u postgres psql -v ON_ERROR_STOP=1 -d entry_revision_lockdown_test \
--     -f logifi.web/supabase/tests/entry_revision_insert_lockdown.sql

\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE TABLE public.log_entries (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  aircraft_category_class TEXT NOT NULL,
  category_class_time NUMERIC,
  aircraft_make_model TEXT NOT NULL,
  registration TEXT NOT NULL,
  flight_number TEXT,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  route TEXT,
  training_elements TEXT,
  training_instructor TEXT,
  instructor_certificate TEXT,
  pic_name TEXT,
  sic_name TEXT,
  flight_conditions TEXT[] NOT NULL DEFAULT '{}',
  remarks TEXT,
  flight_time JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  oooi JSONB,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_imported BOOLEAN NOT NULL DEFAULT FALSE,
  import_source TEXT,
  import_batch_id UUID,
  original_entry_date DATE,
  import_metadata JSONB,
  data_hash TEXT,
  version INTEGER
);

CREATE TABLE public.entry_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.log_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  entry_data JSONB NOT NULL,
  data_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  reason TEXT,
  UNIQUE (entry_id, version)
);

CREATE TABLE public.flight_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id UUID NOT NULL REFERENCES public.log_entries(id)
);

CREATE OR REPLACE FUNCTION public.build_entry_hash_text(
  p_date DATE,
  p_aircraft_make_model TEXT,
  p_registration TEXT,
  p_flight_time JSONB,
  p_performance JSONB,
  p_version INTEGER
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_version::text, '0');
$$;

CREATE OR REPLACE FUNCTION public.compute_entry_hash_from_text(hash_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT hash_text;
$$;

-- Pre-fix trigger: invoker, so the permissive INSERT policy is what lets it write.
CREATE OR REPLACE FUNCTION public.update_entry_with_revision_and_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  hash_text TEXT;
  computed_hash TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
    VALUES (
      OLD.id,
      OLD.version,
      to_jsonb(OLD),
      OLD.data_hash,
      OLD.user_id,
      'Automatic revision before update'
    )
    ON CONFLICT (entry_id, version) DO NOTHING;
    NEW.version := OLD.version + 1;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.version IS NULL THEN
    NEW.version := 1;
  END IF;

  hash_text := build_entry_hash_text(
    NEW.date,
    NEW.aircraft_make_model,
    NEW.registration,
    NEW.flight_time,
    NEW.performance,
    NEW.version
  );
  computed_hash := compute_entry_hash_from_text(hash_text);
  NEW.data_hash := computed_hash;
  RETURN NEW;
END;
$$;

CREATE TRIGGER entry_update_trigger
  BEFORE INSERT OR UPDATE ON public.log_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_entry_with_revision_and_hash();

CREATE OR REPLACE FUNCTION public.prevent_mutation_of_signed_log_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.flight_signatures
    WHERE log_entry_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Signed log entries cannot be modified or deleted'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_signed_log_entry_mutation
  BEFORE UPDATE OR DELETE ON public.log_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_mutation_of_signed_log_entries();

ALTER TABLE public.log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON public.log_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own entries"
  ON public.log_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own entry revisions"
  ON public.entry_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries
      WHERE log_entries.id = entry_revisions.entry_id
        AND log_entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow revision inserts via trigger"
  ON public.entry_revisions FOR INSERT
  WITH CHECK (
    entry_id IS NOT NULL
    AND version IS NOT NULL
    AND version > 0
    AND entry_data IS NOT NULL
    AND data_hash IS NOT NULL
    AND created_at IS NOT NULL
    AND jsonb_typeof(entry_data) = 'object'
  );

GRANT SELECT, UPDATE ON public.log_entries TO authenticated;
GRANT SELECT, INSERT ON public.entry_revisions TO anon, authenticated;
GRANT SELECT ON public.flight_signatures TO authenticated;

INSERT INTO public.log_entries (
  id, user_id, date, role, aircraft_category_class, aircraft_make_model,
  registration, departure, destination, remarks, pic_name
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-02',
  'PIC',
  'ASEL',
  'C172',
  'N12345',
  'KSEA',
  'KPDX',
  'original remarks',
  'Ada'
);

INSERT INTO public.log_entries (
  id, user_id, date, role, aircraft_category_class, aircraft_make_model,
  registration, departure, destination, remarks
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-03',
  'SIC',
  'ASEL',
  'C172',
  'N12345',
  'KPDX',
  'KSEA',
  'signed remarks'
);

INSERT INTO public.flight_signatures (log_entry_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Owner edit writes a real snapshot through the permissive policy.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
UPDATE public.log_entries
SET remarks = 'edited remarks'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

-- The reported hole: anon plants a snapshot for someone else's entry.
SET ROLE anon;
INSERT INTO public.entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  50,
  jsonb_build_object(
    'user_id', '22222222-2222-2222-2222-222222222222',
    'remarks', 'forged',
    'date', '2026-01-02'
  ),
  'forged-hash',
  '22222222-2222-2222-2222-222222222222',
  'planted'
);
RESET ROLE;

CREATE TEMP TABLE revision_before AS
SELECT id, entry_id, version, entry_data, data_hash, created_by, reason
FROM public.entry_revisions;

\ir ../migrations/20261008000078_lock_entry_revision_inserts.sql

DO $$
DECLARE
  v_changed INTEGER;
  v_before INTEGER;
  v_after INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_entry_with_revision_and_hash'
      AND p.prosecdef
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg
        WHERE cfg LIKE 'search_path=public, pg_catalog, pg_temp%'
      )
  ) THEN
    RAISE EXCEPTION 'revision trigger function is not security definer with pinned search_path';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entry_revisions'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'entry_revisions still has an INSERT policy';
  END IF;

  IF has_table_privilege('anon', 'public.entry_revisions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.entry_revisions', 'INSERT') THEN
    RAISE EXCEPTION 'anon or authenticated can still INSERT entry_revisions';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.entry_revisions', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated lost SELECT on entry_revisions';
  END IF;

  SELECT count(*) INTO v_before FROM revision_before;
  SELECT count(*) INTO v_after FROM public.entry_revisions;
  IF v_before <> v_after THEN
    RAISE EXCEPTION 'migration changed revision row count (% -> %)', v_before, v_after;
  END IF;

  SELECT count(*) INTO v_changed
  FROM public.entry_revisions r
  JOIN revision_before b ON b.id = r.id
  WHERE r.entry_data IS DISTINCT FROM b.entry_data
     OR r.version IS DISTINCT FROM b.version
     OR r.data_hash IS DISTINCT FROM b.data_hash
     OR r.created_by IS DISTINCT FROM b.created_by
     OR r.reason IS DISTINCT FROM b.reason;

  IF v_changed <> 0 THEN
    RAISE EXCEPTION 'migration rewrote % existing revision rows', v_changed;
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    INSERT INTO public.entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
    VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      77,
      '{"user_id":"11111111-1111-1111-1111-111111111111","remarks":"later forge"}'::jsonb,
      'later',
      '22222222-2222-2222-2222-222222222222',
      'planted after'
    );
    RAISE EXCEPTION 'anon insert succeeded after lockdown';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  BEGIN
    INSERT INTO public.entry_revisions (entry_id, version, entry_data, data_hash, created_by, reason)
    VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      78,
      '{"user_id":"11111111-1111-1111-1111-111111111111","remarks":"auth forge"}'::jsonb,
      'later',
      '11111111-1111-1111-1111-111111111111',
      'planted after'
    );
    RAISE EXCEPTION 'authenticated insert succeeded after lockdown';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END $$;

-- Owner edit still snapshots the real previous row and bumps version.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
UPDATE public.log_entries
SET remarks = 'second edit'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

DO $$
DECLARE
  v_version INTEGER;
  v_snapshot TEXT;
BEGIN
  SELECT version INTO v_version
  FROM public.log_entries
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF v_version <> 3 THEN
    RAISE EXCEPTION 'expected version 3 after two edits, got %', v_version;
  END IF;

  SELECT entry_data->>'remarks' INTO v_snapshot
  FROM public.entry_revisions
  WHERE entry_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND version = 1;

  IF v_snapshot IS DISTINCT FROM 'original remarks' THEN
    RAISE EXCEPTION 'version 1 snapshot was not the original remarks (got %)', v_snapshot;
  END IF;

  SELECT entry_data->>'remarks' INTO v_snapshot
  FROM public.entry_revisions
  WHERE entry_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND version = 2;

  IF v_snapshot IS DISTINCT FROM 'edited remarks' THEN
    RAISE EXCEPTION 'version 2 snapshot was skipped or forged (got %)', v_snapshot;
  END IF;
END $$;

-- Signed rows stay immutable.
DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    UPDATE public.log_entries
    SET remarks = 'should not stick'
    WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    RAISE EXCEPTION 'signed entry update succeeded';
  EXCEPTION
    WHEN integrity_constraint_violation THEN
      NULL;
  END;
END $$;

DO $$
DECLARE
  v_remarks TEXT;
BEGIN
  SELECT remarks INTO v_remarks
  FROM public.log_entries
  WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF v_remarks IS DISTINCT FROM 'signed remarks' THEN
    RAISE EXCEPTION 'signed remarks changed to %', v_remarks;
  END IF;
END $$;

-- Restore own unsigned history.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
SELECT public.restore_log_entry_revision(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1
);
RESET ROLE;

DO $$
DECLARE
  v_remarks TEXT;
  v_pic TEXT;
BEGIN
  SELECT remarks, pic_name INTO v_remarks, v_pic
  FROM public.log_entries
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF v_remarks IS DISTINCT FROM 'original remarks' OR v_pic IS DISTINCT FROM 'Ada' THEN
    RAISE EXCEPTION 'restore did not return original remarks/pic (%, %)', v_remarks, v_pic;
  END IF;
END $$;

-- Another user cannot restore this entry.
DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  BEGIN
    PERFORM public.restore_log_entry_revision(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      1
    );
    RAISE EXCEPTION 'other user restored the entry';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'not authorized' THEN
        RAISE;
      END IF;
  END;
END $$;

-- Owner cannot restore a snapshot whose user_id is not theirs.
DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    PERFORM public.restore_log_entry_revision(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      50
    );
    RAISE EXCEPTION 'foreign snapshot was restored';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'not authorized' THEN
        RAISE;
      END IF;
  END;
END $$;

-- Signed entry cannot be restored.
DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  BEGIN
    PERFORM public.restore_log_entry_revision(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      1
    );
    RAISE EXCEPTION 'signed entry was restored';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'Signed log entries cannot be restored; use amend or void instead' THEN
        RAISE;
      END IF;
  END;
END $$;

-- History SELECT still works for the owner and hides the row from someone else.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.entry_revisions
  WHERE entry_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF v_count < 2 THEN
    RAISE EXCEPTION 'owner could not read revision history (% rows)', v_count;
  END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM public.entry_revisions;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'other user can read revisions (% rows)', v_count;
  END IF;
END $$;
RESET ROLE;
