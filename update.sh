#!/bin/bash
# Auto-update script: syncs local installation from the GitHub master branch.

MANIFEST_URL="https://raw.githubusercontent.com/punisher355/TamersBond/master/system.json"
DOWNLOAD_URL="https://github.com/punisher355/TamersBond/archive/refs/heads/master.zip"
INSTALL_DIR="/home/megan/foundrydata/Data/systems/digital-destiny"
LOG="$INSTALL_DIR/update.log"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(timestamp)] Checking for updates..." | tee -a "$LOG"

# Fetch remote version
remote_json=$(curl -sf "$MANIFEST_URL")
if [ $? -ne 0 ]; then
    echo "[$(timestamp)] ERROR: Could not fetch manifest. Skipping." | tee -a "$LOG"
    exit 1
fi

remote_version=$(echo "$remote_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null)
local_version=$(python3 -c "import json; print(json.load(open('$INSTALL_DIR/system.json'))['version'])" 2>/dev/null)

echo "[$(timestamp)] Local: $local_version | Remote: $remote_version" | tee -a "$LOG"

if [ "$remote_version" = "$local_version" ]; then
    echo "[$(timestamp)] Already up to date." | tee -a "$LOG"
    exit 0
fi

echo "[$(timestamp)] Update found ($local_version -> $remote_version). Downloading..." | tee -a "$LOG"

tmpdir=$(mktemp -d)
curl -sL "$DOWNLOAD_URL" -o "$tmpdir/update.zip"
if [ $? -ne 0 ]; then
    echo "[$(timestamp)] ERROR: Download failed." | tee -a "$LOG"
    rm -rf "$tmpdir"
    exit 1
fi

unzip -q "$tmpdir/update.zip" -d "$tmpdir/"

# Sync all files, preserving local-only files (like update.log, update.sh itself)
rsync -a --exclude='update.sh' --exclude='update.log' \
    "$tmpdir/TamersBond-master/" "$INSTALL_DIR/"

rm -rf "$tmpdir"
echo "[$(timestamp)] Successfully updated to $remote_version." | tee -a "$LOG"