---
description: Generate plan and bootstrap script for new projects
argument-hint: {NAME} [optional: additional context]
author: "@markoradak"
---

# Bootstrap New Project

I'll create a comprehensive plan and executable bootstrap script for your new project.

## Current Session Context

**Working Directory**: !`pwd`

**Git Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

---

## Project Name & Context

$ARGUMENTS

---

## Generating Plan & Bootstrap Script

Launching the bootstrap agent to turn our brainstorming into:
1. `{{PLANS_DIR}}/PLAN_00_INITIAL.md` — the first plan is always numbered `00` for new projects
2. `./bootstrap.sh` (executable setup script)

The agent will:
- ✅ Generate structured implementation plan
- ✅ Analyze project type and requirements from the brief you pass it
- ✅ Determine appropriate package manager
- ✅ Identify all dependencies and their latest versions
- ✅ Create directory structure based on our architecture
- ✅ Generate executable bootstrap script with:
  - Prerequisite checks (Node.js version, etc.)
  - Package manager setup
  - Dependency installation (latest versions)
  - Configuration file generation
  - Git initialization
  - Error handling and progress indicators

Run two agents in order, from this session (agents don't need to spawn other agents this way):
1. Unless `{{PLANS_DIR}}/PLAN_00_INITIAL.md` already exists, use the `Agent` tool to launch the blueprint agent (subagent_type="blueprint") with plan name `INITIAL {NAME}` and the full brief — it writes `PLAN_00_INITIAL.md`.
2. Then use the `Agent` tool to launch the bootstrap agent (subagent_type="bootstrap") with the same brief — it reuses that plan and generates the bootstrap script.

Neither agent sees this conversation, so each prompt must carry a full brief: project name and type, framework/runtime, package manager, dependencies (runtime, dev, testing, build), directory structure (single package or monorepo), configuration needs, database/ORM, external services (auth, storage, payments, email, APIs), constraints, and any decisions made while brainstorming. Anything you leave out, the agent fills with defaults and lists under "Assumptions" — review those with the user.

Once the script exists, it asks for confirmation when run in a terminal; run `bash bootstrap.sh --yes` to run it unattended.
