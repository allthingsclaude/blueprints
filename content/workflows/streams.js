export const meta = {
  name: 'streams',
  description: 'Build plan tasks as parallel streams: split them by file, run one implement agent per stream, check each stream kept to its files, then integrate, test and fix',
  whenToUse: 'Called by /parallelize, and by /autopilot for phases with 6+ independent tasks; run /parallelize rather than this directly. Pass args {plan, phase, tasks, description, maxStreams, tests, updateState, context}; a typed string is "plan [phase]" or a description of the work.',
  phases: [
    { title: 'Partition', detail: 'record the checks, install new packages, split the tasks into streams that never touch the same file' },
    { title: 'Build', detail: 'one implement (or showcase) agent per stream, in parallel' },
    { title: 'Integrate', detail: 'finish what crossed stream boundaries, run the checks, tests and validation steps once, fix new failures (max 2 rounds)' },
  ],
}

// args: {
//   plan?: string          plan name or file (03, 03_SHOP, PLAN_03_SHOP.md); default: the Active plan in STATE.md
//   phase?: string|number  build only this phase
//   tasks?: string         an explicit task range, e.g. "Phase 2, tasks 3-8" (overrides phase)
//   description?: string   work with no plan file, described in words
//   maxStreams?: number    at most this many streams, default 5
//   tests?: bool           false when the caller runs the test suite itself afterwards (autopilot), default true
//   updateState?: bool     false when the caller owns STATE.md (autopilot), default true
//   context?: string       notes every agent gets: decisions made, tasks to skip, directories to leave alone, repo layout
// }
let a = args || {}
if (typeof a === 'string') {
  const s = a.trim()
  let parsed = null
  if (s.startsWith('{')) {
    try {
      parsed = JSON.parse(s)
    } catch {}
  }
  const w = s.split(/\s+/)
  if (parsed) a = parsed
  else if (w.length === 1 || (w.length === 2 && /^\d+$/.test(w[1]))) a = { plan: w[0], phase: w[1] }
  else a = { description: s }
}
const max = Math.max(1, Math.min(Number(a.maxStreams) || 5, 8))
const tests = a.tests !== false
const planRef = a.plan ? `plan \`${a.plan}\` (under {{PLANS_DIR}}/)` : 'the Active plan named in {{STATE_FILE}}'
const scope = a.description ? 'the described work' : a.tasks ? `only these tasks: ${a.tasks}` : a.phase != null && a.phase !== '' ? `Phase ${a.phase} only` : 'every unchecked task'
const target = a.description ? `this work, which has no plan file (build the task list from it): ${a.description}` : `${scope} of ${planRef}`
const context = a.context ? `\n\nFrom the caller: ${a.context}` : ''
const testsNote = tests ? '' : ' Tests are off: the caller runs the test suite afterwards.'

const PARTITION = {
  type: 'object',
  required: ['planFile', 'checks', 'baseline', 'streams', 'notes'],
  properties: {
    planFile: { type: 'string' },
    checks: {
      type: 'object',
      required: ['typecheck', 'lint', 'test'],
      properties: { typecheck: { type: 'string' }, lint: { type: 'string' }, test: { type: 'string' } },
    },
    baseline: { type: 'string' },
    installed: { type: 'array', items: { type: 'string' } },
    streams: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'agentType', 'tasks', 'files'],
        properties: {
          name: { type: 'string' },
          agentType: { type: 'string', enum: ['implement', 'showcase'] },
          tasks: { type: 'array', items: { type: 'string' } },
          files: { type: 'array', items: { type: 'string' } },
          readFirst: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    notes: { type: 'string' },
  },
}
const STREAM = {
  type: 'object',
  required: ['done', 'notDone', 'filesChanged', 'checks'],
  properties: {
    done: { type: 'array', items: { type: 'string' } },
    notDone: {
      type: 'array',
      items: {
        type: 'object',
        required: ['task', 'reason'],
        properties: { task: { type: 'string' }, reason: { type: 'string' } },
      },
    },
    filesChanged: { type: 'array', items: { type: 'string' } },
    checks: { type: 'string' },
    userTasks: { type: 'array', items: { type: 'string' } },
    choices: { type: 'array', items: { type: 'string' } },
    planChanges: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
  },
}
const INTEGRATED = {
  type: 'object',
  required: ['passing', 'checks', 'failing', 'fixes'],
  properties: {
    passing: { type: 'boolean' },
    checks: { type: 'string' },
    failing: { type: 'string' },
    fixes: { type: 'array', items: { type: 'string' } },
    finished: { type: 'array', items: { type: 'string' } },
  },
}

// Paths are compared repo-relative: "./a" → "a", "dir/**" → "dir/".
const norm = p => String(p).trim().replace(/^\.\//, '').replace(/\/\*\*?$/, '/')
const under = (file, f) => file === f || file.startsWith(f.endsWith('/') ? f : `${f}/`)
const owns = (s, file) => s.files.some(f => under(file, f) || (file.startsWith('/') && (file.endsWith(`/${f}`) || file.includes(`/${f.replace(/\/?$/, '/')}`))))

// ── Partition: one agent records the checks and splits the tasks into streams with their own files ──
phase('Partition')
const part = await agent(
  `Partition-only mode. Split ${target} into at most ${max} streams that can be built at the same time.${testsNote} Follow your Partition-Only Mode instructions.${context}`,
  { label: 'partition', phase: 'Partition', agentType: 'parallelize', schema: PARTITION })
if (!part) throw new Error('streams: the partition agent returned nothing')

let streams = part.streams
  .filter(s => s.tasks && s.tasks.length)
  .map(s => ({ ...s, files: [...new Set(s.files.map(norm))], readFirst: (s.readFirst || []).map(norm) }))
if (!streams.length) {
  log('Nothing to build')
  return { plan: part.planFile, scope, status: 'nothing', notes: part.notes, streams: [], done: [], notDone: [] }
}
if (streams.length > max) {
  // Streams have disjoint files, so folding one into another keeps every boundary intact.
  log(`${streams.length} streams proposed; folding them into ${max}`)
  const kept = streams.slice(0, max)
  for (const s of streams.slice(max)) {
    const t = kept.reduce((m, k) => (k.tasks.length < m.tasks.length ? k : m))
    t.name = `${t.name} + ${s.name}`
    t.agentType = t.agentType === s.agentType ? t.agentType : 'implement'
    t.tasks = [...t.tasks, ...s.tasks]
    t.files = [...t.files, ...s.files]
    t.readFirst = [...new Set([...t.readFirst, ...s.readFirst])]
  }
  streams = kept
}
log(`${streams.length} stream${streams.length > 1 ? 's' : ''}, ${streams.reduce((n, s) => n + s.tasks.length, 0)} tasks${part.installed && part.installed.length ? ` · installed ${part.installed.join(', ')}` : ''}`)

// ── Build: every stream at once, each limited to its own files ──
const streamPrompt = (s, i) => `# Stream ${i + 1} of ${streams.length}: ${s.name}

Implement these tasks${part.planFile ? ` from \`${part.planFile}\`` : ''}, in this order:
${s.tasks.map((t, k) => `${k + 1}. ${t}`).join('\n')}

Rules for this stream:
- Only create or modify these files (paths relative to the working directory${s.files.some(f => f.endsWith('/')) ? '; one ending in / covers new files inside it' : ''}): ${s.files.join(', ')}. If a task needs a change anywhere else, leave that part undone and name the file in notDone.${s.readFirst.length ? `\n- Read these first: ${s.readFirst.join(', ')}.` : ''}
- Don't install packages. If a task needs one that isn't installed, leave it undone and name the package in notDone.
- Don't edit ${part.planFile ? 'the plan, ' : ''}{{TASKS_DIR}}/CONVENTIONS.md or {{STATE_FILE}}, and don't commit. Report choices and proposed plan changes instead; the integrating agent checks your tasks off from your report.
- ${streams.length > 1 ? 'Other streams are editing other files at this moment. ' : ''}Typecheck once, when your tasks are done${part.checks.typecheck ? ` (\`${part.checks.typecheck}\`)` : ''}. Errors in files outside your list aren't yours: ignore them, including any a stop hook hands you. Don't run the test suite or the tasks' validation steps: they run once, for everything, after all streams finish.
- Follow {{TASKS_DIR}}/CONVENTIONS.md (already written).
- A task marked **(USER)** is the user's: don't attempt it; list it under userTasks.${context}

Return: the tasks you finished, the ones you didn't with the reason, every file you changed (relative to the working directory), a one-line typecheck result, steps left for the user, choices the plan didn't settle (what you chose, one line each), plan changes you'd propose, and blockers.`

phase('Build')
// Barrier: integration needs every stream's result.
const built = await parallel(streams.map((s, i) => () =>
  agent(streamPrompt(s, i), { label: `stream ${i + 1}: ${s.name}`, phase: 'Build', agentType: s.agentType, schema: STREAM })))
const missing = streams.filter((s, i) => !built[i]).map(s => s.name)
if (missing.length) log(`No result from: ${missing.join(', ')}`)

// Which streams strayed outside their files, or touched the same file as another stream.
const plan = part.planFile ? norm(part.planFile) : null
const touched = new Map()
const outOfBounds = []
built.forEach((r, i) => {
  if (!r) return
  for (const f of new Set(r.filesChanged.map(norm))) {
    if (plan && (f === plan || f.endsWith(`/${plan}`))) continue
    touched.set(f, [...(touched.get(f) || []), streams[i].name])
    if (!owns(streams[i], f)) outOfBounds.push({ stream: streams[i].name, file: f })
  }
})
const conflicts = [...touched].filter(([, by]) => by.length > 1).map(([file, by]) => ({ file, streams: by }))
if (conflicts.length || outOfBounds.length) {
  log(`${conflicts.length} file(s) changed by more than one stream, ${outOfBounds.length} change(s) outside a stream's files`)
}

// ── Integrate: one agent finishes the leftovers and checks the combined result, at most two rounds ──
const results = built.filter(Boolean)
const done = results.flatMap(r => r.done)
// Leftovers get ids, so the integrator can say which it finished without restating each task.
const leftovers = [
  ...streams.flatMap((s, i) => (built[i] ? built[i].notDone.map(n => ({ stream: s.name, ...n })) : [])),
  ...streams.flatMap((s, i) => (built[i] ? [] : s.tasks.map(task => ({ stream: s.name, task, reason: `its stream (${s.name}) returned nothing` })))),
].map((n, k) => ({ id: `L${k + 1}`, ...n }))
const reports = streams.map((s, i) => built[i]
  ? { stream: s.name, done: built[i].done, filesChanged: built[i].filesChanged, typecheck: built[i].checks }
  : { stream: s.name, returnedNothing: true })
const stateRule = !part.planFile
  ? `There is no plan file: don't edit any plan or {{STATE_FILE}}.`
  : a.updateState === false
    ? "Don't edit {{STATE_FILE}} (the caller updates it)."
    : 'Update {{STATE_FILE}} per 4.4.'
const checksLine = `typecheck \`${part.checks.typecheck || 'none'}\`, lint \`${part.checks.lint || 'none'}\`, tests ${tests ? `\`${part.checks.test || 'none'}\`` : 'off (the caller runs them)'}`
const integratePrompt = (round, failing) => round === 1
  ? `Integrate-only mode for ${part.planFile ? `\`${part.planFile}\`` : 'the described work'} (${scope}). ${streams.length} stream(s) just built their tasks in this working tree:

${JSON.stringify(reports, null, 2)}
${leftovers.length ? `\nLeft undone (return the ids you finish in \`finished\`):\n${JSON.stringify(leftovers, null, 2)}\n` : ''}${conflicts.length ? `\nChanged by more than one stream: ${conflicts.map(c => `${c.file} (${c.streams.join(', ')})`).join('; ')}.` : ''}${outOfBounds.length ? `\nChanged outside the stream's own files: ${outOfBounds.map(o => `${o.file} (${o.stream})`).join('; ')}.` : ''}
Checks: ${checksLine}. Before the streams started: ${part.baseline || 'not recorded'}.

Follow your Integrate-Only Mode instructions. ${stateRule} Don't commit.${context}`
  : `Integrate-only mode, round 2, for ${part.planFile ? `\`${part.planFile}\`` : 'the described work'}. These checks still fail after the first integration round (before the streams started: ${part.baseline || 'not recorded'}):

${failing}

Fix only failures the streams' changes caused, minimally, and rerun the failing checks. Don't edit {{STATE_FILE}} and don't commit.${context}`

phase('Integrate')
let integration = null
let checkedOff = false
const fixes = []
const finishedIds = new Set()
for (let round = 1; round <= 2 && results.length; round++) {
  let r = null
  try {
    r = await agent(integratePrompt(round, integration && (integration.failing || integration.checks)), {
      label: `integrate${round > 1 ? ` round ${round}` : ''}`,
      phase: 'Integrate',
      agentType: 'parallelize',
      schema: INTEGRATED,
    })
  } catch (e) {
    log(`Integration round ${round} failed: ${e && e.message}`)
  }
  if (!r) {
    if (round === 1) log('Integration returned nothing; the caller has to check off the done tasks')
    break
  }
  if (round === 1) checkedOff = true
  integration = r
  fixes.push(...r.fixes)
  for (const id of r.finished || []) finishedIds.add(String(id).trim())
  if (r.passing) break
}
const finished = leftovers.filter(n => finishedIds.has(n.id))
const notDone = leftovers.filter(n => !finishedIds.has(n.id)).map(n => ({ task: n.task, reason: n.reason }))

const blockers = results.flatMap(r => r.blockers || [])
const passing = !!(integration && integration.passing)
return {
  plan: part.planFile,
  scope,
  status: !done.length && !finished.length && (blockers.length || missing.length) ? 'blocked' : notDone.length || !passing ? 'partial' : 'complete',
  streams: streams.map((s, i) => ({
    name: s.name,
    agentType: s.agentType,
    tasks: s.tasks.length,
    done: built[i] ? built[i].done : [],
    returned: !!built[i],
  })),
  done: [...done, ...finished.map(n => n.task)],
  checkedOff,
  notDone,
  missingStreams: missing,
  conflicts,
  outOfBounds,
  baseline: part.baseline,
  tests,
  passing,
  checks: integration ? integration.checks : 'not run',
  failing: passing ? '' : (integration && (integration.failing || integration.checks)) || '',
  fixes,
  installed: part.installed || [],
  userTasks: results.flatMap(r => r.userTasks || []),
  choices: results.flatMap(r => r.choices || []),
  planChanges: results.flatMap(r => r.planChanges || []),
  blockers,
  notes: part.notes,
}
