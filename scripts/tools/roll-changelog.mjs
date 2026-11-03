#!/usr/bin/env node
/* Rolling changelog: keeps the newest `changelog.maxSeries` series in the live
   file and moves every older series into its own slice
   `<archiveDir>/ARCHIVE-<oldest>-<newest>.md` (newest entries on top).

   A series is the first `changelog.seriesSegments` segments of the version
   (2 → MAJOR.MINOR). An entry is everything from its "## <version>" heading to
   the next one. The text above the first entry (title, intro) stays in place.
   If a slice for the same series already exists, entries are merged (no
   duplicates) and the slice is renamed to the new range.

   Usage:  node roll-changelog.mjs [--root <dir>] [--config <file>] [--dry-run]
   Run the verifier afterwards. */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG_NAME, findRoot, loadConfig, cmpVersion } from './lib.mjs'

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const root = findRoot(argv)
if (!root) { console.error(`living-docs: no ${CONFIG_NAME} found`); process.exit(2) }
const cfg = loadConfig(root, argv)
const { file, archiveDir, maxSeries, seriesSegments } = cfg.changelog
if (!file || !archiveDir) { console.error('living-docs: changelog.file and changelog.archiveDir must be set'); process.exit(2) }

const entryRx = new RegExp(`^## v?(${cfg.version.pattern})(?=\\s|$)`, 'u')
const seriesOf = (v) => v.split('.').slice(0, seriesSegments).join('.')
const dateOf = (heading) => /\b(\d{4}-\d{2}-\d{2})\b/.exec(heading)?.[1] ?? null

/** Split a changelog into its preamble and entries. */
function parse(text) {
  const lines = text.split('\n')
  const preamble = []
  const entries = []
  for (const line of lines) {
    const m = entryRx.exec(line)
    if (m) entries.push({ version: m[1], heading: line, lines: [line] })
    else if (entries.length) entries[entries.length - 1].lines.push(line)
    else preamble.push(line)
  }
  return { preamble, entries }
}
const body = (e) => e.lines.join('\n').replace(/\s+$/, '')

const livePath = join(root, file)
const { preamble, entries } = parse(readFileSync(livePath, 'utf8'))

const order = []
for (const e of entries) if (!order.includes(seriesOf(e.version))) order.push(seriesOf(e.version))
const keep = new Set(order.slice(0, maxSeries))
const moving = order.filter((s) => !keep.has(s))
if (!moving.length) {
  console.log(`Changelog: ${order.length} series, limit ${maxSeries} — nothing to roll.`)
  process.exit(0)
}

const archiveAbs = join(root, archiveDir)
const existing = existsSync(archiveAbs) ? readdirSync(archiveAbs) : []
const project = cfg.project ? `${cfg.project} — ` : ''

for (const series of moving) {
  let group = entries.filter((e) => seriesOf(e.version) === series)
  const prefix = `ARCHIVE-${series}.`
  const old = existing.find((n) => n.startsWith(prefix) && n.endsWith('.md'))
  if (old) {
    const known = new Set(group.map((e) => e.version))
    group = group.concat(parse(readFileSync(join(archiveAbs, old), 'utf8')).entries.filter((e) => !known.has(e.version)))
  }
  group.sort((a, b) => cmpVersion(b.version, a.version))
  const newest = group[0]
  const oldest = group[group.length - 1]
  const name = `ARCHIVE-${oldest.version}-${newest.version}.md`
  const dates = [dateOf(oldest.heading), dateOf(newest.heading)].filter(Boolean)
  const span = dates.length === 2 ? ` (${dates[0]} … ${dates[1]})` : ''
  const text = [
    `# ${project}CHANGELOG, archive ${oldest.version} – ${newest.version}${span}`,
    '',
    `Older part of the history. Recent entries: \`${file}\`.`,
    '',
    '---',
    '',
    group.map(body).join('\n\n'),
    '',
  ].join('\n')
  console.log(`${dryRun ? '[dry-run] ' : ''}${archiveDir}/${name}: ${group.length} entries of series ${series}${old && old !== name ? ` (merged from ${old})` : ''}`)
  if (dryRun) continue
  mkdirSync(archiveAbs, { recursive: true })
  if (old && old !== name) renameSync(join(archiveAbs, old), join(archiveAbs, name))
  writeFileSync(join(archiveAbs, name), text)
}

const kept = entries.filter((e) => keep.has(seriesOf(e.version)))
const live = `${preamble.join('\n').replace(/\s+$/, '')}\n\n${kept.map(body).join('\n\n')}\n`
console.log(`${dryRun ? '[dry-run] ' : ''}${file}: keeps ${kept.length} entries of series ${[...keep].join(', ')}`)
if (!dryRun) writeFileSync(livePath, live)
