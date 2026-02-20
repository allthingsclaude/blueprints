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
  DEFAULT_TASKS_DIR,
  TEMPLATE_VARS,
  buildTemplateVars,
  replaceTemplateVars
} from './installer.js';

export type {
  InstallPaths,
  SourcePaths,
  InstallResult,
  ExistingInstallation
} from './installer.js';
