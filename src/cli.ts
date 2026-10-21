#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  installBlueprints, getDefaultClaudeDir, getInstallPaths, getSourcePaths, claudeSettingsFile, glanceModel, hasAnyHook, readJsonFile,
  GLANCE_HOOK, GLANCE_MOD, userModsDir, LEAN_COMMITS_HOOK, LEAN_COMMITS_HOOK_CODEX, POWER_LEVEL_LABELS, POWER_LEVEL_MODELS, DEFAULT_TASKS_DIR,
} from './installer.js';
import type { AgentPowerLevel, HookChoice, HookResult, InstallOptions, OwnHook } from './installer.js';
import { getCodexPaths, installCodex, POWER_LEVEL_EFFORTS } from './codex.js';
import type { CodexScope } from './codex.js';
import fs from 'fs';
import os from 'os';
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
  glance?: string;
  leanCommits?: string;
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
  .option('--glance <on|off>', 'Glance hook: open /glance pages and make one for long replies (default: ask, or keep the current setting with --yes)')
  .option('--lean-commits <on|off>', 'One-line `type: description` commits with no co-author or session trailers (default: ask, or keep the current setting with --yes)')
  .parse(process.argv);

const options = program.opts<CLIOptions>();

/** Project root for a Codex install at a custom path (tolerates a path ending in .claude or .codex) */
function codexRootFor(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const base = path.basename(resolved);
  return base === '.claude' || base === '.codex' ? path.dirname(resolved) : resolved;
}

type HookKey = keyof InstallOptions & keyof CLIOptions;

/** The optional hooks, in the order the installer lists them (each a checkbox, off until ticked) */
const HOOK_OPTIONS: { key: HookKey; flag: string; name: string; description: string; claude: OwnHook[]; codex: OwnHook[] }[] = [
  { key: 'glance', flag: 'glance', name: 'Glance pages', description: 'visual pages of long replies', claude: [GLANCE_HOOK], codex: [GLANCE_HOOK] },
  { key: 'leanCommits', flag: 'lean-commits', name: 'Lean commits', description: 'one-line commits, no agent trailers', claude: [LEAN_COMMITS_HOOK], codex: [LEAN_COMMITS_HOOK_CODEX] },
];

// The summary and results keep to about 80 columns: one block per tool, a label column, short paths
const RULE = chalk.dim('─'.repeat(60));
const LABEL_WIDTH = 16;

/** A path under the home folder as ~/… */
function tilde(p: string): string {
  const home = os.homedir();
  const rel = path.relative(home, path.resolve(p));
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? `~${path.sep}${rel}` : path.resolve(p);
}

/** A path as short as it can be shown: ./… inside the current folder, else ~/… */
function shortPath(p: string): string {
  const cwd = process.cwd();
  const rel = path.relative(cwd, path.resolve(p));
  return cwd !== os.homedir() && rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? `.${path.sep}${rel}` : tilde(p);
}

/** A path to paste into a shell */
function shellPath(p: string): string {
  const short = tilde(p);
  return process.platform !== 'win32' && /^[\w~./-]+$/.test(short) ? short : `"${path.resolve(p)}"`;
}

/** A tool's block: its name, then a row per label */
function block(name: string): void {
  console.log(`  ${chalk.bold(name)}`);
}
function row(label: string, value: string): void {
  console.log(`    ${chalk.bold(label.padEnd(LABEL_WIDTH))}${value}`);
}
function done(text: string): void {
  console.log(`    ${chalk.green('✓')} ${text}`);
}
function warn(text: string, ...more: string[]): void {
  console.log(`    ${chalk.yellow('!')} ${text}`);
  for (const line of more) console.log(`      ${line}`);
}

/** Words joined into lines of at most `width` characters */
function wrapWords(words: string[], width = 70): string[] {
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.length ? lines[lines.length - 1] : undefined;
    if (last !== undefined && last.length + word.length + 1 <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function reportHook(name: string, result: HookResult, file: string): void {
  if (result === 'added') done(`${name} added to ${shortPath(file)}`);
  if (result === 'updated') done(`${name} updated in ${shortPath(file)}`);
  if (result === 'removed') done(`${name} removed from ${shortPath(file)}`);
  if (result === 'unreadable') warn(`${name} not changed: couldn't safely edit ${shortPath(file)}`, chalk.dim('(not valid JSON, or an unexpected shape)'));
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
      forClaude ? tilde(getDefaultClaudeDir()) : null,
      forCodex ? `${tilde(getCodexPaths('global', process.cwd()).codexHome)} + ${tilde(getCodexPaths('global', process.cwd()).skills)}` : null,
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
            name: `Current project (${tilde(process.cwd())})`,
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

  // Determine power level: Claude Code agents get a model per tier, Codex agents a reasoning effort
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
    const levels: AgentPowerLevel[] = [1, 2, 3, 4, 5];
    // In "both" mode the choices show the Claude tiers and a line under them the Codex mapping, so lines don't wrap
    const choiceText = (level: AgentPowerLevel): string => (target === 'codex' ? POWER_LEVEL_EFFORTS[level] : POWER_LEVEL_MODELS[level]);
    const codexNote = target === 'both' ? [new inquirer.Separator(chalk.dim('  Codex: haiku → low, sonnet → medium, opus → high reasoning effort'))] : [];
    const powerAnswer = await inquirer.prompt<{ power: AgentPowerLevel }>([
      {
        type: 'list',
        name: 'power',
        message: target === 'codex' ? 'Agent power level (reasoning effort; agents use your session\'s model):' : 'Agent power level:',
        choices: [
          ...levels.map(level => ({
            name: `${level} - ${POWER_LEVEL_LABELS[level].padEnd(9)} (${choiceText(level)})`,
            short: `${level} - ${POWER_LEVEL_LABELS[level]}`,
            value: level,
          })),
          ...codexNote,
        ],
        pageSize: 10,
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

  // Optional hooks, in the Claude Code settings / Codex hooks.json, only when asked for.
  // A project install also sees the ones on in the user's own settings: their hooks apply here too.
  const claudeSettings = forClaude ? readJsonFile(claudeSettingsFile(getInstallPaths(targetPath).base)) : null;
  const codexHooks = forCodex ? readJsonFile(getCodexPaths(codexScope, codexRoot).hooksFile) : null;
  const userClaude = forClaude && installType !== 'global' ? readJsonFile(path.join(getDefaultClaudeDir(), 'settings.json')) : null;
  const userCodex = forCodex && installType !== 'global' ? readJsonFile(getCodexPaths('global', codexRoot).hooksFile) : null;
  type Where = { claude: boolean; codex: boolean };
  const here = {} as Record<HookKey, Where>;
  const fromUser = {} as Record<HookKey, Where>;
  for (const option of HOOK_OPTIONS) {
    here[option.key] = { claude: hasAnyHook(claudeSettings, option.claude), codex: hasAnyHook(codexHooks, option.codex) };
    fromUser[option.key] = { claude: hasAnyHook(userClaude, option.claude), codex: hasAnyHook(userCodex, option.codex) };
  }
  const isOn = (key: HookKey) => [here[key], fromUser[key]].some(w => (forClaude && w.claude) || (forCodex && w.codex));

  // Each hook: a flag decides it, --yes keeps it as it is, otherwise one checklist asks about the rest.
  // Every box starts unticked, except a hook that's on already ("on now"): a plain Enter keeps the setup as it is.
  const wanted = {} as Record<HookKey, boolean | 'keep'>;
  for (const option of HOOK_OPTIONS) {
    const flag = options[option.key];
    if (!flag) continue;
    const requested = flag.toLowerCase();
    if (requested !== 'on' && requested !== 'off') {
      console.error(chalk.red(`Error: --${option.flag} must be on or off`));
      process.exit(1);
    }
    wanted[option.key] = requested === 'on';
  }
  const unasked = HOOK_OPTIONS.filter(option => wanted[option.key] === undefined);
  if (options.yes) {
    for (const option of unasked) wanted[option.key] = 'keep';
  } else if (unasked.length) {
    const answer = await inquirer.prompt<{ hooks: HookKey[] }>([{
      type: 'checkbox',
      name: 'hooks',
      message: 'Optional hooks:', // inquirer adds how to tick them
      choices: unasked.map(option => ({
        name: `${option.name} ${chalk.dim(`— ${option.description}${isOn(option.key) ? ' (on now)' : ''}`)}`,
        short: option.name,
        value: option.key,
        checked: isOn(option.key),
      })),
    }]);
    for (const option of unasked) wanted[option.key] = answer.hooks.includes(option.key);
  }
  // On only in the user's settings: 'keep' leaves it there, rather than adding a second copy to the project
  const choiceFor = (key: HookKey, tool: keyof Where): HookChoice => {
    const want = wanted[key];
    if (want === 'keep') return 'keep';
    if (!want) return 'off';
    return fromUser[key][tool] && !here[key][tool] ? 'keep' : 'on';
  };
  const claudeOptions = Object.fromEntries(HOOK_OPTIONS.map(o => [o.key, choiceFor(o.key, 'claude')])) as InstallOptions;
  const codexOptions = Object.fromEntries(HOOK_OPTIONS.map(o => [o.key, choiceFor(o.key, 'codex')])) as InstallOptions;
  const status = (key: HookKey, tool: keyof Where): string => {
    const choice = (tool === 'claude' ? claudeOptions : codexOptions)[key];
    if (choice === 'on' || (choice === 'keep' && here[key][tool])) return 'on';
    if (choice === 'keep' && fromUser[key][tool]) return `on ${chalk.dim('(from your user settings)')}`;
    return chalk.dim('off');
  };
  for (const option of HOOK_OPTIONS) {
    if (wanted[option.key] === false && ((forClaude && fromUser[option.key].claude) || (forCodex && fromUser[option.key].codex))) {
      console.log(chalk.yellow(`  ${option.name} is on in your user settings, so it still applies here.`));
      console.log(chalk.yellow(`  To turn it off everywhere, install with --global --${option.flag} off.`));
    }
  }

  // Show what will be installed
  const sourcePaths = getSourcePaths();
  const commandCount = fs.readdirSync(sourcePaths.commands).filter(f => f.endsWith('.md')).length;
  const agentCount = fs.readdirSync(sourcePaths.agents).filter(f => f.endsWith('.md')).length;
  const workflowCount = fs.existsSync(sourcePaths.workflows)
    ? fs.readdirSync(sourcePaths.workflows).filter(f => f.endsWith('.js')).length
    : 0;

  // The tiers for each tool, and the level's note ("recommended") once for both
  const [models, levelNote] = POWER_LEVEL_MODELS[powerLevel].split(' — ');
  const [efforts, effortNote] = POWER_LEVEL_EFFORTS[powerLevel].split(' — ');
  console.log();
  console.log(chalk.yellow('Installation summary'));
  console.log(RULE);
  if (forClaude) {
    const paths = getInstallPaths(targetPath);
    block('Claude Code');
    row('Commands', `${commandCount} → ${chalk.cyan(shortPath(paths.commands))}`);
    row('Agents', `${agentCount} → ${chalk.cyan(shortPath(paths.agents))}`);
    row('Workflows', `${workflowCount} → ${chalk.cyan(shortPath(paths.workflows))}`);
    row('Models', models);
    for (const option of HOOK_OPTIONS) {
      const label = status(option.key, 'claude');
      row(option.name, `${label}${option.key === 'glance' && label.startsWith('on') ? chalk.dim(` (pages made with ${glanceModel(powerLevel)})`) : ''}`);
    }
    console.log();
  }
  if (forCodex) {
    const codexPaths = getCodexPaths(codexScope, codexRoot);
    block('Codex');
    row('Skills', `${commandCount} → ${chalk.cyan(shortPath(codexPaths.skills))}`);
    row('Agents', `${agentCount} → ${chalk.cyan(shortPath(codexPaths.agents))}`);
    row('Effort', efforts);
    row('Typecheck gate', `on ${chalk.dim(`(in ${shortPath(codexPaths.hooksFile)})`)}`);
    for (const option of HOOK_OPTIONS) row(option.name, status(option.key, 'codex'));
    console.log();
  }
  const note = forClaude ? levelNote : effortNote;
  console.log(`  ${chalk.bold('Power level'.padEnd(LABEL_WIDTH + 2))}${chalk.magenta(`${powerLevel} - ${POWER_LEVEL_LABELS[powerLevel]}`)}${note ? chalk.dim(` (${note})`) : ''}`);
  console.log(`  ${chalk.bold('Tasks folder'.padEnd(LABEL_WIDTH + 2))}${chalk.cyan(`${tasksDir}/`)}`);
  console.log(RULE);
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
    const claudeResult = forClaude ? await installBlueprints(targetPath, powerLevel, tasksDir, claudeOptions) : null;
    const codexResult = forCodex ? await installCodex(codexScope, codexRoot, powerLevel, tasksDir, undefined, codexOptions) : null;
    const hookResults = (result: Record<'glanceHook' | 'leanCommits', HookResult>) => HOOK_OPTIONS.map(option => ({
      name: `${option.name.toLowerCase().replace(/ pages$/, '')} hook`,
      result: result[option.key === 'glance' ? 'glanceHook' : option.key],
    }));
    spinner.succeed(chalk.green('Installation complete!'));

    console.log();
    console.log(RULE);
    if (claudeResult) {
      block('Claude Code');
      done(`${claudeResult.commands} commands installed`);
      done(`${claudeResult.agents} agents installed`);
      done(`${claudeResult.workflows} workflows installed`);
      if (claudeResult.removed > 0) {
        done(`${claudeResult.removed} outdated blueprints files removed ${chalk.dim('(never your own)')}`);
      }
      for (const hook of hookResults(claudeResult)) reportHook(hook.name, hook.result, claudeResult.settingsFile);
      const addItYourself = ['To add it yourself:', `claude plugin marketplace add ${shellPath(userModsDir())}`, `claude plugin install ${GLANCE_MOD}`];
      if (claudeResult.glanceMod === 'added') done(`glance mod added ${chalk.dim('(new sessions, or /reload-plugins)')}`);
      if (claudeResult.glanceMod === 'removed') done('glance mod removed');
      if (claudeResult.glanceMod === 'failed') warn('couldn\'t add the glance mod:', chalk.dim(claudeResult.glanceModError ?? ''), ...addItYourself);
      if (claudeResult.glanceMod === 'no-cli') warn('the glance mod wasn\'t added: claude isn\'t on your PATH', ...addItYourself);
      if (claudeResult.attribution === 'set') done(`commit attribution turned off ${chalk.dim('(attribution.commit, .sessionUrl)')}`);
      if (claudeResult.attribution === 'restored') done('commit attribution settings put back as they were');
      if (claudeResult.attribution === 'left') warn('commit attribution settings left alone: they changed after lean commits set them');
      if (codexResult) console.log();
    }
    if (codexResult) {
      block('Codex');
      done(`${codexResult.skills} skills installed`);
      done(`${codexResult.agents} agents installed`);
      reportHook('typecheck gate', codexResult.gateHook, codexResult.paths.hooksFile);
      if (codexResult.removed > 0) {
        done(`${codexResult.removed} outdated blueprints files removed`);
      }
      if (codexResult.skipped.length > 0) {
        warn('skipped, as you have your own:', ...wrapWords(codexResult.skipped.map((name, i) => (i < codexResult.skipped.length - 1 ? `${name},` : name))));
      }
      for (const hook of hookResults(codexResult)) reportHook(hook.name, hook.result, codexResult.paths.hooksFile);
    }
    console.log(RULE);
    console.log();

    // Show next steps
    console.log(chalk.bold('Next steps'));
    console.log();

    if (claudeResult) {
      const where = { global: 'any project', local: 'this project', custom: chalk.cyan(tilde(targetPath)) }[installType];
      block('Claude Code');
      console.log(`    Type ${chalk.yellow('/autopilot')} or ${chalk.yellow('/blueprint')} in ${where}`);
      if (codexResult) console.log();
    }
    if (codexResult) {
      const where = { global: 'any project', local: 'this project', custom: chalk.cyan(tilde(codexRoot)) }[installType];
      block('Codex');
      console.log(`    Type ${chalk.yellow('$autopilot')} or ${chalk.yellow('$blueprint')} in ${where} ${chalk.dim('(skills start with $)')}`);
      // Codex asks to trust a hook that is new or changed
      const changed = [{ name: 'typecheck gate', result: codexResult.gateHook }, ...hookResults(codexResult)]
        .filter(hook => hook.result === 'added' || hook.result === 'updated')
        .map(hook => hook.name.replace(/ hook$/, ''));
      if (changed.length) {
        console.log(`    Run ${chalk.yellow('/hooks')} once to trust the new hooks:`);
        console.log(`      ${changed.join(', ')}`);
      }
      console.log(chalk.dim(`    Optional: to run $parallelize streams, add to ${shortPath(path.join(codexResult.paths.codexHome, 'config.toml'))}:`));
      console.log(chalk.dim('      [agents]'));
      console.log(chalk.dim('      max_depth = 2'));
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
