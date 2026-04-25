---
type: tasks-readme
status: active
last_updated: "{{DATE}}"
---

# Tasks — TO BE specifikace & historie

Tento adresář obsahuje **TO BE** dokumentaci: specifikace plánovaných změn, plány implementace, záznamy skutečně provedených změn.

> ⚠️ **Pro AI agenty:** Tento adresář je **cold storage**. Nečtěte ho proaktivně. Čtěte jen když:
> - Uživatel explicitně zmíní konkrétní task (klíč/název)
> - Pracujete na aktivním tasku (a čtěte jen ten jeden adresář)
> - Uživatel požádá o rešerši historického rozhodování

## Struktura

```
tasks/
├── README.md                               # tento soubor
├── template/                               # šablony (nezapočítává se do tasků)
│   ├── epic/
│   │   ├── README.md
│   │   └── spec/
│   │       └── overview.md
│   └── task/
│       ├── assignment.md
│       ├── plan.md
│       └── changelog.md
└── <EPIC-KEY>/
    ├── README.md                           # scope epiku
    ├── spec/                               # TO BE specifikace epiku
    └── <TASK-KEY>/
        ├── assignment.md                   # co a proč
        ├── plan.md                         # jak
        └── changelog.md                    # co se skutečně udělalo
```

## Naming convention

Klíče odpovídají **{{TICKET_SYSTEM}}**.

<!--
Příklady (nahraď podle reálného systému):
- Jira: CF-100-EPIC, CF-142
- Linear: LIN-100-EPIC, LIN-142
- GitHub Issues: ISSUE-42-EPIC, ISSUE-45
- Vlastní: 2026-Q1-billing-refactor/migrate-to-v2
-->

**Pravidlo:** klíč tasku musí **přesně odpovídat** klíči v ticketovacím systému. Traceability ticket ↔ changeset je důvod existence této struktury.

**Branch naming:** `feature/<TASK-KEY>-<slug>`, `fix/<TASK-KEY>-<slug>`, `refactor/<TASK-KEY>-<slug>`.

## Životní cyklus

### 1. Založení epiku

```bash
mkdir -p tasks/<EPIC-KEY>/spec
cp tasks/template/epic/README.md tasks/<EPIC-KEY>/README.md
# vyplň
```

Epik obsahuje:
- `README.md` — scope epiku, business cíle, odkazy na ticket
- `spec/` — TO BE specifikace (overview, requirements, acceptance criteria)

### 2. Založení tasku

```bash
mkdir -p tasks/<EPIC-KEY>/<TASK-KEY>
cp tasks/template/task/*.md tasks/<EPIC-KEY>/<TASK-KEY>/
# vyplň assignment.md
```

Task obsahuje tři soubory, vznikají v tomto pořadí:

1. **`assignment.md`** — vyplní analytik / PM před předáním vývojáři (nebo agentovi)
2. **`plan.md`** — vyplní agent na začátku implementace, review vývojář
3. **`changelog.md`** — průběžně během implementace

### 3. Práce na tasku

Agent:
- Čte `assignment.md` jako zadání
- Napíše / aktualizuje `plan.md`
- Průběžně doplňuje `changelog.md` o skutečně provedené změny

### 4. Merge

Při mergi do main / master:
- `changelog.md` uzavři (`status: done`, `finished: <DATE>`)
- AS IS změny v `docs/` jsou součástí stejného commitu (spusť `/doc-update` na dotčené cesty)
- Task adresář **zůstává** (historie rozhodování)

### 5. Archivace

Staré epiky (ročník N-1 a starší) můžeš přesunout do `tasks/archive/<ROK>/` pro přehlednost. Git historie se zachovává.

## Frontmatter příklady

### `tasks/<EPIC>/README.md`

```yaml
---
type: epic-readme
epic: CF-100-EPIC
status: in-progress
started: 2026-01-10
finished: null
ticket_url: https://...
---
```

### `tasks/<EPIC>/<TASK>/assignment.md`

```yaml
---
type: task-assignment
epic: CF-100-EPIC
task: CF-142
status: in-progress
ticket_url: https://...
branch: feature/CF-142-idempotent-invoices
assignee: ondra
---
```

### `tasks/<EPIC>/<TASK>/plan.md`

```yaml
---
type: task-plan
epic: CF-100-EPIC
task: CF-142
status: in-progress
author: claude-code
reviewed_by: ondra
---
```

### `tasks/<EPIC>/<TASK>/changelog.md`

```yaml
---
type: task-changelog
epic: CF-100-EPIC
task: CF-142
status: in-progress
---
```

## Co se committuje a co ne

**Committovat:**
- Celý `tasks/` adresář včetně všech epiků a tasků
- Reasoning, plány, changelogy — mají žít v repu

**Necommittovat** (v `.gitignore`):
- `tasks/*/*/scratch/` — per-task working files agenta
- `tasks/*/*/.working/` — dočasné poznámky

## Pravidla

1. **Klíče tasků = klíče v ticketovacím systému.** Bez výjimky.
2. **Neupravuj `assignment.md` zpětně** — je to historický snapshot zadání.
3. **`changelog.md` popisuje skutečné změny**, ne původní plán. Pokud jsi během implementace zjistil, že plán nesedí, aktualizuj `plan.md` (a poznamenej důvod) a v `changelog.md` popiš reálný postup.
4. **Merge = AS IS aktualizace.** Po dokončení tasku promítni relevantní změny do `../docs/`. Task tím neztrácí hodnotu — zůstává jako historie.
