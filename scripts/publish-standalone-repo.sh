#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${1:-standalone-main}"

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Warning: uncommitted changes will be included in the orphan commit."
fi

echo "Creating orphan branch: $BRANCH"
git checkout --orphan "$BRANCH"
git add -A
git commit -m "Initial commit: TON IDE 2.0

Standalone repository — browser IDE for TON (FunC, Tact, Tolk) with AI agents,
MCP, Jetton/AMM templates, and cloud job stubs.

Derived from MIT-licensed TON Web IDE; not a GitHub fork."

echo ""
echo "Done. Next steps:"
echo "  1. Create empty repo on GitHub (NOT via Fork)"
echo "  2. git remote remove origin   # optional"
echo "  3. git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git"
echo "  4. git push -u origin $BRANCH:main"
