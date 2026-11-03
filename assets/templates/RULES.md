# {{PROJECT}} — Rules

> Verified against source: v{{VERSION}} · {{DATE}}
> Rules are normative: when another doc disagrees, the rule wins. Mechanics live in topic docs (doc map in `{{ENTRY}}`).

> **TL;DR.** The project's invariants. Never read this file whole — grep the number: `grep -n "^## R<N>" {{DOCS}}/RULES.md`. Each rule = the norm + the date and author of the decision + why + a line "Implementation: …" pointing at the topic doc that owns the mechanics. A rule changes only by the owner's decision; the agent proposes candidates under "Proposed rules". Index: versioning R1 · documentation R2 · <topic> R3…

## R1 — Versioning ({{DATE}})

The version lives in `{{VERSION_FILE}}` as `MAJOR.MINOR.PATCH` (a fourth BUILD segment is fine for projects that change many times a day). What the segments mean here:

- **MAJOR** — <a break: new architecture / new edition / rebrand / new strategy>.
- **MINOR** — <a new part: feature / chapter / component family / campaign>.
- **PATCH** — <an improvement or fix within an existing part, including docs-only changes>.

Every change bumps the version (at least the last segment) and adds an entry at the top of `{{DOCS}}/CHANGELOG.md`: `## <version> — <date> — <title>`, then what changed, why, which docs were touched, deviations.

Why: the version and the changelog are the only reliable answer to "what changed since X, and why".
Implementation: `{{TOOLS}}/verify-docs.mjs` (check A) compares the version with the top changelog entry.

## R2 — Documentation ({{DATE}})

- The entry file `{{ENTRY}}` is the way in: search order, map of the work, doc map, conventions, critical traps, checks before handing off. Every topic doc is listed in its doc map.
- Docs describe the current state; history lives in the changelog, and so do volatile numbers and measurements, with their date.
- One fact lives in one doc; other docs link to it. Norms live here; mechanics live in the topic doc each rule names.
- Docs are updated by sweeping the corpus, not from memory: every change closes with the change sweep (`{{ENTRY}}`, "Checks before handing off"). The classic failure this prevents: the docs read during a task get updated, the docs never opened keep stating what just became false.
- Maps change together with the work: an added or removed registry item gets its row in the same change. A lagging registry is worse than none — readers take a gap for absence.
- A discrepancy found anywhere is fixed in the doc, or logged in `{{DOCS}}/KNOWN-ISSUES.md` when the fix needs the owner — never worked around silently.
- Exceptions to the machine checks (`names.knownAbsent` in `living-docs.json`) carry a reason each; an exception is a promise (`⏳ PLAN`) or a memory of something removed, not a way to silence a red check.

Why: the next reader — agent or person — trusts the docs instead of re-reading the work. A stale statement costs more than a missing one: it is believed.
Implementation: `{{ENTRY}}`, "Checks before handing off"; `{{TOOLS}}/verify-docs.mjs`; the hooks described in `{{ENTRY}}`.

## Proposed rules (not yet normative)

<!-- Candidates the agent noticed in the work or in conversation. Each one becomes R<N> only when the owner confirms it; record the date and the owner's words. -->
