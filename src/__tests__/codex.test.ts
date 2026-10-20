import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseFrontmatter,
  convertTextForCodex,
  commandToSkill,
  agentToToml,
  tomlMultiline,
  mergeCodexHooks,
  installCodex,
  getCodexPaths,
  CODEX_MARKER,
  POWER_LEVEL_EFFORTS,
  getEffortForAgent,
} from '../codex.js';
import { getSourcePaths, listFiles, getModelForAgent, POWER_LEVEL_MODELS } from '../installer.js';

const COMMANDS = ['autopilot', 'blueprint', 'commit', 'design-free-name'];

describe('parseFrontmatter', () => {
  it('reads top-level fields and ignores nested blocks', () => {
    const { fields, body } = parseFrontmatter('---\nname: implement\ndescription: "Do things"\nhooks:\n  Stop:\n    - x\neffort: low\n---\nBody here');
    expect(fields).toEqual({ name: 'implement', description: 'Do things', effort: 'low' });
    expect(body).toBe('Body here');
  });
});

describe('convertTextForCodex', () => {
  it('turns shell injections into steps and $ARGUMENTS into a placeholder', () => {
    const result = convertTextForCodex('**Branch**: !`git branch --show-current`\n\n$ARGUMENTS', COMMANDS);
    expect(result.text).toBe('**Branch**: run `git branch --show-current`\n\n<arguments>');
    expect(result.hasInjections).toBe(true);
    expect(result.hasArguments).toBe(true);
  });

  it('maps Claude Code tools to Codex tools', () => {
    const text = 'Use the `Agent` tool to launch the commit agent (subagent_type="commit"). Use `Grep` to find it, then `Edit`/`Write`. Track with a task list (`TodoWrite` or the task tools, if available). Use Grep tool with pattern "x".';
    const { text: out } = convertTextForCodex(text, COMMANDS);
    expect(out).toContain('the `spawn_agent` tool');
    expect(out).toContain('agent_type="commit"');
    expect(out).toContain('`rg`');
    expect(out).toContain('`apply_patch`');
    expect(out).toContain('a plan (`update_plan`)');
    expect(out).not.toMatch(/`(Agent|Grep|Edit|Write|TodoWrite)`|subagent_type|Grep tool/);
  });

  it('maps the general-purpose agent to Codex\'s worker role', () => {
    const { text } = convertTextForCodex('launch one fixer (`subagent_type: "general-purpose"`), then the commit agent (`subagent_type: "commit"`)', COMMANDS);
    expect(text).toBe('launch one fixer (`agent_type: "worker"`), then the commit agent (`agent_type: "commit"`)');
  });

  it('renames instruction files and the product', () => {
    expect(convertTextForCodex('Update CLAUDE.md in Claude Code', COMMANDS).text).toBe('Update AGENTS.md in Codex');
  });

  it('turns slash commands into $skill mentions without touching paths', () => {
    const { text } = convertTextForCodex('Run `/blueprint NAME`, then /autopilot. Output goes to design/ and /tmp/x; /commitments stays.', COMMANDS);
    expect(text).toContain('`$blueprint NAME`');
    expect(text).toContain('then $autopilot.');
    expect(text).toContain('design/');
    expect(text).toContain('/tmp/x');
    expect(text).toContain('/commitments');
  });
});

describe('tomlMultiline', () => {
  it('uses a literal string normally', () => {
    expect(tomlMultiline('a "quoted" \\path')).toBe("'''\na \"quoted\" \\path\n'''");
  });

  it('falls back to an escaped basic string when the text contains triple quotes', () => {
    const out = tomlMultiline("it's '''tricky''' with \\ and \"\"\"");
    expect(out.startsWith('"""\n')).toBe(true);
    expect(out).toContain('\\\\');
    expect(out).not.toMatch(/[^\\]"""[^\n]/);
  });
});

describe('commandToSkill', () => {
  it('builds SKILL.md and marks user-only commands as explicit', () => {
    const skill = commandToSkill(
      'autopilot.md',
      '---\ndescription: Full loop: idea to code\nargument-hint: --full plan\ndisable-model-invocation: true\nauthor: "@markoradak"\n---\n# Autopilot\n!`pwd`\n$ARGUMENTS\n',
      COMMANDS
    );
    expect(skill.name).toBe('autopilot');
    expect(skill.skillMd).toMatch(/^---\nname: autopilot\ndescription: "Full loop: idea to code"\n---\n/);
    expect(skill.skillMd).toContain('**Usage**: `$autopilot --full plan`');
    expect(skill.skillMd).toContain('Codex notes');
    expect(skill.skillMd).toContain(CODEX_MARKER);
    expect(skill.skillMd).not.toContain('author:');
    expect(skill.openaiYaml).toBe('policy:\n  allow_implicit_invocation: false\n');
  });

  it('leaves regular commands implicitly invocable', () => {
    expect(commandToSkill('commit.md', '---\ndescription: Commit\n---\nBody', COMMANDS).openaiYaml).toBeUndefined();
  });
});

describe('agentToToml', () => {
  const agent = (extra = '') => `---\nname: implement\ndescription: Execute plans\ntools: Bash, Read\nmodel: opus\n${extra}autoCompactWindow: 250000\nhooks:\n  Stop:\n    - x\nauthor: "@markoradak"\n---\nUse \`Grep\` and CLAUDE.md.\n`;

  it('writes only keys Codex accepts', () => {
    const toml = agentToToml('implement.md', agent(), 4, COMMANDS);
    const keys = toml.split('\n').filter(l => /^[a-z_]+ = /.test(l)).map(l => l.split(' = ')[0]);
    expect(keys).toEqual(['name', 'description', 'model_reasoning_effort', 'developer_instructions']);
    expect(toml).toContain("developer_instructions = '''\nUse `rg` and AGENTS.md.\n'''");
  });

  it('derives effort from the power level, and an explicit effort wins', () => {
    expect(agentToToml('implement.md', agent(), 4, COMMANDS)).toContain('model_reasoning_effort = "high"');
    expect(agentToToml('implement.md', agent(), 2, COMMANDS)).toContain('model_reasoning_effort = "medium"');
    expect(agentToToml('commit.md', agent('effort: low\n'), 5, COMMANDS)).toContain('model_reasoning_effort = "low"');
  });
});

describe('mergeCodexHooks', () => {
  it('keeps other hooks and replaces its own entry instead of duplicating it', () => {
    const existing = {
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'my-stop.sh' }] }],
        SubagentStop: [{ matcher: 'reviewer', hooks: [{ type: 'command', command: 'mine.sh' }] }],
      },
    };
    const once = mergeCodexHooks(existing, 'sh "/x/blueprints/hooks/phase-gate.sh"');
    const twice = mergeCodexHooks(once, 'sh "/y/blueprints/hooks/phase-gate.sh"');

    expect(twice.hooks?.Stop).toEqual(existing.hooks.Stop);
    expect(twice.hooks?.SubagentStop).toHaveLength(2);
    expect(twice.hooks?.SubagentStop?.[0].matcher).toBe('reviewer');
    expect(twice.hooks?.SubagentStop?.[1]).toEqual({
      matcher: '^implement$',
      hooks: [{ type: 'command', command: 'sh "/y/blueprints/hooks/phase-gate.sh"', timeout: 600 }],
    });
  });
});

describe('installCodex', () => {
  const root = path.join(os.tmpdir(), 'blueprints-test-codex');
  const commandCount = listFiles(getSourcePaths().commands).filter(f => f.endsWith('.md')).length;
  const agentCount = listFiles(getSourcePaths().agents).filter(f => f.endsWith('.md')).length;

  afterEach(() => {
    if (fs.existsSync(root)) fs.rmSync(root, { recursive: true });
  });

  it('installs skills, agents, and the gate hook into a project', async () => {
    const result = await installCodex('project', root, 4);
    const paths = getCodexPaths('project', root);

    expect(result.skills).toBe(commandCount);
    expect(result.agents).toBe(agentCount);
    expect(result.hookRegistered).toBe(true);
    expect(paths.skills).toBe(path.join(root, '.agents', 'skills'));
    expect(fs.existsSync(path.join(paths.skills, 'autopilot', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(paths.skills, 'autopilot', 'agents', 'openai.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(paths.agents, 'implement.toml'))).toBe(true);

    const hooks = JSON.parse(fs.readFileSync(paths.hooksFile, 'utf-8'));
    expect(hooks.hooks.SubagentStop[0].hooks[0].command).toContain(path.join(paths.support, 'hooks', 'phase-gate.sh'));
  });

  it('leaves no Claude-only syntax or template variables behind', async () => {
    await installCodex('project', root, 4, 'work');
    const paths = getCodexPaths('project', root);
    const files = [
      ...listFiles(paths.skills).map(f => path.join(paths.skills, f)),
      ...listFiles(paths.agents).map(f => path.join(paths.agents, f)),
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content, file).not.toMatch(/\{\{(TASKS_DIR|PLANS_DIR|SESSIONS_DIR|STATE_FILE|BLUEPRINTS_DIR|MODEL)\}\}/);
      expect(content, file).not.toContain('$ARGUMENTS');
      expect(content, file).not.toMatch(/!`[^`]+`/);
      expect(content, file).not.toMatch(/subagent_type|`(Agent|Read|Grep|Glob|Edit|Write|Bash|TodoWrite|WebSearch|WebFetch|AskUserQuestion)`|Claude Code|CLAUDE\.md/);
      expect(content, file).not.toMatch(/claude --bg|claude agents|<!-- \/?(claude|codex)-only -->/);
    }
  });

  it('gives dispatch the Codex launch commands instead of Claude Code background sessions', async () => {
    await installCodex('project', root, 4);
    const paths = getCodexPaths('project', root);
    const dispatch = fs.readFileSync(path.join(paths.skills, 'dispatch', 'SKILL.md'), 'utf-8');

    expect(dispatch).toContain("codex -C \"{WT}\" --add-dir \"{COMMON}\" '$autopilot {NN}_{NAME} --full'");
    expect(dispatch).toContain('`codex agents`');
    expect(dispatch).toContain('`$integrate`');
    expect(dispatch).not.toContain('--permission-mode');
  });

  it('never overwrites a skill or agent the user wrote', async () => {
    const paths = getCodexPaths('project', root);
    fs.mkdirSync(path.join(paths.skills, 'commit'), { recursive: true });
    fs.writeFileSync(path.join(paths.skills, 'commit', 'SKILL.md'), '---\nname: commit\ndescription: mine\n---\nMine');
    fs.mkdirSync(paths.agents, { recursive: true });
    fs.writeFileSync(path.join(paths.agents, 'audit.toml'), 'name = "audit"\n');

    const result = await installCodex('project', root, 4);

    expect(result.skipped).toEqual(['skill commit', 'agent audit']);
    expect(fs.readFileSync(path.join(paths.skills, 'commit', 'SKILL.md'), 'utf-8')).toContain('Mine');
    expect(fs.readFileSync(path.join(paths.agents, 'audit.toml'), 'utf-8')).toBe('name = "audit"\n');
  });

  it('removes skills a previous install added that are no longer shipped, and nothing else', async () => {
    const paths = getCodexPaths('project', root);
    await installCodex('project', root, 4);
    fs.mkdirSync(path.join(paths.skills, 'retired'), { recursive: true });
    fs.writeFileSync(path.join(paths.skills, 'retired', 'SKILL.md'), `old\n<!-- ${CODEX_MARKER} -->`);
    fs.mkdirSync(path.join(paths.skills, 'my-skill'), { recursive: true });
    fs.writeFileSync(path.join(paths.skills, 'my-skill', 'SKILL.md'), 'mine');
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf-8'));
    manifest.skills.push('retired', 'my-skill');
    fs.writeFileSync(paths.manifest, JSON.stringify(manifest));

    const result = await installCodex('project', root, 4);

    expect(result.removed).toBe(1);
    expect(fs.existsSync(path.join(paths.skills, 'retired'))).toBe(false);
    expect(fs.existsSync(path.join(paths.skills, 'my-skill'))).toBe(true);
  });

  it('installs to the user home for global scope', async () => {
    const saved = process.env.CODEX_HOME;
    delete process.env.CODEX_HOME;
    try {
      const result = await installCodex('global', process.cwd(), 4, 'tasks', root);
      expect(result.paths.skills).toBe(path.join(root, '.agents', 'skills'));
      expect(result.paths.agents).toBe(path.join(root, '.codex', 'agents'));
      expect(fs.existsSync(path.join(root, '.agents', 'skills', 'blueprint', 'SKILL.md'))).toBe(true);
    } finally {
      if (saved !== undefined) process.env.CODEX_HOME = saved;
    }
  });
});

describe('power level descriptions', () => {
  const TIER_EXAMPLES = ['commit.md', 'research-web.md', 'implement.md', 'diagnose.md']; // lightweight, research, standard, heavyweight

  it('describe exactly the efforts Codex agents get at each level', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const efforts = new Set(TIER_EXAMPLES.map(file => getEffortForAgent(file, level)));
      const description = POWER_LEVEL_EFFORTS[level];
      for (const effort of ['low', 'medium', 'high']) {
        expect(description.includes(effort), `level ${level}: ${effort}`).toBe(efforts.has(effort));
      }
    }
  });

  it('describe exactly the models Claude Code agents get at each level', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const models = new Set(TIER_EXAMPLES.map(file => getModelForAgent(file, level)));
      for (const model of ['haiku', 'sonnet', 'opus'] as const) {
        expect(POWER_LEVEL_MODELS[level].includes(model), `level ${level}: ${model}`).toBe(models.has(model));
      }
    }
  });

  it('lets an agent\'s own effort setting win', () => {
    expect(getEffortForAgent('commit.md', 5, 'low')).toBe('low');
    expect(getEffortForAgent('commit.md', 5, 'bogus')).toBe('high');
  });
});
