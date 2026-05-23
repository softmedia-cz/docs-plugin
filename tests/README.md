# docs-plugin testy

Testovací fixtures + scénáře pro ověření funkčnosti pluginu.

## Struktura

```
tests/
├── README.md                     # tento soubor
├── fixtures/
│   ├── typescript/               # TS app, ~13 zdrojáků, 4 očekávané moduly
│   ├── python/                   # Python app, ~10 zdrojáků, 3 očekávané moduly
│   └── polyglot/                 # TS frontend + Python backend
└── run-tests.sh                  # driver script (ručně spustitelný)
```

Fixtures jsou **minimální, ale realistické** zdrojové repository. Každý modul má >=3 soubory (aby prošel discovery prahem) a doc komentáře (aby `docs-updater` měl z čeho generovat).

## Očekávané výsledky discovery

### TypeScript fixture

Repo: `tests/fixtures/typescript`

| Cesta | Files | Discovery očekávání |
|---|---|---|
| `src/users/` | 3 | ✓ pickup |
| `src/orders/` | 3 | ✓ pickup |
| `src/auth/` | 3 | ✓ pickup |
| `src/api/routes/` | 3 | ✓ pickup |
| `src/utils/` | 2 | ✗ skip (pod prahem) |

Autodetekce by měla najít: TypeScript + Vite/Vitest, ESLint, Prettier, jazyk en.

### Python fixture

Repo: `tests/fixtures/python`

| Cesta | Files | Discovery očekávání |
|---|---|---|
| `billing/` | 3 | ✓ pickup |
| `catalog/` | 3 | ✓ pickup |
| `shipping/` | 3 | ✓ pickup |
| `internal/` | 1 | ✗ skip |

Autodetekce: Python, pytest, Ruff, jazyk en.

### Polyglot fixture

Repo: `tests/fixtures/polyglot`

| Cesta | Files | Discovery očekávání |
|---|---|---|
| `frontend/src/components/` | 3 | ✓ pickup |
| `backend/app/` | 3 | ✓ pickup |

Autodetekce by měla **upozornit** na ambiguous primary stack (TS + Python ~stejně velké) a zeptat se uživatele.

## Manuální test plan

Pro každou fixturu:

### Setup

```bash
cd tests/fixtures/<fixture>
git init -b main 2>/dev/null
git add . && git commit -m "fixture seed" -q
# (volitelně) git remote add origin git@github.com:test/fixture.git
```

### Test 1 — autodetekce (PR 1)

```bash
claude /docs-init --no-bulk --dry-run
```

Očekávat:

- Detekovaný stack vypsaný v summary.
- Detekovaný ticket system odpovídající git remote (pokud je nastaven) nebo `none`.
- Detekovaný jazyk en.
- Žádné otázky (pro TS a Python). Polyglot **má jednu otázku** o primárním stacku.
- Žádné soubory zapsány (kvůli `--dry-run`).

### Test 2 — full init s bulk (PR 1 + PR 2)

```bash
claude /docs-init --max-modules=5
```

Očekávat:

- Vytvořeny: `docs/`, `tasks/`, `CLAUDE.md`, `.gitignore`.
- Vygenerovaných `DESCRIPTION.md` v očekávaných modulech (viz tabulky výše).
- `MODULES.md` v top-level adresářích, kde je >1 sub-modul.
- `docs/modules/<X>/README.md` u packages s ≥3 sub-moduly.
- Summary report s počty.

Verifikace:

```bash
find . -name DESCRIPTION.md | sort        # očekávat list
find . -name MODULES.md | sort
ls docs/modules/                          # případně
```

### Test 3 — drift detection (PR 3)

```bash
claude /doc-status --output=json
# Očekávat: drifted=0, missing=0
```

Pak edit zdrojáku:

```bash
echo "// edit" >> src/users/UserService.ts        # nebo billing/invoices.py
claude /doc-status --output=json
# Očekávat: drifted >= 1, missing=0
```

Pak fix:

```bash
claude /doc-update --auto
claude /doc-status --output=json
# Očekávat: drifted=0
```

### Test 4 — missing detection

```bash
mkdir -p src/newmodule && cat > src/newmodule/Foo.ts << 'EOF'
/** New module. */
export function foo() {}
EOF
echo "// 2" > src/newmodule/Bar.ts
echo "// 3" > src/newmodule/Baz.ts
claude /doc-status --output=json
# Očekávat: missing >= 1 s cestou src/newmodule
```

### Test 5 — orphaned detection

```bash
rm -rf src/users/*.ts        # smaž zdrojáky, DESCRIPTION.md zůstane
claude /doc-status --output=json
# Očekávat: orphaned >= 1 s cestou src/users
```

### Test 6 — install hooks (PR 4)

```bash
claude /docs-init --install-hooks
ls .claude/settings.json    # očekávat existenci
jq '.hooks | keys' .claude/settings.json   # očekávat ["SessionStart", "Stop"]
```

Spusť další session — ověř, že drift reminder se objeví, pokud je drift.

## Driver script

`run-tests.sh` automatizuje setup a vypisuje pre-flight checklist. Vlastní `claude /…` voláními musíš spustit ručně (test musí běžet uvnitř Claude Code session s nainstalovaným pluginem).

```bash
bash tests/run-tests.sh
```

Skript:

1. Resetuje fixture (rm `docs/`, `tasks/`, `CLAUDE.md`, `.gitignore` doplňky)
2. Vypíše očekávané discovery výsledky
3. Vypíše seznam manuálních příkazů k provedení

## Acceptance kritéria

Plugin je **passing**, pokud:

- [ ] Test 1: dry-run report odpovídá očekávané tabulce discovery (per fixture).
- [ ] Test 2: vygenerované soubory mají správné cesty, `DESCRIPTION.md` mají frontmatter (`type: description`, `module:`, `api_hash:`, `last_updated:`).
- [ ] Test 3: drift cycle je čistý — edit detekuje drift, `--auto` opraví, znovu čistý.
- [ ] Test 4: missing modul je detekován, `--auto` ho přidá.
- [ ] Test 5: orphaned modul je detekován, ale **nesmí být smazán** automaticky.
- [ ] Test 6: hooky se nainstalují, `.claude/settings.json` má validní JSON.

## Známá omezení

- **Není plně automatizované.** Driver script připraví fixture, ale `/docs-init` a `/doc-update` musíš spustit ručně v Claude Code session. Plná automatizace vyžaduje `claude --print --no-interactive` (možný v0.2 follow-up).
- **Token cost.** Test 2 (bulk generation) reálně zavolá API — odhad ~50–100k input tokenů na fixture. Při běhu nasaď `--dry-run` jako základ; reálnou generaci jen občas.
- **Polyglot fixture** má dva lockfiles na stejné úrovni — autodetekce se zeptá. Pro CI / non-interaktivní setup použij `claude /docs-init --no-detect --platforms=cc` a ručně CLAUDE.md doplnit.
