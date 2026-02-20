---
description: Eliminate DRY violations without changing behavior
argument-hint: [optional: file/folder path, "functions" | "components" | "hooks" | "types" | "constants"]
author: "@markoradak"
---

# DRY Optimization

I'll find and eliminate DRY violations across your codebase while guaranteeing identical behavior.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

**Files to Analyze**:
!`find . -maxdepth 5 -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | wc -l` source files

---

## Focus Area

$ARGUMENTS

---

## Launching DRY Agent

The DRY agent will:
- Detect your toolchain and capture a baseline (typecheck, lint, tests, build)
- Scan for exact, structural, and logical duplications
- Present a prioritized report with line counts and savings estimates
- Apply optimizations one at a time (with your approval)
- Validate after each change — revert immediately on failure
- Guarantee zero behavior change

**Scoping options**:
- No argument → Full source scan
- `functions` / `components` / `hooks` / `types` / `constants` → Category-specific scan
- File/folder path → Scoped deep scan

Use the Task tool to launch the DRY agent (subagent_type="dry") which will capture the baseline, scan for DRY violations, present a prioritized report, and — with user approval — apply optimizations one at a time with validation after each change.
