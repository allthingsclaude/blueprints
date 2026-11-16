import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { listFiles } from '../installer.js';
import { buildPlugin, CONTEXT_STEPS_NOTE, inlineShellToSteps, PLUGIN_DIR, qualifyMarkdown, stripAgentHooks, withoutWorkflows } from '../plugin.js';

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

  it('has the files the directory requires and only types it accepts from any organization', () => {
    for (const rel of ['.claude-plugin/plugin.json', 'README.md', 'LICENSE', '.claude-plugin/icon.png']) {
      expect(fs.existsSync(path.join(out, rel)), rel).toBe(true);
    }
    const files = listFiles(out, '', true);
    expect(files.length).toBeLessThanOrEqual(512);
    for (const rel of files) {
      expect(rel, 'only Markdown, JSON, the license and the icon').toMatch(/(\.md|\.json|^LICENSE|^\.claude-plugin\/icon\.png)$/);
      if (!rel.endsWith('.png')) {
        const text = fs.readFileSync(path.join(out, rel), 'utf-8');
        expect(fs.statSync(path.join(out, rel)).size, rel).toBeLessThan(256 * 1024);
        expect(text.startsWith('#!'), rel).toBe(false);
      }
    }
  });

  it('ships no hooks, workflows, inline shell or workflow runs', () => {
    expect(fs.existsSync(path.join(out, 'hooks'))).toBe(false);
    expect(fs.existsSync(path.join(out, 'workflows'))).toBe(false);
    for (const rel of listFiles(out).filter(f => f.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(out, rel), 'utf-8');
      // Only commands run inline shell (agents mention a literal `!` in prose)
      if (!rel.startsWith('agents/')) expect(text, rel).not.toMatch(/!`[^`]+`/);
      expect(text, rel).not.toMatch(/saved workflow|Workflow \(preferred\)|If the workflow isn't available/);
      expect(text, rel).not.toMatch(/^hooks:/m);
    }
  });

  it('keeps the fallback each workflow path had', () => {
    const integrate = fs.readFileSync(path.join(out, 'procedures/integrate.md'), 'utf-8');
    expect(integrate).toMatch(/## 6\. Review Everything Merged[^\n]*\n\nLaunch the `audit`/);
    const autopilot = fs.readFileSync(path.join(out, 'commands/autopilot.md'), 'utf-8');
    expect(autopilot).toContain('#### 5c. Review in parallel');
    expect(autopilot).toContain('#### 5d. Commit and Decide');
  });
});

describe('plugin rewrites', () => {
  it('qualifies agent names', () => {
    const text = 'Launch (`subagent_type: "implement"`) and `subagent_type: "unknown"`';
    expect(qualifyMarkdown(text, ['implement'])).toBe('Launch (`subagent_type: "blueprints:implement"`) and `subagent_type: "unknown"`');
  });

  it('drops an agent frontmatter hooks block', () => {
    const fm = '---\nname: implement\nhooks:\n  Stop:\n    - hooks:\n        - type: command\nauthor: x\n---\n';
    expect(stripAgentHooks(fm)).toBe('---\nname: implement\nauthor: x\n---\n');
  });

  it('takes out workflow paths and keeps their fallbacks', () => {
    const text = [
      'Intro.',
      '**As a workflow**: if the `Workflow` tool is available, run the saved workflow **`streams`** instead.',
      "If the workflow isn't available or the run fails, launch the agent.",
      'If the `Workflow` tool is available, run the saved workflow **`preflight`** and wait. Otherwise, launch the `audit` agent.',
      '#### 5b. Run the `preflight` Workflow (preferred)\n\nRun it.\n\n```json\n{ }\n```\n\n#### 5c. Fallback (no Workflow tool, workflows disabled, or the run fails)\n\n1. Review.',
    ].join('\n\n');
    expect(withoutWorkflows(text)).toBe('Intro.\n\nLaunch the `audit` agent.\n\n#### 5c. Review in parallel\n\n1. Review.');
  });

  it('turns inline shell into steps, with a note after the frontmatter', () => {
    const cmd = '---\ndescription: x\n---\n\n**Branch**: !`git branch --show-current`\n';
    expect(inlineShellToSteps(cmd)).toBe(`---\ndescription: x\n---\n\n${CONTEXT_STEPS_NOTE}\n\n**Branch**: run \`git branch --show-current\`\n`);
    expect(inlineShellToSteps('no shell here')).toBe('no shell here');
  });
});
