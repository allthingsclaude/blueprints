---
description: Review code changes before committing
argument-hint: [optional: specific files or focus area]
author: "@markoradak"
---

# Code Audit

I'll perform a thorough review of your code changes before you commit.

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

Initiating comprehensive code review to check for:

- 🔴 **Critical Issues** (security, breaking changes, data loss)
- 🟡 **Important Issues** (DRY violations, type safety, error handling)
- 🔵 **Suggestions** (best practices, code clarity, performance)

The auditor will:
- ✅ Review all staged and unstaged changes
- ✅ Check for security vulnerabilities (XSS, SQL injection, etc.)
- ✅ Identify DRY violations and code duplication
- ✅ Verify TypeScript type safety
- ✅ Validate error handling
- ✅ Check consistency with project patterns (CLAUDE.md)
- ✅ Flag performance issues
- ✅ Verify multi-tenant isolation (site-specific)
- ✅ Provide specific, actionable recommendations
- ✅ Give final verdict: safe to commit or issues to fix

**After the audit completes**, the agent will ask:

1. **Just review** (default) - Show the audit report only
2. **Auto-fix** - Attempt to automatically fix important and critical issues
3. **Create fix plan** - Generate a PLAN_AUDIT_FIXES.md with systematic fixes

Use the Task tool to launch the audit agent (subagent_type="general-purpose") which will autonomously analyze your code changes, generate a comprehensive audit report, and optionally fix issues.
