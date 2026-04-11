#!/bin/bash
echo "=========================================="
echo "  Fishing For Islands - Starting Game..."
echo "=========================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Install it from https://nodejs.org/ or via:"
    echo "  brew install node  (Mac)"
    echo "  sudo apt install nodejs npm  (Linux)"
    exit 1
fi

echo "Starting game server..."
echo ""
echo "Your browser should open automatically."
echo "If not, open http://localhost:5173/ manually."
echo ""
echo "Press Ctrl+C to stop the server when you're done."
echo ""
npx vite --open
