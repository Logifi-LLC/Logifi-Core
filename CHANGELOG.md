# Changelog

All notable changes to Logifi-Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added - Phase 1 Release

#### Core Features
- Supabase backend integration with PostgreSQL database
- User authentication (sign up, sign in, session management)
- Local-first architecture with IndexedDB for offline storage
- Automatic sync with conflict resolution (last-write-wins)

#### Data Management
- CSV import with preview and validation
- JSON import with preview and validation
- Drag-and-drop file import support
- Import batch tracking and metadata
- Duplicate detection and resolution
- Automatic migration from localStorage to Supabase

#### Compliance Features
- AC 120-78B compliance checklist
  - Revision History / Audit Trail (complete)
  - Data Integrity / Tamper Protection (SHA-256 hashing)
  - Signer Identity Recording (user_id tracking)
  - Export and Secured Archival (complete)
  - Electronic Signatures (deferred to Phase 2)
- 14 CFR Part 61 compliance checklist
  - Required fields validation
  - Recordkeeping requirements
  - Currency tracking
- Complete audit trail system
  - Automatic change tracking
  - Before/after value comparison
  - User and timestamp tracking
- Data integrity protection
  - SHA-256 hash computation
  - Version tracking
  - Revision snapshots
  - Integrity validation

#### Currency Tracking
- 90-day passenger currency (Part 61.57(a))
- 90-day night currency (Part 61.57(b))
- 6-month instrument currency (Part 61.57(c))
- Annual requirements framework (Part 61.57(d))
- Currency dashboard with status indicators
- Expiration date tracking
- Progress indicators

#### Export Features
- CSV export with metadata
- JSON export with full audit trail
- Form 8710 PDF generation
- Export metadata tracking
- Compliance metadata in exports

#### Validation
- Date validation (future dates, reasonable ranges)
- Flight time validation (totals, breakdowns, consistency)
- Cross-country validation (distance calculation)
- Part 61 required fields validation
- Airport code validation
- Aircraft registration validation
- Numeric precision validation
- Chronological order validation

#### Utilities
- Night time calculation (civil twilight-based)
- Form 8710 calculator (Section II and III)
- Solar calculator for twilight times
- Airport and aircraft lookup APIs
- Currency calculations

#### UI/UX
- Dark mode support
- Responsive design
- Dashboard with flight statistics
- Pilot profile preferences
- Settings panel
- Compliance checklist component
- Currency dashboard component
- Audit trail viewer
- Import preview modal

#### Testing
- Vitest unit test framework
- Playwright E2E test framework
- Test infrastructure setup
- Unit tests for utilities
- Integration tests for composables
- E2E test structure

#### Documentation
- User guide (USER_GUIDE.md)
- Schema documentation (SCHEMA.md)
- API reference (API.md)
- Setup instructions
- Migration guide

### Technical Details

#### Database
- 15 migrations creating complete schema
- Row Level Security (RLS) policies
- Automatic triggers for audit, revisions, and hashing
- IndexedDB for local storage
- Supabase for cloud storage and sync

#### Architecture
- Nuxt 3 framework
- Vue 3 Composition API
- TypeScript
- Tailwind CSS
- Local-first architecture
- Background sync with retry logic

### Known Limitations

- Electronic signatures deferred to Phase 2
- Student/instructor update features deferred to Phase 2
- Full non-repudiation requires signatures (Phase 2)
- Some E2E tests are placeholder structures (to be expanded)

### Breaking Changes

None - this is the initial Phase 1 release.

### Migration Notes

- Existing localStorage data is automatically migrated to Supabase on first sign-in
- No manual migration required for users with localStorage data
- Database migrations should be run in order for new installations

---

## [Unreleased]

### Planned for Phase 2
- Electronic signatures
- Student/instructor update workflow
- Enhanced non-repudiation features
- Additional currency requirements
- Enhanced testing coverage
