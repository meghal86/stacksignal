#!/usr/bin/env bash
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required." >&2
  exit 1
fi

python3 - <<'PY'
import sys
if sys.version_info < (3, 8):
    raise SystemExit("Error: Python 3.8+ is required.")
print(f"Python check OK: {sys.version.split()[0]}")
PY

python3 - <<'PY'
import json, re
from pathlib import Path
errs=[]
for p in Path('definitions').glob('*.json'):
    try:
        data=json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        errs.append(f"{p.name}: {e}")
        continue
    for item in data.get('signatures',[]):
        pat=item.get('pattern')
        if pat:
            try: re.compile(pat)
            except re.error as e: errs.append(f"{p.name}:{item.get('id','?')}: {e}")
if errs:
    raise SystemExit('Definition validation failed\n'+'\n'.join(errs))
print('Definition validation OK')
PY

echo ""
echo "✅ Guardian Core installation complete."
echo "Run: python3 scripts/admin.py status"
echo ""
