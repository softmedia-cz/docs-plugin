---
type: adr-index
status: active
last_updated: "{{DATE}}"
---

# Architecture Decision Records

Architektonická rozhodnutí jsou v tomto adresáři jako `ADR-NNN-slug.md`. Každé ADR je **imutabilní** — pokud je rozhodnutí revidováno, vzniká nové ADR a staré dostane `status: superseded` s odkazem `superseded_by`.

## Kdy založit ADR

Pokud rozhodnutí:
- Je těžko reverzibilní (náklady na zvrat > 1 týden práce)
- Ovlivňuje víc než jeden modul
- Má alternativy, mezi kterými se dal rozumně volit
- Souvisí s architektonickým přístupem (DI vs service locator, sync vs async, monolith vs microservice, ...)

→ **udělej ADR**.

Pokud je to jen „kosmetická" volba (pojmenování, formátovací konvence) → do `CONTRIBUTING.md` nebo `docs/reference/`, ne jako ADR.

## Šablona

Zkopíruj `template.md` na `ADR-NNN-slug.md`, kde NNN je další volné číslo (zero-padded, např. 014).

## Index

<!--
Aktualizuj po každém novém ADR.

| # | Title | Status | Date |
|---|---|---|---|
| [ADR-001](ADR-001-use-docs-plugin.md) | Use docs-plugin for documentation | accepted | {{DATE}} |
-->
