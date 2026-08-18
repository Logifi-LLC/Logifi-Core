# Logifi-Core

Open-source digital flight logbook. Import/export, Digifi paper scanning, FLICA schedule import, AC 120-78B audit trail.

## Features

- **AC 120-78B design**: Audit trail, amend/void signed rows, export with compliance metadata
- **Import/export**: CSV, JSON, Form 8710 PDF
- **Digifi**: Paper logbook scanning (pay-per-spread credits)
- **Offline**: Local-first with IndexedDB cache and cloud sync
- **Currency**: Part 61.57 tracking (90-day passenger/night, 6-month instrument)
- **Validation**: Part 61 field checks

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
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[TODO.txt](TODO.txt)** - Current product work
- **[docs/oss-ui-and-architecture-guardrails.md](docs/oss-ui-and-architecture-guardrails.md)** - UI and code-structure contribution guardrails

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

- **Frontend**: Nuxt 4, Vue 3, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Storage**: IndexedDB (local) + Supabase (cloud)
- **Testing**: Vitest, Playwright

## Community

- **Discord**: [discord.gg/hBaDkNt2ev](https://discord.gg/hBaDkNt2ev)
- **Website**: [www.logifi.io](https://www.logifi.io)

Target PRs at `dev`, not `main`.

## Roadmap

Current work lives in [TODO.txt](TODO.txt). Product direction lives in [BUSINESS_CONTEXT.md](BUSINESS_CONTEXT.md).

## License

[License information]

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for scope, boundaries, and PR process.
