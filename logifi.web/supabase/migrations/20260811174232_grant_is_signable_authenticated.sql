-- Hotfix: instructor_relationship_is_signable is invoked from flight_signatures
-- RLS (as the current user). Revoking EXECUTE from authenticated broke tag/save
-- flows that refresh signatures. Keep PUBLIC/anon revoked.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'instructor_relationship_is_signable'
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.instructor_relationship_is_signable(%s) TO authenticated',
      r.args
    );
  END LOOP;
END $$;
