import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface InstallPaths {
  base: string;
  commands: string;
  agents: string;
  workflows: string;
  /** Blueprints' own support files (hook scripts), under <base>/blueprints */
  support: string;
}

export interface SourcePaths {
  commands: string;
  agents: string;
  workflows: string;
  hooks: string;
  /** Step-by-step procedures shared by several commands (e.g. dispatch, used by /dispatch and /autopilot) */
  procedures: string;
}

export interface InstallResult {
  commands: number;
  agents: number;
  workflows: number;
  /** Files from a previous blueprints install that are no longer shipped and were removed */
  removed: number;
  paths: InstallPaths;
  powerLevel: AgentPowerLevel;
  /** What happened to the glance and lean commits hooks, and the settings file they live in */
  glanceHook: HookResult;
  leanCommits: HookResult;
  /** Lean commits and Claude Code's `attribution` setting: set, put back, or left (the user changed it since) */
  attribution?: 'set' | 'restored' | 'left';
  /** Lean commits is on in the user's settings, so it applies to this project install too */
  leanCommitsGlobal: boolean;
  settingsFile: string;
}

/** Install choices for the optional hooks ('keep' when not given) */
export interface InstallOptions {
  glance?: HookChoice;
  leanCommits?: HookChoice;
}

export type AgentPowerLevel = 1 | 2 | 3 | 4 | 5;

export const POWER_LEVEL_LABELS: Record<AgentPowerLevel, string> = {
  1: 'Economy',
  2: 'Balanced',
  3: 'Standard',
  4: 'Enhanced',
  5: 'Maximum',
};

/** What each power level means for Claude Code (which model each agent tier runs on) */
export const POWER_LEVEL_MODELS: Record<AgentPowerLevel, string> = {
  1: 'haiku, sonnet for heavyweight — fastest, lowest cost',
  2: 'haiku light + research, sonnet everything else',
  3: 'all sonnet',
  4: 'sonnet light + research, opus everything else — recommended',
  5: 'all opus — most capable, highest cost',
};

export const RESEARCH_AGENTS = [
  'research-codebase.md',
  'research-docs.md',
  'research-web.md',
];

export const LIGHTWEIGHT_AGENTS = [
  'commit.md',
  'changelog.md',
  'handoff.md',
  'cleanup.md',
  'imagine.md',
  'og.md',
];

export const HEAVYWEIGHT_AGENTS = [
  'audit.md',
  'diagnose.md',
  'secure.md',
];

/**
 * Files earlier versions shipped that have since been renamed or removed.
 * Installs from before the manifest existed are cleaned up using this list.
 */
export const LEGACY_COMMANDS = ['auto.md', 'optimize.md', 'plan.md', 'verify.md', 'debug.md', 'design.md', 'copy.md'];
export const LEGACY_AGENTS = ['optimize.md', 'plan.md', 'debug.md', 'design.md', 'copy.md'];

/** Frontmatter line every blueprints command and agent carries */
export const BLUEPRINTS_MARKER = 'author: "@markoradak"';

export const MANIFEST_FILE = '.blueprints-version';

export type AgentTier = 'lightweight' | 'research' | 'standard' | 'heavyweight';

export const DEFAULT_TASKS_DIR = 'tasks';

export function buildTemplateVars(tasksDir: string = DEFAULT_TASKS_DIR, blueprintsDir?: string): Record<string, string> {
  const vars: Record<string, string> = {
    '{{TASKS_DIR}}': tasksDir,
    '{{PLANS_DIR}}': `${tasksDir}/plans`,
    '{{SESSIONS_DIR}}': `${tasksDir}/sessions`,
    '{{STATE_FILE}}': `${tasksDir}/STATE.md`,
  };
  if (blueprintsDir) {
    // Forward slashes work in prompts and shells on every platform, including Windows
    vars['{{BLUEPRINTS_DIR}}'] = blueprintsDir.replace(/\\/g, '/');
  }
  return vars;
}

export const TEMPLATE_VARS: Record<string, string> = buildTemplateVars();

export type TargetTool = 'claude' | 'codex';

const TOOL_BLOCK = /^[ \t]*<!-- (claude|codex)-only -->[ \t]*\r?\n([\s\S]*?)^[ \t]*<!-- \/\1-only -->[ \t]*(?:\r?\n|$)/gm;

/**
 * Keep the `<!-- claude-only -->` / `<!-- codex-only -->` blocks meant for this tool
 * (without their marker lines) and drop the ones meant for the other tool.
 */
export function selectToolBlocks(content: string, tool: TargetTool): string {
  return content.replace(TOOL_BLOCK, (_match, blockTool: string, body: string) => (blockTool === tool ? body : ''));
}

/** Install-time choices that change what the prompts say */
export interface ContentOptions {
  /** One-line commit messages: keeps `<!-- lean-commits -->` blocks, drops `<!-- full-commits -->` ones */
  leanCommits?: boolean;
}

const OPTION_BLOCK = /^[ \t]*<!-- (lean-commits|full-commits) -->[ \t]*\r?\n([\s\S]*?)^[ \t]*<!-- \/\1 -->[ \t]*(?:\r?\n|$)/gm;

/** Keep the blocks for the chosen options (without their marker lines) and drop the others */
export function selectOptionBlocks(content: string, options: ContentOptions = {}): string {
  return content.replace(OPTION_BLOCK, (_match, block: string, body: string) =>
    (block === 'lean-commits') === Boolean(options.leanCommits) ? body : '');
}

export function replaceTemplateVars(content: string, tasksDir?: string, blueprintsDir?: string, options: ContentOptions = {}): string {
  const vars = tasksDir || blueprintsDir ? buildTemplateVars(tasksDir, blueprintsDir) : TEMPLATE_VARS;
  let result = selectOptionBlocks(content, options);
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

/** Identify blueprints' own entries in a Claude Code settings file or a Codex hooks.json */
export const GLANCE_SCRIPT_MARKER = 'blueprints/hooks/glance.mjs';
export const LEAN_COMMITS_SCRIPT_MARKER = 'blueprints/hooks/lean-commits.mjs';

/** A hook blueprints registers: the event, the script that identifies its entry, and its matcher */
export interface OwnHook {
  event: string;
  marker: string;
  matcher?: string;
  timeout: number;
}

export const GLANCE_HOOK: OwnHook = { event: 'Stop', marker: GLANCE_SCRIPT_MARKER, timeout: 30 };
/** Claude Code runs shell commands with Bash (PowerShell on Windows, when switched on) */
export const LEAN_COMMITS_HOOK: OwnHook = { event: 'PreToolUse', marker: LEAN_COMMITS_SCRIPT_MARKER, matcher: 'Bash|PowerShell', timeout: 10 };
/** Codex runs shell commands with exec_command (older versions: shell) */
export const LEAN_COMMITS_HOOK_CODEX: OwnHook = { ...LEAN_COMMITS_HOOK, matcher: '^(Bash|exec_command|shell|local_shell)$' };

/** Whether to register a hook: add it, remove it, or keep whatever is there (refreshing ours) */
export type HookChoice = 'on' | 'off' | 'keep';
export type GlanceChoice = HookChoice;

export type HookResult = 'added' | 'updated' | 'removed' | 'none' | 'unreadable';
export type GlanceHookResult = HookResult;

type HookCommand = { type?: string; command?: string; timeout?: number };
type HookEntry = { matcher?: string; hooks?: HookCommand[] };
type HooksRoot = { hooks?: Record<string, HookEntry[]> } & Record<string, unknown>;

const isOwnCommand = (h: HookCommand, hook: OwnHook): boolean => typeof h?.command === 'string' && h.command.includes(hook.marker);

/** Blueprints' own commands for a hook, with the matcher of the entry each sits in */
function ownCommands(existing: unknown, hook: OwnHook): { matcher?: string; command: HookCommand }[] {
  const list = (existing as HooksRoot | null)?.hooks?.[hook.event];
  if (!Array.isArray(list)) return [];
  return list.flatMap(entry => (Array.isArray(entry?.hooks) ? entry.hooks : [])
    .filter(h => isOwnCommand(h, hook))
    .map(command => ({ matcher: entry.matcher, command })));
}

export function hasHook(existing: unknown, hook: OwnHook): boolean {
  return ownCommands(existing, hook).length > 0;
}

/** A settings or hooks object whose hooks blueprints can safely edit (anything else is left alone) */
function hooksAreEditable(existing: unknown, event: string): boolean {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) return false;
  const hooks = (existing as HooksRoot).hooks;
  if (hooks === undefined) return true;
  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return false;
  return hooks[event] === undefined || Array.isArray(hooks[event]);
}

function hookEntry(hook: OwnHook, command: string, timeout = hook.timeout): HookEntry {
  return { ...(hook.matcher ? { matcher: hook.matcher } : {}), hooks: [{ type: 'command', command, timeout }] };
}

/**
 * Add (command given) or remove (null) one of blueprints' hooks, keeping every other hook, including any
 * the user put in the same entry, and keeping a timeout the user changed on ours.
 * Claude Code settings and Codex hooks.json share this shape.
 */
export function mergeHook(existing: unknown, hook: OwnHook, command: string | null): HooksRoot {
  const root: HooksRoot = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...(existing as HooksRoot) } : {};
  const hooks = root.hooks && typeof root.hooks === 'object' ? { ...root.hooks } : {};
  const timeout = ownCommands(existing, hook)[0]?.command.timeout;
  const list = (Array.isArray(hooks[hook.event]) ? hooks[hook.event] : []).flatMap(entry => {
    if (!Array.isArray(entry?.hooks) || !entry.hooks.some(h => isOwnCommand(h, hook))) return [entry];
    const rest = entry.hooks.filter(h => !isOwnCommand(h, hook));
    return rest.length ? [{ ...entry, hooks: rest }] : [];
  });
  if (command) list.push(hookEntry(hook, command, typeof timeout === 'number' ? timeout : hook.timeout));
  if (list.length) hooks[hook.event] = list;
  else delete hooks[hook.event];
  if (Object.keys(hooks).length) root.hooks = hooks;
  else delete root.hooks;
  return root;
}

/**
 * What a choice does to a settings or hooks object: the new object to write (null: leave it as it is)
 * and what happened. 'keep' refreshes an existing entry (its path or model may have changed) and adds nothing.
 */
export function decideHook(existing: unknown, hook: OwnHook, choice: HookChoice, command: string): { value: HooksRoot | null; result: HookResult } {
  if (!hooksAreEditable(existing, hook.event)) return { value: null, result: 'unreadable' };
  const own = ownCommands(existing, hook);
  const present = own.length > 0;
  if (choice !== 'off' && own.length === 1 && own[0].command.command === command && own[0].matcher === hook.matcher) {
    return { value: null, result: 'none' };
  }
  if (choice === 'off' || (choice === 'keep' && !present)) {
    return present ? { value: mergeHook(existing, hook, null), result: 'removed' } : { value: null, result: 'none' };
  }
  return { value: mergeHook(existing, hook, command), result: present ? 'updated' : 'added' };
}

/** Register, refresh or remove one of blueprints' hooks in a settings or hooks file */
export function applyHook(file: string, hook: OwnHook, choice: HookChoice, command: string): HookResult {
  const existing = readJsonFile(file);
  if (existing === null) return 'unreadable';
  const { value, result } = decideHook(existing, hook, choice, command);
  if (value) writeJsonFile(file, value);
  return result;
}

export const hasGlanceHook = (existing: unknown): boolean => hasHook(existing, GLANCE_HOOK);
export const mergeGlanceHook = (existing: unknown, command: string | null): HooksRoot => mergeHook(existing, GLANCE_HOOK, command);
export const decideGlanceHook = (existing: unknown, choice: HookChoice, command: string) => decideHook(existing, GLANCE_HOOK, choice, command);
export const applyGlanceHook = (file: string, choice: HookChoice, command: string): HookResult => applyHook(file, GLANCE_HOOK, choice, command);

/** The model the glance hook writes pages with in Claude Code: Opus at power level 5, Sonnet otherwise */
export function glanceModel(powerLevel: AgentPowerLevel): 'sonnet' | 'opus' {
  return powerLevel === 5 ? 'opus' : 'sonnet';
}

/** What lean commits sets in Claude Code's settings: no attribution trailer or session link on commits */
export const LEAN_ATTRIBUTION = { commit: '', sessionUrl: false };

/** What `attribution` was before lean commits changed it, so turning lean commits off can put it back */
export interface AttributionBefore {
  had: boolean;
  value?: unknown;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

function sameJson(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): unknown => (isPlainObject(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])]))
    : Array.isArray(v) ? v.map(canon) : v);
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

/** Already what lean commits sets (so it can't be the user's own "before" value) */
export function isLeanAttribution(value: unknown): boolean {
  return value === false || (isPlainObject(value) && value.commit === '' && value.sessionUrl === false);
}

function leanAttributionOver(before: unknown): unknown {
  return { ...(isPlainObject(before) ? before : {}), ...LEAN_ATTRIBUTION };
}

/** Settings with lean attribution (null: already so). `attribution: false` already hides everything. */
export function withLeanAttribution(settings: Record<string, unknown>): Record<string, unknown> | null {
  if (settings.attribution === false) return null;
  const next = leanAttributionOver(settings.attribution);
  return sameJson(settings.attribution, next) ? null : { ...settings, attribution: next };
}

/** Settings with `attribution` put back as it was (null: the user changed it since, so it's left alone) */
export function withoutLeanAttribution(settings: Record<string, unknown>, before: AttributionBefore | undefined): Record<string, unknown> | null {
  if (!before || !sameJson(settings.attribution, leanAttributionOver(before.value))) return null;
  const next = { ...settings };
  if (before.had) next.attribution = before.value;
  else delete next.attribution;
  return next;
}

/** Read a JSON file: {} when it's missing, null when it can't be parsed (so it's left alone) */
export function readJsonFile(file: string): unknown {
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

/** Write a settings or hooks file, keeping a one-time backup of the user's original */
export function writeJsonFile(file: string, value: unknown): void {
  const backup = `${file}.before-blueprints`;
  if (fs.existsSync(file) && !fs.existsSync(backup)) fs.copyFileSync(file, backup);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

/** A command's full path on PATH, or null */
export function findOnPath(name: string): string | null {
  const result = process.platform === 'win32'
    ? spawnSync('where', [name], { encoding: 'utf-8', windowsHide: true })
    : spawnSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf-8' });
  const first = result.status === 0 ? (result.stdout ?? '').split(/\r?\n/)[0].trim() : '';
  return first && path.isAbsolute(first) ? first : null;
}

/**
 * Node for hooks, by its full path (a session started from the GUI may not have it on PATH).
 * Prefers the PATH entry when it is this same Node: `/opt/homebrew/bin/node` survives `brew upgrade node`,
 * while this process's own path points into a versioned folder.
 */
export function nodeForHooks(): string {
  const onPath = findOnPath('node');
  try {
    if (onPath && fs.realpathSync(onPath) === fs.realpathSync(process.execPath)) return onPath;
  } catch {
    // fall through
  }
  return process.execPath;
}

/** A Node hook's command; for glance, `writer` is the claude or codex the page writer runs, recorded at install */
export function glanceHookCommand(script: string, args: string, writer: string | null = null): string {
  const slash = (p: string) => p.replace(/\\/g, '/');
  return `"${slash(nodeForHooks())}" "${slash(script)}"${args ? ` ${args}` : ''}${writer ? ` --writer "${slash(writer)}"` : ''}`;
}

/**
 * Keep a project's local settings file out of git: Claude Code only ignores settings.local.json when it
 * creates the file itself. Uses the repo's own info/exclude (worktrees included), so nothing in the repo changes.
 */
export function excludeFromGit(file: string): boolean {
  const dir = path.dirname(path.resolve(file));
  const git = (...args: string[]) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf-8', windowsHide: true });
  const top = git('rev-parse', '--show-toplevel');
  const excludeOut = git('rev-parse', '--git-path', 'info/exclude');
  if (top.status !== 0 || excludeOut.status !== 0) return false;
  const root = top.stdout.trim();
  const exclude = path.resolve(dir, excludeOut.stdout.trim());
  const rel = path.relative(fs.realpathSync(root), fs.realpathSync(path.dirname(path.resolve(file)))).split(path.sep).join('/');
  const entry = `/${rel ? `${rel}/` : ''}${path.basename(file)}`;
  const lines = fs.existsSync(exclude) ? fs.readFileSync(exclude, 'utf-8').split('\n') : [];
  if (lines.some(line => line.trim() === entry)) return true;
  ensureDir(path.dirname(exclude));
  const prefix = lines.length && lines[lines.length - 1] !== '' ? '\n' : '';
  fs.appendFileSync(exclude, `${prefix}${entry}\n`, 'utf-8');
  return true;
}

/**
 * Settings file for the Claude Code glance hook: the user's settings for a global install,
 * the project's local (unshared) settings otherwise
 */
export function claudeSettingsFile(claudeDir: string): string {
  const global = path.resolve(claudeDir) === path.resolve(getDefaultClaudeDir());
  return path.join(claudeDir, global ? 'settings.json' : 'settings.local.json');
}


export interface ExistingInstallation {
  hasCommands: boolean;
  hasAgents: boolean;
  commandsPath: string;
  agentsPath: string;
}

export interface InstalledFiles {
  commands: string[];
  agents: string[];
  workflows: string[];
  hooks: string[];
  procedures?: string[];
}

export interface Manifest {
  version: string;
  installedAt: string;
  powerLevel: AgentPowerLevel;
  tasksDir?: string;
  files?: InstalledFiles;
  /** Lean commits is on: what Claude Code's `attribution` setting was before it */
  attributionBefore?: AttributionBefore;
  /** Lean commits was on in this install (used when the settings file can't be read) */
  leanCommits?: boolean;
}

/**
 * Get the default Claude directory based on the operating system
 */
export function getDefaultClaudeDir(): string {
  const homeDir = os.homedir();

  switch (process.platform) {
    case 'win32':
      // Windows: Use USERPROFILE or fallback to homedir
      return path.join(process.env.USERPROFILE || homeDir, '.claude');
    case 'darwin':
    case 'linux':
    default:
      // macOS and Linux: ~/.claude
      return path.join(homeDir, '.claude');
  }
}

/**
 * Get the installation paths for commands, agents, workflows, and support files
 */
export function getInstallPaths(basePath: string): InstallPaths {
  // Resolve ~ to home directory if present
  let resolvedPath = basePath;
  if (basePath.startsWith('~')) {
    resolvedPath = path.join(os.homedir(), basePath.slice(1));
  }
  // Installed files reference their own paths (hook scripts, procedures), so they must be absolute
  resolvedPath = path.resolve(resolvedPath);

  // If the path already ends with .claude, use it directly
  // Otherwise, append .claude
  let claudeDir: string;
  if (resolvedPath.endsWith('.claude') || resolvedPath.includes('.claude' + path.sep)) {
    claudeDir = resolvedPath;
  } else {
    claudeDir = path.join(resolvedPath, '.claude');
  }

  return {
    base: claudeDir,
    commands: path.join(claudeDir, 'commands'),
    agents: path.join(claudeDir, 'agents'),
    workflows: path.join(claudeDir, 'workflows'),
    support: path.join(claudeDir, 'blueprints'),
  };
}

/**
 * Get the source directory for blueprints (within the package)
 */
export function getSourcePaths(): SourcePaths {
  // When compiled, __dirname will be in dist/, so we need to go up one level
  const packageRoot = path.join(__dirname, '..');
  return {
    commands: path.join(packageRoot, 'content', 'commands'),
    agents: path.join(packageRoot, 'content', 'agents'),
    workflows: path.join(packageRoot, 'content', 'workflows'),
    hooks: path.join(packageRoot, 'content', 'hooks'),
    procedures: path.join(packageRoot, 'content', 'procedures'),
  };
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Hidden entries (.DS_Store, editor or tool folders) are never installed
 */
function isHidden(name: string): boolean {
  return name.startsWith('.');
}

/**
 * List files under a directory, recursively, as paths relative to it
 */
export function listFiles(dir: string, prefix = ''): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (isHidden(entry)) continue;
    const full = path.join(dir, entry);
    const rel = prefix ? path.join(prefix, entry) : entry;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...listFiles(full, rel));
    } else if (stat.isFile()) {
      files.push(rel);
    }
  }
  return files;
}

/**
 * Copy all files from source to destination directory
 */
export function copyDirectory(srcDir: string, destDir: string, tasksDir?: string, blueprintsDir?: string, options: ContentOptions = {}): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    if (isHidden(file)) continue;
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    const stat = fs.statSync(srcFile);

    if (stat.isFile() && file.endsWith('.md')) {
      const content = fs.readFileSync(srcFile, 'utf-8');
      const updated = selectToolBlocks(replaceTemplateVars(content, tasksDir, blueprintsDir, options), 'claude');
      fs.writeFileSync(destFile, updated, 'utf-8');
      copiedCount++;
    } else if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    } else if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copiedCount += copyDirectory(srcFile, path.join(destDir, file), tasksDir, blueprintsDir, options);
    }
  }

  return copiedCount;
}

/**
 * Copy support files (workflows, hooks, procedures) with template variables replaced.
 * Markdown keeps only its Claude Code blocks; shell scripts are made executable.
 */
export function copyTemplatedFiles(srcDir: string, destDir: string, tasksDir?: string, blueprintsDir?: string, options: ContentOptions = {}): number {
  if (!fs.existsSync(srcDir)) return 0;
  ensureDir(destDir);

  let copiedCount = 0;
  for (const rel of listFiles(srcDir)) {
    const srcFile = path.join(srcDir, rel);
    const destFile = path.join(destDir, rel);
    ensureDir(path.dirname(destFile));

    let content = replaceTemplateVars(fs.readFileSync(srcFile, 'utf-8'), tasksDir, blueprintsDir, options);
    if (rel.endsWith('.md')) {
      content = selectToolBlocks(content, 'claude');
    }
    fs.writeFileSync(destFile, content, 'utf-8');
    if (rel.endsWith('.sh')) {
      fs.chmodSync(destFile, 0o755);
    }
    copiedCount++;
  }
  return copiedCount;
}

/**
 * Determine the tier for an agent based on its filename
 */
export function getAgentTier(filename: string): AgentTier {
  if (LIGHTWEIGHT_AGENTS.includes(filename)) return 'lightweight';
  if (RESEARCH_AGENTS.includes(filename)) return 'research';
  if (HEAVYWEIGHT_AGENTS.includes(filename)) return 'heavyweight';
  return 'standard';
}

/**
 * Get the model to use for a given agent file based on power level and tier
 *
 * Tiers:
 * - lightweight: commit, changelog, handoff, cleanup, imagine, og (rote tasks)
 * - research: codebase/docs/web research (search + synthesize)
 * - standard: refactor, test, blueprint, implement, etc. (balanced)
 * - heavyweight: audit, diagnose, secure (deep reasoning, high stakes)
 */
export function getModelForAgent(filename: string, powerLevel: AgentPowerLevel): 'haiku' | 'sonnet' | 'opus' {
  const tier = getAgentTier(filename);

  const modelMap: Record<AgentPowerLevel, Record<AgentTier, 'haiku' | 'sonnet' | 'opus'>> = {
    1: { lightweight: 'haiku',  research: 'haiku',  standard: 'haiku',  heavyweight: 'sonnet' },
    2: { lightweight: 'haiku',  research: 'haiku',  standard: 'sonnet', heavyweight: 'sonnet' },
    3: { lightweight: 'sonnet', research: 'sonnet', standard: 'sonnet', heavyweight: 'sonnet' },
    4: { lightweight: 'sonnet', research: 'sonnet', standard: 'opus',   heavyweight: 'opus' },
    5: { lightweight: 'opus',   research: 'opus',   standard: 'opus',   heavyweight: 'opus' },
  };

  return modelMap[powerLevel][tier];
}

/**
 * Copy agent files with model rewritten based on power level
 */
export function copyAgentsWithPowerLevel(srcDir: string, destDir: string, powerLevel: AgentPowerLevel, tasksDir?: string, blueprintsDir?: string, options: ContentOptions = {}): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    if (isHidden(file)) continue;
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copiedCount += copyAgentsWithPowerLevel(srcFile, path.join(destDir, file), powerLevel, tasksDir, blueprintsDir, options);
    } else if (stat.isFile() && file.endsWith('.md')) {
      const content = fs.readFileSync(srcFile, 'utf-8');
      const model = getModelForAgent(file, powerLevel);
      let updated = content.replace(/^(model:\s*).+$/m, `$1${model}`);
      updated = selectToolBlocks(replaceTemplateVars(updated, tasksDir, blueprintsDir, options), 'claude');
      fs.writeFileSync(destFile, updated, 'utf-8');
      copiedCount++;
    } else if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    }
  }

  return copiedCount;
}

/**
 * Get the current package version
 */
export function getPackageVersion(): string {
  const packageRoot = path.join(__dirname, '..');
  const pkgPath = path.join(packageRoot, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Read the manifest a previous install wrote, if any
 */
export function readManifest(baseDir: string): Manifest | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(baseDir, MANIFEST_FILE), 'utf-8')) as Manifest;
  } catch {
    return null;
  }
}

/**
 * Whether a file carries the blueprints marker in its frontmatter
 */
export function isBlueprintsFile(filePath: string): boolean {
  if (!filePath.endsWith('.md') || !fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return frontmatter !== null && frontmatter[1].includes(BLUEPRINTS_MARKER);
}

/**
 * Remove files a previous blueprints install put in destDir that the package no longer ships.
 *
 * Only blueprints' own files are ever removed:
 * - with a manifest from a previous install, the files it lists
 * - without one (installs before the manifest existed), files named in `legacyNames`
 *   that also carry the blueprints marker
 * Anything else in destDir (the user's own commands, agents, workflows) is left alone.
 */
export function cleanStaleFiles(srcDir: string, destDir: string, previouslyInstalled: string[] | null, legacyNames: string[] = []): number {
  if (!fs.existsSync(destDir)) return 0;

  const candidates = previouslyInstalled ?? legacyNames;
  let removedCount = 0;

  for (const rel of candidates) {
    if (fs.existsSync(path.join(srcDir, rel))) continue; // still shipped: it gets overwritten
    const destFile = path.join(destDir, rel);
    if (!fs.existsSync(destFile) || !fs.statSync(destFile).isFile()) continue;
    if (previouslyInstalled === null && !isBlueprintsFile(destFile)) continue;

    fs.unlinkSync(destFile);
    removedCount++;
  }

  return removedCount;
}

/**
 * Install blueprints to the target path
 */
export async function installBlueprints(
  targetPath: string,
  powerLevel: AgentPowerLevel = 3,
  tasksDir: string = DEFAULT_TASKS_DIR,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const glance = options.glance ?? 'keep';
  const lean = options.leanCommits ?? 'keep';
  const sourcePaths = getSourcePaths();
  const installPaths = getInstallPaths(targetPath);

  // Verify source directories exist
  if (!fs.existsSync(sourcePaths.commands)) {
    throw new Error(`Source commands directory not found: ${sourcePaths.commands}`);
  }
  if (!fs.existsSync(sourcePaths.agents)) {
    throw new Error(`Source agents directory not found: ${sourcePaths.agents}`);
  }

  // Ensure base .claude directory exists
  ensureDir(installPaths.base);

  // Remove files a previous install put here that are no longer shipped (never the user's own files)
  const previousManifest = readManifest(installPaths.base);
  const previous = previousManifest?.files ?? null;

  // Lean commits changes what the commit agents are told, so settle it before copying them.
  // A project install also follows lean commits that's on in the user's settings: its hook applies here too.
  const settingsFile = claudeSettingsFile(installPaths.base);
  const settings = readJsonFile(settingsFile);
  const userSettings = path.join(getDefaultClaudeDir(), 'settings.json');
  const leanCommitsGlobal = path.resolve(settingsFile) !== path.resolve(userSettings) && hasHook(readJsonFile(userSettings), LEAN_COMMITS_HOOK);
  const leanHere = settings === null ? Boolean(previousManifest?.leanCommits) : hasHook(settings, LEAN_COMMITS_HOOK);
  const leanOn = lean === 'on' || (lean === 'keep' && (leanHere || leanCommitsGlobal));
  const content: ContentOptions = { leanCommits: leanOn };
  const hooksDest = path.join(installPaths.support, 'hooks');
  const proceduresDest = path.join(installPaths.support, 'procedures');
  let removed = 0;
  removed += cleanStaleFiles(sourcePaths.commands, installPaths.commands, previous ? previous.commands ?? [] : null, LEGACY_COMMANDS);
  removed += cleanStaleFiles(sourcePaths.agents, installPaths.agents, previous ? previous.agents ?? [] : null, LEGACY_AGENTS);
  removed += cleanStaleFiles(sourcePaths.workflows, installPaths.workflows, previous?.workflows ?? []);
  removed += cleanStaleFiles(sourcePaths.hooks, hooksDest, previous?.hooks ?? []);
  removed += cleanStaleFiles(sourcePaths.procedures, proceduresDest, previous?.procedures ?? []);

  const blueprintsDir = installPaths.support;

  // Copy commands
  const commandsCount = copyDirectory(sourcePaths.commands, installPaths.commands, tasksDir, blueprintsDir, content);

  // Copy agents with power level model overrides
  const agentsCount = copyAgentsWithPowerLevel(sourcePaths.agents, installPaths.agents, powerLevel, tasksDir, blueprintsDir, content);

  // Copy workflows and hook scripts
  const workflowsCount = copyTemplatedFiles(sourcePaths.workflows, installPaths.workflows, tasksDir, blueprintsDir, content);
  copyTemplatedFiles(sourcePaths.hooks, hooksDest, tasksDir, blueprintsDir, content);
  copyTemplatedFiles(sourcePaths.procedures, proceduresDest, tasksDir, blueprintsDir, content);

  // Optional hooks, both in the one settings file:
  // - glance (Stop): opens /glance pages, makes pages for long replies
  // - lean commits (PreToolUse on Bash): turns down commits that aren't one `type: description` line,
  //   and switches off Claude Code's own commit attribution (put back as it was when turned off)
  let glanceHook: HookResult = 'unreadable';
  let leanCommits: HookResult = 'unreadable';
  let attributionBefore = previousManifest?.attributionBefore;
  let attribution: InstallResult['attribution'];
  if (isPlainObject(settings)) {
    let next: Record<string, unknown> = settings;
    const glanceCommand = glanceHookCommand(path.join(hooksDest, 'glance.mjs'), `claude --model ${glanceModel(powerLevel)}`, findOnPath('claude'));
    const g = decideHook(next, GLANCE_HOOK, glance, glanceCommand);
    glanceHook = g.result;
    if (g.value) next = g.value;
    const l = decideHook(next, LEAN_COMMITS_HOOK, lean, glanceHookCommand(path.join(hooksDest, 'lean-commits.mjs'), ''));
    leanCommits = l.result;
    if (l.value) next = l.value;
    if (leanOn && hasHook(next, LEAN_COMMITS_HOOK)) {
      // Record the user's own value once (never one lean commits set), then switch attribution off
      if (!attributionBefore && !isLeanAttribution(next.attribution)) attributionBefore = { had: 'attribution' in next, value: next.attribution };
      const withLean = withLeanAttribution(next);
      if (withLean) {
        next = withLean;
        attribution = 'set';
      }
    } else if (lean === 'off' && attributionBefore) {
      // Put back what was there, unless the user has changed it since
      const restored = withoutLeanAttribution(next, attributionBefore);
      if (restored) next = restored;
      attribution = restored ? 'restored' : 'left';
      attributionBefore = undefined;
    }
    if (next !== settings) {
      writeJsonFile(settingsFile, next);
      if (settingsFile.endsWith('settings.local.json')) excludeFromGit(settingsFile);
    }
  }

  // Write version marker and manifest of installed files
  const manifest: Manifest = {
    version: getPackageVersion(),
    installedAt: new Date().toISOString(),
    powerLevel,
    tasksDir,
    files: {
      commands: listFiles(sourcePaths.commands),
      agents: listFiles(sourcePaths.agents),
      workflows: listFiles(sourcePaths.workflows),
      hooks: listFiles(sourcePaths.hooks),
      procedures: listFiles(sourcePaths.procedures),
    },
    ...(attributionBefore ? { attributionBefore } : {}),
    leanCommits: leanOn,
  };
  fs.writeFileSync(path.join(installPaths.base, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    commands: commandsCount,
    agents: agentsCount,
    workflows: workflowsCount,
    removed,
    paths: installPaths,
    powerLevel,
    glanceHook,
    leanCommits,
    attribution,
    leanCommitsGlobal,
    settingsFile,
  };
}

/**
 * Check if blueprints are already installed at a path
 */
export function checkExistingInstallation(targetPath: string): ExistingInstallation {
  const paths = getInstallPaths(targetPath);

  return {
    hasCommands: fs.existsSync(paths.commands) && fs.readdirSync(paths.commands).length > 0,
    hasAgents: fs.existsSync(paths.agents) && fs.readdirSync(paths.agents).length > 0,
    commandsPath: paths.commands,
    agentsPath: paths.agents
  };
}
