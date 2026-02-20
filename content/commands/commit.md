---
description: Create a well-crafted git commit from your current changes
argument-hint: [optional: commit message hint or scope]
author: "@markoradak"
---

# Commit Changes

I'll analyze your changes and create a clean, well-structured git commit.

> **When to use**: You have changes ready to commit and want a good commit message without the full session finalization. Use `/finalize` when closing out a work session with plan updates and phase summaries. Use `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

**Changes Summary**:
!`git diff --stat`

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

**This will create a git commit.** The agent will show you the proposed message before committing.

Use the Task tool to launch the commit agent (subagent_type="commit") with any additional context from arguments.
