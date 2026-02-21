---
description: Generate a developer onboarding guide for this project
argument-hint: [optional: focus area like "backend", "frontend", "api", or "contributing"]
author: "@markoradak"
---

# Generate Onboarding Guide

I'll analyze your project and generate a comprehensive onboarding guide for new developers.

> **When to use**: You want to help new team members get up to speed on the project quickly. This is different from `/docs readme` (user-facing documentation) or `/explain` (understanding specific code). This generates a developer-oriented "survival guide" covering setup, architecture, patterns, conventions, and common tasks.

## Current Context

**Working Directory**: !`pwd`

**Project**:
!`cat package.json 2>/dev/null | head -15 || cat Cargo.toml 2>/dev/null | head -15 || cat pyproject.toml 2>/dev/null | head -15 || cat go.mod 2>/dev/null | head -5`

**Structure**:
!`ls -la`

**Git Info**:
!`git log --oneline -5 2>/dev/null; echo "---"; git branch -a 2>/dev/null | head -10`

**Existing Docs**:
!`ls README* CONTRIBUTING* CLAUDE.md docs/ 2>/dev/null | head -10`

**Dev Scripts**:
!`cat package.json 2>/dev/null | grep -A 20 '"scripts"' | head -25`

---

## Focus Area

$ARGUMENTS

---

## Launching Onboard Agent

The onboard agent will:
1. **Deep-scan the project** — Structure, dependencies, patterns, conventions
2. **Read existing documentation** — README, CONTRIBUTING, CLAUDE.md, inline docs
3. **Identify key patterns** — How code is organized, named, and tested
4. **Discover setup requirements** — Env vars, services, tools, config
5. **Generate the guide** — A comprehensive ONBOARDING.md covering everything a new dev needs

**Workflows**:
- No argument → Full onboarding guide covering all aspects
- `backend` / `frontend` / `api` → Focused guide for that area
- `contributing` → Focus on contribution workflow, PR process, code standards

Use the Task tool to launch the onboard agent (subagent_type="onboard") with any focus area and additional context.
