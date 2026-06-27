#!/bin/bash
# Start a dedicated QA Chrome with CDP enabled on port 9222.
# Uses a SEPARATE profile (~/chrome-qa-profile) — intentionally isolated
# from your real Chrome. The tool only sees what you log into here.
# Re-running is safe — exits immediately if already running.

PORT="${1:-9222}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
QA_PROFILE="$HOME/chrome-qa-profile"

# Already running — nothing to do
if curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  echo "QA Chrome already running on port $PORT"
  exit 0
fi

# Chrome is open — quit it gracefully so we can launch our own instance.
# (macOS won't reliably start a second Chrome with different flags while one is running.)
# Your tabs are safe — Chrome restores them when you reopen it normally.
if pgrep -f "Google Chrome" >/dev/null 2>&1; then
  echo "Regular Chrome is open. Quitting it so QA Chrome can launch..."
  echo "(Your tabs will restore when you reopen Chrome normally.)"
  osascript -e 'tell application "Google Chrome" to quit'
  for i in $(seq 1 20); do
    pgrep -f "Google Chrome" >/dev/null 2>&1 || break
    sleep 0.5
  done
  if pgrep -f "Google Chrome" >/dev/null 2>&1; then
    echo "Chrome didn't quit. Force-stopping it..."
    pkill -f "Google Chrome"
    sleep 1
  fi
fi

# Launch QA Chrome — separate profile, CDP on port 9222
"$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$QA_PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  "about:blank" &>/dev/null &

sleep 5

# First-ever run: no cookies yet, so OAuth won't work until user logs in
COOKIES="$QA_PROFILE/Default/Cookies"
if [ ! -f "$COOKIES" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "FIRST RUN — one-time setup needed:"
  echo ""
  echo "The QA Chrome window just opened with a fresh profile."
  echo "If your work needs Google login or any OAuth:"
  echo "  → Switch to the QA Chrome window"
  echo "  → Log into Google (or any other account you need)"
  echo "  → Come back here and press Enter"
  echo ""
  echo "This only happens once. The session persists forever."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  read -rp "Press Enter when done (or if no login needed)..."
fi

# Confirm CDP is ready
if curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  echo "QA Chrome ready on port $PORT"
else
  echo "CDP not responding after launch. Wait a few seconds and retry."
  exit 1
fi
