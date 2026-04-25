# Instalace docs-plugin

## Quick start

### Claude Code (primární cílová platforma)

```bash
# Lokální instalace z cloned repa
git clone <repo-url> /path/to/docs-plugin
claude plugin install /path/to/docs-plugin

# Nebo přímo z GitHubu (až bude published)
claude plugin install softmedia/docs-plugin
```

Ověř instalaci:

```bash
claude plugin list | grep docs-plugin
```

V libovolném repu pak pusť `/docs-init` pro prvotní nastavení.

### Codex / Gemini / Cursor (sekundární)

Tyto nástroje nemají plugin systém srovnatelný s CC. Postup:

1. **Jednorázově** v jednom repu pusť `/docs-init` z Claude Code — tím se vytvoří šablony (`AGENTS.md`, `.cursor/rules/`, struktura `docs/` a `tasks/`).
2. Dál už s tím nástrojem pracuj normálně — šablony se propíší do kontextu každého agenta.

Pokud Claude Code vůbec nemáš:

```bash
# Ručně zkopíruj šablony
cp docs-plugin/templates/CLAUDE.md   <your-repo>/CLAUDE.md
cp docs-plugin/templates/AGENTS.md   <your-repo>/AGENTS.md
cp -r docs-plugin/templates/cursor-rule   <your-repo>/.cursor/rules

# Vytvoř strukturu
mkdir -p <your-repo>/docs/{architecture/decisions,reference,modules}
mkdir -p <your-repo>/tasks/template/{epic/spec,task}

# Zkopíruj skeleton
cp -r docs-plugin/templates/tree/*   <your-repo>/
```

Pak v `CLAUDE.md` / `AGENTS.md` nahraď placeholdery:

- `{{PROJECT_NAME}}` — název projektu
- `{{TICKET_SYSTEM}}` — Jira / Linear / GitHub Issues / …
- `{{DATE}}` — dnešní datum (YYYY-MM-DD)
- `{{TECH_STACK}}` — krátký popis stacku
- `{{CODE_STYLE}}` — linter/formatter používaný v projektu
- `{{TESTING}}` — testing framework
- `{{LANG}}` — jazyk dokumentace (cs/en)

## Ověření

Po instalaci bys měl vidět:

```bash
ls <your-repo>/docs/
# architecture/  modules/  README.md  reference/

ls <your-repo>/tasks/
# README.md  template/

cat <your-repo>/CLAUDE.md | head -5
# # CLAUDE.md — <tvůj projekt>
# ...
```

## Odinstalace

```bash
claude plugin uninstall docs-plugin
```

Odinstalace pluginu **neodstraní** strukturu `docs/` a `tasks/` v repozitářích, které ji používají — to je záměrně. Struktura je součástí repa, plugin je jen nástroj pro práci s ní.

## Řešení problémů

### Skill se netrigguje

Check:
1. `claude plugin list` — je plugin nainstalovaný?
2. Existuje v repu `CLAUDE.md` nebo `AGENTS.md` s textem „docs-plugin"? Skill detekuje substrate podle tohoto markeru.
3. Zkus explicitně: „použij docs-plugin skill a aktualizuj dokumentaci pro X"

### `/docs-init` hlásí, že struktura už existuje

Plugin je konzervativní a nepřepisuje existující soubory. Pro force přepis:

```
/docs-init --force
```

### `/doc-update` negeneruje `api_hash`

`api_hash` se počítá jazykově-specifickými nástroji (Roslyn pro C#, AST pro Python, ts-morph pro TS...). Pokud v repu není dostupná odpovídající knihovna, `api_hash` se generuje jako „fingerprint" z textu veřejného API bez AST parse. Méně přesné, ale funkční.

Pro plnou implementaci `api_hash` pro tvůj tech stack viz TODO roadmap (v0.2).

### Claude píše changelog v `docs/` i přes pravidla

Pokud to přetrvává:

1. Zkontroluj, že `CLAUDE.md` v rootu repa skutečně obsahuje hard rules sekci (viz `templates/CLAUDE.md`)
2. Explicitně v promptu: „pozor, v docs nepiš changelog, jen aktuální stav"
3. Pokud i tak: je to signál, že je v pluginu prostor pro zlepšení — otevři issue

## Další kroky

- Přečti si `skills/docs-plugin/SKILL.md` pro filosofii
- Přečti si `skills/docs-plugin/references/antipatterny.md` pro typické chyby
- V repu pusť `/docs-init` a `/doc-update <first-module>` pro první praktickou zkušenost
