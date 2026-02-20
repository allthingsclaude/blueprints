---
description: Run tests with intelligent analysis and fix suggestions
argument-hint: [optional: file pattern, test name, or "generate" for new tests]
author: "@markoradak"
---

# Test Assistant

I'll help you run tests, analyze failures, and generate missing test coverage.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Test Configuration**:
!`ls -la vitest.config.* jest.config.* playwright.config.* 2>/dev/null || echo "No test config found"`

---

## Focus Area

$ARGUMENTS

---

## Launching Test Agent

The test agent will:
- Detect your test runner and package manager
- Run tests (full suite or targeted by pattern)
- Analyze failures with root cause identification
- Suggest specific fixes (test bug vs implementation bug)
- Generate test templates for uncovered files (if requested)

**Workflows**:
- No arguments → Run full suite, analyze failures
- File pattern → Run targeted tests
- `generate` → Identify untested files, create test templates
- `watch` → Start test watcher

Use the Task tool to launch the test agent (subagent_type="test") with the focus area and any additional context from arguments.
