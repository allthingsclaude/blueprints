export const meta = {
  name: 'preflight',
  description: 'Review a branch with parallel audit, secure, a11y and test reviewers, verify every finding, apply one fix pass, then recheck',
  whenToUse: 'Before opening a PR, or from /autopilot after all phases are committed. Pass args {base, files, frontend}; base is the commit the branch started from.',
  phases: [
    { title: 'Review', detail: 'audit, secure, a11y (UI changes only) and test: read-only, in parallel' },
    { title: 'Verify', detail: 'an independent check of every finding before anything is fixed', model: 'sonnet' },
    { title: 'Fix', detail: 'one agent applies all confirmed findings, then runs typecheck, lint and tests' },
    { title: 'Recheck', detail: 'confirm each fix landed; one more fix round for anything still open (max 2)', model: 'sonnet' },
  ],
}

// args: {
//   base: string      required: commit the branch started from (e.g. output of `git merge-base main HEAD`)
//   head?: string     default 'HEAD'
//   repo?: string     subdirectory holding the repo (multi-repo mode), default '.'
//   files?: string[]  changed files (git diff --name-only base...head)
//   frontend?: bool   true when UI files changed: adds the a11y reviewer
//   plan?: string     plan name, for context
//   fix?: bool        false = review and verify only, default true
// }
const a = args || {}
if (!a.base) {
  throw new Error('preflight needs args.base: the commit the branch started from, e.g. the output of `git merge-base main HEAD`')
}
const range = `${a.base}...${a.head || 'HEAD'}`
const repo = a.repo || '.'
const files = Array.isArray(a.files) ? a.files : []
const where = repo === '.' ? '' : `Work inside the \`${repo}\` directory (cd into it before running git or project commands). `
const fileList = files.length
  ? ` Changed files: ${files.slice(0, 200).join(', ')}${files.length > 200 ? ` (+${files.length - 200} more)` : ''}.`
  : ''
const scope = `${where}Review-only mode. Review the changes in \`git diff ${range}\`.${fileList}${a.plan ? ` They implement plan ${a.plan}.` : ''} Follow your Review-Only Mode instructions.`

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
          severity: { type: 'string', enum: ['critical', 'important'] },
          file: { type: 'string' },
          line: { type: 'integer' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object',
  required: ['real', 'reason'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}
const FIX_RESULT = {
  type: 'object',
  required: ['fixed', 'skipped', 'checks'],
  properties: {
    fixed: { type: 'array', items: { type: 'string' } },
    skipped: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'reason'],
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
      },
    },
    checks: { type: 'string' },
  },
}
const RESOLVED = {
  type: 'object',
  required: ['resolved', 'reason'],
  properties: { resolved: { type: 'boolean' }, reason: { type: 'string' } },
}

const where_ = f => `${f.file}${f.line ? `:${f.line}` : ''}`
const brief = f => ({ id: f.id, severity: f.severity, file: f.file, line: f.line, issue: f.issue })

// ── Review: specialist reviewers in parallel, read-only ──────────────────────
const REVIEWERS = [
  { key: 'audit', agentType: 'audit' },
  { key: 'secure', agentType: 'secure' },
  ...(a.frontend ? [{ key: 'a11y', agentType: 'a11y' }] : []),
  { key: 'test', agentType: 'test' },
]
phase('Review')
// Barrier: duplicates across reviewers must be merged before verification.
const reviews = await parallel(REVIEWERS.map(r => () =>
  agent(scope, { label: r.key, phase: 'Review', agentType: r.agentType, schema: FINDINGS })
    .then(res => (res ? { ...res, reviewer: r.key } : null))))
const missing = REVIEWERS.filter((r, i) => !reviews[i]).map(r => r.key)
if (missing.length) log(`No result from: ${missing.join(', ')}`)

const groups = new Map()
for (const r of reviews.filter(Boolean)) {
  for (const f of r.findings || []) {
    const key = f.line ? `${f.file}:${f.line}` : `${f.file}:${f.issue.slice(0, 80).toLowerCase()}`
    const g = groups.get(key)
    if (!g) {
      groups.set(key, { ...f, reviewers: [r.reviewer] })
      continue
    }
    if (f.severity === 'critical') g.severity = 'critical'
    if (!g.reviewers.includes(r.reviewer)) g.reviewers.push(r.reviewer)
    if (!g.issue.includes(f.issue)) {
      g.issue += ` | ${f.issue}`
      g.fix += ` | ${f.fix}`
    }
  }
}
const findings = [...groups.values()].map((f, i) => ({ id: `F${i + 1}`, ...f }))
const summaries = Object.fromEntries(reviews.filter(Boolean).map(r => [r.reviewer, r.summary]))
log(`${findings.length} distinct findings from ${REVIEWERS.length - missing.length} reviewers`)

const result = {
  range,
  reviewers: REVIEWERS.map(r => r.key),
  missingReviewers: missing,
  summaries,
  confirmed: [],
  dropped: [],
  fixRounds: [],
  unresolved: [],
  needsDecision: [],
  changesMade: false,
}
if (!findings.length) return result

// ── Verify: an independent check of every finding (two for critical ones) ──
const verifyPrompt = f => `${where}Check one code-review finding about the changes in \`git diff ${range}\`. Try to refute it: read the code at ${where_(f)} and whatever it depends on.

Finding (${f.severity}, from ${f.reviewers.join('/')}): ${f.issue}
Suggested fix: ${f.fix}

It is real only if (1) the problem actually exists in the current code, (2) this branch's changes introduced or exposed it, or it is a failing test, and (3) it matters at the stated severity. A missing test for critical new logic counts as real. If you can't confirm it from the code, it is not real. Don't edit anything.`

phase('Verify')
const verified = await pipeline(findings, f =>
  parallel(Array.from({ length: f.severity === 'critical' ? 2 : 1 }, (_, k) => () =>
    agent(verifyPrompt(f), {
      label: `verify ${f.id}${k ? ' (2nd)' : ''}`,
      phase: 'Verify',
      schema: VERDICT,
      model: 'sonnet',
      effort: 'medium',
    })))
    .then(votes => ({ ...f, votes: votes.filter(Boolean) })))

for (const f of verified.filter(Boolean)) {
  // Keep a finding if any verifier confirms it; keep it flagged if every verifier failed to run.
  if (!f.votes.length || f.votes.some(v => v.real)) {
    result.confirmed.push({ ...f, unverified: !f.votes.length })
  } else {
    result.dropped.push({ ...brief(f), reason: f.votes[0].reason })
  }
}
log(`${result.confirmed.length} confirmed, ${result.dropped.length} dropped as false positives`)
if (!result.confirmed.length || a.fix === false) {
  result.confirmed = result.confirmed.map(brief)
  return result
}

// ── Fix → Recheck: one fixer per round, at most two rounds ──
const fixPrompt = (list, round) => `${where}Fix these confirmed review findings on the current branch (round ${round}). Parallel reviewers found them and an independent verifier confirmed them.

${JSON.stringify(list.map(f => ({ ...brief(f), fix: f.fix })), null, 2)}

Rules:
- Make minimal, targeted fixes that follow {{TASKS_DIR}}/CONVENTIONS.md (if it exists) and CLAUDE.md.
- Read each file you modify in full before editing it; for reference files, read just the relevant range.
- Don't change behavior beyond what a finding requires. Skip, with the reason "needs a decision", any finding whose fix would change authentication/authorization design, encryption choices, public API behavior, or product behavior.
- For missing-test findings, add focused tests that match the project's test conventions.
- When your edits are done, run the project's typecheck, lint and tests once with its own toolchain, and fix failures your edits caused.
- Don't commit.
Return the ids you fixed, the ids you skipped with reasons, and a one-line result of the checks.`

let open = result.confirmed
for (let round = 1; round <= 2 && open.length; round++) {
  const fx = await agent(fixPrompt(open, round), { label: `fix round ${round}`, phase: 'Fix', schema: FIX_RESULT })
  if (!fx) {
    log(`Fix round ${round} failed to return`)
    break
  }
  const fixedIds = new Set(fx.fixed)
  const skippedIds = new Set((fx.skipped || []).map(s => s.id))
  for (const s of fx.skipped || []) {
    const f = open.find(o => o.id === s.id)
    if (f) result.needsDecision.push({ ...brief(f), reason: s.reason })
  }
  const checks = await pipeline(open.filter(f => fixedIds.has(f.id)), f =>
    agent(`${where}Check whether this review finding is resolved in the current working tree, including uncommitted changes: ${where_(f)}: ${f.issue}. Expected fix: ${f.fix}. Read the code; don't edit anything.`, {
      label: `recheck ${f.id}`,
      phase: 'Recheck',
      schema: RESOLVED,
      model: 'sonnet',
      effort: 'low',
    }).then(r => ({ f, ok: !!(r && r.resolved) })))
  const resolved = checks.filter(c => c && c.ok).map(c => c.f.id)
  result.fixRounds.push({ round, fixed: fx.fixed.length, resolved: resolved.length, skipped: skippedIds.size, checks: fx.checks })
  if (fx.fixed.length) result.changesMade = true
  open = open.filter(f => !resolved.includes(f.id) && !skippedIds.has(f.id))
  if (!fx.fixed.length) break // the fixer made no attempt this round; another round won't help
}

result.unresolved = open.map(brief)
result.confirmed = result.confirmed.map(brief)
return result
