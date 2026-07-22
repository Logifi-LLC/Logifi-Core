-- Main vs linked CFI (no expiry). Migrate primary/substitute → main/linked.

-- ============================================================================
-- Kind values + clear expiry
-- ============================================================================

ALTER TABLE instructor_student_relationships
  DROP CONSTRAINT IF EXISTS instructor_student_relationships_kind_check;

UPDATE instructor_student_relationships
SET relationship_kind = CASE relationship_kind
  WHEN 'primary' THEN 'main'
  WHEN 'substitute' THEN 'linked'
  WHEN 'main' THEN 'main'
  WHEN 'linked' THEN 'linked'
  ELSE 'linked'
END;

UPDATE instructor_student_relationships
SET expires_at = NULL
WHERE expires_at IS NOT NULL;

ALTER TABLE instructor_student_relationships
  ALTER COLUMN relationship_kind SET DEFAULT 'linked';

ALTER TABLE instructor_student_relationships
  ADD CONSTRAINT instructor_student_relationships_kind_check
  CHECK (relationship_kind IN ('main', 'linked'));

COMMENT ON COLUMN instructor_student_relationships.relationship_kind IS
  'main = student''s primary CFI; linked = other linked Logifi instructors (same PIN powers)';

COMMENT ON COLUMN instructor_student_relationships.expires_at IS
  'Deprecated; unused. Signing requires status = ACTIVE only.';

-- Ensure at most one main among ACTIVE rows per student (fix existing data)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY
        CASE WHEN relationship_kind = 'main' THEN 0 ELSE 1 END,
        created_at ASC
    ) AS rn
  FROM instructor_student_relationships
  WHERE status = 'ACTIVE'
)
UPDATE instructor_student_relationships r
SET relationship_kind = CASE WHEN ranked.rn = 1 THEN 'main' ELSE 'linked' END
FROM ranked
WHERE r.id = ranked.id;

-- ============================================================================
-- Signable = ACTIVE only
-- ============================================================================

CREATE OR REPLACE FUNCTION instructor_relationship_is_signable(
  p_status TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status = 'ACTIVE';
$$;

COMMENT ON FUNCTION instructor_relationship_is_signable(TEXT, TIMESTAMPTZ) IS
  'True when roster link status is ACTIVE (expires_at ignored)';

-- ============================================================================
-- Auto-promote first ACTIVE link to main
-- ============================================================================

CREATE OR REPLACE FUNCTION instructor_relationship_assign_main()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ACTIVE') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM instructor_student_relationships r
      WHERE r.student_id = NEW.student_id
        AND r.status = 'ACTIVE'
        AND r.relationship_kind = 'main'
        AND r.id IS DISTINCT FROM NEW.id
    ) THEN
      NEW.relationship_kind := 'main';
    ELSIF NEW.relationship_kind = 'main' THEN
      -- Keep caller-set main; demote others below via set_main RPC
      NULL;
    ELSE
      NEW.relationship_kind := 'linked';
    END IF;
  END IF;

  IF NEW.status = 'REVOKED' AND COALESCE(OLD.relationship_kind, '') = 'main' THEN
    NEW.relationship_kind := 'linked';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instructor_relationship_assign_main ON instructor_student_relationships;
CREATE TRIGGER trg_instructor_relationship_assign_main
  BEFORE INSERT OR UPDATE OF status, relationship_kind
  ON instructor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION instructor_relationship_assign_main();

CREATE OR REPLACE FUNCTION instructor_relationship_promote_main_after_revoke()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_next UUID;
BEGIN
  IF NEW.status = 'REVOKED' AND OLD.status = 'ACTIVE' AND OLD.relationship_kind = 'main' THEN
    SELECT r.id INTO v_next
    FROM instructor_student_relationships r
    WHERE r.student_id = NEW.student_id
      AND r.status = 'ACTIVE'
    ORDER BY r.created_at ASC
    LIMIT 1;

    IF v_next IS NOT NULL THEN
      UPDATE instructor_student_relationships
      SET relationship_kind = 'main'
      WHERE id = v_next;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instructor_relationship_promote_main_after_revoke ON instructor_student_relationships;
CREATE TRIGGER trg_instructor_relationship_promote_main_after_revoke
  AFTER UPDATE OF status
  ON instructor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION instructor_relationship_promote_main_after_revoke();

-- ============================================================================
-- request_instructor_link: email only → linked (main assigned on accept if first)
-- ============================================================================

DROP FUNCTION IF EXISTS request_instructor_link(TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS request_instructor_link(TEXT);

CREATE OR REPLACE FUNCTION request_instructor_link(p_instructor_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_instructor_id UUID;
  v_instructor_role TEXT;
  v_relationship_id UUID;
  v_email TEXT;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_email := lower(trim(COALESCE(p_instructor_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'instructor email is required';
  END IF;

  SELECT u.id INTO v_instructor_id
  FROM auth.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'instructor not found';
  END IF;

  IF v_instructor_id = v_student_id THEN
    RAISE EXCEPTION 'cannot link to yourself';
  END IF;

  SELECT up.role INTO v_instructor_role
  FROM user_profiles up
  WHERE up.id = v_instructor_id;

  IF v_instructor_role IS NULL THEN
    RAISE EXCEPTION 'instructor profile not found';
  END IF;

  IF v_instructor_role NOT IN ('INSTRUCTOR', 'DUAL') THEN
    RAISE EXCEPTION 'target user is not an instructor';
  END IF;

  INSERT INTO instructor_student_relationships (
    student_id,
    instructor_id,
    status,
    relationship_kind,
    expires_at
  )
  VALUES (
    v_student_id,
    v_instructor_id,
    'PENDING',
    'linked',
    NULL
  )
  ON CONFLICT (student_id, instructor_id) DO UPDATE
    SET
      status = CASE
        WHEN instructor_student_relationships.status = 'REVOKED' THEN 'PENDING'
        ELSE instructor_student_relationships.status
      END,
      expires_at = NULL
  RETURNING id INTO v_relationship_id;

  RETURN v_relationship_id;
END;
$$;

REVOKE ALL ON FUNCTION request_instructor_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_instructor_link(TEXT) TO authenticated;

COMMENT ON FUNCTION request_instructor_link(TEXT) IS
  'Student requests a PENDING link to an instructor by email (kind becomes main on first ACTIVE accept)';

-- ============================================================================
-- set_main_instructor
-- ============================================================================

CREATE OR REPLACE FUNCTION set_main_instructor(p_relationship_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_row instructor_student_relationships%ROWTYPE;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_relationship_id IS NULL THEN
    RAISE EXCEPTION 'relationship id is required';
  END IF;

  SELECT * INTO v_row
  FROM instructor_student_relationships
  WHERE id = p_relationship_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'relationship not found';
  END IF;

  IF v_row.student_id IS DISTINCT FROM v_student_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF v_row.status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'only an active instructor link can be set as main';
  END IF;

  UPDATE instructor_student_relationships
  SET relationship_kind = 'linked'
  WHERE student_id = v_student_id
    AND status = 'ACTIVE'
    AND id IS DISTINCT FROM p_relationship_id
    AND relationship_kind = 'main';

  UPDATE instructor_student_relationships
  SET relationship_kind = 'main', expires_at = NULL
  WHERE id = p_relationship_id;
END;
$$;

REVOKE ALL ON FUNCTION set_main_instructor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_main_instructor(UUID) TO authenticated;

COMMENT ON FUNCTION set_main_instructor(UUID) IS
  'Student marks one ACTIVE instructor link as main; others become linked';
