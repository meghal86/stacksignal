#!/usr/bin/env bash
# wreckit — scan for AI slop (placeholders, phantoms, template artifacts)
# Usage: ./slop-scan.sh [project-path]
# Exit 0 = clean, Exit 1 = slop found

set -euo pipefail
PROJECT="${1:-.}"
cd "$PROJECT"
FINDINGS=0

echo "=== AI Slop Scan ==="

# Placeholders
echo ""
echo "--- Placeholders ---"
PLACEHOLDERS=$(grep -rn "TODO\|FIXME\|implement this\|HACK\|XXX" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --include='*.py' --include='*.rs' --include='*.go' --include='*.sh' \
  --include='*.swift' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'dist/' || true)

if [ -n "$PLACEHOLDERS" ]; then
  echo "$PLACEHOLDERS"
  COUNT=$(echo "$PLACEHOLDERS" | wc -l | tr -d ' ')
  echo "Found $COUNT placeholder(s)"
  FINDINGS=$((FINDINGS + COUNT))
else
  echo "None found"
fi

# Template artifacts
echo ""
echo "--- Template Artifacts ---"
TEMPLATES=$(grep -rn "example\.com\|YOUR_API_KEY\|lorem ipsum\|changeme\|placeholder\|sample_value" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --include='*.py' --include='*.rs' --include='*.go' --include='*.sh' \
  --include='*.swift' --include='*.json' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'dist/' | grep -v 'package-lock' || true)

if [ -n "$TEMPLATES" ]; then
  echo "$TEMPLATES"
  COUNT=$(echo "$TEMPLATES" | wc -l | tr -d ' ')
  echo "Found $COUNT template artifact(s)"
  FINDINGS=$((FINDINGS + COUNT))
else
  echo "None found"
fi

# Dead/empty functions
echo ""
echo "--- Empty/Stub Function Bodies ---"

# JS/TS: single-line empty bodies like: function foo() {} or foo = () => {}
EMPTY_JS=$(grep -rn -E "(function\s+\w+\s*\([^)]*\)\s*\{\s*\}|=>\s*\{\s*\}|\)\s*:\s*\w+\s*\{\s*\})" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  . 2>/dev/null | grep -v node_modules | grep -v '.git/' | grep -v 'dist/' || true)

# Python: def followed immediately by pass or ...
EMPTY_PY=$(grep -rn -E "^\s+(pass|\.\.\.)\s*$" \
  --include='*.py' . 2>/dev/null | grep -v '.git/' | grep -v 'test_' | grep -v '__init__' || true)

# Rust: empty fn bodies fn foo() {}
EMPTY_RS=$(grep -rn -E "fn\s+\w+[^{]*\{\s*\}" \
  --include='*.rs' . 2>/dev/null | grep -v '.git/' | grep -v 'target/' || true)

EMPTY_ALL=""
[ -n "$EMPTY_JS" ] && EMPTY_ALL="$EMPTY_ALL\n$EMPTY_JS"
[ -n "$EMPTY_PY" ] && EMPTY_ALL="$EMPTY_ALL\n$EMPTY_PY"
[ -n "$EMPTY_RS" ] && EMPTY_ALL="$EMPTY_ALL\n$EMPTY_RS"

if [ -n "$EMPTY_ALL" ]; then
  printf "%b\n" "$EMPTY_ALL"
  COUNT=$(printf "%b" "$EMPTY_ALL" | grep -c '.' || echo 0)
  echo "Found $COUNT empty/stub function(s)"
  FINDINGS=$((FINDINGS + COUNT))
else
  echo "None found"
fi

echo ""
echo "=== Total slop findings: $FINDINGS ==="

if [ "$FINDINGS" -gt 0 ]; then
  exit 1
else
  exit 0
fi
