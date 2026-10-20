---
description: Merge finished /dispatch runs back one at a time, test them together, and clean up
argument-hint: [plan ...] [--review] [--yes]
disable-model-invocation: true
author: "@markoradak"
---

# Integrate Dispatched Plans

I'll merge the finished `/dispatch` runs into the branch they started from, one at a time, testing after each merge. Then I'll sync CLAUDE.md and STATE.md once and remove the worktrees. (`/autopilot` offers the same when it finds finished runs.)

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`

**Checkout** (this checkout's top level, then the main checkout — they differ in a linked worktree):
!`git rev-parse --show-toplevel 2>/dev/null || echo "(not a repo)"`
!`git worktree list --porcelain 2>/dev/null | head -1 || true`

**Git Status**:
!`git status --short 2>/dev/null | head -20 | grep . || echo "(clean, or not a repo)"`

**Worktrees**:
!`git worktree list 2>/dev/null | head -20 || true`

**STATE.md** (header and plans):
!`head -n 40 {{STATE_FILE}} 2>/dev/null || echo "No STATE.md"`

---

## Arguments

$ARGUMENTS

---

## Steps

### 1. Parse Arguments

- **Plans** (optional): integrate only these, matched like `/dispatch` does (`{NN}`, `{NAME}`, `{NN}_{NAME}`). Default: every finished run.
- **`--review`**: after merging, also run a full review of everything merged. Each run already passed its own preflight, so this is only worth it for risky combinations.
- **`--yes`**: skip the confirmation.

### 2. Follow the Integrate Procedure

Read `{{BLUEPRINTS_DIR}}/procedures/integrate.md` and follow it with caller `integrate`, the plans and flags above, and the Current State above as its step 1.
