export const meta = {
  name: 'sweep',
  description: 'Scan the whole codebase for security, cleanup, accessibility or duplication issues with one scanner per area, and have a separate agent check every finding before reporting it',
  whenToUse: 'Whole-codebase or folder scans; /secure, /cleanup, /a11y and /dry run it. Pass args {kinds, scope, paths}; kinds is any of secure, cleanup, a11y, dry (default: all). Reports only: nothing is changed.',
  phases: [
    { title: 'Map', detail: 'split the code into areas of similar size', model: 'sonnet' },
    { title: 'Scan', detail: 'one read-only scanner per area and kind, in parallel' },
    { title: 'Verify', detail: 'a separate check of every finding (two for critical ones)', model: 'sonnet' },
  ],
}

// args: {
//   kinds?: string[]          any of 'secure', 'cleanup', 'a11y', 'dry'; default all four (a11y only where there is UI code)
//   scope?: string            focus passed to every scanner and verifier, e.g. "auth", "dead-code", "WCAG AAA"
//   paths?: string[]          scan only these files or directories
//   areas?: {name, paths}[]   skip the Map step
//   maxAreas?: number         default 4 for one kind, 3 for several
// }
const KINDS = {
  secure: {
    prefix: 'SEC',
    what: 'security vulnerabilities, exposed secrets and unsafe patterns',
    check: 'How to judge it depends on what it is. A secret is real if a credential-like value (not a placeholder, example or test fixture) sits in a tracked file. A vulnerable dependency is real if the lockfile installs an affected version for production code; how reachable it is only changes the severity. Insecure CORS, header, cookie or session settings are real if they apply in production. Anything else is real only if it can actually be reached: follow the data flow, and check the middleware, validation, framework defaults and config that may already handle it.',
    batch: 5,
  },
  cleanup: {
    prefix: 'CLN',
    what: 'dead code, unused exports, `any` types, debugging leftovers, commented-out code and stale TODOs',
    check: 'Anything called unused or dead is real only if nothing references it anywhere in the repository: search every package, test, script and config file; string references and dynamic imports; framework conventions (route and page files, exports loaded by file path, decorators); and exports from a package entry point that other packages or users import.',
    batch: 10,
  },
  a11y: {
    prefix: 'A11Y',
    ui: true,
    what: 'accessibility problems (WCAG 2.1 AA unless the focus says otherwise)',
    check: 'It is real only if the rendered result has the problem: check the shared component or library the element comes from, since many already provide labels, roles and keyboard handling.',
    batch: 8,
  },
  dry: {
    prefix: 'DRY',
    what: 'duplicated code worth consolidating',
    check: 'It is real only if the copies do the same thing (not just look alike) and consolidating them would not tie together code that changes for different reasons.',
    batch: 8,
  },
}
const isKind = k => Object.prototype.hasOwnProperty.call(KINDS, k)
const words = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,]+/) : []).map(String).filter(Boolean)

let a = args || {}
if (typeof a === 'string') {
  const s = a.trim()
  let parsed = null
  if (/^[{[]/.test(s)) {
    try {
      parsed = JSON.parse(s)
    } catch {}
  }
  if (parsed) a = Array.isArray(parsed) ? { kinds: parsed } : parsed
  else {
    const w = words(s)
    const isPath = x => x.includes('/') || x.startsWith('.')
    a = { kinds: w.filter(isKind), paths: w.filter(x => !isKind(x) && isPath(x)), scope: w.filter(x => !isKind(x) && !isPath(x)).join(' ') }
  }
}
const asked = words(a.kinds)
const unknown = asked.filter(k => !isKind(k))
if (unknown.length) log(`Ignoring unknown kinds: ${unknown.join(', ')}`)
const kinds = asked.length ? [...new Set(asked.filter(isKind))] : Object.keys(KINDS)
if (!kinds.length) throw new Error(`sweep: no known kinds in ${JSON.stringify(a.kinds)}; use any of ${Object.keys(KINDS).join(', ')}`)
const paths = words(a.paths)
const maxAreas = Math.max(1, Math.min(Number(a.maxAreas) || (kinds.length > 1 ? 3 : 4), 8))
const focus = a.scope ? ` Focus: ${a.scope}.` : ''
// Findings from different scanners only merge when they spell paths the same way.
const relative = ' Give every path relative to the repository root, not absolute.'

const AREAS = {
  type: 'object',
  required: ['areas'],
  properties: {
    areas: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'paths', 'files', 'ui'],
        properties: {
          name: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' } },
          files: { type: 'integer' },
          ui: { type: 'boolean' },
        },
      },
    },
  },
}
const FINDINGS = {
  type: 'object',
  required: ['findings', 'summary'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'file', 'issue', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'important', 'minor'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          also: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
          autoFixable: { type: 'boolean' },
        },
      },
    },
    more: { type: 'integer' },
    summary: { type: 'string' },
    coverage: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object',
  required: ['real', 'reason'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}
const VERDICTS = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'real', 'reason'],
        properties: { id: { type: 'string' }, real: { type: 'boolean' }, reason: { type: 'string' } },
      },
    },
  },
}

// "path", "path:12", "path:12-20" or "path:12:5" → { file, line }
const parseLoc = s => {
  const m = String(s).trim().replace(/^\.\//, '').match(/^(.*?)(?::(\d+))?(?:[-–]\d+)?(?::\d+)?$/)
  return { file: m[1], line: m[2] ? Number(m[2]) : null }
}
const fmt = l => `${l.file}${l.line ? `:${l.line}` : ''}`
const brief = f => ({
  id: f.id, kind: f.kind, severity: f.severity, category: f.category, file: f.file, line: f.line,
  also: f.also, issue: f.issue, fix: f.fix, autoFixable: f.autoFixable,
})

// ── Map: split the code into areas, unless the caller already did ──
phase('Map')
let areas = Array.isArray(a.areas) && a.areas.length ? a.areas.map(x => ({ ui: true, files: 0, ...x, paths: words(x.paths) })) : null
if (!areas) {
  const m = await agent(`Split this repository's source code into at most ${maxAreas} areas for parallel scanning${paths.length ? `, looking only at ${paths.join(', ')}` : ''}.

List the tracked files with \`git ls-files\` and leave out what isn't hand-written source: dependencies, lockfiles, build output, generated code, vendored files, fixtures and snapshots, binary assets, and \`.claude/worktrees/\`. Group the rest into areas of similar size along the project's own structure (workspace packages, apps, top-level source folders). Under about 150 source files is one area. Keep a package in one area unless it alone is over 40% of the code.

For each area return a short name, its directories or files (repo-relative), its number of source files, and whether it contains UI code (components, pages, templates, styles). Count files; don't read them.`, { label: 'map', phase: 'Map', schema: AREAS, model: 'sonnet', effort: 'low' })
  if (!m || !m.areas.length) throw new Error('sweep: could not split the codebase into areas')
  areas = m.areas
}
if (areas.length > maxAreas) {
  // Every path still gets scanned: extra areas fold into the smallest ones.
  log(`${areas.length} areas; folding them into ${maxAreas}`)
  const kept = areas.slice(0, maxAreas).map(x => ({ ...x, paths: [...x.paths] }))
  for (const x of areas.slice(maxAreas)) {
    const t = kept.reduce((s, k) => (k.files < s.files ? k : s))
    t.name = `${t.name} + ${x.name}`
    t.paths.push(...x.paths)
    t.files += x.files
    t.ui = t.ui || x.ui
  }
  areas = kept
}

const units = []
const skipped = []
for (const k of kinds) {
  for (const area of areas) {
    if (KINDS[k].ui && !area.ui) skipped.push({ kind: k, area: area.name, reason: 'no UI code' })
    else units.push({ kind: k, area })
  }
  // Work that belongs to no single area gets one scanner of its own.
  if (k === 'secure' && !paths.length) units.push({ kind: k, area: { name: 'repo-wide', paths: [], special: 'repo-wide' } })
  if (k === 'cleanup') units.push({ kind: k, area: { name: 'tooling', paths, special: 'tooling' } })
}
if (skipped.length) log(`Skipped: ${skipped.map(s => `${s.kind} in ${s.area} (${s.reason})`).join(', ')}`)
log(`${areas.length} area(s): ${areas.map(x => x.name).join(', ')} · ${units.length} scanner(s)`)
const emptyResult = () => ({
  kinds, scope: a.scope || null, paths, areas: areas.map(x => x.name), skipped,
  summaries: {}, coverage: [], missingScanners: [], leftOut: 0, confirmed: [], unverified: [], dropped: [],
})
if (!units.length) return emptyResult()

// ── Scan: one read-only scanner per kind and area ──
const scanPrompt = u => {
  if (u.area.special === 'repo-wide') {
    return `Scan-only mode, repo-wide. Cover only what belongs to no area: the dependency audit, tracked env files and secrets in config files, and CI and deploy configuration. Other scanners cover the source code, including CORS, header, cookie and session settings made in code.${focus}${relative} Follow your Scan-Only Mode instructions.`
  }
  if (u.area.special === 'tooling') {
    return `Scan-only mode, tooling. Run the project's own unused-code tooling once${paths.length ? ` for ${paths.join(', ')}` : ''} and report the unused imports and locals it finds. Other scanners cover everything else area by area, without running tools.${focus}${relative} Follow your Scan-Only Mode instructions.`
  }
  const others = areas.filter(o => o !== u.area).map(o => o.name)
  const noRepoWide = u.kind === 'secure' && paths.length ? ' No repo-wide scanner runs for this scope, so also check the tracked env and config files in your area for secrets, and audit any dependency manifest in it.' : ''
  return `Scan-only mode. Look for ${KINDS[u.kind].what} in this area of the codebase: ${u.area.name} (${u.area.paths.join(', ')}).${others.length ? ` Other scanners cover ${others.join(', ')} at the same time.` : ''}${noRepoWide}${focus}${relative} Follow your Scan-Only Mode instructions.`
}

phase('Scan')
// Barrier: the same problem can be reported from two areas (a duplicate seen from both sides), so merge before verifying.
const scans = await parallel(units.map(u => () =>
  agent(scanPrompt(u), { label: `${u.kind}: ${u.area.name}`, phase: 'Scan', agentType: u.kind, schema: FINDINGS })))
const missingScanners = units.filter((u, i) => !scans[i]).map(u => `${u.kind}: ${u.area.name}`)
if (missingScanners.length === units.length) throw new Error('sweep: no scanner returned a result')
if (missingScanners.length) log(`No result from: ${missingScanners.join(', ')}`)
const leftOut = scans.filter(Boolean).reduce((n, s) => n + (s.more || 0), 0)
if (leftOut) log(`Scanners left out ${leftOut} lower-priority finding(s) over their limit`)

// Merge findings of the same kind from different scanners that point at the same code.
// A duplicate can be cited a few lines apart from each side, so dry matches within a window.
const RANK = { critical: 0, important: 1, minor: 2 }
const join = (p, q) => (!q || p.includes(q) ? p : q.includes(p) ? q : `${p} | ${q}`)
const near = (x, y, tol) => x.file === y.file && x.line != null && y.line != null && Math.abs(x.line - y.line) <= tol
const tolerance = kind => (kind === 'dry' ? 5 : 0)
const sameSpot = (g, f) => {
  // Each side of a duplicate cites both ends, so dry needs two locations to line up (one when a side cites only one);
  // a single nearby line is not enough, since short helpers sit next to each other in shared files.
  const matched = f.locs.filter(y => g.locs.some(x => near(x, y, tolerance(f.kind)))).length
  if (matched && matched >= (f.kind === 'dry' ? Math.min(2, f.locs.length, g.locs.length) : 1)) return true
  // Findings without a line match only on file and issue.
  return f.line == null && g.line == null && g.file === f.file && g.issue.slice(0, 80).toLowerCase() === f.issue.slice(0, 80).toLowerCase()
}
const absorb = (g, f) => {
  const first = RANK[f.severity] < RANK[g.severity] ? f : g
  const second = first === f ? g : f
  g.severity = first.severity
  g.issue = join(first.issue, second.issue)
  g.fix = join(first.fix, second.fix)
  g.autoFixable = g.autoFixable === true && f.autoFixable === true ? true : g.autoFixable === undefined && f.autoFixable === undefined ? undefined : false
  for (const l of f.locs) if (!g.locs.some(x => (x.file === l.file && x.line === l.line) || near(x, l, tolerance(g.kind)))) g.locs.push(l)
  for (const u of f.units) g.units.add(u)
  for (const x of f.areas) if (!g.areas.includes(x)) g.areas.push(x)
}
let groups = []
scans.forEach((s, ui) => {
  if (!s) return
  for (const raw of s.findings || []) {
    const primary = parseLoc(raw.line ? `${raw.file}:${raw.line}` : raw.file)
    const f = {
      ...raw,
      file: primary.file,
      kind: units[ui].kind,
      locs: [primary, ...(raw.also || []).map(parseLoc)],
      units: new Set([ui]),
      areas: [units[ui].area.name],
    }
    // A scanner's own findings are distinct from each other, so only merge across scanners.
    const hits = groups.filter(g => g.kind === f.kind && !g.units.has(ui) && sameSpot(g, f))
    if (!hits.length) {
      groups.push(f)
      continue
    }
    // Join the best match; fold in other matches only when they come from different scanners
    // (two findings from one scanner stay apart even if this one touches both).
    const target = hits.find(g => g.severity === f.severity) || hits[0]
    absorb(target, f)
    const folded = []
    for (const h of hits) {
      if (h === target || [...h.units].some(u => target.units.has(u))) continue
      absorb(target, h)
      folded.push(h)
    }
    groups = groups.filter(g => !folded.includes(g))
  }
})
const order = kinds.reduce((o, k, i) => ({ ...o, [k]: i }), {})
groups.sort((x, y) => order[x.kind] - order[y.kind] || RANK[x.severity] - RANK[y.severity] || fmt(x.locs[0]).localeCompare(fmt(y.locs[0])))
const counters = {}
const findings = groups.map(g => {
  counters[g.kind] = (counters[g.kind] || 0) + 1
  const also = g.locs.slice(1).map(fmt)
  return { ...g, id: `${KINDS[g.kind].prefix}-${counters[g.kind]}`, line: g.locs[0].line || undefined, also: also.length ? also : undefined }
})
log(`${findings.length} distinct finding(s) from ${units.length - missingScanners.length} scanner(s)`)

const summaries = {}
const coverage = []
scans.forEach((s, i) => {
  if (!s) return
  const u = units[i]
  if (!summaries[u.kind]) summaries[u.kind] = []
  summaries[u.kind].push(`${u.area.name}: ${s.summary}`)
  if (s.coverage) coverage.push(`${u.kind} · ${u.area.name}: ${s.coverage}`)
})
const result = {
  ...emptyResult(),
  summaries,
  coverage,
  missingScanners,
  leftOut,
  howToApply: 'Show the confirmed findings by kind and severity with their ids; list unverified ones separately and flagged; say how many were dropped as false positives, which scanners returned nothing, and how many findings scanners left out. Ask which to apply (or whether to write a fix plan). Then apply one kind at a time, finishing each before the next: launch that kind\'s agent (secure, cleanup, a11y, dry) with its chosen findings and "Fix these findings — don\'t re-scan".',
}
if (!findings.length) return result

// ── Verify: critical findings one at a time and twice; the rest in batches per kind ──
const where = f => `${fmt(f.locs[0])}${f.also ? ` (also ${f.also.join(', ')})` : ''}`
const judge = k => `${KINDS[k].check} It also has to matter: a real problem at roughly the stated severity, not a matter of taste.${focus} If you can't confirm it from the code, it is not real. Don't edit anything.`
const verifyOne = f => `Check one finding from a read-only ${f.kind} scan. Try to refute it: read the code at ${where(f)} and whatever it depends on.

Finding (${f.severity}): ${f.issue}
Suggested fix: ${f.fix}

${judge(f.kind)}`
const verifyBatch = list => `Check these findings from a read-only ${list[0].kind} scan. Try to refute each one: read the code at each location and whatever it depends on.

${judge(list[0].kind)}

${JSON.stringify(list.map(f => ({ id: f.id, severity: f.severity, location: where(f), issue: f.issue, fix: f.fix })), null, 2)}

Return a verdict for every id.`
const batchesOf = list => {
  const out = []
  for (const k of kinds) {
    for (const sev of ['important', 'minor']) {
      const rest = list.filter(f => f.kind === k && f.severity === sev)
      // Minor findings are simpler to check, so their batches are twice as large.
      const size = sev === 'minor' ? KINDS[k].batch * 2 : KINDS[k].batch
      for (let i = 0; i < rest.length; i += size) out.push(rest.slice(i, i + size))
    }
  }
  return out
}

phase('Verify')
const votes = new Map(findings.map(f => [f.id, []]))
const runBatches = (list, retry) => list.map(b => () =>
  agent(verifyBatch(b), {
    label: `verify ${b[0].id}…${b[b.length - 1].id}${retry ? ' (retry)' : ''}`,
    phase: 'Verify',
    schema: VERDICTS,
    model: 'sonnet',
    effort: b[0].severity === 'minor' ? 'low' : 'medium',
  }).then(r => {
    for (const v of (r && r.verdicts) || []) if (votes.has(v.id)) votes.get(v.id).push(v)
  }))
const critical = findings.filter(f => f.severity === 'critical')
await parallel([
  ...critical.flatMap(f => [0, 1].map(k => () =>
    agent(verifyOne(f), { label: `verify ${f.id}${k ? ' (2nd)' : ''}`, phase: 'Verify', schema: VERDICT, model: 'sonnet', effort: 'medium' })
      .then(v => { if (v) votes.get(f.id).push(v) }))),
  ...runBatches(batchesOf(findings.filter(f => f.severity !== 'critical')), false),
])
// One more try for findings whose verifier died or skipped them.
const unchecked = findings.filter(f => !votes.get(f.id).length)
if (unchecked.length) {
  log(`Rechecking ${unchecked.length} finding(s) that got no verdict`)
  await parallel([
    ...unchecked.filter(f => f.severity === 'critical').map(f => () =>
      agent(verifyOne(f), { label: `verify ${f.id} (retry)`, phase: 'Verify', schema: VERDICT, model: 'sonnet', effort: 'medium' })
        .then(v => { if (v) votes.get(f.id).push(v) })),
    ...runBatches(batchesOf(unchecked.filter(f => f.severity !== 'critical')), true),
  ])
}

for (const f of findings) {
  const vs = votes.get(f.id)
  // Keep a finding if any verifier confirms it; list it separately if none returned a verdict.
  if (!vs.length) result.unverified.push(brief(f))
  else if (vs.some(v => v.real)) result.confirmed.push(brief(f))
  else result.dropped.push({ ...brief(f), reason: vs[0].reason })
}
log(`${result.confirmed.length} confirmed, ${result.dropped.length} dropped as false positives, ${result.unverified.length} unverified`)
return result
