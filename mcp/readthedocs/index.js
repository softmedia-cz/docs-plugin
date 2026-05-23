#!/usr/bin/env node
"use strict";

/**
 * ReadTheDocs — MCP server pro docs-plugin.
 *
 * Dává Claude Code nástroj, kterým čte strukturovanou dokumentaci podle
 * docs-plugin konvence (docs/, DESCRIPTION.md, MODULES.md, ADR) jako
 * agregované balíčky — místo aby agent ručně globoval a četl soubor po
 * souboru. Viz slide 7 přednášky (topic / forCode / concept / adr).
 *
 * Záměrně BEZ ZÁVISLOSTÍ — čistý Node, tenká implementace MCP stdio
 * JSON-RPC. Claude Code nespouští `npm install` na pluginech, takže
 * server musí běžet jak je (`node index.js`).
 *
 * Read-only. Čte výhradně z CLAUDE_PROJECT_DIR (workspace uživatele),
 * cesty jsou confined dovnitř (žádné ../ ven).
 */

const fs = require("fs");
const path = require("path");

const SERVER_NAME = "readthedocs";
const SERVER_VERSION = "0.1.0";
const DEFAULT_PROTOCOL = "2025-06-18";

// Kořen workspace uživatele. CC ho předává v env; fallback na cwd.
const PROJECT_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Adresáře, které při hledání ignorujeme.
const BLACKLIST = new Set([
  "node_modules", "dist", "build", "out", "target", ".next", ".nuxt",
  "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
  "vendor", ".venv", "venv", "env", "bin", "obj", ".git", ".vs",
  ".idea", ".vscode", "coverage", ".docs-revise-backup", ".doc-update-cache",
]);

// ---------------------------------------------------------------------------
// Bezpečné cesty — vše musí zůstat uvnitř PROJECT_DIR.
// ---------------------------------------------------------------------------

function safeResolve(rel) {
  const abs = path.resolve(PROJECT_DIR, rel || ".");
  if (abs !== PROJECT_DIR && !abs.startsWith(PROJECT_DIR + path.sep)) {
    throw new Error(`Cesta '${rel}' míří mimo workspace.`);
  }
  return abs;
}

function exists(abs) {
  try { fs.accessSync(abs); return true; } catch { return false; }
}

function readIfExists(abs) {
  try { return fs.readFileSync(abs, "utf8"); } catch { return null; }
}

function relTo(abs) {
  return path.relative(PROJECT_DIR, abs) || ".";
}

/** Rekurzivně sesbírej soubory pod dir (s blacklist prune). */
function walk(dir, opts = {}) {
  const { maxDepth = 12, filter = () => true } = opts;
  const out = [];
  function rec(d, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".") {
        if (BLACKLIST.has(e.name)) continue;
      }
      if (BLACKLIST.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) rec(full, depth + 1);
      else if (e.isFile() && filter(full)) out.push(full);
    }
  }
  rec(dir, 0);
  return out;
}

/** Naparsuj YAML frontmatter (jednoduchý — jen top-level key: value). */
function parseFrontmatter(text) {
  if (!text || !text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const fm = text.slice(3, end);
  const out = {};
  for (const line of fm.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Use-case 1: forCode — dokumentace k cestě se zdrojáky.
// ---------------------------------------------------------------------------

function docsForCode(args) {
  const rel = String(args.forCode || args.path || "").trim();
  if (!rel) return errText("Chybí parametr 'forCode' (cesta k adresáři se zdrojáky).");
  const dir = safeResolve(rel);
  if (!exists(dir)) return errText(`Cesta '${rel}' v tomto repu neexistuje.`);

  const parts = [];

  // 1) DESCRIPTION.md přímo ve složce
  const desc = path.join(dir, "DESCRIPTION.md");
  const descText = readIfExists(desc);
  if (descText) parts.push(section(relTo(desc), descText));

  // 2) Nejbližší MODULES.md směrem nahoru (root assembly/balíčku)
  let cur = dir;
  for (let i = 0; i < 8; i++) {
    if (cur === PROJECT_DIR) break;
    const parent = path.dirname(cur);
    const mod = path.join(parent, "MODULES.md");
    const modText = readIfExists(mod);
    if (modText) { parts.push(section(relTo(mod), modText)); break; }
    cur = parent;
  }

  // 3) Odpovídající docs/modules/<x>/ (lowercase mapping)
  const moduleDocs = mapToDocsModules(rel);
  for (const md of moduleDocs) {
    const t = readIfExists(md);
    if (t) parts.push(section(relTo(md), t));
  }

  if (parts.length === 0) {
    return errText(`K '${rel}' jsem nenašel žádnou docs-plugin dokumentaci (DESCRIPTION.md, MODULES.md ani docs/modules/...). Repo asi není inicializované — spusť /docs-init nebo /doc-update ${rel}.`);
  }
  return okText(parts.join("\n\n"));
}

/** src/Billing/Invoicing → [docs/modules/billing/modules/invoicing/README.md, .../architecture/README.md] */
function mapToDocsModules(rel) {
  const segs = rel.split(/[\\/]+/).filter(Boolean);
  // odstřihni vedoucí source root (src, app, lib, packages, ...)
  const roots = new Set(["src", "app", "lib", "packages", "crates", "internal", "cmd", "pkg"]);
  let i = 0;
  if (roots.has(segs[0])) i = 1;
  const tail = segs.slice(i).map((s) => s.toLowerCase());
  if (tail.length === 0) return [];
  // docs/modules/<a>/modules/<b>/modules/<c>...
  let docPath = path.join(PROJECT_DIR, "docs", "modules");
  tail.forEach((seg, idx) => {
    docPath = idx === 0 ? path.join(docPath, seg) : path.join(docPath, "modules", seg);
  });
  return [
    path.join(docPath, "README.md"),
    path.join(docPath, "architecture", "README.md"),
    path.join(docPath, "reference", "README.md"),
  ];
}

// ---------------------------------------------------------------------------
// Use-case 2: topic — architektura/reference modulu nebo systému.
// ---------------------------------------------------------------------------

function docsTopic(args) {
  const topic = String(args.topic || "").trim().toLowerCase();
  const moduleName = String(args.module || "").trim().toLowerCase();
  if (!topic) return errText("Chybí parametr 'topic' (architecture | reference).");
  if (!["architecture", "reference"].includes(topic)) {
    return errText("'topic' musí být 'architecture' nebo 'reference'.");
  }

  const candidates = [];
  if (moduleName) {
    candidates.push(path.join(PROJECT_DIR, "docs", "modules", moduleName, topic));
  }
  candidates.push(path.join(PROJECT_DIR, "docs", topic));

  const parts = [];
  for (const base of candidates) {
    if (!exists(base)) continue;
    const files = walk(base, {
      // ADR (decisions/) má vlastní nástroj docs_adr — sem nepatří.
      filter: (f) => f.endsWith(".md") && !f.split(path.sep).includes("decisions"),
    });
    for (const f of files.sort()) {
      const t = readIfExists(f);
      if (t) parts.push(section(relTo(f), t));
    }
  }
  if (parts.length === 0) {
    const where = moduleName ? `modulu '${moduleName}'` : "systému";
    return errText(`Pro ${where} jsem nenašel žádné '${topic}' docs.`);
  }
  return okText(parts.join("\n\n"));
}

// ---------------------------------------------------------------------------
// Use-case 3: concept — fulltext napříč docs/.
// ---------------------------------------------------------------------------

function docsConcept(args) {
  const query = String(args.concept || args.query || "").trim();
  if (!query) return errText("Chybí parametr 'concept' (hledaný výraz).");
  const docsRoot = path.join(PROJECT_DIR, "docs");
  const searchRoots = [docsRoot];
  // DESCRIPTION.md u kódu taky prohledáme
  const descFiles = walk(PROJECT_DIR, { filter: (f) => path.basename(f) === "DESCRIPTION.md" });

  const files = [
    ...(exists(docsRoot) ? walk(docsRoot, { filter: (f) => f.endsWith(".md") }) : []),
    ...descFiles,
  ];

  const q = query.toLowerCase();
  const hits = [];
  for (const f of files) {
    const t = readIfExists(f);
    if (!t) continue;
    const lines = t.split("\n");
    const matched = [];
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q)) {
        matched.push(`  L${idx + 1}: ${line.trim().slice(0, 200)}`);
      }
    });
    if (matched.length) {
      hits.push(`### ${relTo(f)} (${matched.length} shod)\n${matched.slice(0, 8).join("\n")}`);
    }
  }
  if (hits.length === 0) {
    return errText(`Koncept '${query}' jsem v docs/ ani v DESCRIPTION.md nenašel.`);
  }
  return okText(`Výskyty '${query}' (${hits.length} souborů):\n\n${hits.join("\n\n")}`);
}

// ---------------------------------------------------------------------------
// Use-case 4: adr — list / filtr Architecture Decision Records.
// ---------------------------------------------------------------------------

function docsAdr(args) {
  const adrRoot = path.join(PROJECT_DIR, "docs", "architecture", "decisions");
  if (!exists(adrRoot)) return errText("V repu není docs/architecture/decisions/ (žádné ADR).");

  const tagFilter = []
    .concat(args.topics || args.tags || [])
    .map((t) => String(t).toLowerCase());
  const wantFull = args.adr && String(args.adr).toLowerCase() !== "list";

  const files = walk(adrRoot, { filter: (f) => /ADR-\d+.*\.md$/i.test(path.basename(f)) });
  const records = [];
  for (const f of files.sort()) {
    const t = readIfExists(f);
    if (!t) continue;
    const fm = parseFrontmatter(t);
    const tags = (fm.tags || "").replace(/[[\]]/g, "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (tagFilter.length && !tagFilter.some((tf) => tags.includes(tf))) continue;
    records.push({ file: relTo(f), fm, tags, body: t });
  }

  if (records.length === 0) {
    return errText(tagFilter.length ? `Žádné ADR s tagy [${tagFilter.join(", ")}].` : "Žádné ADR nenalezeny.");
  }

  if (wantFull) {
    return okText(records.map((r) => section(r.file, r.body)).join("\n\n"));
  }
  // list mode — přehled
  const rows = records.map((r) =>
    `- ${r.fm.adr ? `ADR-${r.fm.adr}` : path.basename(r.file)}: ${r.fm.title || "(bez titulku)"} ` +
    `[${r.fm.status || "?"}]${r.tags.length ? ` {${r.tags.join(", ")}}` : ""} → ${r.file}`
  );
  return okText(`ADR (${records.length}):\n${rows.join("\n")}`);
}

// ---------------------------------------------------------------------------
// MCP tool definice.
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "docs_for_code",
    description:
      "Vrať docs-plugin dokumentaci k adresáři se zdrojáky: DESCRIPTION.md té složky + nejbližší MODULES.md nad ní + odpovídající docs/modules/<X>/. Použij, když chceš pochopit, co dělá nějaká část kódu, místo čtení samotných zdrojáků.",
    inputSchema: {
      type: "object",
      properties: {
        forCode: { type: "string", description: "Relativní cesta k adresáři se zdrojáky, např. 'src/Billing/Invoicing'." },
      },
      required: ["forCode"],
    },
    handler: docsForCode,
  },
  {
    name: "docs_topic",
    description:
      "Vrať architektonickou nebo referenční dokumentaci modulu (nebo celého systému). topic = 'architecture' | 'reference'. module je volitelný — bez něj vrací systémovou úroveň (docs/architecture/ resp. docs/reference/).",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: ["architecture", "reference"], description: "Typ dokumentace." },
        module: { type: "string", description: "Volitelně název modulu (lowercase), např. 'billing'." },
      },
      required: ["topic"],
    },
    handler: docsTopic,
  },
  {
    name: "docs_concept",
    description:
      "Fulltext hledání konceptu napříč docs/ a všemi DESCRIPTION.md. Vrátí soubory + úryvky řádků se shodou. Použij, když nevíš, kde je koncept popsaný (např. 'idempotence', 'rate limiting').",
    inputSchema: {
      type: "object",
      properties: {
        concept: { type: "string", description: "Hledaný výraz / koncept." },
      },
      required: ["concept"],
    },
    handler: docsConcept,
  },
  {
    name: "docs_adr",
    description:
      "Vypiš nebo načti Architecture Decision Records (docs/architecture/decisions/). Bez parametrů = seznam s titulky a statusy. topics/tags = filtr podle tagů. adr='full' = vrať plné texty místo seznamu.",
    inputSchema: {
      type: "object",
      properties: {
        adr: { type: "string", description: "'list' (default) nebo 'full' pro plné texty." },
        topics: { type: "array", items: { type: "string" }, description: "Filtr podle tagů, např. ['auth', 'billing']." },
      },
    },
    handler: docsAdr,
  },
];

// ---------------------------------------------------------------------------
// Pomocné formátování výstupu.
// ---------------------------------------------------------------------------

function section(title, body) { return `===== ${title} =====\n${body.trim()}`; }
function okText(text) { return { content: [{ type: "text", text }] }; }
function errText(text) { return { content: [{ type: "text", text }], isError: true }; }

// ---------------------------------------------------------------------------
// MCP stdio JSON-RPC loop (newline-delimited).
// ---------------------------------------------------------------------------

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function log(...a) { process.stderr.write(`[readthedocs] ${a.join(" ")}\n`); }

function handleMessage(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;

  switch (method) {
    case "initialize": {
      const protocolVersion = (params && params.protocolVersion) || DEFAULT_PROTOCOL;
      return reply(id, {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
    }
    case "notifications/initialized":
    case "initialized":
      return; // notifikace — bez odpovědi
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case "tools/call": {
      const name = params && params.name;
      const args = (params && params.arguments) || {};
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return replyError(id, -32602, `Neznámý nástroj: ${name}`);
      try {
        return reply(id, tool.handler(args));
      } catch (e) {
        return reply(id, errText(`Chyba: ${e.message}`));
      }
    }
    default:
      if (isRequest) return replyError(id, -32601, `Nepodporovaná metoda: ${method}`);
      return; // neznámá notifikace
  }
}

function reply(id, result) { if (id !== undefined && id !== null) send({ jsonrpc: "2.0", id, result }); }
function replyError(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { log("nevalidní JSON-RPC řádek, ignoruji"); continue; }
    try { handleMessage(msg); } catch (e) { log("handler error:", e.message); }
  }
});
process.stdin.on("end", () => process.exit(0));

log(`server start, PROJECT_DIR=${PROJECT_DIR}`);
