#!/usr/bin/env node
/* Stop hook: before the agent ends its turn, runs the documentation
   regression (verify-docs.mjs). Red regression = the turn does not end; the
   list of problems goes back to the agent (exit 2 + stderr).

   Loop guard: when stop_hook_active is set (the turn already continued because
   of this hook), it lets the turn end. Silent when the project has no
   living-docs.json or the gate is switched off (hooks.stopGate: false). */
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { findRoot, loadConfig } from '../lib.mjs'

let active = false
try { active = JSON.parse(readFileSync(0, 'utf8'))?.stop_hook_active === true } catch { /* no event */ }
if (active) process.exit(0)

const root = findRoot([])
if (!root) process.exit(0)
let cfg
try { cfg = loadConfig(root, []) } catch (e) {
  console.error(`Living docs: living-docs.json is unreadable (${e.message}). Fix it before finishing the turn.`)
  process.exit(2)
}
if (cfg.hooks?.stopGate === false) process.exit(0)

const verifier = join(root, cfg.toolsDir, 'verify-docs.mjs')
if (!existsSync(verifier)) process.exit(0)

try {
  execFileSync(process.execPath, [verifier, '--root', root], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], timeout: 55_000,
  })
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
  const what = e.status === 1 ? 'The documentation regression is red' : 'The documentation verifier failed to run'
  console.error(`Living docs: ${what} (node ${cfg.toolsDir}/verify-docs.mjs). Fix before finishing the turn:\n${out}`)
  process.exit(2)
}
