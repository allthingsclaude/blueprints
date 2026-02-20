---
description: Safely refactor code with DRY analysis, pattern extraction, and validation
argument-hint: [operation] [target] (e.g., "dry-check", "rename:old:new", "extract:ComponentName")
author: "@markoradak"
---

# Refactor Assistant

I'll help you safely refactor code with a focus on DRY principles, pattern extraction, and thorough validation.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

---

## Refactoring Request

$ARGUMENTS

---

## Supported Operations

- `dry-check` — Analyze codebase for DRY violations
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
