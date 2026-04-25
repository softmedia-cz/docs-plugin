#!/usr/bin/env bash
#
# tests/run-tests.sh — driver pro docs-plugin fixture testy.
#
# Připraví fixture (reset stavu, init git pokud chybí), pak vypíše
# manuální checklist příkazů k provedení v Claude Code session.
#
# Použití:
#   bash tests/run-tests.sh [--fixture=typescript|python|polyglot|all]
#                           [--reset]
#                           [--keep-git]
#

set -euo pipefail

FIXTURE="${1:-all}"
RESET=false
KEEP_GIT=false

for arg in "$@"; do
  case "$arg" in
    --fixture=*) FIXTURE="${arg#*=}" ;;
    --reset) RESET=true ;;
    --keep-git) KEEP_GIT=true ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FIXTURES_DIR="$REPO_ROOT/tests/fixtures"

run_for_fixture() {
  local name="$1"
  local dir="$FIXTURES_DIR/$name"

  if [ ! -d "$dir" ]; then
    echo "✗ Fixture '$name' neexistuje v $FIXTURES_DIR"
    return 1
  fi

  echo
  echo "═══════════════════════════════════════════════════════════════"
  echo "  Fixture: $name  ($dir)"
  echo "═══════════════════════════════════════════════════════════════"

  cd "$dir"

  if [ "$RESET" = true ]; then
    echo "→ Reset: mažu vygenerované docs/, tasks/, CLAUDE.md, AGENTS.md, .cursor/, .codex/, .claude/"
    rm -rf docs tasks CLAUDE.md AGENTS.md GEMINI.md .cursor .codex .claude
    rm -f .gitignore
  fi

  if [ ! -d ".git" ] && [ "$KEEP_GIT" != true ]; then
    echo "→ Init git (neměl)"
    git init -b main -q
    git add . > /dev/null
    git -c user.email=fixture@example.com -c user.name=Fixture commit -q -m "fixture seed" || true
  fi

  echo
  echo "Source files:"
  find . \( -path ./node_modules -o -path ./.git -o -path ./dist -o -path ./build \) -prune -o \
    -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.rs' -o -name '*.cs' \) -print | sort

  echo
  echo "Manuální kroky (spusť v Claude Code session s docs-plugin):"
  cat <<EOF

  cd $dir

  # Test 1 — autodetekce a dry-run
  /docs-init --no-bulk --dry-run

  # Test 2 — full bulk init (max 5 modulů, šetří tokeny)
  /docs-init --max-modules=5

  # Verifikace
  find . -name DESCRIPTION.md | sort
  find . -name MODULES.md | sort
  test -d docs/modules && ls docs/modules/

  # Test 3 — drift detection cycle
  /doc-status --output=json
  # (edituj zdroják)
  /doc-status --output=json   # očekávat drift
  /doc-update --auto
  /doc-status --output=json   # očekávat clean

  # Test 4 — missing detection (vytvoř nový modul)

  # Test 5 — orphaned detection (smaž zdrojáky, nech DESCRIPTION.md)

  # Test 6 — install hooks
  /docs-init --install-hooks
  cat .claude/settings.json

EOF

  echo
  echo "Očekávané výsledky discovery (pro $name): viz tests/README.md"
}

case "$FIXTURE" in
  all)
    run_for_fixture typescript
    run_for_fixture python
    run_for_fixture polyglot
    ;;
  typescript|python|polyglot)
    run_for_fixture "$FIXTURE"
    ;;
  *)
    echo "Neznámá fixture: $FIXTURE"
    echo "Použití: $0 [--fixture=typescript|python|polyglot|all] [--reset]"
    exit 1
    ;;
esac

echo
echo "Hotovo. Pokračuj manuálními kroky výše v Claude Code session."
