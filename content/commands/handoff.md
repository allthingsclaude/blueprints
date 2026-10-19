---
description: Generate comprehensive handoff documentation for context switching
argument-hint: optional: focus area or notes
author: "@markoradak"
---

# Generate Session Handoff

I'll create a comprehensive handoff document to capture the current state of your work.

## Current Session Context

**Working Directory**: !`pwd`

**Git Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

**Recent Commits** (last 5):
!`git log --oneline -5 2>/dev/null || echo "No git history"`

**Unstaged Changes**:
!`git diff --stat 2>/dev/null | tail -25 | grep . || echo "No changes"`

**Staged Changes**:
!`git diff --cached --stat 2>/dev/null | tail -25 | grep . || echo "No changes"`

---

## Additional Context

$ARGUMENTS

---

## Generating Handoff

Launching the handoff agent to analyze your work session and generate `{{SESSIONS_DIR}}/HANDOFF.md`...

The agent will:
- ✅ Review recent commits, current changes, and the active plan in STATE.md
- ✅ Read the relevant diffs (and whole files where needed) to understand context
- ✅ Identify what's complete vs in-progress
- ✅ Document next steps and blockers
- ✅ Preserve key decisions and patterns

Use the `Agent` tool to launch the handoff agent (subagent_type="handoff") which will autonomously generate the handoff document.

The agent doesn't see this conversation, so include a summary of the session in its prompt: what was worked on and why, decisions made (and alternatives rejected), open threads and blockers, the next steps you'd take, and any additional context from the arguments above.
