# Blueprints
> by All Things Claude

![Blueprints by All Things Claude](assets/blueprints.webp)

Install powerful commands and agents for Claude Code — and Codex — to enhance your AI-assisted development workflows.

## Quick Start

```bash
npx @allthingsclaude/blueprints
```

This will ask which tool to install for (Claude Code, Codex, or both — see [Codex](#codex)) and where:

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

# Install for Codex, or for both tools (default: claude)
npx @allthingsclaude/blueprints --target codex --global
npx @allthingsclaude/blueprints --target both --local

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
| 3 | Standard | Sonnet | Sonnet | Sonnet | Sonnet |
| **4** | **Enhanced (default)** | **Sonnet** | **Sonnet** | **Opus** | **Opus** |
| 5 | Maximum | Opus | Opus | Opus | Opus |

---

## Commands (45+)

### Planning & Execution

| Command | Description |
|---------|-------------|
| `/blueprint` | Create a structured implementation plan from your requirements |
| `/kickoff` | Execute a plan interactively with approval gates (collaborative) |
| `/implement` | Execute a plan autonomously (hands-off) |
| `/parallelize` | Execute independent plan tasks across multiple agents simultaneously (as the `streams` workflow when workflows are available) |
| `/autopilot` | Full autonomous development loop — from idea to committed code |
| `/dispatch` | Run several plans at once, each in its own git worktree and background session (`/autopilot` offers this too) |
| `/integrate` | Merge finished `/dispatch` runs back one at a time, testing after each merge |
| `/finalize` | Complete a work phase - update plans, commit changes, document decisions |

### Project Setup

| Command | Description |
|---------|-------------|
| `/bootstrap` | Initialize new projects with generated plans and executable setup scripts |
| `/onboard` | Generate a developer onboarding guide for this project |
| `/update` | Update CLAUDE.md and STATE.md to reflect current project state |

### Research & Learning

| Command | Description |
|---------|-------------|
| `/research` | Smart routing to codebase, documentation, or web research |
| `/explain` | Generate detailed explanations of code, architecture, or features |
| `/history` | Tell the narrative story of a file or function through its git history |

### Code Quality

| Command | Description |
|---------|-------------|
| `/audit` | Pre-commit security and quality review |
| `/preflight` | Workflow: parallel audit, security, accessibility and test review of a branch — every finding verified, then one fix pass |
| `/sweep` | Workflow: scan the whole codebase for security, cleanup, accessibility or duplication issues, one scanner per area — a separate agent checks each finding, and nothing is changed |
| `/test` | Run tests, analyze failures, generate test coverage |
| `/cleanup` | Find and remove dead code, unused imports, technical debt (whole-codebase scans run as `/sweep`) |
| `/refactor` | Safe refactoring — rename, extract, inline, or move code with validation |
| `/dry` | Eliminate DRY violations without changing behavior (whole-codebase scans run as `/sweep`) |
| `/secure` | Run a focused security scan on your codebase (whole-codebase scans run as `/sweep`) |
| `/a11y` | Audit your frontend for accessibility issues (whole-frontend scans run as `/sweep`) |
| `/todo` | Scan codebase for TODO/FIXME/HACK markers and present an organized summary |

### Code Operations

| Command | Description |
|---------|-------------|
| `/commit` | Create a well-crafted git commit from your current changes |
| `/changelog` | Generate a changelog from git history |
| `/docs` | Generate or update project documentation |
| `/migrate` | Upgrade dependencies or migrate between framework versions |
| `/merge` | Detect parent branch and merge the current branch into it (for `/dispatch` runs, use `/integrate`) |
| `/release` | Create a release — version bump, changelog, tag, and publish |
| `/i18n` | Audit and set up internationalization for your project |

### Thinking Modes

| Command | Description |
|---------|-------------|
| `/brainstorm` | Pure ideation mode - explore ideas without any code changes |
| `/challenge` | Critical analysis - question assumptions before proceeding |
| `/validate` | Quick sanity check - validate your approach |
| `/critique` | Get direct, unfiltered feedback on code or decisions |

### Debugging

| Command | Description |
|---------|-------------|
| `/diagnose` | Systematic investigation with root cause analysis and fix options |

### Creative

| Command | Description |
|---------|-------------|
| `/visuals` | Create on-brand design and marketing assets (social media, banners, ads) |
| `/brand` | Create or document a comprehensive brand identity system |
| `/copywrite` | Write on-brand marketing copy for social media, ads, emails, and landing pages |
| `/email` | Create on-brand HTML email templates (newsletters, announcements, transactional) |
| `/pitch` | Create an on-brand HTML presentation deck with speaker notes |
| `/og` | Auto-generate Open Graph images for all pages in your project |
| `/imagine` | Generate images using Nano Banana 2 (Gemini/fal.ai) or GPT Image 2 (fal.ai), or both side-by-side |
| `/storyboard` | Extract UI interaction specs from video mockups |
| `/showcase` | Design an award-winning landing page with animations and micro-interactions |
| `/diagram` | Generate Mermaid diagrams from your codebase |

### Session Management

| Command | Description |
|---------|-------------|
| `/handoff` | Generate comprehensive documentation for context switching |
| `/pickup` | Resume work from a previous handoff document |
| `/flush` | Clear all task artifacts from `tasks/` |
| `/standup` | Generate a standup summary from recent git activity |

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
│                  /blueprint                                          │
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
/blueprint add OAuth integration
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
│                      /diagnose                                     │
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
/diagnose users can't login after password reset
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

For a whole codebase, `/sweep cleanup dry` (or `/secure`, `/cleanup`, `/a11y`, `/dry` with no argument) splits the code into areas, scans them in parallel, and has a separate agent check each finding before you see it (any it couldn't check are flagged). Nothing changes until you pick which findings to apply, except that `/a11y fix` applies the safe ones straight away.

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
│        ├─── Quick check? ───► /validate                           │
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

/validate Is using Redis for sessions the right approach here?
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
| **Full Auto** | `/autopilot` | End-to-end: idea → plan → implement → test → commit |
| **Several plans at once** | `/autopilot` (it offers) or `/dispatch` → `/integrate` | Independent plans built side by side, each by its own autopilot in its own worktree |

---

## Autopilot

`/autopilot` runs the whole loop on a feature branch:

```
brainstorm → /blueprint → branch → phase 1 → commit → phase 2 → commit → … → preflight → fixes → commit → update CLAUDE.md
```

- **Phases** run in fresh agents: `implement` for small phases, `parallelize` (several `implement` streams at once, as the `streams` workflow when workflows are available) for phases with 6+ independent tasks, `implement` in a few passes when the tasks build on each other, `showcase` for landing pages. Before each phase's commit, typecheck, lint and the tests run again, fresh; failures go to a fixer before anything is committed.
- **Preflight** reviews the whole branch at the end. `audit`, `secure`, `a11y` (only when UI files changed) and `test` run in parallel without editing anything; every finding is checked by an independent verifier; one fixer applies the confirmed ones and runs typecheck, lint and tests; each fix is rechecked, with at most two rounds. It runs as the `preflight` workflow when [dynamic workflows](https://code.claude.com/docs/en/workflows) are available, and as parallel subagents otherwise. You can also run `/preflight` on any branch yourself.
- **Typecheck gate**: when an `implement` agent tries to finish, a stop hook runs the project's typecheck script and hands any errors back to it once. Set `BLUEPRINTS_PHASE_GATE=0` to turn it off.
- **Asks only what's yours to decide**: choices that are easy to change later (naming, structure, thresholds, small plan adjustments, minor review findings) it makes itself, notes in the plan, and lists under **Decided for you** at the end. It asks about spending money, credentials or access, anything destructive, security design, public APIs, and product behavior the plan doesn't settle — and keeps building whatever doesn't depend on the answer while it waits. While agents are running it asks in its status message rather than with a prompt that would hold the run, and questions only a later plan needs are saved in that plan for when it starts.
- **The report** lists the commits, the preflight result, what it decided for you and what's left for you, and for changes you can see or run, how to try them and what to check.
- **`--full`** is for when you're away: it never asks. What needs you is set aside (marked **(USER)** in the plan, or noted as a decision to make), the run builds everything else, and the report lists it all. Parallel runs always work this way.
- **Resuming**: progress lives in the plan's checkboxes and `tasks/STATE.md`, so running `/autopilot` again picks up where it stopped. With nothing in progress, it continues with the next plan (one already started, or the next ready one), and merges finished parallel runs after showing you what they decided.

### Several plans at once

Just run `/autopilot`. When other plans are ready too (not finished, and everything they depend on is done), it checks which can safely run alongside the one you asked for and offers to build them in parallel, each in its own worktree. Say no and it carries on as usual. To pick the plans yourself, name them: `/autopilot 02 03 04` (or `/dispatch 02 03 04`).

```
/autopilot 02                 # offers: "02 and 04 can run in parallel; 03 waits for 04" → yes
claude agents                 # watch the runs; attach to any marked "Needs input" (claude attach <name>)
/autopilot                    # later: offers to merge the finished runs (same as /integrate)
```

- **Questions up front**: before launching, it asks the open decisions each plan would otherwise stop for, all at once, and writes your answers into the plans' notes.
- **Runs don't wait for you**: dispatched runs never stop for approvals. A step only you can do (a paid run, credentials, access, a sign-off) is set aside while the run builds everything else, and listed when it finishes. A decision that's easy to change later is taken provisionally, recorded in the plan's notes, and shown to you before merging. No `--full` needed. If your default permission mode would stop them at every edit, the offer asks whether to start them in auto mode.
- **Waves**: `/dispatch` compares the plans' **Files Involved** sections and `**Depends on**` lines. Plans that edit the same files, both change the database schema, or depend on each other go into later waves, which you dispatch once `/integrate` has merged what they need.
- **Isolation**: each plan gets `.claude/worktrees/{name}` on `feat/{name}`, branched from your current branch (no push needed). Gitignored files and folders listed in `.worktreeinclude` (e.g. `.env`, local data) are copied in as copy-on-write clones where the disk supports it, so large data takes almost no space, and autopilot installs dependencies there before the first phase.
- **No STATE.md conflicts**: each run keeps its progress in its own worktree's STATE.md, which git is told to ignore there, and skips the CLAUDE.md update. `/integrate` syncs both once, after merging.
- **Integration**: runs are merged in dependency order, smallest first. Lockfiles, `CONVENTIONS.md`, add-only lists and clashing numbered entries (e.g. two `D43` decisions) are resolved automatically; any other conflict stops and asks. Typecheck, lint and tests run after every merge, and failures that only appear in the combination get one fixer (at most two rounds). Nothing is pushed, and the undo point is printed.
- **Cost**: each run uses as much as a normal `/autopilot` run, so three at once use your quota three times as fast (the offer says so). `/dispatch --max N` limits how many start together (default 3).

### Keeping token use down

- Long-running agents (`implement`, `parallelize`, `audit`, `secure`, `a11y`) compact their context at 250k tokens instead of near the 1M limit, which roughly halves what they re-read on every turn.
- Agents read only the plan sections they need and keep shared codebase conventions in `tasks/CONVENTIONS.md`, so each phase doesn't rediscover them.
- `tasks/STATE.md` is a short index (a header plus one row per plan). Longer notes belong in the plan file. Run `/update` once to migrate an older, longer STATE.md; notes from it are moved into the plan files, not deleted.
- Optional, for your own sessions: autopilot's orchestrator runs in your main session, so a lower main-session compaction window helps too, e.g. `/autocompact 400k`.

---

## Codex

The same commands and agents install into [Codex](https://learn.chatgpt.com/docs/build-skills) with `--target codex` (or `both`). The installer converts them:

| Claude Code | Codex | Where (global / project) |
|-------------|-------|--------------------------|
| Commands (`/autopilot`) | Skills (`$autopilot`) | `~/.agents/skills/` / `./.agents/skills/` |
| Agents | Custom agents (TOML) | `~/.codex/agents/` / `./.codex/agents/` |
| Typecheck gate (agent hook) | `SubagentStop` hook for `implement` | `~/.codex/hooks.json` / `./.codex/hooks.json` |
| Shared procedures (dispatch, integrate) | Same, converted | `~/.codex/blueprints/procedures/` / `./.codex/blueprints/procedures/` |
| `CLAUDE.md` | `AGENTS.md` | — |

Things that work differently in Codex:

- **Invoke skills with `$`**: `$autopilot`, `$blueprint`, `$kickoff`. `$autopilot`, `$dispatch`, `$integrate`, `$release`, `$merge` and `$flush` only run when you invoke them; the rest Codex can also pick up from your request.
- **Context commands**: Claude Code runs a command's `!` lines before the prompt; in Codex they become the first steps the skill runs.
- **Power level** sets each agent's reasoning effort (low / medium / high) instead of a model, since available models depend on your plan. Agents use your session's model.
- **No workflows**: Codex has no workflows, so `$autopilot` runs its review with parallel agents, `$parallelize` uses its orchestrator agent, and `$secure`, `$cleanup`, `$a11y` and `$dry` scan with a single agent (the same fallbacks Claude Code uses without workflows). There is no `$sweep`.
- **Parallel streams**: Codex agents can't start agents of their own by default, so `$parallelize` runs its streams one after another. To run them in parallel, add this to `~/.codex/config.toml`:
  ```toml
  [agents]
  max_depth = 2
  ```
- **Typecheck gate**: run `/hooks` in Codex once to review and trust it. The installer appends it to your existing `hooks.json` (your hooks are kept, and the original is saved as `hooks.json.before-blueprints`).
- **Parallel runs** (`$autopilot`'s offer or `$dispatch`) prepare the worktrees the same way, then print one `codex -C <worktree> …` command per plan for you to run in separate terminals, since Codex can't start background sessions itself. Watch them with `codex agents`.
- **Per-agent compaction and turn limits** have no Codex equivalent; Codex uses its global compaction setting.

The installer never overwrites a skill or agent you wrote yourself — if one already uses a blueprints name, it's skipped and listed. Reinstalling updates only the files blueprints installed.

---

## Upgrading from 0.4.x

Five commands and agents were renamed to stop clashing with Claude Code built-ins (`/plan`, `/verify`, `/debug`, `/design`, `/copy`):

| Before | Now |
|--------|-----|
| `/plan` | `/blueprint` |
| `/verify` | `/validate` |
| `/debug` | `/diagnose` |
| `/design` | `/visuals` |
| `/copy` | `/copywrite` |

Reinstalling removes the old blueprints files automatically. The installer only ever removes files it installed itself, so your own commands, agents and workflows in the same folders are left alone.

---

## Agents (30+)

Agents are specialized workers launched by commands. Each agent is assigned a model based on your chosen power level and its tier classification.

### Agent Tiers

| Tier | Agents | Description |
|------|--------|-------------|
| **Lightweight** | commit, changelog, handoff, cleanup, imagine, og | Rote tasks — fast models suffice |
| **Research** | research-codebase, research-docs, research-web | Search and synthesize |
| **Standard** | blueprint, implement, parallelize, bootstrap, refactor, test, explain, docs, dry, storyboard, finalize, migrate, a11y, diagram, i18n, onboard, release, showcase, visuals, update, brand, copywrite, email, pitch | Balanced reasoning |
| **Heavyweight** | audit, diagnose, secure | Deep reasoning, high-stakes analysis |

### Agent List

| Agent | Used By | Purpose |
|-------|---------|---------|
| `a11y` | `/a11y` | Frontend accessibility auditing |
| `audit` | `/audit` | Code quality and security analysis |
| `bootstrap` | `/bootstrap` | Project scaffolding and setup |
| `brand` | `/brand` | Brand identity documentation and creation |
| `changelog` | `/changelog` | Changelog generation from git history |
| `cleanup` | `/cleanup` | Dead code and unused import removal |
| `commit` | `/commit` | Git commit message crafting |
| `copywrite` | `/copywrite` | On-brand marketing copy for social, ads, emails, landing pages |
| `diagnose` | `/diagnose` | Systematic root cause investigation |
| `visuals` | `/visuals` | On-brand marketing asset creation (social media, banners, ads) |
| `diagram` | `/diagram` | Mermaid diagram generation from codebase |
| `docs` | `/docs` | Documentation generation and updates |
| `dry` | `/dry` | DRY violation detection and elimination |
| `email` | `/email` | On-brand HTML email template creation |
| `explain` | `/explain` | Code and architecture explanations |
| `finalize` | `/finalize` | Session wrap-up and commits |
| `handoff` | `/handoff` | Context documentation |
| `i18n` | `/i18n` | Internationalization auditing and setup |
| `imagine` | `/imagine` | Image generation via Nano Banana 2 or GPT Image 2 |
| `implement` | `/implement` | Autonomous plan execution |
| `migrate` | `/migrate` | Dependency upgrades and migrations |
| `og` | `/og` | Open Graph image generation for all pages |
| `onboard` | `/onboard` | Developer onboarding guide generation |
| `parallelize` | `/parallelize` | Multi-agent orchestration |
| `pitch` | `/pitch` | On-brand HTML presentation deck creation |
| `blueprint` | `/blueprint` | Structured plan creation |
| `refactor` | `/refactor` | Safe code refactoring with validation |
| `release` | `/release` | Version bumps, changelogs, tags, and publishing |
| `research-codebase` | `/research` | Code exploration |
| `research-docs` | `/research` | Library documentation lookup |
| `research-web` | `/research` | Online resource research |
| `secure` | `/secure` | Security scanning and vulnerability detection |
| `showcase` | `/showcase` | Landing page design and development |
| `storyboard` | `/storyboard` | UI interaction spec extraction |
| `test` | `/test` | Test execution and failure analysis |
| `update` | `/update` | CLAUDE.md and STATE.md synchronization |

---

## File Structure

After installation, your `.claude` directory will contain:

```
.claude/
├── commands/          # 48 command files
│   ├── audit.md
│   ├── autopilot.md
│   ├── bootstrap.md
│   ├── brainstorm.md
│   └── ...
├── agents/            # 36 agent files
│   ├── audit.md
│   ├── bootstrap.md
│   ├── changelog.md
│   └── ...
├── workflows/
│   ├── preflight.js       # Branch review workflow (runs as /preflight)
│   ├── sweep.js           # Whole-codebase scan workflow (runs as /sweep; used by /secure, /cleanup, /a11y, /dry)
│   └── streams.js         # Parallel streams for plan tasks (used by /parallelize and /autopilot)
├── blueprints/
│   ├── hooks/
│   │   └── phase-gate.sh   # Typecheck gate used by the implement agent
│   └── procedures/         # Steps shared by commands: dispatch.md and integrate.md
│                           # (followed by /dispatch, /integrate and /autopilot)
└── .blueprints-version     # Installed version and the list of installed files
tasks/                         # Runtime artifacts (created during use)
├── plans/
│   └── PLAN_*.md              # Implementation plans
├── sessions/
│   ├── HANDOFF.md             # Session handoff document
│   └── PHASE_SUMMARY_*.md    # Phase summaries
├── CONVENTIONS.md             # Codebase conventions shared by implementation agents
└── STATE.md                   # Active plan tracker (short index)
```

> The `tasks/` directory name is configurable during installation via `--tasks-dir`. Template variables (`{{TASKS_DIR}}`, `{{PLANS_DIR}}`, `{{SESSIONS_DIR}}`, `{{BLUEPRINTS_DIR}}`) are resolved at install time.

---

## Platform Support

- **macOS**: `~/.claude`
- **Linux**: `~/.claude`
- **Windows**: `%USERPROFILE%\.claude`

## Requirements

- Node.js 20.0.0 or higher
- Claude Code CLI — v2.1.296 or later for the per-agent compaction settings (older versions ignore them). Parallel runs (`/autopilot`'s offer or `/dispatch`) launch with `claude --bg`, which needs background agents (`claude agents`); without it, it prints the commands for you to run.
- Or Codex — tested with Codex CLI 0.163 (skills in `.agents/skills`, TOML custom agents, hooks)
- Optional: [dynamic workflows](https://code.claude.com/docs/en/workflows) for `/preflight`, `/sweep` and `streams` (on paid plans; Pro users enable them in `/config`). Without them, autopilot runs the same review with parallel subagents, `/parallelize` uses its orchestrator agent, and the scan commands use a single agent.
- The typecheck gate needs `sh` (macOS, Linux, or Git Bash on Windows); without it the gate is skipped.

## License

MIT

## Links

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Report Issues](https://github.com/allthingsclaude/blueprints/issues)
