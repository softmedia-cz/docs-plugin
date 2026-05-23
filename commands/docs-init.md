---
description: Nastaví docs-plugin strukturu v repozitáři + autodetekce + bulk generování DESCRIPTION.md napříč moduly.
argument-hint: "[--force] [--ticket-system=jira|linear|github|none] [--platforms=cc,codex,cursor,gemini] [--lang=cs|en] [--no-detect] [--no-bulk] [--bulk] [--max-modules=N] [--concurrency=N] [--dry-run] [--install-hooks] [--no-hooks]"
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

## 6. Bulk discovery + generování DESCRIPTION.md

**Cíl:** po vytvoření kostry rovnou vygeneruj `DESCRIPTION.md` pro všechny smysluplné moduly v repu, aby uživatel po skončení `/docs-init` měl něco, co Claude Code může reálně číst — ne prázdné šablony.

Tento krok běží **defaultně** (pokud user nepassnul `--no-bulk`). Pokud user passne `--no-bulk`, přeskoč na sekci 7. Pokud user passne `--dry-run`, vypiš plán bez zápisu.

### 6.1 Discovery — najdi kandidáty na moduly

Heuristika je **mechanická a deterministická** — žádné LLM rozhodování o tom, co je modul. Použij filesystem:

```bash
# Pseudokód — implementuj přes Glob / Bash
extensions = vyber_přípony_podle_detekovaného_stacku()
# např. TypeScript: ts,tsx; Python: py; Rust: rs; Go: go; .NET: cs

candidates = []
for dir in walk(<source_root>, max_depth=6):
    if dir matches blacklist: continue
    files = list_files(dir, extensions, non_recursive=True)
    if len(files) >= 3:
        candidates.append(dir)
```

**Blacklist** (vždy vynech):

```
node_modules, dist, build, out, target, .next, .nuxt, .svelte-kit,
__pycache__, .pytest_cache, .mypy_cache, .ruff_cache,
vendor, .venv, venv, env, .env,
bin, obj, .git, .vs, .idea, .vscode,
coverage, .coverage, .nyc_output,
.docs-revise-backup, .doc-update-cache,
docs, tasks  # docs-plugin's own structure
```

**Extension mapping** podle detekovaného stacku:

| Stack | Extensions |
|---|---|
| TypeScript | `.ts`, `.tsx`, `.mts`, `.cts` (NE `.d.ts`) |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` |
| Python | `.py` (NE `__init__.py` jako jediný soubor) |
| Rust | `.rs` |
| Go | `.go` (NE `*_test.go` jako primární) |
| .NET | `.cs` |
| Ruby | `.rb` |
| PHP | `.php` |

**Test složky** (`__tests__/`, `*.test.*`, `tests/`, `*Tests/`) jsou samostatný kandidát **jen pokud** mají >10 souborů. Jinak skip — testy popisuje DESCRIPTION.md v parent modulu zmínkou *"Tests in __tests__/"*.

### 6.2 Triage — priority score

Každý kandidát dostane skóre. Vyšší skóre = vyšší priorita.

```
priority_score(dir) =
    + 100 × (1 if is_top_level_package else 0)         # src/Billing/ vs src/Billing/Sub/
    + 10 × public_exports_count                         # rough scan: `export`, `pub`, `public`
    + 5 × (10 - depth_from_source_root)                 # bližší root = vyšší
    + 1 × source_files_count                            # větší modul = větší score
```

Top-level package = první úroveň pod `<source_root>`. Public exports count = rough grep:

- TS/JS: `^export\b` (bez `export *`, bez `export type` jen jako augment)
- Python: top-level `def `, `class ` (bez podtržítka), `__all__` entries
- Rust: `^pub `
- Go: capitalized func/type/var na top-level
- C#: `^\s*public\s+(class|interface|record|enum|struct)`

Nemusí to být přesné — je to **jen pro triage**. Subagent později spočítá přesný `api_hash`.

### 6.3 Token budget + confirmation

Před spuštěním subagentů odhadni cost:

```
modules = top_N_candidates_by_priority(default N=20)
estimated_input_tokens  = len(modules) × 5_000   # přečtení zdrojáků modulu
estimated_output_tokens = len(modules) × 2_000   # DESCRIPTION.md content
```

**Pravidlo na zeptání:**

| Počet modulů | Co dělat |
|---|---|
| ≤ 30 | proceed bez ptaní |
| 31–100 | zeptej se JEDNOU: *"Najdeno 47 modulů, odhad ~330k input tokenů. Generovat všechny? [Y/n] / Limit počet (--max-modules=N)"* |
| > 100 | zeptej se JEDNOU + doporuč `--max-modules=20` jako default |

Při `--dry-run`: vypiš seznam (cesta + score + odhad tokenů per modul) a skonči.

Při `--max-modules=N`: ber jen prvních N podle priority. Zbytek vypiš se zprávou:

```
Wygenerováno 20 z 47 modulů. Zbývá 27 — pro ně spusť:
  /doc-update --all
nebo cíleně: /doc-update <path>
```

### 6.4 Generate — paralelní subagent batch

Spusť `docs-updater` subagent **paralelně v batchích** podle `--concurrency=N` (default `5`).

**Implementace v Claude Code:** v jedné assistant zprávě udělej `--concurrency` Agent tool calls naráz (parallel tool execution). Po jejich dokončení batch další. Tj. `concurrency=5` znamená: 5 subagentů současně, čekat na všechny, další batch.

Každý subagent dostává prompt:

```
Aktualizuj dokumentaci pro adresář: <path>
Mode: revize (modul ještě nemá DESCRIPTION.md → kompletní generace)
Tech stack: <z autodetekce 3.1>
Jazyk dokumentace: <z autodetekce 3.3>
Include docs/modules/: ne (řeší orchestrátor v 6.5)
Include api_hash: ano

Hard rules:
- Žádný changelog (viz skill rules)
- Drž frontmatter schema (type: description, module, status, api_hash, last_updated)
- Pokud kód nemá doc komentáře, vrať to v summary, NIKDY nehalucinuj chování
```

Subagent vrátí summary; orchestrátor nad ním nedělá další volání modelu — jen agreguje texty pro finální report.

**Failed module** (subagent vrátí chybu, time-out, prázdný DESCRIPTION.md): zaznamenej do "skipped" listu, pokračuj dál. Po doběhnutí všech batches vypiš:

```
✗ Selhalo: 2/20 modulů
  - src/Legacy/Foo (subagent timeout)
  - src/Internal/Bar (žádné public symboly — přeskočeno)
```

### 6.5 Aggregate — MODULES.md a docs/modules/<X>/README.md

Po dokončení všech subagentů (úspěšných i selhalých) vygeneruj agregáty **bez dalších subagent volání** — orchestrátor sám čte vygenerované DESCRIPTION.md a sklíží je.

#### MODULES.md per top-level package

Pro každý top-level package (= každá první-úrovňová složka pod `<source_root>`) vytvoř `<package>/MODULES.md`:

```markdown
---
type: modules-overview
module: <path>
status: active
last_updated: <YYYY-MM-DD>
---

# <PackageName> Modules

| Namespace | Popis |
|---|---|
| `<sub1>` | <první věta z DESCRIPTION.md sub1> |
| `<sub2>` | <první věta z DESCRIPTION.md sub2> |

Viz `DESCRIPTION.md` v každé podsložce pro detaily.
```

První věta z DESCRIPTION.md = úvodní odstavec po nadpise modulu (ten, co píše subagent jako jednovětný popis modulu).

#### docs/modules/<X>/README.md

Pro **každý top-level package**, který má >2 sub-moduly, vytvoř `docs/modules/<X>/README.md` jako konceptuální popis:

- Path mapping: `src/Billing/` → `docs/modules/billing/` (lowercase, `/` separator)
- Pro hluboké moduly: `src/Billing/Invoicing/` → `docs/modules/billing/modules/invoicing/`
- Obsah: vytáhni "Co tady žije" sekce z DESCRIPTION.md sub-modulů a sklíž do high-level popisu

Šablona:

```markdown
---
type: module-readme
module: <PackageName>
status: active
last_updated: <YYYY-MM-DD>
---

# <PackageName>

<Krátký popis — 1-2 odstavce. Sklížený z úvodních popisů DESCRIPTION.md submodulů.>

## Submoduly

- **<Sub1>** — <první věta z jejich DESCRIPTION.md>
- **<Sub2>** — ...

## Hlavní integrace

<Vytaž ze sekcí "Integrace" submodulů — co publikuje / konzumuje. Jen pokud aspoň 2 submoduly to mají.>

## Detaily

- Architektura: `architecture/` (vytvoř prázdnou kostru, pokud nemá)
- Reference: `reference/` (vytvoř prázdnou kostru, pokud nemá)
- API: `DESCRIPTION.md` v každé src/ složce
```

**NEVOLEJ subagent** pro tuhle agregaci. Orchestrátor (= ty, hlavní agent) má všechny DESCRIPTION.md v kontextu po batch run a může je zkompilovat.

### 6.7 Volitelné: install hooks

Pokud user passnul `--install-hooks` (nebo na interaktivní otázku odpověděl ano), nainstaluj hookovou sadu. Tři komponenty:

1. **Helper script** `templates/hooks/docs-plugin-check.sh` → `<repo>/.claude/hooks/docs-plugin-check.sh` (`chmod +x`). Čistě deterministická mtime heuristika — **žádné LLM volání, žádné tokeny**.
2. **`templates/settings.json`** → `<repo>/.claude/settings.json` (SessionStart + Stop hooky volající helper).
3. **`templates/hooks/post-merge-doc-refresh`** → `<repo>/.git/hooks/post-merge` (`chmod +x`). Po `git pull` levný drift check + nabídka.

Co hooky dělají:

- **SessionStart** — při startu session: pokud repo používá docs-plugin a je možný drift, připomene. Pokud repo docs-plugin **nepoužívá** ale má zdrojáky, **nabídne `/docs-init`** (tj. „first-message enable prompt"). Respektuje `.claude/.docs-plugin-declined`.
- **Stop** — po editech v `src/`/`app/`/`lib/`/`packages/` připomene možný drift.
- **post-merge** — po `git pull`/`merge` levný check + nabídka `/doc-update --all`. **Neregeneruje automaticky** (volba „levný check + nabídka").

**NEINSTALUJ hooky automaticky.** Default `/docs-init` je hooky **neinstalovat**, protože:

- Můžou rozbít CI / non-interaktivní běhy (`claude --print` apod.).
- Sdílený `.claude/settings.json` v repu ovlivní všechny členy týmu — to chce vědomé rozhodnutí.

Postup pro instalaci:

1. Zkopíruj `docs-plugin-check.sh` do `<repo>/.claude/hooks/` a nastav `chmod +x`.
2. Zkopíruj `post-merge-doc-refresh` do `<repo>/.git/hooks/post-merge` a nastav `chmod +x` (pozor: `.git/hooks/` se necommituje — je per-clone; zmiň uživateli, že po čerstvém clonu musí znovu).
3. **Pokud `<repo>/.claude/settings.json` neexistuje**: zkopíruj `templates/settings.json` (generic, žádné placeholdery).
4. **Pokud existuje**: **nemerguj automaticky**. Vypiš obsah šablony a poraď: *"Existující `.claude/settings.json` jsem nepřepsal. Doplň si `hooks.SessionStart` a `hooks.Stop` ručně."*

Pokud user passnul `--no-hooks`, **nezeptej se** ani interaktivně — respektuj explicitní volbu.

V interaktivním módu (žádný flag) **se zeptej** na konci `/docs-init`: *"Nainstalovat volitelné hooky (drift reminders na session start/stop + po git pull)? [y/N]"* — default `N`.

### 6.8 Epic vs. flat tasks/ — auto rozhodnutí

`tasks/` (TO BE strana — `assignment.md`, `plan.md`, `changelog.md` per task) je **defaultně zapnutá**. Strukturu plugin **rozhoduje sám, neptá se**:

- **Default: flat** `tasks/<TASK-KEY>/` — jednodušší, vhodné pro malé a střední projekty.
- **Epic seskupení** `tasks/<EPIC-KEY>/<TASK-KEY>/` — když je signál, že projekt jede po větších celcích.

Rozhodovací heuristika (mechanická):

1. **Na začátku (`/docs-init`)** — pokud projekt vypadá velký (multi-module systém z 3.6, **nebo** ticket systém s epic konvencí jako Jira, **nebo** >15 modulů), založ rovnou epic-ready `tasks/` (s `tasks/template/epic/` i `tasks/template/task/`). Jinak flat.
2. **Během vývoje** — když počet tasků ve flat `tasks/` naroste přes ~12, **nebo** je vidět, že víc tasků patří do jedné iniciativy (sdílený prefix klíče, např. `CF-101`, `CF-102`, `CF-103`), plugin při dalším task-create **navrhne migraci** na epic strukturu: přesune existující tasky pod `tasks/<EPIC>/` a dál zakládá tam. Migraci provede, jen pokud je jednoznačná; jinak nech flat.

V obou případech to plugin **dělá sám** a v summary jen oznámí (*"tasks/ jsou flat — při >12 tascích nabídnu epic seskupení"* nebo *"detekoval jsem Jira + multi-module, zakládám epic-ready tasks/"*). Detaily viz `references/struktura.md` sekce *Epic auto-promotion*.

### 6.6 Bulk summary

Po skončení 6.4 + 6.5 přidej do hlavního summary (sekce 7) blok:

```
Bulk discovery:
  • Kandidátů nalezeno:    47 modulů (15 top-level package, 32 sub-modulů)
  • Generováno:            20 (top 20 podle priority)
  • Přeskočeno:            27 (limit --max-modules; pro zbytek: /doc-update --all)
  • Selhání:                2 (viz výše)

Vytvořené soubory:
  • 20 × DESCRIPTION.md
  • 4 × MODULES.md (top-level packages)
  • 8 × docs/modules/<X>/README.md (s ≥3 sub-moduly)

Token cost (odhad):
  • Input:  ~104k    Output: ~38k
```

## 7. Summary

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

### Konfigurace (autodetekce)

- `--force` — přepíš existující substrate soubory (používej opatrně)
- `--ticket-system=jira|linear|github|none` — override autodetekce
- `--platforms=cc,codex,cursor,gemini` — čárkou oddělený seznam (override)
- `--lang=cs|en` — override
- `--no-detect` — vypni autodetekci, použij čistě defaulty (`cc`, `none`, `en`)

Při kombinaci flagu + autodetekce: flag vyhrává pro své pole, ostatní pole se detekují normálně.

### Bulk discovery + generování (sekce 6)

- `--bulk` — explicitně zapni bulk (default chování, flag není potřeba)
- `--no-bulk` — přeskoč bulk discovery; jen vytvoř kostru a skonči
- `--max-modules=N` — limit počtu generovaných modulů v prvním běhu (default 20, zbytek se pak doplní přes `/doc-update --all`)
- `--concurrency=N` — počet paralelně běžících `docs-updater` subagentů (default 5)
- `--dry-run` — vypiš plán (kandidáty, prioritu, odhad tokenů) a skonči bez zápisu

### Hooky (sekce 6.7)

- `--install-hooks` — nainstaluj hookovou sadu: `.claude/hooks/docs-plugin-check.sh`, `.claude/settings.json` (SessionStart enable-prompt/drift + Stop), `.git/hooks/post-merge` (drift check po `git pull`)
- `--no-hooks` — vypni interaktivní dotaz na hooky; nainstaluj NIC

Bez flagu se v interaktivním módu commandy zeptá *"Nainstalovat hooky? [y/N]"* (default N).

## 9. Backwards compatibility

- Stejné argumenty jako ve verzi před autodetekcí (`--force`, `--ticket-system`, `--platforms`, `--lang`) **se chovají stejně**. Passne-li je uživatel všechny, autodetekce se prakticky neuplatní.
- Bulk discovery (sekce 6) je nová, ale `--no-bulk` ji vypne — pak je chování ekvivalentní původnímu „udělej kostru, neuglej obsah".
- Jediná breaking změna proti původnímu chování: bez flagů se teď rovnou generuje DESCRIPTION.md napříč moduly. Pokud to user nechce, řekne `--no-bulk`.
