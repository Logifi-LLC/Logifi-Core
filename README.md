# Logifi-Core

The open-source core digital flight logbook used by Logifi.io. Community driven, pilot focused.

**Phase 1 Complete** - AC 120-78B compliant digital flight logbook with data migration, compliance features, and export capabilities.

## Features

### ✅ Phase 1 Features

- **AC 120-78B Compliance**: Complete audit trail, data integrity protection, and export capabilities
- **Data Migration**: Import from CSV/JSON, automatic localStorage migration
- **Offline Support**: Local-first architecture with automatic cloud sync
- **Currency Tracking**: Part 61.57 currency requirements (90-day passenger/night, 6-month instrument)
- **Export**: CSV, JSON, and Form 8710 PDF export with compliance metadata
- **Validation**: Comprehensive validation for Part 61 requirements
- **Audit Trail**: Complete change history with before/after values
- **Data Integrity**: SHA-256 hashing and version tracking

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (for backend)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd logifi.web
   npm install
   ```
3. Set up environment variables (see `env.example`)
4. Run database migrations in Supabase
5. Start development server:
   ```bash
   npm run dev
   ```

See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for detailed setup instructions.

## Documentation

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user guide with step-by-step instructions
- **[SCHEMA.md](SCHEMA.md)** - Database schema documentation
- **[API.md](API.md)** - API reference for developers
- **[PHASE1_ROADMAP.md](PHASE1_ROADMAP.md)** - Development roadmap and status
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Phase 1 release notes
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

## Testing

Run tests:

```bash
# Unit and integration tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## Technology Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Storage**: IndexedDB (local) + Supabase (cloud)
- **Testing**: Vitest, Playwright

## Community

- **Discord**: https://discord.com/invite/cpqzYrD5F
- **Website**: www.logifi.io

## Roadmap

### Phase 2 (Planned)
- Electronic signatures
- Student/instructor update workflow
- Enhanced non-repudiation features
- Additional currency requirements

See [PHASE1_ROADMAP.md](PHASE1_ROADMAP.md) for detailed roadmap.

## License

[License information]

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Current Version**: 1.0.0 (Phase 1)  
**Status**: Production Ready