# Struktura repozitáře

Detailní popis adresářů, souborů a jejich YAML frontmatter schémat.

## Top-level layout

```
<repo-root>/
├── CLAUDE.md              # pravidla pro Claude Code
├── AGENTS.md              # pravidla pro Codex (a jiné agenty, které čtou AGENTS.md)
├── .cursor/
│   └── rules/
│       └── docs-plugin.mdc   # pravidla pro Cursor
├── docs/                  # AS IS — aktuální stav systému
├── tasks/                 # TO BE — specifikace & historie tasků
└── src/ (nebo app/, lib/, ...)   # zdrojáky
```

## `docs/` — AS IS

Popisuje **aktuální stav** systému. Aktualizuje se při mergi tasku/epiku (ideálně automaticky přes `/doc-update` nebo pre-commit hook).

```
docs/
├── README.md                   # úvod do projektu pro nového člověka/agenta
├── architecture/
│   ├── README.md               # high-level architektura systému
│   ├── decisions/              # ADR (Architecture Decision Records)
│   │   ├── ADR-001-*.md
│   │   └── ADR-002-*.md
│   └── diagrams/               # mermaid / obrázky
├── reference/
│   ├── README.md               # funkční referenční popis systému
│   └── <topic>.md              # konkrétní témata (auth, billing flow, ...)
└── modules/
    └── <module>/               # např. billing, invoicing, payments
        ├── README.md           # konceptuální popis modulu (AS IS)
        ├── architecture/
        │   └── README.md
        ├── reference/
        │   └── README.md
        └── modules/            # rekurze pro submoduly
            └── <submodule>/
                └── ...
```

**Pravidlo rekurze:** kterákoliv úroveň `modules/<X>/` má stejnou strukturu jako `docs/` — `README.md`, volitelně `architecture/`, `reference/`, `modules/`.

**Malé repo:** použij jen kořen (`docs/architecture/`, `docs/reference/`). Žádné `modules/` dokud to reálně nepotřebuješ.

## `tasks/` — TO BE

Popisuje plánované změny, specifikace, rozhodovací historii tasků. **Cold storage — agent ho standardně nečte.** Defaultně zapnutá.

Struktura má **dvě formy** — plugin volí automaticky (viz *Epic auto-promotion* níže).

### Flat (default, malé/střední projekty)

```
tasks/
├── README.md                           # pravidla, klíčování
└── <TASK-KEY>/                         # např. CF-142, LIN-201, ISSUE-45
    ├── assignment.md                   # zadání — co a proč
    ├── plan.md                         # plán — jak
    └── changelog.md                    # skutečně provedené změny
```

### Epic (velké projekty / iniciativy po více tascích)

```
tasks/
├── README.md
└── <EPIC-KEY>/                         # např. CF-100-EPIC, LIN-101
    ├── README.md                       # scope epiku, business cíle
    ├── spec/                           # TO BE specifikace celého epiku
    │   ├── overview.md
    │   └── ...
    └── <TASK-KEY>/                     # např. CF-142
        ├── assignment.md
        ├── plan.md
        └── changelog.md
```

### Epic auto-promotion

Plugin **rozhoduje sám, neptá se uživatele**:

| Situace | Forma |
|---|---|
| Nové / malé repo | flat |
| `/docs-init` detekoval multi-module systém, Jira, nebo >15 modulů | epic-ready od začátku |
| Flat `tasks/` naroste přes ~12 tasků | promote na epic |
| Víc tasků sdílí prefix klíče (`CF-101`, `CF-102`, …) a patří do jedné iniciativy | promote na epic |

**Promote** = přesun existujících `tasks/<TASK>/` pod `tasks/<EPIC>/<TASK>/` + další tasky zakládat tam. Proveď, **jen když je seskupení jednoznačné**; jinak zůstaň flat. Po migraci uživateli oznam (nezastavuj se a neptej se předem).

### Naming convention pro klíče

- **Jira:** `CF-100-EPIC`, `CF-142` (stejně jako branch names)
- **Linear:** `LIN-100-EPIC`, `LIN-142`
- **GitHub Issues:** `ISSUE-42-EPIC`, `ISSUE-45`
- **Vlastní:** cokoliv krátkého a jednoznačného, např. `2026-Q1-billing-refactor/migrate-to-v2`

Pravidlo: klíč tasku **musí přesně odpovídat** klíči ve ticketovacím systému (traceability je důvod existence této struktury).

## `src/` — zdrojáky s dokumentací

```
src/
├── MODULES.md                          # přehled všech top-level modulů v repu
└── <module>/                           # např. Billing (C#), billing/ (Python), @org/billing (TS)
    ├── DESCRIPTION.md                  # co tady žije, veřejné API, jak se to používá
    ├── MODULES.md                      # (jen u assembly/package) přehled namespaců
    └── <submodule>/
        ├── DESCRIPTION.md
        └── ...
```

`DESCRIPTION.md` **patří ke každé složce se zdrojáky**, která má víc než pár souborů nebo exportuje veřejné API. Výjimka: triviální složky (jeden util helper, konstanty) — tam netřeba.

`MODULES.md` **patří ke každému top-level balíčku** (= assembly, npm package, python package, Rust crate). V rekurzivních složkách `<module>/<submodule>/` není — tam stačí `DESCRIPTION.md`.

## Frontmatter schémata

Všechny substrate-konformní `.md` soubory mají YAML frontmatter.

### `DESCRIPTION.md` (u zdrojáků)

```yaml
---
type: description
module: src/Billing/Invoicing           # relativní cesta od rootu repa
status: active                           # active | deprecated | draft
api_hash: a7f3c9d2e5b8                   # hash veřejného API (generuje /doc-update)
last_updated: 2026-04-22
---
```

### `MODULES.md` (u assembly/balíčků)

```yaml
---
type: modules-overview
module: src/Billing
status: active
last_updated: 2026-04-22
---
```

### `docs/modules/<X>/README.md`

```yaml
---
type: module-readme
module: Billing
status: active
last_updated: 2026-04-22
---
```

### `docs/architecture/...` / `docs/reference/...`

```yaml
---
type: architecture                       # nebo reference
scope: system                            # system | module:Billing | ...
status: active
last_updated: 2026-04-22
---
```

### `docs/architecture/decisions/ADR-NNN-slug.md`

```yaml
---
type: adr
adr: 14
title: Idempotent invoice generation
status: accepted                         # proposed | accepted | deprecated | superseded
date: 2026-03-15
supersedes: []                           # [ADR-010, ...]
superseded_by: null                      # ADR-020
tags: [billing, idempotence]
---
```

### `tasks/<EPIC>/README.md`

```yaml
---
type: epic-readme
epic: CF-100-EPIC
status: in-progress                      # planned | in-progress | done | abandoned
started: 2026-01-10
finished: null
---
```

### `tasks/<EPIC>/<TASK>/assignment.md`

```yaml
---
type: task-assignment
epic: CF-100-EPIC
task: CF-142
status: in-progress                      # draft | in-progress | done | abandoned
ticket_url: https://softmedia.atlassian.net/browse/CF-142
branch: feature/CF-142-invoice-idempotence
---
```

### `tasks/<EPIC>/<TASK>/plan.md` a `changelog.md`

Stejný frontmatter jako `assignment.md`, jen `type: task-plan` resp. `type: task-changelog`.

## api_hash — detekce zastarání

`api_hash` v `DESCRIPTION.md` je hash veřejného API dokumentovaného modulu. Slouží k tomu, aby `/doc-update` a pre-commit hook poznaly, jestli se kód změnil natolik, že je dokumentace zastaralá.

Hash se počítá z:
- Seznamu veřejných typů/tříd/funkcí
- Signatur veřejných metod
- Veřejných polí
- Exportů (TS/JS: `export`; Python: `__all__`; C#: `public` modifier; Rust: `pub`)

Implementace je tech-stack-specific. Vzor je v `/doc-update` commandu — tam se dočteš, jak se `api_hash` pro daný jazyk počítá.

## Co se NEcommittuje

Do `.gitignore` doplň:

```gitignore
# docs-plugin scratchpad (per-task working files agents)
tasks/*/*/scratch/
tasks/*/*/.working/

# api_hash cache
.doc-update-cache/
```

`tasks/*/` samotné se **committuje** — reasoning má žít v repu, ne v efemérní paměti agenta.
