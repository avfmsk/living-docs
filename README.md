# Living Docs

A Claude skill that builds a documentation system from your project's own files and keeps it true after every change. It works for any project whose source of truth is a set of files: software, books and courses, design systems and brands, marketing campaigns, research.

## What you get

- **An entry point** (`CLAUDE.md`) — what the project is, where everything lives, which doc answers which question, and the checks before handing off.
- **Topic docs with a TL;DR on top**, so a reader (an agent or a person) gets the answer without reading the whole doc.
- **Numbered rules with their reasons** — the norms of the project, with the date and who decided.
- **Maps** — registries recounted from the files (routes, chapters, design tokens, campaigns…) and checked by machine for completeness.
- **Versioning and a rolling changelog** — history lives apart from the docs, which describe only the present.
- **A verifier and hooks** for Claude Code: a reminder after edits, and the agent cannot finish its turn while the docs disagree with the project.

## How it works

1. **Structure** — a small set of doc types, each with one job; one fact lives in one doc.
2. **Discipline** — every change closes with a version bump, a changelog entry and a *change sweep*: every renamed, added or removed name is searched across all docs, and every hit is confirmed or fixed.
3. **Machinery** — the verifier checks what a machine can check (versions, headers, dead paths and names, complete maps); hooks make sure it runs.

## Install

**Claude Code** — clone into your skills folder:

```bash
git clone https://github.com/avfmsk/living-docs.git ~/.claude/skills/living-docs
```

**claude.ai** — download `living-docs.skill` from the [latest release](https://github.com/avfmsk/living-docs/releases/latest) and upload it in Settings → Capabilities → Skills.

The verifier and hooks need **Node.js 18+**. Nothing else to install.

## Use

In any project, ask Claude:

> Set up living docs for this project.

The skill surveys the project, scaffolds the system and writes the docs from the files themselves. After that it maintains them: when the project changes, it runs the change sweep. Other modes: *migrate* existing docs into the system, *audit* whether the docs are still true.

What appears in the project:

```
CLAUDE.md                entry point
VERSION                  current version
living-docs.json         settings of the verifier and the maps
docs/                    OVERVIEW, RULES, KNOWN-ISSUES, CHANGELOG, topic docs, MAP-*
docs/changelog/          older changelog series
docs/plans/  docs/archive/
tools/living-docs/       verifier, changelog roller, hooks (the project owns its copy)
.claude/settings.json    hooks
```

## Update

```bash
git -C ~/.claude/skills/living-docs pull
```

To refresh the tools already copied into a project:

```bash
node ~/.claude/skills/living-docs/scripts/init.mjs --root <project> --update-tools
```

## Repository layout

| Path | What |
|---|---|
| `SKILL.md` | the skill: principles, modes, conventions |
| `references/` | doc types in detail; adaptations for software, writing, design, marketing |
| `assets/templates/` | templates of every doc type |
| `scripts/init.mjs` | scaffolding for a project |
| `scripts/tools/` | verifier, changelog roller, hooks — copied into each project |

## License

[MIT](LICENSE)
