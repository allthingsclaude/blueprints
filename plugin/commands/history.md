---
description: Tell the narrative story of a file or function through its git history
argument-hint: <file path> [optional: :function or symbol name]
author: "@markoradak"
---

# File History

Investigating the history of: **$ARGUMENTS**

> **When to use**: You want to understand how a file evolved over time — who created it, what major changes shaped it, and whether it's a hot spot or stable code.

## Context

**Working Directory**: !`pwd`

**File Exists**: !`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; ls "$f" 2>/dev/null || echo "File not found — check the path"`

**File Size**: !`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; wc -l < "$f" 2>/dev/null || echo "N/A"`

## Git History

**Full Log (following renames, newest first, capped at 150)**:
!`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; git log --follow --format="%h|%an|%ar|%s" -- "$f" 2>/dev/null | head -150 | grep . || echo "No git history available"`

**File Creation**:
!`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; git log --follow --diff-filter=A --format="%h %an (%ar): %s" -- "$f" 2>/dev/null | tail -1 | grep . || echo "Unable to determine creation"`

**Contributors (commits per author)**:
!`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; git log --follow --format="%an" -- "$f" 2>/dev/null | sort | uniq -c | sort -rn | head -10 | grep . || echo "N/A"`

**Recent Activity (last 30 days)**:
!`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; git log --since="30 days ago" --follow --format="%h %s (%ar)" -- "$f" 2>/dev/null | head -30 | grep . || echo "No recent changes"`

**Change Frequency**:
!`f="$ARGUMENTS"; f="${f%%:*}"; f="${f%% *}"; n=$(git log --follow --oneline -- "$f" 2>/dev/null | wc -l | tr -d ' '); first=$(git log --follow --format=%as -- "$f" 2>/dev/null | tail -1); last=$(git log -1 --format=%as -- "$f" 2>/dev/null); echo "$n commits (first: ${first:-n/a}, last: ${last:-n/a})"`

**Symbol History** (only when a `:symbol` is given):
!`s="$ARGUMENTS"; case "$s" in *:*) f="${s%%:*}"; sym="${s#*:}"; sym="${sym%% *}"; git log -L ":$sym:$f" --format='%h %an %ar %s' 2>/dev/null | head -300 | grep . || echo "No history found for $sym in $f";; *) echo "(no symbol given)";; esac`

---

## Instructions

Using the git history data above, tell the story of this file as a narrative. Don't just list commits — interpret the history.

### 1. Origin

When was the file created, by whom, and why? Use the creation commit message and context to explain what purpose it originally served.

### 2. Evolution

Group commits into phases or themes. For example:
- "Initial implementation" (first few commits)
- "Feature expansion" (when significant functionality was added)
- "Refactoring" (structural changes without new features)
- "Bug fixes" (corrections and patches)

Summarize each phase in 1-2 sentences rather than listing individual commits.

### 3. Key Contributors

Who has shaped this file the most? Mention the top 2-3 contributors and what kind of work each contributed.

### 4. Current State

- **Activity level** — Is this file actively changing or has it stabilized?
- **Hot spot or stable?** — High commit frequency = hot spot (may need attention). Low frequency = stable (likely reliable).
- **Size context** — Is the file large enough to consider splitting?

### 5. Function Focus (if specified)

If `$ARGUMENTS` includes a `:function` or symbol name after the file path, narrow the story to just that symbol using the **Symbol History** above (`git log -L` output: each commit that changed the function, with its diff, capped at 300 lines). If it was cut off and you need older changes, run `git log -L :<symbol>:<file>` yourself with a narrower range.

**This is read-only. Do not modify any files.**
