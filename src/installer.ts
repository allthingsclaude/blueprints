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
export function copyDirectory(srcDir: string, destDir: string): number {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  let copiedCount = 0;

  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    const stat = fs.statSync(srcFile);

    if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copiedCount++;
    } else if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copiedCount += copyDirectory(srcFile, path.join(destDir, file));
    }
  }

  return copiedCount;
}

/**
 * Install blueprints to the target path
 */
export async function installBlueprints(targetPath: string): Promise<InstallResult> {
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

  // Copy commands
  const commandsCount = copyDirectory(sourcePaths.commands, installPaths.commands);

  // Copy agents
  const agentsCount = copyDirectory(sourcePaths.agents, installPaths.agents);

  return {
    commands: commandsCount,
    agents: agentsCount,
    paths: installPaths
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
