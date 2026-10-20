---
description: Run several plans at once, each in its own git worktree and session
argument-hint: [plan ...] [--yes] [--max N]
disable-model-invocation: true
author: "@markoradak"
---

# Dispatch Plans in Parallel

I'll check which plans can safely run side by side, settle what each run will need from you, give each plan its own git worktree and branch, and start `/autopilot` in each. The runs don't wait for approvals: what only you can do is set aside and listed when they finish. Then `/autopilot` (or `/integrate`) merges them back.

> **When to use**: you want specific plans built at the same time, or (with no plans named) a suggestion of which ready plans can be. `/autopilot` also offers this on its own when other plans are ready. To split one plan's phase across agents in this checkout, use `/parallelize`.

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

**Available Plans**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No plans found"`

**Conventions**: !`ls {{TASKS_DIR}}/CONVENTIONS.md 2>/dev/null || echo "missing"`

**.worktreeinclude**:
!`head -20 .worktreeinclude 2>/dev/null | grep . || echo "(none)"`

---

## Arguments

$ARGUMENTS

---

## Steps

### 1. Parse Arguments

- **Plans**: each word that matches a plan file `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` — as `{NN}`, `{NAME}`, `{NN}_{NAME}` or `PLAN_{NN}_{NAME}`, case-insensitive. Stop and list the available plans if a word matches none. No plans → suggest the ready ones.
- **`--yes`**: skip the confirmation.
- **`--max N`**: at most N runs at once (default 3). Each run uses as much as a normal `/autopilot` run.
- **`--full`**: no longer needed (dispatched runs never wait for approvals); ignore it.
<!-- claude-only -->
- **`--permission-mode <mode>`**: passed to each background session; otherwise they start in your default mode.
<!-- /claude-only -->

### 2. Follow the Dispatch Procedure

Read `{{BLUEPRINTS_DIR}}/procedures/dispatch.md` and follow it with caller `dispatch`, the plans and flags above, and the Current State above as its step 1.
