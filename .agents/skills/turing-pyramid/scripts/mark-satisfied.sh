#!/bin/bash
# Turing Pyramid — Mark Need as Satisfied + Apply Cross-Need Impact
# Usage: ./mark-satisfied.sh <need> [impact]
# Impact: float 0.0-3.0 (default 3.0)

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$SKILL_DIR/assets/needs-state.json"
CROSS_IMPACT_FILE="$SKILL_DIR/assets/cross-need-impact.json"

if [[ -z "$1" ]]; then
    echo "Usage: $0 <need> [impact]"
    echo "Example: $0 connection 1.5"
    exit 1
fi

NEED="$1"
IMPACT="${2:-3.0}"
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Validate impact is numeric and in range
if ! [[ "$IMPACT" =~ ^-?[0-9]*\.?[0-9]+$ ]]; then
    echo "❌ Invalid impact value: $IMPACT (must be numeric)"
    exit 1
fi

# Clamp impact to 0-3 range
if (( $(echo "$IMPACT < 0" | bc -l) )); then
    echo "⚠️  Impact $IMPACT clamped to 0"
    IMPACT="0"
fi
if (( $(echo "$IMPACT > 3" | bc -l) )); then
    echo "⚠️  Impact $IMPACT clamped to 3.0"
    IMPACT="3.0"
fi

# Validate need exists
if ! jq -e ".needs.\"$NEED\"" "$STATE_FILE" > /dev/null 2>&1; then
    echo "❌ Unknown need: $NEED"
    echo "Valid needs:"
    jq -r '.needs | keys[]' "$STATE_FILE"
    exit 1
fi

# Read current satisfaction
CURRENT_SAT=$(jq -r --arg need "$NEED" '.needs[$need].satisfaction // 2.0' "$STATE_FILE")

# Calculate new satisfaction: current + impact, clamped to 0-3
NEW_SAT=$(echo "scale=2; $CURRENT_SAT + $IMPACT" | bc -l)
if (( $(echo "$NEW_SAT < 0" | bc -l) )); then
    NEW_SAT="0.00"
fi
if (( $(echo "$NEW_SAT > 3.0" | bc -l) )); then
    NEW_SAT="3.00"
fi

# Update state: satisfaction, last_satisfied, last_decay_check, impact
jq --arg need "$NEED" --arg now "$NOW_ISO" --argjson impact "$IMPACT" --argjson sat "$NEW_SAT" '
  .needs[$need].satisfaction = $sat |
  .needs[$need].last_satisfied = $now |
  .needs[$need].last_decay_check = $now |
  .needs[$need].last_impact = $impact |
  ._meta.last_cycle = $now
' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"

echo "✅ $NEED marked as satisfied (impact: $IMPACT)"
echo "   satisfaction: $CURRENT_SAT → $NEW_SAT"
echo "   last_satisfied = $NOW_ISO"

# Apply cross-need impacts (on_action)
if [[ -f "$CROSS_IMPACT_FILE" ]]; then
    FLOOR=$(jq -r '.settings.floor // 0.5' "$CROSS_IMPACT_FILE")
    CEILING=$(jq -r '.settings.ceiling // 3.0' "$CROSS_IMPACT_FILE")
    
    # Get all impacts where source = this need and on_action is set
    IMPACTS=$(jq -r --arg need "$NEED" '
        .impacts[] | 
        select(.source == $need and .on_action != null) |
        "\(.target):\(.on_action)"
    ' "$CROSS_IMPACT_FILE")
    
    if [[ -n "$IMPACTS" ]]; then
        echo ""
        echo "📊 Cross-need impacts (on_action):"
        
        while IFS=: read -r TARGET DELTA; do
            [[ -z "$TARGET" ]] && continue
            
            # Get current satisfaction of target
            CURRENT_SAT=$(jq -r --arg t "$TARGET" '.needs[$t].satisfaction // 2.0' "$STATE_FILE")
            
            # Calculate new satisfaction with floor/ceiling
            NEW_SAT=$(echo "$CURRENT_SAT + $DELTA" | bc -l)
            
            # Apply floor
            if (( $(echo "$NEW_SAT < $FLOOR" | bc -l) )); then
                NEW_SAT="$FLOOR"
            fi
            # Apply ceiling
            if (( $(echo "$NEW_SAT > $CEILING" | bc -l) )); then
                NEW_SAT="$CEILING"
            fi
            
            # Format to 2 decimal places
            NEW_SAT=$(printf "%.2f" "$NEW_SAT")
            
            # Update target satisfaction
            jq --arg t "$TARGET" --argjson sat "$NEW_SAT" --arg src "$NEED" --arg now "$NOW_ISO" '
                .needs[$t].satisfaction = $sat |
                .needs[$t].last_cross_impact = {
                    "source": $src,
                    "delta": (($sat | tonumber) - (.needs[$t].satisfaction // 2)),
                    "timestamp": $now
                }
            ' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
            
            if (( $(echo "$DELTA > 0" | bc -l) )); then
                echo "   → $TARGET: +$DELTA (now: $NEW_SAT)"
            else
                echo "   → $TARGET: $DELTA (now: $NEW_SAT)"
            fi
            
        done <<< "$IMPACTS"
    fi
    
    # Check for on_low bonus (understanding → autonomy special case)
    CURRENT_SAT=$(jq -r --arg need "$NEED" '.needs[$need].satisfaction // 2.0' "$STATE_FILE")
    if (( $(echo "$CURRENT_SAT <= 1.0" | bc -l) )); then
        ON_LOW_IMPACTS=$(jq -r --arg need "$NEED" '
            .impacts[] | 
            select(.source == $need and .on_low != null) |
            "\(.target):\(.on_low)"
        ' "$CROSS_IMPACT_FILE")
        
        if [[ -n "$ON_LOW_IMPACTS" ]]; then
            echo ""
            echo "🔥 Low-state bonus (curiosity drive):"
            
            while IFS=: read -r TARGET DELTA; do
                [[ -z "$TARGET" ]] && continue
                
                CURRENT_TARGET=$(jq -r --arg t "$TARGET" '.needs[$t].satisfaction // 2.0' "$STATE_FILE")
                NEW_SAT=$(echo "$CURRENT_TARGET + $DELTA" | bc -l)
                
                if (( $(echo "$NEW_SAT > $CEILING" | bc -l) )); then
                    NEW_SAT="$CEILING"
                fi
                
                NEW_SAT=$(printf "%.2f" "$NEW_SAT")
                
                jq --arg t "$TARGET" --argjson sat "$NEW_SAT" '
                    .needs[$t].satisfaction = $sat
                ' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
                
                echo "   → $TARGET: +$DELTA (on_low bonus, now: $NEW_SAT)"
                
            done <<< "$ON_LOW_IMPACTS"
        fi
    fi
fi
