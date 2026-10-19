---
description: Generate a standup summary from recent git activity
argument-hint: optional: timeframe like "3 days" or "this week"
author: "@markoradak"
---

# Standup Summary

Generating a standup summary from recent activity.

> **When to use**: You need a quick done/doing/next summary for a standup meeting, status update, or just to remind yourself what you've been working on.

## Recent Activity

**Current Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Author**: !`git config user.name 2>/dev/null || echo "Unknown"`

**Your Commits (last 48 hours, all branches)**:
!`git log --all --since="48 hours ago" --author="$(git config user.email)" --format="%h %s (%ar)" 2>/dev/null | head -60 | grep . || echo "No recent commits"`

**Uncommitted Changes**:
!`git diff --stat 2>/dev/null | tail -25 | grep . || echo "None"`

**Staged Changes**:
!`git diff --cached --stat 2>/dev/null | tail -25 | grep . || echo "None"`

**Stashed Work**:
!`git stash list 2>/dev/null | head -10 | grep . || echo "No stashes"`

**Active Plan** (STATE.md header):
!`sed -n '1,/^---$/p' {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

**Next Unchecked Tasks in the Active Plan**:
!`p=$(sed -n 's/^\*\*File\*\*: *//p' {{STATE_FILE}} 2>/dev/null | head -1); if [ -f "$p" ]; then grep -n -m 8 -E '^[[:space:]]*([0-9]+\.|[-*]) \[ \]' "$p" | grep . || echo "No unchecked tasks"; else echo "No active plan"; fi`

## Timeframe Override

$ARGUMENTS

---

## Instructions

Using the activity data above, generate a clean standup summary in this format:

### Output Format

```markdown
## Standup — [date]

### Done
- [completed work items from commits, grouped by theme]

### In Progress
- [current branch context and uncommitted changes]

### Up Next
- [items from plan files, or next logical steps]
```

### Rules

1. **Done** — Synthesize commits into meaningful work items. Don't list every commit — group related commits into a single bullet (e.g., three auth-related commits become "Implemented user authentication flow"). Use the commit messages to understand what was accomplished.

2. **In Progress** — Describe what the current branch and uncommitted changes suggest you're working on. If there are stashes, mention them as paused work.

3. **Up Next** — Pull from the active plan's next unchecked tasks if there are any. If not, infer reasonable next steps from the in-progress work or leave as "TBD — no active plan."

4. **Timeframe** — The commits above cover the last 48 hours. If `$ARGUMENTS` specifies a different timeframe (e.g., "3 days", "this week"), rerun the commit query with it before writing "Done": `git log --all --since="<timeframe>" --author="$(git config user.email)" --format="%h %s (%ar)" | head -100`.

5. **Tone** — Keep it concise and factual. No filler. Ready to paste into Slack or Teams.

**This is read-only. Do not modify any files.**
