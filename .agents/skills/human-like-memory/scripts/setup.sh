#!/bin/bash
#
# Setup script for Human-Like Memory Skill
# This script helps configure the required secrets
#

set -e

SKILL_NAME="human-like-memory"
OPENCLAW_DIR="$HOME/.openclaw"
SECRETS_FILE="$OPENCLAW_DIR/secrets.json"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          Human-Like Memory Skill - Setup                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
    echo "Creating secrets file at $SECRETS_FILE"
    mkdir -p "$OPENCLAW_DIR"
    echo "{}" > "$SECRETS_FILE"
fi

# Read current secrets
CURRENT_SECRETS=$(cat "$SECRETS_FILE")

echo "This skill requires an API Key from https://multiego.me"
echo ""

# Prompt for API Key
read -p "Enter your API Key (mp_xxxxx): " API_KEY

if [ -z "$API_KEY" ]; then
    echo "Error: API Key is required"
    exit 1
fi

# Prompt for Base URL (optional)
read -p "Enter Base URL [https://multiego.me]: " BASE_URL
BASE_URL=${BASE_URL:-"https://multiego.me"}

# Prompt for User ID (optional)
read -p "Enter User ID [openclaw-user]: " USER_ID
USER_ID=${USER_ID:-"openclaw-user"}

# Update secrets using Node.js for proper JSON handling
node -e "
const fs = require('fs');
const secretsFile = '$SECRETS_FILE';
let secrets = {};

try {
    secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf-8'));
} catch (e) {
    secrets = {};
}

secrets['$SKILL_NAME'] = {
    HUMAN_LIKE_MEM_API_KEY: '$API_KEY',
    HUMAN_LIKE_MEM_BASE_URL: '$BASE_URL',
    HUMAN_LIKE_MEM_USER_ID: '$USER_ID'
};

fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
console.log('Secrets saved successfully!');
"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete!                                                 ║"
echo "║                                                                  ║"
echo "║  Your configuration:                                             ║"
echo "║    API Key: ${API_KEY:0:10}...                                   ║"
echo "║    Base URL: $BASE_URL"
echo "║    User ID: $USER_ID"
echo "║                                                                  ║"
echo "║  Test with: node scripts/memory.mjs config                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
