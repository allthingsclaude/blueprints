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

**File Exists**: !`ls "$ARGUMENTS" 2>/dev/null || echo "File not found — check the path"`

**File Size**: !`wc -l < "$ARGUMENTS" 2>/dev/null || echo "N/A"`

## Git History

**Full Log (following renames)**:
!`git log --follow --format="%h|%an|%ar|%s" -- "$ARGUMENTS" 2>/dev/null || echo "No git history available"`

**File Creation**:
!`git log --follow --diff-filter=A --format="%h %an (%ar): %s" -- "$ARGUMENTS" 2>/dev/null || echo "Unable to determine creation"`

**Contributors**:
!`git log --follow --format="%an" -- "$ARGUMENTS" 2>/dev/null || echo "N/A"`

**Recent Activity (last 30 days)**:
!`git log --since="30 days ago" --follow --format="%h %s (%ar)" -- "$ARGUMENTS" 2>/dev/null || echo "No recent changes"`

**Change Frequency**:
!`git log --follow --oneline -- "$ARGUMENTS" 2>/dev/null`

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

If `$ARGUMENTS` includes a `:function` or symbol name after the file path, narrow the story to just that symbol. Use `git log -p` mentally to focus on commits that touched that specific function.

**This is read-only. Do not modify any files.**
