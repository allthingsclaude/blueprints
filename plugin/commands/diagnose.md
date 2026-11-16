---
description: Investigate and diagnose issues with systematic analysis
argument-hint: error message, file path, or behavior description
author: "@markoradak"
---

> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.

# Diagnose Assistant

I'll systematically investigate and diagnose the issue you're experiencing.

## Current State

**Working Directory**: run `pwd`

**Branch**: run `git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Recent Changes** (potential cause):
run `git log --oneline -5 2>/dev/null || echo "No git history"`

**Modified Files**:
run `git status --short 2>/dev/null || echo "Not a git repository"`

---

## Issue Description

$ARGUMENTS

---

## Launching Diagnose Agent

The diagnose agent will follow a systematic 4-phase methodology:
1. **Reproduce & Understand** — Clarify the issue, run the failing command (test, build, typecheck) if there is one, gather context
2. **Isolate the Problem** — Narrow scope, trace data flow
3. **Root Cause Analysis** — Identify candidates, verify hypothesis
4. **Resolution** — Develop fix, suggest prevention

It will produce a structured diagnosis report with root cause, investigation trail, recommended fixes, and verification steps.

Use the `Agent` tool to launch the diagnose agent (subagent_type="diagnose") with the issue description and any additional context from arguments.
