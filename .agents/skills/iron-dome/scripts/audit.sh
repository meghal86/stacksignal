#!/usr/bin/env bash
# Iron Dome — Audit Log Viewer
#
# Usage:
#   audit.sh tail [N]                    Live-tail the log (default 20 lines)
#   audit.sh search <term>               Search log for a term
#   audit.sh date <YYYY-MM-DD>           Show entries for a specific date
#   audit.sh date <start> <end>          Show entries in a date range
#   audit.sh summary                     Show event count by category/level
#   audit.sh help                        Show this help

set -euo pipefail

# Resolve log path from config or use default
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
DEFAULT_LOG="$SKILL_DIR/logs/iron-dome.log"

# Try to read log path from config
if command -v python3 &>/dev/null && [ -f "$SKILL_DIR/iron-dome.config.json" ]; then
    CONFIG_LOG=$(python3 -c "
import json, sys
try:
    with open('$SKILL_DIR/iron-dome.config.json') as f:
        print(json.load(f).get('audit_log', ''))
except: pass
" 2>/dev/null || true)
    if [ -n "$CONFIG_LOG" ]; then
        # Resolve relative paths from skill dir
        if [[ "$CONFIG_LOG" != /* ]]; then
            CONFIG_LOG="$SKILL_DIR/$CONFIG_LOG"
        fi
        LOG_FILE="$CONFIG_LOG"
    else
        LOG_FILE="$DEFAULT_LOG"
    fi
else
    LOG_FILE="$DEFAULT_LOG"
fi

# Allow override via environment
LOG_FILE="${IRON_DOME_LOG:-$LOG_FILE}"

# Colours
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

usage() {
    echo -e "${BOLD}Iron Dome — Audit Log Viewer${RESET}"
    echo ""
    echo "Usage:"
    echo "  $(basename "$0") tail [N]              Live-tail the log (default 20 lines)"
    echo "  $(basename "$0") search <term>         Search log for a term (case-insensitive)"
    echo "  $(basename "$0") date <YYYY-MM-DD>     Show entries for a specific date"
    echo "  $(basename "$0") date <start> <end>    Show entries in a date range"
    echo "  $(basename "$0") summary               Event count by category and level"
    echo "  $(basename "$0") help                  Show this help"
    echo ""
    echo "Log file: $LOG_FILE"
    echo "Override: IRON_DOME_LOG=/path/to/log $(basename "$0") tail"
}

check_log() {
    if [ ! -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}No log file found at: $LOG_FILE${RESET}"
        echo "The log will be created when Iron Dome records its first event."
        exit 0
    fi
}

colorize() {
    # Colorize log levels in output
    sed \
        -e "s/\[CRITICAL\]/[${RED}CRITICAL${RESET}]/g" \
        -e "s/\[ALERT\]/[${RED}ALERT${RESET}]/g" \
        -e "s/\[WARN\]/[${YELLOW}WARN${RESET}]/g" \
        -e "s/\[INFO\]/[${GREEN}INFO${RESET}]/g"
}

cmd_tail() {
    check_log
    local lines="${1:-20}"
    echo -e "${BOLD}Last $lines entries:${RESET}"
    echo ""
    tail -n "$lines" "$LOG_FILE" | colorize
    echo ""
    echo -e "${CYAN}--- Watching for new entries (Ctrl+C to stop) ---${RESET}"
    tail -f "$LOG_FILE" | colorize
}

cmd_search() {
    check_log
    local term="$1"
    echo -e "${BOLD}Searching for: ${CYAN}$term${RESET}"
    echo ""
    local count
    count=$(grep -ci "$term" "$LOG_FILE" 2>/dev/null || echo "0")
    echo -e "Found ${BOLD}$count${RESET} matching line(s):"
    echo ""
    grep -i --color=always "$term" "$LOG_FILE" 2>/dev/null | colorize || echo "  (no matches)"
}

cmd_date() {
    check_log
    local start_date="$1"
    local end_date="${2:-$start_date}"

    if [[ ! "$start_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo -e "${RED}Error: Invalid date format. Use YYYY-MM-DD${RESET}"
        exit 1
    fi
    if [[ ! "$end_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        echo -e "${RED}Error: Invalid end date format. Use YYYY-MM-DD${RESET}"
        exit 1
    fi

    if [ "$start_date" = "$end_date" ]; then
        echo -e "${BOLD}Entries for: ${CYAN}$start_date${RESET}"
    else
        echo -e "${BOLD}Entries from: ${CYAN}$start_date${RESET} to ${CYAN}$end_date${RESET}"
    fi
    echo ""

    # Match lines whose timestamp falls in range
    # Log format: [2026-02-22T14:30:00Z] ...
    local found=0
    while IFS= read -r line; do
        # Extract date from [YYYY-MM-DDT...] format
        if [[ "$line" =~ ^\[([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
            local line_date="${BASH_REMATCH[1]}"
            if [[ ! "$line_date" < "$start_date" && ! "$line_date" > "$end_date" ]]; then
                echo "$line"
                found=$((found + 1))
            fi
        fi
    done < "$LOG_FILE" | colorize

    if [ "$found" -eq 0 ]; then
        echo "  (no entries for this date range)"
    fi
    echo ""
    echo -e "${BOLD}Total: $found entries${RESET}"
}

cmd_summary() {
    check_log
    echo -e "${BOLD}Iron Dome Audit Summary${RESET}"
    echo -e "${BOLD}=======================${RESET}"
    echo ""

    local total
    total=$(wc -l < "$LOG_FILE")
    echo -e "Total entries: ${BOLD}$total${RESET}"
    echo ""

    echo -e "${BOLD}By Level:${RESET}"
    for level in INFO WARN ALERT CRITICAL; do
        local count
        count=$(grep -c "\[$level\]" "$LOG_FILE" 2>/dev/null || echo "0")
        case "$level" in
            CRITICAL) echo -e "  ${RED}$level${RESET}: $count" ;;
            ALERT)    echo -e "  ${RED}$level${RESET}: $count" ;;
            WARN)     echo -e "  ${YELLOW}$level${RESET}: $count" ;;
            INFO)     echo -e "  ${GREEN}$level${RESET}: $count" ;;
        esac
    done
    echo ""

    echo -e "${BOLD}By Category:${RESET}"
    for cat in ACTION INJECTION KILL SUBAGENT PII CONFIG; do
        local count
        count=$(grep -c "\[$cat\]" "$LOG_FILE" 2>/dev/null || echo "0")
        if [ "$count" -gt 0 ]; then
            echo -e "  $cat: $count"
        fi
    done
    echo ""

    # Recent activity
    echo -e "${BOLD}Last 5 entries:${RESET}"
    tail -5 "$LOG_FILE" | colorize
}

# --- Main ---

case "${1:-help}" in
    tail)
        cmd_tail "${2:-20}"
        ;;
    search)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: search requires a term${RESET}"
            echo "Usage: $(basename "$0") search <term>"
            exit 1
        fi
        cmd_search "$2"
        ;;
    date)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: date requires at least one date${RESET}"
            echo "Usage: $(basename "$0") date <YYYY-MM-DD> [<end-date>]"
            exit 1
        fi
        cmd_date "$2" "${3:-$2}"
        ;;
    summary)
        cmd_summary
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${RESET}"
        echo ""
        usage
        exit 1
        ;;
esac
