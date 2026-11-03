# Living Docs — tooling

The machine part of the project's documentation system. Node 18+, no dependencies, works the same for code, writing, design or marketing projects. The meaning of the system (doc types, the change sweep, conventions) is described in the project's entry file; this file covers only the tools.

| File | What it does |
|---|---|
| `verify-docs.mjs` | The documentation regression, checks A–G below. Exit 0 green, 1 problems, 2 config error |
| `roll-changelog.mjs` | Moves old changelog series into slices (`--dry-run` to preview) |
| `hooks/docs-reminder.mjs` | PostToolUse hook: reminder after edits to the work, named reminders per map |
| `hooks/docs-stop-gate.mjs` | Stop hook: the turn cannot end while the verifier is red |
| `lib.mjs` | Shared helpers and the defaults (`DEFAULTS`) |

All tools find the project by the nearest `living-docs.json` (from `$CLAUDE_PROJECT_DIR`, the current folder, or their own folder upward); `--root <dir>` and `--config <file>` override.

```bash
node tools/living-docs/verify-docs.mjs
node tools/living-docs/roll-changelog.mjs --dry-run
```

## Checks

| | Catches | Usual fix |
|---|---|---|
| **A** | `VERSION` ≠ the top `## <version>` entry of the changelog | bump the version and/or write the entry |
| **B** | a topic doc without the header stamp, or a stamp newer than the current version | add `> Verified against source: v<version> · <date>` (or `not yet · <date>`) |
| **C** | a path in backticks that doesn't exist (globs must match something; paths inside commands count) | fix the path, or the doc that still mentions a removed file |
| **D** | a name in backticks not found in the sources (only when `names.check` is on) | update the doc to the new name; for a legitimate absence add it to `names.knownAbsent` with a reason |
| **E1** | no TL;DR in the first `header.withinLines` lines | write the TL;DR |
| **E2** | more than `header.maxSpotStamps` spot-check stamps | delete the oldest |
| **E3** | more than `changelog.maxSeries` series in the live changelog | `roll-changelog.mjs` |
| **F** | an item the collector finds in the work is not named in its map; or a collector that finds nothing | add the row; fix the collector (a blind check is worse than none) |
| **G** | the entry file is missing, or a topic doc is not named in it | add the doc to the doc map |

History (`history` globs) is checked only by A and E3. Paths are checked in the entry file and in topic docs; headers and TL;DR — in topic docs only. Not checkable and skipped: placeholders with `<…>` or `…`, paths starting with `~/`, `./`, `../` or `/`, URLs and domains, folders written with a trailing slash (docs use them for servers, archives and remote sites as often as for the project), prefixes in `paths.ignorePrefixes`; `file:line` suffixes are stripped. A path is checked when it has a known extension (`paths.extensions`) or ends in `/*` or `/**`. The tools folder and `living-docs.json` are not part of the names corpus.

Every red item is fixed in a doc, in the work, or in the config **with a reason** — never by switching a check off to make it pass.

## Configuration — `living-docs.json`

Only what differs from the defaults needs to be written; objects merge key by key, arrays replace. Keys starting with `_` are ignored (use them as comments).

| Key | Default | Meaning |
|---|---|---|
| `project` | `""` | name used in generated headers |
| `toolsDir` | `tools/living-docs` | where these tools live (used in messages and by the stop gate) |
| `entry` | `CLAUDE.md` | the entry file (G, and path checks) |
| `entryMustListDocs` | `true` | G: every topic doc must be named in the entry file |
| `docs` | `["docs/*.md"]` | topic docs (B, C, D, E1, E2) — globs |
| `history` | changelog, `changelog/**`, `archive/**` | excluded from everything but A and E3 |
| `version.file` | `VERSION` | `null` switches versioning off (A and stamp comparison) |
| `version.pattern` | `\d+(?:\.\d+){1,3}` | regex of a version; date versions like `2026.03.14` also compare correctly |
| `changelog.file` / `archiveDir` | `docs/CHANGELOG.md` / `docs/changelog` | live file and slices folder |
| `changelog.maxSeries` / `seriesSegments` | `2` / `2` | E3: how many series stay live; a series = the first N version segments |
| `header.verifiedLabel` / `spotLabel` | `Verified against source` / `spot-checked` | stamp words — localize to the docs' language |
| `header.tldrLabel` / `withinLines` / `maxSpotStamps` | `TL;DR` / `40` / `3` | E1, E2 |
| `paths.check` / `roots` / `ignorePrefixes` / `extensions` | `true` / `[""]` / `[]` / common text, code, image, office, design, font, media types | C. `roots` lets short forms resolve: `["", "src/"]` makes `lib/x.ts` find `src/lib/x.ts` |
| `names.check` | `false` | D on/off |
| `names.pattern` / `minLength` | camelCase / `6` | the shape of a "name" worth checking |
| `names.sources` | code files of common languages | where names must occur |
| `names.ignore` | `[]` | words that look like names but aren't (brands, products) |
| `names.knownAbsent` | `{}` | `{ "name": "reason" }` — legitimate absences; reported once the name reappears |
| `maps` | `[]` | registries for F, see below |
| `work.include` / `exclude` | `["**"]` / `[]` | which edited files count as "the work" for the reminder hook; docs, history, entry, VERSION, this config, the tools and `.claude/` are always excluded |
| `skipDirs` | `.git`, `node_modules`, build outputs… | folders the tools never walk |
| `hooks.reminder` / `stopGate` | `true` / `true` | switch the hooks off without editing `.claude/settings.json` |

Localized labels, for docs written in Russian for example:

```json
{ "header": { "verifiedLabel": "Сверено с источником", "spotLabel": "точечно сверено" } }
```

## Maps — collectors for check F

```json
{
  "maps": [
    {
      "doc": "docs/MAP-CONTENT.md",
      "label": "chapters",
      "collect": { "type": "files", "glob": "manuscript/*.md", "match": "([^/]+)\\.md$", "item": "$1" },
      "needle": "`{item}`",
      "hint": "add a row to §2 Registry",
      "watch": ["manuscript/**"]
    }
  ]
}
```

- `collect` — one collector or a list (union). Every collector may have `match` (regex applied to the raw item: no match → item dropped) with `item` (template, `$0`…`$9` are the groups), and `exclude` (regex on the raw item).
- `needle` — how the item must appear in the map; default `{item}` (plain substring). Use `` "`{item}`" `` to require backticks.
- `allowEmpty` — `true` when an empty registry is legitimate; otherwise a collector that finds nothing is an error.
- `watch` — files whose edit triggers the named map reminder; default: what the collector reads.

| `type` | Raw items | Keys |
|---|---|---|
| `files` | relative paths of files matching `glob` | `glob`; `contains` (regex: keep files whose text matches), `stripComments` (`"c"`, `"hash"`, `"html"` or a list) |
| `dirs` | immediate subfolders of `parent` | `parent` |
| `regex` | capture group `group` (default 1) of `pattern` in files matching `glob` | `glob`, `pattern`, `flags` (default `gmu`), `group`, `stripComments` |
| `jsonKeys` | keys of the object at `pointer` (dot path) in `file`; with `leaves: true` dotted paths of all leaves (an object holding `$value`/`value` is a leaf; `$`-keys are metadata) | `file`, `pointer`, `leaves` |

The machine checks only that nothing is **missing** from a map. Stale rows (the item is gone) are removed during the change sweep.

## Hooks

`init.mjs` merges these into `.claude/settings.json`; to add them by hand:

```json
{
  "hooks": {
    "PostToolUse": [{ "matcher": "Edit|Write|MultiEdit|NotebookEdit", "hooks": [
      { "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR:-.}/tools/living-docs/hooks/docs-reminder.mjs\"", "timeout": 15 } ] }],
    "Stop": [{ "hooks": [
      { "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR:-.}/tools/living-docs/hooks/docs-stop-gate.mjs\"", "timeout": 60 } ] }]
  }
}
```

- **Reminder** — after an edit to a work file: one reminder per version cycle (version, changelog, sweep, maps, stamps, verifier), plus one per touched map. Deduplicated by marker files in the OS temp folder keyed by project, version and reminder; a version bump re-arms them.
- **Stop gate** — runs the verifier; red → exit 2, the problems go back to the agent and the turn continues. If the turn already continued because of the gate (`stop_hook_active`), it lets the turn end, so it can never loop.

Test them without an agent:

```bash
echo '{"tool_input":{"file_path":"src/app.ts"}}' | node tools/living-docs/hooks/docs-reminder.mjs
echo '{}' | node tools/living-docs/hooks/docs-stop-gate.mjs; echo "exit $?"
```

## Changelog roller

`roll-changelog.mjs` keeps the newest `changelog.maxSeries` series in the live file and moves each older series to `<archiveDir>/ARCHIVE-<oldest>-<newest>.md`, newest first, merging with an existing slice of the same series. The text above the first entry stays. Preview with `--dry-run`; run the verifier afterwards.

## Continuous integration

`node tools/living-docs/verify-docs.mjs` exits non-zero on problems, so it can gate a CI pipeline or a pre-commit hook the same way the stop gate gates an agent's turn.
