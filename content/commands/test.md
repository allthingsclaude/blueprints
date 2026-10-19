---
description: Run tests with intelligent analysis and fix suggestions
argument-hint: optional: file pattern, test name, or "generate" for new tests
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
- `watch` → Start the test watcher (handled here, not by the agent — see below)

**If the argument is `watch`**: don't launch the agent — a watcher never exits, so a subagent would hang on it. Instead, find the project's watch script (e.g. `test:watch`, or the runner's watch mode) and run it yourself with the `Bash` tool's `run_in_background` option, or give the user the exact command to run in their own terminal.

Otherwise, use the `Agent` tool to launch the test agent (subagent_type="test") with the focus area and any additional context from arguments.
