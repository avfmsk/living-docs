#!/usr/bin/env node
/* Living Docs — scaffolding for a project.

   Creates what is missing and never overwrites what exists:
     living-docs.json, VERSION, the entry file (CLAUDE.md), <docs>/OVERVIEW.md,
     <docs>/RULES.md, <docs>/KNOWN-ISSUES.md, <docs>/CHANGELOG.md, the folders
     <docs>/changelog/, <docs>/archive/, <docs>/plans/;
   copies the tooling into <tools-dir> (the project owns its copy);
   merges two hooks into .claude/settings.json (reminder after edits, stop gate).

   Usage:
     node init.mjs [--root <project>] [--name "<Project>"] [--docs-dir docs]
                   [--entry CLAUDE.md] [--version 0.1.0] [--tools-dir tools/living-docs]
                   [--no-hooks] [--update-tools] [--dry-run]

   --update-tools  overwrite the copied tooling with this version (upgrade)
   --dry-run       print what would happen, write nothing */
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'node:fs'
import { resolve, join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const TEMPLATES = resolve(HERE, '../assets/templates')
const TOOLS_SRC = join(HERE, 'tools')

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(name)

const root = resolve(arg('--root', process.cwd()))
const name = arg('--name', basename(root))
const docsDir = arg('--docs-dir', 'docs').replace(/\/+$/, '')
const entry = arg('--entry', 'CLAUDE.md')
const toolsDir = arg('--tools-dir', 'tools/living-docs').replace(/\/+$/, '')
const hooks = !flag('--no-hooks')
const updateTools = flag('--update-tools')
const dryRun = flag('--dry-run')

if (!existsSync(root)) { console.error(`init: ${root} does not exist`); process.exit(2) }

const done = []
const skipped = []
const write = (rel, text) => {
  const abs = join(root, rel)
  if (existsSync(abs)) { skipped.push(rel); return false }
  if (!dryRun) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, text) }
  done.push(rel)
  return true
}

/* ------------------------------------------------------------ version -- */

const versionFile = 'VERSION'
const versionPath = join(root, versionFile)
const version = existsSync(versionPath) ? readFileSync(versionPath, 'utf8').trim() : arg('--version', '0.1.0')
write(versionFile, `${version}\n`)

/* ------------------------------------------------------------- config -- */

const config = {
  project: name,
  toolsDir,
  entry,
  entryMustListDocs: true,
  docs: [`${docsDir}/*.md`],
  history: [`${docsDir}/CHANGELOG.md`, `${docsDir}/changelog/**`, `${docsDir}/archive/**`],
  version: { file: versionFile, pattern: '\\d+(?:\\.\\d+){1,3}' },
  changelog: { file: `${docsDir}/CHANGELOG.md`, archiveDir: `${docsDir}/changelog`, maxSeries: 2, seriesSegments: 2 },
  header: { verifiedLabel: 'Verified against source', spotLabel: 'spot-checked', maxSpotStamps: 3, tldrLabel: 'TL;DR', withinLines: 40 },
  paths: { check: true, roots: [''], ignorePrefixes: [] },
  names: { check: false, ignore: [], knownAbsent: {} },
  maps: [],
  work: { include: ['**'], exclude: [] },
  hooks: { reminder: hooks, stopGate: hooks },
}
write('living-docs.json', `${JSON.stringify(config, null, 2)}\n`)

/* ------------------------------------------------------------ folders -- */

for (const dir of ['changelog', 'archive', 'plans']) write(`${docsDir}/${dir}/.gitkeep`, '')

/* ---------------------------------------------------------- templates -- */

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

function fill(template) {
  let t = readFileSync(join(TEMPLATES, template), 'utf8')
  t = hooks
    ? t.replace(/^<!-- \/?hooks -->\n/gm, '')
    : t.replace(/^<!-- hooks -->\n[\s\S]*?^<!-- \/hooks -->\n/m, '')
  const values = {
    PROJECT: name, DATE: today, VERSION: version, DOCS: docsDir, TOOLS: toolsDir,
    ENTRY: entry, VERSION_FILE: versionFile,
    HOOKS_LINE: hooks ? '; the hooks in `.claude/settings.json` (reminder after edits, stop gate while the verifier is red)' : '',
  }
  return t.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => values[k] ?? m)
}

const entryCreated = write(entry, fill('ENTRY.md'))
write(`${docsDir}/OVERVIEW.md`, fill('OVERVIEW.md'))
write(`${docsDir}/RULES.md`, fill('RULES.md'))
write(`${docsDir}/KNOWN-ISSUES.md`, fill('KNOWN-ISSUES.md'))
const changelogCreated = write(`${docsDir}/CHANGELOG.md`, fill('CHANGELOG.md'))

/* -------------------------------------------------------------- tools -- */

const toolsAbs = join(root, toolsDir)
const toolsExisted = existsSync(join(toolsAbs, 'verify-docs.mjs'))
if (!toolsExisted || updateTools) {
  if (!dryRun) cpSync(TOOLS_SRC, toolsAbs, { recursive: true, force: updateTools, errorOnExist: false })
  done.push(`${toolsDir}/ (${toolsExisted ? 'updated' : 'copied'})`)
} else {
  skipped.push(`${toolsDir}/ (exists; --update-tools to upgrade)`)
}

/* -------------------------------------------------------------- hooks -- */

if (hooks) {
  const rel = '.claude/settings.json'
  const abs = join(root, rel)
  let settings = {}
  let readable = true
  if (existsSync(abs)) {
    try { settings = JSON.parse(readFileSync(abs, 'utf8')) } catch {
      readable = false
      skipped.push(`${rel} (not valid JSON — hooks NOT merged, add them by hand: see ${toolsDir}/README.md)`)
    }
  }
  if (readable) {
    settings.hooks ??= {}
    const command = (file) => `node "\${CLAUDE_PROJECT_DIR:-.}/${toolsDir}/hooks/${file}"`
    const has = (event, file) => (settings.hooks[event] ?? [])
      .some((group) => (group.hooks ?? []).some((h) => String(h.command ?? '').includes(`hooks/${file}`)))
    let changed = false
    if (!has('PostToolUse', 'docs-reminder.mjs')) {
      (settings.hooks.PostToolUse ??= []).push({
        matcher: 'Edit|Write|MultiEdit|NotebookEdit',
        hooks: [{ type: 'command', command: command('docs-reminder.mjs'), timeout: 15, statusMessage: 'Living docs: reminder' }],
      })
      changed = true
    }
    if (!has('Stop', 'docs-stop-gate.mjs')) {
      (settings.hooks.Stop ??= []).push({
        hooks: [{ type: 'command', command: command('docs-stop-gate.mjs'), timeout: 60, statusMessage: 'Living docs: verifier' }],
      })
      changed = true
    }
    if (changed) {
      if (!dryRun) { mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, `${JSON.stringify(settings, null, 2)}\n`) }
      done.push(`${rel} (hooks merged)`)
    } else {
      skipped.push(`${rel} (hooks already present)`)
    }
  }
}

/* ------------------------------------------------------------ summary -- */

const prefix = dryRun ? '[dry-run] ' : ''
console.log(`${prefix}Living docs for "${name}" at ${root}`)
if (done.length) console.log(`${prefix}created:\n  ${done.join('\n  ')}`)
if (skipped.length) console.log(`${prefix}left as is:\n  ${skipped.join('\n  ')}`)
console.log('\nNext:')
if (!entryCreated) console.log(`  - ${entry} already existed: merge into it the sections of ${join(TEMPLATES, 'ENTRY.md')} (search order, doc map, conventions, critical traps, checks before handing off).`)
if (!changelogCreated) console.log(`  - ${docsDir}/CHANGELOG.md already existed: make sure its top entry is "## ${version} — …" (or bump ${versionFile} and add one).`)
console.log(`  - write the overview, the map of the work and the critical traps from the work itself; add topic docs and maps (templates: ${TEMPLATES});`)
console.log('  - declare map collectors in living-docs.json → maps;')
console.log(`  - run: node ${toolsDir}/verify-docs.mjs`)
