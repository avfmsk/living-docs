---
name: living-docs
description: Build and maintain a self-updating documentation system ("living docs") for ANY project — software, books and courses, design systems and brands, marketing campaigns, research. Sets up an agent-friendly entry point (CLAUDE.md) with a doc map, topic docs with TL;DR headers and verification stamps, numbered rules with their rationale, machine-checked registries ("maps"), versioning with a rolling changelog, a zero-dependency verifier and Claude Code hooks that remind after edits and block finishing while docs are inconsistent. Use it whenever the user wants to document a project, restructure docs, a knowledge base, style guide, brand book or story bible, set up CLAUDE.md, keep docs in sync with changes or audit stale docs — even without the words "documentation system". Also use it after changing anything in a project that has living-docs.json, to run the change sweep.
---

# Living Docs

A documentation system an agent can build from the work itself and keep true after every change. It fits any project whose source of truth is a set of files: code, a manuscript, a design system, a brand, campaigns, research. The principle is the same everywhere; only "the source" and "the names" change (see `references/domains.md`).

Three layers:

1. **Structure** — a small set of doc types, each with one job: entry point, topic docs, rules, maps, changelog, plans, known issues, archive.
2. **Discipline** — every change to the work closes with a version bump, a changelog entry and a **change sweep** through the docs.
3. **Machinery** — a zero-dependency verifier that checks everything a machine can check, and Claude Code hooks that remind after edits and refuse to end a turn while the verifier is red.

## Why it works

Every convention below follows from these ideas. When a situation isn't covered, reason from them.

- **The reader arrives with zero context and limited attention.** The next agent or person should reach any answer in three hops: entry file → doc map → the TL;DR of one doc → (only if needed) one section. Each layer answers *instead of* the next one, which is what saves time and tokens.
- **One fact, one home.** Duplicated facts drift apart, and the copy nobody updates is the one somebody reads. Every other doc links: `see docs/X.md §N`.
- **Docs describe the present.** History ("it used to be…", acceptance logs, measurements) lives in the changelog. A doc full of history is slow to read and ambiguous about what is true now.
- **Docs are updated by searching, not by remembering.** The classic failure: an agent updates the docs it happened to read during the task, while docs it never opened keep stating things that just became false. The sweep greps the whole corpus for every changed name and settles every hit.
- **Registries are recounted, not narrated.** A map that lags behind the work is worse than none: readers trust it instead of looking and take a gap for absence. So maps are checked for completeness by machine.
- **A machine checks what it can.** People and agents forget; the verifier and hooks don't. The machine checks form only — whether a statement is still true is the sweep's job.
- **Norms carry their reason.** A rule without a "why" gets "simplified" away by the next editor. Each rule records the date, who decided, and why.

## Pick the mode

| Situation | Mode |
|---|---|
| No docs yet, or a pile of unstructured notes | **Bootstrap** |
| The project has `living-docs.json` and the work just changed | **Maintain** — the change sweep |
| Docs exist but don't follow the system | **Migrate** |
| "Are our docs still true?", periodic check, before a handover | **Audit** |

If the project already has `living-docs.json`, read its entry file first and follow the project's own conventions — they may have been tuned on purpose.

## Building blocks

| Doc | Job | Key rule |
|---|---|---|
| Entry file (`CLAUDE.md`) | What the project is, the search order, map of the work, doc map, conventions, critical traps, checks before handing off | Lists every topic doc; short — it is read every session |
| Topic docs (`docs/<TOPIC>.md`) | Explain one area; the single home of its facts | Header stamp + TL;DR in the first 40 lines |
| `docs/RULES.md` | Numbered invariants R1…Rn | Norm + date + who decided + why + "Implementation: → topic doc". A rule beats any paraphrase |
| Maps (`docs/MAP-*.md`) | Registries recountable from the work: "where is X, what produces X" | Change together with the work; completeness machine-checked |
| `docs/CHANGELOG.md` | History, newest on top; version = top entry | Rolls: current + previous series live, older cut into `docs/changelog/` |
| `docs/KNOWN-ISSUES.md` | Open problems, debt, decisions waiting for the owner | Fixed items are deleted (the fix is in the changelog) |
| `docs/plans/` | Ideas and variants not yet done | Marked `⏳ PLAN`; cancelled → `❌ CANCELLED (date)` |
| `docs/archive/` | Finished one-off processes (migrations, explorations) | Out of current answers |

Anatomy, formats and when to split or merge docs: `references/doc-types.md`. Ready-to-fill templates: `assets/templates/`.

## Bootstrap

1. **Survey the work, read-only.** Folder structure, file kinds, size, what is the source of truth, what is generated. For a large project, split the survey across parallel subagents by area and ask each for a short structured summary (areas, entities, enumerable things, conventions it noticed). Don't write docs from guesses: every claim you will write must be traceable to a file.
2. **Ask the owner only what the work can't tell you** — usually: the language of the docs (write in the language the owner works in; the templates are scaffolds to translate), who the readers are, the versioning scheme, the irreversible traps, decisions already made that aren't written down.
3. **Scaffold** with the bundled script (it never overwrites existing files):
   `node <this-skill>/scripts/init.mjs --root <project> --name "<Project>" [--docs-dir docs] [--entry CLAUDE.md] [--version 0.1.0] [--no-hooks] [--dry-run]`
   It creates `living-docs.json`, `VERSION`, the entry file, `OVERVIEW.md`, `RULES.md`, `KNOWN-ISSUES.md`, `CHANGELOG.md`, the `changelog/`, `archive/` and `plans/` folders, copies the tools into `tools/living-docs/` (the project owns its copy and works without this skill), and merges two hooks into `.claude/settings.json`. If the entry file already exists, it is left alone — merge the template's sections into it by hand.
4. **Design the doc map.** One topic doc per area someone would ask about on its own. Split a doc when its TL;DR can no longer stay short or its sections answer unrelated questions; merge two docs that answer the same questions. Each topic gets exactly one owner doc.
5. **Find the registries.** Anything enumerable from the files — routes, tables, chapters, characters, design tokens, assets, campaigns, offers — becomes a map with a collector in `living-docs.json`, so the verifier can recount it. A map answers "where"; the topic doc answers "why".
6. **Collect the rules.** Invariants the owner stated, written guidelines, decisions visible in the work. R1 (versioning) and R2 (documentation) come with the template. Don't invent norms: put candidates under "Proposed rules" in `RULES.md` and ask; a candidate becomes R<N> only with the owner's yes, recorded with the date and their words.
7. **Write the docs from the work.** TL;DR first (what it is, key files, related rules, section index), then sections numbered for `§N` pointers. Current state only. Paths in backticks are real paths in this project. Stamp `> Verified against source: v<version> · <date>` only on docs you actually checked against the files.
8. **Write the entry file**: what the project is, the search order, the map of the work (folder → what), the doc map (topic → doc), the conventions, the critical traps, the checks before handing off.
9. **Configure and run the verifier** until green: `node tools/living-docs/verify-docs.mjs`. Every red item is fixed either in the doc or in the config *with a stated reason* — never by weakening a check to make it pass. Config reference: `scripts/tools/README.md`.
10. **Test the hooks** (pipe a fake event, see `scripts/tools/README.md`) and tell the owner they exist.
11. **Close like any change**: version, changelog entry. Report to the owner what was created, what needs their decision (proposed rules, open questions in `KNOWN-ISSUES.md`), and how the system maintains itself.

## Maintain: the change sweep

This is what makes the docs "living". Run it after every change to the work, before handing off — including small changes and including changes the user didn't frame as "docs work".

1. **Version.** Re-read `VERSION` and the top of the changelog right before you write (another session may have bumped them meanwhile — never overwrite its entry). Bump at least the smallest segment.
2. **Changelog entry at the top**: `## <version> — <date> — <title>`, then what changed and why (the owner's words and date when a decision was made), which docs were touched, deviations from the usual procedure. Don't retell routine procedures; volatile numbers and measurements go here with their date, never into docs.
3. **List every name the change touched** — added, renamed, removed: files, functions, fields, routes; or characters, places, terms; or tokens, components, assets; or offers, prices, dates, claims, promo codes. Renames count twice: the old name and the new one.
4. **Sweep.** For each name: `grep -rn "<name>" docs/*.md docs/plans <entry file>` — hits in history (`CHANGELOG`, `changelog/`, `archive/`) are skipped: history is allowed to disagree with the present. Visit **every** hit, not the first: the statement is either confirmed against the work or fixed on the spot. Always re-check the core docs (entry file, overview, rules) even without a hit.
5. **Maps.** Anything added to or removed from a registry gets its row added or removed in the same change.
6. **Headers.** On docs whose content you re-checked, add `; spot-checked v<version> · <date> (what)` and delete the oldest stamp if there are more than three. Bump the base stamp only when you walked the whole doc against the source. If the substance changed, update the TL;DR.
7. **Verifier green**: `node tools/living-docs/verify-docs.mjs`.
8. **Discrepancies you find on the way are fixed**, even if they are not yours — or logged in `KNOWN-ISSUES.md` when fixing needs the owner. Never work around them silently.

The hooks back this up — a reminder after the first edit of each version cycle, a named reminder per touched map, and a stop gate while the verifier is red. They are a safety net, not a substitute: the machine cannot tell whether a sentence is still true.

## Migrate

1. Inventory the existing docs. Classify each passage: **current fact**, **norm**, **history**, **plan**, **measurement**.
2. Move each kind home: norms → `RULES.md` (with dates if known, ask otherwise), history → changelog or `archive/`, plans → `plans/` with `⏳ PLAN`, measurements → changelog with their date. Current facts stay in topic docs.
3. Deduplicate: choose one owner doc per fact; replace the other copies with links.
4. Add headers and TL;DRs. For a doc you have not walked against the source, write `> Verified against source: not yet · <date>` — an honest gap that Audit closes, instead of a false claim.
5. Scaffold the tooling (Bootstrap step 3), configure maps, run the verifier until green, then a version and changelog entry.

## Audit

1. Run the verifier.
2. Semantic pass: walk each topic doc against the work. For a large project, give each subagent one doc and the source it describes; ask for discrepancies with evidence (file and line), not opinions. Fix them; bump the base stamp only for docs walked in full.
3. Hygiene: at most three spot stamps per header; TL;DRs still accurate; no history or measurements inside docs; no fact living in two places; every doc listed in the entry file; the changelog rolled (`node tools/living-docs/roll-changelog.mjs`).
4. Record the audit as a change (version, changelog entry, what was found).

## Conventions (anti-bloat)

Put these in the entry file of every project (the template already has them):

- **Header**: `> Verified against source: v<version> · <date>` plus at most **3** fresh `; spot-checked v… · <date> (what)` stamps. Adding a fourth means deleting the oldest — the full history of checks is in the changelog. A base-stamp bump means "I walked the whole doc"; don't claim it otherwise.
- **TL;DR** in the first 40 lines of every topic doc: what it is, key files, related rules, section index. When you edit a doc, check its TL;DR is still true.
- **One fact lives in one doc**; others link. Norms live in `RULES.md`; mechanics live in the topic doc the rule names ("Implementation: …").
- **Docs describe the current state.** At most one line with a version number about the past; the rest is in the changelog.
- **Markers**: `⏳ PLAN` for not yet done, `❌ CANCELLED (date)` for dropped. No marker means done and verified.
- **A path in backticks is a path in this project** (the verifier checks it). External files and other repositories are named without backticks.
- **A removed one-off tool is marked, not erased**: "done by script migrate-x.mjs (removed <date>)" — without backticks, since it no longer exists. A dead command is harmful; the fact that a migration happened is valuable.
- **The changelog rolls**: the live file keeps the current and previous series; older ones go to `docs/changelog/ARCHIVE-<from>-<to>.md` (`roll-changelog.mjs` does it).
- **Every change to the work**: version bump + changelog entry + sweep.

Agent memory is not documentation: a fact about the project belongs in its docs, where every reader and every tool can see it.

## Adapting to the domain

The recipe for any domain: name the **source of truth** (which files are "the work"), the **names** that a sweep must chase, the **enumerables** that become maps, and the **invariants** that become rules. Worked adaptations with ready config snippets for software, writing, design and marketing: `references/domains.md`.

## Tooling

Bundled in `scripts/`: `init.mjs` (scaffolding) and `tools/` — copied into the project as `tools/living-docs/`: `verify-docs.mjs` (checks A–G), `roll-changelog.mjs`, `hooks/docs-reminder.mjs`, `hooks/docs-stop-gate.mjs`, shared `lib.mjs`. Node 18+, no dependencies. Configuration, every check, collectors for maps, the hooks and troubleshooting: `scripts/tools/README.md`.
