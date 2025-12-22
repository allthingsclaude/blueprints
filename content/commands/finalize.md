---
description: Finalize work session - update plans, commit changes with proper message
argument-hint: [optional: commit message prefix or focus area]
author: "@markoradak"
---

# Finalize Work Session

I'll finalize your work session by updating plans, creating a comprehensive git commit, and documenting any bottlenecks or key decisions.

## Current Session State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

**Changes Summary**:
!`git diff --stat`

**Active Plans**:
!`ls -1 .claude/temp/PLAN_*.md 2>/dev/null || echo "No active plans"`

---

## Additional Context

$ARGUMENTS

---

## Launching Finalize Agent

The finalize agent will systematically:

- ✅ Review all changes made in this session
- ✅ Update PLAN files by checking off completed tasks
- ✅ Analyze commit history to understand what was accomplished
- ✅ Generate a comprehensive commit message with `feat:` prefix
- ✅ Identify and document any bottlenecks or key decisions
- ✅ Create optional phase summary file for important findings
- ✅ Stage and commit all changes with proper attribution
- ✅ Provide session completion summary

**This will create a git commit with all your work.**

Use the Task tool to launch the finalize agent (subagent_type="general-purpose") which will autonomously finalize your session and create the commit.
