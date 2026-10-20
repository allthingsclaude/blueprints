import fs from 'fs';
import path from 'path';
import os from 'os';
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
}

export interface InstallResult {
  commands: number;
  agents: number;
  workflows: number;
  /** Files from a previous blueprints install that are no longer shipped and were removed */
  removed: number;
  paths: InstallPaths;
  powerLevel: AgentPowerLevel;
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
    vars['{{BLUEPRINTS_DIR}}'] = blueprintsDir;
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

export function replaceTemplateVars(content: string, tasksDir?: string, blueprintsDir?: string): string {
  const vars = tasksDir || blueprintsDir ? buildTemplateVars(tasksDir, blueprintsDir) : TEMPLATE_VARS;
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
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
}

export interface Manifest {
  version: string;
  installedAt: string;
  powerLevel: AgentPowerLevel;
  tasksDir?: string;
  files?: InstalledFiles;
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
export function copyDirectory(srcDir: string, destDir: string, tasksDir?: string, blueprintsDir?: string): number {
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
      const updated = selectToolBlocks(replaceTemplateVars(content, tasksDir, blueprintsDir), 'claude');
      fs.writeFileSync(destFile, updated, 'utf-8');
      copiedCount++;
    } else if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    } else if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copiedCount += copyDirectory(srcFile, path.join(destDir, file), tasksDir, blueprintsDir);
    }
  }

  return copiedCount;
}

/**
 * Copy script files (workflows, hooks) with template variables replaced.
 * Shell scripts are made executable.
 */
export function copyTemplatedFiles(srcDir: string, destDir: string, tasksDir?: string, blueprintsDir?: string): number {
  if (!fs.existsSync(srcDir)) return 0;
  ensureDir(destDir);

  let copiedCount = 0;
  for (const rel of listFiles(srcDir)) {
    const srcFile = path.join(srcDir, rel);
    const destFile = path.join(destDir, rel);
    ensureDir(path.dirname(destFile));

    const content = fs.readFileSync(srcFile, 'utf-8');
    fs.writeFileSync(destFile, replaceTemplateVars(content, tasksDir, blueprintsDir), 'utf-8');
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
export function copyAgentsWithPowerLevel(srcDir: string, destDir: string, powerLevel: AgentPowerLevel, tasksDir?: string, blueprintsDir?: string): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    if (isHidden(file)) continue;
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copiedCount += copyAgentsWithPowerLevel(srcFile, path.join(destDir, file), powerLevel, tasksDir, blueprintsDir);
    } else if (stat.isFile() && file.endsWith('.md')) {
      const content = fs.readFileSync(srcFile, 'utf-8');
      const model = getModelForAgent(file, powerLevel);
      let updated = content.replace(/^(model:\s*).+$/m, `$1${model}`);
      updated = selectToolBlocks(replaceTemplateVars(updated, tasksDir, blueprintsDir), 'claude');
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
export async function installBlueprints(targetPath: string, powerLevel: AgentPowerLevel = 3, tasksDir: string = DEFAULT_TASKS_DIR): Promise<InstallResult> {
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
  const previous = readManifest(installPaths.base)?.files ?? null;
  const hooksDest = path.join(installPaths.support, 'hooks');
  let removed = 0;
  removed += cleanStaleFiles(sourcePaths.commands, installPaths.commands, previous ? previous.commands ?? [] : null, LEGACY_COMMANDS);
  removed += cleanStaleFiles(sourcePaths.agents, installPaths.agents, previous ? previous.agents ?? [] : null, LEGACY_AGENTS);
  removed += cleanStaleFiles(sourcePaths.workflows, installPaths.workflows, previous?.workflows ?? []);
  removed += cleanStaleFiles(sourcePaths.hooks, hooksDest, previous?.hooks ?? []);

  const blueprintsDir = installPaths.support;

  // Copy commands
  const commandsCount = copyDirectory(sourcePaths.commands, installPaths.commands, tasksDir, blueprintsDir);

  // Copy agents with power level model overrides
  const agentsCount = copyAgentsWithPowerLevel(sourcePaths.agents, installPaths.agents, powerLevel, tasksDir, blueprintsDir);

  // Copy workflows and hook scripts
  const workflowsCount = copyTemplatedFiles(sourcePaths.workflows, installPaths.workflows, tasksDir, blueprintsDir);
  copyTemplatedFiles(sourcePaths.hooks, hooksDest, tasksDir, blueprintsDir);

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
    },
  };
  fs.writeFileSync(path.join(installPaths.base, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    commands: commandsCount,
    agents: agentsCount,
    workflows: workflowsCount,
    removed,
    paths: installPaths,
    powerLevel
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
