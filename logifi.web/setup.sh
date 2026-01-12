#!/bin/bash

# Logifi-Core Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Logifi-Core Setup"
echo "==================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js (v18 or higher recommended):"
    echo ""
    echo "Option 1: Download from https://nodejs.org/"
    echo "Option 2: Install via Homebrew:"
    echo "  brew install node"
    echo ""
    echo "Option 3: Install via nvm (Node Version Manager):"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install --lts"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js found: $NODE_VERSION"

# Check Node.js version (should be v18+)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js version 18 or higher is recommended"
    echo "   Current version: $NODE_VERSION"
    echo ""
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed (should come with Node.js)"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm found: $NPM_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created from env.example"
        echo "⚠️  Please edit .env and add your Supabase credentials (optional for local development)"
    elif [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo "⚠️  Please edit .env and add your Supabase credentials (optional for local development)"
    else
        echo "⚠️  No env template found, creating basic .env file..."
        cat > .env << EOF
# Supabase Configuration (optional for local development)
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
        echo "✅ .env file created"
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. (Optional) Edit .env and add your Supabase credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. (Optional) Run 'npm run update-aircraft-db' to download FAA aircraft database"
echo ""
