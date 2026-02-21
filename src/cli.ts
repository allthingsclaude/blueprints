#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { installBlueprints, getDefaultClaudeDir, getInstallPaths, getSourcePaths, POWER_LEVEL_LABELS, DEFAULT_TASKS_DIR } from './installer.js';
import type { AgentPowerLevel } from './installer.js';
import fs from 'fs';
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
}

type InstallType = 'global' | 'local' | 'custom';

program
  .name('blueprints')
  .description(pkg.description)
  .version(pkg.version)
  .option('-g, --global', 'Install to default Claude directory (~/.claude)')
  .option('-l, --local', 'Install to current directory (./.claude)')
  .option('-p, --path <path>', 'Install to a custom path')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--power <level>', 'Agent power level 1-5 (default: 4)')
  .option('--tasks-dir <name>', `Tasks directory name (default: ${DEFAULT_TASKS_DIR})`)
  .parse(process.argv);

const options = program.opts<CLIOptions>();

async function main(): Promise<void> {
  console.log();
  console.log(chalk.bold.cyan('  Claude Code Blueprints'));
  console.log(chalk.dim('  Install commands and agents for enhanced AI-assisted development'));
  console.log();

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
    const answer = await inquirer.prompt<{ location: InstallType }>([
      {
        type: 'list',
        name: 'location',
        message: 'Where would you like to install the blueprints?',
        choices: [
          {
            name: `Global Claude directory (${getDefaultClaudeDir()})`,
            value: 'global',
            short: 'Global'
          },
          {
            name: `Current directory (${process.cwd()})`,
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
    const powerAnswer = await inquirer.prompt<{ power: AgentPowerLevel }>([
      {
        type: 'list',
        name: 'power',
        message: 'Select agent power level:',
        choices: [
          { name: '1 - Economy     (haiku + sonnet heavyweight — fastest, lowest cost)', value: 1 },
          { name: '2 - Balanced    (haiku light, sonnet everything else)', value: 2 },
          { name: '3 - Standard    (all sonnet)', value: 3 },
          { name: '4 - Enhanced    (sonnet light, opus everything else — recommended)', value: 4 },
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
  const paths = getInstallPaths(targetPath);
  const sourcePaths = getSourcePaths();
  const commandCount = fs.readdirSync(sourcePaths.commands).filter(f => f.endsWith('.md')).length;
  const agentCount = fs.readdirSync(sourcePaths.agents).filter(f => f.endsWith('.md')).length;

  console.log();
  console.log(chalk.yellow('Installation Summary:'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  ${chalk.bold('Commands:')}    ${commandCount} files → ${chalk.cyan(paths.commands)}`);
  console.log(`  ${chalk.bold('Agents:')}      ${agentCount} files → ${chalk.cyan(paths.agents)}`);
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
    const result = await installBlueprints(targetPath, powerLevel, tasksDir);
    spinner.succeed(chalk.green('Installation complete!'));

    console.log();
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`  ${chalk.green('✓')} ${result.commands} commands installed`);
    console.log(`  ${chalk.green('✓')} ${result.agents} agents installed`);
    console.log(chalk.dim('─'.repeat(50)));
    console.log();

    // Show next steps
    console.log(chalk.bold('Next steps:'));
    console.log();

    if (installType === 'global') {
      console.log(`  ${chalk.cyan('1.')} Open Claude Code in any project`);
      console.log(`  ${chalk.cyan('2.')} Type ${chalk.yellow('/plan')} to start planning, ${chalk.yellow('/research')} to research, etc.`);
    } else {
      console.log(`  ${chalk.cyan('1.')} Navigate to ${chalk.cyan(targetPath)}`);
      console.log(`  ${chalk.cyan('2.')} Open Claude Code: ${chalk.yellow('claude')}`);
      console.log(`  ${chalk.cyan('3.')} Type ${chalk.yellow('/plan')} to start planning, ${chalk.yellow('/research')} to research, etc.`);
    }

    console.log();
    console.log(chalk.dim('Available commands: /audit, /auto, /bootstrap, /brainstorm, /challenge,'));
    console.log(chalk.dim('/cleanup, /critique, /debug, /dry, /explain, /finalize, /flush, /handoff,'));
    console.log(chalk.dim('/imagine, /implement, /kickoff, /parallelize, /pickup, /plan, /refactor,'));
    console.log(chalk.dim('/research, /storyboard, /test, /verify'));
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
