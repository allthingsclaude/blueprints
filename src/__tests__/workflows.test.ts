import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSourcePaths } from '../installer.js';

// Runs the shipped workflow scripts against stubbed agents, so their control flow
// (merging, verification, integration rounds) is tested without spawning anything.

type Schema = {
  type?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
};
type Opts = { label?: string; phase?: string; agentType?: string; schema?: Schema; model?: string; effort?: string };
type Respond = (prompt: string, opts: Opts) => unknown;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const workflowsDir = getSourcePaths().workflows;
const agentsDir = getSourcePaths().agents;
const agentNames = fs.readdirSync(agentsDir).map(f => f.replace(/\.md$/, ''));

function loadWorkflow(name: string) {
  const src = fs.readFileSync(path.join(workflowsDir, `${name}.js`), 'utf-8');
  const m = src.match(/^export const meta = (\{[\s\S]*?\n\})\n/);
  if (!m) throw new Error(`${name}: no meta block`);
  const meta = new Function(`return (${m[1]})`)();
  const body = src.slice(m[0].length).replace(/\{\{(\w+)\}\}/g, '<$1>');
  return { src, meta, body };
}

// The workflow runtime rejects schemas whose `required` names a missing property.
function schemaProblems(schema: Schema, at = '$'): string[] {
  const out: string[] = [];
  if (schema.type === 'object') {
    const props = schema.properties ?? {};
    for (const k of schema.required ?? []) if (!(k in props)) out.push(`${at}: required '${k}' has no property`);
    for (const [k, v] of Object.entries(props)) out.push(...schemaProblems(v, `${at}.${k}`));
  }
  if (schema.type === 'array' && schema.items) out.push(...schemaProblems(schema.items, `${at}[]`));
  return out;
}

// A small validator for the subset of JSON Schema the scripts use, so stubs match what agents must return.
function validate(schema: Schema, value: unknown, at = '$'): string[] {
  if (schema.enum && !schema.enum.includes(value)) return [`${at}: ${JSON.stringify(value)} not in enum`];
  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${at}: not an object`];
      const obj = value as Record<string, unknown>;
      const out = (schema.required ?? []).filter(k => !(k in obj)).map(k => `${at}.${k}: missing`);
      for (const [k, v] of Object.entries(obj)) if (schema.properties?.[k]) out.push(...validate(schema.properties[k], v, `${at}.${k}`));
      return out;
    }
    case 'array':
      if (!Array.isArray(value)) return [`${at}: not an array`];
      return value.flatMap((v, i) => (schema.items ? validate(schema.items, v, `${at}[${i}]`) : []));
    case 'string': return typeof value === 'string' ? [] : [`${at}: not a string`];
    case 'integer': return Number.isInteger(value) ? [] : [`${at}: not an integer`];
    case 'boolean': return typeof value === 'boolean' ? [] : [`${at}: not a boolean`];
    default: return [];
  }
}

async function runWorkflow(name: string, args: unknown, respond: Respond) {
  const { body } = loadWorkflow(name);
  const calls: { prompt: string; opts: Opts }[] = [];
  const logs: string[] = [];
  const agent = async (prompt: string, opts: Opts = {}) => {
    calls.push({ prompt, opts });
    if (opts.agentType) expect(agentNames, `${name}: agentType ${opts.agentType}`).toContain(opts.agentType);
    if (opts.schema) expect(schemaProblems(opts.schema), `${name}: schema for ${opts.label}`).toEqual([]);
    const out = respond(prompt, opts) ?? null;
    if (out !== null && opts.schema) expect(validate(opts.schema, out), `${name}: stub for ${opts.label}`).toEqual([]);
    return out;
  };
  const parallel = (thunks: (() => Promise<unknown>)[]) =>
    Promise.all(thunks.map(t => Promise.resolve().then(t).catch(() => null)));
  const pipeline = (items: unknown[], ...stages: ((prev: unknown, item: unknown, i: number) => unknown)[]) =>
    Promise.all(items.map(async (item, i) => {
      let r: unknown = item;
      try {
        for (const s of stages) r = await s(r, item, i);
        return r;
      } catch {
        return null;
      }
    }));
  const fn = new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', body);
  const result = await fn(agent, parallel, pipeline, () => {}, (msg: string) => logs.push(msg), args,
    { total: null, spent: () => 0, remaining: () => Infinity },
    async () => { throw new Error('nested workflows are not used'); });
  return { result, calls, logs, labels: calls.map(c => c.opts.label) };
}

const section = (agent: string, heading: string) => {
  const md = fs.readFileSync(path.join(agentsDir, `${agent}.md`), 'utf-8');
  const start = md.indexOf(heading);
  expect(start, `${agent}: ${heading}`).toBeGreaterThan(-1);
  return md.slice(start, md.indexOf('<!-- /claude-only -->', start));
};

describe('workflow scripts', () => {
  const names = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));

  it('ships preflight, sweep and streams', () => {
    expect(names.sort()).toEqual(['preflight', 'streams', 'sweep']);
  });

  for (const name of names) {
    it(`${name}: literal meta named after the file, with every phase declared`, () => {
      const { src, meta, body } = loadWorkflow(name);
      expect(meta.name).toBe(name);
      expect(meta.description).toBeTruthy();
      const declared = meta.phases.map((p: { title: string }) => p.title);
      const used = new Set([...body.matchAll(/phase(?:\(|: )'([^']+)'/g)].map(m => m[1]));
      for (const title of used) expect(declared, `${name}: phase '${title}'`).toContain(title);
      // These throw inside workflows (they would break resume), and modules can't load.
      expect(src).not.toMatch(/Date\.now\(|Math\.random\(|new Date\(\)|import\(/);
    });
  }

  it('describe every field the scripts ask for in the agents\' mode sections', () => {
    for (const agent of ['secure', 'a11y', 'cleanup', 'dry']) {
      const text = section(agent, '## Scan-Only Mode (sweep)');
      for (const field of ['more', 'coverage', 'line', 'category']) expect(text, `${agent}: ${field}`).toContain(`\`${field}\``);
    }
    for (const agent of ['a11y', 'cleanup', 'dry']) expect(section(agent, '## Scan-Only Mode (sweep)')).toContain('`autoFixable');
    expect(section('dry', '## Scan-Only Mode (sweep)')).toContain('`also`');
    const modes = section('parallelize', '## Workflow Modes (streams)');
    for (const field of ['planFile', 'checks', 'test', 'baseline', 'installed', 'streams', 'agentType', 'readFirst', 'notes', 'passing', 'failing', 'fixes', 'finished']) {
      expect(modes, field).toContain(`\`${field}\``);
    }
  });
});

describe('preflight', () => {
  const finding = { severity: 'important', file: 'src/a.ts', line: 3, issue: 'null check missing', fix: 'guard it' };
  const respond = (_p: string, o: Opts) => {
    if (o.label === 'audit') return { findings: [finding], summary: 'one issue' };
    if (['secure', 'a11y', 'test'].includes(o.label ?? '')) return { findings: [], summary: 'nothing' };
    if (o.label?.startsWith('verify')) return { real: true, reason: 'seen' };
    if (o.label?.startsWith('fix round')) return { fixed: ['F1'], skipped: [], checks: 'all pass' };
    if (o.label?.startsWith('recheck')) return { resolved: true, reason: 'fixed' };
    return null;
  };

  it('gives the caller\'s context to every reviewer, verifier and fixer, and fixes with the implement agent', async () => {
    const context = 'Autopilot syncs CLAUDE.md later: don\'t report it as out of date.';
    const { result, calls } = await runWorkflow('preflight', { base: 'abc', files: ['src/a.ts'], frontend: true, context }, respond);
    expect(result.changesMade).toBe(true);
    expect(calls.map(c => c.opts.label)).toEqual(['audit', 'secure', 'a11y', 'test', 'verify F1', 'fix round 1', 'recheck F1']);
    for (const c of calls.filter(c => !c.opts.label?.startsWith('recheck'))) {
      expect(c.prompt, c.opts.label).toContain(`Notes from the caller: ${context}`);
    }
    const fix = calls.find(c => c.opts.label === 'fix round 1')!;
    expect(fix.opts.agentType).toBe('implement');
    expect(fix.prompt).toMatch(/^Direct task: /);
    expect(fix.prompt).toContain('don\'t check off plan tasks or edit the plan or STATE.md');
  });

  it('still starts the fixer prompt with "Direct task:" in a child repo', async () => {
    const { calls } = await runWorkflow('preflight', { base: 'abc', repo: 'api' }, respond);
    const fix = calls.find(c => c.opts.label === 'fix round 1')!;
    expect(fix.prompt).toMatch(/^Direct task: Work inside the `api` directory/);
  });

  it('adds no notes without a context', async () => {
    const { calls } = await runWorkflow('preflight', { base: 'abc', context: '  ' }, respond);
    for (const c of calls) expect(c.prompt).not.toContain('Notes from the caller');
  });

  it('sends fixers the phrase implement\'s Direct Tasks section looks for', () => {
    const implement = fs.readFileSync(path.join(agentsDir, 'implement.md'), 'utf-8');
    expect(implement).toContain('## Direct Tasks');
    expect(implement).toContain('A prompt that starts with "Direct task:"');
    const read = (p: string) => fs.readFileSync(path.join(agentsDir, '..', p), 'utf-8');
    for (const [file, count] of [['commands/autopilot.md', 2], ['procedures/integrate.md', 1]] as const) {
      const text = read(file);
      expect(text, file).not.toContain('subagent_type: "general-purpose"');
      const launches = [...text.matchAll(/launch one fixer[^\n]*?\(`subagent_type: "(\w+)"`\)[^\n]*?: "([^"]{0,40})/g)];
      expect(launches.length, file).toBe(count);
      for (const m of launches) {
        expect(m[1], file).toBe('implement');
        expect(m[2], file).toMatch(/^Direct task: /);
      }
    }
  });
});

describe('streams', () => {
  const partition = {
    planFile: 'tasks/plans/PLAN_03_SHOP.md',
    checks: { typecheck: 'pnpm typecheck', lint: 'pnpm lint', test: 'pnpm test' },
    baseline: 'typecheck ✅ · lint ✅',
    installed: ['zod'],
    streams: [
      { name: 'api', agentType: 'implement', tasks: ['T1 api', 'T2 api'], files: ['src/api/orders.ts', 'src/api/'] },
      { name: 'ui', agentType: 'showcase', tasks: ['T3 page'], files: ['./src/ui/page.tsx'], readFirst: ['src/ui/theme.ts'] },
    ],
    notes: 'split by layer',
  };
  const ok = (extra = {}) => ({ passing: true, checks: 'typecheck ✅ · lint ✅', failing: '', fixes: [], ...extra });

  it('builds every stream, flags shared and out-of-bounds files, and integrates once when checks pass', async () => {
    const { result, calls, labels } = await runWorkflow('streams', { plan: '03', phase: 2, updateState: false, tests: false, context: 'Decided: use zod' }, (_p, o) => {
      if (o.label === 'partition') return partition;
      if (o.label === 'stream 1: api') {
        return {
          done: ['T1 api', 'T2 api'], notDone: [], checks: 'typecheck ok',
          filesChanged: ['src/api/orders.ts', 'src/api/new.ts', 'src/shared/types.ts', 'tasks/plans/PLAN_03_SHOP.md'],
          choices: ['validated input with zod'],
        };
      }
      if (o.label === 'stream 2: ui') {
        return { done: ['T3 page'], notDone: [], checks: 'ok', filesChanged: ['src/ui/page.tsx', 'src/shared/types.ts'], userTasks: ['add the DNS record'] };
      }
      if (o.label === 'integrate') return ok({ fixes: ['aligned Order type'] });
    });

    expect(labels).toEqual(['partition', 'stream 1: api', 'stream 2: ui', 'integrate']);
    expect(calls.map(c => c.opts.agentType)).toEqual(['parallelize', 'implement', 'showcase', 'parallelize']);
    expect(calls[0].prompt).toContain('Phase 2 only of plan `03`');
    expect(calls[0].prompt).toContain('Tests are off');
    expect(calls[1].prompt).toContain('Only create or modify these files');
    expect(calls[1].prompt).toContain("Don't install packages");
    expect(calls[1].prompt).toContain("Don't edit the plan");
    expect(calls[1].prompt).toContain("Don't run the test suite");
    expect(calls[1].prompt).toContain('Decided: use zod');
    expect(calls[2].prompt).toContain('Read these first: src/ui/theme.ts');
    expect(calls[3].prompt).toContain('src/shared/types.ts (api, ui)');
    expect(calls[3].prompt).toContain('Before the streams started: typecheck ✅ · lint ✅');
    expect(calls[3].prompt).toContain("Don't edit <STATE_FILE>");
    expect(calls[3].prompt).toContain('tests off (the caller runs them)');

    expect(result.status).toBe('complete');
    expect(result.checkedOff).toBe(true);
    expect(result.done).toEqual(['T1 api', 'T2 api', 'T3 page']);
    expect(result.conflicts).toEqual([{ file: 'src/shared/types.ts', streams: ['api', 'ui'] }]);
    expect(result.outOfBounds).toEqual([
      { stream: 'api', file: 'src/shared/types.ts' },
      { stream: 'ui', file: 'src/shared/types.ts' },
    ]);
    expect(result.installed).toEqual(['zod']);
    expect(result.userTasks).toEqual(['add the DNS record']);
    expect(result.choices).toEqual(['validated input with zod']);
    expect(result.fixes).toEqual(['aligned Order type']);
  });

  it('lists a dead stream\'s tasks as not done, and runs round 2 with the checks line when failing is empty', async () => {
    let rounds = 0;
    const { result, calls } = await runWorkflow('streams', { plan: '03' }, (_p, o) => {
      if (o.label === 'partition') return partition;
      if (o.label === 'stream 1: api') return { done: ['T1 api', 'T2 api'], notDone: [], checks: 'ok', filesChanged: ['src/api/orders.ts'] };
      if (o.label?.startsWith('integrate')) {
        rounds++;
        return rounds === 1
          ? { passing: false, checks: 'typecheck ❌ TS2322 in src/api/orders.ts', failing: '', fixes: ['first fix'] }
          : ok({ fixes: ['second fix'] });
      }
    });

    expect(rounds).toBe(2);
    expect(calls[3].prompt).toContain('Update <STATE_FILE> per 4.4');
    expect(calls[3].prompt).toContain('tests `pnpm test`');
    expect(calls[3].prompt).toContain('"id": "L1"');
    expect(calls[3].prompt).toContain('"returnedNothing": true');
    expect(calls[4].prompt).toContain('round 2');
    expect(calls[4].prompt).toContain('TS2322 in src/api/orders.ts');
    expect(result.status).toBe('partial');
    expect(result.missingStreams).toEqual(['ui']);
    expect(result.notDone).toEqual([{ task: 'T3 page', reason: 'its stream (ui) returned nothing' }]);
    expect(result.passing).toBe(true);
    expect(result.fixes).toEqual(['first fix', 'second fix']);
  });

  it('counts leftovers the integrator finished, by id, as done', async () => {
    const { result, calls } = await runWorkflow('streams', { plan: '03' }, (_p, o) => {
      if (o.label === 'partition') return partition;
      if (o.label === 'stream 1: api') {
        return {
          done: ['T1 api'],
          notDone: [{ task: 'Orders page (nav link)', reason: 'needs src/ui/nav.tsx' }, { task: 'Paid export', reason: 'blocked on an API key' }],
          checks: 'ok', filesChanged: ['src/api/orders.ts'],
        };
      }
      if (o.label === 'stream 2: ui') return { done: ['T3 page'], notDone: [], checks: 'ok', filesChanged: ['src/ui/page.tsx'] };
      return ok({ finished: ['L1'] });
    });
    expect(calls[3].prompt).toContain('"id": "L2"');
    expect(result.done).toEqual(['T1 api', 'T3 page', 'Orders page (nav link)']);
    expect(result.notDone).toEqual([{ task: 'Paid export', reason: 'blocked on an API key' }]);
    expect(result.status).toBe('partial');
  });

  it('keeps described work away from plans and STATE.md, and still catches shared absolute paths', async () => {
    const described = { ...partition, planFile: '' };
    const { result, calls } = await runWorkflow('streams', { description: 'add dark mode to header and footer' }, (_p, o) => {
      if (o.label === 'partition') return described;
      if (o.label?.startsWith('stream')) return { done: ['x'], notDone: [], checks: 'ok', filesChanged: ['/Users/me/proj/src/shared.ts'] };
      return ok();
    });
    expect(calls[0].prompt).toContain('has no plan file');
    expect(calls[1].prompt).toContain('Implement these tasks, in this order');
    expect(calls[1].prompt).not.toContain("Don't edit the plan");
    expect(calls[3].prompt).toContain("There is no plan file: don't edit any plan or <STATE_FILE>");
    expect(result.scope).toBe('the described work');
    expect(result.conflicts).toEqual([{ file: '/Users/me/proj/src/shared.ts', streams: ['api', 'ui'] }]);
  });

  it('returns the done tasks unchecked when the integrator returns nothing', async () => {
    const { result, labels } = await runWorkflow('streams', { plan: '03' }, (_p, o) => {
      if (o.label === 'partition') return partition;
      if (o.label?.startsWith('stream')) return { done: ['x'], notDone: [], checks: 'ok', filesChanged: [] };
      return null;
    });
    expect(labels.filter(l => l?.startsWith('integrate'))).toEqual(['integrate']);
    expect(result.checkedOff).toBe(false);
    expect(result.done).toEqual(['x', 'x']);
    expect(result.status).toBe('partial');
  });

  it('keeps files inside a stream\'s directories in bounds however they are written', async () => {
    const dirs = {
      ...partition,
      streams: [
        { name: 'api', agentType: 'implement', tasks: ['T1'], files: ['src/api', 'src/x/**'] },
        { name: 'ui', agentType: 'implement', tasks: ['T2'], files: ['src/ui/'] },
      ],
    };
    const { result } = await runWorkflow('streams', { plan: '03' }, (_p, o) => {
      if (o.label === 'partition') return dirs;
      if (o.label === 'stream 1: api') {
        return { done: ['T1'], notDone: [], checks: 'ok', filesChanged: ['src/api/a.ts', 'src/api/a.ts', 'src/x/b.ts', '/Users/me/repo/src/api/c.ts'] };
      }
      if (o.label === 'stream 2: ui') return { done: ['T2'], notDone: [], checks: 'ok', filesChanged: ['./src/ui/d.tsx'] };
      return ok();
    });
    expect(result.outOfBounds).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('stops after the partition when there is nothing to build', async () => {
    const { result, calls } = await runWorkflow('streams', '03', () => ({ ...partition, streams: [] }));
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt).toContain('`03`');
    expect(result.status).toBe('nothing');
  });

  it('reads a plan and phase, a description, or JSON from a plain string', async () => {
    const prompts: string[] = [];
    const nothing: Respond = (p, o) => {
      if (o.label === 'partition') prompts.push(p);
      return { ...partition, streams: [] };
    };
    await runWorkflow('streams', '03_SHOP 2', nothing);
    await runWorkflow('streams', 'build the settings, profile and billing pages', nothing);
    await runWorkflow('streams', '{"plan":"03_SHOP","phase":4,"updateState":false}', nothing);
    await runWorkflow('streams', 'shop', nothing);
    expect(prompts[0]).toContain('Phase 2 only of plan `03_SHOP`');
    expect(prompts[1]).toContain('has no plan file');
    expect(prompts[1]).toContain('build the settings, profile and billing pages');
    expect(prompts[2]).toContain('Phase 4 only of plan `03_SHOP`');
    expect(prompts[3]).toContain('every unchecked task of plan `shop`');
  });

  it('folds extra streams into the smallest one instead of exceeding maxStreams', async () => {
    const three = {
      ...partition,
      streams: [
        { name: 'a', agentType: 'implement', tasks: ['A1', 'A2', 'A3'], files: ['a.ts'] },
        { name: 'b', agentType: 'implement', tasks: ['B1'], files: ['b.ts'] },
        { name: 'c', agentType: 'showcase', tasks: ['C1'], files: ['c.tsx'] },
      ],
    };
    const { result, calls } = await runWorkflow('streams', { maxStreams: 2 }, (_p, o) => {
      if (o.label === 'partition') return three;
      if (o.label?.startsWith('stream')) return { done: [], notDone: [], checks: 'ok', filesChanged: [] };
      return ok();
    });
    const builds = calls.filter(c => c.opts.label?.startsWith('stream'));
    expect(builds).toHaveLength(2);
    expect(builds[1].opts.label).toBe('stream 2: b + c');
    expect(builds[1].opts.agentType).toBe('implement');
    expect(builds[1].prompt).toContain('C1');
    expect(builds[1].prompt).toContain('b.ts, c.tsx');
    expect(result.streams.map((s: { tasks: number }) => s.tasks)).toEqual([3, 2]);
  });

  it('reports blocked and skips integration when no stream returns', async () => {
    const { result, labels } = await runWorkflow('streams', {}, (_p, o) => (o.label === 'partition' ? partition : null));
    expect(labels).not.toContain('integrate');
    expect(result.status).toBe('blocked');
    expect(result.notDone).toHaveLength(3);
  });
});

describe('sweep', () => {
  const twoAreas = {
    areas: [
      { name: 'api', paths: ['src/api'], files: 120, ui: false },
      { name: 'web', paths: ['src/web'], files: 90, ui: true },
    ],
  };
  const none = { findings: [], summary: 'nothing found' };

  it('scans each kind per area, merges across scanners, verifies critical findings twice and keeps unverified ones apart', async () => {
    const { result, calls, labels } = await runWorkflow('sweep', { kinds: ['secure', 'a11y'] }, (_p, o) => {
      switch (o.label) {
        case 'map': return twoAreas;
        case 'secure: api': return {
          findings: [
            { severity: 'critical', file: 'src/api/auth.ts', line: 10, issue: 'route has no auth check', fix: 'add middleware' },
            { severity: 'important', file: 'src/api/query.ts', line: 5, issue: 'SQL built by concatenation', fix: 'parameterize' },
          ],
          summary: '1 critical, 1 important',
        };
        case 'secure: web': return {
          findings: [{ severity: 'important', file: './src/api/query.ts', line: 5, issue: 'raw SQL from the web form', fix: 'parameterize' }],
          summary: '1 important',
        };
        case 'secure: repo-wide': return {
          findings: [{ severity: 'minor', file: 'package.json', issue: 'outdated lodash with a known advisory', fix: 'upgrade' }],
          more: 3,
          summary: '1 minor',
        };
        case 'a11y: web': return {
          findings: [{ severity: 'important', file: 'src/web/Button.tsx', line: 3, issue: 'icon button has no label', fix: 'add aria-label', autoFixable: true }],
          summary: '1 important',
        };
        case 'verify SEC-1': return { real: false, reason: 'middleware applied at the router' };
        case 'verify SEC-1 (2nd)': return { real: true, reason: 'this route is mounted outside the router' };
        case 'verify SEC-2…SEC-2': return { verdicts: [{ id: 'SEC-2', real: true, reason: 'user input reaches the query' }] };
        case 'verify SEC-3…SEC-3': return { verdicts: [{ id: 'SEC-3', real: false, reason: 'not installed for production' }] };
        default: return null; // both a11y verifiers die
      }
    });

    expect(labels.filter(l => /^(secure|a11y):/.test(l ?? ''))).toEqual(['secure: api', 'secure: web', 'secure: repo-wide', 'a11y: web']);
    expect(calls.find(c => c.opts.label === 'map')?.opts.model).toBe('sonnet');
    expect(calls.find(c => c.opts.label === 'secure: repo-wide')?.prompt).toContain('dependency audit');
    expect(calls.find(c => c.opts.label === 'secure: api')?.prompt).toContain('Other scanners cover web');
    for (const c of calls.filter(c => /^(secure|a11y):/.test(c.opts.label ?? ''))) expect(c.prompt).toContain('relative to the repository root');
    expect(calls.find(c => c.opts.label === 'verify SEC-3…SEC-3')?.opts.effort).toBe('low');
    expect(labels).toContain('verify A11Y-1…A11Y-1 (retry)');

    expect(result.confirmed.map((f: { id: string }) => f.id)).toEqual(['SEC-1', 'SEC-2']);
    expect(result.confirmed[1].issue).toBe('SQL built by concatenation | raw SQL from the web form');
    expect(result.unverified).toEqual([expect.objectContaining({ id: 'A11Y-1', autoFixable: true })]);
    expect(result.dropped).toEqual([expect.objectContaining({ id: 'SEC-3', reason: 'not installed for production' })]);
    expect(result.leftOut).toBe(3);
    expect(result.howToApply).toContain('one kind at a time');
  });

  it('keeps one scanner\'s findings on the same line apart, and leads a merge with the more severe text', async () => {
    const { result } = await runWorkflow('sweep', { kinds: ['secure'], paths: ['a'], areas: [{ name: 'a', paths: ['a'] }, { name: 'b', paths: ['b'] }] }, (_p, o) => {
      if (o.label === 'secure: a') {
        return {
          findings: [
            { severity: 'important', file: 'a/route.ts', line: 12, issue: 'mass assignment', fix: 'pick fields' },
            { severity: 'critical', file: 'a/route.ts', line: 12, issue: 'no auth check on DELETE', fix: 'require a session' },
          ],
          summary: '2',
        };
      }
      if (o.label === 'secure: b') {
        return { findings: [{ severity: 'critical', file: 'a/route.ts', line: 12, issue: 'public form reaches the DELETE handler unauthenticated', fix: 'require a session' }], summary: '1' };
      }
      if (o.label?.startsWith('verify SEC-1')) return { real: true, reason: 'yes' };
      return { verdicts: [{ id: 'SEC-2', real: true, reason: 'yes' }] };
    });
    expect(result.confirmed.map((f: { severity: string; issue: string }) => [f.severity, f.issue])).toEqual([
      ['critical', 'no auth check on DELETE | public form reaches the DELETE handler unauthenticated'],
      ['important', 'mass assignment'],
    ]);
  });

  it('merges a duplicate seen from three areas, with ranges and nearby lines, into one finding', async () => {
    const { result, labels } = await runWorkflow('sweep', {
      kinds: ['dry'],
      areas: [{ name: 'a', paths: ['a'] }, { name: 'c', paths: ['c'] }, { name: 'b', paths: ['b'] }],
    }, (_p, o) => {
      if (o.label === 'dry: a') return { findings: [{ severity: 'important', file: 'a/x.ts', line: 1, also: ['b/y.ts:7-20'], issue: 'same price formatter', fix: 'extract' }], summary: '1' };
      if (o.label === 'dry: c') return { findings: [{ severity: 'minor', file: 'c/z.ts', line: 3, also: ['./a/x.ts:2', 'b/y.ts:8'], issue: 'formatter copied', fix: 'extract' }], summary: '1' };
      if (o.label === 'dry: b') return { findings: [{ severity: 'minor', file: 'b/y.ts', line: 9, also: ['a/x.ts:1:4', 'c/z.ts:3'], issue: 'formatter copied', fix: 'extract' }], summary: '1' };
      if (o.label?.startsWith('verify')) return { verdicts: [{ id: 'DRY-1', real: true, reason: 'identical' }] };
    });
    expect(labels).not.toContain('map');
    expect(result.confirmed).toHaveLength(1);
    expect(result.confirmed[0]).toMatchObject({ id: 'DRY-1', severity: 'important', file: 'a/x.ts', line: 1, also: ['b/y.ts:7', 'c/z.ts:3'] });
  });

  it('keeps different duplications apart even when their copies sit a few lines apart', async () => {
    const { result } = await runWorkflow('sweep', {
      kinds: ['dry'],
      areas: [{ name: 'a', paths: ['a'] }, { name: 'c', paths: ['c'] }, { name: 's', paths: ['s'] }],
    }, (_p, o) => {
      if (o.label === 'dry: a') return { findings: [{ severity: 'important', file: 'a/price.ts', line: 10, also: ['shared/utils.ts:7'], issue: 'formatPrice duplicated', fix: 'use shared formatPrice' }], summary: '1' };
      if (o.label === 'dry: c') return { findings: [{ severity: 'important', file: 'c/form.ts', line: 40, also: ['shared/utils.ts:12'], issue: 'isEmail regex duplicated', fix: 'use shared isEmail' }], summary: '1' };
      if (o.label === 'dry: s') {
        return {
          findings: [
            { severity: 'minor', file: 's/u.ts', line: 7, issue: 'formatDate copy', fix: 'extract' },
            { severity: 'minor', file: 's/u.ts', line: 30, issue: 'parseDate copy', fix: 'extract' },
          ],
          summary: '2',
        };
      }
      if (o.label?.startsWith('verify')) return { verdicts: ['DRY-1', 'DRY-2', 'DRY-3', 'DRY-4'].map(id => ({ id, real: true, reason: 'yes' })) };
    });
    expect(result.confirmed.map((f: { issue: string }) => f.issue).sort()).toEqual(['formatDate copy', 'formatPrice duplicated', 'isEmail regex duplicated', 'parseDate copy']);
  });

  it('never folds two findings of one scanner together through a third', async () => {
    const { result } = await runWorkflow('sweep', {
      kinds: ['dry'],
      areas: [{ name: 's', paths: ['s'] }, { name: 'c', paths: ['c'] }],
    }, (_p, o) => {
      if (o.label === 'dry: s') {
        return {
          findings: [
            { severity: 'minor', file: 's/u.ts', line: 7, issue: 'formatPrice copy', fix: 'extract' },
            { severity: 'minor', file: 's/u.ts', line: 30, issue: 'formatDate copy', fix: 'extract' },
          ],
          summary: '2',
        };
      }
      if (o.label === 'dry: c') return { findings: [{ severity: 'minor', file: 'c/k.ts', line: 1, also: ['s/u.ts:7', 's/u.ts:30'], issue: 'helpers copied', fix: 'extract' }], summary: '1' };
      if (o.label?.startsWith('verify')) return { verdicts: ['DRY-1', 'DRY-2'].map(id => ({ id, real: true, reason: 'yes' })) };
    });
    expect(result.confirmed).toHaveLength(2);
  });

  it('folds areas beyond maxAreas into the smallest instead of dropping them', async () => {
    const five = { areas: ['a', 'b', 'c', 'd', 'e'].map((n, i) => ({ name: n, paths: [n], files: 10 * (i + 1), ui: false })) };
    const { result, logs, labels } = await runWorkflow('sweep', { kinds: ['dry'] }, (_p, o) => (o.label === 'map' ? five : none));
    expect(logs).toContain('5 areas; folding them into 4');
    expect(labels.filter(l => l?.startsWith('dry:'))).toEqual(['dry: a + e', 'dry: b', 'dry: c', 'dry: d']);
    expect(result.areas).toEqual(['a + e', 'b', 'c', 'd']);
  });

  it('reads kinds, paths and a focus from a plain string, JSON, or comma-separated values', async () => {
    const one = { areas: [{ name: 'api', paths: ['packages/api'], files: 40, ui: false }] };
    const words = await runWorkflow('sweep', 'cleanup dry packages/api dead-code', (_p, o) => (o.label === 'map' ? one : none));
    expect(words.calls[0].prompt).toContain('looking only at packages/api');
    expect(words.labels).toEqual(['map', 'cleanup: api', 'cleanup: tooling', 'dry: api']);
    expect(words.calls[1].prompt).toContain('Focus: dead-code.');
    expect(words.calls[2].prompt).toContain('for packages/api');

    const json = await runWorkflow('sweep', '{"kinds":["secure"],"paths":["src/api"]}', (_p, o) => (o.label === 'map' ? one : none));
    expect(json.labels).toEqual(['map', 'secure: api']);

    const csv = await runWorkflow('sweep', { kinds: 'secure,a11y', paths: 'src/api' }, (_p, o) => (o.label === 'map' ? one : none));
    expect(csv.labels).toEqual(['map', 'secure: api']);
    expect(csv.calls[0].prompt).toContain('looking only at src/api');

    const proto = await runWorkflow('sweep', 'dry constructor', (_p, o) => (o.label === 'map' ? one : none));
    expect(proto.labels).toEqual(['map', 'dry: api']);
    expect(proto.calls[1].prompt).toContain('Focus: constructor.');
  });

  it('skips accessibility where there is no UI code, and returns early when nothing is found', async () => {
    const { result, logs, labels } = await runWorkflow('sweep', { kinds: ['a11y', 'cleanup'], paths: ['server'] }, (_p, o) => {
      if (o.label === 'map') return { areas: [{ name: 'server', paths: ['server'], files: 30, ui: false }] };
      return none;
    });
    expect(logs).toContain('Skipped: a11y in server (no UI code)');
    expect(result.skipped).toEqual([{ kind: 'a11y', area: 'server', reason: 'no UI code' }]);
    expect(labels).toEqual(['map', 'cleanup: server', 'cleanup: tooling']);
    expect(result.confirmed).toEqual([]);
  });

  it('reports accessibility on code without UI as skipped, not as a failed run', async () => {
    const { result, labels } = await runWorkflow('sweep', { kinds: ['a11y'] }, (_p, o) =>
      (o.label === 'map' ? { areas: [{ name: 'server', paths: ['server'], files: 30, ui: false }] } : null));
    expect(labels).toEqual(['map']);
    expect(result.skipped).toEqual([{ kind: 'a11y', area: 'server', reason: 'no UI code' }]);
    expect(result.confirmed).toEqual([]);
  });

  it('has folder-scoped security scanners cover env and config files themselves', async () => {
    const { calls } = await runWorkflow('sweep', { kinds: ['secure'], paths: ['packages/api'] }, (_p, o) =>
      (o.label === 'map' ? { areas: [{ name: 'api', paths: ['packages/api'], files: 40, ui: false }] } : none));
    expect(calls.map(c => c.opts.label)).toEqual(['map', 'secure: api']);
    expect(calls[1].prompt).toContain('No repo-wide scanner runs for this scope');
  });

  it('retries a critical finding whose verifiers both died', async () => {
    const { result, labels } = await runWorkflow('sweep', { kinds: ['secure'], paths: ['a'], areas: [{ name: 'a', paths: ['a'] }] }, (_p, o) => {
      if (o.label === 'secure: a') return { findings: [{ severity: 'critical', file: 'a/k.ts', line: 1, issue: 'hard-coded key', fix: 'move to env' }], summary: '1' };
      if (o.label === 'verify SEC-1 (retry)') return { real: true, reason: 'live key in a tracked file' };
      return null;
    });
    expect(labels).toContain('verify SEC-1 (retry)');
    expect(result.confirmed.map((f: { id: string }) => f.id)).toEqual(['SEC-1']);
  });

  it('rechecks findings a verifier skipped', async () => {
    const { result, labels } = await runWorkflow('sweep', { kinds: ['cleanup'], areas: [{ name: 'a', paths: ['a'] }] }, (_p, o) => {
      if (o.label === 'cleanup: a') {
        return {
          findings: [
            { severity: 'important', file: 'a/x.ts', line: 1, issue: 'unused export', fix: 'remove' },
            { severity: 'important', file: 'a/y.ts', line: 2, issue: 'unused export', fix: 'remove' },
          ],
          summary: '2',
        };
      }
      if (o.label === 'cleanup: tooling') return none;
      if (o.label === 'verify CLN-1…CLN-2') return { verdicts: [{ id: 'CLN-1', real: true, reason: 'no references' }] };
      if (o.label === 'verify CLN-2…CLN-2 (retry)') return { verdicts: [{ id: 'CLN-2', real: false, reason: 'imported by a route file' }] };
    });
    expect(labels).toContain('verify CLN-2…CLN-2 (retry)');
    expect(result.confirmed.map((f: { id: string }) => f.id)).toEqual(['CLN-1']);
    expect(result.dropped.map((f: { id: string }) => f.id)).toEqual(['CLN-2']);
    expect(result.unverified).toEqual([]);
  });

  it('fails instead of reporting a clean scan when no scanner returns', async () => {
    await expect(runWorkflow('sweep', { kinds: ['secure'] }, (_p, o) => (o.label === 'map' ? twoAreas : null))).rejects.toThrow(/no scanner returned/);
  });

  it('refuses kinds it does not know', async () => {
    await expect(runWorkflow('sweep', { kinds: ['perf'] }, () => null)).rejects.toThrow(/no known kinds/);
  });
});
