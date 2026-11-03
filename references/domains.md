# Adapting the system to a domain

The recipe is the same for every kind of project. Answer four questions, then configure:

1. **Source of truth** — which files ARE the work? (Code; the manuscript; the token file and component library; the campaign folders and the offers sheet.) Everything the docs claim must be checkable against them.
2. **Names** — what does a change rename, add or remove? These are what the change sweep greps for.
3. **Enumerables** — what can be listed from the files? Each becomes a map with a collector.
4. **Invariants** — what must stay true no matter what? Each becomes a rule, with the owner's reason.

Then set `work.include` (what counts as the work for the reminder hook), the maps, and — where it pays off — the names check.

If part of the source lives outside the project (a design tool, a CMS, a spreadsheet in the cloud), export a manifest into the project (a JSON or CSV list of components, pages, rows) on each change. The maps are then recounted from the manifest, and the export becomes a step in "Checks before handing off".

## Contents
- Software
- Writing (books, courses, long-form, series)
- Design (design systems, brand identity)
- Marketing (campaigns, content, offers)
- Anything else

---

## Software

- **Source**: code, schemas, migrations, configs, infrastructure files.
- **Names for the sweep**: files, functions, types, fields, routes, tables, environment variables, CLI flags, feature flags, error codes.
- **Typical topic docs**: `OVERVIEW` (product, stages), `ARCHITECTURE` (parts, storage, contracts, performance budgets), one doc per module or integration, `OPERATIONS` (deploy, backup, monitoring), `KNOWN-ISSUES`.
- **Typical maps**: `MAP-API` (every handler with its guard), `MAP-DATA` (every table or collection, entities, fields copied between entities and what keeps them in sync), `MAP-WRITES` (which modules write to which storage, background jobs), `MAP-UI` (screens, shared state, shared helpers).
- **Typical rules**: versioning and docs (R1, R2), data-safety contracts, API compatibility, the UI canon, security boundaries.
- **Version**: SemVer; a fourth BUILD segment if changes are frequent.
- **Checks before handing off**: type check, tests, build — then the sweep and the verifier.

```json
{
  "names": {
    "check": true,
    "sources": ["src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
    "ignore": ["GitHub", "PostgreSQL"],
    "knownAbsent": { "retryQueue": "⏳ PLAN in docs/plans/QUEUE.md — not implemented yet" }
  },
  "paths": { "roots": ["", "src/"] },
  "work": { "include": ["src/**", "scripts/**", "migrations/**", "package.json"] },
  "maps": [
    { "doc": "docs/MAP-API.md", "label": "route handlers",
      "collect": { "type": "files", "glob": "src/routes/**/*.ts", "match": "^src/routes/(.*)\\.ts$", "item": "/$1" },
      "hint": "add a row to §2 Registry" },
    { "doc": "docs/MAP-DATA.md", "label": "tables", "needle": "`{item}`",
      "collect": { "type": "regex", "glob": "migrations/*.sql", "pattern": "CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)", "flags": "gi" } },
    { "doc": "docs/MAP-WRITES.md", "label": "modules writing to storage",
      "collect": { "type": "files", "glob": "src/**/*.ts", "contains": "\\b(insertRow|updateRow|deleteRow)\\s*\\(",
                   "stripComments": "c", "match": "([^/]+/[^/]+)$", "item": "$1" } },
    { "doc": "docs/MAP-UI.md", "label": "screens",
      "collect": { "type": "dirs", "parent": "src/screens", "match": "([^/]+)$", "item": "screens/$1" } }
  ]
}
```

Keep sandboxes and prototypes out of the maps (`exclude` in the collector) and out of the reminder (`work.exclude`), so experiments don't demand documentation.

## Writing (books, courses, long-form, series)

- **Source**: the manuscript (one file per chapter or lesson), the outline, research notes.
- **Names for the sweep**: character and place names, invented terms, dates on the story timeline, chapter and lesson titles, cited facts and figures, quotes.
- **Typical topic docs**: `OVERVIEW` (premise, audience, promise to the reader), `STRUCTURE` (outline, arcs, act breaks), `CHARACTERS` (the bible), `WORLD` (setting, history, systems), `VOICE` (style guide), `SOURCES` (research, permissions), `KNOWN-ISSUES` (continuity errors, open questions).
- **Typical maps**: `MAP-CHAPTERS` (every chapter file: POV, timeline position, what it sets up and pays off), `MAP-CAST` (every character file), `MAP-SOURCES` (every citation key used in the text).
- **Typical rules**: continuity ("the letter is not opened before chapter 12"), voice ("present tense in the frame story only"), legal (real people, quotes, permissions), editorial standards.
- **Version**: MAJOR — draft or edition; MINOR — a chapter added, removed or restructured; PATCH — line edits.
- **Names check**: write names in backticks in the bible when you mean "this exact spelling is used in the text"; the verifier then finds renamed or dropped characters. The pattern below takes single capitalised words (`Anna`, `Mordor`); words that match but are not names go to `names.ignore`.
- **Volatile numbers** (word counts, page counts) don't go into docs — the changelog, with a date.

```json
{
  "work": { "include": ["manuscript/**", "outline/**", "research/**"] },
  "names": { "check": true, "pattern": "^\\p{Lu}\\p{Ll}+$", "minLength": 3, "sources": ["manuscript/**/*.md"] },
  "maps": [
    { "doc": "docs/MAP-CHAPTERS.md", "label": "chapters", "needle": "`{item}`",
      "collect": { "type": "files", "glob": "manuscript/*.md", "match": "([^/]+)\\.md$", "item": "$1" } },
    { "doc": "docs/MAP-CAST.md", "label": "characters",
      "collect": { "type": "files", "glob": "cast/*.md", "match": "([^/]+)\\.md$", "item": "$1" } },
    { "doc": "docs/MAP-SOURCES.md", "label": "citation keys", "needle": "`{item}`",
      "collect": { "type": "regex", "glob": "manuscript/**/*.md", "pattern": "\\[@([\\w-]+)\\]" } }
  ]
}
```

## Design (design systems, brand identity)

- **Source**: the token file(s), the component library, exported assets, the logo files, a manifest exported from the design tool.
- **Names for the sweep**: token names, component and variant names, asset file names, font families, colour names.
- **Typical topic docs**: `BRAND` (essence, personality, voice), `TOKENS` (what each token family means and when to use it), `COMPONENTS` (usage, states, do and don't), `ICONOGRAPHY`, `ASSETS` (logo use, clear space, formats), `ACCESSIBILITY`, `PALETTES`.
- **Typical maps**: `MAP-TOKENS` (every token path), `MAP-COMPONENTS` (every component), `MAP-ASSETS` (every logo and icon file).
- **Typical rules**: contrast minimums, logo clear space and forbidden treatments, "values live only in the token file — docs name tokens, never restate hex values" (one fact, one home), naming scheme for tokens.
- **Version**: MAJOR — rebrand or breaking token rename; MINOR — new component or token family; PATCH — adjustments.

```json
{
  "work": { "include": ["tokens/**", "components/**", "assets/**", "exports/**"] },
  "maps": [
    { "doc": "docs/MAP-TOKENS.md", "label": "design tokens", "needle": "`{item}`",
      "collect": { "type": "jsonKeys", "file": "tokens/tokens.json", "leaves": true } },
    { "doc": "docs/MAP-COMPONENTS.md", "label": "components",
      "collect": { "type": "dirs", "parent": "components", "match": "([^/]+)$", "item": "$1" } },
    { "doc": "docs/MAP-ASSETS.md", "label": "brand assets",
      "collect": { "type": "files", "glob": "assets/**/*.{svg,png,pdf}", "match": "^assets/(.*)$", "item": "$1" } }
  ]
}
```

Components that exist only in the design tool: export their list to `exports/components.json` and collect with `jsonKeys` from it.

## Marketing (campaigns, content, offers)

- **Source**: campaign folders (brief, copy, creatives), the content calendar, landing page sources, the offers and pricing sheet, audience segments, the link and tracking registry.
- **Names for the sweep**: offer names, prices, promo codes, deadlines and dates, product claims, segment names, tracking campaign names, channel names.
- **Typical topic docs**: `POSITIONING` (audience, value proposition, message pillars), `VOICE` (tone, words we use and avoid), `OFFERS` (the owner doc of prices and terms), `CHANNELS` (rules per channel), `CAMPAIGNS` (what is running and why), `ANALYTICS` (what is measured and where — the numbers themselves go to the changelog with dates), `LEGAL` (claims allowed, required disclaimers).
- **Typical maps**: `MAP-CAMPAIGNS` (every campaign folder), `MAP-OFFERS` (every offer id), `MAP-CONTENT` (every published piece), `MAP-LINKS` (every tracked link).
- **Typical rules**: "every claim has a source", "prices only from the offers sheet", "no discount without a deadline", "one call to action per message".
- **Version**: MINOR — a campaign launched or ended; PATCH — copy edits; MAJOR — repositioning.
- **Names check** for promo codes (capitals with at least one digit, like `SPRING25`): a code mentioned in a doc must exist in the offers sheet.

```json
{
  "work": { "include": ["campaigns/**", "content/**", "offers/**", "landing/**"] },
  "names": { "check": true, "pattern": "^(?=.*\\d)[A-Z0-9]{4,}$", "minLength": 4, "sources": ["offers/**"] },
  "maps": [
    { "doc": "docs/MAP-CAMPAIGNS.md", "label": "campaigns",
      "collect": { "type": "dirs", "parent": "campaigns", "match": "([^/]+)$", "item": "$1" } },
    { "doc": "docs/MAP-OFFERS.md", "label": "offers", "needle": "`{item}`",
      "collect": { "type": "regex", "glob": "offers/offers.yaml", "pattern": "^\\s*-\\s*id:\\s*([\\w-]+)" } },
    { "doc": "docs/MAP-CONTENT.md", "label": "published pieces",
      "collect": { "type": "files", "glob": "content/**/*.md", "match": "^content/(.*)\\.md$", "item": "$1" } }
  ]
}
```

## Anything else

Research projects, operations runbooks, legal document sets, event production, course catalogues — apply the four questions. Typical outcomes:

- research: sources and datasets as maps, methods and findings as topic docs, "no claim without a source" as a rule, measurements with dates in the changelog;
- operations: services, schedules and contacts as maps, runbooks as topic docs, "irreversible actions need a second person" as a rule;
- a document set: every document as a map item, clauses and definitions in a glossary, "a definition lives in one document" as a rule.

If nothing in the project can be enumerated from files, skip the maps and keep the rest: the entry file, TL;DRs, rules with reasons, the changelog and the change sweep carry most of the value.
