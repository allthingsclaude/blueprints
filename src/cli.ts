#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { installBlueprints, getDefaultClaudeDir, getInstallPaths } from './installer.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string; description: string };

interface CLIOptions {
  global?: boolean;
  local?: boolean;
  path?: string;
  yes?: boolean;
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

  // Show what will be installed
  const paths = getInstallPaths(targetPath);

  console.log();
  console.log(chalk.yellow('Installation Summary:'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(`  ${chalk.bold('Commands:')} 21 files → ${chalk.cyan(paths.commands)}`);
  console.log(`  ${chalk.bold('Agents:')}   11 files → ${chalk.cyan(paths.agents)}`);
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
    const result = await installBlueprints(targetPath);
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
    console.log(chalk.dim('Available commands: /audit, /bootstrap, /brainstorm, /challenge, /cleanup,'));
    console.log(chalk.dim('/critique, /debug, /explain, /finalize, /flush, /handoff, /implement,'));
    console.log(chalk.dim('/kickoff, /parallelize, /pickup, /plan, /refactor, /research, /storyboard,'));
    console.log(chalk.dim('/test, /verify'));
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
