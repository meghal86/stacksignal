#!/usr/bin/env bash
# wreckit — dependency graph analysis, coupling metrics, circular dep detection
# Usage: ./design-review.sh [project-path]
# Output: JSON to stdout, human summary to stderr
# Exit 0 = results produced, check JSON verdict for pass/fail

set -euo pipefail
PROJECT="${1:-.}"
cd "$PROJECT"

echo "=== Design Review ===" >&2
echo "Project: $(pwd)" >&2

# ─── Detect language ───────────────────────────────────────────────────────────
LANGUAGE="unknown"
if [ -f "package.json" ]; then
  LANGUAGE="ts"
elif [ -f "Cargo.toml" ]; then
  LANGUAGE="rust"
elif [ -f "go.mod" ]; then
  LANGUAGE="go"
elif [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
  LANGUAGE="python"
elif find . -name '*.sh' -not -path '*/.git/*' -maxdepth 3 2>/dev/null | head -1 | grep -q .; then
  LANGUAGE="shell"
fi
echo "Language: $LANGUAGE" >&2

# ─── JS/TS: try madge first ────────────────────────────────────────────────────
MADGE_OUTPUT=""
USED_MADGE=false

if [ "$LANGUAGE" = "ts" ] && command -v npx >/dev/null 2>&1; then
  echo "Attempting madge analysis..." >&2
  if MADGE_OUTPUT=$(npx --yes madge --circular --json . 2>/dev/null); then
    USED_MADGE=true
    echo "madge succeeded" >&2
  else
    echo "madge failed or not available, using manual scan" >&2
  fi
fi

# ─── Build dependency map (manual fallback or non-JS) ─────────────────────────

# Collect source files
SRC_FILES=""
case "$LANGUAGE" in
  ts)
    SRC_FILES=$(find . \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
      -not -name '*.test.*' -not -name '*.spec.*' -not -name '*.d.ts' \
      -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' \
      -not -path '*/build/*' -not -path '*/coverage/*' 2>/dev/null || true)
    ;;
  python)
    SRC_FILES=$(find . -name '*.py' \
      -not -name 'test_*' -not -name '*_test.py' \
      -not -path '*/.git/*' -not -path '*/venv/*' -not -path '*/__pycache__/*' \
      -not -path '*/site-packages/*' 2>/dev/null || true)
    ;;
  go)
    SRC_FILES=$(find . -name '*.go' \
      -not -name '*_test.go' -not -path '*/.git/*' -not -path '*/vendor/*' 2>/dev/null || true)
    ;;
  rust)
    SRC_FILES=$(find . -name '*.rs' \
      -not -path '*/target/*' -not -path '*/.git/*' 2>/dev/null || true)
    ;;
  shell)
    SRC_FILES=$(find . -name '*.sh' \
      -not -name 'run_tests.sh' -not -path '*/.git/*' 2>/dev/null || true)
    ;;
  *)
    # Generic: try common source extensions
    SRC_FILES=$(find . \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.go' \) \
      -not -path '*/.git/*' -not -path '*/node_modules/*' 2>/dev/null || true)
    ;;
esac

TOTAL_FILES=$(echo "$SRC_FILES" | grep -c '.' 2>/dev/null || true)
TOTAL_FILES="${TOTAL_FILES:-0}"
echo "Source files found: $TOTAL_FILES" >&2

# ─── Extract imports and build dep map ────────────────────────────────────────

DEPMAP_FILE=$(mktemp)
FANIN_FILE=$(mktemp)
FANOUT_FILE=$(mktemp)

# For each file, extract what it imports
for file in $SRC_FILES; do
  normalized="${file#./}"
  imports=""
  case "$LANGUAGE" in
    ts)
      # Match: import ... from '...' or require('...')
      imports=$(grep -oE "(import|require)[^'\"]*['\"](\./|\.\./)([^'\"]+)['\"]" "$file" 2>/dev/null \
        | grep -oE "['\"](\./|\.\./)([^'\"]+)['\"]" \
        | tr -d "'\""  | sed 's|^\./||' || true)
      ;;
    python)
      # Match: from .module import or import .module
      imports=$(grep -oE "^(from [a-zA-Z0-9_.]+|import [a-zA-Z0-9_.,\ ]+)" "$file" 2>/dev/null \
        | grep -v "^from [a-zA-Z]" | grep -v "^import [a-zA-Z]" \
        | grep -oE "[a-zA-Z0-9_]+" | head -20 || true)
      # Also catch absolute same-package imports
      pkg_imports=$(grep -oE "^from [a-zA-Z0-9_]+" "$file" 2>/dev/null \
        | awk '{print $2}' || true)
      imports="${imports} ${pkg_imports}"
      ;;
    go)
      imports=$(grep -oE '"[^"]+/[^"]+"' "$file" 2>/dev/null \
        | tr -d '"' | grep -v '^\.' || true)
      ;;
  esac

  import_count=$(echo "$imports" | grep -c '[a-zA-Z]' 2>/dev/null || echo 0)
  echo "${normalized}:${import_count}" >> "$FANOUT_FILE"

  # Record each dependency
  for dep in $imports; do
    echo "${dep} <- ${normalized}" >> "$DEPMAP_FILE"
  done
done

# Compute fan-in: count how many files import each file
echo "" >> "$DEPMAP_FILE"  # ensure file exists and is non-empty for sort
FANIN_DATA=$(sort "$DEPMAP_FILE" | uniq -c | sort -rn 2>/dev/null || true)

# ─── Detect circular dependencies (DFS via bash) ──────────────────────────────

detect_cycles() {
  # Simple cycle detection: look for any A->B->A pattern in dep map
  # (full DFS would require more complexity; this catches direct + 2-hop cycles)
  local cycles=()

  while IFS= read -r line; do
    # line format: "target <- source"
    target=$(echo "$line" | awk '{print $1}')
    source=$(echo "$line" | awk '{print $3}')
    [ -z "$target" ] || [ -z "$source" ] && continue

    # Check if target also imports source (direct cycle)
    if grep -q "^${source} <- ${target}$" "$DEPMAP_FILE" 2>/dev/null; then
      cycles+=("${source} <-> ${target}")
    fi
  done < "$DEPMAP_FILE"

  # Deduplicate
  printf '%s\n' "${cycles[@]}" | sort -u 2>/dev/null || true
}

CIRCULAR_DEPS=""
if [ "$USED_MADGE" = true ] && [ -n "$MADGE_OUTPUT" ]; then
  # Parse madge JSON output for circular deps
  # madge outputs array of arrays: [["a","b"],["b","a"]]
  CIRCULAR_DEPS=$(echo "$MADGE_OUTPUT" | grep -o '"[^"]*"' | tr -d '"' | paste -d' ' - - 2>/dev/null || true)
else
  CIRCULAR_DEPS=$(detect_cycles 2>/dev/null || true)
fi

CIRCULAR_COUNT=$(echo "$CIRCULAR_DEPS" | grep -c '[a-zA-Z]' 2>/dev/null || echo 0)

# ─── Identify god modules (high fan-in) ───────────────────────────────────────

GOD_MODULES_JSON="[]"
GOD_COUNT=0

if [ -s "$DEPMAP_FILE" ]; then
  # Count fan-in per target
  GOD_RAW=$(sort "$DEPMAP_FILE" | grep ' <- ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -20 || true)

  god_list=""
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    count=$(echo "$entry" | awk '{print $1}')
    fname=$(echo "$entry" | awk '{print $2}')
    if [ "$count" -gt 8 ] 2>/dev/null; then
      god_list="${god_list}{\"file\":\"${fname}\",\"fan_in\":${count}},"
      GOD_COUNT=$((GOD_COUNT + 1))
    fi
  done <<< "$GOD_RAW"

  if [ -n "$god_list" ]; then
    GOD_MODULES_JSON="[${god_list%,}]"
  fi
fi

# ─── Orphan files (not imported by anything) ──────────────────────────────────

ORPHAN_FILES_JSON="[]"
ORPHAN_COUNT=0

if [ -s "$DEPMAP_FILE" ] && [ "$TOTAL_FILES" -gt 0 ]; then
  orphan_list=""
  for file in $SRC_FILES; do
    normalized="${file#./}"
    basename_no_ext="${normalized%.*}"
    # Check if any line in depmap references this file
    if ! grep -q "$normalized\|$basename_no_ext" "$DEPMAP_FILE" 2>/dev/null; then
      orphan_list="${orphan_list}\"${normalized}\","
      ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
    fi
  done
  if [ -n "$orphan_list" ]; then
    ORPHAN_FILES_JSON="[${orphan_list%,}]"
  fi
fi

# ─── Compute averages ──────────────────────────────────────────────────────────

AVG_FANIN="0"
AVG_FANOUT="0"

if [ "$TOTAL_FILES" -gt 0 ] && command -v bc >/dev/null 2>&1; then
  TOTAL_IMPORTS=$(grep -c ' <- ' "$DEPMAP_FILE" 2>/dev/null || true)
  TOTAL_IMPORTS="${TOTAL_IMPORTS:-0}"
  AVG_FANIN=$(echo "scale=1; ${TOTAL_IMPORTS} / ${TOTAL_FILES}" | bc 2>/dev/null || echo "0")
  AVG_FANIN="${AVG_FANIN:-0}"
  AVG_FANOUT="$AVG_FANIN"
fi

# ─── Determine verdict ────────────────────────────────────────────────────────

VERDICT="PASS"
SUMMARY=""

if [ "$CIRCULAR_COUNT" -gt 0 ]; then
  VERDICT="FAIL"
  SUMMARY="FAIL: ${CIRCULAR_COUNT} circular dependency/dependencies detected."
elif [ "$GOD_COUNT" -gt 0 ]; then
  # Check if any god module has fan-in > 10
  HIGH_GOD=$(echo "$GOD_MODULES_JSON" | grep -o '"fan_in":[0-9]*' | awk -F: '{if($2>10) print $2}' | head -1 || true)
  if [ -n "$HIGH_GOD" ]; then
    VERDICT="FAIL"
    SUMMARY="FAIL: God module(s) with fan-in > 10 detected."
  else
    VERDICT="WARN"
    SUMMARY="WARN: No circular deps but ${GOD_COUNT} god module(s) with fan-in > 8."
  fi
else
  SUMMARY="PASS: No circular deps, no god modules. Clean architecture."
fi

# ─── Output ───────────────────────────────────────────────────────────────────

echo "" >&2
echo "Circular deps: $CIRCULAR_COUNT" >&2
echo "God modules (fan-in > 8): $GOD_COUNT" >&2
echo "Orphan files: $ORPHAN_COUNT" >&2
echo "Verdict: $VERDICT" >&2
echo "Summary: $SUMMARY" >&2

# Build circular deps JSON array
CIRCULAR_JSON="[]"
if [ "$CIRCULAR_COUNT" -gt 0 ] && [ -n "$CIRCULAR_DEPS" ]; then
  circ_list=""
  while IFS= read -r c; do
    [ -z "$c" ] && continue
    circ_list="${circ_list}\"${c}\","
  done <<< "$CIRCULAR_DEPS"
  if [ -n "$circ_list" ]; then
    CIRCULAR_JSON="[${circ_list%,}]"
  fi
fi

cat <<EOF
{
  "project": "$(pwd)",
  "language": "$LANGUAGE",
  "total_files": $TOTAL_FILES,
  "circular_deps": $CIRCULAR_JSON,
  "god_modules": $GOD_MODULES_JSON,
  "orphan_files": $ORPHAN_FILES_JSON,
  "avg_fan_in": $AVG_FANIN,
  "avg_fan_out": $AVG_FANOUT,
  "verdict": "$VERDICT",
  "summary": "$SUMMARY"
}
EOF

rm -f "$DEPMAP_FILE" "$FANIN_FILE" "$FANOUT_FILE"
