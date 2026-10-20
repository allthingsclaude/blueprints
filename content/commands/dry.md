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

<!-- claude-only -->
**Whole codebase or a folder, as a workflow**: unless the argument is a single file, and if the `Workflow` tool is available, run the saved workflow **`sweep`** instead of the agent, with args `{ "kinds": ["dry"] }`, plus `"scope"` for a category (`functions`, `components`, `hooks`, `types`, `constants`) and `"paths"` for a folder. It scans the code area by area in parallel (each scanner also looks for copies in the rest of the codebase), and a separate agent checks every finding. It changes nothing. Wait for the completion notification, then show its result as the report: the `confirmed` findings by priority, with their locations and whether each is safe to auto-apply, with their ids; `unverified` ones separately, flagged as unchecked; how many were `dropped` as false positives; and any `missingScanners` (areas that weren't scanned), `skipped` areas and `leftOut` count. Ask which to apply with `AskUserQuestion`, then relaunch the agent as below, naming the ids and including the findings (e.g. "apply DRY-1, DRY-3 from this report; skip rescanning"). For a single file, or when the workflow isn't available or the run fails, launch the agent:
<!-- /claude-only -->

Use the `Agent` tool to launch the DRY agent (subagent_type="dry") which will capture the baseline, scan for DRY violations, present a prioritized report, and — with user approval — apply optimizations one at a time with validation after each change.

The agent reports first and changes nothing. After the user picks which items to apply, relaunch the agent with the approved item list and the report it came from (e.g. "apply items 1, 3, 5 from your previous report; skip rescanning") rather than the original request, so it doesn't redo the scan.
