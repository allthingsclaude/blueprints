---
description: Finalize work session - update plans, commit changes with proper message
argument-hint: optional: commit message prefix or focus area
author: "@markoradak"
---

> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.

# Finalize Work Session

I'll finalize your work session by updating plans, creating a git commit, and documenting any bottlenecks or key decisions.

## Current Session State

**Working Directory**: run `pwd`

**Branch**: run `git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
run `git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

**Changes Summary**:
run `git diff --stat 2>/dev/null || echo "No changes"`

**Active Plans**:
run `ls -1 tasks/plans/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No active plans"`

---

## Additional Context

$ARGUMENTS

---

## Launching Finalize Agent

The finalize agent will systematically:

- ✅ Review all changes made in this session
- ✅ Update PLAN files by checking off completed tasks
- ✅ Analyze commit history to understand what was accomplished
- ✅ Generate a commit message with the appropriate conventional prefix
- ✅ Identify and document any bottlenecks or key decisions
- ✅ Create optional phase summary file for important findings
- ✅ Stage the session's changes (never secrets or build artifacts) and commit them
- ✅ Provide session completion summary

**This will create a git commit with all your work.**

Use the `Agent` tool to launch the finalize agent (subagent_type="finalize") which will autonomously finalize your session and create the commit.

The agent can't see this conversation, so its prompt must carry it. Include a thorough summary of the session: the problem worked on, the approach taken and alternatives rejected (with reasons), key decisions, bottlenecks hit, files discussed or changed, constraints, open questions, and the path of every image or reference file the user shared.
