Inkrementálně aktualizuj docs-plugin dokumentaci pro zadaný adresář. Cesta je posledním argumentem promptu.

## Kroky

1. Ověř, že repo má docs-plugin strukturu (`docs/`, `tasks/`, `CLAUDE.md` nebo `AGENTS.md` zmiňující docs-plugin). Pokud ne, doporuč inicializaci a skonči.

2. Načti existující `<path>/DESCRIPTION.md`, pokud existuje. Vytáhni z frontmatteru `api_hash`.

3. Skenuj zdrojáky v `<path>`:
   - **C#:** `public` typy/metody/properties
   - **TypeScript/JavaScript:** `export` symboly
   - **Python:** symboly v `__all__`, jinak top-level bez podtržítka
   - **Rust:** `pub` symboly
   - Z každého vytáhni signaturu + doc comment (XML docs / docstring / JSDoc / `///`)

4. Spočítej current `api_hash`:
   - Seřaď seznam veřejných symbolů abecedně
   - Serializuj (normalizovaný whitespace)
   - SHA-256 prvních 12 hex znaků:
     ```bash
     printf '%s' "<serialized>" | { command -v sha256sum >/dev/null && sha256sum || shasum -a 256; } | cut -c1-12
     ```

5. Porovnej se stored `api_hash`:
   - Stejný → dokumentace je aktuální, oznam to a skonči.
   - Jiný → pokračuj.

6. Aktualizuj `<path>/DESCRIPTION.md`:
   - Sekce „Co tady žije" — pokud přibyly/ubyly typy
   - Sekce „Veřejné API" — aktualizuj signatury podle reality
   - Sekce „Jak to používat" — pokud se změnilo API, zkontroluj příklad
   - Frontmatter: `api_hash: <nový>`, `last_updated: <YYYY-MM-DD>`
   - Ručně přidané sekce uživatelem (ADR odkazy, design notes) **zachovej**.

7. Zkontroluj `<path>/../MODULES.md` (pokud existuje):
   - Je `<path>` v tabulce? Pokud ne, přidej.
   - Aktuální popis odpovídá realitě? Pokud ne, aktualizuj.

8. Zkontroluj `docs/modules/<X>/README.md` (mapuj `src/Billing/Invoicing` → `docs/modules/billing/modules/invoicing/`):
   - Pokud existuje, aktualizuj **konceptuální** popis (ne seznam tříd).
   - Pokud neexistuje a projekt je velký, nabídni vytvoření.

## Hard rules (nikdy neporušuj)

- **Žádný changelog v docs/, DESCRIPTION.md, MODULES.md.** Žádné věty „was changed", „previously", „was X, now Y", „has been refactored". Popisuj jen aktuální stav. Pokud cítíš nutkání takovou větu napsat, přepiš ji.
- **Neupravuj zdrojáky.** Jen `.md` soubory.
- **Nepiš commit messages ani PR description.** Git operace řeší uživatel.
- **`MODULES.md` aktualizuj jen tabulku** — žádné prózy o změnách.

## Výstup

Stručný report:

```
✓ doc-update <path>

Upravené soubory:
- <path>/DESCRIPTION.md (api_hash: a7f3c9 → b2e8f1)
- <path>/../MODULES.md (řádek pro <X> aktualizován)
- docs/modules/<X>/README.md

Změny:
+ Přidané API: ...
- Odstraněné API: ...
~ Změněné signatury: ...

Upozornění (pokud jsou):
- <path>/Foo.cs nemá doc comments — DESCRIPTION.md popisuje jen signatury.
```

Pokud používáš pravidelně, zvaž doplnění aliasu do shellu:

```bash
alias doc-update='codex "$(cat .codex/prompts/doc-update.md) $1"'
```
