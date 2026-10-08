import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  __dirname,
  '../../supabase/migrations/20261008000078_lock_entry_revision_inserts.sql'
)
const migration = readFileSync(migrationPath, 'utf8')

describe('entry revision insert lockdown migration', () => {
  it('makes the revision trigger insert as definer with a pinned search_path', () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.update_entry_with_revision_and_hash\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_catalog, pg_temp/
    )
    expect(migration).toMatch(/ON CONFLICT \(entry_id, version\) DO NOTHING/)
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.update_entry_with_revision_and_hash\(\) FROM PUBLIC, anon, authenticated/
    )
  })

  it('drops the client insert policy and revokes anon and authenticated insert', () => {
    expect(migration).toMatch(
      /DROP POLICY IF EXISTS "Allow revision inserts via trigger" ON public\.entry_revisions/
    )
    expect(migration).toMatch(
      /REVOKE INSERT ON TABLE public\.entry_revisions FROM PUBLIC, anon, authenticated/
    )
    expect(migration).not.toMatch(/CREATE POLICY "Allow revision inserts via trigger"/)
  })

  it('keeps restore limited to a revision owned by the caller', () => {
    expect(migration).toMatch(/v_owner_id <> v_user_id/)
    expect(migration).toMatch(/JOIN log_entries le ON le\.id = er\.entry_id/)
    expect(migration).toMatch(/le\.user_id = v_user_id/)
    expect(migration).toMatch(
      /\(v_entry_data->>'user_id'\) IS DISTINCT FROM v_user_id::text/
    )
    expect(migration).toMatch(/AND user_id = v_user_id/)
    expect(migration).toMatch(
      /Signed log entries cannot be restored; use amend or void instead/
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.restore_log_entry_revision\(UUID, INTEGER\) TO authenticated/
    )
  })

  it('does not rewrite existing revision rows', () => {
    const sql = migration
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(sql).not.toMatch(/\bDELETE\s+FROM\s+(public\.)?entry_revisions\b/i)
    expect(sql).not.toMatch(/\bUPDATE\s+(public\.)?entry_revisions\b/i)
    expect(sql).not.toMatch(/\bTRUNCATE\s+(TABLE\s+)?(public\.)?entry_revisions\b/i)
  })
})
