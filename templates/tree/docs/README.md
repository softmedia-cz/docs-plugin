---
type: docs-readme
status: active
last_updated: "{{DATE}}"
---

# Dokumentace projektu {{PROJECT_NAME}}

Tento adresář obsahuje **AS IS dokumentaci** — popis aktuálního stavu systému. Plánované změny, specifikace rozpracovaných tasků a rozhodovací historie jsou v `../tasks/`.

## Struktura

- **`architecture/`** — systémová architektura, klíčová rozhodnutí (ADR v `architecture/decisions/`)
- **`reference/`** — funkční referenční popis chování systému
- **`modules/`** — per-module dokumentace (vytvoří se, jakmile projekt naroste do modulární struktury)

## Konvence

- Žádný changelog v tomto adresáři. Vše popisuje **aktuální stav**.
- Rekurzivní struktura: `modules/<X>/` má stejnou strukturu jako tento root (`README.md`, `architecture/`, `reference/`, `modules/`).
- YAML frontmatter v každém souboru.

## Kam hledat

| Otázka | Kam |
|---|---|
| „Jak je systém postavený?" | `architecture/README.md` |
| „Proč jsme zvolili X?" | `architecture/decisions/ADR-*.md` |
| „Jak se chová fakturace?" | `reference/` nebo `modules/billing/reference/` |
| „Co dělá tenhle kód?" | `DESCRIPTION.md` vedle kódu (ne tady) |
| „Na čem teď někdo pracuje?" | `../tasks/` (cold storage — čti jen na vyžádání) |
