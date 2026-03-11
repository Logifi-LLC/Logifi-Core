# Closed-Source Repository Setup Guide

This guide will help you set up your closed-source repository that will contain paid features built on top of Logifi-Core.

## Overview

Your closed-source repository will:
- Contain paid/proprietary features
- Eventually use Git Subtree to include Logifi-Core as a base
- Keep your proprietary code separate from the open-source core

## Step 1: Create Your Closed-Source Repository

### Option A: Start Fresh (Recommended for now)

1. **Create a new repository** (private on GitHub/GitLab):
   ```bash
   # Create a new directory
   mkdir logifi-pro
   cd logifi-pro
   git init
   
   # Create initial structure
   mkdir -p logifi-pro-features
   mkdir -p docs
   ```

2. **Initial structure:**
   ```
   logifi-pro/
   ├── logifi-pro-features/    # Your paid features go here
   ├── docs/                    # Documentation for paid features
   ├── .gitignore
   ├── README.md
   └── package.json (if needed)
   ```

### Option B: Copy Current Logifi-Core (For immediate use)

If you want to start working with the current codebase immediately:

```bash
# Create new repo directory
mkdir logifi-pro
cd logifi-pro
git init

# Copy Logifi-Core (excluding .git)
rsync -av --exclude='.git' --exclude='node_modules' \
  ../Logifi-Core/ ./logifi-core/

# Or use git to preserve history (recommended)
cd logifi-pro
git remote add logifi-core ../Logifi-Core
git fetch logifi-core
git merge --allow-unrelated-histories logifi-core/main --no-commit
# Review and commit when ready
```

## Step 2: Organize Your Repository Structure

Recommended structure for your closed-source repo:

```
logifi-pro/
├── logifi-core/              # Will contain Logifi-Core via subtree (later)
│   └── (empty for now, or copy current code)
│
├── logifi-pro-features/      # Your paid features
│   ├── premium/
│   │   ├── components/       # Premium UI components
│   │   ├── services/         # Premium services
│   │   └── utils/            # Premium utilities
│   ├── subscriptions/        # Subscription management
│   ├── payments/             # Payment processing
│   └── analytics/           # Premium analytics
│
├── config/                   # Configuration files
│   ├── .env.production       # Production secrets (gitignored)
│   └── feature-flags.ts      # Feature flags
│
├── docs/
│   ├── ARCHITECTURE.md       # How core + pro features integrate
│   └── DEPLOYMENT.md         # Deployment instructions
│
├── .gitignore
├── README.md
└── package.json
```

## Step 3: Set Up .gitignore

Create a comprehensive `.gitignore` for your closed-source repo:

```gitignore
# Environment files
.env
.env.*
!.env.example
!.env.production.example

# Secrets and keys
*.pem
*.key
secrets/
credentials/

# Node
node_modules/
.pnpm-store/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
.output/
.nuxt/
.nitro/
.cache/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
*.tmp
```

## Step 4: Create Initial README

Your closed-source repo README should explain:

```markdown
# Logifi Pro

Private repository containing premium features for Logifi.

## Structure

- `logifi-core/` - Open-source core (via Git Subtree)
- `logifi-pro-features/` - Premium/proprietary features

## Development

[Your development instructions]

## Deployment

[Your deployment instructions]
```

## Step 5: Transfer Code (If Needed)

If you want to move some code from Logifi-Core to your closed repo now:

1. **Identify what to move:**
   - Paid feature code
   - Proprietary integrations
   - Subscription/payment logic
   - Premium analytics

2. **Copy files:**
   ```bash
   # Example: Moving a premium feature
   cp -r logifi-core/logifi.web/app/composables/usePremiumFeature.ts \
        logifi-pro-features/premium/composables/
   ```

3. **Update imports:**
   - Update any imports in your closed-source code
   - Ensure feature flags are set up

## Step 6: Set Up Feature Flags

Create a feature flag system to separate core from premium:

```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  // Core features (always enabled)
  CORE_LOGBOOK: true,
  CORE_EXPORT: true,
  
  // Premium features (controlled)
  PREMIUM_ANALYTICS: process.env.ENABLE_PREMIUM_ANALYTICS === 'true',
  PREMIUM_SYNC: process.env.ENABLE_PREMIUM_SYNC === 'true',
  PREMIUM_REPORTS: process.env.ENABLE_PREMIUM_REPORTS === 'true',
} as const;
```

## Step 7: Development Workflow

### Current Workflow (Before Subtree Merge)

1. Work in Logifi-Core for core features
2. Work in logifi-pro for premium features
3. Keep them separate until ready to merge

### Future Workflow (After Subtree Merge)

1. Core changes → Push to Logifi-Core repo
2. Pull updates into logifi-pro via subtree
3. Premium changes → Commit directly to logifi-pro

## Step 8: Environment Setup

Create environment files:

```bash
# .env.example
# Core (from Logifi-Core)
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=

# Premium features
ENABLE_PREMIUM_ANALYTICS=false
ENABLE_PREMIUM_SYNC=false
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

## Step 9: Deployment & Testing

Before releasing to production, you'll want to test your application. See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

### Testing Before Public Release

Use preview deployments to share test versions with stakeholders:

1. **Set up preview deployment** (recommended: Vercel or Netlify)
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions
   - Configure environment variables for your test Supabase project
   - Create preview URLs for each test version

2. **Security considerations:**
   - Use a separate Supabase project for testing (not production)
   - Protect preview URLs if needed (password protection available on paid plans)
   - Never commit `.env` files or secrets
   - Use platform-specific environment variable management

3. **Deployment options:**
   - **Vercel** (Recommended): Automatic preview deployments, easy environment variable management
   - **Netlify**: Similar to Vercel, good for static hosting
   - **Local Tunnels**: Quick testing with ngrok or localtunnel (temporary URLs)

4. **Workflow:**
   ```bash
   # Create test branch
   git checkout -b test-version
   
   # Deploy preview (Vercel example)
   vercel --prod=false
   
   # Share preview URL with testers
   # Gather feedback
   # Fix issues and redeploy
   ```

### Production Deployment

When ready for production:

1. Review [DEPLOYMENT.md](DEPLOYMENT.md) production deployment section
2. Ensure all environment variables are set correctly
3. Use production Supabase project credentials
4. Deploy to production:
   ```bash
   # Vercel
   vercel --prod
   
   # Netlify
   netlify deploy --prod
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Next Steps

1. ✅ Set up your closed-source repository structure
2. ✅ Transfer any premium code you want to work on
3. ✅ Set up feature flags
4. ✅ Test your setup
5. ✅ Set up deployment infrastructure (see [DEPLOYMENT.md](DEPLOYMENT.md))
6. ⏳ When ready, follow `GIT_SUBTREE_MERGE_GUIDE.md` to merge Logifi-Core
7. ⏳ Before open sourcing, complete `PRE_OPEN_SOURCE_CHECKLIST.md`

## Notes

- Keep sensitive data out of git (use .gitignore)
- Document your premium features architecture
- Plan how core and premium features will integrate
- Consider using a monorepo tool (pnpm workspaces, npm workspaces) if needed
- Use separate Supabase projects for testing and production
- Test thoroughly in preview environments before production deployment

## Troubleshooting

**Q: Should I copy all of Logifi-Core now?**  
A: Only if you need to work with it immediately. Otherwise, wait until you're ready to do the subtree merge.

**Q: How do I keep core and premium features separate?**  
A: Use feature flags, separate directories, and clear architectural boundaries.

**Q: Can I commit to both repos?**  
A: Yes, but keep core changes in Logifi-Core and premium changes in logifi-pro.

**Q: How do I test my private repo before release?**  
A: Use preview deployments (Vercel/Netlify) with separate test Supabase project. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

**Q: Should I use the same Supabase project for testing and production?**  
A: No. Use separate Supabase projects to prevent test data from mixing with production data.
