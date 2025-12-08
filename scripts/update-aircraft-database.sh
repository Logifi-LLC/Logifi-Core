#!/bin/bash

echo "🔄 Updating Aircraft Database..."
echo "================================"
echo ""

# Run the download script
node scripts/download-faa-aircraft.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Aircraft database updated successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review the changes: git diff server/data/aircraft-database.json"
    echo "   2. Commit: git add server/data/aircraft-database.json"
    echo "   3. Push: git commit -m 'Update aircraft database - $(date +%Y-%m)' && git push"
    echo ""
else
    echo ""
    echo "❌ Update failed!"
    exit 1
fi

