import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import {
  GLANCE_HOOK,
  LEAN_COMMITS_HOOK,
  copyAgentsWithPowerLevel,
  copyDirectory,
  decideHook,
  getSourcePaths,
  installBlueprints,
  mergeHook,
  readManifest,
  selectOptionBlocks,
  withLeanAttribution,
  withoutLeanAttribution,
} from '../installer.js';
import { getCodexPaths, installCodex, mergeCodexHooks } from '../codex.js';

const script = path.join(getSourcePaths().hooks, 'lean-commits.mjs');

type LeanModule = {
  commitMessages: (command: unknown, cwd?: string) => (string | null)[];
  problem: (message: string) => string | null;
  review: (input: unknown) => string | null;
};
let lean: LeanModule;

beforeAll(async () => {
  lean = await import(pathToFileURL(script).href) as LeanModule;
});

const denied = (command: string, cwd?: string) => lean.review({ tool_input: { command }, cwd }) !== null;

describe('lean commits hook', () => {
  it('reads the message of each git commit, however it is passed', () => {
    expect(lean.commitMessages('git commit -m "feat: add x"')).toEqual(['feat: add x']);
    expect(lean.commitMessages('git add a && git commit -am "fix: y" && git log -1')).toEqual(['fix: y']);
    expect(lean.commitMessages('git commit -qm"refactor(api)!: rename"')).toEqual(['refactor(api)!: rename']);
    expect(lean.commitMessages('git -C /x commit --message="docs: z"')).toEqual(['docs: z']);
    expect(lean.commitMessages('git commit -m "feat: a" -m "body"')).toEqual(['feat: a\n\nbody']);
    expect(lean.commitMessages(`git commit -m "$(cat <<'EOF'\nfeat: add glance\n\n- bullet\nEOF\n)"`)).toEqual(['feat: add glance\n\n- bullet']);
    expect(lean.commitMessages(`git commit -F - <<'EOF'\ndocs: one line\nEOF`)).toEqual(['docs: one line']);
    expect(lean.commitMessages('git commit --amend --no-edit')).toEqual([null]);
    expect(lean.commitMessages('echo "git commit -m nope"')).toEqual([]);
    expect(lean.commitMessages('npm test')).toEqual([]);
  });

  it('turns down bodies, trailers and messages without a type, and lets one clean line through', () => {
    expect(denied('git commit -m "feat: add x"')).toBe(false);
    expect(denied('git commit -m "fix(auth): handle expiry"')).toBe(false);
    expect(denied('git commit --amend --no-edit')).toBe(false);
    expect(denied('git tag -m "release notes\nwith lines" v1 && git commit -m "chore: ok"')).toBe(false);
    expect(denied('git commit -m "Add stuff"')).toBe(true);
    expect(denied('git commit -m "feat: a" -m "body"')).toBe(true);
    expect(denied(`git commit -m "$(cat <<'EOF'\nfeat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nEOF\n)"`)).toBe(true);
    expect(denied('git commit -m "feat: x" --trailer "Co-authored-by: A <a@b>"')).toBe(true);
    expect(lean.problem('feat: x\n\nClaude-Session: https://claude.ai/code/x')).toMatch(/attribution/);
    expect(lean.problem('feat: add x')).toBeNull();
  });

  it('reads commands the way the shell runs them', () => {
    expect(denied('git commit -unormal -m "fix: x"')).toBe(false); // -u takes an attached mode
    expect(denied('git commit -S5A2F1B3C -m "Add stuff"')).toBe(true); // -S takes an attached key
    expect(denied('git commit -m "$MSG"')).toBe(false); // built when it runs: can't be judged here
    expect(denied('git commit -m "$(printf %s fix)"')).toBe(false);
    expect(denied("git commit -F - <<'COMMIT-MSG'\nfix: one\nCOMMIT-MSG")).toBe(false);
    expect(denied('cat <<EOF | git commit -F -\nfeat: a\n\nbody\nEOF')).toBe(true);
    expect(denied(`bash -c 'git commit -m "Add stuff"'`)).toBe(true);
    expect(denied('(git commit -m "Add stuff")')).toBe(true);
    expect(denied('{ git add a; git commit -m "fix: b"; }')).toBe(false);
    expect(denied('/usr/bin/git commit -m "Add stuff"')).toBe(true);
    expect(denied('GIT_AUTHOR_NAME=x git commit -m "feat: ok"')).toBe(false);
    expect(denied('echo git commit -m "Add stuff"')).toBe(false);
    expect(denied('git commit -s -m "feat: signed"')).toBe(false); // the author's own sign-off isn't attribution
    expect(denied('git commit -C HEAD')).toBe(false);
  });

  it('reads a message from a file, and reads Codex\'s command shapes', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-commits-'));
    fs.writeFileSync(path.join(dir, 'msg.txt'), 'feat: from a file\n\nwith a body\n');
    expect(denied('git commit -F msg.txt', dir)).toBe(true);
    fs.writeFileSync(path.join(dir, 'msg.txt'), 'feat: from a file\n');
    expect(denied('git commit -F msg.txt', dir)).toBe(false);
    fs.rmSync(dir, { recursive: true });
    expect(lean.review({ tool_input: { cmd: 'git commit -m "Add stuff"' } })).not.toBeNull();
    expect(lean.review({ tool_input: { command: ['bash', '-lc', 'git commit -m "feat: ok"'] } })).toBeNull();
    expect(lean.review({ tool_input: { command: ['/bin/zsh', '-c', 'git commit -m "Add stuff"'] } })).not.toBeNull();
    expect(lean.review({ tool_input: { command: ['git', 'commit', '-m', "fix: it's an argument list"] } })).toBeNull();
    expect(lean.review({ tool_input: { command: ['git', 'commit', '-m', 'fix: a', '-m', 'body'] } })).not.toBeNull();
  });

  it('answers with a deny decision and the reason, and stays out of the way otherwise', { timeout: 20_000 }, () => {
    const run = (command: string, env: Record<string, string> = {}) => spawnSync(process.execPath, [script], {
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }),
      env: { ...process.env, BLUEPRINTS_LEAN_COMMITS: '', ...env },
      encoding: 'utf-8',
    });
    const no = run('git commit -m "feat: a" -m "body"');
    expect(no.status).toBe(0);
    const decision = JSON.parse(no.stdout).hookSpecificOutput;
    expect(decision).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(decision.permissionDecisionReason).toMatch(/one line: `type: description`.*more than one line/);
    expect(run('git commit -m "feat: a"').stdout).toBe('');
    expect(run('git commit -m "nope"', { BLUEPRINTS_LEAN_COMMITS: 'off' }).stdout).toBe('');
    expect(spawnSync(process.execPath, [script], { input: 'not json', encoding: 'utf-8' }).status).toBe(0);
  });
});

describe('lean commits install', () => {
  let root: string;
  let home: string;
  const realHome = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-lean-'));
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-test-home-'));
    process.env.HOME = home; // never the real ~/.claude or ~/.codex
    process.env.USERPROFILE = home;
  });

  afterEach(() => {
    process.env.HOME = realHome.HOME;
    process.env.USERPROFILE = realHome.USERPROFILE;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('keeps a hook the user put in the same entry, and a timeout the user changed', () => {
    const ours = '"/n/node" "/x/blueprints/hooks/lean-commits.mjs"';
    const shared = { hooks: { PreToolUse: [{ matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: ours, timeout: 25 }, { type: 'command', command: 'mine.sh' }] }] } };
    expect(decideHook(shared, LEAN_COMMITS_HOOK, 'keep', ours)).toEqual({ value: null, result: 'none' });
    const moved = decideHook(shared, LEAN_COMMITS_HOOK, 'keep', ours.replace('/x/', '/y/'));
    expect(moved.result).toBe('updated');
    expect(moved.value?.hooks?.PreToolUse).toEqual([
      { matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: 'mine.sh' }] },
      { matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: ours.replace('/x/', '/y/'), timeout: 25 }] },
    ]);
    expect(mergeHook(shared, LEAN_COMMITS_HOOK, null).hooks?.PreToolUse).toEqual([{ matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: 'mine.sh' }] }]);
    expect(mergeHook({ hooks: { Stop: [{ hooks: [{ command: '"/n" "/a/blueprints/hooks/glance.mjs"' }, { command: 'mine.sh' }] }] } }, GLANCE_HOOK, null))
      .toEqual({ hooks: { Stop: [{ hooks: [{ command: 'mine.sh' }] }] } });
    const gate = mergeCodexHooks({ hooks: { SubagentStop: [{ matcher: '^implement$', hooks: [{ command: 'sh "/a/blueprints/hooks/phase-gate.sh"' }, { command: 'mine.sh' }] }] } }, 'sh "/b/blueprints/hooks/phase-gate.sh"');
    expect(gate.hooks?.SubagentStop?.[0].hooks).toEqual([{ command: 'mine.sh' }]);
    expect(gate.hooks?.SubagentStop?.[1].hooks?.[0].command).toContain('/b/');
  });

  it('never tells an agent to write a commit message the hook would turn down', () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-render-'));
    copyDirectory(getSourcePaths().commands, path.join(dest, 'commands'), 'tasks', '/x', { leanCommits: true });
    copyAgentsWithPowerLevel(getSourcePaths().agents, path.join(dest, 'agents'), 4, 'tasks', '/x', { leanCommits: true });
    for (const dir of ['commands', 'agents']) {
      for (const file of fs.readdirSync(path.join(dest, dir))) {
        const text = fs.readFileSync(path.join(dest, dir, file), 'utf-8');
        expect(text, file).not.toMatch(/git commit -m "\$\(cat <<|Body should|use HEREDOC for multi-line|<!-- \/?(lean|full)-commits -->/);
        for (const m of text.matchAll(/git commit[^\n`]*-m "([^"$]+)"/g)) {
          // Placeholders: `type: description`, `[version]`
          expect(lean.problem(m[1].replace(/^type\b/, 'feat').replace(/\[[^\]]*\]/g, 'x')), `${file}: ${m[1]}`).toBeNull();
        }
      }
    }
    fs.rmSync(dest, { recursive: true });
  });

  it('keeps the blocks for the chosen option', () => {
    const text = 'a\n<!-- lean-commits -->\nLEAN\n<!-- /lean-commits -->\n<!-- full-commits -->\nFULL\n<!-- /full-commits -->\nb\n';
    expect(selectOptionBlocks(text, { leanCommits: true })).toBe('a\nLEAN\nb\n');
    expect(selectOptionBlocks(text, {})).toBe('a\nFULL\nb\n');
  });

  it('sets and restores only what it changed in Claude Code\'s attribution', () => {
    expect(withLeanAttribution({})).toEqual({ attribution: { commit: '', sessionUrl: false } });
    expect(withLeanAttribution({ attribution: { pr: 'x' } })).toEqual({ attribution: { pr: 'x', commit: '', sessionUrl: false } });
    expect(withLeanAttribution({ attribution: false })).toBeNull();
    expect(withLeanAttribution({ attribution: { commit: '', sessionUrl: false } })).toBeNull();

    const before = { had: true, value: { pr: 'x' } };
    expect(withoutLeanAttribution({ attribution: { pr: 'x', commit: '', sessionUrl: false } }, before)).toEqual({ attribution: { pr: 'x' } });
    expect(withoutLeanAttribution({ attribution: { commit: '', sessionUrl: false }, model: 'opus' }, { had: false })).toEqual({ model: 'opus' });
    expect(withoutLeanAttribution({ attribution: { commit: 'mine' } }, before)).toBeNull(); // changed since: left alone
  });

  it('registers the hook, quiets Claude Code\'s attribution and installs one-line commit agents, then undoes it all', { timeout: 20_000 }, async () => {
    const claudeDir = path.join(root, '.claude');
    const settings = path.join(claudeDir, 'settings.local.json');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(settings, JSON.stringify({ attribution: { pr: 'mine' } }));
    const commitAgent = () => fs.readFileSync(path.join(claudeDir, 'agents', 'commit.md'), 'utf-8');

    expect((await installBlueprints(claudeDir, 4, 'tasks')).leanCommits).toBe('none');
    expect(commitAgent()).toContain('HEREDOC for proper formatting');
    expect(commitAgent()).not.toMatch(/lean-commits|full-commits/);

    expect((await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'on' })).leanCommits).toBe('added');
    const on = JSON.parse(fs.readFileSync(settings, 'utf-8'));
    expect(on.attribution).toEqual({ pr: 'mine', commit: '', sessionUrl: false });
    expect(on.hooks.PreToolUse).toEqual([{ matcher: 'Bash|PowerShell', hooks: [{ type: 'command', command: expect.stringMatching(/^".+" ".*blueprints\/hooks\/lean-commits\.mjs"$/), timeout: 10 }] }]);
    expect(readManifest(claudeDir)?.attributionBefore).toEqual({ had: true, value: { pr: 'mine' } });
    expect(commitAgent()).toContain('Commit messages here are **one line**');
    expect(commitAgent()).not.toContain('HEREDOC for proper formatting');
    expect(fs.readFileSync(path.join(claudeDir, 'agents', 'finalize.md'), 'utf-8')).toContain('git commit -m "feat: brief description"');

    // A plain reinstall keeps it on, and keeps the original attribution on record
    expect((await installBlueprints(claudeDir, 4, 'tasks')).leanCommits).toBe('none');
    expect(commitAgent()).toContain('Commit messages here are **one line**');
    expect(readManifest(claudeDir)?.attributionBefore).toEqual({ had: true, value: { pr: 'mine' } });

    expect((await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'off' })).leanCommits).toBe('removed');
    expect(JSON.parse(fs.readFileSync(settings, 'utf-8'))).toEqual({ attribution: { pr: 'mine' } });
    expect(readManifest(claudeDir)?.attributionBefore).toBeUndefined();
    expect(commitAgent()).toContain('HEREDOC for proper formatting');
  });

  it('keeps the original attribution on record until it\'s put back, and leaves a value the user changed', { timeout: 20_000 }, async () => {
    const claudeDir = path.join(root, '.claude');
    const settings = path.join(claudeDir, 'settings.local.json');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(settings, JSON.stringify({ attribution: { pr: 'mine' } }));
    await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'on' });

    // The hook removed by hand: a plain reinstall keeps the record, and turning lean off still restores
    const edited = JSON.parse(fs.readFileSync(settings, 'utf-8'));
    delete edited.hooks;
    fs.writeFileSync(settings, JSON.stringify(edited));
    await installBlueprints(claudeDir, 4, 'tasks');
    expect(readManifest(claudeDir)?.attributionBefore).toEqual({ had: true, value: { pr: 'mine' } });
    expect((await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'off' })).attribution).toBe('restored');
    expect(JSON.parse(fs.readFileSync(settings, 'utf-8'))).toEqual({ attribution: { pr: 'mine' } });

    // Unreadable settings: nothing changes, the agents stay one-line, and the record survives
    await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'on' });
    const good = fs.readFileSync(settings, 'utf-8');
    fs.writeFileSync(settings, '{ broken');
    const broken = await installBlueprints(claudeDir, 4, 'tasks');
    expect(broken.leanCommits).toBe('unreadable');
    expect(fs.readFileSync(path.join(claudeDir, 'agents', 'commit.md'), 'utf-8')).toContain('Commit messages here are **one line**');
    expect(readManifest(claudeDir)?.attributionBefore).toEqual({ had: true, value: { pr: 'mine' } });
    fs.writeFileSync(settings, good);

    // The user changed attribution since: it's left alone, and the CLI is told
    const changed = JSON.parse(good);
    changed.attribution = { commit: 'mine' };
    fs.writeFileSync(settings, JSON.stringify(changed));
    expect((await installBlueprints(claudeDir, 4, 'tasks', { leanCommits: 'off' })).attribution).toBe('left');
    expect(JSON.parse(fs.readFileSync(settings, 'utf-8')).attribution).toEqual({ commit: 'mine' });
  });

  it('follows lean commits that\'s on in the user\'s settings, without adding a second hook to the project', { timeout: 20_000 }, async () => {
    const userDir = path.join(home, '.claude');
    await installBlueprints(userDir, 4, 'tasks', { leanCommits: 'on' });
    expect(JSON.parse(fs.readFileSync(path.join(userDir, 'settings.json'), 'utf-8')).attribution).toEqual({ commit: '', sessionUrl: false });

    const claudeDir = path.join(root, '.claude');
    const project = await installBlueprints(claudeDir, 4, 'tasks');
    expect(project.leanCommitsGlobal).toBe(true);
    expect(project.leanCommits).toBe('none');
    expect(fs.existsSync(path.join(claudeDir, 'settings.local.json'))).toBe(false);
    expect(fs.readFileSync(path.join(claudeDir, 'agents', 'commit.md'), 'utf-8')).toContain('Commit messages here are **one line**');

    await installCodex('global', root, 4, 'tasks', home, { leanCommits: 'on' });
    const codexProject = await installCodex('project', root, 4, 'tasks', home);
    expect(codexProject.leanCommitsGlobal).toBe(true);
    expect(codexProject.leanCommits).toBe('none');
    expect(fs.readFileSync(path.join(getCodexPaths('project', root, home).agents, 'commit.toml'), 'utf-8')).toContain('Commit messages here are **one line**');
  });

  it('registers the Codex hook on its shell tools, and converts the commit agent the same way', { timeout: 20_000 }, async () => {
    const result = await installCodex('project', root, 4, 'tasks', home, { leanCommits: 'on' });
    const paths = getCodexPaths('project', root, home);
    expect(result.leanCommits).toBe('added');
    const hooks = JSON.parse(fs.readFileSync(paths.hooksFile, 'utf-8')).hooks;
    expect(hooks.PreToolUse[0].matcher).toBe('^(Bash|exec_command|shell|local_shell)$');
    expect(hooks.PreToolUse[0].hooks[0].command).toMatch(/blueprints\/hooks\/lean-commits\.mjs"$/);
    expect(hooks.SubagentStop[0].matcher).toBe('^implement$');
    expect(fs.existsSync(path.join(paths.support, 'hooks', 'lean-commits.mjs'))).toBe(true);
    expect(fs.readFileSync(path.join(paths.agents, 'commit.toml'), 'utf-8')).toContain('Commit messages here are **one line**');

    expect((await installCodex('project', root, 4, 'tasks', home)).leanCommits).toBe('none'); // kept
    expect(fs.readFileSync(path.join(paths.agents, 'commit.toml'), 'utf-8')).toContain('Commit messages here are **one line**');
    expect((await installCodex('project', root, 4, 'tasks', home, { leanCommits: 'off' })).leanCommits).toBe('removed');
    expect(JSON.parse(fs.readFileSync(paths.hooksFile, 'utf-8')).hooks.PreToolUse).toBeUndefined();
    expect(fs.readFileSync(path.join(paths.agents, 'commit.toml'), 'utf-8')).toContain('HEREDOC for proper formatting');
  });
});
