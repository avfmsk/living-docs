/* Living Docs — shared helpers for the verifier, the hooks and the changelog
   roller. Node 18+, no dependencies. This folder is copied into the project, so
   the project owns its copy and keeps working without the skill that made it. */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { resolve, join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CONFIG_NAME = 'living-docs.json'

/** Defaults. A project's living-docs.json overrides any of them: objects merge
    key by key, arrays and scalars replace. Reference: README.md next to this file. */
export const DEFAULTS = {
  project: '',
  toolsDir: 'tools/living-docs',
  entry: 'CLAUDE.md',
  entryMustListDocs: true,
  docs: ['docs/*.md'],
  history: ['docs/CHANGELOG.md', 'docs/changelog/**', 'docs/archive/**'],
  version: { file: 'VERSION', pattern: '\\d+(?:\\.\\d+){1,3}' },
  changelog: { file: 'docs/CHANGELOG.md', archiveDir: 'docs/changelog', maxSeries: 2, seriesSegments: 2 },
  header: {
    verifiedLabel: 'Verified against source',
    spotLabel: 'spot-checked',
    maxSpotStamps: 3,
    tldrLabel: 'TL;DR',
    withinLines: 40,
  },
  paths: {
    check: true,
    roots: [''],
    ignorePrefixes: [],
    extensions: [
      'md', 'mdx', 'txt', 'rst', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'csv', 'tsv', 'xml', 'ini', 'env',
      'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'cs', 'php',
      'c', 'h', 'cpp', 'sh', 'sql', 'css', 'scss', 'html', 'vue', 'svelte',
      'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'ico', 'pdf', 'docx', 'xlsx', 'pptx', 'key', 'pages',
      'fig', 'sketch', 'psd', 'ai', 'indd', 'afdesign', 'mp4', 'mov', 'mp3', 'wav',
      'ttf', 'otf', 'woff', 'woff2', 'epub', 'fountain', 'tex', 'bib',
    ],
  },
  names: {
    check: false,
    pattern: '^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$',
    minLength: 6,
    sources: ['**/*.{ts,tsx,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,cs,php,vue,svelte}'],
    ignore: [],
    knownAbsent: {},
  },
  maps: [],
  work: { include: ['**'], exclude: [] },
  skipDirs: [
    '.git', 'node_modules', '.next', '.nuxt', '.svelte-kit', '.venv', 'venv', '__pycache__',
    '.cache', '.turbo', 'coverage', 'dist', 'build', '.DS_Store',
  ],
  hooks: { reminder: true, stopGate: true },
}

/* ------------------------------------------------------------ config -- */

const argOf = (argv, name) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined
}

/** Project root: --root, else the folder of --config, else the nearest folder
    holding living-docs.json above $CLAUDE_PROJECT_DIR, the cwd, or this file. */
export function findRoot(argv = []) {
  const explicit = argOf(argv, '--root')
  if (explicit) return resolve(explicit)
  const config = argOf(argv, '--config')
  if (config) return dirname(resolve(config))
  const starts = [process.env.CLAUDE_PROJECT_DIR, process.cwd(), dirname(fileURLToPath(import.meta.url))]
  for (const start of starts.filter(Boolean)) {
    let dir = resolve(start)
    for (;;) {
      if (existsSync(join(dir, CONFIG_NAME))) return dir
      const up = dirname(dir)
      if (up === dir) break
      dir = up
    }
  }
  return null
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function deepMerge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? base : over
  const out = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = isPlainObject(v) && isPlainObject(base[k]) ? deepMerge(base[k], v) : v
  return out
}

export function loadConfig(root, argv = []) {
  const file = argOf(argv, '--config') ? resolve(argOf(argv, '--config')) : join(root, CONFIG_NAME)
  const user = JSON.parse(readFileSync(file, 'utf8'))
  return deepMerge(DEFAULTS, user)
}

/** Current version string, or null when versioning is off or the file is missing. */
export function readVersion(root, cfg) {
  if (!cfg.version?.file) return null
  const p = join(root, cfg.version.file)
  return existsSync(p) ? readFileSync(p, 'utf8').trim() : null
}

/* ------------------------------------------------------------- files -- */

export const toPosix = (p) => p.split(sep).join('/')
export const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])

/** Every file and folder under root, as posix paths relative to root.
    Folders named in skipDirs are not entered. Symlinked folders are listed
    but not entered (no cycles). */
export function walk(root, skipDirs = DEFAULTS.skipDirs) {
  const skip = new Set(skipDirs)
  const files = []
  const dirs = []
  const rec = (abs, rel) => {
    let entries
    try { entries = readdirSync(abs, { withFileTypes: true }) } catch { return }
    for (const d of entries) {
      if (skip.has(d.name)) continue
      const r = rel ? `${rel}/${d.name}` : d.name
      if (d.isDirectory()) { dirs.push(r); rec(join(abs, d.name), r) }
      else if (d.isFile()) files.push(r)
      else if (d.isSymbolicLink()) {
        try {
          const st = statSync(join(abs, d.name))
          if (st.isFile()) files.push(r)
          else if (st.isDirectory()) dirs.push(r)
        } catch { /* broken link */ }
      }
    }
  }
  rec(root, '')
  return { files, dirs }
}

/* ------------------------------------------------------------- globs -- */

export const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** `a/{x,y}.md` → [`a/x.md`, `a/y.md`], nested braces included. */
export function expandBraces(p) {
  const m = /\{([^{}]+)\}/.exec(p)
  if (!m) return [p]
  return m[1].split(',').flatMap((part) =>
    expandBraces(p.slice(0, m.index) + part.trim() + p.slice(m.index + m[0].length)))
}

/** Glob without braces → regex source. `*` and `?` stay inside one path
    segment, `**` crosses segments; `**` followed by a slash also matches
    zero segments (so `**` + `/*.md` finds root files too). */
export function globToRegexSource(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const segmentStart = i === 0 || glob[i - 1] === '/'
        if (segmentStart && glob[i + 2] === '/') { re += '(?:[^/]+/)*'; i += 2 }
        else { re += '.*'; i += 1 }
      } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else re += escapeRx(c)
  }
  return re
}

/** Compile one glob or a list into a predicate over posix relative paths. */
export function compileGlobs(globs) {
  const list = toArray(globs).flatMap(expandBraces)
  if (!list.length) return () => false
  const rx = new RegExp(`^(?:${list.map(globToRegexSource).join('|')})$`, 'u')
  return (rel) => rx.test(rel)
}

/* ---------------------------------------------------------- versions -- */

/** Compare dotted numeric versions of any length: -1, 0, 1. */
export function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/* -------------------------------------------------------- collectors -- */

/** Remove comments before matching, so a file that merely MENTIONS a pattern
    in a comment is not counted. Modes: "c" (block and whole-line //),
    "hash" (whole-line #), "html" (<!-- -->); a list combines them. */
export function stripComments(text, mode) {
  if (!mode) return text
  const modes = mode === true ? ['c'] : toArray(mode)
  let t = text
  if (modes.includes('c')) t = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  if (modes.includes('hash')) t = t.replace(/^\s*#.*$/gm, '')
  if (modes.includes('html')) t = t.replace(/<!--[\s\S]*?-->/g, '')
  return t
}

/** Dotted paths of leaf keys. Keys starting with `$` are metadata; an object
    holding `$value` or `value` is a leaf (design-token convention). */
function leafPaths(node, prefix = '') {
  const out = []
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue
    const path = prefix ? `${prefix}.${k}` : k
    if (isPlainObject(v) && !('$value' in v) && !('value' in v)) out.push(...leafPaths(v, path))
    else out.push(path)
  }
  return out
}

/** `match` (regex) filters and captures; `item` is a template with $0…$9. */
function transform(raw, c) {
  if (!c.match) return c.item ? c.item.replace(/\$0/g, raw) : raw
  const m = new RegExp(c.match, 'u').exec(raw)
  if (!m) return null
  return (c.item ?? '$0').replace(/\$(\d)/g, (_, d) => m[Number(d)] ?? '')
}

/** Items a map must name, recounted from the work. `spec` is one collector or
    a list (union). ctx: { repoFiles, repoDirs, read(rel) }. */
export function collectItems(spec, ctx) {
  const out = []
  for (const c of toArray(spec)) {
    let raws = []
    if (c.type === 'files') {
      let files = ctx.repoFiles.filter(compileGlobs(c.glob))
      if (c.contains) {
        const rx = new RegExp(c.contains, (c.flags ?? 'u').replace('g', ''))
        files = files.filter((f) => rx.test(stripComments(ctx.read(f), c.stripComments)))
      }
      raws = files
    } else if (c.type === 'dirs') {
      const parent = String(c.parent ?? '').replace(/\/+$/, '')
      raws = ctx.repoDirs.filter((d) => d.startsWith(`${parent}/`) && !d.slice(parent.length + 1).includes('/'))
    } else if (c.type === 'regex') {
      let flags = c.flags ?? 'gmu'
      if (!flags.includes('g')) flags += 'g'
      for (const f of ctx.repoFiles.filter(compileGlobs(c.glob))) {
        const body = stripComments(ctx.read(f), c.stripComments)
        for (const m of body.matchAll(new RegExp(c.pattern, flags))) raws.push(m[c.group ?? 1] ?? m[0])
      }
    } else if (c.type === 'jsonKeys') {
      let node = JSON.parse(ctx.read(c.file))
      for (const k of c.pointer ? String(c.pointer).split('.') : []) node = node?.[k]
      if (!isPlainObject(node)) throw new Error(`pointer "${c.pointer ?? ''}" is not an object in ${c.file}`)
      raws = c.leaves ? leafPaths(node) : Object.keys(node).filter((k) => !k.startsWith('$'))
    } else {
      throw new Error(`unknown collector type "${c.type}" (files, dirs, regex, jsonKeys)`)
    }
    const exclude = c.exclude ? new RegExp(c.exclude, 'u') : null
    for (const raw of raws) {
      if (exclude?.test(raw)) continue
      const v = transform(raw, c)
      if (v) out.push(v)
    }
  }
  return [...new Set(out)]
}

/** Files whose edit should remind about a map: `watch`, else what the
    collector reads. */
export function watchGlobsOf(map) {
  if (map.watch) return toArray(map.watch)
  return toArray(map.collect).flatMap((c) => {
    if (c.type === 'dirs') return [`${String(c.parent).replace(/\/+$/, '')}/**`]
    if (c.type === 'jsonKeys') return [c.file]
    return toArray(c.glob)
  })
}

/* -------------------------------------------------------------- misc -- */

export function shortHash(s) {
  let h = 5381
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0
  return h.toString(36)
}
