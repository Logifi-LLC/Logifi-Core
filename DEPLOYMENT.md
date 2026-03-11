# Deployment Guide

This guide covers deploying Logifi-Core for testing, preview, and production environments.

## Overview

Logifi-Core is a Nuxt 3 application that can be deployed as a static site (since `ssr: false`). This guide covers multiple deployment options for sharing test versions and deploying to production.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are configured (see `logifi.web/env.example`)
- [ ] `.env` files are in `.gitignore` and not committed
- [ ] No hardcoded secrets or API keys in code
- [ ] Supabase project is set up with all migrations applied
- [ ] Build completes successfully: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] You're using a separate Supabase project for testing (not production)

### Security Checks

```bash
# Check for any .env files that might be committed
git ls-files | grep -E '\.env$|\.env\.'

# Check for secrets in code (should only find placeholders)
grep -r "sk_live\|sk_test\|AIza\|AKIA" logifi.web/ --exclude-dir=node_modules

# Verify .gitignore is working
git status --ignored
```

## Testing & Preview Deployments

These options allow you to share test versions with others before public release.

### Option 1: Vercel (Recommended)

Vercel provides automatic preview deployments for every branch/PR, making it ideal for testing.

#### Setup

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from project root:**
   ```bash
   cd logifi.web
   vercel
   ```
   
   - First time: Follow prompts to connect your account
   - Select your project settings
   - Vercel will detect Nuxt 3 automatically

3. **Configure build settings:**
   - **Root Directory**: `logifi.web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.output/public`
   - **Install Command**: `npm install`

4. **Set environment variables:**
   ```bash
   vercel env add NUXT_PUBLIC_SUPABASE_URL
   vercel env add NUXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   
   Or set them in the Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add variables for Production, Preview, and Development

5. **Deploy preview:**
   ```bash
   # Create a branch for testing
   git checkout -b test-version
   git push origin test-version
   
   # Deploy preview (creates unique URL)
   vercel --prod=false
   ```

#### Benefits

- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Preview URLs for each branch/PR
- ✅ Easy environment variable management
- ✅ Password protection available (paid plans)
- ✅ Automatic deployments on git push

#### Sharing Preview URLs

- Each deployment gets a unique URL: `your-app-xxxxx.vercel.app`
- Preview deployments are automatically created for branches/PRs
- Share the preview URL with testers

### Option 2: Netlify

Similar to Vercel, Netlify provides preview deployments and static hosting.

#### Setup

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Build the project:**
   ```bash
   cd logifi.web
   npm run build
   ```

3. **Deploy:**
   ```bash
   # Deploy draft (creates preview URL)
   netlify deploy --dir=.output/public
   
   # Deploy to production
   netlify deploy --prod --dir=.output/public
   ```

4. **Set environment variables:**
   ```bash
   netlify env:set NUXT_PUBLIC_SUPABASE_URL "your-url"
   netlify env:set NUXT_PUBLIC_SUPABASE_ANON_KEY "your-key"
   ```
   
   Or in Netlify dashboard: Site Settings → Environment Variables

5. **Create `netlify.toml` (optional):**
   ```toml
   [build]
     command = "npm run build"
     publish = ".output/public"
   
   [build.environment]
     NODE_VERSION = "18"
   ```

#### Benefits

- ✅ Free tier available
- ✅ Preview deployments
- ✅ Password protection available
- ✅ Easy environment variable management

### Option 3: Local Tunnels (Quick Testing)

For immediate, temporary testing without setting up a deployment service.

#### Using ngrok

1. **Install ngrok:**
   - Download from https://ngrok.com/download
   - Or: `brew install ngrok` (macOS)

2. **Start your dev server:**
   ```bash
   cd logifi.web
   npm run dev
   ```

3. **Create tunnel:**
   ```bash
   # In another terminal
   ngrok http 3000
   ```
   
   - Share the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - URL changes each time you restart ngrok

#### Using localtunnel

1. **Install:**
   ```bash
   npm install -g localtunnel
   ```

2. **Start dev server:**
   ```bash
   cd logifi.web
   npm run dev
   ```

3. **Create tunnel:**
   ```bash
   # In another terminal
   lt --port 3000
   ```
   
   - Share the URL provided
   - URL changes each time

#### Benefits

- ✅ Instant setup (no account needed)
- ✅ Works with local dev server
- ✅ Good for quick demos

#### Limitations

- ❌ Stops when you close the tunnel
- ❌ URLs change each time
- ❌ Not suitable for extended testing

## Production Deployment

### Build for Production

```bash
cd logifi.web
npm run build
```

The build output is in `.output/public/` and can be deployed to any static hosting service.

### Static Hosting Options

- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: Upload `.output/public/` contents
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Any static host**: Upload `.output/public/` contents

### Environment Variables in Production

Ensure production environment variables are set:
- `NUXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

**Important**: Use production Supabase credentials, not test credentials.

## Security Considerations

### Separate Supabase Projects

- **Testing**: Use a separate Supabase project for preview/test deployments
- **Production**: Use production Supabase project only for production deployments
- This prevents test data from mixing with production data

### Protecting Preview URLs

- **Vercel**: Password protection available on paid plans
- **Netlify**: Password protection available
- **Alternative**: Use Supabase RLS policies to restrict access to test accounts only

### Environment Variables

- Never commit `.env` files
- Use platform-specific environment variable management (Vercel/Netlify dashboards)
- Use different Supabase projects for different environments
- Rotate keys if accidentally exposed

### Best Practices

1. **Test with separate Supabase project:**
   - Create a "staging" or "test" project in Supabase
   - Use test project credentials for preview deployments
   - Use production project only for production

2. **Review before production:**
   - Test all features in preview environment
   - Verify environment variables are correct
   - Check that production Supabase project is used

3. **Monitor deployments:**
   - Check deployment logs for errors
   - Verify environment variables are loaded correctly
   - Test the deployed application thoroughly

## Troubleshooting

### Build Fails

**Issue**: Build command fails
```bash
# Check Node version (requires 18+)
node --version

# Clear cache and rebuild
rm -rf node_modules .output .nuxt
npm install
npm run build
```

### Environment Variables Not Working

**Issue**: Supabase connection fails in deployed app

- Verify environment variables are set in deployment platform
- Check variable names match exactly (case-sensitive)
- Ensure variables are set for the correct environment (production/preview)
- Restart deployment after adding variables

### Supabase Connection Errors

**Issue**: "Missing Supabase environment variables"

- Verify `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check that variables are prefixed with `NUXT_PUBLIC_` (required for client-side access)
- Restart the deployment after adding variables

### Preview URL Not Accessible

**Issue**: Preview deployment shows error or is inaccessible

- Check deployment logs in Vercel/Netlify dashboard
- Verify build completed successfully
- Check that environment variables are set
- Ensure Supabase project allows connections from the deployment URL

### Static Files Not Loading

**Issue**: Images or assets not loading

- Verify files are in `public/` directory
- Check that build output includes public files
- Ensure paths are relative (not absolute)

## Quick Reference

### Vercel Commands

```bash
# Initial setup
vercel login
vercel

# Deploy preview
vercel --prod=false

# Deploy production
vercel --prod

# Set environment variables
vercel env add NUXT_PUBLIC_SUPABASE_URL
```

### Netlify Commands

```bash
# Initial setup
netlify login
netlify init

# Deploy preview
netlify deploy --dir=.output/public

# Deploy production
netlify deploy --prod --dir=.output/public

# Set environment variables
netlify env:set NUXT_PUBLIC_SUPABASE_URL "your-url"
```

### Local Tunnel Commands

```bash
# ngrok
ngrok http 3000

# localtunnel
lt --port 3000
```

## Next Steps

After deployment:

1. Test all features in the preview environment
2. Share preview URL with testers
3. Gather feedback
4. Fix issues and redeploy
5. When ready, deploy to production

For private repository setup, see [CLOSED_SOURCE_SETUP.md](CLOSED_SOURCE_SETUP.md).
