#!/usr/bin/env node
/* PostToolUse hook (Edit|Write|MultiEdit|NotebookEdit).

   After an edit to a WORK file (config work.include minus work.exclude, never
   the docs, the history, the entry file, VERSION, the config or the tools),
   reminds the agent once per version cycle: bump the version, add a changelog
   entry, run the change sweep, run the verifier. Separately and by name,
   reminds about every map whose watched files were touched — a registry that
   lags behind the work is worse than none.

   Deduplicated by marker files in the OS temp dir, keyed by project, VERSION
   and reminder: after a version bump each reminder fires once again.
   Silent when the project has no living-docs.json. */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { tmpdir } from 'node:os'
import {
  findRoot, loadConfig, readVersion, compileGlobs, watchGlobsOf, toPosix, shortHash, CONFIG_NAME,
} from '../lib.mjs'

let event = {}
try { event = JSON.parse(readFileSync(0, 'utf8')) } catch { process.exit(0) }
const file = event?.tool_input?.file_path ?? event?.tool_input?.notebook_path ?? ''
if (!file) process.exit(0)

const root = findRoot([])
if (!root) process.exit(0)
let cfg
try { cfg = loadConfig(root, []) } catch { process.exit(0) }
if (cfg.hooks?.reminder === false) process.exit(0)

const rel = toPosix(relative(root, resolve(event.cwd ?? root, file)))
if (!rel || rel.startsWith('..')) process.exit(0)

/* Editing the documentation system itself is not a change to the work. The
   folders of the docs globs are excluded whole (plans, archive, changelog). */
const docFolders = cfg.docs.map((g) => g.replace(/\/[^/]*[*?{].*$/, '/**'))
const notWork = compileGlobs([
  ...cfg.docs, ...docFolders, ...cfg.history, cfg.entry, cfg.version?.file, cfg.changelog?.file,
  CONFIG_NAME, `${cfg.toolsDir}/**`, '.claude/**', ...(cfg.work.exclude ?? []),
].filter(Boolean))
if (notWork(rel)) process.exit(0)

const version = readVersion(root, cfg) ?? 'unversioned'
const once = (key) => {
  const marker = join(tmpdir(), `living-docs-${shortHash(root)}-${key.replace(/[^\w.-]/g, '_')}-${version.replace(/[^\w.]/g, '_')}`)
  if (existsSync(marker)) return false
  try { writeFileSync(marker, String(Date.now())) } catch { /* temp dir not writable: remind every time */ }
  return true
}

const lines = []
const tools = cfg.toolsDir

if (compileGlobs(cfg.work.include)(rel) && once('sweep')) {
  lines.push([
    `Living docs: a work file changed (${rel}) at version ${version}. Before handing off (entry file → checks before handing off):`,
    `1) re-read and bump ${cfg.version?.file ?? 'the version'}, add an entry at the top of ${cfg.changelog?.file ?? 'the changelog'};`,
    '2) change sweep — for every name you added, renamed or removed, grep the docs (history excluded) and settle EVERY hit: confirmed or fixed;',
    '3) add or remove map rows for added or removed registry items;',
    '4) refresh the header stamp and TL;DR of docs whose substance changed;',
    `5) node ${tools}/verify-docs.mjs must be green.`,
    'This reminder fires once per version.',
  ].join(' '))
}

for (const map of cfg.maps ?? []) {
  if (!map.doc || !compileGlobs(watchGlobsOf(map))(rel)) continue
  if (!once(`map-${map.doc}`)) continue
  lines.push(`Living docs: ${rel} is watched by the map ${map.doc} (${map.label ?? 'registry'}). Added, renamed or removed ${map.label ?? 'items'} must appear in that map in the same change; the verifier recounts it (check F).`)
}

if (!lines.length) process.exit(0)
console.log(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: lines.join('\n') },
}))
