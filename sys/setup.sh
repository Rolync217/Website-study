#!/bin/bash
# Run this once after cloning. Checks and installs what the scroll-skills need.
# Re-running is safe — it skips anything already installed.

set -e
PASS="✓" FAIL="✗"

echo "Checking scroll-skills dependencies..."
echo ""

BLOCKED=0

# Node.js — can't auto-install
if node --version >/dev/null 2>&1; then
  echo "$PASS Node.js $(node --version)"
else
  echo "$FAIL Node.js not found."
  echo "   Install it from https://nodejs.org (LTS version)"
  BLOCKED=1
fi

# Chrome — can't auto-install
if [ -d "/Applications/Google Chrome.app" ]; then
  echo "$PASS Google Chrome found"
else
  echo "$FAIL Google Chrome not found."
  echo "   Download from https://google.com/chrome"
  BLOCKED=1
fi

[ "$BLOCKED" = "1" ] && echo "" && echo "Fix the above then re-run setup.sh" && exit 1

# Playwright — auto-install via npx cache
PW=$(ls -td ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1)
if [ -n "$PW" ]; then
  echo "$PASS Playwright found at $PW"
else
  echo "Installing Playwright..."
  npx playwright install chromium 2>&1 | tail -3
  PW=$(ls -td ~/.npm/_npx/*/node_modules/playwright 2>/dev/null | head -1)
  echo "$PASS Playwright installed"
fi

# Python3 — check only (present on all modern macOS)
if python3 --version >/dev/null 2>&1; then
  echo "$PASS Python $(python3 --version)"
else
  echo "$FAIL Python3 not found. On macOS: xcode-select --install"
  BLOCKED=1
fi

# Pillow (PIL) — auto-install
if python3 -c "from PIL import Image" 2>/dev/null; then
  echo "$PASS Pillow (PIL) ready"
else
  echo "Installing Pillow..."
  pip3 install Pillow --quiet
  echo "$PASS Pillow installed"
fi

# ffmpeg — can't auto-install, clear instructions
if ffmpeg -version >/dev/null 2>&1; then
  echo "$PASS ffmpeg $(ffmpeg -version 2>&1 | head -1 | grep -o 'ffmpeg version [^ ]*')"
else
  echo "$FAIL ffmpeg not found."
  echo "   macOS:  brew install ffmpeg"
  echo "   Ubuntu: sudo apt install ffmpeg"
  BLOCKED=1
fi

echo ""
if [ "$BLOCKED" = "1" ]; then
  echo "Fix the items above, then re-run setup.sh"
  exit 1
else
  echo "All dependencies ready."
  echo "Next: run sys/chrome-launch.sh to start your QA Chrome."
fi
