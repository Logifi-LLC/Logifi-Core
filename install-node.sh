#!/bin/bash

# Quick Node.js Installation Script for macOS
# This script attempts to install Node.js using the easiest available method

echo "🔧 Node.js Installation Helper"
echo "=============================="
echo ""

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    echo "✅ Node.js is already installed: $(node --version)"
    exit 0
fi

# Check for Homebrew
if command -v brew &> /dev/null; then
    echo "📦 Found Homebrew, installing Node.js via Homebrew..."
    brew install node
    if [ $? -eq 0 ]; then
        echo "✅ Node.js installed successfully!"
        node --version
        npm --version
        exit 0
    fi
fi

# Check for nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "📦 Found nvm, installing Node.js LTS via nvm..."
    source "$HOME/.nvm/nvm.sh"
    nvm install --lts
    nvm use --lts
    if [ $? -eq 0 ]; then
        echo "✅ Node.js installed successfully!"
        node --version
        npm --version
        exit 0
    fi
fi

# If we get here, manual installation is needed
echo "❌ Could not automatically install Node.js"
echo ""
echo "Please install Node.js manually using one of these methods:"
echo ""
echo "1. Download from https://nodejs.org/ (Recommended)"
echo "   - Visit the website and download the LTS version for macOS"
echo "   - Run the installer"
echo ""
echo "2. Install Homebrew first, then Node.js:"
echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo "   brew install node"
echo ""
echo "3. Install nvm (Node Version Manager):"
echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
echo "   source ~/.zshrc"
echo "   nvm install --lts"
echo ""
exit 1
