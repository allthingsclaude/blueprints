---
description: Find and remove dead code, unused imports, and technical debt
argument-hint: optional: "imports" | "dead-code" | "types" | "todos" | focus area
author: "@markoradak"
---

# Code Cleanup

I'll scan your codebase for dead code, unused imports, and technical debt.

> **When to use**: You want to remove things that shouldn't be there (unused imports, dead exports, stale TODOs, console.logs). Use `/dry` to consolidate duplicated code, `/refactor` for structural changes, or `/audit` to review changes before committing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Files to Analyze**:
!`find . -maxdepth 5 \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d " " || echo "0"` source files

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

<!-- claude-only -->
**Whole codebase or a folder, as a workflow**: unless the argument is a single file, and if the `Workflow` tool is available, run the saved workflow **`sweep`** instead of the agent, with args `{ "kinds": ["cleanup"] }`, plus `"scope"` for a category or focus (`imports`, `dead-code`, `types`, `todos`, or words) and `"paths"` for a folder. It runs the unused-code tooling once, scans the code area by area in parallel, and has a separate agent check every finding (above all that "unused" code really has no references anywhere). It changes nothing. Wait for the completion notification, then show its result as the report: the `confirmed` findings grouped by category, with whether each is auto-fixable, with their ids; `unverified` ones separately, flagged as unchecked; how many were `dropped` as false positives; and any `missingScanners` (areas that weren't scanned), `skipped` areas and `leftOut` count. Ask which to apply with `AskUserQuestion`, then relaunch the agent as below, naming the ids and including the findings (e.g. "apply CLN-1, CLN-4 from this report; skip rescanning"). For a single file, or when the workflow isn't available or the run fails, launch the agent:
<!-- /claude-only -->

Use the `Agent` tool to launch the cleanup agent (subagent_type="cleanup") with the focus area and any additional context from arguments.

The agent reports first and changes nothing. After the user picks which items to apply, relaunch the agent with the approved item list and the report it came from (e.g. "apply items 1, 3, 5 from your previous report; skip rescanning") rather than the original request, so it doesn't redo the scan.
