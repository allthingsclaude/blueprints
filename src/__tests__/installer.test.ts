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
  checkExistingInstallation
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
