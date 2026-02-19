---
description: Generate comprehensive handoff documentation for context switching
argument-hint: [optional: focus area or notes]
author: "@markoradak"
---

# Generate Session Handoff

I'll create a comprehensive handoff document to capture the current state of your work.

## Current Session Context

**Working Directory**: !`pwd`

**Git Status**:
!`git status --short`

**Recent Commits** (last 5):
!`git log --oneline -5`

**Unstaged Changes**:
!`git diff --stat`

**Staged Changes**:
!`git diff --cached --stat`

---

## Additional Context

$ARGUMENTS

---

## Generating Handoff

Launching the handoff agent to analyze your work session and generate `plans/HANDOFF.md`...

The agent will:
- ✅ Review recent commits and current changes
- ✅ Read modified files to understand context
- ✅ Identify what's complete vs in-progress
- ✅ Document next steps and blockers
- ✅ Preserve key decisions and patterns

Use the Task tool to launch the handoff agent (subagent_type="handoff") which will autonomously generate the handoff document.
