/**
 * @allthingsclaude/blueprints
 *
 * Install Claude Code commands and agents for enhanced AI-assisted development workflows.
 */

export {
  getDefaultClaudeDir,
  getInstallPaths,
  getSourcePaths,
  installBlueprints,
  checkExistingInstallation,
  ensureDir,
  copyDirectory,
  copyTemplatedFiles,
  cleanStaleFiles,
  listFiles,
  readManifest,
  isBlueprintsFile,
  DEFAULT_TASKS_DIR,
  TEMPLATE_VARS,
  buildTemplateVars,
  replaceTemplateVars
} from './installer.js';

export {
  installCodex,
  getCodexPaths,
  commandToSkill,
  agentToToml,
  convertTextForCodex,
  mergeCodexHooks
} from './codex.js';

export type {
  CodexScope,
  CodexInstallPaths,
  CodexInstallResult,
  CodexManifest
} from './codex.js';

export type {
  InstallPaths,
  SourcePaths,
  InstallResult,
  ExistingInstallation,
  InstalledFiles,
  Manifest
} from './installer.js';
