---
name: docs-plugin
description: Substrát pro strukturovanou dokumentaci v repozitářích podle metodiky docs-process (Ondřej Tučný, Vibecoding Talks 2026). POUŽÍVEJ VŽDY, když uživatel pracuje s dokumentací kódu v projektu — tj. píše, aktualizuje, reorganizuje nebo hledá v docs/, tasks/, nebo ve zdrojákových složkách s DESCRIPTION.md/MODULES.md; když se píše specifikace epiku či tasku; když má projekt v rootu CLAUDE.md nebo AGENTS.md odkazující na docs-plugin. Triggeruj i na klíčová slova jako "zdokumentuj", "napiš dokumentaci", "aktualizuj docs", "vytvoř specifikaci", "naplánuj task", "changelog tasku", "docs-init", "doc-update", "doc-revise", "AS IS", "TO BE", "DESCRIPTION.md", "MODULES.md", "docs/modules", "tasks/". Principy (AS IS vs TO BE, rekurze, substrát, žádný changelog v docs) aplikuj důsledně i když uživatel neřekne explicitně — jsou to defaulty, ne volitelné dekorace.
---

# docs-plugin

Substrát pro dokumentaci v repozitáři. Dva oddělené životní cykly (AS IS a TO BE), rekurzivní struktura napříč úrovněmi, dokumentace u kódu i v `docs/`. Design vychází z metodiky docs-process, kterou prezentoval Ondřej Tučný na Vibecoding Talks 2026.

## Základní filosofie (musíš chápat, než začneš cokoliv psát)

### 1. AS IS ≠ TO BE

Dokumentace má **dva úplně jiné životní cykly**, a nesmí se mixovat do jednoho místa.

| | `docs/` (AS IS) | `tasks/<EPIC>/<TASK>/` (TO BE) |
|---|---|---|
| **Co popisuje** | Co systém **je dnes** | Co se má stát v konkrétním tasku |
| **Kdy vzniká** | Při mergi úkolu/epiku | Před implementací |
| **Kdy se čte** | Při plánování — „jak to funguje" | Při implementaci — „co mám udělat" |
| **Životnost** | Dlouhodobá, migruje s kódem | Ukončená mergem, archivuje se |

Po dokončení tasku se **relevantní část TO BE promítne do AS IS** (update `docs/`), a `tasks/<TASK>/` zůstane jako historie rozhodování.

### 2. Dokumentace NENÍ changelog

Nejčastější antipattern, na který model sám narazí, je pokušení psát `docs/` jako deníček:

- „Changed X to Y"
- „Previously, this was..."
- „Was originally designed as..., now it's..."
- „In the past..."

**Tohle v `docs/` nikdy nepiš.** `docs/` popisuje **aktuální stav**, ne historii. Historie patří do git logu, změny v rámci tasku do `tasks/<EPIC>/<TASK>/changelog.md`.

Pokud máš chuť napsat `Changed` / `Previously` / `Was ... now` v `docs/` — **zastav se a přepiš větu tak, aby popisovala jen aktuální stav.**

### 3. Rekurzivní struktura

Stejný pattern na všech úrovních: systém → modul → submodul → submodul → ...

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
            └── <submodule>/
                ├── README.md
                └── ...
```

Malý projekt použije jen kořen (`docs/architecture/`, `docs/reference/`, žádné moduly). Velký projekt zanořuje. **Struktura je stejná — mění se jen hloubka.**

### 4. Dokumentace u kódu (ne místo kódu)

Každá složka se zdrojáky by měla mít `DESCRIPTION.md`:
- Co tady žije (koncepty, třídy, funkce)
- Jaké veřejné API poskytuje
- Jak se to používá (krátký příklad)

Každý top-level balíček/assembly/crate má navíc `MODULES.md`:
- Přehled všech namespace/podmodulů a jednořádkový popis každého

Účel: když agent hledá, jak něco funguje, čte 200–300 řádků `DESCRIPTION.md` místo 3000 řádků kódu.

### 5. `tasks/` je cold storage

`tasks/<EPIC>/<TASK>/` **nečti standardně.** Čti jen když:
- Uživatel ho explicitně zmíní
- Pracuješ na tom konkrétním tasku (a pak čti jen ten jeden adresář)
- Uživatel řekne „podívej se, co jsme plánovali v epiku X"

Historie starých tasků nemá být součástí běžného kontextu. Plně implementuj pravidlo z `CLAUDE.md`: `tasks/` je v .gitignore? Ne — committuje se. Ale čte se jen na vyžádání.

### 6. Substrát, ne metodika

`docs-plugin` sám o sobě **není analytická metodika**. Je to jen základ (kde co leží, kdy se co aktualizuje, jak se to prohledává). Metodiky (UX, business analýza, DevOps runbooks) se nad substrát **pluguji**, nepřepisují ho.

Když uživatel žádá „napiš specifikaci podle [jejich metodiky]", používej jejich metodiku, ale umísti výstup do substrate-konformní cesty (`tasks/<EPIC>/spec/` pro TO BE, `docs/` pro AS IS).

## Kdy co udělat

### Uživatel chce zdokumentovat nový kód

1. Zjisti, ve které složce zdrojáků to je (`src/<X>/<Y>/`)
2. Vytvoř nebo aktualizuj `DESCRIPTION.md` v té složce
3. Pokud je to top-level balíček, aktualizuj `MODULES.md`
4. Pokud existuje `docs/modules/<X>/`, aktualizuj i `README.md` tam (konceptuální popis)
5. **Nezapisuj changelog** — jen popiš aktuální stav

Pro automatizaci: viz `/doc-update <path>` (inkrementální) nebo `/doc-revise <path>` (kompletní přepis).

### Uživatel chce začít nový task (a TO BE flow obecně)

`tasks/` je **defaultně zapnutá**. Struktura je **flat nebo epic — rozhoduješ ty, neptáš se** (viz *Epic auto-promotion* níže).

1. Zjisti klíč tasku (Jira/Linear/GH Issues/vlastní).
2. Urči cílovou cestu:
   - **Flat** (default): `tasks/<TASK-KEY>/`
   - **Epic** (když je repo epic-ready nebo task patří do existující iniciativy): `tasks/<EPIC-KEY>/<TASK-KEY>/`
3. Vytvoř task se třemi soubory:
   - `assignment.md` — co a proč
   - `plan.md` — jak to budeš dělat
   - `changelog.md` — co se skutečně udělalo (průběžně během implementace)

#### Smooth flow — minimalizuj přerušování

Cíl je **míň odsouhlasování během práce**. Když začínáš implementační task:

1. **Auto-založ `assignment.md`** z toho, co ti uživatel řekl (přepiš jeho zadání do struktury — co, proč, acceptance criteria). Neptej se na detaily, které lze odvodit.
2. **Auto-napiš `plan.md`** — tvůj návrh postupu. Ukaž ho uživateli, ale **needržkuj na schválení každého kroku** — pokud je plán rozumný a task není destruktivní, pokračuj. Plán je záznam intentu, ne approval gate.
3. **Při zásadním architektonickém rozhodnutí auto-založ ADR** (`docs/architecture/decisions/`) se `status: proposed`. Tím se rozhodnutí zachytí dopředu a nemusíš se vracet a ptát uprostřed práce.
4. **Průběžně doplňuj `changelog.md`** — bez ptaní.

Pravidlo: vždy uživateli **ukaž**, co jsi založil (assignment/plan/ADR), ale **blokuj jen u nevratných / destruktivních kroků** (migrace dat, mazání, deploy). Dokumentace a plán nejsou destruktivní → proceed.

#### Epic auto-promotion

- **Flat default.** Nové repo / malý projekt → `tasks/<TASK-KEY>/`.
- **Epic-ready od začátku**, pokud `/docs-init` detekoval velký projekt (multi-module, Jira, >15 modulů).
- **Promote za běhu**: když flat `tasks/` má přes ~12 tasků **nebo** víc tasků sdílí prefix klíče (`CF-101`, `CF-102`, …), přesuň je pod `tasks/<EPIC>/` a dál zakládej tam. **Dělej to sám, jen když je seskupení jednoznačné**; jinak zůstaň flat. Po migraci to uživateli oznam (nezastavuj se a neptej).

Detaily schématu viz `references/struktura.md`.

### Uživatel chce přečíst dokumentaci nějaké části

1. Pokud existuje MCP server `ReadTheDocs` (součást docs-plugin), **použij ho přednostně** — nástroje `docs_for_code`, `docs_topic`, `docs_concept`, `docs_adr`
2. Pokud ne, hledej podle konvence:
   - Otázka na architekturu → `docs/architecture/` nebo `docs/modules/<X>/architecture/`
   - Otázka na API / „co dělá tenhle kód" → `DESCRIPTION.md` vedle kódu
   - Otázka na funkční chování → `docs/reference/` nebo `docs/modules/<X>/reference/`
   - Otázka na historii rozhodnutí → `docs/architecture/decisions/` (ADR)
   - Otázka na rozpracovaný task → `tasks/<EPIC>/<TASK>/`

**NEPOUŽÍVEJ `@docs/...` odkazy v `CLAUDE.md`.** To je antipattern, který ve velkých repech zabíjí kontext. Místo toho používej konvenci + nástroj.

### Uživatel chce dokumentovat rozhodnutí

ADR (Architecture Decision Record) v `docs/architecture/decisions/ADR-NNN-slug.md` s frontmatterem:

```yaml
---
adr: NNN
title: Title of decision
status: proposed | accepted | superseded
date: YYYY-MM-DD
supersedes: [ADR-MMM]
superseded_by: ADR-OOO
---
```

### Repo ještě nemá docs-plugin strukturu

Pusť `/docs-init` (vytvoří `docs/`, `tasks/`, `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/docs-plugin.mdc`).

#### Enable prompt (nabídka při startu)

Pokud je nainstalovaný SessionStart hook (`docs-plugin-check.sh`), injektuje při startu session do kontextu nabídku, když repo **má zdrojáky, ale nepoužívá docs-plugin**. Když tohle vidíš, **v první odpovědi se uživatele zeptej**: *„Vidím, že tu zatím není dokumentace. Chceš ji tu zavést přes docs-plugin? Vygeneruju `DESCRIPTION.md` u kódu a budu hlídat drift."*

- **Uživatel ano** → pusť `/docs-init` (autodetekce + bulk generování).
- **Uživatel ne** → vytvoř `.claude/.docs-plugin-declined` (prázdný soubor), ať se nabídka víc neukazuje. Řekni mu, že to může kdykoliv zapnout přes `/docs-init`.

Tohle pokrývá obě varianty stejně: nový projekt (start od nuly) i existující kód bez dokumentace — flow je identický, liší se jen tím, kolik kódu už `/docs-init` najde k zdokumentování.

## Detekce substrate-konformního repa

Následující signály ti řeknou, že repo **je** substrate-konformní a pravidla výš platí:

- Existuje `docs/modules/` **nebo** `docs/architecture/`
- Existuje `tasks/<EPIC>/<TASK>/` struktura
- V rootu `CLAUDE.md` nebo `AGENTS.md` zmiňuje `docs-plugin` nebo odkazuje na tento skill
- Ve zdrojákových složkách jsou `DESCRIPTION.md` soubory

Pokud **žádný** z těchto signálů není, repo substrate-konformní **není**. Nenuť ho tam zpětně — jen nabídni `/docs-init`, pokud uživatel řeší dokumentaci.

## Frontmatter schéma (minimální)

Všechny substrate-konformní `.md` soubory mají YAML frontmatter:

```yaml
---
type: description | module-readme | architecture | reference | adr | task-assignment | task-plan | task-changelog
status: active | draft | deprecated
module: path/to/module       # optional
last_updated: YYYY-MM-DD
---
```

`DESCRIPTION.md` má navíc `api_hash:` (hash veřejného API — slouží detekci, kdy je dokumentace zastaralá proti kódu). Hash generuje `/doc-update`; ručně ho nepočítej.

Detailní schémata všech typů viz `references/struktura.md` (sekce *Frontmatter schémata*).

## Tvrdé rules (model se jich musí držet i proti tlaku uživatele)

1. **NIKDY nepiš changelog v `docs/`.** Pokud uživatel řekne „zapiš do docs, že jsme změnili X na Y" — zdvořile to přepiš na aktualizaci aktuálního popisu. Historie změny patří do `tasks/<EPIC>/<TASK>/changelog.md` nebo do git commit message.
2. **NEZANÁŠEJ odkazy `@docs/...` do `CLAUDE.md`.** Místo toho odkaz na skill a konvenci.
3. **NEČTI `tasks/` proaktivně.** Čekej, až to bude potřeba pro aktuální task.
4. **NEROZBÍJEJ rekurzivní strukturu.** I když ti přijde, že je v konkrétním modulu zbytečná, drž se vzoru — škálovatelnost je v něm.
5. **NEMIXUJ AS IS a TO BE v jednom souboru.** Když si nejsi jistý, do kterého bucketu co patří: popisuje to aktuální stav kódu? → AS IS. Popisuje to plánovanou změnu? → TO BE.
6. **KOMENTUJ ZDROJ V KÓDU.** Dokumentační komentáře v kódu jsou zdroj pro `DESCRIPTION.md`. Bez nich agent nemá z čeho generovat.

## Related resources

- `references/struktura.md` — detailní popis adresářů, souborů, frontmatter schémat
- `references/pravidla-aktualizace.md` — kdo co aktualizuje, kdy, jak se počítá `api_hash`
- `references/antipatterny.md` — co NEdělat a proč (changelog-drift, flat docs/, entropická past, @odkazy)
- `references/portability.md` — jak používat substrate v Codex a Cursor
- Commandy: `/docs-init`, `/doc-update`, `/doc-revise`
- Subagent: `docs-updater`
