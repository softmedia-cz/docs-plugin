# CLAUDE.md — {{PROJECT_NAME}}

Tento soubor čte Claude Code při startu. Definuje konvence, které v tomto repu platí. Další agenti (Codex, Cursor, Gemini CLI) čtou odpovídající soubory (`AGENTS.md`, `.cursor/rules/docs-plugin.mdc`) — mají synchronní obsah.

## Dokumentační konvence: docs-plugin

Repozitář používá [docs-plugin](https://github.com/softmedia/docs-plugin) — substrát pro strukturovanou dokumentaci. Klíčová pravidla:

### 1. AS IS vs TO BE

- **`docs/`** popisuje **aktuální stav** systému (AS IS). Aktualizuje se při mergi tasku/epiku.
- **`tasks/<EPIC>/<TASK>/`** popisuje **plánované změny** (TO BE). Obsahuje `assignment.md`, `plan.md`, `changelog.md`.

### 2. docs/ NENÍ changelog

V `docs/`, `DESCRIPTION.md`, `MODULES.md` **nikdy** nepiš věty typu „was changed", „previously", „was X, now Y". Popisuj **aktuální stav**. Historie patří do git logu a `tasks/<EPIC>/<TASK>/changelog.md`.

### 3. Rekurzivní struktura

```
docs/
├── architecture/      # systémová architektura
├── reference/         # funkční referenční popis
└── modules/
    └── <module>/
        ├── README.md
        ├── architecture/
        ├── reference/
        └── modules/   ← rekurze pro submoduly
```

### 4. Dokumentace u kódu

- Každá netriviální složka se zdrojáky má `DESCRIPTION.md` (co tady žije, veřejné API, příklad použití).
- Každý top-level balíček (assembly / npm package / Python package / Rust crate) má `MODULES.md` (přehled namespaců).

### 5. tasks/ je cold storage

Do `tasks/` **proaktivně nečti.** Čti jen když:
- Uživatel explicitně zmíní konkrétní task (JIRA klíč, název)
- Pracuješ na aktivním tasku (a pak čti jen `tasks/<EPIC>/<TASK>/`)
- Uživatel požádá o rešerši historického rozhodování

### 6. Frontmatter

Všechny substrate-konformní `.md` soubory mají YAML frontmatter. Minimum:

```yaml
---
type: description | module-readme | architecture | reference | adr | task-assignment | task-plan | task-changelog
status: active | draft | deprecated
last_updated: YYYY-MM-DD
---
```

`DESCRIPTION.md` má navíc `api_hash:` — vygeneruje ho `/doc-update`.

## Jak hledat dokumentaci

**NEPOUŽÍVEJ `@docs/...` odkazy v tomto souboru.** Místo toho postupuj podle konvence:

- Architektura systému → `docs/architecture/`
- Funkční chování → `docs/reference/`
- Konkrétní modul → `docs/modules/<module>/`
- Co dělá tenhle kód → `DESCRIPTION.md` vedle kódu
- Historie rozhodnutí → `docs/architecture/decisions/`
- Rozpracovaný task → `tasks/<EPIC>/<TASK>/` (jen na vyžádání!)

Pokud je nainstalován MCP server `ReadTheDocs`, používej ho pro agregované vyhledávání (`topic`, `forCode`, `concept`, `adr`).

## Slash commandy (Claude Code)

- `/docs-init` — inicializuje strukturu v novém repu
- `/doc-update <path>` — inkrementální aktualizace dokumentace
- `/doc-revise <path>` — kompletní přepis dokumentace

## Subagent

`docs-updater` — volaný commandy výše, izolovaný kontext, aktualizuje `.md` soubory podle tvrdých pravidel. Nezapisuje changelog.

## Ticketovací konvence

Klíče tasků odpovídají ticketovacímu systému: **{{TICKET_SYSTEM}}**.

Struktura: `tasks/<EPIC-KEY>/<TASK-KEY>/`

Branch naming: `feature/<TASK-KEY>-<slug>` nebo `fix/<TASK-KEY>-<slug>`.

## Project-specific konvence

<!--
Sem doplň konvence specifické pro tento projekt:
- Tech stack (.NET 8, Python 3.11, TypeScript, ...)
- Kódovací standardy (linter, formatter)
- Testing framework
- Deployment target
- Specifické integrace nebo externí závislosti
-->

- **Tech stack:** {{TECH_STACK}}
- **Kódovací styl:** {{CODE_STYLE}}
- **Testing:** {{TESTING}}

## Co NEdělat

- Nepiš changelog v `docs/`
- Nečti proaktivně `tasks/`
- Nerozbíjej rekurzivní strukturu
- Nemixuj AS IS a TO BE v jednom souboru
- Nevytvářej odkazy `@docs/*` v tomto souboru
- Nevygenerovávej `MODULES.md` ručně (je auto-generovaný)

---

Detaily metodiky: viz docs-plugin skill (`/skills/docs-plugin/SKILL.md` v nainstalovaném pluginu) nebo online dokumentace docs-plugin.
