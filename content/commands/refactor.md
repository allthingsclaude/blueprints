---
description: Safely rename, extract, inline, or move code with validation
argument-hint: [operation] [target] (e.g., "rename:old:new", "extract:ComponentName", "move:src:dest")
author: "@markoradak"
---

# Refactor Assistant

I'll help you safely restructure code — renaming, extracting, inlining, or moving — with validation after every change.

> **When to use**: You know what structural change you want to make. Use `/dry` to find and consolidate duplications, `/cleanup` to remove dead/unused code, or `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short`

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
- Analyze code and present a plan before making changes
- Apply changes one at a time with validation after each
- Revert immediately if any validation fails
- Guarantee zero behavior change

Use the Task tool to launch the refactor agent (subagent_type="refactor") with the refactoring request and any additional context from arguments.
