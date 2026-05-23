# ReadTheDocs — MCP server

Dává Claude Code (a jakémukoliv MCP klientovi) nástroj, kterým čte docs-plugin dokumentaci jako **agregované balíčky** podle konvence — místo aby agent ručně globoval a četl soubor po souboru. Realizace „konvence + nástroj" z přednášky (slide 7).

## Vlastnosti

- **Bez závislostí** — čistý Node, tenká implementace MCP stdio JSON-RPC. Claude Code nespouští `npm install` na pluginech, takže server běží jak je (`node index.js`). Žádný build, žádné `node_modules`.
- **Read-only** — nikdy nic nezapíše.
- **Confined** — čte výhradně z `CLAUDE_PROJECT_DIR` (workspace uživatele); cesty ven (`../`) jsou odmítnuty.
- **Deterministický** — žádné LLM volání uvnitř serveru.

## Nástroje

| Tool | Parametry | Co vrátí |
|---|---|---|
| `docs_for_code` | `forCode: <path>` | `DESCRIPTION.md` té složky + nejbližší `MODULES.md` nad ní + odpovídající `docs/modules/<X>/{README,architecture,reference}` |
| `docs_topic` | `topic: architecture\|reference`, `module?` | architektonická/referenční dokumentace modulu (nebo systému). ADR vynechává — ty má `docs_adr` |
| `docs_concept` | `concept: <query>` | fulltext napříč `docs/` a všemi `DESCRIPTION.md`, s úryvky řádků |
| `docs_adr` | `adr?: list\|full`, `topics?: [tag]` | seznam (nebo plné texty) ADR z `docs/architecture/decisions/`, filtrovatelné podle tagů |

## Mapování cest

`docs_for_code` mapuje source cestu na docs konvenci:

```
src/Billing/Invoicing
  → src/Billing/Invoicing/DESCRIPTION.md          (přímo)
  → src/Billing/MODULES.md                        (nejbližší nahoru)
  → docs/modules/billing/modules/invoicing/...     (lowercase, rekurzivní)
```

Vedoucí source root (`src`, `app`, `lib`, `packages`, `crates`, `internal`, `cmd`, `pkg`) se odstřihne; zbytek se lowercasuje a zanořuje přes `modules/`.

## Instalace

Server se **registruje automaticky** přes `.mcp.json` v rootu pluginu, jakmile je docs-plugin nainstalovaný v Claude Code. Žádná ruční konfigurace.

### Standalone (mimo plugin / pro jiné MCP klienty)

```json
{
  "mcpServers": {
    "readthedocs": {
      "type": "stdio",
      "command": "node",
      "args": ["/cesta/k/docs-plugin/mcp/readthedocs/index.js"],
      "env": { "CLAUDE_PROJECT_DIR": "/cesta/k/tvému/repu" }
    }
  }
}
```

Pokud `CLAUDE_PROJECT_DIR` není nastaveno, server použije `process.cwd()`.

## Test

Server lze otestovat ručně přes JSON-RPC na stdin:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | CLAUDE_PROJECT_DIR=/tvuj/repo node index.js
```

## Hranice (v0.3)

- Bez cache — skenuje filesystem on-demand. Pro repo s tisíci soubory zvaž pre-index (roadmapa).
- `docs_concept` je substring match (case-insensitive), ne fuzzy/sémantické hledání.
- Frontmatter parser je jednoduchý (top-level `key: value`), nečte vnořené YAML struktury.
