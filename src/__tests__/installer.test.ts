import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getDefaultClaudeDir,
  getInstallPaths,
  getSourcePaths,
  ensureDir,
  copyDirectory,
  installBlueprints,
  checkExistingInstallation,
  cleanStaleFiles,
  isBlueprintsFile,
  readManifest,
  listFiles,
  LEGACY_COMMANDS,
  getModelForAgent,
  getAgentTier,
  copyAgentsWithPowerLevel,
  RESEARCH_AGENTS,
  LIGHTWEIGHT_AGENTS,
  HEAVYWEIGHT_AGENTS,
  TEMPLATE_VARS,
  replaceTemplateVars,
  selectToolBlocks
} from '../installer.js';

describe('getDefaultClaudeDir', () => {
  it('returns path ending with .claude', () => {
    const result = getDefaultClaudeDir();
    expect(result).toMatch(/\.claude$/);
  });

  it('returns path under home directory', () => {
    const result = getDefaultClaudeDir();
    expect(result).toContain(os.homedir());
  });
});

describe('getInstallPaths', () => {
  it('appends .claude to path without it', () => {
    const result = getInstallPaths('/tmp/test');
    expect(result.base).toBe('/tmp/test/.claude');
    expect(result.commands).toBe('/tmp/test/.claude/commands');
    expect(result.agents).toBe('/tmp/test/.claude/agents');
  });

  it('preserves path already ending with .claude', () => {
    const result = getInstallPaths('/tmp/test/.claude');
    expect(result.base).toBe('/tmp/test/.claude');
  });

  it('expands ~ to home directory', () => {
    const result = getInstallPaths('~/test');
    expect(result.base).toBe(path.join(os.homedir(), 'test', '.claude'));
  });

  it('returns correct structure', () => {
    const result = getInstallPaths('/tmp/test');
    expect(result).toHaveProperty('base');
    expect(result).toHaveProperty('commands');
    expect(result).toHaveProperty('agents');
  });
});

describe('getSourcePaths', () => {
  it('returns paths to content directory', () => {
    const result = getSourcePaths();
    expect(result.commands).toContain('content');
    expect(result.commands).toContain('commands');
    expect(result.agents).toContain('content');
    expect(result.agents).toContain('agents');
  });

  it('points to existing directories', () => {
    const result = getSourcePaths();
    expect(fs.existsSync(result.commands)).toBe(true);
    expect(fs.existsSync(result.agents)).toBe(true);
  });
});

describe('ensureDir', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-ensure');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('creates directory if it does not exist', () => {
    expect(fs.existsSync(testDir)).toBe(false);
    ensureDir(testDir);
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('does nothing if directory exists', () => {
    fs.mkdirSync(testDir, { recursive: true });
    expect(() => ensureDir(testDir)).not.toThrow();
  });

  it('creates nested directories', () => {
    const nestedDir = path.join(testDir, 'nested', 'deep');
    ensureDir(nestedDir);
    expect(fs.existsSync(nestedDir)).toBe(true);
  });
});

describe('copyDirectory', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-dest');

  beforeEach(() => {
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'file1.md'), '# File 1');
    fs.writeFileSync(path.join(srcDir, 'file2.md'), '# File 2');
  });

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('copies all files to destination', () => {
    const count = copyDirectory(srcDir, destDir);
    expect(count).toBe(2);
    expect(fs.existsSync(path.join(destDir, 'file1.md'))).toBe(true);
    expect(fs.existsSync(path.join(destDir, 'file2.md'))).toBe(true);
  });

  it('preserves file content', () => {
    copyDirectory(srcDir, destDir);
    const content = fs.readFileSync(path.join(destDir, 'file1.md'), 'utf-8');
    expect(content).toBe('# File 1');
  });

  it('creates destination directory if needed', () => {
    expect(fs.existsSync(destDir)).toBe(false);
    copyDirectory(srcDir, destDir);
    expect(fs.existsSync(destDir)).toBe(true);
  });
});

describe('installBlueprints', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-install');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('installs commands and agents', async () => {
    const result = await installBlueprints(testDir);

    expect(result.commands).toBeGreaterThan(0);
    expect(result.agents).toBeGreaterThan(0);
    expect(result.paths.base).toContain('.claude');
  });

  it('creates correct directory structure', async () => {
    await installBlueprints(testDir);

    const claudeDir = path.join(testDir, '.claude');
    expect(fs.existsSync(path.join(claudeDir, 'commands'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'agents'))).toBe(true);
  });

  it('installs command files', async () => {
    await installBlueprints(testDir);

    const commandsDir = path.join(testDir, '.claude', 'commands');
    const files = fs.readdirSync(commandsDir);

    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith('.md'))).toBe(true);
  });

  it('installs agent files', async () => {
    await installBlueprints(testDir);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    const files = fs.readdirSync(agentsDir);

    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.endsWith('.md'))).toBe(true);
  });
});

describe('checkExistingInstallation', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-check');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('returns false when nothing installed', () => {
    const result = checkExistingInstallation(testDir);
    expect(result.hasCommands).toBe(false);
    expect(result.hasAgents).toBe(false);
  });

  it('detects existing installation', async () => {
    await installBlueprints(testDir);
    const result = checkExistingInstallation(testDir);

    expect(result.hasCommands).toBe(true);
    expect(result.hasAgents).toBe(true);
  });

  it('returns correct paths', () => {
    const result = checkExistingInstallation(testDir);
    expect(result.commandsPath).toContain('commands');
    expect(result.agentsPath).toContain('agents');
  });
});

describe('getAgentTier', () => {
  it('classifies lightweight agents', () => {
    expect(getAgentTier('commit.md')).toBe('lightweight');
    expect(getAgentTier('changelog.md')).toBe('lightweight');
    expect(getAgentTier('handoff.md')).toBe('lightweight');
    expect(getAgentTier('cleanup.md')).toBe('lightweight');
    expect(getAgentTier('imagine.md')).toBe('lightweight');
  });

  it('classifies research agents', () => {
    expect(getAgentTier('research-codebase.md')).toBe('research');
    expect(getAgentTier('research-docs.md')).toBe('research');
    expect(getAgentTier('research-web.md')).toBe('research');
  });

  it('classifies heavyweight agents', () => {
    expect(getAgentTier('audit.md')).toBe('heavyweight');
    expect(getAgentTier('diagnose.md')).toBe('heavyweight');
    expect(getAgentTier('secure.md')).toBe('heavyweight');
  });

  it('defaults to standard for unlisted agents', () => {
    expect(getAgentTier('implement.md')).toBe('standard');
    expect(getAgentTier('blueprint.md')).toBe('standard');
    expect(getAgentTier('refactor.md')).toBe('standard');
  });

  it('every tiered agent file exists in the package', () => {
    const agents = fs.readdirSync(getSourcePaths().agents);
    for (const file of [...LIGHTWEIGHT_AGENTS, ...RESEARCH_AGENTS, ...HEAVYWEIGHT_AGENTS]) {
      expect(agents).toContain(file);
    }
  });
});

describe('getModelForAgent', () => {
  it('level 1: lightweight/research/standard haiku, heavyweight sonnet', () => {
    expect(getModelForAgent('commit.md', 1)).toBe('haiku');
    expect(getModelForAgent('research-codebase.md', 1)).toBe('haiku');
    expect(getModelForAgent('implement.md', 1)).toBe('haiku');
    expect(getModelForAgent('audit.md', 1)).toBe('sonnet');
    expect(getModelForAgent('diagnose.md', 1)).toBe('sonnet');
  });

  it('level 2: lightweight/research haiku, standard/heavyweight sonnet', () => {
    expect(getModelForAgent('commit.md', 2)).toBe('haiku');
    expect(getModelForAgent('research-docs.md', 2)).toBe('haiku');
    expect(getModelForAgent('implement.md', 2)).toBe('sonnet');
    expect(getModelForAgent('audit.md', 2)).toBe('sonnet');
  });

  it('level 3: all sonnet', () => {
    expect(getModelForAgent('commit.md', 3)).toBe('sonnet');
    expect(getModelForAgent('changelog.md', 3)).toBe('sonnet');
    expect(getModelForAgent('research-web.md', 3)).toBe('sonnet');
    expect(getModelForAgent('blueprint.md', 3)).toBe('sonnet');
    expect(getModelForAgent('secure.md', 3)).toBe('sonnet');
  });

  it('level 4: lightweight/research sonnet, standard/heavyweight opus', () => {
    expect(getModelForAgent('commit.md', 4)).toBe('sonnet');
    expect(getModelForAgent('research-codebase.md', 4)).toBe('sonnet');
    expect(getModelForAgent('parallelize.md', 4)).toBe('opus');
    expect(getModelForAgent('audit.md', 4)).toBe('opus');
    expect(getModelForAgent('diagnose.md', 4)).toBe('opus');
    expect(getModelForAgent('secure.md', 4)).toBe('opus');
  });

  it('level 5: all agents use opus', () => {
    expect(getModelForAgent('commit.md', 5)).toBe('opus');
    expect(getModelForAgent('research-web.md', 5)).toBe('opus');
    expect(getModelForAgent('implement.md', 5)).toBe('opus');
    expect(getModelForAgent('audit.md', 5)).toBe('opus');
  });
});

describe('copyAgentsWithPowerLevel', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-agents-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-agents-dest');

  beforeEach(() => {
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'research-codebase.md'),
      '---\nname: research-codebase\nmodel: sonnet\n---\nContent here'
    );
    fs.writeFileSync(
      path.join(srcDir, 'implement.md'),
      '---\nname: implement\nmodel: sonnet\n---\nContent here'
    );
    fs.writeFileSync(
      path.join(srcDir, 'audit.md'),
      '---\nname: audit\nmodel: sonnet\n---\nContent here'
    );
    fs.writeFileSync(
      path.join(srcDir, 'commit.md'),
      '---\nname: commit\nmodel: sonnet\n---\nContent here'
    );
  });

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('level 5: rewrites all agents to opus', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 5);
    for (const file of ['research-codebase.md', 'implement.md', 'audit.md', 'commit.md']) {
      const content = fs.readFileSync(path.join(destDir, file), 'utf-8');
      expect(content).toContain('model: opus');
    }
  });

  it('level 1: heavyweight gets sonnet, others get haiku', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 1);
    expect(fs.readFileSync(path.join(destDir, 'audit.md'), 'utf-8')).toContain('model: sonnet');
    expect(fs.readFileSync(path.join(destDir, 'commit.md'), 'utf-8')).toContain('model: haiku');
    expect(fs.readFileSync(path.join(destDir, 'research-codebase.md'), 'utf-8')).toContain('model: haiku');
    expect(fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8')).toContain('model: haiku');
  });

  it('level 4: lightweight/research sonnet, standard/heavyweight opus', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 4);
    expect(fs.readFileSync(path.join(destDir, 'audit.md'), 'utf-8')).toContain('model: opus');
    expect(fs.readFileSync(path.join(destDir, 'commit.md'), 'utf-8')).toContain('model: sonnet');
    expect(fs.readFileSync(path.join(destDir, 'research-codebase.md'), 'utf-8')).toContain('model: sonnet');
    expect(fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8')).toContain('model: opus');
  });

  it('returns correct file count', () => {
    const count = copyAgentsWithPowerLevel(srcDir, destDir, 3);
    expect(count).toBe(4);
  });

  it('preserves non-model content', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 5);
    const content = fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8');
    expect(content).toContain('name: implement');
    expect(content).toContain('Content here');
  });
});

describe('installBlueprints with power level', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-power');

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('defaults to power level 3 (sonnet for all)', async () => {
    const result = await installBlueprints(testDir);
    expect(result.powerLevel).toBe(3);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    const auditContent = fs.readFileSync(path.join(agentsDir, 'audit.md'), 'utf-8');
    const researchContent = fs.readFileSync(path.join(agentsDir, 'research-codebase.md'), 'utf-8');
    expect(auditContent).toMatch(/^model:\s*sonnet$/m);
    expect(researchContent).toMatch(/^model:\s*sonnet$/m);
  });

  it('power level 1: heavyweight gets sonnet, others get haiku', async () => {
    const result = await installBlueprints(testDir, 1);
    expect(result.powerLevel).toBe(1);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    for (const file of HEAVYWEIGHT_AGENTS) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      expect(content).toMatch(/^model:\s*sonnet$/m);
    }
    for (const file of LIGHTWEIGHT_AGENTS) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      expect(content).toMatch(/^model:\s*haiku$/m);
    }
  });

  it('power level 5 sets all agents to opus', async () => {
    const result = await installBlueprints(testDir, 5);
    expect(result.powerLevel).toBe(5);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      expect(content).toMatch(/^model:\s*opus$/m);
    }
  });

  it('power level 4: lightweight and research get sonnet, standard and heavyweight get opus', async () => {
    await installBlueprints(testDir, 4);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    for (const file of HEAVYWEIGHT_AGENTS) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      expect(content).toMatch(/^model:\s*opus$/m);
    }
    for (const file of [...LIGHTWEIGHT_AGENTS, ...RESEARCH_AGENTS]) {
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
      expect(content).toMatch(/^model:\s*sonnet$/m);
    }
  });
});

describe('replaceTemplateVars', () => {
  it('replaces {{TASKS_DIR}} with tasks', () => {
    expect(replaceTemplateVars('Save to {{TASKS_DIR}}/')).toBe('Save to tasks/');
  });

  it('replaces {{PLANS_DIR}} with tasks/plans', () => {
    expect(replaceTemplateVars('Write to {{PLANS_DIR}}/PLAN_FOO.md')).toBe('Write to tasks/plans/PLAN_FOO.md');
  });

  it('replaces {{SESSIONS_DIR}} with tasks/sessions', () => {
    expect(replaceTemplateVars('Write to {{SESSIONS_DIR}}/HANDOFF.md')).toBe('Write to tasks/sessions/HANDOFF.md');
  });

  it('replaces {{STATE_FILE}} with tasks/STATE.md', () => {
    expect(replaceTemplateVars('Read {{STATE_FILE}}')).toBe('Read tasks/STATE.md');
  });

  it('replaces multiple occurrences', () => {
    const input = '{{PLANS_DIR}}/A.md and {{PLANS_DIR}}/B.md';
    expect(replaceTemplateVars(input)).toBe('tasks/plans/A.md and tasks/plans/B.md');
  });

  it('replaces multiple different variables', () => {
    const input = '{{PLANS_DIR}}/PLAN.md and {{SESSIONS_DIR}}/HANDOFF.md';
    expect(replaceTemplateVars(input)).toBe('tasks/plans/PLAN.md and tasks/sessions/HANDOFF.md');
  });

  it('returns unchanged content when no variables present', () => {
    expect(replaceTemplateVars('no variables here')).toBe('no variables here');
  });
});

describe('copyDirectory with template vars', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-tmpl-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-tmpl-dest');

  beforeEach(() => {
    fs.mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('replaces template variables in .md files', () => {
    fs.writeFileSync(path.join(srcDir, 'test.md'), 'Save to {{PLANS_DIR}}/PLAN_FOO.md');
    copyDirectory(srcDir, destDir);
    const content = fs.readFileSync(path.join(destDir, 'test.md'), 'utf-8');
    expect(content).toBe('Save to tasks/plans/PLAN_FOO.md');
  });

  it('does not replace template variables in non-.md files', () => {
    fs.writeFileSync(path.join(srcDir, 'test.txt'), 'Save to {{PLANS_DIR}}/PLAN_FOO.md');
    copyDirectory(srcDir, destDir);
    const content = fs.readFileSync(path.join(destDir, 'test.txt'), 'utf-8');
    expect(content).toBe('Save to {{PLANS_DIR}}/PLAN_FOO.md');
  });
});

describe('copyAgentsWithPowerLevel with template vars', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-agents-tmpl-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-agents-tmpl-dest');

  beforeEach(() => {
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'implement.md'),
      '---\nname: implement\nmodel: sonnet\n---\nLoad from {{PLANS_DIR}}/PLAN_{NAME}.md'
    );
  });

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('applies both model rewriting and template replacement', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 5);
    const content = fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8');
    expect(content).toContain('model: opus');
    expect(content).toContain('tasks/plans/PLAN_{NAME}.md');
    expect(content).not.toContain('{{PLANS_DIR}}');
  });
});

describe('installBlueprints: workflows, hooks and template vars', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-support');

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  it('installs the preflight workflow and the phase-gate hook', async () => {
    const result = await installBlueprints(testDir, 4);
    const claudeDir = path.join(testDir, '.claude');

    expect(result.workflows).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(claudeDir, 'workflows', 'preflight.js'))).toBe(true);

    const hook = path.join(claudeDir, 'blueprints', 'hooks', 'phase-gate.sh');
    expect(fs.existsSync(hook)).toBe(true);
    if (process.platform !== 'win32') {
      expect(fs.statSync(hook).mode & 0o111).not.toBe(0);
    }
  });

  it('points the implement agent hook at the installed script', async () => {
    await installBlueprints(testDir, 4);
    const claudeDir = path.join(testDir, '.claude');
    const implement = fs.readFileSync(path.join(claudeDir, 'agents', 'implement.md'), 'utf-8');

    expect(implement).toContain(path.join(claudeDir, 'blueprints', 'hooks', 'phase-gate.sh').replace(/\\/g, '/'));
  });

  it('leaves no unreplaced template variables in any installed file', async () => {
    await installBlueprints(testDir, 4, 'work');
    const claudeDir = path.join(testDir, '.claude');

    for (const dir of ['commands', 'agents', 'workflows', 'blueprints']) {
      for (const rel of listFiles(path.join(claudeDir, dir))) {
        const content = fs.readFileSync(path.join(claudeDir, dir, rel), 'utf-8');
        expect(content, `${dir}/${rel}`).not.toMatch(/\{\{(TASKS_DIR|PLANS_DIR|SESSIONS_DIR|STATE_FILE|BLUEPRINTS_DIR|MODEL)\}\}/);
      }
    }
  });

  it('keeps only the Claude Code variant of tool-specific blocks', async () => {
    await installBlueprints(testDir, 4);
    const claudeDir = path.join(testDir, '.claude');

    for (const dir of ['commands', 'agents', 'blueprints']) {
      for (const rel of listFiles(path.join(claudeDir, dir))) {
        const content = fs.readFileSync(path.join(claudeDir, dir, rel), 'utf-8');
        expect(content, `${dir}/${rel}`).not.toMatch(/<!-- \/?(claude|codex)-only -->/);
        expect(content, `${dir}/${rel}`).not.toContain('codex -C');
      }
    }
    const dispatch = fs.readFileSync(path.join(claudeDir, 'blueprints', 'procedures', 'dispatch.md'), 'utf-8');
    expect(dispatch).toContain('claude --bg --name "{name}" "/autopilot {NN}_{NAME}"');
  });

  it('installs the shared procedures and points the commands at them', async () => {
    await installBlueprints(testDir, 4);
    const claudeDir = path.join(testDir, '.claude');
    const procedures = path.join(claudeDir, 'blueprints', 'procedures');

    for (const name of ['dispatch.md', 'integrate.md']) {
      expect(fs.existsSync(path.join(procedures, name)), name).toBe(true);
    }
    const commands = path.join(claudeDir, 'commands');
    const rendered = (name: string) => path.join(procedures, name).replace(/\\/g, '/');
    expect(fs.readFileSync(path.join(commands, 'dispatch.md'), 'utf-8')).toContain(rendered('dispatch.md'));
    expect(fs.readFileSync(path.join(commands, 'integrate.md'), 'utf-8')).toContain(rendered('integrate.md'));
    const autopilot = fs.readFileSync(path.join(commands, 'autopilot.md'), 'utf-8');
    expect(autopilot).toContain(rendered('dispatch.md'));
    expect(autopilot).toContain(rendered('integrate.md'));
  });

  it('renders absolute support paths for a relative install path', async () => {
    const cwd = process.cwd();
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    try {
      await installBlueprints('sub', 4);
    } finally {
      process.chdir(cwd);
    }
    const dispatch = fs.readFileSync(path.join(testDir, 'sub', '.claude', 'commands', 'dispatch.md'), 'utf-8');
    const expected = path.join(fs.realpathSync(testDir), 'sub', '.claude', 'blueprints', 'procedures', 'dispatch.md').replace(/\\/g, '/');
    expect(dispatch.replace(/\/private\/var\//g, '/var/')).toContain(expected.replace(/\/private\/var\//g, '/var/'));
  });

  it('removes a procedure a previous install shipped that is gone now, and upgrades from a manifest without procedures', async () => {
    const claudeDir = path.join(testDir, '.claude');
    const procedures = path.join(claudeDir, 'blueprints', 'procedures');
    await installBlueprints(testDir, 4);

    const manifestFile = path.join(claudeDir, '.blueprints-version');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    delete manifest.files.procedures;
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    await installBlueprints(testDir, 4);
    expect(fs.existsSync(path.join(procedures, 'dispatch.md'))).toBe(true);

    fs.writeFileSync(path.join(procedures, 'old.md'), 'old');
    const again = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    again.files.procedures.push('old.md');
    fs.writeFileSync(manifestFile, JSON.stringify(again));
    const result = await installBlueprints(testDir, 4);
    expect(fs.existsSync(path.join(procedures, 'old.md'))).toBe(false);
    expect(result.removed).toBeGreaterThan(0);
  });

  it('writes a manifest listing installed files', async () => {
    await installBlueprints(testDir, 4);
    const manifest = readManifest(path.join(testDir, '.claude'));

    expect(manifest?.files?.commands).toContain('autopilot.md');
    expect(manifest?.files?.agents).toContain('blueprint.md');
    expect(manifest?.files?.workflows).toContain('preflight.js');
    expect(manifest?.files?.hooks).toContain('phase-gate.sh');
    expect(manifest?.files?.procedures).toContain('dispatch.md');
  });
});

describe('stale file cleanup', () => {
  const testDir = path.join(os.tmpdir(), 'blueprints-test-stale');
  const claudeDir = path.join(testDir, '.claude');
  const marked = '---\ndescription: old\nauthor: "@markoradak"\n---\nOld blueprints file';
  const unmarked = '---\ndescription: mine\n---\nMy own file';

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });
  });

  it('never removes the user\'s own commands, agents, or workflows', async () => {
    fs.mkdirSync(path.join(claudeDir, 'commands', 'team'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'commands', 'my-command.md'), unmarked);
    fs.writeFileSync(path.join(claudeDir, 'commands', 'team', 'shared.md'), unmarked);
    fs.writeFileSync(path.join(claudeDir, 'agents', 'my-agent.md'), unmarked);
    fs.writeFileSync(path.join(claudeDir, 'workflows', 'my-flow.js'), 'export const meta = {}');

    await installBlueprints(testDir, 4);
    await installBlueprints(testDir, 4);

    expect(fs.existsSync(path.join(claudeDir, 'commands', 'my-command.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'team', 'shared.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'agents', 'my-agent.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'workflows', 'my-flow.js'))).toBe(true);
  });

  it('removes renamed blueprints files from a pre-manifest install, but not same-named user files', async () => {
    fs.mkdirSync(path.join(claudeDir, 'commands'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'commands', 'plan.md'), marked);
    fs.writeFileSync(path.join(claudeDir, 'commands', 'verify.md'), unmarked);
    fs.writeFileSync(path.join(claudeDir, 'agents', 'debug.md'), marked);
    fs.writeFileSync(path.join(claudeDir, MANIFEST_VERSION_ONLY.name), MANIFEST_VERSION_ONLY.content);

    const result = await installBlueprints(testDir, 4);

    expect(fs.existsSync(path.join(claudeDir, 'commands', 'plan.md'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'agents', 'debug.md'))).toBe(false);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'verify.md'))).toBe(true);
    expect(fs.existsSync(path.join(claudeDir, 'commands', 'blueprint.md'))).toBe(true);
    expect(result.removed).toBe(2);
  });

  it('with a manifest, removes only files the previous install listed', () => {
    const src = path.join(testDir, 'src');
    const dest = path.join(testDir, 'dest');
    fs.mkdirSync(src, { recursive: true });
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(src, 'kept.md'), marked);
    fs.writeFileSync(path.join(dest, 'kept.md'), marked);
    fs.writeFileSync(path.join(dest, 'dropped.md'), unmarked);
    fs.writeFileSync(path.join(dest, 'users.md'), marked);

    const removed = cleanStaleFiles(src, dest, ['kept.md', 'dropped.md']);

    expect(removed).toBe(1);
    expect(fs.existsSync(path.join(dest, 'dropped.md'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'kept.md'))).toBe(true);
    expect(fs.existsSync(path.join(dest, 'users.md'))).toBe(true);
  });

  it('only treats files with the marker in their frontmatter as blueprints files', () => {
    fs.mkdirSync(testDir, { recursive: true });
    const inBody = path.join(testDir, 'body.md');
    const inFrontmatter = path.join(testDir, 'fm.md');
    fs.writeFileSync(inBody, `---\ndescription: x\n---\n${'author: "@markoradak"'}`);
    fs.writeFileSync(inFrontmatter, marked);

    expect(isBlueprintsFile(inBody)).toBe(false);
    expect(isBlueprintsFile(inFrontmatter)).toBe(true);
  });

  it('lists every renamed command as legacy', () => {
    expect(LEGACY_COMMANDS).toEqual(expect.arrayContaining(['plan.md', 'verify.md', 'debug.md', 'design.md', 'copy.md']));
  });
});

const MANIFEST_VERSION_ONLY = {
  name: '.blueprints-version',
  content: JSON.stringify({ version: '0.4.8', installedAt: '2026-06-08T09:03:00.421Z', powerLevel: 4 }),
};

describe('hidden files', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-hidden-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-hidden-dest');

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('never copies dotfiles or dot-directories', () => {
    fs.mkdirSync(path.join(srcDir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, '.DS_Store'), '');
    fs.writeFileSync(path.join(srcDir, 'real.md'), '# Real');

    expect(copyDirectory(srcDir, destDir)).toBe(1);
    expect(fs.readdirSync(destDir)).toEqual(['real.md']);
    expect(listFiles(srcDir)).toEqual(['real.md']);
  });
});

describe('selectToolBlocks', () => {
  const text = 'a\n<!-- claude-only -->\nfor claude\n<!-- /claude-only -->\nb\n  <!-- codex-only -->\nfor codex\n  <!-- /codex-only -->\nc\n';

  it('keeps Claude Code blocks without their markers and drops Codex blocks', () => {
    expect(selectToolBlocks(text, 'claude')).toBe('a\nfor claude\nb\nc\n');
  });

  it('keeps Codex blocks without their markers and drops Claude Code blocks', () => {
    expect(selectToolBlocks(text, 'codex')).toBe('a\nb\nfor codex\nc\n');
  });

  it('leaves text without blocks unchanged', () => {
    expect(selectToolBlocks('plain <!-- comment -->\n', 'claude')).toBe('plain <!-- comment -->\n');
  });

  it('every block in the shipped content is closed', () => {
    const sources = getSourcePaths();
    for (const dir of [sources.commands, sources.agents, sources.procedures]) {
      for (const rel of listFiles(dir)) {
        const content = fs.readFileSync(path.join(dir, rel), 'utf-8');
        for (const tool of ['claude', 'codex'] as const) {
          expect(selectToolBlocks(content, tool), rel).not.toMatch(/<!-- \/?(claude|codex)-only -->/);
        }
      }
    }
  });
});

describe('context commands', () => {
  // Claude Code runs a command's `!` lines up front only when its read-only check accepts them;
  // otherwise it hands them to the model as "Run these commands first", which costs a turn.
  const injections = (): Array<[string, string]> => {
    const sources = getSourcePaths();
    const found: Array<[string, string]> = [];
    for (const dir of [sources.commands, sources.agents]) {
      for (const rel of listFiles(dir)) {
        for (const match of fs.readFileSync(path.join(dir, rel), 'utf-8').matchAll(/!`([^`]+)`/g)) {
          found.push([rel, match[1]]);
        }
      }
    }
    return found;
  };

  it('use only sed line ranges, which the read-only check accepts', () => {
    for (const [rel, command] of injections()) {
      for (const script of command.matchAll(/\bsed -n '([^']*)'/g)) {
        expect(script[1], `${rel}: ${command}`).toMatch(/^(\d+|\d+,\d+)?p$/);
      }
    }
  });

  it('use no git flags outside the read-only allowlist', () => {
    for (const [rel, command] of injections()) {
      expect(command, rel).not.toContain('--path-format');
      expect(command, rel).not.toMatch(/\bgit config (?!--get\b)/);
    }
  });

  it('use no command substitution or shell variables', () => {
    // Known exceptions, handed to the model: history parses its arguments in the shell,
    // and imagine reports whether API keys are set without printing them.
    const exceptions = new Set(['history.md', 'imagine.md']);
    for (const [rel, command] of injections()) {
      if (exceptions.has(rel)) continue;
      expect(command, `${rel}: ${command}`).not.toMatch(/\$\(|^\s*\w+=/);
    }
  });
});
