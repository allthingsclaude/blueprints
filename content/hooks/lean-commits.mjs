#!/usr/bin/env node
// Blueprints lean commits hook: runs before each shell command (PreToolUse), in Claude Code or Codex.
// It turns down a `git commit` whose message isn't one line of the form `type: description`
// (or `type(scope): description`), or that carries trailers such as Co-Authored-By, and says why,
// so the agent commits again with a one-line message. Everything else passes untouched.
//
// BLUEPRINTS_LEAN_COMMITS=off turns it off. Anything unexpected exits 0: it never blocks by mistake.

import fs from 'node:fs';
import path from 'node:path';
import { commandStart, commandText, deny, dynamic, fromHeredoc, gitCommand, isShell, liftHeredocs, readInput, runsAsScript, segments, segmentWords, shellScript } from './shell.mjs';

export { commandText };

export const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const SUBJECT = new RegExp(`^(${TYPES.join('|')})(\\([^)\\s]+\\))?!?: \\S`);
// Agent attribution, not the author's own Signed-off-by
const ATTRIBUTION = /^(co-authored-by|claude-session|generated with|🤖)/i;

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
    const w = segmentWords(seg.text);
    const start = commandStart(w);
    if (!start) return;
    // bash -c '…' (and sh, zsh): look inside the script
    if (isShell(start.word)) {
      const script = shellScript(w, start);
      if (script !== null) messages.push(...commitMessages(script, cwd, depth + 1));
      return;
    }
    const git = gitCommand(w, start, cwd);
    if (git?.sub !== 'commit') return;
    const i = git.at;

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
      else if (file && file !== '-' && !dynamic(file) && fs.existsSync(path.resolve(git.dir, file))) parts.push(fs.readFileSync(path.resolve(git.dir, file), 'utf-8'));
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

if (runsAsScript(import.meta.url)) {
  (async () => {
    if (process.env.BLUEPRINTS_LEAN_COMMITS === 'off') return;
    const reason = review(await readInput());
    if (reason) deny(reason);
  })().catch(() => {}).finally(() => process.exit(0));
}
