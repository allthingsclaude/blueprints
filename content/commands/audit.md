---
description: Review code changes before committing
argument-hint: [optional: specific files or focus area]
author: "@markoradak"
---

# Code Audit

I'll perform a thorough review of your code changes before you commit.

> **When to use**: You have changes ready to commit and want a comprehensive review. Use `/cleanup` to find dead code, `/dry` to eliminate duplication, or `/refactor` for structural changes.

## Current Changes

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

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

**After the audit**, the agent will offer:
1. **Just review** — Show the audit report only
2. **Auto-fix** — Attempt to fix critical and important issues
3. **Create fix plan** — Generate `{{PLANS_DIR}}/PLAN_AUDIT_FIXES.md`

Use the Task tool to launch the audit agent (subagent_type="audit") which will autonomously analyze your code changes, generate a comprehensive audit report, and optionally fix issues.
