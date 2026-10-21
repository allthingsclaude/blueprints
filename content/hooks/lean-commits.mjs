#!/usr/bin/env node
// Blueprints lean commits hook: runs before each shell command (PreToolUse), in Claude Code or Codex.
// It turns down a `git commit` whose message isn't one line of the form `type: description`
// (or `type(scope): description`), or that carries trailers such as Co-Authored-By, and says why,
// so the agent commits again with a one-line message. Everything else passes untouched.
//
// BLUEPRINTS_LEAN_COMMITS=off turns it off. Anything unexpected exits 0: it never blocks by mistake.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const SUBJECT = new RegExp(`^(${TYPES.join('|')})(\\([^)\\s]+\\))?!?: \\S`);
// Agent attribution, not the author's own Signed-off-by
const ATTRIBUTION = /^(co-authored-by|claude-session|generated with|🤖)/i;

// Heredoc bodies (`<<'EOF' … EOF`) replaced by placeholders, so the rest can be split safely
function liftHeredocs(command) {
  const bodies = [];
  const text = command.replace(/<<-?[ \t]*(['"]?)([^\s'"<>|;&()]+)\1([^\n]*)\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|\)|$)/g, (_m, _q, _tag, rest, body) => {
    bodies.push(body);
    return `<<@HEREDOC${bodies.length - 1}@${rest}`;
  });
  return { text, bodies };
}

// Split on unquoted `&&`, `||`, `;`, `|` and newlines, keeping `$( … )` together.
// Each part notes whether it reads from a pipe (`a | b`), for `git commit -F -`.
function segments(text) {
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
function words(segment) {
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

const fromHeredoc = (text, bodies) => {
  const m = /<<@HEREDOC(\d+)@/.exec(text);
  return m ? bodies[Number(m[1])] : null;
};

// Built when the command runs ($VAR, $( … ), backticks): its text can't be known here
const dynamic = value => /[$`]/.test(value);

// The command a segment runs: past VAR=value assignments, wrappers like `env` or `time`, and a leading `(` or `{`
function commandStart(w) {
  let i = 0;
  while (i < w.length) {
    const word = w[i].replace(/^[({]+/, '');
    if (!word || /^\w+=/.test(word) || ['env', 'command', 'exec', 'time', 'nohup', 'sudo'].includes(word)) { i++; continue; }
    return { i, word };
  }
  return null;
}

// git commit's short options that take a value, attached or as the next word; the rest are plain switches
const VALUE_FLAGS = new Set(['m', 'F', 'c', 'C', 't']);
const ATTACHED_ONLY = new Set(['u', 'S']); // -u[mode], -S[keyid]
const SWITCHES = new Set(['a', 'p', 's', 'n', 'e', 'i', 'o', 'v', 'q', 'z']);

/**
 * The message of each `git commit` in a shell command (null when a commit's message can't be read,
 * e.g. `--amend --no-edit`, an editor, or a message built when the command runs). [] when there's no commit.
 */
export function commitMessages(command, cwd = process.cwd(), depth = 0) {
  if (typeof command !== 'string' || !/\bgit\b/.test(command) || !/\bcommit\b/.test(command) || depth > 3) return [];
  const { text, bodies } = liftHeredocs(command);
  const segs = segments(text);
  const messages = [];
  segs.forEach((seg, index) => {
    // A subshell `( … )` or group `{ …; }`: drop its closing bracket from the last word
    const w = words(/^[({]/.test(seg.text) ? seg.text.replace(/\s*[)}]\s*$/, '') : seg.text);
    const start = commandStart(w);
    if (!start) return;
    // bash -c '…' (and sh, zsh): look inside the script
    if (/(^|\/)(ba|z|da)?sh$/.test(start.word)) {
      const c = w.findIndex((x, k) => k > start.i && /^-[a-z]*c$/.test(x));
      if (c > 0 && c + 1 < w.length) messages.push(...commitMessages(w[c + 1], cwd, depth + 1));
      return;
    }
    if (!/(^|\/)git$/.test(start.word)) return;
    // git's own options before the subcommand: -C dir, -c key=value, --no-pager …
    let i = start.i + 1;
    while (i < w.length && w[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree'].includes(w[i]) ? 2 : 1;
    if (w[i] !== 'commit') return;

    const parts = [];
    let unreadable = false;
    const take = value => {
      const heredoc = fromHeredoc(value, bodies);
      if (heredoc !== null) parts.push(heredoc);
      else if (dynamic(value)) unreadable = true;
      else parts.push(value);
    };
    const readFile = file => {
      const heredoc = fromHeredoc(seg.text, bodies) ?? (seg.piped && index > 0 ? fromHeredoc(segs[index - 1].text, bodies) : null);
      if ((file === '-' || file === '/dev/stdin') && heredoc !== null) parts.push(heredoc);
      else if (file && file !== '-' && !dynamic(file) && fs.existsSync(path.resolve(cwd, file))) parts.push(fs.readFileSync(path.resolve(cwd, file), 'utf-8'));
      else unreadable = true;
    };
    for (let j = i + 1; j < w.length; j++) {
      const arg = w[j];
      if (arg === '--') break;
      if (arg === '--trailer') { take(w[++j] ?? ''); continue; }
      if (arg.startsWith('--trailer=')) { take(arg.slice('--trailer='.length)); continue; }
      if (arg === '--message') { take(w[++j] ?? ''); continue; }
      if (arg.startsWith('--message=')) { take(arg.slice('--message='.length)); continue; }
      if (arg === '--file') { readFile(w[++j] ?? ''); continue; }
      if (arg.startsWith('--file=')) { readFile(arg.slice('--file='.length)); continue; }
      if (!/^-[^-]/.test(arg)) continue;
      // A bundle of short options, read the way git reads it: -am "msg", -qm"msg", -unormal, -S<keyid>
      for (let k = 1; k < arg.length; k++) {
        const f = arg[k];
        if (SWITCHES.has(f)) continue;
        if (ATTACHED_ONLY.has(f)) break;
        if (VALUE_FLAGS.has(f)) {
          const value = k + 1 < arg.length ? arg.slice(k + 1) : (w[++j] ?? '');
          if (f === 'm') take(value);
          else if (f === 'F') readFile(value);
          else if (f === 'c' || f === 'C' || f === 't') unreadable = true; // message from another commit or a template
        }
        break;
      }
    }
    messages.push(parts.length && !unreadable ? parts.join('\n\n') : null);
  });
  return messages;
}

/** What's wrong with a commit message, or null when it's one clean `type: description` line */
export function problem(message) {
  const lines = message.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (!lines.length) return null;
  if (lines.some(l => ATTRIBUTION.test(l))) return 'it has attribution trailers (Co-Authored-By and the like)';
  if (lines.length > 1) return 'it has more than one line';
  if (!SUBJECT.test(lines[0])) return `it doesn't start with a type such as \`feat: \` or \`fix: \``;
  return null;
}

/** A shell command from a tool's input: Codex may pass an argument list, e.g. ["bash", "-lc", "<script>"] */
export function commandText(raw) {
  if (!Array.isArray(raw)) return raw;
  const shell = /(^|\/)(ba|z|da)?sh$/.test(String(raw[0] ?? ''));
  const c = raw.findIndex(a => /^-[a-z]*c$/.test(String(a)));
  if (shell && c > 0 && c + 1 < raw.length) return String(raw[c + 1]);
  return raw.map(a => (/^[\w@%+=:,./-]+$/.test(String(a)) ? String(a) : `'${String(a).replace(/'/g, "'\\''")}'`)).join(' ');
}

/** The decision for one PreToolUse payload: a deny reason, or null to let the command run */
export function review(input) {
  const ti = input?.tool_input ?? {};
  const command = commandText(ti.command ?? ti.cmd);
  for (const message of commitMessages(command, input?.cwd)) {
    const why = message === null ? null : problem(message);
    if (why) {
      return `Commit messages in this setup are one line: \`type: description\` (${TYPES.join(', ')}; a scope like \`fix(api): \` is fine), with no body and no trailers such as Co-Authored-By. This one was turned down because ${why}. Commit again with \`git commit -m "type: description"\`.`;
    }
  }
  return null;
}

function isMain() {
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  (async () => {
    if (process.env.BLUEPRINTS_LEAN_COMMITS === 'off') return;
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const reason = review(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'));
    if (reason) {
      process.stdout.write(`${JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
      })}\n`);
    }
  })().catch(() => {}).finally(() => process.exit(0));
}
