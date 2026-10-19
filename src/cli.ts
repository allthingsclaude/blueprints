#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { installBlueprints, getDefaultClaudeDir, getInstallPaths, getSourcePaths, POWER_LEVEL_LABELS, DEFAULT_TASKS_DIR } from './installer.js';
import type { AgentPowerLevel } from './installer.js';
import { getCodexPaths, installCodex } from './codex.js';
import type { CodexScope } from './codex.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description: string };

interface CLIOptions {
  global?: boolean;
  local?: boolean;
  path?: string;
  yes?: boolean;
  power?: string;
  tasksDir?: string;
  target?: string;
}

type InstallType = 'global' | 'local' | 'custom';
type Target = 'claude' | 'codex' | 'both';

const TARGETS: Target[] = ['claude', 'codex', 'both'];

program
  .name('blueprints')
  .description(pkg.description)
  .version(pkg.version)
  .option('-t, --target <target>', 'Install for: claude (default), codex, or both')
  .option('-g, --global', 'Install to your user directory (~/.claude, or ~/.codex + ~/.agents for Codex)')
  .option('-l, --local', 'Install to the current project (./.claude, or ./.codex + ./.agents for Codex)')
  .option('-p, --path <path>', 'Install to a custom path')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--power <level>', 'Agent power level 1-5 (default: 4)')
  .option('--tasks-dir <name>', `Tasks directory name (default: ${DEFAULT_TASKS_DIR})`)
  .parse(process.argv);

const options = program.opts<CLIOptions>();

/** Project root for a Codex install at a custom path (tolerates a path ending in .claude or .codex) */
function codexRootFor(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const base = path.basename(resolved);
  return base === '.claude' || base === '.codex' ? path.dirname(resolved) : resolved;
}

async function main(): Promise<void> {
  console.log();
  console.log(chalk.bold.cyan('  Blueprints'));
  console.log(chalk.dim('  Commands and agents for Claude Code and Codex'));
  console.log();

  // Determine target tool(s)
  let target: Target;
  if (options.target) {
    const requested = options.target.toLowerCase() as Target;
    if (!TARGETS.includes(requested)) {
      console.error(chalk.red('Error: --target must be claude, codex, or both'));
      process.exit(1);
    }
    target = requested;
  } else if (options.yes || options.global || options.local || options.path) {
    target = 'claude';
  } else {
    const targetAnswer = await inquirer.prompt<{ target: Target }>([
      {
        type: 'list',
        name: 'target',
        message: 'Install for which tool?',
        choices: [
          { name: 'Claude Code', value: 'claude', short: 'Claude Code' },
          { name: 'Codex', value: 'codex', short: 'Codex' },
          { name: 'Both', value: 'both', short: 'Both' },
        ],
        default: 0
      }
    ]);
    target = targetAnswer.target;
  }
  const forClaude = target === 'claude' || target === 'both';
  const forCodex = target === 'codex' || target === 'both';

  let targetPath: string;
  let installType: InstallType;

  // Determine installation path
  if (options.path) {
    targetPath = options.path;
    installType = 'custom';
  } else if (options.global) {
    targetPath = getDefaultClaudeDir();
    installType = 'global';
  } else if (options.local) {
    targetPath = process.cwd();
    installType = 'local';
  } else {
    // Interactive mode
    const globalLabel = [
      forClaude ? getDefaultClaudeDir() : null,
      forCodex ? `${getCodexPaths('global', process.cwd()).codexHome} + ${getCodexPaths('global', process.cwd()).skills}` : null,
    ].filter(Boolean).join(', ');

    const answer = await inquirer.prompt<{ location: InstallType }>([
      {
        type: 'list',
        name: 'location',
        message: 'Where would you like to install the blueprints?',
        choices: [
          {
            name: `Global — all your projects (${globalLabel})`,
            value: 'global',
            short: 'Global'
          },
          {
            name: `Current project (${process.cwd()})`,
            value: 'local',
            short: 'Local'
          },
          {
            name: 'Custom path...',
            value: 'custom',
            short: 'Custom'
          }
        ]
      }
    ]);

    installType = answer.location;

    if (installType === 'global') {
      targetPath = getDefaultClaudeDir();
    } else if (installType === 'local') {
      targetPath = process.cwd();
    } else {
      const customAnswer = await inquirer.prompt<{ customPath: string }>([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter the installation path:',
          validate: (input: string) => input.trim().length > 0 || 'Please enter a valid path'
        }
      ]);
      targetPath = customAnswer.customPath;
    }
  }

  const codexScope: CodexScope = installType === 'global' ? 'global' : 'project';
  const codexRoot = installType === 'global' ? process.cwd() : codexRootFor(targetPath);

  // Determine power level
  let powerLevel: AgentPowerLevel;

  if (options.power) {
    const parsed = parseInt(options.power, 10);
    if (parsed < 1 || parsed > 5 || isNaN(parsed)) {
      console.error(chalk.red('Error: --power must be between 1 and 5'));
      process.exit(1);
    }
    powerLevel = parsed as AgentPowerLevel;
  } else if (options.yes) {
    powerLevel = 4;
  } else {
    const codexNote = forCodex ? chalk.dim(' (Codex: sets reasoning effort low/medium/high instead of models)') : '';
    const powerAnswer = await inquirer.prompt<{ power: AgentPowerLevel }>([
      {
        type: 'list',
        name: 'power',
        message: `Select agent power level:${codexNote}`,
        choices: [
          { name: '1 - Economy     (haiku + sonnet heavyweight — fastest, lowest cost)', value: 1 },
          { name: '2 - Balanced    (haiku light, sonnet everything else)', value: 2 },
          { name: '3 - Standard    (all sonnet)', value: 3 },
          { name: '4 - Enhanced    (sonnet light + research, opus everything else — recommended)', value: 4 },
          { name: '5 - Maximum     (all opus — most capable, highest cost)', value: 5 },
        ],
        default: 3 // 0-indexed, so index 3 = value 4
      }
    ]);
    powerLevel = powerAnswer.power;
  }

  // Determine tasks directory name
  let tasksDir: string;

  if (options.tasksDir) {
    tasksDir = options.tasksDir;
  } else if (options.yes) {
    tasksDir = DEFAULT_TASKS_DIR;
  } else {
    const tasksDirAnswer = await inquirer.prompt<{ tasksDir: string }>([
      {
        type: 'input',
        name: 'tasksDir',
        message: 'Tasks directory name (for plans, handoffs, state):',
        default: DEFAULT_TASKS_DIR,
        validate: (input: string) => {
          if (!input.trim()) return 'Please enter a directory name';
          if (/[<>:"|?*]/.test(input)) return 'Invalid characters in directory name';
          return true;
        }
      }
    ]);
    tasksDir = tasksDirAnswer.tasksDir;
  }

  // Show what will be installed
  const sourcePaths = getSourcePaths();
  const commandCount = fs.readdirSync(sourcePaths.commands).filter(f => f.endsWith('.md')).length;
  const agentCount = fs.readdirSync(sourcePaths.agents).filter(f => f.endsWith('.md')).length;
  const workflowCount = fs.existsSync(sourcePaths.workflows)
    ? fs.readdirSync(sourcePaths.workflows).filter(f => f.endsWith('.js')).length
    : 0;

  console.log();
  console.log(chalk.yellow('Installation Summary:'));
  console.log(chalk.dim('─'.repeat(50)));
  if (forClaude) {
    const paths = getInstallPaths(targetPath);
    console.log(chalk.bold('  Claude Code'));
    console.log(`  ${chalk.bold('Commands:')}    ${commandCount} files → ${chalk.cyan(paths.commands)}`);
    console.log(`  ${chalk.bold('Agents:')}      ${agentCount} files → ${chalk.cyan(paths.agents)}`);
    console.log(`  ${chalk.bold('Workflows:')}   ${workflowCount} files → ${chalk.cyan(paths.workflows)}`);
  }
  if (forCodex) {
    const codexPaths = getCodexPaths(codexScope, codexRoot);
    console.log(chalk.bold('  Codex'));
    console.log(`  ${chalk.bold('Skills:')}      ${commandCount} skills → ${chalk.cyan(codexPaths.skills)}`);
    console.log(`  ${chalk.bold('Agents:')}      ${agentCount} files → ${chalk.cyan(codexPaths.agents)}`);
    console.log(`  ${chalk.bold('Hook:')}        typecheck gate → ${chalk.cyan(codexPaths.hooksFile)}`);
  }
  console.log(`  ${chalk.bold('Power Level:')} ${chalk.magenta(`${powerLevel} - ${POWER_LEVEL_LABELS[powerLevel]}`)}`);
  console.log(`  ${chalk.bold('Tasks Dir:')}   ${chalk.cyan(`${tasksDir}/`)}`);
  console.log(chalk.dim('─'.repeat(50)));
  console.log();

  // Confirm installation unless --yes flag is provided
  if (!options.yes) {
    const confirm = await inquirer.prompt<{ proceed: boolean }>([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with installation?',
        default: true
      }
    ]);

    if (!confirm.proceed) {
      console.log(chalk.yellow('Installation cancelled.'));
      process.exit(0);
    }
  }

  // Perform installation
  const spinner = ora('Installing blueprints...').start();

  try {
    const claudeResult = forClaude ? await installBlueprints(targetPath, powerLevel, tasksDir) : null;
    const codexResult = forCodex ? await installCodex(codexScope, codexRoot, powerLevel, tasksDir) : null;
    spinner.succeed(chalk.green('Installation complete!'));

    console.log();
    console.log(chalk.dim('─'.repeat(50)));
    if (claudeResult) {
      console.log(chalk.bold('  Claude Code'));
      console.log(`  ${chalk.green('✓')} ${claudeResult.commands} commands installed`);
      console.log(`  ${chalk.green('✓')} ${claudeResult.agents} agents installed`);
      console.log(`  ${chalk.green('✓')} ${claudeResult.workflows} workflows installed`);
      if (claudeResult.removed > 0) {
        console.log(`  ${chalk.green('✓')} ${claudeResult.removed} outdated blueprints files removed (your own files are never touched)`);
      }
    }
    if (codexResult) {
      console.log(chalk.bold('  Codex'));
      console.log(`  ${chalk.green('✓')} ${codexResult.skills} skills installed`);
      console.log(`  ${chalk.green('✓')} ${codexResult.agents} agents installed`);
      if (codexResult.hookRegistered) {
        console.log(`  ${chalk.green('✓')} typecheck gate added to ${codexResult.paths.hooksFile}`);
      }
      if (codexResult.removed > 0) {
        console.log(`  ${chalk.green('✓')} ${codexResult.removed} outdated blueprints files removed`);
      }
      if (codexResult.skipped.length > 0) {
        console.log(`  ${chalk.yellow('!')} Skipped (you already have your own): ${codexResult.skipped.join(', ')}`);
      }
    }
    console.log(chalk.dim('─'.repeat(50)));
    console.log();

    // Show next steps
    console.log(chalk.bold('Next steps:'));
    console.log();

    if (claudeResult) {
      const where = installType === 'global' ? 'in any project' : `in ${chalk.cyan(targetPath)}`;
      console.log(`  ${chalk.cyan('Claude Code:')} open Claude Code ${where} and type ${chalk.yellow('/autopilot')} or ${chalk.yellow('/blueprint')}`);
    }
    if (codexResult) {
      const where = installType === 'global' ? 'in any project' : `in ${chalk.cyan(codexRoot)}`;
      console.log(`  ${chalk.cyan('Codex:')}       open Codex ${where} and type ${chalk.yellow('$autopilot')} or ${chalk.yellow('$blueprint')} (skills start with $)`);
      if (codexResult.hookRegistered) {
        console.log(`               run ${chalk.yellow('/hooks')} in Codex once to review and trust the blueprints typecheck gate`);
      }
      console.log(chalk.dim(`               Optional: for parallel streams in $parallelize, add "[agents]" with "max_depth = 2" to ${path.join(codexResult.paths.codexHome, 'config.toml')}`));
    }

    console.log();
    console.log(chalk.dim('Popular: autopilot, blueprint, kickoff, implement, audit, diagnose, research,'));
    console.log(chalk.dim('brainstorm, validate, commit. Type / (Claude Code) or $ (Codex) to see them all.'));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Installation failed'));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(chalk.red(`Unexpected error: ${errorMessage}`));
  process.exit(1);
});
