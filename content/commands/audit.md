---
description: Review code changes before committing
argument-hint: optional: specific files or focus area
author: "@markoradak"
---

# Code Audit

I'll perform a thorough review of your code changes before you commit.

> **When to use**: You have changes ready to commit and want a comprehensive review. To review work that's already committed on a branch (e.g. before opening a PR), use `/preflight`, which reviews the branch range with parallel reviewers. Use `/cleanup` to find dead code, `/dry` to eliminate duplication, or `/refactor` for structural changes.

## Current Changes

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

---

## Focus Area

$ARGUMENTS

---

## Launching Code Auditor

The audit agent will:
- Detect your toolchain and project conventions
- Review all staged and unstaged changes
- Check for security vulnerabilities, breaking changes, and data loss risks
- Identify DRY violations, type safety issues, and error handling gaps
- Verify consistency with project patterns (CLAUDE.md)
- Provide a structured report with severity levels and specific fixes

**After the audit**, the agent ends its report with these options:
1. **Just review** — Show the audit report only
2. **Auto-fix** — Attempt to fix critical and important issues
3. **Create fix plan** — Generate `{{PLANS_DIR}}/PLAN_AUDIT_FIXES.md`

Use the `Agent` tool to launch the audit agent (subagent_type="audit") which will autonomously analyze your code changes and generate a comprehensive audit report.

**When the agent returns**: show the user its report, then ask which option they want with `AskUserQuestion` (the agent runs as a subagent and can't ask). For **Auto-fix** or **Create fix plan**, relaunch the audit agent with the reported findings and "Fix these findings — don't re-review" (or "Create the fix plan from these findings — don't re-review"), so it doesn't audit everything again.
