import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { listFiles } from '../installer.js';
import { buildPlugin, PLUGIN_DIR, qualifyMarkdown, qualifyWorkflow, stripAgentHooks } from '../plugin.js';

describe('plugin build', () => {
  let out: string;
  beforeAll(() => {
    out = fs.mkdtempSync(path.join(os.tmpdir(), 'blueprints-plugin-'));
    buildPlugin(out);
  });
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));

  it('matches the committed plugin/ folder (run `pnpm build:plugin` after changing content/)', () => {
    const built = listFiles(out, '', true).sort();
    expect(listFiles(PLUGIN_DIR, '', true).sort()).toEqual(built);
    for (const rel of built) {
      expect(fs.readFileSync(path.join(PLUGIN_DIR, rel)).equals(fs.readFileSync(path.join(out, rel))), rel).toBe(true);
    }
  });

  it('leaves no install-time placeholders and no paths into ~/.claude', () => {
    for (const rel of listFiles(out)) {
      if (rel.endsWith('.png')) continue;
      const text = fs.readFileSync(path.join(out, rel), 'utf-8');
      expect(text, rel).not.toMatch(/\{\{(TASKS_DIR|PLANS_DIR|SESSIONS_DIR|STATE_FILE|BLUEPRINTS_DIR|MODEL)\}\}/);
      expect(text, rel).not.toMatch(/\/\.claude\/blueprints\/(hooks|procedures)/);
    }
  });

  it('has the files the directory requires and nothing it refuses', () => {
    for (const rel of ['.claude-plugin/plugin.json', 'README.md', 'LICENSE', 'hooks/hooks.json', 'assets/icon.png']) {
      expect(fs.existsSync(path.join(out, rel)), rel).toBe(true);
    }
    expect(fs.existsSync(path.join(out, 'bin'))).toBe(false);
    const files = listFiles(out, '', true);
    expect(files.length).toBeLessThanOrEqual(512);
    for (const rel of files) {
      if (!rel.endsWith('.png')) expect(fs.statSync(path.join(out, rel)).size, rel).toBeLessThan(256 * 1024);
    }
  });

  it('points every hook script it runs at a file it ships', () => {
    const hooks = JSON.parse(fs.readFileSync(path.join(out, 'hooks/hooks.json'), 'utf-8')).hooks;
    for (const entries of Object.values(hooks) as { hooks: { command: string }[] }[][]) {
      for (const { hooks: list } of entries) {
        for (const { command } of list) {
          const m = command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/);
          expect(m, command).not.toBeNull();
          expect(fs.existsSync(path.join(out, m![1])), command).toBe(true);
        }
      }
    }
  });
});

describe('plugin rewrites', () => {
  it('qualifies agent and workflow names', () => {
    const text = 'Launch (`subagent_type: "implement"`), then run the saved workflow **`sweep`** and `subagent_type: "unknown"`';
    expect(qualifyMarkdown(text, ['implement'], ['sweep'])).toBe(
      'Launch (`subagent_type: "blueprints:implement"`), then run the saved workflow **`blueprints:sweep`** and `subagent_type: "unknown"`',
    );
  });

  it('drops an agent frontmatter hooks block', () => {
    const fm = '---\nname: implement\nhooks:\n  Stop:\n    - hooks:\n        - type: command\nauthor: x\n---\n';
    expect(stripAgentHooks(fm)).toBe('---\nname: implement\nauthor: x\n---\n');
  });

  it('routes workflow agent() calls through blueprints: agent types', async () => {
    const body = qualifyWorkflow("const a = await agent('p', { agentType: 'audit' })\nconst b = await agent('q', { label: 'x' })\nreturn [a, b]");
    const calls: unknown[] = [];
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction('agent', body)((_p: string, o: unknown) => { calls.push(o); return null; });
    expect(calls).toEqual([{ agentType: 'blueprints:audit' }, { label: 'x' }]);
  });
});
