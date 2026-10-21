import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AgentPowerLevel,
  DEFAULT_TASKS_DIR,
  decideHook,
  ensureDir,
  findOnPath,
  glanceHookCommand,
  getModelForAgent,
  getPackageVersion,
  getSourcePaths,
  listFiles,
  readJsonFile,
  replaceTemplateVars,
  selectToolBlocks,
  writeJsonFile,
} from './installer.js';
import { GLANCE_HOOK, LEAN_COMMITS_HOOK_CODEX, hasHook, mergeHook } from './installer.js';
import type { ContentOptions, HookResult, InstallOptions, OwnHook } from './installer.js';

/**
 * Codex support: converts the Claude Code commands and agents into Codex skills
 * (`.agents/skills/<name>/SKILL.md`) and custom agents (`.codex/agents/<name>.toml`),
 * registers the implement agent's typecheck gate as a Codex SubagentStop hook, and can
 * register the glance hook (Stop) that opens and makes glance pages and the lean commits hook (PreToolUse).
 */

export type CodexScope = 'global' | 'project';

export interface CodexInstallPaths {
  /** Codex home (`~/.codex`, `$CODEX_HOME`, or `<project>/.codex`) */
  codexHome: string;
  /** Skills directory (`~/.agents/skills` or `<project>/.agents/skills`) */
  skills: string;
  agents: string;
  hooksFile: string;
  /** Blueprints' own files (hook script, manifest) */
  support: string;
  manifest: string;
}

export interface CodexInstallResult {
  skills: number;
  agents: number;
  removed: number;
  /** Names skipped because a skill or agent the user wrote already uses them */
  skipped: string[];
  hookRegistered: boolean;
  /** What happened to the glance and lean commits hooks in hooks.json */
  glanceHook: HookResult;
  leanCommits: HookResult;
  /** Lean commits is on in the user's Codex home, so it applies to this project install too */
  leanCommitsGlobal: boolean;
  paths: CodexInstallPaths;
}

export interface CodexManifest {
  version: string;
  installedAt: string;
  powerLevel: AgentPowerLevel;
  tasksDir: string;
  skills: string[];
  agents: string[];
  procedures?: string[];
  /** Lean commits was on in this install (used when hooks.json can't be read) */
  leanCommits?: boolean;
}

/** Marker written into every file blueprints installs for Codex */
export const CODEX_MARKER = 'installed by @allthingsclaude/blueprints';

/** Identifies blueprints' own entry in a Codex hooks.json */
export const GATE_SCRIPT_MARKER = 'blueprints/hooks/phase-gate.sh';

const EFFORT_BY_MODEL: Record<'haiku' | 'sonnet' | 'opus', string> = {
  haiku: 'low',
  sonnet: 'medium',
  opus: 'high',
};

const CODEX_EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

/** What each power level means for Codex (reasoning effort per agent tier; agents use the session's model) */
export const POWER_LEVEL_EFFORTS: Record<AgentPowerLevel, string> = {
  1: 'low effort, medium for heavyweight — fastest, lowest cost',
  2: 'low effort light + research, medium everything else',
  3: 'all medium effort',
  4: 'medium effort light + research, high everything else — recommended',
  5: 'all high effort — most thorough, highest cost',
};

/**
 * Reasoning effort for a Codex agent: an explicit `effort:` in its frontmatter wins,
 * otherwise it follows the agent's tier at the chosen power level
 */
export function getEffortForAgent(filename: string, powerLevel: AgentPowerLevel, explicitEffort?: string): string {
  if (explicitEffort && CODEX_EFFORTS.has(explicitEffort)) return explicitEffort;
  return EFFORT_BY_MODEL[getModelForAgent(filename, powerLevel)];
}

export function getCodexPaths(scope: CodexScope, root: string, home: string = os.homedir()): CodexInstallPaths {
  const codexHome = scope === 'global'
    ? (process.env.CODEX_HOME || path.join(home, '.codex'))
    : path.join(root, '.codex');
  const skills = scope === 'global'
    ? path.join(home, '.agents', 'skills')
    : path.join(root, '.agents', 'skills');
  const support = path.join(codexHome, 'blueprints');

  return {
    codexHome,
    skills,
    agents: path.join(codexHome, 'agents'),
    hooksFile: path.join(codexHome, 'hooks.json'),
    support,
    manifest: path.join(support, 'manifest.json'),
  };
}

export interface Frontmatter {
  fields: Record<string, string>;
  body: string;
}

/**
 * Split a markdown file into its top-level frontmatter scalars and body.
 * Nested blocks (such as `hooks:`) are ignored — they have no Codex equivalent.
 */
export function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { fields: {}, body: content };

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field || field[2].trim() === '') continue; // nested block (e.g. `hooks:`)
    let value = field[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    fields[field[1]] = value;
  }
  return { fields, body: content.slice(match[0].length) };
}

const TOOL_REPLACEMENTS: Array<[RegExp, string]> = [
  // Phrases first, so the generic replacements below don't mangle them
  [/a task list \(`TodoWrite` or the task tools, if available\)/g, 'a plan (`update_plan`)'],
  [/\(`TodoWrite` or the task tools, if available\)/g, '(`update_plan`)'],
  [/`Read` \((?:with|using) `offset`\/`limit`\)/g, "`sed -n 'START,ENDp' <file>`"],
  [/`Edit`\/`Write`|`Write`\/`Edit`|`Edit` or `Write`|`Write` or `Edit`/g, '`apply_patch`'],
  [/`Grep`\/`Glob`|`Glob`\/`Grep`/g, '`rg`'],
  [/\*\*AskUserQuestion tool\*\*/g, '**`request_user_input` tool** (or plain questions in your reply if it isn\'t available)'],
  [/`AskUserQuestion`/g, '`request_user_input` (or ask in your reply)'],
  [/\bAskUserQuestion\b/g, '`request_user_input`'],
  [/`Agent` tool/g, '`spawn_agent` tool'],
  [/`Agent`/g, '`spawn_agent`'],
  [/\bAgent\(\{/g, 'spawn_agent({'],
  // Codex's built-in roles are default, worker and explorer; worker is the one for fixes
  [/\bsubagent_type(\s*[=:]\s*)"general-purpose"/g, 'agent_type$1"worker"'],
  [/\bsubagent_type(\s*[=:]\s*)/g, 'agent_type$1'],
  // Backticked tool names
  [/`Read`/g, 'a file read (`sed -n` / `cat`)'],
  [/`Grep`/g, '`rg`'],
  [/`Glob`/g, '`rg --files`'],
  [/`Edit`|`Write`/g, '`apply_patch`'],
  [/`Bash`/g, 'the shell'],
  [/`TodoWrite`/g, '`update_plan`'],
  [/`WebSearch`/g, '`web_search`'],
  [/`WebFetch`/g, '`web_search` (open the page) or `curl -sL`'],
  // Bare tool names in phrases like "Use Grep tool with pattern" or "find it with Grep"
  [/\b(Edit|Write) tool\b/g, '`apply_patch`'],
  [/\bRead tool\b/g, 'file reads'],
  [/\bBash tool\b/g, 'the shell'],
  [/\bGrep tool\b/g, '`rg`'],
  [/\b(Use|use|Using|using|with|With) (Edit|Write)\b/g, '$1 `apply_patch`'],
  [/\bGrep\b/g, '`rg`'],
  [/\bGlob\b/g, '`rg --files`'],
  [/\bTodoWrite\b/g, '`update_plan`'],
  [/\bWebSearch\b/g, '`web_search`'],
  [/\bWebFetch\b/g, '`web_search` or `curl -sL`'],
  // Instruction files and product name
  [/CLAUDE\.md \(or the AGENTS\.md it imports\)/g, 'AGENTS.md'],
  [/CLAUDE\.md/g, 'AGENTS.md'],
  [/Claude Code/g, 'Codex'],
];

export interface ConvertedText {
  text: string;
  hasInjections: boolean;
  hasArguments: boolean;
}

/**
 * Convert command or agent text written for Claude Code into Codex terms.
 * Template variables must already be rendered.
 */
export function convertTextForCodex(text: string, commandNames: string[]): ConvertedText {
  let out = selectToolBlocks(text, 'codex');

  // `!`cmd`` injections run before Claude sees the prompt; Codex has no equivalent,
  // so they become steps the model runs itself.
  const hasInjections = /!`[^`]+`/.test(out);
  out = out.replace(/!`([^`]+)`/g, 'run `$1`');

  const hasArguments = out.includes('$ARGUMENTS');
  out = out.replaceAll('$ARGUMENTS', '<arguments>');

  for (const [pattern, replacement] of TOOL_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  // Slash commands are skills in Codex, invoked as `$name`
  const names = [...commandNames].sort((a, b) => b.length - a.length);
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Not when followed by a word character, slash, hyphen, or a file extension (`/autopilot.md`)
    const slash = new RegExp(`(^|[\\s(\`'"|>*])\\/${escaped}(?![\\w/-]|\\.[\\w/])`, 'gm');
    out = out.replace(slash, (_match, before: string) => `${before}$${name}`);
  }

  return { text: out, hasInjections, hasArguments };
}

function codexNotes(converted: ConvertedText): string {
  const notes: string[] = [];
  if (converted.hasArguments) {
    notes.push('`<arguments>` below means the text the user wrote with this skill (it may be empty).');
  }
  if (converted.hasInjections) {
    notes.push('Lines marked "run `…`" are context to gather first: run those commands before following the steps below, and use their output.');
  }
  return notes.length ? `> **Codex notes** — ${notes.join(' ')}\n\n` : '';
}

/** YAML double-quoted scalar (JSON strings are valid YAML) */
function yamlString(value: string): string {
  return JSON.stringify(value);
}

/** TOML basic string */
export function tomlString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}"`;
}

/** TOML multi-line string: literal when possible, escaped basic otherwise */
export function tomlMultiline(value: string): string {
  const body = value.endsWith('\n') ? value : `${value}\n`;
  if (!body.includes("'''") && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) {
    return `'''\n${body}'''`;
  }
  const escaped = body
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `"""\n${escaped}"""`;
}

export interface CodexSkill {
  name: string;
  skillMd: string;
  /** `agents/openai.yaml` contents, for skills Codex must not invoke on its own */
  openaiYaml?: string;
}

/**
 * Convert a Claude Code command file into a Codex skill
 */
export function commandToSkill(filename: string, content: string, commandNames: string[]): CodexSkill {
  const name = filename.replace(/\.md$/, '');
  const { fields, body } = parseFrontmatter(content);
  const converted = convertTextForCodex(body, commandNames);
  const description = convertTextForCodex(fields.description || `Blueprints ${name} command`, commandNames).text;
  const usage = fields['argument-hint'] ? `**Usage**: \`$${name} ${fields['argument-hint']}\`\n\n` : '';

  const skillMd = [
    '---',
    `name: ${name}`,
    `description: ${yamlString(description)}`,
    '---',
    '',
    `${codexNotes(converted)}${usage}${converted.text.trim()}`,
    '',
    `<!-- ${CODEX_MARKER} -->`,
    '',
  ].join('\n');

  const explicitOnly = fields['disable-model-invocation'] === 'true';
  return {
    name,
    skillMd,
    openaiYaml: explicitOnly ? 'policy:\n  allow_implicit_invocation: false\n' : undefined,
  };
}

/**
 * Convert a Claude Code agent file into a Codex custom agent (TOML).
 * Only fields Codex accepts are written — it rejects agent files with unknown keys.
 */
export function agentToToml(filename: string, content: string, powerLevel: AgentPowerLevel, commandNames: string[]): string {
  const { fields, body } = parseFrontmatter(content);
  const name = fields.name || filename.replace(/\.md$/, '');
  const description = convertTextForCodex(fields.description || `Blueprints ${name} agent`, commandNames).text;
  const effort = getEffortForAgent(filename, powerLevel, fields.effort);
  const instructions = convertTextForCodex(body, commandNames).text.trim();

  return [
    `# ${CODEX_MARKER} — reinstall to update; local edits are overwritten`,
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description)}`,
    `model_reasoning_effort = ${tomlString(effort)}`,
    `developer_instructions = ${tomlMultiline(instructions)}`,
    '',
  ].join('\n');
}

type HookEntry = { matcher?: string; hooks?: Array<{ type?: string; command?: string; timeout?: number }> };
type HooksFile = { hooks?: Record<string, HookEntry[]> } & Record<string, unknown>;

/** The implement agent's typecheck gate, as a Codex SubagentStop hook */
export const GATE_HOOK: OwnHook = { event: 'SubagentStop', marker: GATE_SCRIPT_MARKER, matcher: '^implement$', timeout: 600 };

/**
 * Add (or replace) blueprints' SubagentStop gate for the implement agent, keeping every other hook
 */
export function mergeCodexHooks(existing: unknown, command: string): HooksFile {
  return mergeHook(existing, GATE_HOOK, command) as HooksFile;
}

function hasMarker(file: string): boolean {
  return fs.existsSync(file) && fs.readFileSync(file, 'utf-8').includes(CODEX_MARKER);
}

function readCodexManifest(file: string): CodexManifest | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as CodexManifest;
  } catch {
    return null;
  }
}

/**
 * Install blueprints for Codex.
 * Only files carrying the blueprints marker are ever replaced or removed; same-named
 * skills or agents the user wrote are skipped.
 */
export async function installCodex(
  scope: CodexScope,
  root: string,
  powerLevel: AgentPowerLevel = 4,
  tasksDir: string = DEFAULT_TASKS_DIR,
  home: string = os.homedir(),
  options: InstallOptions = {}
): Promise<CodexInstallResult> {
  const glance = options.glance ?? 'keep';
  const lean = options.leanCommits ?? 'keep';
  const source = getSourcePaths();
  const paths = getCodexPaths(scope, root, home);
  const vars = { tasksDir, blueprintsDir: paths.support };
  // Lean commits changes what the commit agents are told, so settle it before converting them
  // A project install also follows lean commits that's on in the user's Codex home: its hook applies here too
  const hooksBefore = readJsonFile(paths.hooksFile);
  const userHooks = getCodexPaths('global', root, home).hooksFile;
  const leanCommitsGlobal = path.resolve(userHooks) !== path.resolve(paths.hooksFile) && hasHook(readJsonFile(userHooks), LEAN_COMMITS_HOOK_CODEX);
  const leanHere = hooksBefore === null ? Boolean(readCodexManifest(paths.manifest)?.leanCommits) : hasHook(hooksBefore, LEAN_COMMITS_HOOK_CODEX);
  const leanOn = lean === 'on' || (lean === 'keep' && (leanHere || leanCommitsGlobal));
  const contentOptions: ContentOptions = { leanCommits: leanOn };

  const commandFiles = listFiles(source.commands).filter(f => f.endsWith('.md'));
  const agentFiles = listFiles(source.agents).filter(f => f.endsWith('.md'));
  const commandNames = commandFiles.map(f => f.replace(/\.md$/, ''));
  const agentNames = agentFiles.map(f => f.replace(/\.md$/, ''));

  const procedureFiles = listFiles(source.procedures).filter(f => f.endsWith('.md'));
  const proceduresDir = path.join(paths.support, 'procedures');

  ensureDir(paths.skills);
  ensureDir(paths.agents);
  ensureDir(paths.support);

  // Remove what a previous install put here and is no longer shipped
  let removed = 0;
  const previous = readCodexManifest(paths.manifest);
  for (const name of previous?.skills ?? []) {
    if (commandNames.includes(name)) continue;
    const dir = path.join(paths.skills, name);
    if (hasMarker(path.join(dir, 'SKILL.md'))) {
      fs.rmSync(dir, { recursive: true });
      removed++;
    }
  }
  for (const name of previous?.agents ?? []) {
    if (agentNames.includes(name)) continue;
    const file = path.join(paths.agents, `${name}.toml`);
    if (hasMarker(file)) {
      fs.unlinkSync(file);
      removed++;
    }
  }
  for (const rel of previous?.procedures ?? []) {
    if (procedureFiles.includes(rel)) continue;
    const file = path.join(proceduresDir, rel);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      removed++;
    }
  }

  const skipped: string[] = [];
  const installedSkills: string[] = [];
  for (const file of commandFiles) {
    const content = replaceTemplateVars(fs.readFileSync(path.join(source.commands, file), 'utf-8'), vars.tasksDir, vars.blueprintsDir, contentOptions);
    const skill = commandToSkill(file, content, commandNames);
    const dir = path.join(paths.skills, skill.name);
    const skillFile = path.join(dir, 'SKILL.md');
    if (fs.existsSync(skillFile) && !hasMarker(skillFile)) {
      skipped.push(`skill ${skill.name}`);
      continue;
    }
    ensureDir(dir);
    fs.writeFileSync(skillFile, skill.skillMd, 'utf-8');
    const policyFile = path.join(dir, 'agents', 'openai.yaml');
    if (skill.openaiYaml) {
      ensureDir(path.dirname(policyFile));
      fs.writeFileSync(policyFile, skill.openaiYaml, 'utf-8');
    } else if (fs.existsSync(policyFile)) {
      fs.unlinkSync(policyFile);
    }
    installedSkills.push(skill.name);
  }

  const installedAgents: string[] = [];
  for (const file of agentFiles) {
    const name = file.replace(/\.md$/, '');
    const target = path.join(paths.agents, `${name}.toml`);
    if (fs.existsSync(target) && !hasMarker(target)) {
      skipped.push(`agent ${name}`);
      continue;
    }
    const content = replaceTemplateVars(fs.readFileSync(path.join(source.agents, file), 'utf-8'), vars.tasksDir, vars.blueprintsDir, contentOptions);
    fs.writeFileSync(target, agentToToml(file, content, powerLevel, commandNames), 'utf-8');
    installedAgents.push(name);
  }

  // Procedures shared by several skills (e.g. dispatch, followed by $dispatch and $autopilot)
  for (const rel of procedureFiles) {
    const content = replaceTemplateVars(fs.readFileSync(path.join(source.procedures, rel), 'utf-8'), vars.tasksDir, vars.blueprintsDir, contentOptions);
    const target = path.join(proceduresDir, rel);
    ensureDir(path.dirname(target));
    fs.writeFileSync(target, `${convertTextForCodex(content, commandNames).text.trim()}\n\n<!-- ${CODEX_MARKER} -->\n`, 'utf-8');
  }

  // Hooks, the same scripts as Claude Code, registered in hooks.json: the implement agent's typecheck
  // gate (SubagentStop), the glance hook (Stop) and the lean commits hook (PreToolUse on shell commands)
  const hooksDir = path.join(paths.support, 'hooks');
  const gateSource = path.join(source.hooks, 'phase-gate.sh');
  const gateDest = path.join(hooksDir, 'phase-gate.sh');
  const withGate = fs.existsSync(gateSource) && installedAgents.includes('implement');
  if (withGate) {
    ensureDir(hooksDir);
    fs.copyFileSync(gateSource, gateDest);
    fs.chmodSync(gateDest, 0o755);
  }
  for (const script of ['glance.mjs', 'lean-commits.mjs']) {
    const from = path.join(source.hooks, script);
    if (!fs.existsSync(from)) continue;
    ensureDir(hooksDir);
    fs.writeFileSync(path.join(hooksDir, script), replaceTemplateVars(fs.readFileSync(from, 'utf-8'), vars.tasksDir, vars.blueprintsDir), 'utf-8');
  }

  let hookRegistered = false;
  let glanceHook: HookResult = 'unreadable';
  let leanCommits: HookResult = 'unreadable';
  const existing = hooksBefore; // null when unparseable: leave the user's file alone
  if (existing !== null) {
    let merged: unknown = existing;
    if (withGate) {
      merged = mergeCodexHooks(merged, `sh "${gateDest}"`);
      hookRegistered = true;
    }
    const g = decideHook(merged, GLANCE_HOOK, glance, glanceHookCommand(path.join(hooksDir, 'glance.mjs'), 'codex', findOnPath('codex')));
    glanceHook = g.result;
    if (g.value) merged = g.value;
    const l = decideHook(merged, LEAN_COMMITS_HOOK_CODEX, lean, glanceHookCommand(path.join(hooksDir, 'lean-commits.mjs'), ''));
    leanCommits = l.result;
    if (l.value) merged = l.value;
    if (merged !== existing) writeJsonFile(paths.hooksFile, merged);
  }

  const manifest: CodexManifest = {
    version: getPackageVersion(),
    installedAt: new Date().toISOString(),
    powerLevel,
    tasksDir,
    skills: installedSkills,
    agents: installedAgents,
    procedures: procedureFiles,
    leanCommits: leanOn,
  };
  fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');

  return {
    skills: installedSkills.length,
    agents: installedAgents.length,
    removed,
    skipped,
    hookRegistered,
    glanceHook,
    leanCommits,
    leanCommitsGlobal,
    paths,
  };
}
