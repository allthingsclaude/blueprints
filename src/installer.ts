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
}

export interface SourcePaths {
  commands: string;
  agents: string;
}

export interface InstallResult {
  commands: number;
  agents: number;
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

export const RESEARCH_AGENTS = [
  'research-codebase.md',
  'research-docs.md',
  'research-web.md',
];

export const DEFAULT_TASKS_DIR = 'tasks';

export function buildTemplateVars(tasksDir: string = DEFAULT_TASKS_DIR): Record<string, string> {
  return {
    '{{TASKS_DIR}}': tasksDir,
    '{{PLANS_DIR}}': `${tasksDir}/plans`,
    '{{SESSIONS_DIR}}': `${tasksDir}/sessions`,
    '{{STATE_FILE}}': `${tasksDir}/STATE.md`,
  };
}

export const TEMPLATE_VARS: Record<string, string> = buildTemplateVars();

export function replaceTemplateVars(content: string, tasksDir?: string): string {
  const vars = tasksDir ? buildTemplateVars(tasksDir) : TEMPLATE_VARS;
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
 * Get the installation paths for commands and agents
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
    agents: path.join(claudeDir, 'agents')
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
    agents: path.join(packageRoot, 'content', 'agents')
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
 * Copy all files from source to destination directory
 */
export function copyDirectory(srcDir: string, destDir: string, tasksDir?: string): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    const stat = fs.statSync(srcFile);

    if (stat.isFile() && file.endsWith('.md')) {
      const content = fs.readFileSync(srcFile, 'utf-8');
      const updated = replaceTemplateVars(content, tasksDir);
      fs.writeFileSync(destFile, updated, 'utf-8');
      copiedCount++;
    } else if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    } else if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copiedCount += copyDirectory(srcFile, path.join(destDir, file), tasksDir);
    }
  }

  return copiedCount;
}

/**
 * Get the model to use for a given agent file based on power level
 */
export function getModelForAgent(filename: string, powerLevel: AgentPowerLevel): 'haiku' | 'sonnet' | 'opus' {
  const isResearch = RESEARCH_AGENTS.includes(filename);

  const modelMap: Record<AgentPowerLevel, { research: 'haiku' | 'sonnet' | 'opus'; other: 'haiku' | 'sonnet' | 'opus' }> = {
    1: { research: 'haiku', other: 'haiku' },
    2: { research: 'haiku', other: 'sonnet' },
    3: { research: 'sonnet', other: 'sonnet' },
    4: { research: 'sonnet', other: 'opus' },
    5: { research: 'opus', other: 'opus' },
  };

  return isResearch ? modelMap[powerLevel].research : modelMap[powerLevel].other;
}

/**
 * Copy agent files with model rewritten based on power level
 */
export function copyAgentsWithPowerLevel(srcDir: string, destDir: string, powerLevel: AgentPowerLevel, tasksDir?: string): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copiedCount += copyAgentsWithPowerLevel(srcFile, path.join(destDir, file), powerLevel, tasksDir);
    } else if (stat.isFile() && file.endsWith('.md')) {
      const content = fs.readFileSync(srcFile, 'utf-8');
      const model = getModelForAgent(file, powerLevel);
      let updated = content.replace(/^(model:\s*).+$/m, `$1${model}`);
      updated = replaceTemplateVars(updated, tasksDir);
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
 * Remove files from a destination directory that no longer exist in the source
 */
export function cleanStaleFiles(srcDir: string, destDir: string): number {
  if (!fs.existsSync(destDir)) return 0;

  let removedCount = 0;
  const destFiles = fs.readdirSync(destDir);

  for (const file of destFiles) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    const destStat = fs.statSync(destFile);

    if (destStat.isDirectory()) {
      if (fs.existsSync(srcFile)) {
        removedCount += cleanStaleFiles(srcFile, destFile);
      } else {
        fs.rmSync(destFile, { recursive: true });
        removedCount++;
      }
    } else if (!fs.existsSync(srcFile)) {
      fs.unlinkSync(destFile);
      removedCount++;
    }
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

  // Clean stale files from previous installations
  cleanStaleFiles(sourcePaths.commands, installPaths.commands);
  cleanStaleFiles(sourcePaths.agents, installPaths.agents);

  // Copy commands
  const commandsCount = copyDirectory(sourcePaths.commands, installPaths.commands, tasksDir);

  // Copy agents with power level model overrides
  const agentsCount = copyAgentsWithPowerLevel(sourcePaths.agents, installPaths.agents, powerLevel, tasksDir);

  // Write version marker
  const version = getPackageVersion();
  fs.writeFileSync(
    path.join(installPaths.base, '.blueprints-version'),
    JSON.stringify({ version, installedAt: new Date().toISOString(), powerLevel }, null, 2),
    'utf-8'
  );

  return {
    commands: commandsCount,
    agents: agentsCount,
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
