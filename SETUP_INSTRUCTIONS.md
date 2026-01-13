# Setup Instructions for Logifi-Core

This guide will help you install all dependencies needed to work on the Logifi-Core project.

## Prerequisites

### 1. Install Node.js

Node.js (v18 or higher) is required. Choose one of the following methods:

#### Option A: Download from Node.js Website (Recommended)
1. Visit https://nodejs.org/
2. Download the LTS (Long Term Support) version for macOS
3. Run the installer and follow the instructions
4. Verify installation: `node --version` and `npm --version`

#### Option B: Install via Homebrew
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

#### Option C: Install via nvm (Node Version Manager)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell
source ~/.zshrc

# Install latest LTS Node.js
nvm install --lts
nvm use --lts
```

## Installation Steps

### 1. Navigate to Project Directory
```bash
cd logifi.web
```

### 2. Run Setup Script
```bash
./setup.sh
```

The setup script will:
- Check for Node.js installation
- Install all npm dependencies
- Create a `.env` file from the template

### 3. Manual Installation (Alternative)

If the setup script doesn't work, you can install manually:

```bash
# Install dependencies
npm install

# Create .env file (optional - only needed if using Supabase)
cp env.example .env
# Then edit .env and add your Supabase credentials
```

### 4. Environment Variables (Optional)

The app can work without Supabase for local-only development. If you want to use Supabase:

1. Create a Supabase project at https://supabase.com
2. Copy `env.example` to `.env`
3. Edit `.env` and add your credentials:
   ```
   NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Verify Installation

Run the development server:
```bash
npm run dev
```

The app should be available at `http://localhost:3000` (or the port Nuxt assigns).

## Optional: Download FAA Aircraft Database

To enable aircraft lookups, download the FAA database:
```bash
npm run update-aircraft-db
```

## Troubleshooting

### Node.js not found
- Make sure Node.js is installed and in your PATH
- Try restarting your terminal
- Verify with: `which node` and `which npm`

### npm install fails
- Make sure you have internet connection
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Certificate errors
- If you encounter SSL certificate errors, you may need to update your system certificates
- On macOS, try: `brew install ca-certificates` (if using Homebrew)
