---
description: Find and remove dead code, unused imports, and technical debt
argument-hint: [optional: "imports" | "dead-code" | "types" | "todos" | focus area]
author: "@markoradak"
---

# Code Cleanup

I'll scan your codebase for dead code, unused imports, and technical debt.

> **When to use**: You want to remove things that shouldn't be there (unused imports, dead exports, stale TODOs, console.logs). Use `/dry` to consolidate duplicated code, `/refactor` for structural changes, or `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Files to Analyze**:
!`find . -maxdepth 5 -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | wc -l` source files

---

## Focus Area

$ARGUMENTS

---

## Launching Cleanup Agent

The cleanup agent will:
- Detect your toolchain (package manager, available scripts)
- Scan for unused imports, dead code, `any` types, stale TODOs, console statements, and commented-out code
- Generate a structured report with file:line references
- Offer auto-fix for safe changes (with your approval)
- Validate that nothing breaks after cleanup

Use the Task tool to launch the cleanup agent (subagent_type="cleanup") with the focus area and any additional context from arguments.
