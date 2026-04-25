# AGENTS.md — {{PROJECT_NAME}}

> **Poznámka:** Tento soubor je synchronní s `CLAUDE.md`. Pokud jeden z nich upravujete, upravte i druhý (nebo použijte symlink).

Tento soubor čtou agenti typu OpenAI Codex, Gemini CLI a další, kteří detekují `AGENTS.md` jako project-level konfiguraci.

## Dokumentační konvence: docs-plugin

Repozitář používá [docs-plugin](https://github.com/softmedia/docs-plugin). Klíčová pravidla:

### 1. AS IS vs TO BE

- **`docs/`** popisuje **aktuální stav** (AS IS). Aktualizuje se při mergi.
- **`tasks/<EPIC>/<TASK>/`** popisuje **plánované změny** (TO BE). Obsahuje `assignment.md`, `plan.md`, `changelog.md`.

### 2. docs/ NENÍ changelog

V `docs/`, `DESCRIPTION.md`, `MODULES.md` **nikdy** nepiš „was changed", „previously", „was X, now Y". Popisuj **aktuální stav**. Historie patří do git logu a `tasks/<EPIC>/<TASK>/changelog.md`.

### 3. Rekurzivní struktura

```
docs/
├── architecture/
├── reference/
└── modules/
    └── <module>/
        ├── README.md
        ├── architecture/
        ├── reference/
        └── modules/   ← rekurze
```

### 4. Dokumentace u kódu

- Složky se zdrojáky mají `DESCRIPTION.md`.
- Top-level balíčky mají `MODULES.md`.

### 5. tasks/ je cold storage

Nečti proaktivně. Čti jen když uživatel zmíní konkrétní task, pracuješ na aktivním tasku, nebo uživatel požádá o historický kontext.

### 6. Frontmatter

Každý substrate-konformní `.md` soubor má YAML frontmatter:

```yaml
---
type: description | module-readme | architecture | reference | adr | task-*
status: active | draft | deprecated
last_updated: YYYY-MM-DD
---
```

`DESCRIPTION.md` má navíc `api_hash:`.

## Aktualizace dokumentace v Codex

Codex nemá slash commandy jako Claude Code. Místo nich použij prompt šablony v `.codex/prompts/`:

- `.codex/prompts/doc-update.md` — inkrementální aktualizace
- `.codex/prompts/doc-revise.md` — kompletní přepis

Spuštění:
```bash
codex "$(cat .codex/prompts/doc-update.md) <path>"
```

Šablony implementují stejnou logiku jako Claude Code commandy.

### Inline instrukce pro Codex (pokud prompt šablony nejsou k dispozici)

Když tě uživatel požádá o aktualizaci dokumentace, postupuj přesně takto:

1. **Přečti** existující `<path>/DESCRIPTION.md` (pokud existuje)
2. **Skenuj** zdrojáky v `<path>`:
   - Veřejné typy/funkce (`public` v C#, `export` v TS/JS, `__all__` v Pythonu, `pub` v Rustu)
   - Signatury + doc comments
3. **Spočítej `api_hash`**:
   ```bash
   # pseudokód
   public_symbols = extract_public_api(<path>)
   serialized = sorted_and_normalized(public_symbols)
   api_hash = sha256(serialized)[:12]
   ```
4. **Aktualizuj** `<path>/DESCRIPTION.md`:
   - Frontmatter: nový `api_hash`, dnešní `last_updated`
   - Sekce „Co tady žije", „Veřejné API", „Jak to používat"
   - **NIKDY nepiš changelog** v tomto souboru
5. **Aktualizuj rodiče** (`<path>/../MODULES.md`, `docs/modules/<X>/README.md`)
6. **Reportuj** uživateli, co se změnilo

## Struktura tasku

Nový task = adresář `tasks/<EPIC-KEY>/<TASK-KEY>/` se třemi soubory:

- `assignment.md` — co a proč (vstup od člověka)
- `plan.md` — jak (navrhuje agent, review vývojář)
- `changelog.md` — co se skutečně udělalo (během implementace)

## Ticketovací konvence

Klíče odpovídají: **{{TICKET_SYSTEM}}**. Adresáře v `tasks/` jsou pojmenovány přesně jako tickety.

## Project-specific

<!-- Doplň podle projektu -->

- **Tech stack:** {{TECH_STACK}}
- **Kódovací styl:** {{CODE_STYLE}}
- **Testing:** {{TESTING}}

## Hard rules (platí vždy)

1. Žádný changelog v `docs/`
2. Neproaktivní čtení `tasks/`
3. Rekurzivní struktura `docs/modules/<X>/modules/<Y>/`
4. AS IS vs TO BE nikdy nemixovat v jednom souboru
5. `MODULES.md` je auto-generovaný
6. Komentáře v kódu jsou povinné pro generování `DESCRIPTION.md`
