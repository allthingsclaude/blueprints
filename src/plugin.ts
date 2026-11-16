/**
 * Builds the Claude plugin version of blueprints (the `plugin/` folder), for the Claude
 * plugin directory and `/plugin install`. It is the same content the installer copies,
 * with its choices fixed: tasks in `tasks/`, power level 4, full commit messages.
 *
 * It's the lite version. The directory accepts command hooks, inline shell in commands,
 * workflow scripts and other non-Markdown files only from Verified organizations, so the
 * plugin ships none of them:
 * - no hooks: no typecheck gate, glance or lean commits
 * - no workflows: preflight, sweep and streams run as their parallel-subagent and
 *   single-agent fallbacks (the same text a Codex install gets)
 * - each `!`cmd`` context line becomes a "run `cmd`" step Claude takes first
 * The npm installer keeps all of it.
 *
 * Inside a plugin every agent is named `blueprints:<name>`, so references to them are
 * qualified, and paths into the support files go through ${CLAUDE_PLUGIN_ROOT}.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  copyAgentsWithPowerLevel,
  copyDirectory,
  copyTemplatedFiles,
  DEFAULT_TASKS_DIR,
  ensureDir,
  getPackageVersion,
  getSourcePaths,
  listFiles,
  type AgentPowerLevel,
} from './installer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PLUGIN_NAME = 'blueprints';
export const PLUGIN_POWER_LEVEL: AgentPowerLevel = 4;
const PLUGIN_ROOT = '${CLAUDE_PLUGIN_ROOT}';
const PACKAGE_ROOT = path.join(__dirname, '..');

/** Where the committed plugin lives in this repository */
export const PLUGIN_DIR = path.join(PACKAGE_ROOT, 'plugin');

/** Hand-written plugin files (README, icon) that the build copies as they are */
const PLUGIN_SOURCE = path.join(PACKAGE_ROOT, 'content', 'plugin');

export function pluginManifest(version = getPackageVersion()) {
  return {
    name: PLUGIN_NAME,
    version,
    description: 'Plan, build, review and ship with Claude Code: commands and agents for planning, autonomous implementation, code review, research and on-brand design',
    author: { name: 'Marko Radak', url: 'https://github.com/markoradak' },
    homepage: 'https://github.com/allthingsclaude/blueprints#readme',
    repository: 'https://github.com/allthingsclaude/blueprints',
    documentationUrl: 'https://github.com/allthingsclaude/blueprints/blob/main/plugin/README.md',
    supportUrl: 'https://github.com/allthingsclaude/blueprints/issues',
    license: 'MIT',
    keywords: ['planning', 'implementation', 'code-review', 'agents', 'autopilot', 'design'],
  };
}

/** Agent names that ship, without `.md` */
function agentNames(agentsDir: string): string[] {
  return fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
}

/** Qualify agent names in prompt text: `subagent_type: "implement"` → `"blueprints:implement"` */
export function qualifyMarkdown(content: string, agents: string[]): string {
  return content.replace(new RegExp(`(subagent_type:\\s*["'\`]?)(${agents.join('|')})\\b`, 'g'), `$1${PLUGIN_NAME}:$2`);
}

/** A plugin agent ignores `hooks` in its frontmatter, and the plugin ships no hook scripts: drop it */
export function stripAgentHooks(content: string): string {
  return content.replace(/^hooks:\r?\n(?:[ \t]+.*\r?\n)+/m, '');
}

/**
 * Take out the paths that run a saved workflow, since the plugin ships none, leaving the
 * agent paths each command already has for when workflows aren't available:
 * - a section headed "… Workflow (preferred)", up to the next heading of the same level
 * - a paragraph that runs a saved workflow ("Otherwise, …" in it is kept), and the
 *   "If the workflow isn't available …" paragraph after it
 * - "Fallback (no Workflow tool …)" in a heading
 */
export function withoutWorkflows(text: string): string {
  let out = text.replace(/^(#{2,6}) [^\n]*Workflow \(preferred\)\n[\s\S]*?(?=^\1 )/gm, '');
  out = out.replace(/Fallback \(no Workflow tool[^)\n]*\)/g, 'Review in parallel');
  const paragraphs = out.split(/\n{2,}/);
  const kept: string[] = [];
  for (const p of paragraphs) {
    if (/saved workflow/.test(p)) {
      const otherwise = p.match(/\bOtherwise, (\S)([\s\S]*)$/);
      if (otherwise) kept.push(otherwise[1].toUpperCase() + otherwise[2]);
      continue;
    }
    if (/^If the workflow isn't available/.test(p)) continue;
    kept.push(p);
  }
  return kept.join('\n\n');
}

/** The note a command with context steps starts with */
export const CONTEXT_STEPS_NOTE =
  '> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.';

/**
 * Inline shell (`!`cmd``) runs before Claude sees a command; the directory accepts it only
 * from Verified organizations. Each becomes a step Claude runs itself, as in a Codex install.
 */
export function inlineShellToSteps(text: string): string {
  if (!/!`[^`]+`/.test(text)) return text;
  const body = text.replace(/!`([^`]+)`/g, 'run `$1`');
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return fm ? `${fm[0]}\n${CONTEXT_STEPS_NOTE}\n${body.slice(fm[0].length)}` : `${CONTEXT_STEPS_NOTE}\n\n${body}`;
}

function rewriteFiles(dir: string, ext: string, fn: (content: string) => string): void {
  for (const rel of listFiles(dir)) {
    if (!rel.endsWith(ext)) continue;
    const file = path.join(dir, rel);
    fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf-8')), 'utf-8');
  }
}

export interface PluginBuildResult {
  commands: number;
  agents: number;
  files: number;
}

/** Build the plugin into outDir, replacing what a previous build left there */
export function buildPlugin(outDir: string = PLUGIN_DIR, version = getPackageVersion()): PluginBuildResult {
  const src = getSourcePaths();
  // Only ever clear a folder this build made (or an empty one)
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length) {
    const manifest = path.join(outDir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifest) || JSON.parse(fs.readFileSync(manifest, 'utf-8')).name !== PLUGIN_NAME) {
      throw new Error(`${outDir} isn't a blueprints plugin build; not replacing it`);
    }
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  ensureDir(outDir);

  const tasksDir = DEFAULT_TASKS_DIR;
  const content = { leanCommits: false };
  const agents = agentNames(src.agents);
  const prompt = (text: string) => qualifyMarkdown(withoutWorkflows(text), agents);

  const commandsDir = path.join(outDir, 'commands');
  const agentsDir = path.join(outDir, 'agents');
  const proceduresDir = path.join(outDir, 'procedures');

  const commands = copyDirectory(src.commands, commandsDir, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(commandsDir, '.md', text => inlineShellToSteps(prompt(text)));

  const agentCount = copyAgentsWithPowerLevel(src.agents, agentsDir, PLUGIN_POWER_LEVEL, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(agentsDir, '.md', text => prompt(stripAgentHooks(text)));

  copyTemplatedFiles(src.procedures, proceduresDir, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(proceduresDir, '.md', text => inlineShellToSteps(prompt(text)));

  ensureDir(path.join(outDir, '.claude-plugin'));
  fs.writeFileSync(path.join(outDir, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginManifest(version), null, 2) + '\n', 'utf-8');

  for (const file of listFiles(PLUGIN_SOURCE, '', true)) {
    ensureDir(path.dirname(path.join(outDir, file)));
    fs.copyFileSync(path.join(PLUGIN_SOURCE, file), path.join(outDir, file));
  }
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'LICENSE'), path.join(outDir, 'LICENSE'));

  return { commands, agents: agentCount, files: listFiles(outDir, '', true).length };
}

// `node dist/plugin.js` builds plugin/
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildPlugin();
  console.log(`Built ${path.relative(process.cwd(), PLUGIN_DIR) || '.'}: ${result.commands} commands, ${result.agents} agents, ${result.files} files`);
}
