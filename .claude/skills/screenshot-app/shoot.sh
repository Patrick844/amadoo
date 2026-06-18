#!/usr/bin/env bash
# Capture an iOS Simulator screenshot of Amadoo for visual review.
#
# Usage: bash shoot.sh [out_dir] [name]
#   out_dir  directory to write into (default: screenshots)
#   name     file name without extension (default: timestamped)
#
# Prereq: full Xcode + a BOOTED simulator already running the app
#         (start it with `npx expo start --ios`). Command Line Tools alone won't work.
set -euo pipefail

OUT="${1:-screenshots}"
NAME="${2:-shot}"
mkdir -p "$OUT"

if ! xcrun simctl help >/dev/null 2>&1; then
  echo "ERROR: xcrun simctl not available — full Xcode + a simulator runtime is required." >&2
  echo "       Install Xcode, then: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  exit 1
fi

if ! xcrun simctl list devices booted | grep -qi booted; then
  echo "ERROR: no booted simulator. Boot one and open the app (npx expo start --ios) first." >&2
  exit 1
fi

DEST="$OUT/$NAME.png"
xcrun simctl io booted screenshot "$DEST"
echo "saved $DEST"
