---
description: Create a well-crafted git commit from your current changes
argument-hint: optional: commit message hint or scope
author: "@markoradak"
---

# Commit Changes

I'll analyze your changes and create a clean, well-structured git commit.

> **When to use**: You have changes ready to commit and want a good commit message without the full session finalization. Use `/finalize` when closing out a work session with plan updates and phase summaries. Use `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

**Changes Summary**:
!`git diff --stat 2>/dev/null || echo "No changes"`

---

## Context

$ARGUMENTS

---

## Launching Commit Agent

The commit agent will:
- Review all staged and unstaged changes
- Understand the intent and scope of the changes
- Determine the appropriate commit type (`feat`, `fix`, `refactor`, etc.)
- Draft a concise, well-formatted commit message
- Stage the relevant files and create the commit
- Verify the commit was created successfully

**IMPORTANT: Do NOT add a `Co-Authored-By` line to the commit message** — include this in the agent's prompt.

**This will create a git commit.** The agent commits directly and reports the full message; amend it afterwards (`git commit --amend`) if you want changes.

Use the `Agent` tool to launch the commit agent (subagent_type="commit") with any additional context from arguments.
