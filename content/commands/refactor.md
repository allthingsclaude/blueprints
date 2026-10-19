---
description: Safely rename, extract, inline, or move code with validation
argument-hint: operation target (e.g., "rename:old:new", "extract:ComponentName", "move:src:dest")
author: "@markoradak"
---

# Refactor Assistant

I'll help you safely restructure code — renaming, extracting, inlining, or moving — with validation after every change.

> **When to use**: You know what structural change you want to make. Use `/dry` to find and consolidate duplications, `/cleanup` to remove dead/unused code, or `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null || echo "Not a git repository"`

---

## Refactoring Request

$ARGUMENTS

---

## Supported Operations

- `rename:oldName:newName` — Safe rename across all references
- `extract:Name` — Extract repeated code into reusable unit
- `inline:Name` — Inline unnecessary abstraction
- `move:source:destination` — Move with all imports updated
- `consolidate:pattern` — Consolidate similar implementations

## Launching Refactor Agent

The refactor agent will:
- Detect your toolchain (package manager, available scripts)
- Capture a baseline (typecheck, lint, tests)
- Analyze the code and apply the change — your request is the approval. For large changes (public API/exports, or more than ~20 files) it stops and reports a plan instead
- Apply changes one at a time with validation after each
- Revert only its own edits if any validation fails (your uncommitted work is never touched)
- Guarantee zero behavior change

If the agent stops with a plan, ask the user whether to proceed; if they approve, relaunch the agent with the original request plus "proceed with the plan" and the plan from its report.

Use the `Agent` tool to launch the refactor agent (subagent_type="refactor") with the refactoring request and any additional context from arguments.
