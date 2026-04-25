---
description: Kompletně přepíše docs-plugin dokumentaci pro daný adresář (zahodí starou, vygeneruje od nuly). Použij po refaktoru nebo po dlouhém období bez údržby.
argument-hint: "<path> [--keep-adr-links] [--dry-run]"
---

# /doc-revise

Kompletně přepiš dokumentaci pro zadaný adresář. Na rozdíl od `/doc-update`, **zahodí starý obsah** `DESCRIPTION.md` a vygeneruje nový od nuly.

## Kdy použít

- Refaktor, který přejmenoval/změnil většinu veřejného API
- Dlouhé období bez údržby (>3 měsíce, dokumentace je out-of-sync)
- Změna architektonického přístupu (DI → event-driven, monolith → microservice split)
- První generace dokumentace pro legacy kód, který žádné `DESCRIPTION.md` neměl

## Co tento command dělá

1. Ověří, že repo má docs-plugin strukturu
2. Deleguje na `docs-updater` subagent v režimu „revise"
3. Subagent zahodí obsah `DESCRIPTION.md` (kromě frontmatter typu a module path) a vygeneruje nový
4. Stejně tak `MODULES.md` a `docs/modules/<X>/README.md` — kompletní regenerace
5. Reportuje, co se ztratilo ze starého obsahu (pro lidskou kontrolu)

## Vstup

- `<path>`: relativní cesta k adresáři se zdrojáky (povinný)
- `--keep-adr-links`: pokud ve starém DESCRIPTION.md byly odkazy na ADR, zachovej je (default: ano, ale reportuj)
- `--dry-run`: jen ukaž, co by se vygenerovalo, bez zápisu

## Postup

### 1. Backup existujícího obsahu

Před zahazováním:

```bash
# Ulož starou verzi pro případ, že uživatel bude chtít něco obnovit
cp <path>/DESCRIPTION.md .doc-revise-backup/<path>/DESCRIPTION.md.$(date +%Y%m%d-%H%M%S)
```

Pokud `.doc-revise-backup/` neexistuje, vytvoř ho a přidej do `.gitignore`.

### 2. Analýza zdrojáků

Stejně jako `/doc-update`:
- Najdi veřejné symboly
- Vyextrahuj signatury a doc comments
- Spočítej `api_hash`

### 3. Generace nového obsahu

Použij kompletní šablonu `DESCRIPTION.md` (viz `templates/tree/src/DESCRIPTION.md`):

```markdown
---
type: description
module: <relativní cesta>
status: active
api_hash: <nový-hash>
last_updated: <dnes>
---

# <Modul Name>

<Jeden odstavec popisu: co tento modul dělá, jeho role v systému.>

## Co tady žije

- `<TypName1>` — <jednořádkový popis>
- `<TypName2>` — <jednořádkový popis>
- ...

## Veřejné API

### `<FunkceName>(params) -> return`

<popis, co funkce dělá. Vstupy, výstupy, vedlejší efekty.>

### `<Class>.method(params) -> return`

...

## Jak to používat

```<lang>
<minimální příklad použití>
```

## Integrace

<Co modul publishuje / konzumuje, pokud nějaké jsou.>

## Související

- Architektura: `docs/modules/<X>/architecture/`
- Reference: `docs/modules/<X>/reference/`
- <volitelně ADR odkazy>
```

### 4. Report změn proti staré verzi

Extrémně důležité: uživatel potřebuje vědět, co se **ztratilo**, protože ne všechno ze starého `DESCRIPTION.md` se dalo odvodit ze zdrojáků.

```markdown
⚠ Při /doc-revise se z původního DESCRIPTION.md ztratilo:

- Úvahy o návrhu (3 odstavce v sekci "Design notes" — nelze odvodit z kódu)
- 2 odkazy na ADR (zachovány, pokud --keep-adr-links)
- User-added příklad použití v sekci "Advanced usage"
- Komentáře k deprecation warnings

Nový DESCRIPTION.md obsahuje pouze informace odvoditelné ze zdrojáků + jejich doc comments.

Doporučení:
1. Projděte si .doc-revise-backup/<path>/DESCRIPTION.md.<timestamp>
2. Ručně přidejte zpět informace, které mají trvalou hodnotu (design notes, advanced examples)
3. Pokud se jedná o architektonická rozhodnutí, zvažte převedení do ADR v docs/architecture/decisions/
```

### 5. MODULES.md a docs/modules/<X>/README.md

Stejná logika — kompletně regeneruj, ale reportuj, co se ztratilo (pokud něco).

## Output format

```
✓ /doc-revise <path>

Přepsané soubory:
- src/Billing/Invoicing/DESCRIPTION.md (kompletní regenerace)
- src/Billing/MODULES.md (aktualizován řádek pro Invoicing)
- docs/modules/billing/modules/invoicing/README.md (kompletní regenerace)

Backup uložen do:
- .doc-revise-backup/src/Billing/Invoicing/DESCRIPTION.md.20260422-143210
- .doc-revise-backup/docs/modules/billing/modules/invoicing/README.md.20260422-143210

api_hash: a7f3c9 → e4d21a

⚠ Ztraceno při revize (ze starého DESCRIPTION.md):
- Sekce "Design rationale" (3 odstavce) — nepřeneseno (nelze odvodit z kódu)
- Odkazy na ADR-014, ADR-018 — zachovány v nové verzi
- User-added "Troubleshooting" sekce (5 položek) — NEPŘENESENO

Doporučení:
1. Projděte .doc-revise-backup/<path>/DESCRIPTION.md.20260422-143210
2. Zvažte převod "Design rationale" do nového ADR
3. "Troubleshooting" sekci buď přeneste zpět, nebo ji přesuňte do docs/modules/billing/reference/troubleshooting.md
```

## Edge cases

### První generace (žádný existující DESCRIPTION.md)

Jen vygeneruj nový, žádný backup. Informuj:
```
Generuji první verzi DESCRIPTION.md pro <path>.
```

### `--dry-run`

Ukáži navrhovanou novou verzi jako diff / preview, nezapíšu. Uživatel se rozhodne.

### Zdrojáky bez doc comments

Stejně jako v `/doc-update`: reportuj, že nová dokumentace bude chudší, než by mohla být, a doporuč vývojáři dopsat doc comments.

### Modul má víc než ~50 veřejných symbolů

Varování:
```
Modul <path> má 67 veřejných symbolů. DESCRIPTION.md bude dlouhý (~500 řádků).
Doporučuji zvážit rozsekání:
- Strukturálně rozdělit modul na submoduly (a každý bude mít vlastní DESCRIPTION.md)
- Přesunout část dokumentace do docs/modules/<X>/reference/
```

Pokračuj jen pokud uživatel potvrdí.

## Důležité

- **`/doc-revise` je destruktivní.** Vždycky dělej backup.
- **Žádný changelog v novém obsahu.** I když starý DESCRIPTION.md měl sekci "Changed in v2.0", nový nemá.
- **Reportuj ztráty.** Subagent musí říct, co ze staré verze nepřeneslo a proč.
- **Nedělej revize automaticky v pre-commit hooku.** `/doc-revise` je manuální operace, vyžaduje lidský review.
