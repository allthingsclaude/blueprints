---
description: Investigate and diagnose issues with systematic analysis
argument-hint: [error message, file path, or behavior description]
author: "@markoradak"
---

# Debug Assistant

I'll systematically investigate and diagnose the issue you're experiencing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Recent Changes** (potential cause):
!`git log --oneline -5`

**Modified Files**:
!`git status --short`

---

## Issue Description

$ARGUMENTS

---

## Launching Debug Agent

The debug agent will follow a systematic 4-phase methodology:
1. **Reproduce & Understand** — Clarify the issue, gather context
2. **Isolate the Problem** — Narrow scope, trace data flow
3. **Root Cause Analysis** — Identify candidates, verify hypothesis
4. **Resolution** — Develop fix, suggest prevention

It will produce a structured diagnosis report with root cause, investigation trail, recommended fixes, and verification steps.

Use the Task tool to launch the debug agent (subagent_type="debug") with the issue description and any additional context from arguments.
