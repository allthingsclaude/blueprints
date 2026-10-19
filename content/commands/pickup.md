---
description: Load handoff document and continue from previous session
argument-hint: optional: specific task or focus area
author: "@markoradak"
---

# Load Handoff and Continue

Loading the handoff document from your previous session.

## Handoff Document

!`cat {{SESSIONS_DIR}}/HANDOFF.md 2>/dev/null || echo "No handoff found — run /handoff first"`

## Active Plan (STATE.md header)

!`sed -n '1,/^---$/p' {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

---

## Your Focus

$ARGUMENTS

---

## Next Actions

Based on the handoff document above, I will:

1. **Summarize the current state** - Quick overview of what was in progress
2. **Identify next steps** - Prioritized actions from the handoff
3. **Verify environment** - Check that files mentioned are accessible
4. **Ask for direction** - Confirm which task you'd like to tackle first

If a plan is active (per the handoff or the STATE.md header), suggest resuming it with `/kickoff {NAME}` (interactive) or `/autopilot` (autonomous, picks up from STATE.md).

Let's pick up where we left off. What would you like to focus on?
