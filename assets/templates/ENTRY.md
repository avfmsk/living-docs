# {{PROJECT}} — entry point for agents and people

<One paragraph: what the project is, for whom, what its source of truth is (code, manuscript, design files, campaign assets…), where the current version lives (`{{VERSION_FILE}}`). Keep this file short: it is read at the start of every session.>

## How to find information (the order that saves time and tokens)

1. This file → the **doc map** below: pick the topic doc.
2. Every topic doc opens with a **TL;DR** (what it is, key files, related rules, section index). In a typical task the TL;DR answers INSTEAD of reading the doc; go deeper only by its section index, never the whole file.
3. "Where is X / what produces X / which file holds X" is answered by the **maps** (`MAP-*.md` in the docs folder): registries recounted from the work. A map answers INSTEAD of walking the files; a topic doc explains the meaning, a map gives the location.
4. Normative invariants live in `{{DOCS}}/RULES.md` (R1…Rn). A rule beats any paraphrase in another doc. Read by number: `grep -n "^## R<N>" {{DOCS}}/RULES.md`.
5. History lives apart and is not part of current answers: `{{DOCS}}/CHANGELOG.md` (current and previous series), older slices in `{{DOCS}}/changelog/`, finished one-off processes in `{{DOCS}}/archive/`. Search history only with a targeted grep (`grep -rn "## <version>" {{DOCS}}/CHANGELOG.md {{DOCS}}/changelog/`), never read it whole.
6. Before describing how something works, check the work itself: docs can lag. A discrepancy you find is fixed in the doc, not silently worked around.

## Map of the work

| Where | What |
|---|---|
| `<folder>/` | <what lives there, who or what produces it> |
| `{{DOCS}}/` | documentation (this system) |
| `{{TOOLS}}/` | documentation tooling: verifier, changelog roller, hooks |

## Doc map (topic → doc)

| Topic | Doc |
|---|---|
| What the project is, goals, audience, parts, stages, glossary | `{{DOCS}}/OVERVIEW.md` |
| Normative rules R1…Rn | `{{DOCS}}/RULES.md` |
| Known issues, debt, decisions waiting for the owner | `{{DOCS}}/KNOWN-ISSUES.md` |
| History of changes | `{{DOCS}}/CHANGELOG.md` |
| Ideas and variants not yet done (`⏳ PLAN`) | `{{DOCS}}/plans/` |

## Documentation conventions (anti-bloat)

- **Header of every topic doc**: `> Verified against source: v<version> · <date>` plus at most **3** fresh `; spot-checked v<version> · <date> (what)` stamps. Adding a new stamp means deleting the oldest — the full history of checks is in the changelog. Bumping the base stamp means "I walked the whole doc against the source"; don't claim it otherwise. A doc not yet walked says `Verified against source: not yet · <date>`.
- **TL;DR is mandatory** within the first 40 lines of every topic doc: what it is, key files, related rules, section index. Editing a doc — check its TL;DR is still true.
- **One fact lives in ONE doc**; others link (`see {{DOCS}}/<DOC>.md §N`). Norms live in `{{DOCS}}/RULES.md`; mechanics live in the topic doc the rule names ("Implementation: …").
- **Docs describe the CURRENT state.** History ("it used to be…", acceptance logs, timelines) lives only in the changelog; a doc keeps at most one line with a version number. Volatile numbers and measurements go to the changelog with their date, never into docs.
- **Markers**: unrealized idea — `⏳ PLAN`; dropped — `❌ CANCELLED (date)`. No marker = done and verified.
- **A path in backticks is a path in THIS project** (the verifier checks it). Other repositories and external files are named without backticks.
- **A removed one-off tool is marked, not erased**: "done by script migrate-x.mjs (removed <date>)" — no backticks, it no longer exists. A dead command is harmful; the fact that it ran is valuable.
- **The changelog rolls**: the live file keeps the current and previous series; older ones are cut into `{{DOCS}}/changelog/` by `node {{TOOLS}}/roll-changelog.mjs`. An entry states facts, the version and deviations — it does not retell routine procedures.
- **Every change to the work**: bump `{{VERSION_FILE}}` + entry at the top of `{{DOCS}}/CHANGELOG.md` (R1).

## Critical traps (breaking these loses work)

- <irreversible actions specific to this project: e.g. never overwrite the master file, never publish a draft, never run two writers on the same data, never commit secrets>

## Checks before handing off

1. <the project's own checks: build and tests / spellcheck and export / link check / brand-compliance check>.
2. **Change sweep through the docs** — from the corpus, not from memory:
   - for every added, renamed or removed name (file, function, field, entity, term, token, offer, price, date…): `grep -rn "<name>" {{DOCS}}/*.md {{DOCS}}/plans {{ENTRY}}` — hits in history (`{{DOCS}}/CHANGELOG.md`, `{{DOCS}}/changelog/`, `{{DOCS}}/archive/`) are skipped: history is allowed to disagree with the present;
   - visit EVERY hit, not the first: the statement is confirmed against the work or fixed on the spot;
   - the core docs (this file, `{{DOCS}}/OVERVIEW.md`, `{{DOCS}}/RULES.md`) are re-checked always; touched docs get a fresh header stamp and, if the substance changed, a fresh TL;DR;
   - a discrepancy found on the way is fixed, even if it is not yours.
3. **Maps change together with the work**: an added or removed registry item gets its row in its map in the same change.
4. `node {{TOOLS}}/verify-docs.mjs` — the mechanical part: version ↔ top changelog entry, headers and TL;DR, stamp limit, changelog series limit, paths and names that exist, completeness of the maps, every doc in the doc map. Red means a doc promises something the project doesn't have, or a map lags behind the work.

<!-- hooks -->
Hooks back this discipline up (`.claude/settings.json` + `{{TOOLS}}/hooks/`): after an edit to the work the agent gets a reminder about version, changelog and sweep, plus a named reminder for each touched map (once per version cycle), and the turn cannot end while the verifier is red. Hooks are a safety net, not a substitute for steps 2 and 3: the machine cannot tell whether a sentence is still true.
<!-- /hooks -->
