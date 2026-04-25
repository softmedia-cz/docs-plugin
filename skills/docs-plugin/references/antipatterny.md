# Antipatterny

Konkrétní věci, kterým se v docs-plugin musíš vyhnout — i když tě k nim model nebo uživatel bude tlačit. Pro každý antipattern je vysvětlení proč a co dělat místo toho.

## 1. Changelog-drift

### Co to je

Psaní `docs/` jako deníčku:

> ❌ „The `InvoiceGenerator` class **was originally** using a singleton pattern, but **was later refactored** to use dependency injection. **Previously**, invoices **were generated** synchronously; **now** they use an event-driven approach."

### Proč je to špatně

- `docs/` má popisovat **aktuální stav**. Nikoho nezajímá, jak to bylo před dvěma roky.
- Zvětšuje se plocha textu → agent čte a spotřebovává kontext na irelevantní historii.
- Časem z toho je textová archeologie, která odrazuje čtenáře.
- Po čtyřech refaktorech je `docs/` neškočitelný horor typu „původně X, pak Y, pak Z, teď W".

### Co dělat místo toho

> ✅ „`InvoiceGenerator` is registered via DI (see `Program.cs`). Invoice generation runs asynchronously through an `InvoiceRequested` event handled by `InvoiceWorker` (see ADR-014)."

Historie změn patří do:
- **Git log** / PR description
- `tasks/<EPIC>/<TASK>/changelog.md` (co konkrétní task změnil)
- **ADR** (pokud to bylo architektonické rozhodnutí)

### Detekce

Slova, která v `docs/` signalizují changelog-drift:

- `previously`, `dříve`, `původně`
- `was ... now`, `byl ... teď je`
- `changed from X to Y`, `změněno z X na Y`
- `has been refactored`, `bylo refaktorováno`
- `no longer`, `už ne`

Pokud tato slova v `docs/` vidíš, je to signál k přepsání. (Pozn.: v ADR `superseded by` je v pořádku — ADR jsou historické záznamy ze své podstaty.)

## 2. Flat docs/ (entropická past)

### Co to je

Adresář `docs/` se stovkami `.md` souborů na jedné úrovni:

```
docs/
├── billing-api.md
├── billing-architecture.md
├── billing-invoicing.md
├── billing-invoicing-idempotence.md
├── billing-payments.md
├── auth.md
├── auth-oauth.md
├── auth-jwt.md
├── ... (× 200)
```

### Proč je to špatně

- Hledání „kde je popis X" je lineární průchod.
- Přejmenování modulu (billing → invoicing) vyžaduje masový rename.
- Agent musí číst file listing a guess-matchovat jména.
- Žádná informace o vztazích mezi dokumenty.

### Co dělat místo toho

Rekurzivní struktura:

```
docs/
└── modules/
    ├── billing/
    │   ├── README.md
    │   ├── architecture/
    │   ├── modules/
    │   │   ├── invoicing/
    │   │   │   ├── README.md
    │   │   │   └── architecture/
    │   │   └── payments/
    │   │       └── README.md
    │   └── reference/
    └── auth/
        ├── README.md
        ├── architecture/
        └── reference/
            ├── oauth.md
            └── jwt.md
```

Agent navigates by convention, ne lookup.

## 3. `@docs/...` odkazy v CLAUDE.md

### Co to je

```markdown
# CLAUDE.md

Pro architekturu viz @docs/architecture/system.md
Pro billing viz @docs/modules/billing/README.md
Pro invoicing @docs/modules/billing/modules/invoicing/architecture/README.md
Pro auth @docs/modules/auth/README.md
...
```

### Proč je to špatně

- Každý odkaz spotřebovává kontext agenta (i když ten soubor nepotřebuje).
- Při refaktoru dokumentace musíš updatovat CLAUDE.md.
- Neškáluje — u 200 modulů je CLAUDE.md nečitelný.
- Agent čte CLAUDE.md při každém spuštění — zbytečně velký baseline.

### Co dělat místo toho

Konvence + nástroj:

```markdown
# CLAUDE.md

## Dokumentace

Repozitář používá [docs-plugin](https://github.com/softmedia/docs-plugin).

- **AS IS** (aktuální stav): `docs/` — rekurzivní struktura s `modules/<X>/README.md`
- **TO BE** (plánované změny): `tasks/<EPIC>/<TASK>/` — standardně NEČTI, jen na vyžádání
- **U kódu:** každá složka se zdrojáky má `DESCRIPTION.md`

Pro hledání v docs používej MCP server `ReadTheDocs` (pokud je dostupný), jinak hledej podle konvence.
```

Agent ví, kam se podívat, protože zná konvenci. Konkrétní cestu si najde on (přes Glob, Grep, ReadTheDocs MCP).

## 4. Mixování AS IS a TO BE v jednom souboru

### Co to je

```markdown
# docs/modules/billing/README.md

## Aktuální stav

Billing module generuje faktury přes `InvoiceGenerator`.

## Plánované změny (Q2 2026)

Přecházíme na event-driven přístup — `InvoiceRequested` event...
```

### Proč je to špatně

- Po mergi epiku někdo zapomene přepsat „Aktuální stav" → dokumentace je z poloviny AS IS a z poloviny TO BE.
- Agent neví, co je realita a co plán — halucinuje.
- „Plánované změny" sekce stárnou a nikdo je nemaže.

### Co dělat místo toho

- `docs/modules/billing/README.md` → **pouze** aktuální stav.
- `tasks/CF-Q2-EVENT-DRIVEN/spec/` → plánovaná změna.
- Po mergi se plán promítne do AS IS, TO BE se archivuje v `tasks/`.

## 5. `tasks/` jako součást běžného kontextu

### Co to je

CLAUDE.md říká „vždycky se podívej do `tasks/` pro kontext tasků". Agent čte `tasks/` při každém dotazu.

### Proč je to špatně

- `tasks/` po roce práce má stovky tasků. Z velké části jsou už merged a nerelevantní.
- Kontext agenta se plní irelevantní historií plánů a changelogů.
- Plány z pradávných tasků mohou být v rozporu s aktuálním stavem kódu → halucinace.

### Co dělat místo toho

```markdown
# CLAUDE.md

## tasks/ je cold storage

Do `tasks/` čti jen když:
- Uživatel na konkrétní task explicitně odkáže (JIRA klíč, název)
- Pracuješ na aktivním tasku (a pak čti jen `tasks/<EPIC>/<TASK>/`)
- Uživatel požádá o rešerši historického rozhodování
```

## 6. Deníček v DESCRIPTION.md

Speciální varianta changelog-driftu pro DESCRIPTION.md:

### ❌ Špatně

```markdown
# DESCRIPTION.md

## Historie changesetů
- 2025-06-10: přidán `InvoiceWorker`
- 2025-07-20: refaktor `InvoiceGenerator` na DI
- 2025-08-01: přidán retry mechanismus
```

### ✅ Dobře

```markdown
# DESCRIPTION.md

## Co tady žije

- `InvoiceGenerator` — generuje faktury (registrovaný přes DI)
- `InvoiceWorker` — zpracovává `InvoiceRequested` eventy s retry logikou
- ...
```

Historie je v git logu. `DESCRIPTION.md` je snapshot.

## 7. Description.md delší než zdroják

Pokud `DESCRIPTION.md` má 800 řádků a zdrojáky ve stejné složce mají 500, něco je špatně.

### Detekce

`wc -l DESCRIPTION.md` > 0.5 × `wc -l *.cs *.py *.ts *.rs` v té složce → zvaž rozsekání.

### Co dělat

- Přesuň architektonickou část do `docs/modules/<X>/architecture/`
- Přesuň referenční popis chování do `docs/modules/<X>/reference/`
- V `DESCRIPTION.md` nech jen:
  - **Co tady žije** (seznam tříd/funkcí + 1 věta)
  - **Veřejné API** (signatury s popisem)
  - **Jak to používat** (krátký příklad)
  - **Odkazy** na architekturu/referenci v `docs/modules/`

Cíl: DESCRIPTION.md je navigace do kódu, ne vysvětlení světa.

## 8. Vlastní ticketovací klíče napříč projekty

Pokud máš tři projekty a v každém pojmenováváš taskové adresáře jinak (`T-100`, `TASK-100`, `CF-100`), traceability se rozpadne.

**Pravidlo:** klíč tasku = klíč v ticketovacím systému. Bez výjimky. Pokud ticketovací systém nemáš, zvol jednotnou konvenci napříč repem a piš ji do `tasks/README.md`.

## 9. Ruční udržování MODULES.md

`MODULES.md` (přehled namespaců v assembly) je auto-generovaný. Nikdy ho neupravuj ručně — při dalším `/doc-update` se přepíše.

Pokud chceš přidat kontextovou informaci k modulu, patří do `DESCRIPTION.md` v příslušné podsložce, ne do `MODULES.md`.

## 10. „Docs-substrate doesn't fit my project, I'll just skip it"

Druhá strana mince: někdy substrate aplikovat nedává smysl — typicky:

- Skript na 200 řádků bez modulů
- One-off data migration
- Throwaway experiment

Pro takové projekty **nenuť substrate**. Stačí `README.md` v rootu. Substrate je pro projekty, kde:
- Je víc než jeden modul
- Je víc než jeden vývojář (počítám i agenty)
- Očekáváš životnost > 3 měsíce
- Používáš agenty na implementaci

Signál, že substrate nepotřebuješ: pokud `/docs-init` vygeneruje 80 % prázdných souborů, projekt na to ještě není dost velký.
