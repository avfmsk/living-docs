# {{PROJECT}} — CHANGELOG

History of changes (R1, R2). Newest entries on top. Version format — R1.

---

This file keeps the current and the previous series. Older entries are cut into slices in `{{DOCS}}/changelog/` by `node {{TOOLS}}/roll-changelog.mjs`.
Search the whole history: `grep -rn "## <version>" {{DOCS}}/CHANGELOG.md {{DOCS}}/changelog/`.

---

## {{VERSION}} — {{DATE}} — Documentation system set up

- Entry file `{{ENTRY}}` (search order, map of the work, doc map, conventions, critical traps, checks before handing off); `{{DOCS}}/OVERVIEW.md`, `{{DOCS}}/RULES.md` (R1 versioning, R2 documentation), `{{DOCS}}/KNOWN-ISSUES.md`, this changelog.
- Tooling in `{{TOOLS}}/`: the verifier, the changelog roller{{HOOKS_LINE}}.
- Not yet written from the work: the overview (stamp "not yet"), the map of the work and the critical traps in the entry file.
