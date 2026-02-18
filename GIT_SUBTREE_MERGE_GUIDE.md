# Git Subtree Merge Guide

This guide walks you through merging Logifi-Core into your closed-source repository using Git Subtree. This allows you to:
- Keep Logifi-Core as a separate open-source repository
- Include it in your closed-source repo as a base
- Easily pull updates from the open-source repo
- Push core improvements back to the open-source repo

## Prerequisites

- Logifi-Core is ready to be open-sourced (see `PRE_OPEN_SOURCE_CHECKLIST.md`)
- Your closed-source repository is set up (see `CLOSED_SOURCE_SETUP.md`)
- Git subtree is available (comes with Git 1.7.11+)

## Overview

The Git Subtree strategy:
1. Adds Logifi-Core as a subtree in your closed-source repo
2. Keeps the full history of Logifi-Core
3. Allows you to pull updates from the open-source repo
4. Allows you to push changes back to the open-source repo

## Step 1: Prepare Logifi-Core for Open Source

Before merging, ensure Logifi-Core is ready:

```bash
cd /path/to/Logifi-Core

# 1. Complete the pre-open-source checklist
# (See PRE_OPEN_SOURCE_CHECKLIST.md)

# 2. Ensure you're on the main branch
git checkout main

# 3. Tag a release version
git tag -a v1.0.0 -m "Initial open source release"
git push origin v1.0.0

# 4. Push to your public repository (when ready)
# git remote add public https://github.com/yourusername/Logifi-Core.git
# git push public main
# git push public v1.0.0
```

## Step 2: Add Logifi-Core as a Subtree

In your closed-source repository:

```bash
cd /path/to/logifi-pro

# 1. Add Logifi-Core as a remote (if not already added)
git remote add logifi-core https://github.com/yourusername/Logifi-Core.git
# Or use the local path:
# git remote add logifi-core /path/to/Logifi-Core

# 2. Fetch the remote
git fetch logifi-core

# 3. Add Logifi-Core as a subtree in the logifi-core/ directory
# This preserves full history
git subtree add --prefix=logifi-core --squash logifi-core main

# Alternative: If you want to preserve full history (larger repo):
# git subtree add --prefix=logifi-core logifi-core main
```

**What this does:**
- Creates a `logifi-core/` directory in your repo
- Copies all Logifi-Core files into it
- Preserves git history (or squashes it into one commit)
- Links it to the Logifi-Core remote

## Step 3: Verify the Merge

```bash
# Check that files are present
ls -la logifi-core/

# Verify git history
git log --oneline --graph --all | head -20

# Check the subtree
git log --oneline logifi-core/ | head -10
```

## Step 4: Update Your Project Structure

After adding the subtree, organize your repo:

```
logifi-pro/
├── logifi-core/              # Open-source core (via subtree)
│   └── logifi.web/          # Core application
│
├── logifi-pro-features/      # Your premium features
│   ├── premium/
│   ├── subscriptions/
│   └── payments/
│
├── package.json              # Root package.json (if using monorepo)
└── README.md
```

## Step 5: Working with the Subtree

### Pull Updates from Logifi-Core

When Logifi-Core gets updates (from community contributions or your own):

```bash
cd /path/to/logifi-pro

# Pull latest changes from Logifi-Core
git subtree pull --prefix=logifi-core --squash logifi-core main

# Or without squashing (preserves full history):
# git subtree pull --prefix=logifi-core logifi-core main
```

**Resolving conflicts:**
- If there are conflicts, Git will pause
- Resolve conflicts in the `logifi-core/` directory
- Complete the merge: `git subtree merge --continue`

### Push Changes Back to Logifi-Core

If you make improvements to core functionality that should be open-sourced:

```bash
cd /path/to/logifi-pro

# 1. Make your changes in logifi-core/
# 2. Commit them
git add logifi-core/
git commit -m "feat: improve core feature X"

# 3. Push subtree changes back to Logifi-Core repo
git subtree push --prefix=logifi-core logifi-core your-branch-name

# 4. Create a PR in Logifi-Core repo to merge your-branch-name into main
```

## Step 6: Daily Workflow

### Working on Core Features

```bash
# 1. Pull latest from Logifi-Core
git subtree pull --prefix=logifi-core --squash logifi-core main

# 2. Make changes in logifi-core/
# 3. Commit
git add logifi-core/
git commit -m "feat: add new core feature"

# 4. If it should be open-sourced:
git subtree push --prefix=logifi-core logifi-core feature-branch
# Then create PR in Logifi-Core repo
```

### Working on Premium Features

```bash
# 1. Work in logifi-pro-features/
# 2. Commit directly to logifi-pro (no subtree needed)
git add logifi-pro-features/
git commit -m "feat: add premium analytics"
```

## Step 7: Integration Strategy

### Option A: Direct Integration (Recommended)

Import core features directly in your premium code:

```typescript
// In logifi-pro-features/premium/services/analytics.ts
import { useAuditTrail } from '../../logifi-core/logifi.web/app/composables/useAuditTrail'
import { useExport } from '../../logifi-core/logifi.web/app/composables/useExport'

// Use core features in premium code
export function usePremiumAnalytics() {
  const auditTrail = useAuditTrail()
  // Add premium analytics on top
}
```

### Option B: Feature Flags

Use feature flags to enable/disable premium features:

```typescript
// config/feature-flags.ts
export const FEATURES = {
  CORE: true,
  PREMIUM_ANALYTICS: process.env.ENABLE_PREMIUM === 'true',
}

// In components
if (FEATURES.PREMIUM_ANALYTICS) {
  // Load premium feature
}
```

## Step 8: Build & Deployment

### Monorepo Setup (Optional)

If using a monorepo structure:

```json
// package.json (root)
{
  "name": "logifi-pro",
  "private": true,
  "workspaces": [
    "logifi-core/logifi.web",
    "logifi-pro-features/*"
  ]
}
```

### Build Commands

```bash
# Build core
cd logifi-core/logifi.web
npm run build

# Build premium features
cd logifi-pro-features/premium
npm run build

# Or from root (if using workspaces)
npm run build
```

## Troubleshooting

### Issue: Subtree pull fails with conflicts

**Solution:**
```bash
# Abort and try again
git merge --abort

# Or resolve conflicts manually
git status
# Resolve conflicts in logifi-core/
git add logifi-core/
git commit
```

### Issue: Can't push to Logifi-Core remote

**Solution:**
```bash
# Verify remote URL
git remote -v

# Update remote if needed
git remote set-url logifi-core https://github.com/yourusername/Logifi-Core.git

# Ensure you have write access to Logifi-Core repo
```

### Issue: Subtree directory is empty after pull

**Solution:**
```bash
# Check if subtree was added correctly
git log --oneline --all --graph | grep subtree

# Re-add if needed
git subtree add --prefix=logifi-core --squash logifi-core main
```

### Issue: Want to remove subtree

**Solution:**
```bash
# Remove the directory
git rm -r logifi-core
git commit -m "remove logifi-core subtree"

# Remove remote (optional)
git remote remove logifi-core
```

## Alternative: Using Git Subtree Helper Scripts

Create helper scripts to make subtree operations easier:

```bash
# scripts/pull-core.sh
#!/bin/bash
git subtree pull --prefix=logifi-core --squash logifi-core main

# scripts/push-core.sh
#!/bin/bash
BRANCH=${1:-main}
git subtree push --prefix=logifi-core logifi-core $BRANCH
```

Make them executable:
```bash
chmod +x scripts/pull-core.sh scripts/push-core.sh
```

## Best Practices

1. **Regular Updates**: Pull from Logifi-Core regularly to stay current
2. **Separate Commits**: Keep core and premium changes in separate commits
3. **Clear Messages**: Use clear commit messages indicating core vs premium
4. **Test After Pulls**: Always test after pulling core updates
5. **Document Integration**: Document how core and premium features integrate

## Quick Reference

```bash
# Add subtree
git subtree add --prefix=logifi-core --squash logifi-core main

# Pull updates
git subtree pull --prefix=logifi-core --squash logifi-core main

# Push changes back
git subtree push --prefix=logifi-core logifi-core branch-name

# Check subtree status
git log --oneline logifi-core/ | head -10
```

## Next Steps

After completing the subtree merge:

1. ✅ Test that everything works
2. ✅ Update your build/deployment scripts
3. ✅ Document the integration architecture
4. ✅ Set up CI/CD for both repos
5. ✅ Establish workflow for core vs premium development

## Additional Resources

- [Git Subtree Documentation](https://www.atlassian.com/git/tutorials/git-subtree)
- [Git Subtree vs Submodule](https://www.atlassian.com/git/tutorials/git-subtree)
- Your project's architecture documentation
