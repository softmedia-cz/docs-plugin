#!/usr/bin/env bash
#
# docs-plugin-check.sh — sdílená detekční logika pro docs-plugin hooky.
#
# CHEAP a DETERMINISTICKÝ — žádné LLM volání, žádné tokeny. Používá mtime
# heuristiku (zdrojáky novější než jejich DESCRIPTION.md = možný drift).
# Pro přesnou kontrolu slouží `/doc-status` (api_hash), pro opravu
# `/doc-update --all`.
#
# Režimy (1. argument):
#   session-start  — při startu session: buď drift hint, nebo nabídka setupu
#   post-merge     — po git pull/merge: drift hint
#
# Výstup jde na stdout (injektuje se do kontextu agenta / ukáže uživateli).
# Ticho = nic k řešení.

set -uo pipefail

MODE="${1:-session-start}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 0

# Přípony zdrojáků, které sledujeme.
SRC_GLOBS=(-name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
  -o -name '*.py' -o -name '*.go' -o -name '*.rs' -o -name '*.cs' \
  -o -name '*.rb' -o -name '*.php' -o -name '*.java' -o -name '*.kt')

PRUNE=(-path ./node_modules -o -path ./.git -o -path ./dist -o -path ./build \
  -o -path ./target -o -path ./.venv -o -path ./vendor -o -path '*/__pycache__/*')

is_docs_plugin_repo() {
  grep -qil 'docs-plugin' CLAUDE.md AGENTS.md 2>/dev/null && return 0
  if [ -d docs ]; then
    find . \( "${PRUNE[@]}" \) -prune -o -name DESCRIPTION.md -print 2>/dev/null \
      | head -1 | grep -q . && return 0
  fi
  return 1
}

has_source_code() {
  find . -maxdepth 5 \( "${PRUNE[@]}" \) -prune -o -type f \( "${SRC_GLOBS[@]}" \) -print 2>/dev/null \
    | head -1 | grep -q .
}

# Spočítej moduly, kde je aspoň jeden zdroják novější než jeho DESCRIPTION.md.
count_possibly_stale() {
  local stale=0
  while IFS= read -r desc; do
    [ -z "$desc" ] && continue
    local dir
    dir="$(dirname "$desc")"
    if find "$dir" -maxdepth 1 -type f \( "${SRC_GLOBS[@]}" \) -newer "$desc" 2>/dev/null \
      | head -1 | grep -q .; then
      stale=$((stale + 1))
    fi
  done < <(find . \( "${PRUNE[@]}" \) -prune -o -name DESCRIPTION.md -print 2>/dev/null)
  echo "$stale"
}

if is_docs_plugin_repo; then
  stale="$(count_possibly_stale)"
  if [ "${stale:-0}" -gt 0 ]; then
    echo "💡 docs-plugin: $stale modulů má zdrojáky novější než dokumentaci (možný drift)."
    echo "   Přesná kontrola: /doc-status   •   Oprava: /doc-update --all"
  fi
else
  # Repo zatím docs-plugin nepoužívá.
  [ "$MODE" = "session-start" ] || exit 0          # nabídku jen na startu session
  [ -f .claude/.docs-plugin-declined ] && exit 0   # uživatel už odmítl
  if has_source_code; then
    echo "💡 Tento repozitář nepoužívá docs-plugin. Chceš tu zavést automatickou"
    echo "   dokumentaci u kódu (DESCRIPTION.md + drift detekce)? Spusť /docs-init."
    echo "   (Nezobrazovat víckrát: touch .claude/.docs-plugin-declined)"
  fi
fi

exit 0
