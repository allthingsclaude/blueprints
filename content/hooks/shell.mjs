// Shell command reading shared by blueprints' PreToolUse hooks (lean commits, secret guard).
// Close enough to how a POSIX shell splits a command to find the commands it runs and their words,
// without running anything.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Heredoc bodies (`<<'EOF' … EOF`) replaced by placeholders, so the rest can be split safely
export function liftHeredocs(command) {
  const bodies = [];
  const text = command.replace(/<<-?[ \t]*(['"]?)([^\s'"<>|;&()]+)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|\)|$)/g, (_m, _q, _tag, rest, body) => {
    bodies.push(body);
    return `<<@HEREDOC${bodies.length - 1}@${rest}`;
  });
  return { text, bodies };
}

// Split on unquoted `&&`, `||`, `;`, `|` and newlines, keeping `$( … )` together.
// Each part notes whether it reads from a pipe (`a | b`), for `git commit -F -`.
export function segments(text) {
  const out = [];
  let cur = '';
  let quote = null;
  let depth = 0;
  let piped = false;
  const push = next => {
    if (cur.trim()) out.push({ text: cur.trim(), piped });
    cur = '';
    piped = next;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      cur += c;
      if (c === '\\' && quote === '"' && i + 1 < text.length) cur += text[++i];
      else if (c === quote) quote = null;
      else if (quote === '"' && c === '$' && text[i + 1] === '(') { depth++; cur += text[++i]; }
      else if (quote === '"' && c === ')' && depth > 0) depth--;
      continue;
    }
    if (c === '\\' && i + 1 < text.length) { cur += c + text[++i]; continue; }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '$' && text[i + 1] === '(') { depth++; cur += c + text[++i]; continue; }
    if (c === ')' && depth > 0) { depth--; cur += c; continue; }
    if (depth === 0) {
      if (c === '&' && text[i + 1] === '&') { i++; push(false); continue; }
      if (c === '|' && text[i + 1] === '|') { i++; push(false); continue; }
      if (c === '|') { push(true); continue; }
      if (c === ';' || c === '\n') { push(false); continue; }
    }
    cur += c;
  }
  push(false);
  return out;
}

// Shell-like words: quotes removed, `$( … )` kept whole
export function words(segment) {
  const out = [];
  let cur = '';
  let started = false;
  let depth = 0;
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (depth === 0 && /\s/.test(c)) {
      if (started) out.push(cur);
      cur = '';
      started = false;
      continue;
    }
    started = true;
    if (c === "'" && depth === 0) {
      const end = segment.indexOf("'", i + 1);
      cur += segment.slice(i + 1, end < 0 ? undefined : end);
      i = end < 0 ? segment.length : end;
    } else if (c === '"' && depth === 0) {
      let j = i + 1;
      let inner = 0;
      for (; j < segment.length; j++) {
        if (segment[j] === '\\' && j + 1 < segment.length) { cur += segment[++j]; continue; }
        if (segment[j] === '$' && segment[j + 1] === '(') inner++;
        if (segment[j] === ')' && inner > 0) inner--;
        if (segment[j] === '"' && inner === 0) break;
        cur += segment[j];
      }
      i = j;
    } else if (c === '\\' && i + 1 < segment.length) {
      cur += segment[++i];
    } else {
      if (c === '$' && segment[i + 1] === '(') depth++;
      if (c === ')' && depth > 0) depth--;
      cur += c;
    }
  }
  if (started) out.push(cur);
  return out;
}

/** A segment's words, without the closing bracket of a subshell `( … )` or group `{ …; }` */
export const segmentWords = text => words(/^[({]/.test(text) ? text.replace(/\s*[)}]\s*$/, '') : text);

/** The body a heredoc placeholder stands for, or null */
export const fromHeredoc = (text, bodies) => {
  const m = /<<@HEREDOC(\d+)@/.exec(text);
  return m ? bodies[Number(m[1])] : null;
};

// Built when the command runs ($VAR, $( … ), backticks): its text can't be known here
export const dynamic = value => /[$`]/.test(value);

// The command a segment runs: past VAR=value assignments, wrappers like `env` or `time`, and a leading `(` or `{`
export function commandStart(w) {
  let i = 0;
  while (i < w.length) {
    const word = w[i].replace(/^[({]+/, '');
    if (!word || /^\w+=/.test(word) || ['env', 'command', 'exec', 'time', 'nohup', 'sudo'].includes(word)) { i++; continue; }
    return { i, word };
  }
  return null;
}

/** bash, sh, zsh or dash, by name or path */
export const isShell = word => /(^|\/)(ba|z|da)?sh$/.test(word);

/** The script of `bash -c '…'` (and sh, zsh), or null */
export function shellScript(w, start) {
  const c = w.findIndex((x, k) => k > start.i && /^-[a-z]*c$/.test(x));
  return c > 0 && c + 1 < w.length ? w[c + 1] : null;
}

/** Where git runs and what it runs: `git -C dir commit …` gives { dir, sub: 'commit', at } (at: the subcommand's index) */
export function gitCommand(w, start, cwd = process.cwd()) {
  if (!/(^|\/)git$/.test(start.word)) return null;
  let dir = cwd;
  let i = start.i + 1;
  // git's own options before the subcommand: -C dir, -c key=value, --no-pager …
  while (i < w.length && w[i].startsWith('-')) {
    if (w[i] === '-C' && i + 1 < w.length) dir = path.resolve(dir, w[i + 1]);
    i += ['-C', '-c', '--git-dir', '--work-tree'].includes(w[i]) ? 2 : 1;
  }
  return i < w.length ? { dir, sub: w[i], at: i } : null;
}

/** A shell command from a tool's input: Codex may pass an argument list, e.g. ["bash", "-lc", "<script>"] */
export function commandText(raw) {
  if (!Array.isArray(raw)) return raw;
  const c = raw.findIndex(a => /^-[a-z]*c$/.test(String(a)));
  if (isShell(String(raw[0] ?? '')) && c > 0 && c + 1 < raw.length) return String(raw[c + 1]);
  return raw.map(a => (/^[\w@%+=:,./-]+$/.test(String(a)) ? String(a) : `'${String(a).replace(/'/g, "'\\''")}'`)).join(' ');
}

/** Read a hook's JSON payload from stdin */
export async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
}

/** Whether the module at `metaUrl` (its import.meta.url) is the script being run, rather than imported by a test */
export function runsAsScript(metaUrl) {
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

/** Turn down a tool call (PreToolUse), saying why so the agent can do it another way */
export function deny(reason) {
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  })}\n`);
}
