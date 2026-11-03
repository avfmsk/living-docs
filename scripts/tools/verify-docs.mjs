#!/usr/bin/env node
/* ============================================================================
   LIVING DOCS — mechanical documentation regression.

   Checks what a machine can check and stays out of meaning:

     A. VERSION equals the top entry of the changelog: every change bumps the
        version and leaves an entry, newest on top.
     B. Every topic doc carries the header stamp
        "> <verifiedLabel>: v<version> · <date>", and no stamp promises a
        version newer than the current one.
     C. Paths in backticks exist in the project. Globs must match something,
        `{a,b}` braces expand, short forms resolve through paths.roots and by
        suffix. Paths inside commands (`node tools/x.mjs --flag`) count too:
        a dead command is harmful.
     D. Names in backticks (shape set by names.pattern, e.g. camelCase
        identifiers or capitalised character names) occur in the sources.
        Catches renamed and deleted things — the drift people miss most.
        Legitimate absences live in names.knownAbsent WITH a reason, and an
        exception whose name has reappeared is reported for removal.
     E. Size hygiene. E1: TL;DR within the first N lines. E2: at most K
        spot-check stamps. E3: the live changelog keeps at most S series.
     F. Maps are complete: every item a collector recounts from the work is
        named in its map doc. A collector that finds nothing is reported as
        well — a blind check is worse than none.
     G. The entry file exists and names every topic doc: an unlisted doc is
        invisible to the next reader.

   History is checked by A and E3 only: the changelog and the archives
   describe the past, and what they mention may rightly have disappeared.

   Meaning ("is this statement still true?") is not checked — that is the
   change sweep described in the project's entry file.

   Usage:  node verify-docs.mjs [--root <dir>] [--config <file>]
   Exit:   0 green · 1 problems found · 2 configuration error
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  CONFIG_NAME, DEFAULTS, findRoot, loadConfig, readVersion, walk, compileGlobs, expandBraces,
  globToRegexSource, cmpVersion, escapeRx, collectItems,
} from './lib.mjs'

const argv = process.argv.slice(2)
const root = findRoot(argv)
if (!root) {
  console.error(`living-docs: no ${CONFIG_NAME} found — pass --root <dir> or --config <file>`)
  process.exit(2)
}
let cfg
try { cfg = loadConfig(root, argv) } catch (e) {
  console.error(`living-docs: cannot read ${CONFIG_NAME}: ${e.message}`)
  process.exit(2)
}

const { files: repoFiles, dirs: repoDirs } = walk(root, cfg.skipDirs)
const fileSet = new Set(repoFiles)
const dirSet = new Set(repoDirs)
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const exists = (rel) => fileSet.has(rel) || dirSet.has(rel) || existsSync(join(root, rel))

const problems = []
const note = (file, line, text) => problems.push({ file, line, text })
const lineAt = (text, index) => text.slice(0, index).split('\n').length

const isHistory = compileGlobs(cfg.history)
const topicDocs = repoFiles.filter(compileGlobs(cfg.docs)).filter((f) => !isHistory(f)).sort()
const verRx = cfg.version.pattern

/* ------------------------------------------------- A. VERSION ↔ changelog -- */

const version = readVersion(root, cfg)
if (cfg.version.file) {
  if (version === null) note(cfg.version.file, 1, 'version file is missing (config: version.file)')
  else if (!new RegExp(`^${verRx}$`, 'u').test(version)) {
    note(cfg.version.file, 1, `"${version}" does not match version.pattern ${verRx}`)
  }
}

if (cfg.changelog.file) {
  if (!exists(cfg.changelog.file)) {
    note(cfg.changelog.file, 1, 'changelog is missing (config: changelog.file)')
  } else {
    const lines = read(cfg.changelog.file).split('\n')
    const entryRx = new RegExp(`^## v?(${verRx})(?=\\s|$)`, 'u')
    const first = lines.findIndex((l) => entryRx.test(l))
    if (first < 0) {
      note(cfg.changelog.file, 1, 'no entry headed "## <version> — <date> — <title>"')
    } else if (version) {
      const top = entryRx.exec(lines[first])[1]
      if (top !== version) {
        note(cfg.changelog.file, first + 1,
          `top entry is ${top}, but ${cfg.version.file} says ${version} — the entry for the current change is missing, or the version was not bumped`)
      }
    }

    /* E3. Rolling changelog: the live file keeps the current and previous series. */
    const series = new Set()
    for (const l of lines) {
      const m = entryRx.exec(l)
      if (m) series.add(m[1].split('.').slice(0, cfg.changelog.seriesSegments).join('.'))
    }
    if (cfg.changelog.maxSeries && series.size > cfg.changelog.maxSeries) {
      note(cfg.changelog.file, 1,
        `${series.size} series in the live file (${[...series].join(', ')}), allowed ${cfg.changelog.maxSeries} — cut the older ones: node ${cfg.toolsDir}/roll-changelog.mjs`)
    }
  }
}

/* ---------------------------------------------------- corpus for check D -- */

let idents = new Set()
let corpus = ''
if (cfg.names.check) {
  /* The tools and the config name things too (exceptions, examples) — they are
     not the project's sources. */
  const own = compileGlobs([`${cfg.toolsDir}/**`, CONFIG_NAME])
  const sources = repoFiles.filter(compileGlobs(cfg.names.sources)).filter((f) => !own(f))
  if (!sources.length) {
    note(CONFIG_NAME, 1, 'names.check is on, but names.sources matches no files — the check is blind')
  }
  corpus = sources.map(read).join('\n')
  idents = new Set(corpus.match(/[\p{L}_$][\p{L}\p{N}_$]*/gu) ?? [])
  for (const [name, why] of Object.entries(cfg.names.knownAbsent ?? {})) {
    if (idents.has(name)) {
      note(CONFIG_NAME, 1, `"${name}" is listed in names.knownAbsent (${why}) but now exists in the sources — remove the exception`)
    }
  }
}
const nameShape = new RegExp(cfg.names.pattern, 'u')
/* Config keys (`knownAbsent`, `stopGate`…) are named in the docs of the system
   itself and are not the project's names. */
const configKeys = (o) => Object.entries(o).flatMap(([k, v]) =>
  [k, ...(v && typeof v === 'object' && !Array.isArray(v) ? configKeys(v) : [])])
const ignoredNames = new Set([...(cfg.names.ignore ?? []), ...configKeys(DEFAULTS)])
const knownAbsent = cfg.names.knownAbsent ?? {}

/* ------------------------------------------------- B, E1, E2: the header -- */

const H = cfg.header
const stampVersion = `(?:v?(${verRx}))?`
const verifiedRx = new RegExp(`${escapeRx(H.verifiedLabel)}\\s*:?\\s*${stampVersion}`, 'giu')
const spotRx = new RegExp(`${escapeRx(H.spotLabel)}\\s*${stampVersion}`, 'giu')
const tldrRx = new RegExp(escapeRx(H.tldrLabel), 'iu')

for (const rel of topicDocs) {
  const head = read(rel).split('\n').slice(0, H.withinLines).join('\n')
  const verified = [...head.matchAll(verifiedRx)]
  const spots = [...head.matchAll(spotRx)]

  if (!verified.length) {
    note(rel, 1, `no header stamp "> ${H.verifiedLabel}: v<version> · <date>" in the first ${H.withinLines} lines`)
  }
  if (version) {
    for (const m of [...verified, ...spots]) {
      if (m[1] && cmpVersion(m[1], version) > 0) {
        note(rel, lineAt(head, m.index), `stamp promises v${m[1]}, but the current version is ${version}`)
      }
    }
  }
  if (spots.length > H.maxSpotStamps) {
    note(rel, 1, `${spots.length} "${H.spotLabel}" stamps — keep the ${H.maxSpotStamps} freshest, delete the rest (the history of checks is in the changelog)`)
  }
  if (!tldrRx.test(head)) {
    note(rel, 1, `no ${H.tldrLabel} in the first ${H.withinLines} lines — the top of a doc must answer instead of the whole doc`)
  }
}

/* ------------------------------------------- C, D: paths and names in use -- */

/* Not checkable: placeholders (`<id>`, `…`), home and relative paths, URLs and
   domains, absolute paths (often URL routes rather than files). Folders written
   with a trailing slash are not checked either: docs use them for servers,
   archives and remote sites as often as for the project. */
const UNCHECKABLE = /[<>…]|^~\/|^\.\.?\/|^[a-z][a-z0-9+.-]*:|:\/\/|^\//iu
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+\//iu
const extensions = new Set(cfg.paths.extensions.map((e) => e.toLowerCase()))

function looksLikePath(p) {
  if (!p.includes('/') || UNCHECKABLE.test(p) || DOMAIN.test(p)) return false
  if (cfg.paths.ignorePrefixes.some((x) => p.startsWith(x))) return false
  if (/\/\*{1,2}$/.test(p)) return true
  const ext = /\.([A-Za-z0-9]+)\}?$/.exec(p)
  return Boolean(ext && extensions.has(ext[1].toLowerCase()))
}

function pathExists(candidate) {
  const clean = candidate.replace(/\/+$/, '')
  if (!clean) return true
  if (/[*?]/.test(clean)) {
    const rx = new RegExp(`(^|/)${globToRegexSource(clean)}(/|$)`, 'u')
    return repoFiles.some((f) => rx.test(f)) || repoDirs.some((d) => rx.test(d))
  }
  if (cfg.paths.roots.some((r) => exists(r + clean))) return true
  return repoFiles.some((f) => f.endsWith(`/${clean}`)) || repoDirs.some((d) => d.endsWith(`/${clean}`))
}

const refDocs = [...new Set([cfg.entry, ...topicDocs].filter((f) => f && exists(f)))]
for (const rel of refDocs) {
  read(rel).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const parts = m[1].trim().split(/\s+/)
        .map((p) => p.replace(/^["'(]+|["'),;]+$/g, '').replace(/:\d+(?::\d+)?$/, '').replace(/:$/, ''))

      if (cfg.paths.check) {
        for (const p of parts) {
          if (!looksLikePath(p)) continue
          const missing = expandBraces(p).filter((x) => !pathExists(x))
          if (missing.length) note(rel, i + 1, `path does not exist: ${missing.join(', ')}`)
        }
      }

      if (cfg.names.check && parts.length === 1 && !parts[0].includes('/')) {
        const bare = parts[0].replace(/\(\)$/, '').split(/[.#:]/).pop() ?? ''
        if (bare.length < cfg.names.minLength || !nameShape.test(bare)) continue
        if (ignoredNames.has(bare) || Object.hasOwn(knownAbsent, bare)) continue
        /* Second chance by substring: a doc may name `retryAt` while the
           source spells `retryAtMs`; that is not drift. */
        if (!idents.has(bare) && !corpus.includes(bare)) note(rel, i + 1, `name not found in the sources: ${bare}`)
      }
    }
  })
}

/* --------------------------------------------------- F. maps are complete -- */

for (const map of cfg.maps ?? []) {
  const label = map.label ?? 'items'
  if (!map.doc || !exists(map.doc)) {
    note(map.doc ?? CONFIG_NAME, 1, `map doc is missing (declared in ${CONFIG_NAME} → maps)`)
    continue
  }
  let items
  try {
    items = collectItems(map.collect, { repoFiles, repoDirs, read })
  } catch (e) {
    note(CONFIG_NAME, 1, `map ${map.doc}: collector failed — ${e.message}`)
    continue
  }
  if (!items.length && !map.allowEmpty) {
    note(CONFIG_NAME, 1, `map ${map.doc} (${label}): the collector found nothing — the check is blind; fix the collector or set "allowEmpty": true`)
    continue
  }
  const text = read(map.doc)
  const needle = map.needle ?? '{item}'
  const missing = items.filter((it) => !text.includes(needle.replaceAll('{item}', it)))
  if (missing.length) {
    const shown = missing.slice(0, 10).join(', ')
    const more = missing.length > 10 ? ` … and ${missing.length - 10} more` : ''
    note(map.doc, 1, `${label} exist in the work but not in this map: ${shown}${more}${map.hint ? ` — ${map.hint}` : ''}`)
  }
}

/* ------------------------------------------------ G. entry lists all docs -- */

if (cfg.entry) {
  if (!exists(cfg.entry)) {
    note(cfg.entry, 1, 'entry file is missing (config: entry)')
  } else if (cfg.entryMustListDocs) {
    const text = read(cfg.entry)
    const unlisted = topicDocs.filter((d) => !text.includes(d))
    if (unlisted.length) {
      note(cfg.entry, 1, `topic docs missing from the doc map: ${unlisted.join(', ')} — an unlisted doc is invisible to the next reader`)
    }
  }
}

/* ------------------------------------------------------------- result -- */

if (!problems.length) {
  console.log(`Living docs: no discrepancies (version ${version ?? '—'}, topic docs ${topicDocs.length}, maps ${(cfg.maps ?? []).length}).`)
  process.exit(0)
}
const byFile = new Map()
for (const p of problems) {
  if (!byFile.has(p.file)) byFile.set(p.file, [])
  byFile.get(p.file).push(p)
}
for (const [file, list] of byFile) {
  console.log(`\n${file}`)
  for (const p of list) console.log(`  ${file}:${p.line}  ${p.text}`)
}
console.log(`\nProblems: ${problems.length}. Each one is a fix in a doc, in the work, or in the config with a stated reason — never silenced.`)
process.exit(1)
