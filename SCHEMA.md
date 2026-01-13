# Database Schema Documentation

## Overview

Logifi uses Supabase (PostgreSQL) as the backend database. The schema is designed to support AC 120-78B compliance requirements including audit trails, data integrity, and import tracking.

## Tables

### log_entries

The main table storing flight log entries.

**Primary Key**: `id` (UUID)

**Columns**:
- `id` (UUID): Primary key, auto-generated
- `user_id` (UUID): Foreign key to `auth.users`, identifies the entry owner
- `date` (DATE): Flight date (required, cannot be in future)
- `role` (TEXT): Pilot role (PIC, SIC, Dual Received, Solo, etc.)
- `aircraft_category_class` (TEXT): Aircraft category and class
- `category_class_time` (NUMERIC(5,2)): Time in this category/class
- `aircraft_make_model` (TEXT): Aircraft make and model (required)
- `registration` (TEXT): Aircraft registration (required, N-number format)
- `flight_number` (TEXT): Flight number (optional)
- `departure` (TEXT): Departure airport code (required)
- `destination` (TEXT): Destination airport code (required)
- `route` (TEXT): Flight route (optional)
- `training_elements` (TEXT): Training elements completed
- `training_instructor` (TEXT): Instructor name
- `instructor_certificate` (TEXT): Instructor certificate number
- `flight_conditions` (TEXT[]): Array of flight conditions (VFR, IFR, night, etc.)
- `remarks` (TEXT): Additional remarks
- `flight_time` (JSONB): Flight time breakdown (total, PIC, SIC, dual, solo, night, instrument, cross-country, etc.)
- `performance` (JSONB): Performance metrics (takeoffs, landings, approaches, etc.)
- `oooi` (JSONB): Out/Off/On/In times
- `flagged` (BOOLEAN): Flagged for review
- `created_at` (TIMESTAMPTZ): Entry creation timestamp
- `updated_at` (TIMESTAMPTZ): Entry last update timestamp
- `data_hash` (TEXT): SHA-256 hash of entry data for integrity verification
- `version` (INTEGER): Entry version number for revision tracking
- `is_imported` (BOOLEAN): Whether entry was imported
- `import_source` (TEXT): Import source (csv, json, paper, etc.)
- `import_batch_id` (UUID): Foreign key to import batch
- `original_entry_date` (TIMESTAMPTZ): Original creation date from source
- `import_metadata` (JSONB): Additional import information

**Constraints**:
- `valid_date`: Date cannot be in the future
- `valid_category_class_time`: Category class time must be non-negative

**Indexes**:
- `idx_log_entries_user_id`: User ID index
- `idx_log_entries_date`: User ID + date (descending)
- `idx_log_entries_registration`: Registration index
- `idx_log_entries_created_at`: User ID + created_at (descending)
- `idx_log_entries_import_batch`: Import batch ID index
- `idx_log_entries_is_imported`: User ID + is_imported index

**Row Level Security (RLS)**:
- Users can only SELECT, INSERT, UPDATE, DELETE their own entries

### audit_logs

Tracks all changes to log entries for compliance and audit purposes.

**Primary Key**: `id` (UUID)

**Columns**:
- `id` (UUID): Primary key
- `entry_id` (UUID): Foreign key to `log_entries`
- `user_id` (UUID): Foreign key to `auth.users`, who made the change
- `action` (TEXT): Action type (create, update, delete, sign, export, restore)
- `old_data` (JSONB): Previous state (for updates/deletes)
- `new_data` (JSONB): New state (for creates/updates)
- `changed_fields` (TEXT[]): Array of field names that changed
- `change_summary` (TEXT): Human-readable summary
- `timestamp` (TIMESTAMPTZ): When the change occurred
- `ip_address` (INET): IP address of the change (optional)
- `user_agent` (TEXT): User agent string (optional)
- `session_id` (TEXT): Session ID (optional)
- `is_compliance_event` (BOOLEAN): Whether this is a compliance event
- `compliance_reason` (TEXT): Reason for compliance event

**Indexes**:
- `idx_audit_logs_entry_id`: Entry ID index
- `idx_audit_logs_user_id`: User ID index
- `idx_audit_logs_timestamp`: Timestamp (descending)
- `idx_audit_logs_action`: Action type index
- `idx_audit_logs_compliance`: Compliance events index

**RLS**: Users can only view audit logs for their own entries

### entry_revisions

Stores revision snapshots for data integrity and restoration.

**Primary Key**: `id` (UUID)

**Columns**:
- `id` (UUID): Primary key
- `entry_id` (UUID): Foreign key to `log_entries`
- `version` (INTEGER): Revision version number
- `data` (JSONB): Complete entry data at this revision
- `data_hash` (TEXT): SHA-256 hash of revision data
- `created_at` (TIMESTAMPTZ): Revision creation timestamp

**Indexes**:
- `idx_entry_revisions_entry_id`: Entry ID index
- `idx_entry_revisions_entry_version`: Entry ID + version (unique)

**RLS**: Users can only view revisions for their own entries

### user_profiles

User profile information.

**Primary Key**: `id` (UUID, references `auth.users.id`)

**Columns**:
- `id` (UUID): Primary key, references auth.users
- `created_at` (TIMESTAMPTZ): Profile creation timestamp
- `updated_at` (TIMESTAMPTZ): Profile last update timestamp

**RLS**: Users can only view/update their own profile

### import_batches

Tracks import batches for compliance and organization.

**Primary Key**: `id` (UUID)

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to `auth.users`
- `import_source` (TEXT): Source type (csv, json, etc.)
- `import_metadata` (JSONB): Import metadata
- `entry_count` (INTEGER): Number of entries imported
- `created_at` (TIMESTAMPTZ): Import timestamp

**RLS**: Users can only view their own import batches

### exports

Tracks export operations for compliance.

**Primary Key**: `id` (UUID)

**Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to `auth.users`
- `export_type` (TEXT): Export type (csv, json, pdf_8710)
- `export_metadata` (JSONB): Export metadata
- `entry_count` (INTEGER): Number of entries exported
- `created_at` (TIMESTAMPTZ): Export timestamp

**RLS**: Users can only view their own exports

## Data Integrity

### Hash Computation

- Each entry has a `data_hash` field containing a SHA-256 hash of the entry data
- Hash is computed using normalized JSON (alphabetical key order)
- Hash includes the entry version number
- Used to detect tampering or data corruption

### Version Tracking

- Each entry has a `version` field that increments on each update
- Version numbers ensure proper conflict resolution in sync operations
- Version is included in hash computation

### Revision System

- Each update creates a revision snapshot in `entry_revisions`
- Revisions allow viewing and restoring previous versions
- Revision data includes complete entry state at that version

## Migrations

All migrations are stored in `logifi.web/supabase/migrations/` and should be run in order:

1. **20240101000001_initial_logbook_schema.sql**: Initial schema with log_entries table
2. **20240101000002_audit_trail.sql**: Audit log table and triggers
3. **20240101000003_data_integrity.sql**: Data integrity (hashing) and revision system
4. **20240101000004_exports_archival.sql**: Exports and archival tables
5. **20240101000005_user_profiles.sql**: User profiles table
6. **20240101000006_helper_functions.sql**: Helper functions for data processing
7. **20240101000007_import_tracking.sql**: Import tracking tables and fields
8. **20240101000008_fix_rls_policies.sql**: RLS policy fixes
9. **20240101000009_auto_create_user_profile.sql**: Auto-create user profile trigger
10. **20240101000010_fix_audit_logs_insert.sql**: Fix audit logs insert RLS
11. **20240101000011_add_import_batches_rls_policies.sql**: Import batches RLS policies
12. **20240101000021_consolidate_hash_functions.sql**: Consolidate hash computation functions
13. **20240101000022_recompute_existing_hashes.sql**: Recompute existing hashes with new function
14. **20240101000023_combine_revision_and_hash_triggers.sql**: Combine revision and hash triggers
15. **20240101000024_remove_debug_features.sql**: Remove debug features and cleanup

## Triggers

### update_log_entries_updated_at

Automatically updates the `updated_at` timestamp when an entry is modified.

### log_entry_changes

Automatically creates audit log entries when log entries are created, updated, or deleted.

### create_entry_revision_and_hash

Automatically creates revision snapshots and computes data hashes when entries are updated.

### auto_create_user_profile

Automatically creates a user profile when a user signs up.

## Relationships

```
auth.users
  ├── user_profiles (1:1)
  ├── log_entries (1:many)
  ├── audit_logs (1:many)
  ├── import_batches (1:many)
  └── exports (1:many)

log_entries
  ├── audit_logs (1:many)
  ├── entry_revisions (1:many)
  └── import_batches (many:1, via import_batch_id)
```

## Performance Considerations

1. **Indexes**: Key indexes are created on frequently queried columns (user_id, date, entry_id, etc.)
2. **JSONB**: Flight time, performance, and metadata stored as JSONB for flexibility and performance
3. **Partitioning**: Consider partitioning audit_logs by timestamp for very large datasets
4. **Archival**: Export tables support data archival for compliance retention

## Security

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data
2. **Auth Integration**: User authentication is handled by Supabase Auth
3. **Data Hashing**: SHA-256 hashing ensures data integrity
4. **Audit Trail**: Complete audit trail of all changes for compliance

## Migration Guide

### Running Migrations

Migrations should be run in order using the Supabase CLI or Supabase dashboard:

```bash
# Using Supabase CLI
supabase db reset  # Resets and runs all migrations
supabase migration up  # Runs pending migrations
```

### Migration Dependencies

- Migration 001 must run first (initial schema)
- Migration 002 depends on 001 (audit_logs references log_entries)
- Migration 003 depends on 001 and 002 (revisions reference entries, uses audit triggers)
- Migrations 021-024 are refactoring migrations that should run after core migrations

### Backward Compatibility

- Migrations 021-024 refactor existing functionality but maintain backward compatibility
- Hash computation changes (022) recompute all existing hashes
- Trigger consolidation (023) replaces multiple triggers with a single trigger

## API Contracts

### Supabase Client Usage

The application uses the Supabase JavaScript client to interact with the database. All queries respect RLS policies automatically.

### Key Operations

1. **Read Entries**: `supabase.from('log_entries').select('*').eq('user_id', userId).order('date', { ascending: false })`
2. **Create Entry**: `supabase.from('log_entries').insert(entryData)`
3. **Update Entry**: `supabase.from('log_entries').update(updateData).eq('id', entryId)`
4. **Delete Entry**: `supabase.from('log_entries').delete().eq('id', entryId)`
5. **Get Audit Trail**: `supabase.from('audit_logs').select('*').eq('entry_id', entryId).order('timestamp', { ascending: false })`

### Automatic Features

- Timestamps (`created_at`, `updated_at`) are automatically managed
- Audit logs are automatically created by triggers
- Revisions are automatically created by triggers
- Data hashes are automatically computed by triggers
- User profiles are automatically created when users sign up
