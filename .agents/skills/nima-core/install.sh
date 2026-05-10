#!/bin/bash
# NIMA Core Installation Script
# Usage: ./install.sh [--with-ladybug] [--with-local-embedder]

set -e

echo "🧠 NIMA Core Installer"
echo "======================"

# Defaults
INSTALL_LADYBUG=false
LOCAL_EMBEDDER=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --with-ladybug)
            INSTALL_LADYBUG=true
            shift
            ;;
        --with-local-embedder)
            LOCAL_EMBEDDER=true
            shift
            ;;
    esac
done

# Resolve data directory (honor NIMA_DATA_DIR env var)
NIMA_HOME="${NIMA_DATA_DIR:-$HOME/.nima}"
if [[ "$NIMA_HOME" == */memory ]]; then
    NIMA_HOME="${NIMA_HOME%/memory}"
fi
echo "📂 Data directory: $NIMA_HOME"

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION, Node $(node -v 2>/dev/null || echo 'found')"

# Create directories
echo ""
echo "📁 Creating directories..."
mkdir -p "$NIMA_HOME/memory"
mkdir -p "$NIMA_HOME/affect"
mkdir -p "$NIMA_HOME/logs"
mkdir -p ~/.openclaw/extensions
echo "✅ Directories created at $NIMA_HOME"

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."

echo "   Installing: numpy, pandas..."
pip install -q numpy pandas

if [ "$INSTALL_LADYBUG" = true ]; then
    echo "   Installing: real-ladybug..."
    pip install -q real-ladybug
fi

if [ "$LOCAL_EMBEDDER" = true ]; then
    echo "   Installing: sentence-transformers..."
    pip install -q sentence-transformers
fi

echo "✅ Python dependencies installed"

# Install hooks
echo ""
echo "🔌 Installing OpenClaw hooks..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "   Copying nima-memory..."
cp -r "$SCRIPT_DIR/openclaw_hooks/nima-memory" ~/.openclaw/extensions/
echo "   Copying nima-recall-live..."
cp -r "$SCRIPT_DIR/openclaw_hooks/nima-recall-live" ~/.openclaw/extensions/
echo "   Copying nima-affect..."
cp -r "$SCRIPT_DIR/openclaw_hooks/nima-affect" ~/.openclaw/extensions/

echo "✅ Hooks installed to ~/.openclaw/extensions/"

# Configure OpenClaw
echo ""
echo "⚙️ Configuring OpenClaw..."

CONFIG_FILE="$HOME/.openclaw/openclaw.json"

if [ -f "$CONFIG_FILE" ]; then
    echo "⚠️ Config file exists - add plugins manually if needed:"
    echo '   "plugins": { "entries": { "nima-memory": { "enabled": true } } }'
else
    echo "⚠️ Config file not found at $CONFIG_FILE"
fi

# Initialize database
echo ""
echo "🗄️ Initializing database..."
echo "   Running: python3 scripts/init_db.py"
NIMA_DATA_DIR="$NIMA_HOME" python3 "$SCRIPT_DIR/scripts/init_db.py" --verbose

# Migrate to LadybugDB if requested
if [ "$INSTALL_LADYBUG" = true ]; then
    echo ""
    echo "🔄 Migrating to LadybugDB..."
    if [ -f "$SCRIPT_DIR/scripts/ladybug_parallel.py" ]; then
        python3 "$SCRIPT_DIR/scripts/ladybug_parallel.py" --migrate || echo "⚠️ Migration had issues, SQLite will be used as fallback"
    else
        echo "⚠️ Migration script not found, skipping."
    fi
fi

# Summary
echo ""
echo "🎉 Installation complete!"
echo ""
echo "📂 Data stored in: $NIMA_HOME"
echo "   - memory/      : Database files"
echo "   - affect/      : Emotional state"
echo "   - logs/        : Log files"
echo ""
echo "📦 Next steps:"
echo ""
echo "   1. (Optional) Set embedding provider:"
echo "      export NIMA_EMBEDDER=voyage"
echo "      export VOYAGE_API_KEY=your-api-key"
echo "      Default: local embeddings — zero external calls"
echo ""
echo "   2. Restart OpenClaw:"
echo "      openclaw gateway restart"
echo ""
echo "   3. Verify installation:"
echo "      python3 -c \"from nima_core import get_affect_system; print('OK')\""
echo ""
echo "📚 Documentation: https://nima-core.ai"
echo "🐛 Issues: https://github.com/lilubot/nima-core/issues"
