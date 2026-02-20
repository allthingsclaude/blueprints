---
description: Upgrade dependencies or migrate between framework versions
argument-hint: [package@version, "all", or migration description]
author: "@markoradak"
---

# Migration Assistant

I'll help you upgrade dependencies or migrate between framework versions safely.

> **When to use**: You need to upgrade a dependency, migrate to a new major version, or handle breaking changes. Use `/refactor` for structural code changes that aren't dependency-driven.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

**Current Dependencies**:
!`cat package.json 2>/dev/null | head -40`

**Lock File**:
!`ls pnpm-lock.yaml yarn.lock bun.lockb package-lock.json 2>/dev/null | head -1 || echo "No lock file found"`

---

## Migration Target

$ARGUMENTS

---

## Launching Migration Agent

The migration agent will:
- Identify current versions and target versions
- Research breaking changes and migration guides
- Capture a baseline (typecheck, lint, tests, build)
- Create a step-by-step migration plan
- Apply changes incrementally with validation after each step
- Update code to handle breaking API changes
- Verify the full test suite passes after migration

**Workflows**:
- `react@19` → Upgrade React to v19 with breaking change resolution
- `next@15` → Upgrade Next.js with migration guide steps
- `all` → Check all dependencies for available updates
- `typescript@5.5` → Upgrade TypeScript with new strict checks
- Description → Handle a described migration (e.g., "move from Jest to Vitest")

Use the Task tool to launch the migrate agent (subagent_type="migrate") with the migration target and any constraints.
