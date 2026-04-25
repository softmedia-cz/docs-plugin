---
type: task-changelog
epic: <EPIC-KEY>
task: <TASK-KEY>
status: in-progress
---

# Changelog: <Task Title>

Co bylo skutečně provedeno při implementaci tohoto tasku. Aktualizuj průběžně, ne až nakonec.

> **Poznámka:** Toto je **jediné** místo v repu, kam patří historie změn (kromě git logu). `docs/` a `DESCRIPTION.md` popisují jen aktuální stav.

## Změněné soubory

<!-- Průběžně doplňuj, co jsi v tomto tasku reálně upravil. -->

<!--
- `src/Billing/Invoicing/InvoiceGenerator.cs` — refactor na async, přidán idempotencyKey
- `src/Billing/Invoicing/IInvoiceRepository.cs` — nový method Save(invoice, idempotencyKey)
- `src/Billing/Invoicing/DESCRIPTION.md` — aktualizováno pro nové API
- `tests/Billing.Invoicing.Tests/InvoiceGeneratorTests.cs` — přidáno 5 nových test cases
- `docs/modules/billing/modules/invoicing/README.md` — drobný update event flow
-->

## Odchylky od plánu

<!--
Pokud ses během implementace odklonil od původního plánu, zaznamenej tady.
Co jsi zjistil, proč jsi změnil přístup, jaký to má dopad.

Příklad:
- Plán počítal s ukládáním idempotency key přímo v tabulce Invoices, ale to by vyžadovalo schema migraci.
  Místo toho je key uložen v samostatné tabulce IdempotencyKeys s FK na Invoice.
  Důvod: vyhnout se breaking migrace, umožnit snazší cleanup starých klíčů.
-->

## Nová / odstraněná rozhodnutí

<!--
Pokud během tasku padlo architektonické rozhodnutí, které má dopad napříč modulem/systémem, 
zvaž ADR. Pokud je to rozhodnutí jen pro tento task, popiš tady.
-->

## Testování

<!--
Co bylo otestováno a jak:
- Unit testy: ano/ne, coverage
- Integration testy: ano/ne, co pokrývají
- Manuální testy: popis scénářů
-->

## Follow-up

<!--
Co zůstalo na další tasky / epiky. Neposílat jako undone work do main, ale zaznamenat.

Příklad:
- Existující volání `InvoiceGenerator.Create` (synchronní) v `src/Legacy/` jsou zatím ponechána.
  Migrace legacy modulu → samostatný task CF-145.
-->

## Odkazy

- Zadání: [assignment.md](assignment.md)
- Plán: [plan.md](plan.md)
- PR: <!-- URL -->
- Commits: <!-- range nebo seznam -->
