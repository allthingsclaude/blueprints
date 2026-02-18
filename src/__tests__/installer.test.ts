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
  getModelForAgent,
  copyAgentsWithPowerLevel,
  RESEARCH_AGENTS
} from '../installer.js';
import type { AgentPowerLevel } from '../installer.js';

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

describe('getModelForAgent', () => {
  it('level 1: all agents use haiku', () => {
    expect(getModelForAgent('research-codebase.md', 1)).toBe('haiku');
    expect(getModelForAgent('research-docs.md', 1)).toBe('haiku');
    expect(getModelForAgent('research-web.md', 1)).toBe('haiku');
    expect(getModelForAgent('audit.md', 1)).toBe('haiku');
    expect(getModelForAgent('implement.md', 1)).toBe('haiku');
  });

  it('level 2: research haiku, others sonnet', () => {
    expect(getModelForAgent('research-codebase.md', 2)).toBe('haiku');
    expect(getModelForAgent('research-docs.md', 2)).toBe('haiku');
    expect(getModelForAgent('audit.md', 2)).toBe('sonnet');
    expect(getModelForAgent('implement.md', 2)).toBe('sonnet');
  });

  it('level 3: all agents use sonnet', () => {
    expect(getModelForAgent('research-web.md', 3)).toBe('sonnet');
    expect(getModelForAgent('plan.md', 3)).toBe('sonnet');
    expect(getModelForAgent('optimize.md', 3)).toBe('sonnet');
  });

  it('level 4: research sonnet, others opus', () => {
    expect(getModelForAgent('research-codebase.md', 4)).toBe('sonnet');
    expect(getModelForAgent('research-docs.md', 4)).toBe('sonnet');
    expect(getModelForAgent('audit.md', 4)).toBe('opus');
    expect(getModelForAgent('parallelize.md', 4)).toBe('opus');
  });

  it('level 5: all agents use opus', () => {
    expect(getModelForAgent('research-web.md', 5)).toBe('opus');
    expect(getModelForAgent('implement.md', 5)).toBe('opus');
    expect(getModelForAgent('storyboard.md', 5)).toBe('opus');
  });
});

describe('copyAgentsWithPowerLevel', () => {
  const srcDir = path.join(os.tmpdir(), 'blueprints-test-agents-src');
  const destDir = path.join(os.tmpdir(), 'blueprints-test-agents-dest');

  beforeEach(() => {
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'research-codebase.md'),
      '---\nname: research-codebase\nmodel: haiku\n---\nContent here'
    );
    fs.writeFileSync(
      path.join(srcDir, 'implement.md'),
      '---\nname: implement\nmodel: sonnet\n---\nContent here'
    );
  });

  afterEach(() => {
    if (fs.existsSync(srcDir)) fs.rmSync(srcDir, { recursive: true });
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true });
  });

  it('rewrites model in frontmatter for research agent at level 5', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 5);
    const content = fs.readFileSync(path.join(destDir, 'research-codebase.md'), 'utf-8');
    expect(content).toContain('model: opus');
    expect(content).not.toContain('model: haiku');
  });

  it('rewrites model in frontmatter for non-research agent at level 1', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 1);
    const content = fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8');
    expect(content).toContain('model: haiku');
    expect(content).not.toContain('model: sonnet');
  });

  it('level 2: research stays haiku, other becomes sonnet', () => {
    copyAgentsWithPowerLevel(srcDir, destDir, 2);
    const research = fs.readFileSync(path.join(destDir, 'research-codebase.md'), 'utf-8');
    const impl = fs.readFileSync(path.join(destDir, 'implement.md'), 'utf-8');
    expect(research).toContain('model: haiku');
    expect(impl).toContain('model: sonnet');
  });

  it('returns correct file count', () => {
    const count = copyAgentsWithPowerLevel(srcDir, destDir, 3);
    expect(count).toBe(2);
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

  it('power level 1 sets all agents to haiku', async () => {
    const result = await installBlueprints(testDir, 1);
    expect(result.powerLevel).toBe(1);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
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

  it('power level 4 uses sonnet for research, opus for others', async () => {
    await installBlueprints(testDir, 4);

    const agentsDir = path.join(testDir, '.claude', 'agents');
    for (const researchFile of RESEARCH_AGENTS) {
      const content = fs.readFileSync(path.join(agentsDir, researchFile), 'utf-8');
      expect(content).toMatch(/^model:\s*sonnet$/m);
    }

    const auditContent = fs.readFileSync(path.join(agentsDir, 'audit.md'), 'utf-8');
    expect(auditContent).toMatch(/^model:\s*opus$/m);
  });
});
