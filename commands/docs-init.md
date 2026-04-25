---
description: Nastaví docs-plugin strukturu v repozitáři (docs/, tasks/, CLAUDE.md, AGENTS.md, .cursor/rules). Default zero-question setup s autodetekcí.
argument-hint: "[--force] [--ticket-system=jira|linear|github|none] [--platforms=cc,codex,cursor,gemini] [--lang=cs|en] [--no-detect]"
---

# /docs-init

Inicializuj docs-plugin v aktuálním repozitáři. **Defaultní chování:** autodetekce stacku, ticket systému, jazyka a cílových platforem. Otázky se ptáš jen pokud detekce selže nebo je ambiguous; jinak proceed s tím, co jsi našel, a v summary řekni, co jsi vybral a čím to lze přepsat.

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

## 3. Autodetekce konfigurace

Tohle je hlavní rozdíl proti naivnímu setup. **Neptáš se, dokud detekce neselže.** Ke každému poli existuje signál; pokud signál chybí nebo je ambiguous, padáš na default nebo se zeptáš.

Pokud uživatel passnul flag (`--ticket-system`, `--platforms`, `--lang`), ten flag **vždy přebije autodetekci** pro to pole. Pokud user passnul `--no-detect`, použij defaulty (`ticket-system=none`, `platforms=cc`, `lang=en`) a přeskoč detekci.

### 3.1 Tech stack (`{{TECH_STACK}}`, `{{CODE_STYLE}}`, `{{TESTING}}`)

Mechanická detekce přes existenci souborů v rootu repa:

| Soubor / pattern | Stack |
|---|---|
| `package.json` | Node.js — přečti `dependencies` a `devDependencies` |
| `tsconfig.json` | + TypeScript |
| `vite.config.{ts,js}` | + Vite |
| `next.config.{ts,js,mjs}` | + Next.js |
| `package.json` s `"type": "module"` | ESM |
| `pyproject.toml` / `requirements.txt` / `setup.py` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `*.csproj` / `*.sln` | .NET (přečti `<TargetFramework>`) |
| `Gemfile` | Ruby |
| `pubspec.yaml` | Dart/Flutter |
| `composer.json` | PHP |

**Code style detection:**

- `.eslintrc*` / `eslint.config.*` → ESLint
- `.prettierrc*` / `prettier.config.*` → Prettier
- `pyproject.toml` s `[tool.black]` / `[tool.ruff]` → Black/Ruff
- `.editorconfig` → respektuj jeho settings v promptu

**Testing detection:**

- `jest.config.*` / `vitest.config.*` / `playwright.config.*` → odpovídající framework
- `pytest.ini` / `pyproject.toml` s `[tool.pytest.ini_options]` → pytest
- `*.test.ts` / `*_test.go` / `*Test.cs` → ber jako fallback signal

**Multiple lockfiles** (např. `package.json` + `requirements.txt` v polyglot repu): zaznamenej oba, primární vyber podle počtu zdrojových souborů (níže v *3.5 Source roots*). Pokud roughly stejně velké, **zeptej se** ("V tomto repu vidím TypeScript i Python — který je primární?").

### 3.2 Ticket system

Priority chain — první hit vyhrává:

1. **Git remote URL** (`git config --get remote.origin.url`):
   - `github.com` → `github`
   - `gitlab.*` → `github` (nebo `gitlab` pokud podporuješ; default na `github` style — `#NNN` reference)
   - `bitbucket.org` → `github` (issues na BB jsou podobné)
   - `*.atlassian.net` / `jira.*` → `jira`

2. **Branch naming + commit messages** (`git branch -a` + `git log --oneline -50`):
   - Match `^[A-Z]{2,5}-\d+` v branch names → tickets pattern present
     - `CF-`, `OPS-` (krátké, často internal) → `jira`
     - `LIN-`, `ENG-` → `linear` (Linear default je 3-letter org code)
   - Match `^#\d+` na začátku commit message → `github`
   - Match `^Fixes #\d+` / `Closes #\d+` v body → `github`

3. **Default:** pokud nic z výše uvedeného → `none` (free-form klíče v `tasks/`).

V summary uveď, co tě k volbě vedlo: *"Detekovaný ticket system: jira (z git remote: company.atlassian.net)"* nebo *"none (žádný git remote, žádné ticket pattern v branches)"*.

### 3.3 Jazyk dokumentace (`{{LANG}}`)

Heuristika přes vzorek 10 zdrojových souborů + git history:

1. **Komentáře v kódu**: `grep -rE '^\s*(//|#|/\*|\*\s)' src/ | head -100` (nebo ekvivalent root). Spočítej výskyty:
   - České znaky: `ěščřžýáíéůúďťň` → `cs`
   - Anglická high-frequency words bez českých znaků: `the`, `this`, `for`, `returns`, `param` → `en`
   - 80%+ jednoho jazyka → použij ho. Mix → fallback na další signál.

2. **Branch names + commit messages**: posledních 50 commitů. České diakritiky → `cs`.

3. **Default**: `en`.

Pokud signál ambiguous (méně než 5 souborů s komentáři, žádný git history), **zeptej se**: *"V repu nejsou jasné jazykové signály. CZ nebo EN dokumentace?"*

### 3.4 Cílové platformy (`{{PLATFORMS}}`)

Detekce existencí souborů — additive (může být víc):

| Existuje | Platforma |
|---|---|
| (vždy) | `cc` (Claude Code) — primární |
| `.cursor/` | `cursor` |
| `.codex/` nebo `AGENTS.md` (bez `docs-plugin` markeru) | `codex` |
| `GEMINI.md` | `gemini` |

**Default při čistém repu:** jen `cc`. Pokud uživatel řekl explicitně `--platforms=cc,cursor`, generuj jen ty dvě bez ohledu na detekci.

### 3.5 Source roots

Pro pozdější `/doc-update` budeš potřebovat vědět, kde žijí zdrojáky. Detekce:

```bash
for dir in src app lib packages crates internal cmd pkg; do
  [ -d "$dir" ] && echo "$dir"
done
```

Pokud je víc kandidátů, vyber největší (`find $dir -type f -name '*.{detected_extension}' | wc -l`). Ulož do CLAUDE.md jako "Source roots".

Pokud žádný **a** v rootu repa jsou zdrojáky (heuristika: `ls *.{ts,py,go,rs,cs}` nenulový), použij `.` (root).

### 3.6 Typ projektu

Skript / aplikace / multi-module — odhadni z počtu modulů:

```bash
count_modules=$(find <source-root> -mindepth 1 -maxdepth 3 -type d ! -path '*/node_modules/*' ! -path '*/.*' | wc -l)
```

- `< 3` → skript (`docs/modules/` nepřidávat hned, jen kořen)
- `3-15` → standardní aplikace
- `> 15` → multi-module systém

Tento údaj jen ovlivní, jestli `docs/modules/` zakládat hned nebo až s prvním modulem.

## 4. Vytvoř strukturu

Podle detekované (nebo dotázané) konfigurace vygeneruj:

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

Multi-module projekt navíc dostane prázdný `docs/modules/` (s `.gitkeep`).

### Podmíněné soubory

- **Codex target:** `AGENTS.md` (symlink na `CLAUDE.md`, pokud FS umožňuje; jinak kopie)
- **Cursor target:** `.cursor/rules/docs-plugin.mdc`
- **Gemini target:** `GEMINI.md` (symlink nebo kopie CLAUDE.md)
- **Git repo:** `.gitignore` doplněk (viz *5. Aktualizuj `.gitignore`*)

### Šablony

Šablony k rozkopírování jsou v pluginu pod `templates/tree/` a `templates/`:

- `templates/CLAUDE.md` → `<repo>/CLAUDE.md`
- `templates/AGENTS.md` → `<repo>/AGENTS.md`
- `templates/cursor-rule/docs-plugin.mdc` → `<repo>/.cursor/rules/docs-plugin.mdc`
- `templates/.codex/prompts/*.md` → `<repo>/.codex/prompts/*.md` (pokud Codex target)
- `templates/tree/docs/...` → `<repo>/docs/...`
- `templates/tree/tasks/...` → `<repo>/tasks/...`
- `templates/tree/src/DESCRIPTION.md` → ukázkový příklad do **jednoho** existujícího source rootu (jen jako reference, smazat až má vývojář první reálný `DESCRIPTION.md`)

Při kopírování:

- Nahraď placeholdery (z autodetekce nebo flagů):
  - `{{PROJECT_NAME}}` — název root adresáře nebo `name` z `package.json` / `pyproject.toml`
  - `{{TICKET_SYSTEM}}` — z 3.2
  - `{{DATE}}` — dnešní datum (YYYY-MM-DD)
  - `{{LANG}}` — z 3.3
  - `{{TECH_STACK}}` — z 3.1 (krátká věta, např. *"TypeScript + Vite + Vitest"*)
  - `{{CODE_STYLE}}` — z 3.1 (např. *"ESLint + Prettier"*)
  - `{{TESTING}}` — z 3.1 (např. *"Vitest"*)
- Ponech YAML frontmatter beze změny (klíče jsou anglicky)
- Přelož obsah šablon do zvoleného jazyka (cs/en)

## 5. Aktualizuj `.gitignore`

Pokud `.gitignore` existuje, připoj:

```gitignore

# docs-plugin
tasks/*/*/scratch/
tasks/*/*/.working/
.doc-update-cache/
.doc-revise-backup/
```

Pokud neexistuje, vytvoř ho s touto hlavičkou.

## 6. Summary

Vypiš jednou stručný blok, který říká uživateli, **co jsi detekoval** a **jak to může přepsat**:

```
✓ docs-plugin inicializován.

Autodetekce:
  • Tech stack:     TypeScript + Vite + Vitest        (--lang neoverride)
  • Ticket system:  github                            (z git remote: github.com/...)
  • Jazyk:          en                                (8/10 souborů, 47 commitů en)
  • Platformy:      cc, cursor                        (našel .cursor/)
  • Source root:    src/ (12 modulů — multi-module)

Vytvořeno:
  docs/, tasks/, CLAUDE.md, AGENTS.md (-> CLAUDE.md), .cursor/rules/docs-plugin.mdc
  Aktualizován .gitignore.

Přepsání:
  /docs-init --force --ticket-system=jira --lang=cs --platforms=cc,codex

Další kroky:
  /doc-update <první-modul>      # vygeneruj DESCRIPTION.md pro modul
  nebo:
  /doc-update --all              # bulk discovery + generování (viz PR 2/3)
```

## 7. Edge cases

### Repo už má docs-plugin

Detekuj podle existence `docs/modules/` nebo `tasks/` s epic strukturou, nebo podle hlavičky v `CLAUDE.md` ("This repository uses docs-plugin"). Pokud substrate už je:

- Neprováděj init
- Nabídni `/doc-update --all` (bulk drift fix), nebo přidání nové platformy do existujícího CC repa

### Repo má custom `docs/` strukturu

Detekuj flat `docs/` (hodně souborů na jedné úrovni) nebo jiný pattern:

- **Neber si to silou.** Nabídni vizualizaci rozdílu (stávající struktura vs docs-plugin)
- Nabídni **dry-run migraci**: vytvořit novou strukturu vedle existující (`docs.new/`), uživatel pak manuálně přesune
- Nebo nabídni **non-destructive coexistence**: přidat `docs/modules/` pro nové moduly, staré soubory nechat (a postupně migrovat)

### Multiple lockfiles

Polyglot repo (např. `package.json` + `pyproject.toml`): primární stack vyber podle počtu zdrojových souborů. Pokud rozdíl < 20 %, **zeptej se** uživatele, který je primární. Druhý zaznamenej v CLAUDE.md jako secondary.

### `src/` neexistuje a v rootu nejsou zdrojáky

Zeptej se, kde mají žít `DESCRIPTION.md` soubory. Validní odpovědi: cesta k existujícímu adresáři nebo `<vytvořit>` (vytvoř `src/`).

### Autodetekce není 100% jistá

Pokud nejsi jistý (typicky: ambiguous tech stack, žádný git history), **zobraz, co jsi našel, a zeptej se na potvrzení**. Lepší jedna otázka než špatná konfigurace.

## 8. Argumenty (override)

- `--force` — přepíš existující substrate soubory (používej opatrně)
- `--ticket-system=jira|linear|github|none` — override autodetekce
- `--platforms=cc,codex,cursor,gemini` — čárkou oddělený seznam (override)
- `--lang=cs|en` — override
- `--no-detect` — vypni autodetekci, použij čistě defaulty (`cc`, `none`, `en`)

Při kombinaci flagu + autodetekce: flag vyhrává pro své pole, ostatní pole se detekují normálně.

## 9. Backwards compatibility

Stejné argumenty jako ve verzi před autodetekcí (`--force`, `--ticket-system`, `--platforms`, `--lang`) **se chovají stejně**. Když uživatel passne všechny tyhle flagy, autodetekce se prakticky neuplatní — chová se jako stará verze.
