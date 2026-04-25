Kompletně přepiš docs-plugin dokumentaci pro zadaný adresář. **Destruktivní operace** — zahodí starý obsah `DESCRIPTION.md` a vygeneruje nový od nuly. Cesta je posledním argumentem promptu.

## Kdy použít

- Refaktor přejmenoval/změnil většinu veřejného API
- Dlouhé období bez údržby (>3 měsíce)
- Změna architektonického přístupu
- První generace pro legacy kód bez `DESCRIPTION.md`

Pro menší změny použij `doc-update`, ne tohle.

## Kroky

1. Ověř docs-plugin strukturu.

2. **Backup** existujícího `DESCRIPTION.md`:
   ```bash
   mkdir -p .doc-revise-backup/<path>
   cp <path>/DESCRIPTION.md .doc-revise-backup/<path>/DESCRIPTION.md.$(date +%Y%m%d-%H%M%S)
   ```
   Pokud `.doc-revise-backup/` ještě není v `.gitignore`, přidej.

3. Skenuj zdrojáky v `<path>` — veřejné typy/funkce/exporty + signatury + doc comments.

4. Spočítej `api_hash`:
   ```bash
   printf '%s' "<serialized>" | { command -v sha256sum >/dev/null && sha256sum || shasum -a 256; } | cut -c1-12
   ```

5. Vygeneruj **nový** `<path>/DESCRIPTION.md` od nuly podle šablony:

   ```markdown
   ---
   type: description
   module: <relativní cesta od rootu repa>
   status: active
   api_hash: <nový hash>
   last_updated: <YYYY-MM-DD>
   ---

   # <Název modulu>

   <Jeden odstavec: co modul dělá, jeho role v systému.>

   ## Co tady žije

   - `<Type1>` — <jednořádkový popis>
   - `<Type2>` — <jednořádkový popis>

   ## Veřejné API

   ### `<funkce/metoda>(args) -> return`

   <Co dělá, vstupy, výstupy, výjimky.>

   ## Jak to používat

   ```<lang>
   <minimální příklad>
   ```

   ## Integrace

   <Co publikuje, co konzumuje.>

   ## Související

   - Architektura: `docs/modules/<X>/architecture/`
   - Reference: `docs/modules/<X>/reference/`
   - <ADR odkazy, pokud byly v původním souboru a `--keep-adr-links>`
   ```

6. Stejně regeneruj `<path>/../MODULES.md` (pokud existuje) a `docs/modules/<X>/README.md` (pokud existuje).

7. **Reportuj ztráty** — co bylo ve starém souboru a do nového se nedostalo:
   - Sekce „Design notes" / „Rationale" (nelze odvodit ze zdrojáků)
   - User-added příklady, „Advanced usage", „Troubleshooting"
   - Komentáře k deprecation
   - ADR odkazy (pokud `--keep-adr-links` nebyl, jinak zachovány)

   Doporuč uživateli projít backup a buď přenést věci zpátky, nebo je převést do `docs/architecture/decisions/` (ADR) či `docs/modules/<X>/reference/`.

## Hard rules

- **Žádný changelog v novém obsahu.** I když starý měl sekci „Changed in v2.0", nový ji nemá.
- **Vždy backup.** Nikdy nepřepiš bez kopie.
- **Reportuj ztráty.** Nemlč o tom, co se ze starého souboru ztratilo — uživatel to potřebuje k rozhodnutí, jestli něco zachránit.
- **Neupravuj zdrojáky.** Jen `.md` soubory.
- **Nedělej revize automaticky v pre-commit hooku.** Vyžaduje lidský review.

## Výstup

```
✓ doc-revise <path>

Přepsané:
- <path>/DESCRIPTION.md (kompletní regenerace)
- <path>/../MODULES.md (řádek pro <X>)
- docs/modules/<X>/README.md

Backup:
- .doc-revise-backup/<path>/DESCRIPTION.md.<timestamp>

api_hash: <starý> → <nový>

⚠ Ztraceno:
- Sekce „Design rationale" (3 odstavce) — nelze odvodit z kódu
- User-added „Troubleshooting" (5 položek)
- ADR odkazy: <zachovány | NEZACHOVÁNY>

Doporučení:
1. Projdi backup a zvaž přenést design rationale do nového ADR.
2. „Troubleshooting" buď přenes zpět, nebo přesuň do docs/modules/<X>/reference/.
```
