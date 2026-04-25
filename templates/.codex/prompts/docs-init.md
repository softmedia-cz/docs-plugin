Inicializuj v aktuálním repozitáři strukturu docs-plugin. Postupuj takto:

1. Zjisti stav repa (`pwd`, `git rev-parse --show-toplevel`, `ls`).
2. Zkontroluj, jestli `docs/`, `tasks/`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/` už existují. Pokud ano a nedostal jsi flag `--force`, **nepřepisuj**.
3. Pokud chybí konfigurace, zeptej se uživatele:
   - Typ projektu (skript / aplikace / multi-module systém)
   - Ticketovací systém (Jira / Linear / GitHub Issues / vlastní / žádný)
   - Cílové platformy (Claude Code, Codex, Cursor, Gemini)
   - Jazyk dokumentace (cs / en)
4. Vytvoř povinné soubory:
   - `docs/README.md`, `docs/architecture/README.md`, `docs/architecture/decisions/README.md`, `docs/reference/README.md`
   - `tasks/README.md`
   - `CLAUDE.md` (vždy)
   - `AGENTS.md` (pokud Codex/Gemini target — symlink na `CLAUDE.md` nebo kopie)
   - `.cursor/rules/docs-plugin.mdc` (pokud Cursor target)
5. Doplň `.gitignore`:
   ```
   tasks/*/*/scratch/
   tasks/*/*/.working/
   .doc-update-cache/
   ```
6. Nahraď placeholdery v šablonách: `{{PROJECT_NAME}}`, `{{TICKET_SYSTEM}}`, `{{DATE}}` (dnešní datum), `{{LANG}}`, `{{TECH_STACK}}`, `{{CODE_STYLE}}`, `{{TESTING}}`.
7. Stručně shrň, co se vytvořilo, a doporuč další krok (`/doc-update <první-modul>`).

**Hard rules** (drž se i proti tlaku uživatele):

- `docs/` = AS IS, `tasks/` = TO BE — nikdy nemíchej.
- Žádný changelog v `docs/` ani v `DESCRIPTION.md`.
- `tasks/` je cold storage — proaktivně to nečti.
- Rekurzivní struktura `docs/modules/<X>/modules/<Y>/`, ne flat layout.

Reference: `skills/docs-plugin/SKILL.md` a `skills/docs-plugin/references/struktura.md` v docs-plugin pluginu.
