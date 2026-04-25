---
type: description
module: src/Billing/Invoicing
status: active
api_hash: a7f3c9d2e5b8
last_updated: 2026-04-22
---

# Billing.Invoicing

> **Toto je ukázkový soubor** demonstrující formát `DESCRIPTION.md` v docs-plugin projektu. Smaž ho nebo nahraď reálným obsahem, jakmile máš první modul.

Generování a správa faktur. Modul poskytuje `InvoiceGenerator` pro vytváření faktur, `IInvoiceRepository` pro persistenci a `InvoiceWorker` pro asynchronní zpracování `InvoiceRequested` událostí.

## Co tady žije

- `InvoiceGenerator` — hlavní vstupní bod, vytváří faktury s garantovanou idempotencí
- `IInvoiceRepository` — persistence layer (aktuální implementace: `SqlInvoiceRepository` v `Billing.Invoicing.Sql`)
- `InvoiceWorker` — background service, konzumuje `InvoiceRequested` události z message broker
- `Invoice` — doménový model (record)
- `InvoiceRequest` — DTO pro vstup
- `IdempotencyKey` — hodnotový typ pro idempotency keys

## Veřejné API

### `InvoiceGenerator.CreateAsync(InvoiceRequest request, CancellationToken ct) -> Task<Invoice>`

Asynchronně vytvoří fakturu podle `request`. Garantuje idempotenci přes `request.IdempotencyKey` — opakované volání se stejným klíčem vrátí již existující fakturu, nevytvoří duplikát.

**Výjimky:**
- `InvalidInvoiceRequestException` — request nesplňuje validační pravidla
- `InvoiceNotFoundException` — idempotency key existuje, ale faktura se nepodařila načíst (indikuje DB inkonzistenci)

### `IInvoiceRepository.SaveAsync(Invoice invoice, IdempotencyKey key, CancellationToken ct) -> Task`

Uloží fakturu a spáruje ji s idempotency klíčem v jedné transakci.

### `IInvoiceRepository.FindByKeyAsync(IdempotencyKey key, CancellationToken ct) -> Task<Invoice?>`

Najde fakturu podle idempotency klíče. Vrací `null`, pokud klíč neexistuje.

## Jak to používat

```csharp
// Registrace v DI
services.AddScoped<InvoiceGenerator>();
services.AddScoped<IInvoiceRepository, SqlInvoiceRepository>();

// Volání
var generator = serviceProvider.GetRequiredService<InvoiceGenerator>();
var invoice = await generator.CreateAsync(new InvoiceRequest
{
    CustomerId = "CUST-001",
    Items = [new InvoiceItem("SKU-42", 2, 99.00m)],
    IdempotencyKey = IdempotencyKey.New(),
}, ct);
```

## Integrace

- **Publikuje:** `InvoiceCreated` event na `billing.invoices` exchange
- **Konzumuje:** `InvoiceRequested` event z `billing.requests` exchange (přes `InvoiceWorker`)
- **Používá:** `Billing.Taxes.VatCalculator` pro výpočet DPH
- **Používá:** `Billing.Customers.ICustomerRepository` pro ověření zákazníka

## Související

- **Konceptuální popis modulu:** `docs/modules/billing/modules/invoicing/README.md`
- **Architektura modulu:** `docs/modules/billing/modules/invoicing/architecture/`
- **Idempotence pattern:** ADR-014 (`docs/architecture/decisions/ADR-014-idempotent-invoice-generation.md`)
- **Event flow:** ADR-018 (`docs/architecture/decisions/ADR-018-event-driven-invoicing.md`)
