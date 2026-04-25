# Portabilita: Codex, Cursor a další agenti

`docs-plugin` plugin je primárně navržen pro Claude Code, ale konvence, které zavádí, fungují napříč nástroji. Jde o to, že substrate je **repo-level konvence** — jakmile je v repu vytvořená (přes `/docs-init`), funguje s jakýmkoliv AI kódovacím agentem, který čte strukturu repa.

## Claude Code

**Plný plugin.** Skill se loaduje automaticky, commandy fungují, subagent `docs-updater` je dostupný.

Instalace:
```bash
claude plugin install https://github.com/softmedia/docs-plugin
# nebo lokálně
claude plugin install /path/to/docs-plugin
```

V repu pak stačí pustit:
```
/docs-init
```

## OpenAI Codex CLI

Codex čte `AGENTS.md` místo `CLAUDE.md`. `/docs-init` proto generuje **oba** soubory se stejným obsahem.

**Co funguje:**
- AGENTS.md s pravidly docs-plugin (AS IS vs TO BE, antichangelog, tasks/ je cold storage)
- Struktura `docs/`, `tasks/`, `DESCRIPTION.md` — Codex je čte stejně jako CC
- Detekce struktury — Codex pozná substrate podle AGENTS.md

**Co nefunguje (rozdíly oproti CC):**
- Slash commandy (`/doc-update`, `/doc-revise`) — Codex je nemá jako prvotřídní koncept
  - **Workaround:** šablony v `~/.codex/prompts/doc-update.md` s promptem ekvivalentním CC commandu
  - Pak v Codexu: `codex "$(cat ~/.codex/prompts/doc-update.md) src/Billing"`
- Subagent `docs-updater` — Codex v době psaní nemá isolated subagents
  - **Workaround:** AGENTS.md má sekci „Při aktualizaci docs postupuj takto..." s pravidly z subagenta

**Souborová struktura pro Codex-first repo:**
```
<repo>/
├── AGENTS.md              # hlavní (primární čtený Codexem)
├── CLAUDE.md              # symlink na AGENTS.md, nebo kopie (pro CC kompatibilitu)
├── docs/
├── tasks/
└── .codex/
    └── prompts/
        ├── doc-update.md
        ├── doc-revise.md
        └── docs-init.md
```

`/docs-init` v CC tohle nastaví, aby bylo funkční i pro Codex.

## Cursor

Cursor používá `.cursor/rules/*.mdc` pro projekt-level pravidla.

**Co funguje:**
- `.cursor/rules/docs-plugin.mdc` s pravidly (generuje `/docs-init`)
- Struktura `docs/`, `tasks/`, `DESCRIPTION.md` — Cursor je čte přes Composer
- Rule může mít `globs:` filter, takže se aktivuje jen když uživatel pracuje v relevantních adresářích

**Co nefunguje:**
- Slash commandy — Cursor má vlastní composer workflow
  - **Workaround:** `.cursor/rules/docs-plugin.mdc` s instrukcemi pro typické operace (update docs, založit task)

**Ukázka `.cursor/rules/docs-plugin.mdc`:**
```markdown
---
description: docs-plugin — strukturovaná dokumentace AS IS / TO BE
globs: ["docs/**", "tasks/**", "src/**/DESCRIPTION.md", "**/MODULES.md"]
alwaysApply: false
---

# docs-plugin

Tento repozitář používá docs-plugin. Tvrdé rules:

1. NIKDY nepiš changelog v docs/
2. docs/ = AS IS (aktuální stav)
3. tasks/<EPIC>/<TASK>/ = TO BE (plánované změny, cold storage)
4. DESCRIPTION.md v každé složce se zdrojáky
5. Rekurzivní struktura docs/modules/<X>/modules/<Y>/

Detaily: viz README.md v rootu repa, sekce "Dokumentační konvence".
```

## Gemini CLI

Gemini CLI zatím nemá plugin systém srovnatelný s CC. Funguje podobně jako Codex: čte konvence ze souborů v repu.

**Doporučený setup:**
- `GEMINI.md` (nebo `AGENTS.md`, pokud Gemini CLI detekuje oba) — stejný obsah jako AGENTS.md
- Custom aliasy v shellu pro ekvivalent `/doc-update`:
  ```bash
  alias doc-update='gemini "Aktualizuj dokumentaci podle docs-plugin konvencí v adresáři: $1"'
  ```

## Aider

Aider čte `CONVENTIONS.md` (nebo cokoliv přes `--read`).

**Setup:**
```bash
aider --read CLAUDE.md  # substrate rules
aider --read docs/modules/billing/README.md  # konkrétní kontext
```

V `CLAUDE.md` mějte sekci „Pro Aider: použij `--read CLAUDE.md` pro obecná pravidla, a `--read <specific>.md` pro konkrétní kontext tasku."

## Obecný princip portability

Substrate stojí na **filesystem-level konvencích**:

- **Jména a umístění souborů** (`docs/`, `tasks/`, `DESCRIPTION.md`, `MODULES.md`)
- **YAML frontmatter schémata** (čitelné strojově i lidsky)
- **Hard rules v textu** (AGENTS.md / CLAUDE.md / .cursor/rules)

Žádný z těchto elementů není závislý na konkrétním agentu. Claude Code jen dodává komfort (skill, commandy, subagent) — bez něj to funguje taky, jen manuálněji.

## Matice podpory

| Feature | Claude Code | Codex | Cursor | Gemini CLI | Aider |
|---|---|---|---|---|---|
| Skill triggering | ✅ plugin | ⚠️ AGENTS.md | ⚠️ .cursor/rules | ⚠️ GEMINI.md | ⚠️ --read |
| `/docs-init` | ✅ slash cmd | ⚠️ prompt | ⚠️ composer | ⚠️ alias | ⚠️ manuál |
| `/doc-update` | ✅ slash cmd | ⚠️ prompt | ⚠️ composer | ⚠️ alias | ⚠️ manuál |
| `/doc-revise` | ✅ slash cmd | ⚠️ prompt | ⚠️ composer | ⚠️ alias | ⚠️ manuál |
| docs-updater subagent | ✅ isolated | ❌ inline | ❌ inline | ❌ inline | ❌ inline |
| ReadTheDocs MCP | ✅ (až bude) | ✅ (MCP) | ⚠️ limited | ❌ | ❌ |
| Filesystem konvence | ✅ | ✅ | ✅ | ✅ | ✅ |

Legenda: ✅ nativně, ⚠️ s workaroundem, ❌ nedostupné.

## Doporučení pro multi-agent týmy

Pokud tým používá víc než jeden agent (někdo CC, někdo Codex, CI používá Gemini):

1. **Primární `CLAUDE.md`** v rootu repa (nejběžnější)
2. **Symlink `AGENTS.md → CLAUDE.md`** (pro Codex/Gemini)
3. **`.cursor/rules/docs-plugin.mdc`** (pro Cursor users)
4. **`CONVENTIONS.md → CLAUDE.md`** symlink (pro Aider users)

Takhle máš jeden zdroj pravdy (CLAUDE.md) a všichni agenti čtou totéž.

`/docs-init` tyhle symlinky umí vytvořit automaticky.
