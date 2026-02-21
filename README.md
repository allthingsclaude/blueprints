# Blueprints
> by All Things Claude

![Blueprints by All Things Claude](assets/blueprints.webp)

Install powerful commands and agents for Claude Code to enhance your AI-assisted development workflows.

## Quick Start

```bash
npx @allthingsclaude/blueprints
```

This will prompt you to choose an installation location:

- **Global** (`~/.claude`) - Available in all your projects
- **Local** (current directory) - Available only in the current project
- **Custom path** - Install to any location you specify

## Installation Options

### Interactive Mode (Recommended)

```bash
npx @allthingsclaude/blueprints
```

### Command Line Flags

```bash
# Install globally to ~/.claude
npx @allthingsclaude/blueprints --global

# Install locally to current directory
npx @allthingsclaude/blueprints --local

# Install to a custom path
npx @allthingsclaude/blueprints --path /path/to/install

# Skip confirmation prompts
npx @allthingsclaude/blueprints --global --yes

# Set agent power level (1-5, default: 4)
npx @allthingsclaude/blueprints --power 5

# Customize tasks directory name (default: tasks)
npx @allthingsclaude/blueprints --tasks-dir my-tasks
```

### Agent Power Levels

Control which models power your agents:

| Level | Name | Lightweight | Research | Standard | Heavyweight |
|-------|------|-------------|----------|----------|-------------|
| 1 | Economy | Haiku | Haiku | Haiku | Sonnet |
| 2 | Balanced | Haiku | Haiku | Sonnet | Sonnet |
| 3 | Standard | Haiku | Sonnet | Sonnet | Sonnet |
| **4** | **Enhanced (default)** | **Sonnet** | **Opus** | **Opus** | **Opus** |
| 5 | Maximum | Opus | Opus | Opus | Opus |

---

## Commands (29)

### Planning & Execution

| Command | Description |
|---------|-------------|
| `/plan` | Create a structured implementation plan from your requirements |
| `/kickoff` | Execute a plan interactively with approval gates (collaborative) |
| `/implement` | Execute a plan autonomously (hands-off) |
| `/parallelize` | Execute independent plan tasks across multiple agents simultaneously |
| `/auto` | Full autonomous development loop — from idea to committed code |
| `/finalize` | Complete a work phase - update plans, commit changes, document decisions |

### Project Setup

| Command | Description |
|---------|-------------|
| `/bootstrap` | Initialize new projects with generated plans and executable setup scripts |

### Research & Learning

| Command | Description |
|---------|-------------|
| `/research` | Smart routing to codebase, documentation, or web research |
| `/explain` | Generate detailed explanations of code, architecture, or features |

### Code Quality

| Command | Description |
|---------|-------------|
| `/audit` | Pre-commit security and quality review |
| `/test` | Run tests, analyze failures, generate test coverage |
| `/cleanup` | Find and remove dead code, unused imports, technical debt |
| `/refactor` | Safe refactoring — rename, extract, inline, or move code with validation |
| `/dry` | Eliminate DRY violations without changing behavior |
| `/secure` | Run a focused security scan on your codebase |

### Code Operations

| Command | Description |
|---------|-------------|
| `/commit` | Create a well-crafted git commit from your current changes |
| `/changelog` | Generate a changelog from git history |
| `/docs` | Generate or update project documentation |
| `/migrate` | Upgrade dependencies or migrate between framework versions |

### Thinking Modes

| Command | Description |
|---------|-------------|
| `/brainstorm` | Pure ideation mode - explore ideas without any code changes |
| `/challenge` | Critical analysis - question assumptions before proceeding |
| `/verify` | Quick sanity check - validate your approach |
| `/critique` | Get direct, unfiltered feedback on code or decisions |

### Debugging

| Command | Description |
|---------|-------------|
| `/debug` | Systematic investigation with root cause analysis and fix options |

### Creative

| Command | Description |
|---------|-------------|
| `/imagine` | Generate images using Nano Banana Pro (Gemini/fal.ai) |
| `/storyboard` | Extract UI interaction specs from video mockups |

### Session Management

| Command | Description |
|---------|-------------|
| `/handoff` | Generate comprehensive documentation for context switching |
| `/pickup` | Resume work from a previous handoff document |
| `/flush` | Clear all task artifacts from `tasks/` |

---

## Workflows

### 1. New Project

Start a project from scratch with automated scaffolding.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "I want to build a tool for..."                               │
│                          │                                      │
│                          ▼                                      │
│                    /brainstorm                                  │
│                  (explore ideas)                                │
│                          │                                      │
│                          ▼                                      │
│                    /bootstrap                                   │
│            (generates PLAN + bootstrap.sh)                      │
│                          │                                      │
│              ┌───────────┼───────────┐                          │
│              ▼           ▼           ▼                          │
│          /kickoff    /implement  /parallelize                   │
│        (interactive) (autonomous)  (parallel)                   │
│              └───────────┼───────────┘                          │
│                          ▼                                      │
│                   /test → /audit                                │
│                          │                                      │
│                          ▼                                      │
│                      /finalize                                  │
│                   (commit phase)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
You: I want to build a React dashboard with authentication
/brainstorm
... explore architecture, tech choices, features ...
/bootstrap dashboard-app
... generates PLAN_DASHBOARD_APP.md + bootstrap.sh ...
/kickoff
... interactive implementation with approval gates ...
```

### 2. Feature Development

Add features to an existing project with structured planning.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│            /research (optional)                                 │
│         (understand codebase/docs)                              │
│                    │                                            │
│                    ▼                                            │
│                  /plan                                          │
│          (create structured plan)                               │
│                   │                                             │
│        ┌──────────┼──────────┐                                  │
│        ▼          ▼          ▼                                  │
│    /kickoff   /implement  /parallelize                          │
│        └──────────┼──────────┘                                  │
│                   │                                             │
│                   ▼                                             │
│            /test → /audit                                       │
│                   │                                             │
│                   ▼                                             │
│               /finalize                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
/research how does auth work in this codebase?
... investigation results ...
/plan add OAuth integration
... creates PLAN_OAUTH.md ...
/implement
... autonomous execution ...
/test
/audit
/finalize
```

### 3. Bug Fix

Systematic debugging with proper verification.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      /debug                                     │
│         (investigate, find root cause)                          │
│                        │                                        │
│            ┌───────────┴───────────┐                            │
│            ▼                       ▼                            │
│     Simple fix              Needs refactor                      │
│            │                       │                            │
│            │                   /refactor                        │
│            │                       │                            │
│            └───────────┬───────────┘                            │
│                        ▼                                        │
│                      /test                                      │
│              (verify fix works)                                 │
│                        │                                        │
│                        ▼                                        │
│                     /audit                                      │
│                        │                                        │
│                        ▼                                        │
│                    /finalize                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
/debug users can't login after password reset
... investigation, root cause found ...
... apply fix ...
/test
/audit
/finalize fix password reset token validation
```

### 4. Code Quality Improvement

Clean up and refactor existing code safely.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      /audit                                     │
│          (identify issues and debt)                             │
│                        │                                        │
│            ┌───────────┴───────────┐                            │
│            ▼                       ▼                            │
│        /cleanup                /refactor                        │
│     (remove dead code)      (improve patterns)                  │
│            └───────────┬───────────┘                            │
│                        ▼                                        │
│                      /test                                      │
│            (ensure nothing broke)                               │
│                        │                                        │
│                        ▼                                        │
│                    /finalize                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
/audit src/services/
... identifies DRY violations, unused exports ...
/cleanup imports
... removes unused imports ...
/refactor dry-check src/services/
... consolidates duplicate code ...
/test
/finalize
```

### 5. Session Continuity

Switch contexts or resume work across sessions.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SESSION 1                         SESSION 2                   │
│                                                                 │
│   ... working ...                                               │
│        │                                                        │
│        ▼                                                        │
│    /handoff ─────────────────────► /pickup                      │
│  (saves state to                 (restores context)             │
│   HANDOFF.md)                          │                        │
│                                        ▼                        │
│                                  ... continue ...               │
│                                        │                        │
│                                        ▼                        │
│                                   /finalize                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
# End of day
/handoff
... creates HANDOFF.md with current state, next steps, blockers ...

# Next day, new session
/pickup
... restores context, shows what to do next ...
```

### 6. Thinking Before Doing

Validate approaches before committing to implementation.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Got a task?                                                   │
│        │                                                        │
│        ├─── Quick check? ───► /verify                           │
│        │                      (lightweight validation)          │
│        │                                                        │
│        ├─── Need to think? ──► /challenge                       │
│        │                       (question assumptions,           │
│        │                        explore alternatives)           │
│        │                                                        │
│        ├─── Want feedback? ──► /critique                        │
│        │                       (direct, unfiltered)             │
│        │                                                        │
│        └─── Exploring? ──────► /brainstorm                      │
│                                (pure ideation,                  │
│                                 no code changes)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example:**
```
/challenge Should we use microservices or a monolith?
... analyzes tradeoffs, questions assumptions ...

/verify Is using Redis for sessions the right approach here?
... quick validation with gotchas ...

/brainstorm What would an ideal developer experience look like?
... explores ideas without committing to code ...
```

---

## Implementation Modes

When you have a plan, choose how to execute it:

| Mode | Command | Best For |
|------|---------|----------|
| **Interactive** | `/kickoff` | Complex changes where you want approval gates and collaboration |
| **Autonomous** | `/implement` | Well-defined tasks you trust to run hands-off |
| **Parallel** | `/parallelize` | Plans with independent tasks that can run simultaneously |
| **Full Auto** | `/auto` | End-to-end: idea → plan → implement → test → commit |

---

## Agents (23)

Agents are specialized workers launched by commands. Each agent is assigned a model based on your chosen power level and its tier classification.

### Agent Tiers

| Tier | Agents | Description |
|------|--------|-------------|
| **Lightweight** | commit, changelog, handoff, cleanup, imagine | Rote tasks — fast models suffice |
| **Research** | research-codebase, research-docs, research-web | Search and synthesize |
| **Standard** | plan, implement, parallelize, bootstrap, refactor, test, explain, docs, dry, storyboard | Balanced reasoning |
| **Heavyweight** | audit, debug, secure | Deep reasoning, high-stakes analysis |

### Agent List

| Agent | Used By | Purpose |
|-------|---------|---------|
| `audit` | `/audit` | Code quality and security analysis |
| `bootstrap` | `/bootstrap` | Project scaffolding and setup |
| `changelog` | `/changelog` | Changelog generation from git history |
| `cleanup` | `/cleanup` | Dead code and unused import removal |
| `commit` | `/commit` | Git commit message crafting |
| `debug` | `/debug` | Systematic root cause investigation |
| `docs` | `/docs` | Documentation generation and updates |
| `dry` | `/dry` | DRY violation detection and elimination |
| `explain` | `/explain` | Code and architecture explanations |
| `finalize` | `/finalize` | Session wrap-up and commits |
| `handoff` | `/handoff` | Context documentation |
| `imagine` | `/imagine` | Image generation via Nano Banana Pro |
| `implement` | `/implement` | Autonomous plan execution |
| `migrate` | `/migrate` | Dependency upgrades and migrations |
| `parallelize` | `/parallelize` | Multi-agent orchestration |
| `plan` | `/plan` | Structured plan creation |
| `refactor` | `/refactor` | Safe code refactoring with validation |
| `research-codebase` | `/research` | Code exploration |
| `research-docs` | `/research` | Library documentation lookup |
| `research-web` | `/research` | Online resource research |
| `secure` | `/secure` | Security scanning and vulnerability detection |
| `storyboard` | `/storyboard` | UI interaction spec extraction |
| `test` | `/test` | Test execution and failure analysis |

---

## File Structure

After installation, your `.claude` directory will contain:

```
.claude/
├── commands/          # 29 command files
│   ├── audit.md
│   ├── auto.md
│   ├── bootstrap.md
│   ├── brainstorm.md
│   └── ...
├── agents/            # 23 agent files
│   ├── audit.md
│   ├── bootstrap.md
│   ├── changelog.md
│   └── ...
tasks/                         # Runtime artifacts (created during use)
├── plans/
│   └── PLAN_*.md              # Implementation plans
├── sessions/
│   ├── HANDOFF.md             # Session handoff document
│   └── PHASE_SUMMARY_*.md    # Phase summaries
└── STATE.md                   # Active plan tracker
```

> The `tasks/` directory name is configurable during installation via `--tasks-dir`. Template variables (`{{TASKS_DIR}}`, `{{PLANS_DIR}}`, `{{SESSIONS_DIR}}`) are resolved at install time.

---

## Platform Support

- **macOS**: `~/.claude`
- **Linux**: `~/.claude`
- **Windows**: `%USERPROFILE%\.claude`

## Requirements

- Node.js 16.0.0 or higher
- Claude Code CLI

## License

MIT

## Links

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Report Issues](https://github.com/allthingsclaude/blueprints/issues)
