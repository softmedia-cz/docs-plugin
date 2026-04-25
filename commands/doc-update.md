---
description: Inkrementálně aktualizuje docs-plugin dokumentaci pro daný adresář (DESCRIPTION.md, MODULES.md, docs/modules/*/README.md)
argument-hint: "<path> [--include-docs-modules] [--no-api-hash]"
---

# /doc-update

Inkrementálně aktualizuj dokumentaci pro zadaný adresář. **Nesmí psát changelog** — popisuje jen aktuální stav kódu.

## Co tento command dělá

1. Ověří, že repo má docs-plugin strukturu (pokud ne, poradí `/docs-init`)
2. Zanalyzuje zdrojáky v `<path>`
3. Aktualizuje `<path>/DESCRIPTION.md` (pokud neexistuje, vytvoří)
4. Aktualizuje `<path>/../MODULES.md` (pokud je dotčený top-level balíček)
5. Aktualizuje `docs/modules/<X>/README.md` (pokud existuje odpovídající modul v docs)
6. Reportuje, co se změnilo

## Vstup

- `<path>`: relativní cesta k adresáři se zdrojáky (povinný)
- `--include-docs-modules`: zahrň aktualizaci `docs/modules/<X>/README.md` (default: ano, pokud existuje)
- `--no-api-hash`: nevypočítej `api_hash` (default: počítej)

## Postup

### 1. Deleguj na `docs-updater` subagent

Pokud je subagent `docs-updater` dostupný (plugin je nainstalován a CC ho zná), pusť ho s instrukcí:

```
Aktualizuj dokumentaci pro adresář: <path>
Mode: inkrementální (zachovávej existující strukturu, jen aktualizuj rozdíly)
Include docs/modules/: ano
Include api_hash: ano
```

Subagent běží v izolovaném kontextu a vrátí ti summary. Ty to předáš uživateli.

### 2. Pokud subagent nedostupný (Codex, Cursor, manual invocation)

Proveď kroky ručně podle instrukcí z `agents/docs-updater.md`:

1. Přečti existující `<path>/DESCRIPTION.md` (pokud je)
2. Skenuj zdrojáky v `<path>`:
   - Najdi veřejné typy/funkce/třídy (`public` v C#, `export` v TS/JS, `__all__` nebo top-level v Pythonu, `pub` v Rustu)
   - Vyextrahuj signatury a doc comments
3. Spočítej `api_hash`:
   - Seřaď seznam veřejných symbolů abecedně
   - Serializuj (normalizovaný whitespace)
   - SHA-256 prvních 12 hex znaků (přenosné Linux/macOS):
     ```bash
     printf '%s' "<serialized>" | { command -v sha256sum >/dev/null && sha256sum || shasum -a 256; } | cut -c1-12
     ```
4. Porovnej se stored `api_hash` ve frontmatter:
   - Pokud stejný → nic se nezměnilo, oznam uživateli „Dokumentace je aktuální" a skonči
   - Pokud jiný → pokračuj na aktualizaci
5. Aktualizuj sekce v `DESCRIPTION.md`:
   - „Co tady žije" — pokud přibyly/ubyly typy
   - „Veřejné API" — aktualizuj signatury
   - „Jak to používat" — pokud se změnilo API, zkontroluj, že příklad stále funguje
6. Aktualizuj frontmatter:
   - `api_hash: <nový-hash>`
   - `last_updated: <YYYY-MM-DD>`
7. **Nedotýkej se jiných sekcí**, pokud je uživatel ručně přidal (ADR odkazy, návrhové úvahy)

### 3. Zkontroluj rodičovské `MODULES.md`

Zjisti, jestli `<path>/../MODULES.md` existuje. Pokud ano:
- Ověř, že `<path>` (jako poslední segment = namespace/package name) je v tabulce
- Pokud chybí → přidej s jednořádkovým popisem
- Pokud je, ale popis neodpovídá realitě → aktualizuj (pozor: žádný changelog)

### 4. Zkontroluj `docs/modules/<X>/README.md`

Najdi odpovídající modul v `docs/modules/`:
- Mapuj `src/Billing/Invoicing` → `docs/modules/billing/modules/invoicing/README.md` (konvence lowercase, dělič `/`)
- Pokud neexistuje a projekt je velký (má víc než ~3 moduly): nabídni uživateli vytvoření. Pokud je malý, možná není potřeba.
- Pokud existuje: aktualizuj **konceptuální** popis (jen pokud se změnil core použití nebo integrace), ne seznam tříd (to je v `DESCRIPTION.md`).

### 5. Kontrola změn AGENTS.md / CLAUDE.md

Command `/doc-update` **neupravuje** `CLAUDE.md` ani `AGENTS.md`. Pokud na základě skenu zjistíš, že se přidala nová platforma (třeba Cursor) nebo nová konvence, reportuj to uživateli s doporučením, že by to chtělo probrat ručně.

## Output format

```
✓ /doc-update <path>

Upravené soubory:
- src/Billing/Invoicing/DESCRIPTION.md (api_hash: a7f3c9 → b2e8f1)
- src/Billing/MODULES.md (aktualizován popis Invoicing)
- docs/modules/billing/modules/invoicing/README.md (drobný update integrace)

Změny:
+ Přidané veřejné API: InvoiceGenerator.CreateAsync(InvoiceRequest, CancellationToken)
- Odstraněné veřejné API: InvoiceGenerator.Create(InvoiceRequest)
~ Změněné signatury: InvoiceRepository.Save — přidán parameter idempotencyKey

api_hash drift: ano (b2e8f1 vs starý a7f3c9)
Poslední update: 2026-04-22

⚠ Upozornění:
- Modul src/Billing/Invoicing/Taxes/VatCalculator.cs nemá XML doc comments.
  Doporučuji dopsat — bez toho DESCRIPTION.md popisuje jen signatury, chybí "proč".
```

## Edge cases

### `<path>` neexistuje nebo není adresář

Chyba, navrhni uživateli správnou cestu:
```
Cesta `<path>` neexistuje. Mysleli jste jedno z:
- src/Billing/Invoicing
- src/Billing/Payments
```

### Repo nemá docs-plugin strukturu

Varování:
```
Tento repozitář zatím nemá docs-plugin. Pro inicializaci pusťte: /docs-init
Pokud chcete jen vygenerovat DESCRIPTION.md bez zbytku substrate, potvrďte.
```

### Žádné změny v kódu

Pokud `api_hash` sedí a žádná sekce `DESCRIPTION.md` není out-of-date:
```
✓ Dokumentace pro src/Billing/Invoicing je aktuální (api_hash: a7f3c9).
Žádné úpravy nebyly potřeba.
```

### Rozsáhlé změny (>50% kódu se změnilo)

Doporuč `/doc-revise`:
```
Zdrojáky v src/Billing/Invoicing se výrazně změnily (přes 50 % veřejného API je jiné).
Inkrementální update by generoval nekonzistentní dokumentaci.
Doporučuji pustit: /doc-revise src/Billing/Invoicing
```

### Žádné veřejné API

Pokud složka nemá nic public/exported (čistě interní):
```
Adresář src/Internal/Helpers obsahuje jen interní symboly (žádné public/export).
DESCRIPTION.md pro tenhle adresář nemá velkou hodnotu. Přeskakuji.
Pokud chcete vygenerovat i pro interní moduly, přidejte --include-internal.
```

## Důležité

- **NIKDY nepiš changelog** do `DESCRIPTION.md`, `MODULES.md` ani `docs/modules/<X>/README.md`. To je hard rule — viz `references/antipatterny.md` v skillu.
- **Nepiš commit messages ani PR description.** Tento command upravuje jen dokumentaci, git operace řeší uživatel.
- **Neupravuj zdrojáky.** Pokud zjistíš, že kód je nedokumentovaný (chybí XML docs / docstrings), jen to reportuj.
