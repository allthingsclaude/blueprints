---
description: Eliminate DRY violations without changing behavior
argument-hint: optional: file/folder path, "functions" | "components" | "hooks" | "types" | "constants"
author: "@markoradak"
---

# DRY Optimization

I'll find and eliminate DRY violations across your codebase while guaranteeing identical behavior.

> **When to use**: You suspect duplicated code and want to consolidate it. Use `/cleanup` to remove unused/dead code, `/refactor` for renames, moves, or extractions, or `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null || echo "Not a git repository"`

**Files to Analyze**:
!`find . -maxdepth 5 \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d " " || echo "0"` source files

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
- Validate after each change — revert its own edits on failure (your uncommitted work is never touched)
- Guarantee zero behavior change

**Scoping options**:
- No argument → Full source scan
- `functions` / `components` / `hooks` / `types` / `constants` → Category-specific scan
- File/folder path → Scoped deep scan

Use the `Agent` tool to launch the DRY agent (subagent_type="dry") which will capture the baseline, scan for DRY violations, present a prioritized report, and — with user approval — apply optimizations one at a time with validation after each change.

The agent reports first and changes nothing. After the user picks which items to apply, relaunch the agent with the approved item list and its report (e.g. "apply items 1, 3, 5 from your previous report; skip rescanning") rather than the original request, so it doesn't redo the scan.
