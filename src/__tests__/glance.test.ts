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
  glanceHookCommand,
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
    runHook('codex', longReply);
    expect(await waitFor(() => pageFiles().length > 0)).toBe(true);
    expect(fs.readFileSync(writerArgs, 'utf-8')).toContain('read-only');
    expect(fs.readFileSync(writerStdin, 'utf-8')).toContain('<reply>');
  });

  it('logs and cleans up when the writer can\'t be found', { timeout: 20_000 }, async () => {
    runHook('claude', longReply, { BLUEPRINTS_GLANCE_WRITER: path.join(bin, 'missing-claude') });
    expect(await waitFor(() => fs.existsSync(path.join(pages(), '.glance.log')))).toBe(true);
    expect(fs.readFileSync(path.join(pages(), '.glance.log'), 'utf-8')).toMatch(/no page from claude: .*ENOENT/);
    expect(pageFiles()).toEqual([]);
    expect(fs.existsSync(opened)).toBe(false);
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

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-glance-install-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
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
    expect(glanceHookCommand('/x/blueprints/hooks/glance.mjs', 'claude --model sonnet', '/b/claude')).toBe(`"${node.replace(/\\/g, '/')}" "/x/blueprints/hooks/glance.mjs" claude --model sonnet --writer "/b/claude"`);
    expect(glanceHookCommand('/x/glance.mjs', 'codex')).toBe(`"${node.replace(/\\/g, '/')}" "/x/glance.mjs" codex`);
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
    expect((await installBlueprints(claudeDir, 5, 'tasks', { glance: 'on' })).glanceHook).toBe('added');
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
