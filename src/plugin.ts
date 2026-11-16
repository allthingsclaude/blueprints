/**
 * Builds the Claude plugin version of blueprints (the `plugin/` folder), for the Claude
 * plugin directory and `/plugin install`. It is the same content the installer copies,
 * with its choices fixed: tasks in `tasks/`, power level 4, full commit messages, and
 * the optional glance and lean-commits hooks left out (a plugin's hooks are always on).
 *
 * Inside a plugin every agent and workflow is named `blueprints:<name>`, so references
 * to them are qualified, and paths into the support files go through ${CLAUDE_PLUGIN_ROOT}.
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

/** Hand-written plugin files (README) that the build copies as they are */
const PLUGIN_SOURCE = path.join(PACKAGE_ROOT, 'content', 'plugin');

/** The phase gate the implement agent sets in its own frontmatter, which a plugin agent can't: it moves to hooks.json */
export const PLUGIN_HOOKS = {
  hooks: {
    SubagentStop: [
      {
        matcher: `^${PLUGIN_NAME}:implement$`,
        hooks: [{ type: 'command', command: `sh "${PLUGIN_ROOT}/hooks/phase-gate.sh"`, timeout: 600 }],
      },
    ],
  },
};

/** Hook scripts the plugin ships: only what hooks.json runs */
const PLUGIN_HOOK_SCRIPTS = ['phase-gate.sh'];

export function pluginManifest(version = getPackageVersion()) {
  return {
    name: PLUGIN_NAME,
    version,
    description: 'Plan, build, review and ship with Claude Code: commands, agents and workflows for planning, autonomous implementation, code review, research and on-brand design',
    author: { name: 'Marko Radak', url: 'https://github.com/markoradak' },
    homepage: 'https://github.com/allthingsclaude/blueprints#readme',
    repository: 'https://github.com/allthingsclaude/blueprints',
    license: 'MIT',
    keywords: ['planning', 'implementation', 'code-review', 'agents', 'workflows', 'autopilot', 'design'],
  };
}

/** Agent names that ship, without `.md` */
function agentNames(agentsDir: string): string[] {
  return fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
}

/** Qualify agent and saved-workflow names in prompt text: `subagent_type: "implement"` → `"blueprints:implement"` */
export function qualifyMarkdown(content: string, agents: string[], workflows: string[]): string {
  const agentAlt = agents.join('|');
  const workflowAlt = workflows.join('|');
  return content
    .replace(new RegExp(`(subagent_type:\\s*["'\`]?)(${agentAlt})\\b`, 'g'), `$1${PLUGIN_NAME}:$2`)
    .replace(new RegExp(`(saved workflow \\*\\*\`)(${workflowAlt})(\`\\*\\*)`, 'g'), `$1${PLUGIN_NAME}:$2$3`);
}

/** A plugin agent ignores `hooks` in its frontmatter: drop it (hooks.json carries the phase gate instead) */
export function stripAgentHooks(content: string): string {
  return content.replace(/^hooks:\r?\n(?:[ \t]+.*\r?\n)+/m, '');
}

/**
 * Route a workflow's agent() calls through one that qualifies `agentType`, so 'implement'
 * runs `blueprints:implement`. A function declaration is hoisted, so it can go at the end.
 */
export function qualifyWorkflow(source: string): string {
  const body = source.replace(/(^|[^\w.])agent\(/g, '$1pluginAgent(');
  return `${body.replace(/\s*$/, '\n')}
// Added by the plugin build: inside a plugin, blueprints' agents are named ${PLUGIN_NAME}:<name>
function pluginAgent(prompt, opts) {
  if (opts && typeof opts.agentType === 'string' && !opts.agentType.includes(':')) {
    opts = { ...opts, agentType: '${PLUGIN_NAME}:' + opts.agentType }
  }
  return agent(prompt, opts)
}
`;
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
  workflows: number;
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
  const workflows = listFiles(src.workflows).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
  const qualify = (text: string) => qualifyMarkdown(text, agents, workflows);

  const commandsDir = path.join(outDir, 'commands');
  const agentsDir = path.join(outDir, 'agents');
  const workflowsDir = path.join(outDir, 'workflows');
  const proceduresDir = path.join(outDir, 'procedures');
  const hooksDir = path.join(outDir, 'hooks');

  const commands = copyDirectory(src.commands, commandsDir, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(commandsDir, '.md', qualify);

  const agentCount = copyAgentsWithPowerLevel(src.agents, agentsDir, PLUGIN_POWER_LEVEL, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(agentsDir, '.md', text => qualify(stripAgentHooks(text)));

  const workflowCount = copyTemplatedFiles(src.workflows, workflowsDir, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(workflowsDir, '.js', qualifyWorkflow);

  copyTemplatedFiles(src.procedures, proceduresDir, tasksDir, PLUGIN_ROOT, content);
  rewriteFiles(proceduresDir, '.md', qualify);

  ensureDir(hooksDir);
  for (const script of PLUGIN_HOOK_SCRIPTS) {
    const dest = path.join(hooksDir, script);
    fs.copyFileSync(path.join(src.hooks, script), dest);
    fs.chmodSync(dest, 0o755);
  }
  fs.writeFileSync(path.join(hooksDir, 'hooks.json'), JSON.stringify(PLUGIN_HOOKS, null, 2) + '\n', 'utf-8');

  ensureDir(path.join(outDir, '.claude-plugin'));
  fs.writeFileSync(path.join(outDir, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginManifest(version), null, 2) + '\n', 'utf-8');

  for (const file of listFiles(PLUGIN_SOURCE)) {
    ensureDir(path.dirname(path.join(outDir, file)));
    fs.copyFileSync(path.join(PLUGIN_SOURCE, file), path.join(outDir, file));
  }
  fs.copyFileSync(path.join(PACKAGE_ROOT, 'LICENSE'), path.join(outDir, 'LICENSE'));

  return { commands, agents: agentCount, workflows: workflowCount, files: listFiles(outDir, '', true).length };
}

// `node dist/plugin.js` builds plugin/
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildPlugin();
  console.log(`Built ${path.relative(process.cwd(), PLUGIN_DIR) || '.'}: ${result.commands} commands, ${result.agents} agents, ${result.workflows} workflows, ${result.files} files`);
}
