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

**Commits (last 48 hours)**:
!`git log --since="48 hours ago" --format="%h %an: %s (%ar)" 2>/dev/null || echo "No recent commits"`

**Uncommitted Changes**:
!`git diff --stat 2>/dev/null || echo "None"`

**Staged Changes**:
!`git diff --cached --stat 2>/dev/null || echo "None"`

**Stashed Work**:
!`git stash list 2>/dev/null || echo "No stashes"`

**Active Plan Files**:
!`ls -1 {{TASKS_DIR}}/*.md 2>/dev/null || echo "No plan files found"`

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

3. **Up Next** — Pull from plan files if they exist. If not, infer reasonable next steps from the in-progress work or leave as "TBD — no active plan."

4. **Timeframe** — If `$ARGUMENTS` specifies a different timeframe (e.g., "3 days", "this week"), adjust the "Done" section scope accordingly. The shell commands captured the last 48 hours; if the user wants a wider window, note that some older work may not appear.

5. **Tone** — Keep it concise and factual. No filler. Ready to paste into Slack or Teams.

**This is read-only. Do not modify any files.**
