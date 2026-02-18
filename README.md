# Logifi-Core

An open-source, community-driven digital flight logbook built by pilots, for pilots. Logifi-Core provides a robust, AC 120-78B compliant foundation that empowers the aviation community to build the digital logbook tools they need.

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
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment and testing guide (Vercel, Netlify, local tunnels)
- **[RELEASE_NOTES.md](RELEASE_NOTES.md)** - Phase 1 release notes
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[PHASE1_ROADMAP.md](PHASE1_ROADMAP.md)** - Development roadmap and future plans

## Testing

Run tests:
```bash
npm run test          # Unit and integration tests
npm run test:e2e      # End-to-end tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Technology Stack

- **Frontend**: Nuxt 3, Vue 3, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Storage**: IndexedDB (local) + Supabase (cloud)
- **Testing**: Vitest, Playwright

## Community & Governance

Logifi-Core is a community-driven project. We believe the best digital logbook tools emerge when pilots, developers, and aviation enthusiasts collaborate together.

### Get Involved

- **Discord**: Join our [Discord community](https://discord.gg/hBaDkNt2ev) - the primary space for collaboration, discussions, and getting help
- **Website**: Visit [www.logifi.io](https://www.logifi.io) to learn more

### Community-Driven Development

- **The `dev` branch** is where innovation happens. All new features, improvements, and contributions are developed here before being merged to `main`
- **Community shapes the roadmap** - Features and priorities are driven by community needs and contributions
- **Open governance** - Major decisions are discussed transparently with the community

This project thrives because of the collective efforts of pilots and developers who share a vision for better flight logbook software.

## Roadmap

See [PHASE1_ROADMAP.md](PHASE1_ROADMAP.md) for the complete development roadmap and upcoming features.

## License

[License information]

## Contributing

Contributions are what make Logifi-Core great! Whether you're fixing bugs, adding features, improving documentation, or sharing ideas, we welcome your participation.

### How to Contribute

1. **Fork the repository** and create a feature branch from `dev`
2. **Make your changes** following our contribution guidelines
3. **Submit a pull request** to the `dev` branch
4. **Join the discussion** on Discord to share ideas and get feedback

We're especially excited to see contributions from:
- Pilots who can help shape features based on real-world needs
- Developers who can help improve the codebase and add new capabilities
- Anyone passionate about building better tools for the aviation community

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines and code scope information.

---

**Current Version**: 1.0.0 (Phase 1)  
**Status**: Production Ready