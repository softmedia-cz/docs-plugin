# docs-plugin

> Substrát pro strukturovanou dokumentaci v repozitářích, která škáluje od malých projektů po multimilionové codebase. Postaveno pro efektivní spolupráci s AI kódovacími agenty (Claude Code, Codex, Cursor, Gemini CLI).

Plugin automatizuje dokumentační workflow podle metodiky `docs-process`, kterou prezentoval Ondřej Tučný na Vibecoding Talks 2026 (*Strukturace dokumentace pro efektivní použití s Claude Code*). Klíčové myšlenky:

- **AS IS vs TO BE** — aktuální stav (`docs/`) a plánované změny (`tasks/`) jsou oddělené.
- **Rekurzivní struktura** — stejný pattern na všech úrovních, od systému po submodul.
- **Dokumentace u kódu** — `DESCRIPTION.md` ve složkách se zdrojáky místo jedné „CLAUDE.md na všechno".
- **Konvence + nástroj > cesty** — agent ví, kam se podívat, bez seznamu `@docs/...` odkazů.
- **Žádný changelog v `docs/`** — historie patří do git logu a `tasks/<EPIC>/<TASK>/changelog.md`.

## Co v pluginu najdeš

| Komponenta | Co dělá |
|---|---|
| **Skill `docs-plugin`** | Naučí Claude Code metodiku. Trigguje se automaticky, když uživatel pracuje s dokumentací. |
| **Subagent `docs-updater`** | Izolovaný agent pro aktualizaci `DESCRIPTION.md` / `MODULES.md`. Tvrdá pravidla proti changelog-drift. |
| **Command `/docs-init`** | Inicializuje substrate strukturu v novém nebo existujícím repu. Generuje `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`. |
| **Command `/doc-update`** | Inkrementální aktualizace dokumentace pro zadaný adresář. |
| **Command `/doc-revise`** | Kompletní přepis dokumentace (po refaktoru nebo dlouhém období bez údržby). |
| **Šablony** | `CLAUDE.md`, `AGENTS.md`, cursor rule, prázdný docs/, tasks/, ukázkový DESCRIPTION.md. |

## Instalace

### Claude Code

Plugin je distribuovaný přes vlastní marketplace v tomtéž repu — nejdřív přidat marketplace, pak instalovat plugin:

```bash
claude plugin marketplace add softmedia-cz/docs-plugin
claude plugin install docs-plugin
```

Lokální vývoj (z naklonovaného checkoutu):

```bash
git clone https://github.com/softmedia-cz/docs-plugin.git /path/to/docs-plugin
claude plugin marketplace add /path/to/docs-plugin
claude plugin install docs-plugin
```

Po instalaci:
- Skill se automaticky aktivuje v repozitáři, kde detekuje docs-plugin strukturu
- Commandy `/docs-init`, `/doc-update`, `/doc-revise` jsou k dispozici
- Subagent `docs-updater` se volá commandami automaticky

### OpenAI Codex

Codex nemá nativní plugin systém. Místo toho:

1. V repu pusť `/docs-init` z Claude Code (jednorázově)
2. Tím se vytvoří `AGENTS.md` se všemi pravidly — Codex je pak čte automaticky
3. Prompt šablony v `.codex/prompts/` poskytují ekvivalent slash commandů

Detaily: `skills/docs-plugin/references/portability.md`.

### Cursor

Totéž jako Codex:

1. Pusť `/docs-init` z CC (nebo manuálně vytvoř strukturu)
2. Vytvoří se `.cursor/rules/docs-plugin.mdc`
3. Cursor Composer rule respektuje

### Manuálně (bez Claude Code)

Pokud Claude Code nemáš, ale chceš substrate použít:

1. Naklonuj tento repozitář
2. Zkopíruj `templates/CLAUDE.md`, `templates/AGENTS.md`, `templates/cursor-rule/docs-plugin.mdc` do svého projektu
3. Vytvoř strukturu `docs/` a `tasks/` podle `templates/tree/`
4. Nahraď placeholdery (`{{PROJECT_NAME}}`, `{{TICKET_SYSTEM}}`, `{{DATE}}`, atd.)

## První použití

V čerstvém repu:

```
/docs-init
```

Command tě interaktivně provede nastavením (typ projektu, ticketovací systém, cílové platformy, jazyk dokumentace). Vytvoří strukturu a konfiguraci.

Po inicializaci, pro vygenerování první dokumentace modulu:

```
/doc-update src/Billing/Invoicing
```

Pro nový task:

```
Založ mi task CF-142 "Idempotent invoice generation" v epiku CF-100-EPIC.
```

Agent použije šablony z `tasks/template/` a vytvoří `tasks/CF-100-EPIC/CF-142/` se skeletem `assignment.md`, `plan.md`, `changelog.md`.

## Struktura pluginu

```
docs-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── docs-plugin/
│       ├── SKILL.md              # hlavní skill s filosofií
│       └── references/
│           ├── struktura.md           # adresářové schéma + frontmatter
│           ├── pravidla-aktualizace.md # kdo co aktualizuje kdy
│           ├── antipatterny.md        # co NEdělat
│           └── portability.md         # Codex, Cursor, Gemini, Aider
├── agents/
│   └── docs-updater.md          # subagent pro aktualizaci .md souborů
├── commands/
│   ├── docs-init.md             # /docs-init
│   ├── doc-update.md            # /doc-update
│   └── doc-revise.md            # /doc-revise
├── templates/
│   ├── CLAUDE.md                # šablona pro repo CLAUDE.md
│   ├── AGENTS.md                # šablona pro repo AGENTS.md (Codex)
│   ├── cursor-rule/
│   │   └── docs-plugin.mdc   # šablona pro .cursor/rules/
│   ├── .codex/prompts/          # prompt šablony pro Codex (ekvivalent slash commandů)
│   ├── hooks/                   # vzorové git hooky (pre-commit doc-update)
│   └── tree/                    # prázdná skeleton struktura
│       ├── docs/...
│       ├── tasks/...
│       └── src/DESCRIPTION.md   # ukázkový příklad
└── README.md                    # tento soubor
```

## Tvrdá pravidla (neporušitelná)

1. **Žádný changelog v `docs/`.** Historie změn patří do git commit messages a `tasks/<EPIC>/<TASK>/changelog.md`.
2. **`tasks/` je cold storage.** Agent ho nečte proaktivně.
3. **Rekurzivní struktura** — `docs/modules/<X>/modules/<Y>/` ne flat layout.
4. **AS IS a TO BE se nemixují** v jednom souboru.
5. **`@docs/*` odkazy v `CLAUDE.md` jsou antipattern** — agent si najde cestu přes konvenci.
6. **`MODULES.md` je auto-generovaný** — nikdy neupravovat ručně.

## Co plugin NEobsahuje (a proč)

- **MCP server `ReadTheDocs`** — zmíněný v přednášce, ale není součástí tohoto pluginu (scope: skill + commandy + agent). Dá se dostavět samostatně (PowerShell, Python, TS), plugin poskytuje kontrakt (viz `skills/docs-plugin/references/portability.md`).
- **Pre-commit hooky** — jen návrhová šablona v `references/pravidla-aktualizace.md`. Konkrétní implementace závisí na tech stacku.
- **`api_hash` implementace** — návrh v `references/pravidla-aktualizace.md`, konkrétní jazykové implementace (C#/Python/TS/Rust) jsou projektově specifické.

Tyto komponenty jsou **roadmapa v0.2+**.

## Kompatibilita

| Platforma | Podpora |
|---|---|
| Claude Code | ✅ Nativně (plugin) |
| OpenAI Codex CLI | ⚠️ Přes `AGENTS.md` + prompt šablony |
| Cursor | ⚠️ Přes `.cursor/rules/` |
| Gemini CLI | ⚠️ Přes `AGENTS.md` |
| Aider | ⚠️ Přes `CONVENTIONS.md` / `--read` |

Filesystém konvence (`docs/`, `tasks/`, `DESCRIPTION.md`) fungují **napříč všemi agenty**. Rozdíl je jen v tom, jak pohodlné je pracovat (plný plugin vs prompt templates).

## Credits

- **Metodika `docs-process`:** Ondřej Tučný, přednáška *Strukturace dokumentace pro efektivní použití s Claude Code* (Vibecoding Talks, Praha 2026)
- **Plugin:** [Softmedia.cz](https://softmedia.cz)

## Licence

<!-- Doplň podle preferencí. Doporučení: MIT nebo Apache-2.0. -->

## Přispívání

Issue tracker: <https://github.com/softmedia-cz/docs-plugin/issues>

Pull requesty vítány. Před přispěním se podívej na:
- `skills/docs-plugin/SKILL.md` — zajisti, že změny jsou v souladu s filosofií
- `skills/docs-plugin/references/antipatterny.md` — nezaváděj antipatterny do pluginu samotného
