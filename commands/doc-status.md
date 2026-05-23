---
description: Read-only drift report. Vypíše stav docs-plugin dokumentace v repu — které moduly jsou v driftu, které chybí, které jsou orphaned. Nedělá žádné úpravy.
argument-hint: "[--quiet] [--output=text|json]"
---

# /doc-status

Vypíše drift stav `DESCRIPTION.md` napříč repem **bez jakékoliv akce**. Vhodné pro:

- Manuální audit před release nebo PR
- SessionStart hook (subtilní reminder, kolik modulů je v driftu)
- Stop hook (pokud session měla edity, varuj na drift)
- CI check (`--output=json --quiet` → exit code podle stavu)

## Vstup

- `--quiet` — minimální výstup (jen číselné shrnutí, vhodné pro hooky)
- `--output=text` (default) — human-readable
- `--output=json` — strojově zpracovatelný výstup (pro hooky a CI)

## Co dělá (a co NEDĚLÁ)

**Dělá:**

1. Najde všechny `DESCRIPTION.md` v repu (bez `templates/`, `node_modules/`, `dist/`, atd. — viz blacklist v `/doc-update`).
2. Pro každý spočítá `current_api_hash` ze zdrojáků.
3. Porovná s `api_hash` ve frontmatteru.
4. Zaznamená kategorii: `current` / `drifted` / `missing` / `orphaned` / `deprecated`.
5. Spočítá souhrnné statistiky.
6. Vypíše report.

**NEDĚLÁ:**

- Nezapisuje žádný soubor (read-only).
- Nevolá `docs-updater` subagent.
- Nedělá git operace.
- Nemění kontext nebo memory.

## Postup

### 1. Detekce

Stejně jako `/doc-update --all` kroky 1–3 (viz [doc-update.md](doc-update.md)).

### 2. Klasifikace

Pro každý nalezený modul (= adresář se zdrojáky):

| Stav | Podmínka |
|---|---|
| `current` | DESCRIPTION.md existuje, `api_hash` sedí |
| `drifted` | DESCRIPTION.md existuje, `api_hash` neshoda |
| `missing` | Složka má >=3 zdrojáky, ale žádný DESCRIPTION.md |
| `orphaned` | DESCRIPTION.md existuje, ale složka nemá zdrojáky |
| `deprecated` | DESCRIPTION.md má `status: deprecated` ve frontmatteru — skip |

### 3. Output

#### Text mode (default)

```
docs-plugin status
══════════════════

Modulů celkem:    47
  ✓ Aktuální:    37
  ⚠ V driftu:     7
  ✗ Chybí docs:   2
  ⊘ Orphaned:     1

V driftu:
  src/Billing/Invoicing       12 změn   (a7f3c9 → b2e8f1)
  src/Auth/Tokens               7 změn   (e4d21a → 8c1f04)
  src/Common/Validation         3 změny  (5d8a2b → 5d8a2b: malé)
  src/Api/Routes                ...

Chybějící DESCRIPTION.md:
  - src/NewModule (5 zdrojových souborů, 3 exporty)
  - src/AnotherNew (8 zdrojových souborů, 4 exporty)

Orphaned (DESCRIPTION.md bez kódu):
  - src/RemovedModule

→ Pro opravu:  /doc-update --all
→ Pro detail:  /doc-update --all --dry-run
```

#### Quiet mode

Jeden řádek:

```
docs-plugin: 7 drifted, 2 missing, 1 orphaned, 37 current (47 total)
```

Pokud vše OK:

```
docs-plugin: ✓ all current (47 modules)
```

#### JSON mode

```json
{
  "total": 47,
  "current": 37,
  "drifted": 7,
  "missing": 2,
  "orphaned": 1,
  "deprecated": 0,
  "modules": {
    "drifted": [
      {
        "path": "src/Billing/Invoicing",
        "stored_hash": "a7f3c9",
        "current_hash": "b2e8f1",
        "estimated_changes": 12
      }
    ],
    "missing": [
      {"path": "src/NewModule", "source_files": 5, "estimated_exports": 3}
    ],
    "orphaned": [
      {"path": "src/RemovedModule"}
    ]
  }
}
```

### 4. Exit code

| Stav | Exit code |
|---|---|
| Vše current | `0` |
| Drifted nebo missing | `1` |
| Error (např. nejsme v docs-plugin repu) | `2` |

CI scripts můžou mít `claude /doc-status --quiet --output=json` jako lint check.

## Edge cases

### Repo nemá docs-plugin

```
✗ Tento repozitář nemá docs-plugin strukturu.
  Pro inicializaci: /docs-init
```

Exit code `2`.

### Žádné zdrojáky v repu

```
docs-plugin: ✓ no source modules detected
```

Exit code `0`.

### Hodně driftnutých modulů (>20)

V `text` mode vypiš jen prvních 10, dál:

```
... a dalších 23 modulů.
Pro celý seznam: /doc-status --output=json
```

## Použití v hookích

### SessionStart (volitelné)

Při startu session vypsat krátký drift sumář:

```bash
# v hook handleru
status=$(claude /doc-status --quiet --output=json 2>/dev/null)
drifted=$(echo "$status" | jq -r '.drifted // 0')
if [ "$drifted" -gt 0 ]; then
  echo "💡 docs-plugin: $drifted modulů v driftu. Spusť /doc-update --all pro opravu."
fi
```

### Stop (volitelné)

Po skončení session, pokud byly edity v `src/`, varuj na drift:

```bash
edits_in_src=$(git diff --name-only HEAD | grep -c '^src/')
if [ "$edits_in_src" -gt 0 ]; then
  status=$(claude /doc-status --quiet --output=json 2>/dev/null)
  drifted=$(echo "$status" | jq -r '.drifted // 0')
  if [ "$drifted" -gt 0 ]; then
    echo "💡 Po editech v src/ je $drifted modulů v driftu — /doc-update --all"
  fi
fi
```

Konkrétní `settings.json` šablona je v PR 4 (`templates/settings.json`).

## Důležité

- **Read-only.** Tento command **nikdy** nezapíše soubor.
- **Bezpečné v hookích.** Nepřevolává model, žádné LLM tokeny — všechno je deterministická detekce.
- **Rychlé.** Pro repo s ~50 moduly by mělo odběhnout do 2 sekund (žádný subagent, žádné LLM volání).
