# Doc types — anatomy, formats, when to split

Read this when creating or restructuring docs. Templates for each type are in `assets/templates/`.

## Contents
1. Entry file
2. Topic docs
3. Header stamps
4. Rules
5. Maps
6. Changelog
7. Known issues
8. Plans
9. Archive
10. Writing style that stays true

---

## 1. Entry file (`CLAUDE.md`)

Read at the start of every session, so every line costs. Sections, in this order:

1. **What the project is** — one paragraph: what, for whom, what the source of truth is, where the version lives.
2. **How to find information** — the search order: entry → doc map → TL;DR → maps → rules by number → history only by grep → check the work before describing it.
3. **Map of the work** — folder → what lives there. Generated or untouchable folders are marked as such.
4. **Doc map** — topic → doc. A row names the topic in a few words plus `§` pointers. When a row grows past two lines, the detail belongs in the TL;DR of that doc, not here.
5. **Conventions** — the anti-bloat list (headers, TL;DR, one fact one home, current state only, markers, backticks mean real paths, the rolling changelog, version per change).
6. **Critical traps** — only things that lose work or data irreversibly. If the list grows long, it stops being read.
7. **Checks before handing off** — the project's own checks, the change sweep, maps, the verifier, and one line about the hooks.

Other agent tools may look for `AGENTS.md` or similar: keep one real entry file and make the others a one-line pointer to it, so there is still one home.

## 2. Topic docs (`docs/<TOPIC>.md`)

One area per doc, the single home of that area's facts. Name files in capitals by topic (`BILLING.md`, `CHARACTERS.md`, `TOKENS.md`), not by date or by person.

Layout:

```
# <Project> — <Topic>

> Verified against source: v1.4.0 · 2026-03-02; spot-checked v1.6.2 · 2026-04-11 (§3 — new export)
> Source: `src/billing/`, `src/billing/invoice.ts` · Rules: R5, R9

> **TL;DR.** <what it is> <where the truth lives> <the facts asked most> <rules> Index: §1 … · §2 … · §3 …

## 1. …
```

- **TL;DR** answers the questions most readers come with, so that most sessions stop there. It ends with a section index for targeted reading.
- **Sections are numbered** so other docs and rules can point at `docs/BILLING.md §3`.
- **Split** when the TL;DR can't stay short, or when two halves are read by different people for different questions. **Merge** when two docs answer the same questions, or one of them is mostly links to the other.
- **Facts that belong to another topic** are linked, not restated. If you catch yourself copying a paragraph, link instead.

## 3. Header stamps

- `Verified against source: v<version> · <date>` — the base stamp. Bumping it claims "I walked the whole doc against the work at this version". Never bump it for a partial check.
- `; spot-checked v<version> · <date> (what)` — a partial check of named sections. At most three; adding one means deleting the oldest. The full history of checks is the changelog's job.
- `Verified against source: not yet · <date>` — honest state of a doc that was written or migrated without a full walk. An audit turns it into a real stamp.
- A stamp never names a version newer than the current one (the verifier checks).

## 4. Rules (`docs/RULES.md`)

The project's norms — things that must stay true, and the decisions behind them.

```
## R12 — Prices come only from the offers sheet (2026-02-10, amended 2026-04-01)

Every price shown anywhere — page, email, ad, deck — is taken from `offers/offers.yaml`.
A price typed by hand is a defect even when it is correct today.

Why: three campaigns in a row went out with last season's prices copied from old pages.
Decision: owner, 2026-02-10 — "one place for prices, everything else links".
Implementation: `docs/OFFERS.md` §2; the map of offers is checked by the verifier.
```

- **Norm + date + who decided + why + Implementation.** The "why" is what stops the next editor from "simplifying" the rule away. The implementation line points at the topic doc that owns the mechanics; the rule does not repeat them.
- **Numbers are never reused.** A dropped rule keeps its heading: `## R7 — ❌ CANCELLED (2026-05-03)` with one line why, so old references don't silently point at a different rule. Items inside a rule are referenced as "R12 item 3".
- **Amendments** add a date to the heading; the old wording goes to the changelog, not into the rule.
- **The TL;DR** of `RULES.md` is a topic index: "pricing R12 · voice R3, R4 · …", so the right rule is found with one grep.
- **Only the owner makes norms.** The agent writes candidates under "Proposed rules" and asks. Shortening a rule's rationale is also the owner's call, not the agent's: the rationale is what the rule is made of.

## 5. Maps (`docs/MAP-*.md`)

A map is a **registry** of something enumerable that can be recounted from the files: routes, tables, background jobs, screens; chapters, characters, sources; tokens, components, assets; campaigns, offers, landing pages, channels. If you can't write a collector for it, it is probably a topic doc, not a map.

- **Columns**: the item (exactly as it appears in the work, so the machine can find it), what it is, what produces or uses it, the owner doc.
- **A cross-links section** is often the most valuable part: where the same value lives in two places and what keeps the copies in sync; what happens to references when an item is renamed, merged or removed.
- **The map answers "where", the topic doc answers "why".** Don't explain behaviour in a map; link.
- **A collector in `living-docs.json`** recounts the items, so the verifier catches anything missing. It cannot catch stale rows or wrong descriptions — the change sweep does.

## 6. Changelog (`docs/CHANGELOG.md`)

```
## 1.7.0 — 2026-04-11 — Spring campaign launched

Owner, 2026-04-08: "launch on Friday with the early-bird price only".
- Landing `campaigns/spring/landing.md`, three emails, two ad sets; early-bird offer added to `offers/offers.yaml`.
- Docs: `docs/CAMPAIGNS.md` §2, `docs/MAP-CAMPAIGNS.md`, `docs/OFFERS.md` §1.
- Deviation: the third email went out without the usual 24-hour review — the owner approved it in the chat.
- Measured 2026-04-12: open rate of email 1 — 41 %.
```

- **Heading**: `## <version> — <date> — <title>`, newest on top. The verifier compares the top version with `VERSION`.
- **Content**: what changed and why (the owner's words with the date when it was a decision), which docs were touched, deviations from routine. Measurements and other numbers that will change belong here, with their date.
- **Not here**: retellings of routine procedures (release steps, review checklists) — only the fact that it happened and what deviated.
- **Rolling**: the live file keeps the current and the previous series (`MAJOR.MINOR` by default); older series are cut into `docs/changelog/ARCHIVE-<from>-<to>.md` with `roll-changelog.mjs`. History is read only by targeted grep.

## 7. Known issues (`docs/KNOWN-ISSUES.md`)

Three sections: **waiting for the owner** (decisions only they can make, with options and a recommendation), **issues** (what is wrong, where, impact, fix, date found), **debt** (works now, costs later). A fixed item is deleted — the changelog already records the fix. A list that only grows is a sign the items aren't being fixed or aren't being removed.

## 8. Plans (`docs/plans/`)

Ideas, variants and designs not yet done. Each file is marked `⏳ PLAN` in its title and status line, records the variants, the **firm decisions** with dates, and the open questions. When implemented: the decisions become rules, the mechanics go into the topic doc, and the plan moves to `docs/archive/` (or is marked done). A dropped plan is marked `❌ CANCELLED (date)` with one line why. Plans are not checked by the verifier — they are allowed to name things that don't exist yet.

## 9. Archive (`docs/archive/`)

Finished one-off processes — migrations, explorations, retired designs — kept because the reasoning is valuable, excluded from current answers and from checks.

## 10. Writing style that stays true

- **State current facts plainly**, with the file that proves them. "Prices come from `offers/offers.yaml`", not "we try to keep prices consistent".
- **No time-relative words**: "new", "recently", "now", "currently", "soon" rot silently. Use a version or a date.
- **One term per concept**, defined once in the glossary (the overview's last section). Synonyms make greps miss.
- **Names exactly as in the work**, in backticks, so greps and the verifier find them.
- **Short sections, numbered**; a reader should land on the right paragraph from the TL;DR index.
- **Write in the owner's working language.** Templates are scaffolds; translate headings and set the stamp labels in `living-docs.json`.
