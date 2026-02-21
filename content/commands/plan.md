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

Launching the plan agent to analyze our conversation and generate `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md`...

The agent will:
- ✅ Summarize key findings from our discussion
- ✅ Identify the problem/opportunity
- ✅ Propose implementation approach
- ✅ Break down tasks into actionable steps
- ✅ Note technical considerations and constraints
- ✅ List relevant files and references
- ✅ Copy any reference files (images, videos, mockups) to `{{TASKS_DIR}}/references/` and link them in the plan so implementing agents can consume them

Use the Task tool to launch the plan agent (subagent_type="plan") which will autonomously generate the plan document.
