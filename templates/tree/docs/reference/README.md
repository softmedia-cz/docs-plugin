---
type: reference
scope: system
status: draft
last_updated: "{{DATE}}"
---

# Funkční referenční popis

Tento adresář popisuje **funkční chování** systému — jak se co chová z pohledu uživatele / klienta API / integrátora. Odliš od:

- `../architecture/` → technický a strukturální popis („jak je to postavené")
- `../modules/<X>/reference/` → per-module detail

Tady patří:

- Systémově-úrovňové flow (authentication, authorization, session lifecycle)
- Cross-cutting koncepty (idempotence, retry policy, rate limiting)
- Business pravidla, která přesahují jeden modul
- Referenční tabulky (error codes, status codes, typové mapování)

## Struktura

<!--
- `auth.md` — authentication a authorization flow
- `errors.md` — seznam error codes a jejich významů
- `rate-limits.md` — rate limiting policy
- `idempotence.md` — jak systém řeší idempotenci
-->

## Pravidla pro soubory v tomto adresáři

- YAML frontmatter s `type: reference`, `scope: system` nebo `scope: module:<name>`
- Popisuj **aktuální chování**, ne historii
- Příklady jsou vítány (request/response, command examples)
- Odkazuj na architekturu (`../architecture/`) pro „proč"
