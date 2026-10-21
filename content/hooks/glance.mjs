#!/usr/bin/env node
// Blueprints glance hook: runs when the main session finishes a reply (Stop), in Claude Code or Codex.
// 1. Opens pages a reply saved in {{TASKS_DIR}}/pages/ (the session's sandbox can't open a browser; hooks can).
// 2. Turns a long, structured reply into a page in the background, then opens it behind the terminal.
//
// Hook:      node glance.mjs <claude|codex> [--model <model>] [--writer <path to claude or codex>]
//            (reads the Stop payload on stdin; the installer records the writer's path)
// Generator: node glance.mjs --generate <job file>    (started by the hook, detached)
//
// BLUEPRINTS_GLANCE=off turns it all off; =open only opens pages, without making any.
// BLUEPRINTS_GLANCE_MODEL picks the model, BLUEPRINTS_GLANCE_MIN the reply length (default 2500 characters),
// BLUEPRINTS_GLANCE_OPENER the command that opens a page (e.g. `open -a "Google Chrome"`),
// and BLUEPRINTS_GLANCE_WRITER the claude or codex to run.
// A project switches automatic pages off with {{TASKS_DIR}}/pages/.auto-off (`/glance auto off`).
// In Claude Code each page it makes is recorded in ~/.claude/blueprints/glance-jobs/<session>.<hash>.json
// (making, then ready or failed), which the blueprints-glance mod reads to show it above the prompt.
// Unattended sessions (`claude -p`, background runs), SSH sessions and Linux without a display are skipped.
// Anything unexpected exits 0: the hook never gets in the session's way.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TASKS_DIR = '{{TASKS_DIR}}';
const SELF = fileURLToPath(import.meta.url);
const GUIDE = path.join(path.dirname(SELF), '..', 'procedures', 'glance.md');
const RECENT_MS = 30 * 60 * 1000;
const CLAIM_TTL_MS = 2 * 24 * 60 * 60 * 1000;
const GENERATE_TIMEOUT_MS = 10 * 60 * 1000;
const WIN = process.platform === 'win32';
// Opened as file://, so the page itself can't run scripts or load anything, whatever the model wrote.
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">`;

export function pagesDir(projectDir) {
  return path.join(projectDir, TASKS_DIR, 'pages');
}

export function ensurePagesDir(dir) {
  fs.mkdirSync(path.join(dir, '.claims'), { recursive: true });
  const ignore = path.join(dir, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
}

// A claim is an empty file created exclusively: whoever creates it first opens the page or makes it.
// Two hooks running at once (say, a global and a project install) can't both act.
export function claim(dir, key) {
  try {
    fs.mkdirSync(path.join(dir, '.claims'), { recursive: true });
    fs.closeSync(fs.openSync(path.join(dir, '.claims', key), 'wx'));
    return true;
  } catch {
    return false;
  }
}

export function claimed(dir, key) {
  return fs.existsSync(path.join(dir, '.claims', key));
}

// Claims (and records) older than two days are done with
function pruneOld(folder, now = Date.now()) {
  if (!fs.existsSync(folder)) return;
  for (const name of fs.readdirSync(folder)) {
    try {
      if (now - fs.statSync(path.join(folder, name)).mtimeMs > CLAIM_TTL_MS) fs.rmSync(path.join(folder, name));
    } catch {
      // gone already
    }
  }
}

// Where Claude Code pages being made are recorded for the blueprints-glance mod: a folder of the user's own,
// so nothing in a project can pass for a record, keyed by the session that asked for the page
export function recordsDir(env = process.env) {
  return path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'blueprints', 'glance-jobs');
}

export function jobRecord(sessionId, hash, dir = recordsDir()) {
  const session = typeof sessionId === 'string' && /^[\w-]{1,100}$/.test(sessionId) ? sessionId : 'session';
  return path.join(dir, `${session}.${hash}.json`);
}

// Written whole (a reader never sees half a record); a failure to record never stops the page
export function writeRecord(file, record) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(record));
    fs.renameSync(`${file}.tmp`, file);
  } catch {
    // the page is still made
  }
}

export function pageTitle(html) {
  const raw = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  // &amp; last, so `&amp;lt;` stays `&lt;` as the page shows it
  const text = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

// Pages saved in the last half hour that nothing has opened yet, newest first.
export function freshPages(dir, now = Date.now()) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.html') && !claimed(dir, `open-${name}`))
    .map(name => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .filter(page => now - page.mtime < RECENT_MS)
    .sort((a, b) => b.mtime - a.mtime)
    .map(page => page.name);
}

// Long enough to be worth a page, and made of several points rather than one block of prose.
export function worthAPage(message, min = Number(process.env.BLUEPRINTS_GLANCE_MIN) || 2500) {
  if (typeof message !== 'string' || message.length < min) return false;
  if (/\/pages\/[^\s]*\.html/.test(message)) return false; // the reply to /glance itself
  const points = message.split('\n').filter(line => /^\s*([-*•]|\d+[.)]|#{1,4})\s/.test(line)).length;
  return points >= 4;
}

// Someone is at this machine and the session is interactive: otherwise a page would open in nobody's face.
export function canShowPages(env = process.env, platform = process.platform) {
  if (env.CLAUDE_CODE_SESSION_ATTENDED === '0') return false; // `claude -p`, background runs
  if (env.SSH_CONNECTION || env.SSH_TTY) return false;
  if (platform === 'linux' && !env.DISPLAY && !env.WAYLAND_DISPLAY) return false;
  return true;
}

// The session's project folder: Claude Code passes it (the session's cwd follows its `cd`s);
// Codex keeps no `cd` between commands, so its cwd is the project folder.
export function projectDir(input, env = process.env) {
  return env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

// The page writer's working folder: private to this user (on Linux, os.tmpdir() is shared by everyone),
// because `claude -p` loads settings from the folder it runs in.
export function workDir() {
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const dir = path.join(os.tmpdir(), `blueprints-glance-${uid ?? 'user'}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = fs.lstatSync(dir);
  if (!st.isDirectory() || st.isSymbolicLink() || (uid !== null && st.uid !== uid)) {
    throw new Error(`refusing to use ${dir}: not a private folder of this user`);
  }
  if (!WIN && (st.mode & 0o077) !== 0) fs.chmodSync(dir, 0o700);
  return dir;
}

// Where the CLIs usually live, for sessions started from the GUI with a short PATH
function knownWriter(tool) {
  const home = os.homedir();
  const candidates = tool === 'codex'
    ? [path.join(home, '.local', 'bin', 'codex'), '/opt/homebrew/bin/codex', '/usr/local/bin/codex']
    : [path.join(home, '.local', 'bin', 'claude'), path.join(home, '.claude', 'local', 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude'];
  return candidates.find(file => fs.existsSync(file));
}

// `background`: don't take focus from the terminal (pages nobody asked for).
export function openFile(file, { background = false } = {}) {
  const opener = process.env.BLUEPRINTS_GLANCE_OPENER;
  const [cmd, args] = opener
    ? (WIN ? ['cmd', ['/d', '/s', '/c', `"${opener} "${file}""`]] : ['/bin/sh', ['-c', `${opener} "$1"`, 'glance', file]])
    : process.platform === 'darwin' ? ['open', background ? ['-g', file] : [file]]
    : WIN ? ['cmd', ['/c', 'start', '', file]]
    : ['xdg-open', [file]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: WIN && cmd === 'cmd' }).unref();
  } catch {
    // no opener available: the page is still saved
  }
}

export function pageName(html, now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '').toLowerCase();
  const slug = title.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 5).join('-') || 'reply';
  return `${stamp}-${slug}.html`;
}

// The document out of whatever the writer printed, with a content security policy added.
export function extractHtml(output) {
  const start = output.search(/<!doctype html|<html[\s>]/i);
  if (start < 0) return null;
  const end = output.toLowerCase().lastIndexOf('</html>');
  const html = end > start ? output.slice(start, end + '</html>'.length) : output.slice(start);
  const head = /<head(?=[\s>])[^>]*>/i; // not <header>
  return head.test(html) ? html.replace(head, m => `${m}\n${CSP}`) : html.replace(/(<html[^>]*>)/i, `$1\n<head>${CSP}</head>`);
}

// The page writer: no hooks (so it can't recurse), no saved session, read-only file access, and it runs
// outside the project so the project's instructions file isn't loaded into it. The prompt goes on stdin.
export function writerCommand(tool, model, project, outFile, settingsFile, writer) {
  if (tool === 'codex') {
    return [writer || 'codex', [
      'exec', '--ephemeral', '--skip-git-repo-check', '-s', 'read-only', '-o', outFile,
      ...(model ? ['-m', model] : []), '-c', 'model_reasoning_effort="low"', '-',
    ]];
  }
  return [writer || 'claude', [
    '-p', '--model', model || 'sonnet', '--tools', 'Read,Grep,Glob', '--allowedTools', 'Read,Grep,Glob',
    '--add-dir', project, '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    '--setting-sources', 'user', '--settings', settingsFile,
  ]];
}

export function writerPrompt(project, guide, message) {
  return [
    'Turn the reply between <reply> tags at the end, which a coding agent just sent its user, into one glance page, following the guide below.',
    `The project is at ${project}. You may read its files, as the guide says, but don't change anything.`,
    'Output only the HTML document, starting with <!doctype html>, and nothing else.',
    '',
    guide.trim(),
    '',
    '<reply>',
    message,
    '</reply>',
    '',
  ].join('\n');
}

function log(dir, line) {
  try {
    fs.appendFileSync(path.join(dir, '.glance.log'), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // nowhere to log
  }
}

export function parseArgs(argv) {
  const opts = { tool: argv[0] === 'codex' ? 'codex' : 'claude', model: undefined, writer: undefined };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--model') opts.model = argv[++i];
    else if (argv[i] === '--writer') opts.writer = argv[++i];
  }
  return opts;
}

async function hook({ tool, model: defaultModel, writer }) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
  if (input.hook_event_name && input.hook_event_name !== 'Stop') return;
  if (!canShowPages()) return;

  const project = projectDir(input);
  const dir = pagesDir(project);

  // Pages the reply saved (from /glance): open them now.
  const fresh = freshPages(dir).filter(name => claim(dir, `open-${name}`));
  if (fresh.length) {
    for (const name of fresh.slice(0, 3)) openFile(path.join(dir, name));
    return;
  }

  if (process.env.BLUEPRINTS_GLANCE === 'open' || fs.existsSync(path.join(dir, '.auto-off'))) return;
  const message = input.last_assistant_message;
  if (!worthAPage(message)) return;

  ensurePagesDir(dir);
  pruneOld(path.join(dir, '.claims'));
  const hash = crypto.createHash('sha1').update(message).digest('hex').slice(0, 12);
  if (!claim(dir, `make-${hash}`)) return;
  // Codex has no mods, so only Claude Code's pages are recorded
  const record = tool === 'claude' ? jobRecord(input.session_id, hash) : null;
  const startedAt = Date.now();
  if (record) {
    pruneOld(path.dirname(record));
    writeRecord(record, { state: 'making', startedAt });
  }

  try {
    // The job holds the reply, so it goes in a private folder of its own.
    const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-glance-job-'));
    const job = path.join(jobDir, 'job.json');
    fs.writeFileSync(job, JSON.stringify({ tool, model: process.env.BLUEPRINTS_GLANCE_MODEL || defaultModel, writer, project, dir, message, record, startedAt }), { mode: 0o600 });
    spawn(process.execPath, [SELF, '--generate', job], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, BLUEPRINTS_GLANCE_CHILD: '1' },
    }).unref();
  } catch (err) {
    if (record) writeRecord(record, { state: 'failed', startedAt, finishedAt: Date.now(), reason: String(err?.message ?? err).slice(0, 200) });
    throw err;
  }
}

// The writer is a new, separate session, not a child of the one that just ended
const SESSION_VARS = ['CLAUDECODE', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_BRIDGE_SESSION_ID', 'CLAUDE_CODE_ENTRYPOINT'];

function runWriter(cmd, args, cwd, stdin) {
  return new Promise(resolve => {
    let out = '';
    let err = '';
    let child;
    const env = { ...process.env };
    for (const name of SESSION_VARS) delete env[name];
    try {
      // Windows: npm installs the CLIs as .cmd shims, which only a shell finds
      child = WIN
        ? spawn(`"${cmd}"`, args.map(a => `"${a}"`), { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: true })
        : spawn(cmd, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ out: '', err: String(e) });
      return;
    }
    const timer = setTimeout(() => child.kill('SIGTERM'), GENERATE_TIMEOUT_MS);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.stdin.on('error', () => {}); // the writer may exit before reading everything
    child.on('error', e => { clearTimeout(timer); resolve({ out: '', err: String(e) }); });
    child.on('close', () => { clearTimeout(timer); resolve({ out, err }); });
    child.stdin.end(stdin);
  });
}

async function generate(jobFile) {
  const job = JSON.parse(fs.readFileSync(jobFile, 'utf-8'));
  fs.rmSync(path.dirname(jobFile), { recursive: true, force: true });

  const finish = fields => job.record && writeRecord(job.record, { startedAt: job.startedAt ?? Date.now(), finishedAt: Date.now(), ...fields });
  let outFile = null;
  let settingsFile = null;
  try {
    // One working folder, so the writer's runs don't pile up as separate projects;
    // each job gets its own output and settings files in it.
    const workdir = workDir();
    const id = crypto.randomBytes(6).toString('hex');
    outFile = path.join(workdir, `${id}.html`);
    settingsFile = path.join(workdir, `${id}.settings.json`);
    fs.writeFileSync(settingsFile, '{"disableAllHooks": true}\n');
    // BLUEPRINTS_GLANCE_WRITER wins outright; otherwise the path recorded at install, then the usual places
    const writer = process.env.BLUEPRINTS_GLANCE_WRITER
      || (job.writer && fs.existsSync(job.writer) ? job.writer : null)
      || (job.tool === 'claude' && process.env.CLAUDE_CODE_EXECPATH) || knownWriter(job.tool);
    const [cmd, args] = writerCommand(job.tool, job.model, job.project, outFile, settingsFile, writer);
    const output = await runWriter(cmd, args, workdir, writerPrompt(job.project, fs.readFileSync(GUIDE, 'utf-8'), job.message));
    const text = job.tool === 'codex' && fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : output.out;
    const html = extractHtml(text);
    if (!html) {
      log(job.dir, `no page from ${job.tool}: ${(output.err || text).trim().split('\n').slice(-3).join(' | ').slice(0, 400)}`);
      finish({ state: 'failed', reason: `${job.tool} wrote no page (see ${TASKS_DIR}/pages/.glance.log)` });
      return;
    }

    ensurePagesDir(job.dir);
    const name = pageName(html);
    claim(job.dir, `open-${name}`); // before it appears, so a hook that runs meanwhile doesn't open it too
    const tmp = path.join(job.dir, `.${name}.tmp`);
    fs.writeFileSync(tmp, html);
    fs.renameSync(tmp, path.join(job.dir, name));
    finish({ state: 'ready', page: path.join(job.dir, name), title: pageTitle(html) });
    openFile(path.join(job.dir, name), { background: true });
  } catch (err) {
    log(job.dir, `no page: ${String(err?.message ?? err).slice(0, 300)}`);
    finish({ state: 'failed', reason: String(err?.message ?? err).slice(0, 200) });
    throw err;
  } finally {
    if (outFile) fs.rmSync(outFile, { force: true });
    if (settingsFile) fs.rmSync(settingsFile, { force: true });
  }
}

// Run only when executed, not when imported (tests). Compare real paths: ~/.claude or /tmp may be symlinks.
function isMain() {
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(SELF);
  } catch {
    return false;
  }
}

const argv = process.argv.slice(2);
if (isMain()) {
  const run = argv[0] === '--generate'
    ? generate(argv[1])
    : process.env.BLUEPRINTS_GLANCE === 'off' || process.env.BLUEPRINTS_GLANCE_CHILD
      ? Promise.resolve()
      : hook(parseArgs(argv));
  run.catch(() => {}).finally(() => process.exit(0));
}
