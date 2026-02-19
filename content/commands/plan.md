---
description: Create a plan document from conversation findings
argument-hint: {NAME} [optional: additional context]
author: "@markoradak"
---

# Create Plan Document

I'll create a structured plan document based on our conversation findings.

## Current Session Context

**Working Directory**: !`pwd`

**Git Status**:
!`git status --short`

---

## Plan Name & Context

$ARGUMENTS

---

## Generating Plan

Launching the plan agent to analyze our conversation and generate `plans/PLAN_{NAME}.md`...

The agent will:
- ✅ Summarize key findings from our discussion
- ✅ Identify the problem/opportunity
- ✅ Propose implementation approach
- ✅ Break down tasks into actionable steps
- ✅ Note technical considerations and constraints
- ✅ List relevant files and references

Use the Task tool to launch the plan agent (subagent_type="general-purpose") which will autonomously generate the plan document.
