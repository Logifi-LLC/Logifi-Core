-- Performance Advisor:
-- 1. Wrap auth.uid() in (select auth.uid()) so Postgres caches JWT uid once per statement
-- 2. Combine instructor_student_relationships UPDATE policies (one permissive policy)
-- 3. Covering indexes for unindexed foreign keys
--
-- Unused-index suggestions are intentionally not dropped.

-- ============================================================================
-- FK covering indexes (leading column = FK)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_digifi_spread_charges_first_scan_session_id
  ON public.digifi_spread_charges (first_scan_session_id);

CREATE INDEX IF NOT EXISTS idx_entry_revisions_created_by
  ON public.entry_revisions (created_by);

CREATE INDEX IF NOT EXISTS idx_guest_sign_sessions_log_entry_id
  ON public.guest_sign_sessions (log_entry_id);

CREATE INDEX IF NOT EXISTS idx_log_entries_amends_entry_id_fk
  ON public.log_entries (amends_entry_id)
  WHERE amends_entry_id IS NOT NULL;

-- ============================================================================
-- log_entries
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own entries" ON public.log_entries;
CREATE POLICY "Users can view own entries"
  ON public.log_entries FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON public.log_entries;
CREATE POLICY "Users can insert own entries"
  ON public.log_entries FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON public.log_entries;
CREATE POLICY "Users can update own entries"
  ON public.log_entries FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON public.log_entries;
CREATE POLICY "Users can delete own entries"
  ON public.log_entries FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- audit_logs / entry_revisions (SELECT only; trigger insert/update policies
-- do not call auth.uid())
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries
      WHERE log_entries.id = audit_logs.entry_id
        AND log_entries.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own entry revisions" ON public.entry_revisions;
CREATE POLICY "Users can view own entry revisions"
  ON public.entry_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.log_entries
      WHERE log_entries.id = entry_revisions.entry_id
        AND log_entries.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- exports / archives
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own exports" ON public.exports;
CREATE POLICY "Users can view own exports"
  ON public.exports FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own archives" ON public.archives;
CREATE POLICY "Users can view own archives"
  ON public.archives FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- user_profiles / crew_profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can manage own crew profiles" ON public.crew_profiles;
CREATE POLICY "Users can manage own crew profiles"
  ON public.crew_profiles FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- import_batches
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own import batches" ON public.import_batches;
CREATE POLICY "Users can view own import batches"
  ON public.import_batches FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own import batches" ON public.import_batches;
CREATE POLICY "Users can insert own import batches"
  ON public.import_batches FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own import batches" ON public.import_batches;
CREATE POLICY "Users can update own import batches"
  ON public.import_batches FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own import batches" ON public.import_batches;
CREATE POLICY "Users can delete own import batches"
  ON public.import_batches FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- catalog_entity_tags / user_tag_presets / logbook_builder_templates
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own catalog entity tags" ON public.catalog_entity_tags;
CREATE POLICY "Users can view own catalog entity tags"
  ON public.catalog_entity_tags FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own catalog entity tags" ON public.catalog_entity_tags;
CREATE POLICY "Users can insert own catalog entity tags"
  ON public.catalog_entity_tags FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own catalog entity tags" ON public.catalog_entity_tags;
CREATE POLICY "Users can update own catalog entity tags"
  ON public.catalog_entity_tags FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own catalog entity tags" ON public.catalog_entity_tags;
CREATE POLICY "Users can delete own catalog entity tags"
  ON public.catalog_entity_tags FOR DELETE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own tag presets" ON public.user_tag_presets;
CREATE POLICY "Users can view own tag presets"
  ON public.user_tag_presets FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own tag presets" ON public.user_tag_presets;
CREATE POLICY "Users can insert own tag presets"
  ON public.user_tag_presets FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own tag presets" ON public.user_tag_presets;
CREATE POLICY "Users can delete own tag presets"
  ON public.user_tag_presets FOR DELETE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own logbook builder templates" ON public.logbook_builder_templates;
CREATE POLICY "Users can view own logbook builder templates"
  ON public.logbook_builder_templates FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own logbook builder templates" ON public.logbook_builder_templates;
CREATE POLICY "Users can insert own logbook builder templates"
  ON public.logbook_builder_templates FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own logbook builder templates" ON public.logbook_builder_templates;
CREATE POLICY "Users can update own logbook builder templates"
  ON public.logbook_builder_templates FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own logbook builder templates" ON public.logbook_builder_templates;
CREATE POLICY "Users can delete own logbook builder templates"
  ON public.logbook_builder_templates FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- fcv_integrations
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can view own fcv integration"
  ON public.fcv_integrations FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can insert own fcv integration"
  ON public.fcv_integrations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can update own fcv integration"
  ON public.fcv_integrations FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own fcv integration" ON public.fcv_integrations;
CREATE POLICY "Users can delete own fcv integration"
  ON public.fcv_integrations FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- instructor_student_relationships (merge UPDATE policies)
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view their relationships"
  ON public.instructor_student_relationships;
CREATE POLICY "Participants can view their relationships"
  ON public.instructor_student_relationships FOR SELECT
  USING (
    (select auth.uid()) = student_id
    OR (select auth.uid()) = instructor_id
  );

DROP POLICY IF EXISTS "Instructors can accept pending links"
  ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Participants can revoke relationships"
  ON public.instructor_student_relationships;

CREATE POLICY "Participants can update relationships"
  ON public.instructor_student_relationships FOR UPDATE
  USING (
    (
      (select auth.uid()) = instructor_id
      AND status = 'PENDING'
    )
    OR (
      ((select auth.uid()) = student_id OR (select auth.uid()) = instructor_id)
      AND status IN ('PENDING', 'ACTIVE')
    )
  )
  WITH CHECK (
    (
      (select auth.uid()) = instructor_id
      AND status = 'ACTIVE'
    )
    OR (
      ((select auth.uid()) = student_id OR (select auth.uid()) = instructor_id)
      AND status = 'REVOKED'
    )
  );

-- ============================================================================
-- flight_signatures
-- ============================================================================

DROP POLICY IF EXISTS "Owners signers and active instructors can view signatures"
  ON public.flight_signatures;
CREATE POLICY "Owners signers and active instructors can view signatures"
  ON public.flight_signatures FOR SELECT
  USING (
    signer_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.log_entries le
      WHERE le.id = flight_signatures.log_entry_id
        AND le.user_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.log_entries le
      JOIN public.instructor_student_relationships r
        ON r.student_id = le.user_id
       AND r.instructor_id = (select auth.uid())
       AND public.instructor_relationship_is_signable(r.status, r.expires_at)
      WHERE le.id = flight_signatures.log_entry_id
    )
  );

DROP POLICY IF EXISTS "Instructors can insert signatures for linked students"
  ON public.flight_signatures;
CREATE POLICY "Instructors can insert signatures for linked students"
  ON public.flight_signatures FOR INSERT
  WITH CHECK (
    signer_id = (select auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.log_entries le
      JOIN public.instructor_student_relationships r
        ON r.student_id = le.user_id
       AND r.instructor_id = (select auth.uid())
       AND public.instructor_relationship_is_signable(r.status, r.expires_at)
      WHERE le.id = log_entry_id
    )
  );

-- ============================================================================
-- endorsements / guest_sign_sessions / log_entry_deletions
-- ============================================================================

DROP POLICY IF EXISTS "Participants can view their endorsements" ON public.endorsements;
CREATE POLICY "Participants can view their endorsements"
  ON public.endorsements FOR SELECT
  USING (
    (select auth.uid()) = student_id
    OR (select auth.uid()) = instructor_id
  );

DROP POLICY IF EXISTS "Owners can view own guest sign sessions" ON public.guest_sign_sessions;
CREATE POLICY "Owners can view own guest sign sessions"
  ON public.guest_sign_sessions FOR SELECT
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Owners can insert own guest sign sessions" ON public.guest_sign_sessions;
CREATE POLICY "Owners can insert own guest sign sessions"
  ON public.guest_sign_sessions FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Owners can update own guest sign sessions" ON public.guest_sign_sessions;
CREATE POLICY "Owners can update own guest sign sessions"
  ON public.guest_sign_sessions FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own log entry deletions" ON public.log_entry_deletions;
CREATE POLICY "Users can read own log entry deletions"
  ON public.log_entry_deletions FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own log entry deletions" ON public.log_entry_deletions;
CREATE POLICY "Users can insert own log entry deletions"
  ON public.log_entry_deletions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- Digifi / credits
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own digifi correction feedback"
  ON public.digifi_correction_feedback;
CREATE POLICY "Users can view own digifi correction feedback"
  ON public.digifi_correction_feedback FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own digifi correction feedback"
  ON public.digifi_correction_feedback;
CREATE POLICY "Users can insert own digifi correction feedback"
  ON public.digifi_correction_feedback FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own digifi correction feedback"
  ON public.digifi_correction_feedback;
CREATE POLICY "Users can update own digifi correction feedback"
  ON public.digifi_correction_feedback FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own digifi spread charges"
  ON public.digifi_spread_charges;
CREATE POLICY "Users can view own digifi spread charges"
  ON public.digifi_spread_charges FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own credit transactions"
  ON public.credit_transactions;
CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own digifi scan sessions"
  ON public.digifi_scan_sessions;
CREATE POLICY "Users can view own digifi scan sessions"
  ON public.digifi_scan_sessions FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own digifi scan sessions"
  ON public.digifi_scan_sessions;
CREATE POLICY "Users can insert own digifi scan sessions"
  ON public.digifi_scan_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own digifi capture sessions"
  ON public.digifi_capture_sessions;
CREATE POLICY "Users can view own digifi capture sessions"
  ON public.digifi_capture_sessions FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own digifi capture sessions"
  ON public.digifi_capture_sessions;
CREATE POLICY "Users can insert own digifi capture sessions"
  ON public.digifi_capture_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own digifi capture sessions"
  ON public.digifi_capture_sessions;
CREATE POLICY "Users can update own digifi capture sessions"
  ON public.digifi_capture_sessions FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own digifi capture photos"
  ON public.digifi_capture_photos;
CREATE POLICY "Users can view own digifi capture photos"
  ON public.digifi_capture_photos FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own digifi capture photos"
  ON public.digifi_capture_photos;
CREATE POLICY "Users can insert own digifi capture photos"
  ON public.digifi_capture_photos FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
