import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import {
  applyGlanceHook,
  claudeSettingsFile,
  decideGlanceHook,
  excludeFromGit,
  getDefaultClaudeDir,
  getSourcePaths,
  hookCommand,
  glanceModel,
  nodeForHooks,
  hasGlanceHook,
  installBlueprints,
  mergeGlanceHook,
  replaceTemplateVars,
} from '../installer.js';
import { getCodexPaths, installCodex } from '../codex.js';

// The hook script installed as it would be: templated, with the guide beside it in ../procedures/.
const support = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-glance-support-'));
const script = path.join(support, 'hooks', 'glance.mjs');

type GlanceModule = {
  worthAPage: (message: unknown, min?: number) => boolean;
  canShowPages: (env: Record<string, string | undefined>, platform: string) => boolean;
  projectDir: (input: { cwd?: string }, env: Record<string, string | undefined>) => string;
  pageName: (html: string, now?: Date) => string;
  extractHtml: (output: string) => string | null;
  writerCommand: (tool: string, model: string | undefined, project: string, outFile: string, settingsFile: string, writer?: string) => [string, string[]];
  parseArgs: (argv: string[]) => { tool: string; model?: string; writer?: string };
  workDir: () => string;
  writerPrompt: (project: string, guide: string, message: string) => string;
  freshPages: (dir: string, now?: number) => string[];
  claim: (dir: string, key: string) => boolean;
  pageTitle: (html: string) => string;
};
let glance: GlanceModule;

beforeAll(async () => {
  const source = getSourcePaths();
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.mkdirSync(path.join(support, 'procedures'), { recursive: true });
  fs.writeFileSync(script, replaceTemplateVars(fs.readFileSync(path.join(source.hooks, 'glance.mjs'), 'utf-8'), 'tasks', support));
  fs.copyFileSync(path.join(source.procedures, 'glance.md'), path.join(support, 'procedures', 'glance.md'));
  glance = await import(pathToFileURL(script).href) as GlanceModule;
});

afterAll(() => {
  fs.rmSync(support, { recursive: true, force: true });
});

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const longReply = [
  'Build 830 is installed here, and the zip is ready for the Air. '.repeat(40),
  '1. Relay on the Air. The error now names the access key.',
  '2. Placement. Guest shares sit under the repo.',
  '3. Indicators. The project row shows SHARED.',
  '- The status bar chip no longer counts the Air.',
  '- A dock terminal stays the Air\'s own shell.',
  'Should I build New terminal on that basis? '.repeat(10),
].join('\n');

describe('glance hook helpers', () => {
  it('reads a page\'s title the way the page shows it', () => {
    expect(glance.pageTitle('<title>Fixes &amp; next steps</title>')).toBe('Fixes & next steps');
    expect(glance.pageTitle('<title>Escaping &amp;lt;div&amp;gt; in JSX</title>')).toBe('Escaping &lt;div&gt; in JSX');
    expect(glance.pageTitle('<p>no title</p>')).toBe('');
  });

  it('makes a page only for long replies made of several points', () => {
    expect(glance.worthAPage(longReply)).toBe(true);
    expect(glance.worthAPage('1. short\n2. reply\n3. here\n4. ok')).toBe(false);
    expect(glance.worthAPage('Just prose. '.repeat(400))).toBe(false);
    expect(glance.worthAPage(`${longReply}\nSaved tasks/pages/2026-10-21-1400-fixes.html`)).toBe(false);
    expect(glance.worthAPage(longReply, 100_000)).toBe(false);
    expect(glance.worthAPage(undefined)).toBe(false);
  });

  it('shows pages only to someone at this machine', () => {
    expect(glance.canShowPages({ CLAUDE_CODE_SESSION_ATTENDED: '1' }, 'darwin')).toBe(true);
    expect(glance.canShowPages({}, 'darwin')).toBe(true); // Codex sets nothing
    expect(glance.canShowPages({ CLAUDE_CODE_SESSION_ATTENDED: '0' }, 'darwin')).toBe(false); // claude -p, background runs
    expect(glance.canShowPages({ SSH_CONNECTION: '1.2.3.4 5 6.7.8.9 22' }, 'darwin')).toBe(false);
    expect(glance.canShowPages({}, 'linux')).toBe(false);
    expect(glance.canShowPages({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux')).toBe(true);
  });

  it('puts pages in the session\'s project folder', () => {
    expect(glance.projectDir({ cwd: '/p/root/packages/web' }, { CLAUDE_PROJECT_DIR: '/p/root' })).toBe('/p/root');
    expect(glance.projectDir({ cwd: '/p/root/packages/web' }, {})).toBe('/p/root/packages/web'); // Codex
  });

  it('reads its arguments, and writes in a folder only this user can use', () => {
    expect(glance.parseArgs(['claude', '--model', 'opus', '--writer', '/x/claude'])).toEqual({ tool: 'claude', model: 'opus', writer: '/x/claude' });
    expect(glance.parseArgs(['codex'])).toEqual({ tool: 'codex', model: undefined, writer: undefined });
    const dir = glance.workDir();
    const st = fs.lstatSync(dir);
    expect(st.isDirectory() && !st.isSymbolicLink()).toBe(true);
    if (process.platform !== 'win32') expect(st.mode & 0o077).toBe(0);
  });

  it('names a page by time and title, and pulls a locked-down document out of chatty output', () => {
    const html = '<!doctype html><html><head><title>Build 830: Sharing Fixes, Indicators and More!</title></head><body></body></html>';
    expect(glance.pageName(html, new Date(2026, 9, 21, 9, 5))).toBe('2026-10-21-0905-build-830-sharing-fixes-indicators.html');
    expect(glance.pageName('<html></html>', new Date(2026, 0, 2, 13, 0))).toBe('2026-01-02-1300-reply.html');
    const page = glance.extractHtml(`Here it is:\n\`\`\`html\n${html}\n\`\`\``);
    expect(page).toMatch(/^<!doctype html>/);
    expect(page).toMatch(/<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none';/);
    expect(page).toMatch(/<\/html>$/);
    expect(glance.extractHtml('<html><body>x</body></html>')).toContain('<head><meta http-equiv="Content-Security-Policy"');
    expect(glance.extractHtml('<html><body><header class="top">x</header></body></html>')).toMatch(/^<html>\n<head><meta http-equiv="Content-Security-Policy"/);
    expect(glance.extractHtml('Sorry, no page.')).toBeNull();
  });

  it('runs the page writer without hooks, saved sessions or write access, with the reply marked off on stdin', () => {
    const [claude, cArgs] = glance.writerCommand('claude', 'opus', '/p/app', '/w/out.html', '/w/s.json', '/opt/claude');
    expect(claude).toBe('/opt/claude');
    expect(cArgs).toEqual(expect.arrayContaining(['-p', '--model', 'opus', '--add-dir', '/p/app', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence']));
    expect(cArgs[cArgs.indexOf('--tools') + 1]).toBe('Read,Grep,Glob');
    expect(cArgs[cArgs.indexOf('--setting-sources') + 1]).toBe('user');
    expect(cArgs[cArgs.indexOf('--settings') + 1]).toBe('/w/s.json');
    const [plain, pArgs] = glance.writerCommand('claude', undefined, '/p', '/o', '/s');
    expect(plain).toBe('claude');
    expect(pArgs).toEqual(expect.arrayContaining(['--model', 'sonnet']));

    const [codex, xArgs] = glance.writerCommand('codex', undefined, '/p/app', '/w/out.html', '/w/s.json');
    expect(codex).toBe('codex');
    expect(xArgs[0]).toBe('exec');
    expect(xArgs).toEqual(expect.arrayContaining(['--ephemeral', '-s', 'read-only', '-o', '/w/out.html']));
    expect(xArgs).not.toContain('-m');
    expect(xArgs.at(-1)).toBe('-');

    const prompt = glance.writerPrompt('/p/app', '# Guide\n\n- rule', 'the reply');
    expect(prompt).toContain('The project is at /p/app.');
    expect(prompt.indexOf('# Guide')).toBeLessThan(prompt.indexOf('<reply>\nthe reply\n</reply>'));
  });

  it('lists recent pages nothing has opened yet, newest first, and claims each one once', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glance-pages-'));
    const now = Date.now();
    for (const [name, ageMin] of [['a.html', 5], ['b.html', 1], ['old.html', 90], ['notes.txt', 1]] as const) {
      const file = path.join(dir, name);
      fs.writeFileSync(file, 'x');
      fs.utimesSync(file, (now - ageMin * 60_000) / 1000, (now - ageMin * 60_000) / 1000);
    }
    expect(glance.freshPages(dir, now)).toEqual(['b.html', 'a.html']);
    expect(glance.claim(dir, 'open-b.html')).toBe(true);
    expect(glance.claim(dir, 'open-b.html')).toBe(false);
    expect(glance.freshPages(dir, now)).toEqual(['a.html']);
    fs.rmSync(dir, { recursive: true });
  });
});

describe('glance hook', () => {
  let project: string;
  let bin: string;
  let opened: string;
  let writerArgs: string;
  let writerStdin: string;
  let writerEnv: string;

  const pages = () => path.join(project, 'tasks', 'pages');
  const pageFiles = () => (fs.existsSync(pages()) ? fs.readdirSync(pages()).filter(f => f.endsWith('.html')) : []);
  const recordsDir = () => path.join(bin, 'config', 'blueprints', 'glance-jobs');
  const records = (session: string) => {
    const dir = recordsDir();
    return (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
      .filter(f => f.startsWith(`${session}.`) && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
  };
  const hookEnv = (env: Record<string, string>) => {
    const base: Record<string, string | undefined> = {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      BLUEPRINTS_GLANCE_OPENER: path.join(bin, 'opener'),
      // Never the real claude or codex: the writer is always a stand-in (a missing one in one test)
      BLUEPRINTS_GLANCE_WRITER: path.join(bin, 'claude'),
      CLAUDE_CODE_EXECPATH: path.join(bin, 'claude'),
      CLAUDE_CODE_SESSION_ATTENDED: '1',
      CLAUDECODE: '1',
      DISPLAY: ':0',
      // Records for the mod go under Claude Code's config folder: a scratch one, never the real ~/.claude
      CLAUDE_CONFIG_DIR: path.join(bin, 'config'),
      ...env,
    };
    for (const key of ['BLUEPRINTS_GLANCE', 'BLUEPRINTS_GLANCE_CHILD', 'BLUEPRINTS_GLANCE_MIN', 'BLUEPRINTS_GLANCE_MODEL', 'CLAUDE_PROJECT_DIR', 'SSH_CONNECTION', 'SSH_TTY']) {
      if (!(key in env)) delete base[key];
    }
    return base;
  };
  const payload = (message: string, extra = {}) => JSON.stringify({ hook_event_name: 'Stop', cwd: project, stop_hook_active: false, last_assistant_message: message, ...extra });
  const writerFor = (tool: string) => ({ BLUEPRINTS_GLANCE_WRITER: path.join(bin, tool) });
  const runHook = (tool: string, message: string, env: Record<string, string> = {}, extra = {}) =>
    spawnSync(process.execPath, [script, tool, '--model', 'sonnet'], { input: payload(message, extra), env: hookEnv({ ...writerFor(tool), ...env }), encoding: 'utf-8' });
  const runHookAsync = (tool: string, message: string) => new Promise<number | null>(resolve => {
    const child = spawn(process.execPath, [script, tool, '--model', 'sonnet'], { env: hookEnv(writerFor(tool)) });
    child.on('close', resolve);
    child.stdin.end(payload(message));
  });
  const waitFor = async (check: () => boolean, ms = 10_000) => {
    const end = Date.now() + ms;
    while (!check() && Date.now() < end) await sleep(100);
    return check();
  };

  beforeEach(() => {
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'glance-project-'));
    bin = fs.mkdtempSync(path.join(os.tmpdir(), 'glance-bin-'));
    opened = path.join(bin, 'opened.log');
    writerArgs = path.join(bin, 'writer-args.log');
    writerStdin = path.join(bin, 'writer-stdin.log');
    writerEnv = path.join(bin, 'writer-env.log');
    const page = '<!doctype html><html><head><title>Fake Page</title></head><body>ok</body></html>';
    // Stand-ins for the opener and the two CLIs: they record how they were called.
    fs.writeFileSync(path.join(bin, 'opener'), `#!/bin/sh\necho "$@" >> "${opened}"\n`, { mode: 0o755 });
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${writerArgs}"\necho "\${CLAUDECODE:-unset} \${CLAUDE_CODE_SESSION_ATTENDED:-unset}" > "${writerEnv}"\ncat > "${writerStdin}"\necho 'Here you go:'\necho '${page}'\n`, { mode: 0o755 });
    fs.writeFileSync(path.join(bin, 'codex'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${writerArgs}"\ncat > "${writerStdin}"\nwhile [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then echo '${page}' > "$2"; fi; shift; done\n`, { mode: 0o755 });
  });

  afterEach(() => {
    fs.rmSync(project, { recursive: true, force: true });
    fs.rmSync(bin, { recursive: true, force: true });
  });

  it('turns a long reply into a page in the background, opens it behind the terminal, and never repeats it', { timeout: 20_000 }, async () => {
    expect(runHook('claude', longReply).status).toBe(0);
    expect(await waitFor(() => pageFiles().length > 0 && fs.existsSync(opened))).toBe(true);
    const [made] = pageFiles();
    expect(made).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}-fake-page\.html$/);
    expect(fs.readFileSync(path.join(pages(), made), 'utf-8')).toContain('Content-Security-Policy');
    expect(fs.readFileSync(path.join(pages(), '.gitignore'), 'utf-8')).toBe('*\n');
    expect(fs.readFileSync(opened, 'utf-8')).toContain(made);
    const args = fs.readFileSync(writerArgs, 'utf-8').split('\n');
    expect(args).toContain('--no-session-persistence');
    const settingsFile = args[args.indexOf('--settings') + 1];
    expect(settingsFile).toMatch(/blueprints-glance-[^/]+\/[0-9a-f]+\.settings\.json$/);
    expect(fs.readFileSync(writerEnv, 'utf-8').trim()).toBe('unset unset'); // a new session, not a child of this one
    expect(fs.readFileSync(writerStdin, 'utf-8')).toContain(`<reply>\n${longReply}\n</reply>`);
    expect(await waitFor(() => !fs.existsSync(settingsFile))).toBe(true); // the writer's files are cleaned up

    // The next reply ends: the page isn't opened again, and the same reply isn't turned into a second page.
    fs.rmSync(opened);
    fs.rmSync(writerStdin);
    runHook('claude', 'ok');
    runHook('claude', longReply);
    await sleep(1_000);
    expect(fs.existsSync(opened)).toBe(false);
    expect(fs.existsSync(writerStdin)).toBe(false);
    expect(pageFiles()).toHaveLength(1);
  });

  it('makes one page when two hooks see the same reply at once', { timeout: 20_000 }, async () => {
    await Promise.all([runHookAsync('claude', longReply), runHookAsync('claude', longReply)]);
    expect(await waitFor(() => pageFiles().length > 0 && fs.existsSync(opened))).toBe(true);
    await sleep(1_000);
    expect(pageFiles()).toHaveLength(1);
    expect(fs.readFileSync(opened, 'utf-8').trim().split('\n')).toHaveLength(1);
  });

  it('works the same way in Codex, reading the page from the file it asks for', { timeout: 20_000 }, async () => {
    runHook('codex', longReply, {}, { session_id: 'codex-1' });
    expect(await waitFor(() => pageFiles().length > 0)).toBe(true);
    expect(records('codex-1')).toEqual([]); // Codex has no mods: nothing is recorded
    expect(fs.readFileSync(writerArgs, 'utf-8')).toContain('read-only');
    expect(fs.readFileSync(writerStdin, 'utf-8')).toContain('<reply>');
  });

  it('logs and cleans up when the writer can\'t be found', { timeout: 20_000 }, async () => {
    runHook('claude', longReply, { BLUEPRINTS_GLANCE_WRITER: path.join(bin, 'missing-claude') }, { session_id: 'sess-b' });
    expect(await waitFor(() => fs.existsSync(path.join(pages(), '.glance.log')))).toBe(true);
    expect(fs.readFileSync(path.join(pages(), '.glance.log'), 'utf-8')).toMatch(/no page from claude: .*ENOENT/);
    expect(pageFiles()).toEqual([]);
    expect(fs.existsSync(opened)).toBe(false);
    expect(await waitFor(() => records('sess-b')[0]?.state === 'failed')).toBe(true);
    expect(records('sess-b')[0]).toMatchObject({ state: 'failed', reason: expect.stringContaining('.glance.log') });
  });

  it('records a failure when the writer can\'t even start, so the mod doesn\'t wait on it', { timeout: 20_000 }, async () => {
    // Its private working folder is a symlink (someone else's): it refuses to use it
    const tmp = path.join(bin, 'tmp');
    fs.mkdirSync(tmp);
    fs.symlinkSync(bin, path.join(tmp, `blueprints-glance-${process.getuid?.() ?? 'user'}`));
    runHook('claude', longReply, { TMPDIR: tmp }, { session_id: 'sess-c' });
    expect(await waitFor(() => records('sess-c')[0]?.state === 'failed')).toBe(true);
    expect(records('sess-c')[0].reason).toMatch(/not a private folder/);
    expect(fs.readFileSync(path.join(pages(), '.glance.log'), 'utf-8')).toMatch(/no page: refusing to use/);
  });

  it('records each page for the session\'s mod: making, then ready with the page and its title', { timeout: 20_000 }, async () => {
    // A writer that takes a moment, so the record can be seen while the page is being made
    const page = '<!doctype html><html><head><title>Fixes &amp; next steps</title></head><body>ok</body></html>';
    fs.writeFileSync(path.join(bin, 'slow-claude'), `#!/bin/sh\ncat > /dev/null\nsleep 1\necho '${page}'\n`, { mode: 0o755 });
    runHook('claude', longReply, { BLUEPRINTS_GLANCE_WRITER: path.join(bin, 'slow-claude') }, { session_id: 'sess-a' });
    const [making] = records('sess-a');
    expect(making).toMatchObject({ state: 'making', startedAt: expect.any(Number) });
    expect(await waitFor(() => records('sess-a')[0]?.state === 'ready')).toBe(true);
    const [ready] = records('sess-a');
    expect(ready).toMatchObject({ state: 'ready', title: 'Fixes & next steps', startedAt: making.startedAt, finishedAt: expect.any(Number) });
    expect(ready.page).toBe(path.join(pages(), pageFiles()[0]));
    expect(fs.readdirSync(recordsDir()).filter(f => f.endsWith('.tmp'))).toEqual([]);
    // A session id that isn't one is not used as a file name
    runHook('claude', `${longReply}\nmore`, { BLUEPRINTS_GLANCE_WRITER: path.join(bin, 'slow-claude') }, { session_id: '../../x' });
    expect(fs.readdirSync(recordsDir()).some(f => f.startsWith('session.'))).toBe(true);
  });

  it('opens a page /glance saved even with automatic pages off, and after another Stop hook blocked once', { timeout: 20_000 }, async () => {
    fs.mkdirSync(pages(), { recursive: true });
    fs.writeFileSync(path.join(pages(), '.auto-off'), '');
    fs.writeFileSync(path.join(pages(), '2026-10-21-1400-asked.html'), '<html></html>');

    runHook('claude', longReply, {}, { stop_hook_active: true });
    expect(await waitFor(() => fs.existsSync(opened))).toBe(true);
    expect(fs.readFileSync(opened, 'utf-8')).toContain('2026-10-21-1400-asked.html');
    await sleep(800);
    expect(fs.existsSync(writerArgs)).toBe(false); // .auto-off: no page of its own
  });

  it('does nothing when switched off, unattended, or running as the page writer itself', { timeout: 20_000 }, async () => {
    fs.mkdirSync(pages(), { recursive: true });
    fs.writeFileSync(path.join(pages(), '2026-10-21-1400-asked.html'), '<html></html>');
    runHook('claude', longReply, { BLUEPRINTS_GLANCE: 'off' });
    runHook('claude', longReply, { CLAUDE_CODE_SESSION_ATTENDED: '0' });
    runHook('claude', longReply, { SSH_CONNECTION: '1.2.3.4 5 6.7.8.9 22' });
    runHook('claude', longReply, { BLUEPRINTS_GLANCE_CHILD: '1' });
    await sleep(1_000);
    expect(fs.existsSync(opened)).toBe(false);
    expect(fs.existsSync(writerArgs)).toBe(false);

    runHook('claude', longReply, { BLUEPRINTS_GLANCE: 'open' }); // opens, but makes nothing
    expect(await waitFor(() => fs.existsSync(opened))).toBe(true);
    await sleep(800);
    expect(fs.existsSync(writerArgs)).toBe(false);
  });
});

describe('glance hook registration', () => {
  let root: string;
  let home: string;
  const realHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-glance-install-'));
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-home-'));
    process.env.HOME = home; // never the real ~/.claude
    process.env.USERPROFILE = home;
  });

  afterEach(() => {
    process.env.HOME = realHome.HOME;
    process.env.USERPROFILE = realHome.USERPROFILE;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('adds, replaces and removes only its own Stop entry', () => {
    const existing = { model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine.sh' }] }], PreToolUse: [] } };
    const once = mergeGlanceHook(existing, '"/n/node" "/a/blueprints/hooks/glance.mjs" claude sonnet');
    const twice = mergeGlanceHook(once, '"/n/node" "/b/blueprints/hooks/glance.mjs" claude opus');
    expect(twice.model).toBe('opus');
    expect(twice.hooks?.Stop).toHaveLength(2);
    expect(twice.hooks?.Stop?.[0]).toEqual(existing.hooks.Stop[0]);
    expect(twice.hooks?.Stop?.[1].hooks?.[0].command).toContain('/b/');
    expect(hasGlanceHook(twice)).toBe(true);

    const removed = mergeGlanceHook(twice, null);
    expect(removed.hooks?.Stop).toEqual(existing.hooks.Stop);
    expect(mergeGlanceHook({ hooks: { Stop: [] } }, null)).toEqual({});
  });

  it('leaves an identical entry alone, and hooks of an unexpected shape untouched', () => {
    const command = '"/n/node" "/a/blueprints/hooks/glance.mjs" claude sonnet';
    const installed = mergeGlanceHook({}, command);
    expect(decideGlanceHook(installed, 'keep', command)).toEqual({ value: null, result: 'none' });
    expect(decideGlanceHook(installed, 'on', command)).toEqual({ value: null, result: 'none' });
    expect(decideGlanceHook(installed, 'keep', command.replace('sonnet', 'opus')).result).toBe('updated');
    expect(decideGlanceHook({ hooks: { Stop: { oops: true } } }, 'on', command).result).toBe('unreadable');
    expect(decideGlanceHook({ hooks: [] }, 'on', command).result).toBe('unreadable');
  });

  it('runs Node and the writer by their full paths, and uses the user\'s settings only for a global install', () => {
    const node = nodeForHooks();
    expect(path.isAbsolute(node)).toBe(true);
    expect(fs.realpathSync(node)).toBe(fs.realpathSync(process.execPath));
    expect(hookCommand('/x/blueprints/hooks/glance.mjs', 'claude --model sonnet', '/b/claude')).toBe(`"${node.replace(/\\/g, '/')}" "/x/blueprints/hooks/glance.mjs" claude --model sonnet --writer "/b/claude"`);
    expect(hookCommand('/x/glance.mjs', 'codex')).toBe(`"${node.replace(/\\/g, '/')}" "/x/glance.mjs" codex`);
    expect(claudeSettingsFile(getDefaultClaudeDir())).toBe(path.join(getDefaultClaudeDir(), 'settings.json'));
    expect(claudeSettingsFile(path.join(root, '.claude'))).toBe(path.join(root, '.claude', 'settings.local.json'));
  });

  it('writes a project\'s local settings with the model from the power level, and keeps them out of git', async () => {
    spawnSync('git', ['init', '-q'], { cwd: root });
    const claudeDir = path.join(root, '.claude');
    const settings = claudeSettingsFile(claudeDir);
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(settings, JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }));

    expect((await installBlueprints(claudeDir, 4, 'tasks')).glanceHook).toBe('none');
    // claude: null, so a test never runs the real `claude plugin` (the mod has tests of its own below)
    expect((await installBlueprints(claudeDir, 5, 'tasks', { glance: 'on', claude: null })).glanceHook).toBe('added');
    const written = JSON.parse(fs.readFileSync(settings, 'utf-8'));
    expect(written.permissions).toEqual({ allow: ['Bash(ls)'] });
    expect(written.hooks.Stop[0].hooks[0].command).toMatch(/^".+" ".*blueprints\/hooks\/glance\.mjs" claude --model opus( --writer ".+")?$/);
    expect(fs.existsSync(`${settings}.before-blueprints`)).toBe(true);
    expect(fs.readFileSync(path.join(claudeDir, 'blueprints', 'hooks', 'glance.mjs'), 'utf-8')).toContain("const TASKS_DIR = 'tasks'");
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'glance.md'))).toBe(true);
    expect(fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf-8')).toContain('/.claude/settings.local.json');
    expect(spawnSync('git', ['check-ignore', '-q', '.claude/settings.local.json'], { cwd: root }).status).toBe(0);
    expect(excludeFromGit(settings)).toBe(true);
    expect(fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf-8').match(/settings\.local\.json/g)).toHaveLength(1);

    expect((await installBlueprints(claudeDir, 5, 'tasks')).glanceHook).toBe('none');
    expect((await installBlueprints(claudeDir, 4, 'tasks')).glanceHook).toBe('updated');
    expect(JSON.parse(fs.readFileSync(settings, 'utf-8')).hooks.Stop[0].hooks[0].command).toMatch(/ claude --model sonnet( |$)/);
    expect((await installBlueprints(claudeDir, 4, 'tasks', { glance: 'off' })).glanceHook).toBe('removed');
    expect(JSON.parse(fs.readFileSync(settings, 'utf-8'))).toEqual({ permissions: { allow: ['Bash(ls)'] } });
  });

  it('keeps a worktree\'s local settings out of git too', () => {
    const repo = path.join(root, 'repo');
    fs.mkdirSync(repo);
    const git = (cwd: string, ...args: string[]) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf-8' });
    git(repo, 'init', '-q');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'init');
    git(repo, 'worktree', 'add', '-q', path.join(root, 'wt'));
    const file = path.join(root, 'wt', '.claude', 'settings.local.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{}');
    expect(excludeFromGit(file)).toBe(true);
    expect(git(path.join(root, 'wt'), 'check-ignore', '-q', '.claude/settings.local.json').status).toBe(0);
  });

  it('leaves settings it can\'t parse alone', () => {
    const file = path.join(root, 'settings.json');
    fs.writeFileSync(file, '{ not json');
    expect(applyGlanceHook(file, 'on', 'node x')).toBe('unreadable');
    expect(fs.readFileSync(file, 'utf-8')).toBe('{ not json');
  });

  it('registers the Codex Stop hook beside the typecheck gate and the user\'s own hooks', async () => {
    const paths = getCodexPaths('project', root);
    fs.mkdirSync(path.dirname(paths.hooksFile), { recursive: true });
    fs.writeFileSync(paths.hooksFile, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'my-stop.sh' }] }] } }));

    const result = await installCodex('project', root, 4, 'work', undefined, { glance: 'on' });
    expect(result.glanceHook).toBe('added');
    const hooks = JSON.parse(fs.readFileSync(paths.hooksFile, 'utf-8')).hooks;
    expect(hooks.SubagentStop[0].matcher).toBe('^implement$');
    expect(hooks.Stop[0].hooks[0].command).toBe('my-stop.sh');
    expect(hooks.Stop[1].hooks[0].command).toMatch(/^".+" ".*blueprints\/hooks\/glance\.mjs" codex( --writer ".+")?$/);
    const installed = fs.readFileSync(path.join(paths.support, 'hooks', 'glance.mjs'), 'utf-8');
    expect(installed).toContain("const TASKS_DIR = 'work'");
    expect(installed).not.toContain('{{');
    expect(fs.existsSync(path.join(paths.support, 'procedures', 'glance.md'))).toBe(true);

    expect((await installCodex('project', root, 4, 'work', undefined, { glance: 'keep' })).glanceHook).toBe('none');
    expect((await installCodex('project', root, 4, 'work', undefined, { glance: 'off' })).glanceHook).toBe('removed');
    expect(JSON.parse(fs.readFileSync(paths.hooksFile, 'utf-8')).hooks.Stop).toEqual([{ hooks: [{ type: 'command', command: 'my-stop.sh' }] }]);
  });

  it('writes pages with Opus only at power level 5', () => {
    expect([1, 2, 3, 4, 5].map(level => glanceModel(level as 1 | 2 | 3 | 4 | 5))).toEqual(['sonnet', 'sonnet', 'sonnet', 'sonnet', 'opus']);
  });
});

describe('glance mod', () => {
  let root: string;
  let home: string;
  let fake: string;
  let calls: string;
  const realHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  const ran = () => (fs.existsSync(calls) ? fs.readFileSync(calls, 'utf-8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as { cwd: string; args: string[] }) : []);

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-mod-')));
    home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-home-')));
    process.env.HOME = home; // never the real ~/.claude
    process.env.USERPROFILE = home;
    // A stand-in for `claude plugin`: it records each call and edits the settings the way the real one does
    calls = path.join(root, 'calls.log');
    const impl = path.join(root, 'fake-claude.mjs');
    fs.writeFileSync(impl, `
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ cwd: process.cwd(), args }) + '\\n');
if (process.env.FAKE_CLAUDE_FAIL) { console.error('boom: no marketplace'); process.exit(1); }
const [, verb, ...rest] = args;
const scope = rest[rest.indexOf('--scope') + 1];
const file = scope === 'local' ? path.join(process.cwd(), '.claude', 'settings.local.json') : path.join(os.homedir(), '.claude', 'settings.json');
const s = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : {};
if (verb === 'marketplace' && rest[0] === 'add') s.extraKnownMarketplaces = { ...s.extraKnownMarketplaces, blueprints: { source: { source: 'directory', path: rest[1] } } };
if (verb === 'marketplace' && rest[0] === 'remove') delete s.extraKnownMarketplaces?.[rest[1]];
if (verb === 'install') s.enabledPlugins = { ...s.enabledPlugins, [rest[0]]: true };
if (verb === 'uninstall') delete s.enabledPlugins?.[rest[0]];
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(s, null, 2));
`);
    fake = path.join(root, 'claude');
    fs.writeFileSync(fake, `#!/bin/sh\nexec "${process.execPath}" "${impl}" "$@"\n`, { mode: 0o755 });
  });

  afterEach(() => {
    process.env.HOME = realHome.HOME;
    process.env.USERPROFILE = realHome.USERPROFILE;
    delete process.env.FAKE_CLAUDE_FAIL;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('adds the mod for the user from a project install when it\'s missing, and never takes it away', { timeout: 20_000 }, async () => {
    const project = path.join(root, 'app');
    const claudeDir = path.join(project, '.claude');
    const userMods = path.join(home, '.claude', 'blueprints', 'mods');
    const userSettings = () => JSON.parse(fs.readFileSync(path.join(home, '.claude', 'settings.json'), 'utf-8'));

    expect((await installBlueprints(claudeDir, 4, 'tasks', { glance: 'on', claude: fake })).glanceMod).toBe('added');
    expect(ran()).toEqual([
      { cwd: home, args: ['plugin', 'marketplace', 'add', userMods, '--scope', 'user'] },
      { cwd: home, args: ['plugin', 'install', 'blueprints-glance@blueprints', '--scope', 'user'] },
    ]);
    expect(userSettings().enabledPlugins).toEqual({ 'blueprints-glance@blueprints': true });
    expect(fs.existsSync(path.join(userMods, '.claude-plugin', 'marketplace.json'))).toBe(true);
    expect(fs.existsSync(path.join(userMods, 'glance', '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(fs.readdirSync(path.join(userMods, 'glance')).some(f => f.includes('.test.'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'blueprints', 'mods'))).toBe(false); // nothing per project

    // Already there: nothing to do. A second project: nothing either. Glance off in a project: the user keeps it.
    expect((await installBlueprints(claudeDir, 4, 'tasks', { claude: fake })).glanceMod).toBe('none');
    expect((await installBlueprints(path.join(root, 'other', '.claude'), 4, 'tasks', { glance: 'on', claude: fake })).glanceMod).toBe('none');
    expect((await installBlueprints(claudeDir, 4, 'tasks', { glance: 'off', claude: fake })).glanceMod).toBe('none');
    expect(ran()).toHaveLength(2);
    expect(userSettings().enabledPlugins).toEqual({ 'blueprints-glance@blueprints': true });
  });

  it('adds and removes it with a global install, and leaves a mod the user switched off', { timeout: 20_000 }, async () => {
    const userDir = path.join(home, '.claude');
    const userSettings = () => JSON.parse(fs.readFileSync(path.join(userDir, 'settings.json'), 'utf-8'));
    expect((await installBlueprints(userDir, 4, 'tasks', { glance: 'on', claude: fake })).glanceMod).toBe('added');
    expect(ran().map(c => c.args.slice(1, 3))).toEqual([['marketplace', 'add'], ['install', 'blueprints-glance@blueprints']]);

    const off = userSettings();
    off.enabledPlugins['blueprints-glance@blueprints'] = false;
    fs.writeFileSync(path.join(userDir, 'settings.json'), JSON.stringify(off));
    expect((await installBlueprints(userDir, 4, 'tasks', { claude: fake })).glanceMod).toBe('none');
    expect(ran()).toHaveLength(2);

    expect((await installBlueprints(userDir, 4, 'tasks', { glance: 'off', claude: fake })).glanceMod).toBe('removed');
    expect(ran().slice(2).map(c => c.args.slice(1, 3))).toEqual([['uninstall', 'blueprints-glance@blueprints'], ['marketplace', 'remove']]);
    expect(userSettings().enabledPlugins).toBeUndefined(); // the empty lists `claude plugin` leaves are tidied away
    expect(userSettings().extraKnownMarketplaces).toBeUndefined();
  });

  it('says what to run when it can\'t add the mod, and the glance hook works anyway', { timeout: 20_000 }, async () => {
    const project = path.join(root, 'other', '.claude');
    expect((await installBlueprints(project, 4, 'tasks', { glance: 'on', claude: null })).glanceMod).toBe('no-cli');
    process.env.FAKE_CLAUDE_FAIL = '1';
    const failed = await installBlueprints(project, 4, 'tasks', { glance: 'on', claude: fake });
    expect(failed.glanceMod).toBe('failed');
    expect(failed.glanceModError).toMatch(/claude plugin marketplace add: boom: no marketplace/);
    expect(hasGlanceHook(JSON.parse(fs.readFileSync(path.join(project, 'settings.local.json'), 'utf-8')))).toBe(true);
  });
});
