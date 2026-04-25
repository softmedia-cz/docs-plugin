---
description: Nastaví docs-plugin strukturu v repozitáři (docs/, tasks/, CLAUDE.md, AGENTS.md, .cursor/rules)
argument-hint: "[--force] [--ticket-system=jira|linear|github|none] [--platforms=cc,codex,cursor,gemini] [--lang=cs|en]"
---

# /docs-init

Inicializuj docs-plugin v aktuálním repozitáři. Vytvoří kostru `docs/`, `tasks/`, `CLAUDE.md`, `AGENTS.md` a `.cursor/rules/docs-plugin.mdc`.

Při spuštění:

## 1. Zjisti stav repa

```bash
pwd
git rev-parse --show-toplevel 2>/dev/null || echo "NOT_A_GIT_REPO"
ls -la
```

Pokud nejsi v git repu, zeptej se uživatele, zda pokračovat bez gitu (substrate funguje i v non-git adresářích, ale pak nemá smysl `.gitignore` část).

## 2. Zjisti, co už existuje

Zkontroluj existenci:
- `docs/` (existuje? má modulární strukturu?)
- `tasks/` (existuje?)
- `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`
- `src/` nebo ekvivalent (zdrojáky)

Pokud něco existuje a argument nebyl `--force`, **nepřepisuj**. Místo toho:
- Řekni uživateli, co existuje
- Nabídni migraci (pokud existující `docs/` má jinou strukturu, nabídni reorganizaci)

## 3. Zjisti konfiguraci

Pokud uživatel neupřesnil argumenty, zeptej se:

1. **Typ projektu** (malý skript / standardní aplikace / velký multi-module systém) — ovlivní, kolik počátečních modulů vygenerovat
2. **Ticketovací systém** (Jira / Linear / GitHub Issues / žádný) — ovlivní formát klíčů v `tasks/`
3. **Target platformy** (Claude Code / + Codex / + Cursor / všechno) — ovlivní, které config soubory vytvořit
4. **Jazyk obsahu dokumentace** (CZ / EN) — ovlivní obsah README.md šablon

## 4. Vytvoř strukturu

Podle odpovědí vygeneruj:

### Povinné soubory (vždy)

```
docs/
├── README.md                                # úvod do projektu
├── architecture/
│   ├── README.md                            # high-level architektura
│   └── decisions/                           # ADR
│       └── README.md                        # šablona ADR, odkaz na schéma
└── reference/
    └── README.md

tasks/
└── README.md                                # pravidla, klíčování, šablony

CLAUDE.md                                    # pravidla pro Claude Code
```

### Podmíněné soubory

- **Codex cíl:** `AGENTS.md` (symlink na `CLAUDE.md`, pokud FS umožňuje; jinak kopie)
- **Cursor cíl:** `.cursor/rules/docs-plugin.mdc`
- **Gemini cíl:** `GEMINI.md` (symlink nebo kopie CLAUDE.md)
- **Git repo:** `.gitignore` doplněk (viz níže)

### Šablony

Šablony k rozkopírování jsou v pluginu pod `templates/tree/` a `templates/`:

- `templates/CLAUDE.md` → `<repo>/CLAUDE.md`
- `templates/AGENTS.md` → `<repo>/AGENTS.md`
- `templates/cursor-rule/docs-plugin.mdc` → `<repo>/.cursor/rules/docs-plugin.mdc`
- `templates/tree/docs/...` → `<repo>/docs/...`
- `templates/tree/tasks/...` → `<repo>/tasks/...`
- `templates/tree/src/DESCRIPTION.md` → ukázkový příklad do jednoho z existujících `src/` adresářů (jako reference pro vývojáře)

Při kopírování:
- Nahraď placeholdery: `{{PROJECT_NAME}}`, `{{TICKET_SYSTEM}}`, `{{DATE}}`, `{{LANG}}`
- Ponech frontmatter beze změny (YAML klíče jsou anglicky)
- Přelož obsah do zvoleného jazyka (CZ/EN)

## 5. Aktualizuj `.gitignore`

Pokud `.gitignore` existuje, připoj:

```gitignore

# docs-plugin
tasks/*/*/scratch/
tasks/*/*/.working/
.doc-update-cache/
```

Pokud neexistuje, vytvoř ho s celou hlavičkou.

## 6. Nabídni další kroky

Po dokončení informuj uživatele:

```
✓ docs-plugin inicializován.

Další kroky:
1. Zkontroluj vygenerovaný CLAUDE.md — případně přidej projekt-specifické rules.
2. Pokud máš existující dokumentaci, zvažme migraci: chceš ji projít a rozložit do nové struktury?
3. Pro první modul: pusť `/doc-update <cesta-k-modulu>` nebo nech docs-updater subagent vygenerovat DESCRIPTION.md.
4. Při založení nového tasku vytvoř `tasks/<EPIC-KEY>/<TASK-KEY>/` se šablonou (viz tasks/README.md).

Tipy:
- CLAUDE.md a AGENTS.md mají být synchronní. Použij symlink, pokud FS umožňuje.
- Pokud máš pre-commit hook infrastrukturu, nainstaluj hook z templates/hooks/pre-commit-doc-update (volitelné).
```

## Argumenty

- `--force` — přepiš existující substrate soubory (používej opatrně)
- `--ticket-system=jira|linear|github|none` — předpokládaný formát klíčů pro tasky
- `--platforms=cc,codex,cursor,gemini` — čárkou oddělený seznam target platforem
- `--lang=cs|en` — jazyk obsahu šablon

Pokud argumenty chybí, commandem interaktivně zjisti.

## Edge cases

### Repo už má docs-plugin

Detekuj podle existence `docs/modules/` nebo `tasks/` s epic strukturou, nebo podle hlavičky v `CLAUDE.md` („This repository uses docs-plugin"). Pokud substrate už je:
- Neprováděj init
- Nabídni `/doc-revise` pro existující moduly, nebo přidání nové platformy (např. Cursor do CC+Codex repa)

### Repo má custom `docs/` strukturu

Detekuj flat `docs/` (hodně souborů na jedné úrovni) nebo jiný pattern:
- **Neber si to silou.** Nabídni vizualizaci rozdílu (stávající struktura vs docs-plugin)
- Nabídni **dry-run migraci:** vytvořit novou strukturu vedle existující (`docs.new/`), uživatel pak manuálně přesune
- Nebo nabídni **non-destructive coexistence:** přidat `docs/modules/` pro nové moduly, staré soubory nechat (a postupně migrovat)

### Ticket system detekce

Pokud uživatel neví nebo neřekne:
- Prohlédni `.git/config` / remote URL (pokud GitHub → `github`, Atlassian → `jira`)
- Prohlédni existující branch names (`feature/CF-123` → Jira, `feat/LIN-234` → Linear, `fix/issue-42` → GitHub)
- Pokud nic, default na `none` — formát klíčů v `tasks/` bude volný, v README.md je dokumentovaná konvence

### `src/` neexistuje nebo má jiné jméno

Hledej obvyklá jména: `src/`, `app/`, `lib/`, `packages/`, `crates/`, `cmd/`, `internal/`. Pokud najdeš víc, zeptej se uživatele, které je primární. Pokud žádné, zeptej se, kde mají žít `DESCRIPTION.md` soubory.

## Výstup

Stručný souhrn:

```
✓ Vytvořeno: docs/, tasks/, CLAUDE.md, AGENTS.md, .cursor/rules/docs-plugin.mdc
✓ Aktualizován: .gitignore
✗ Přeskočeno: žádné (vše bylo čistě vytvořeno)

Ticketovací konvence: Jira (klíče CF-*)
Cílové platformy: Claude Code, Codex, Cursor
Jazyk: CZ

Struktura:
  docs/
  ├── README.md
  ├── architecture/
  │   ├── README.md
  │   └── decisions/
  │       └── README.md
  └── reference/
      └── README.md
  tasks/
  └── README.md

Další krok: pusť `/doc-update <cesta>` na existující modul pro vygenerování DESCRIPTION.md.
```
