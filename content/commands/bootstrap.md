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
!`git status --short 2>/dev/null || echo "Not a git repository"`

---

## Project Name & Context

$ARGUMENTS

---

## Generating Plan & Bootstrap Script

Launching the bootstrap agent to analyze our brainstorming conversation and generate:
1. `plans/PLAN_{NAME}.md` (via `/plan` command)
2. `./bootstrap.sh` (executable setup script)

The agent will:
- ✅ Generate structured implementation plan
- ✅ Analyze project type and requirements from our discussion
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

Use the Task tool to launch the bootstrap agent (subagent_type="general-purpose") which will autonomously generate both the plan and bootstrap script.
