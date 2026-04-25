# Pravidla aktualizace dokumentace

Kdo co aktualizuje, kdy se to děje, jak se počítá `api_hash`.

## Životní cyklus dokumentace — matice

| Soubor | Kdo píše první verzi | Kdo aktualizuje | Kdy se aktualizuje |
|---|---|---|---|
| `DESCRIPTION.md` (u kódu) | Agent při přidání nového modulu | Agent po změně veřejného API | Při každé změně, která posouvá `api_hash` |
| `MODULES.md` (assembly) | Agent při přidání nového top-level modulu | Agent | Při přidání / přejmenování submodulu |
| `docs/modules/<X>/README.md` | Agent při založení modulu | Agent po podstatných architektonických změnách | Při mergi epiku/tasku, který modul mění |
| `docs/architecture/*` | Architekt / agent s reviewem | Architekt / agent s reviewem | Při architektonických změnách (ADR) |
| `docs/reference/*` | Analytik / agent | Agent po změně chování | Při změně business chování |
| `docs/architecture/decisions/ADR-*.md` | Kdo rozhodoval | Nikdy (nové rozhodnutí = nové ADR) | Jen změna statusu (superseded) |
| `tasks/<EPIC>/README.md` | PM / analytik | PM / analytik | Při změně scope epiku |
| `tasks/<EPIC>/spec/*` | Analytik | Analytik | Před startem implementace |
| `tasks/<EPIC>/<TASK>/assignment.md` | PM / analytik | Málokdy — po změně zadání | Při změně zadání |
| `tasks/<EPIC>/<TASK>/plan.md` | Agent, review vývojář | Agent při pivotu | Při změně plánu |
| `tasks/<EPIC>/<TASK>/changelog.md` | Agent během implementace | Agent | Průběžně, během implementace |

## Cadence

### Per-task cadence (doporučená)

1. **Založení tasku:** vytvoř `tasks/<EPIC>/<TASK>/` se skeletem (`assignment.md`, `plan.md`, `changelog.md`)
2. **Start implementace:** `plan.md` se vyplní (agent navrhne, vývojář připomínkuje)
3. **Během implementace:** `changelog.md` se průběžně doplňuje
4. **Před mergem:** pusť `/doc-update` na dotčené adresáře → aktualizuje `DESCRIPTION.md`, `MODULES.md`, relevantní `docs/modules/<X>/`
5. **Merge:** `changelog.md` se uzavře (status → done), relevantní AS IS změny v `docs/` jsou součástí commitu

### Automatizační hooky (doporučené, ne povinné)

**Pre-commit hook** (per developer machine):
```bash
#!/usr/bin/env bash
# .git/hooks/pre-commit
# Spustí /doc-update na všechny staged soubory v src/
changed=$(git diff --cached --name-only --diff-filter=ACM | grep '^src/' | xargs -I{} dirname {} | sort -u)
if [ -n "$changed" ]; then
  for dir in $changed; do
    # Pozn.: Na Hostingeru nebo serverech bez interaktivního agenta
    # tohle nahraď voláním do claude-cli nebo jiného CLI nástroje.
    claude code --non-interactive --command "/doc-update $dir"
  done
fi
```

**CI check:**
- Každý PR musí mít aktualizovaný `api_hash` v `DESCRIPTION.md`, pokud se kód v dané složce změnil
- Linter: `DESCRIPTION.md` nesmí obsahovat `Changed`, `Previously`, `Was ... now` (changelog-drift antipattern)

## Výpočet `api_hash`

`api_hash` je hash **veřejného API** daného modulu. Cíl: detekovat, že je dokumentace zastaralá proti kódu.

### Co se do hashe zahrnuje

- Veřejné typy (třídy, struktury, enumy, interface, type aliasy)
- Signatury veřejných metod/funkcí (názvy + typy parametrů + return type)
- Veřejná pole / properties (název + typ)
- Veřejné exporty modulu

### Co se NEzahrnuje

- Těla metod (implementační detaily)
- Komentáře v kódu
- Interní / private / non-exported symboly
- Whitespace, pořadí metod

### Jazykové implementace (návrh)

**TypeScript / JavaScript:**
```typescript
// Získej AST, vyfiltruj exports, serializuj signatury, hash
// Knihovna: ts-morph nebo @typescript-eslint/parser
```

**Python:**
```python
import ast
# Projdi modul, vyfiltruj podle __all__ (nebo veřejné symboly = bez podtržítka),
# serializuj signatury, hash přes hashlib.sha256
```

**C#:**
```csharp
// Přes Roslyn API: CSharpSyntaxTree.ParseText(...)
// Vyfiltruj public members, serializuj, hash
```

**Rust:**
```rust
// cargo rustc -- -Zunpretty=normal + grep 'pub '
// nebo syn crate na AST
```

Délka hashe: prvních 12 hex znaků z SHA-256 stačí (kolize v rámci jednoho modulu extrémně nepravděpodobná).

### Detekce „kód změněn, docs ne"

```
current_hash = compute_api_hash(src/Billing/Invoicing)
stored_hash = read_frontmatter(src/Billing/Invoicing/DESCRIPTION.md).api_hash

if current_hash != stored_hash:
    # docs jsou zastaralé → /doc-update by měl doběhnout
    return STALE
```

## Kdy použít `/doc-update` vs `/doc-revise`

| Situace | Command |
|---|---|
| Menší změna kódu, dokumentace je z větší části aktuální | `/doc-update <path>` |
| Refaktor, který přejmenoval většinu symbolů | `/doc-revise <path>` |
| Kompletní přepis modulu | `/doc-revise <path>` |
| Přidání nového veřejného API | `/doc-update <path>` |
| Změna architektonického přístupu (DI → event-driven) | `/doc-revise <path>` |
| Po dlouhém období bez aktualizací (>3 měsíce) | `/doc-revise <path>` |

**`/doc-update`:** inkrementální, zachovává existující strukturu, dopíše/opraví rozdíly.

**`/doc-revise`:** zahodí starou dokumentaci, vygeneruje novou ze zdroje. Pozor — ztratí ručně napsané ADR odkazy a úvahy, které agent ze zdroje neodvodí. Použij, až když je dokumentace opravdu zastaralá, ne rutinně.

## Migrace mezi AS IS a TO BE

Po dokončení tasku (merge):

1. **`changelog.md`** ukončíš (status → done, finished date)
2. **Relevantní AS IS změny** promítneš do `docs/`:
   - `/doc-update <changed-paths>` → automatická aktualizace `DESCRIPTION.md`, `docs/modules/<X>/README.md`
   - Architektonické změny → ručně do `docs/architecture/` (nebo nové ADR)
3. **`plan.md` a `assignment.md`** zůstanou v `tasks/<EPIC>/<TASK>/` jako historie — nikdy je nepřepisuj zpětně

Důvod, proč `tasks/` zůstává: při audit / PCI compliance je potřeba doložit řetězec ticket → rozhodnutí → changeset.
