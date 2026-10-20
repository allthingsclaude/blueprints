---
description: Full autonomous development loop - from idea to committed code
argument-hint: --full feature description or plan name
disable-model-invocation: true
author: "@markoradak"
---

# Autopilot Mode

Full autonomous development loop. I'll take it from idea to committed code on a feature branch.

## Current State

**Working Directory**: !`pwd`

**Is Git Repo**: !`git rev-parse --is-inside-work-tree 2>/dev/null || echo "no"`

**Branch**: !`git branch --show-current 2>/dev/null || echo "(not a repo — will scan children)"`

**Git Dirs** (git dir, then common dir — they differ in a linked worktree):
!`git rev-parse --path-format=absolute --git-dir --git-common-dir 2>/dev/null || echo "(not a repo)"`

**Git Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "(clean, or not a repo)"`

**Child Git Repos** (for multi-repo mode):
!`find . -mindepth 2 -maxdepth 2 -name .git -type d 2>/dev/null || true`

**Active Plan** (STATE.md header):
!`sed -n '1,/^---$/p' {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

**Available Plans**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No plans found"`

**Project Detection**:
!`ls package.json tsconfig.json Cargo.toml go.mod pyproject.toml requirements.txt 2>/dev/null || echo "(no root-level project files — multi-repo likely)"`

---

## Arguments

$ARGUMENTS

---

## Autopilot Protocol

You are now in **AUTOPILOT MODE** — a full development loop that orchestrates the entire workflow from idea to committed code. Follow these steps in order.

You are the orchestrator: delegate the work to the specialist agents below and keep your own context small. Read plan files with targeted ranges, not in full, and don't paste agent reports back into the conversation beyond what the user needs.

### Step 0: Parse Arguments

Parse `$ARGUMENTS` for (in order):
- **`--full`** flag: run the entire loop without stopping for approval prompts. Remove it from the remaining arguments.
- **`--repos a,b,c`** flag: overrides auto-detection for multi-repo mode (comma-separated child directory names). Remove it and its value; store as `REPOS_OVERRIDE`.
- **Plan name**: if the first remaining word matches an existing plan `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` (case-insensitive, as `{NAME}`, `{NN}_{NAME}`, `PLAN_{NN}_{NAME}`, or just `{NN}`), execute that plan. A named plan always wins over resuming a different active plan.
- **Feature description**: otherwise, treat the remaining arguments as a feature description to brainstorm.

### Worktree Mode (dispatched runs)

This is a run that `/dispatch` started when both hold: the two **Git Dirs** paths above differ (this is a linked git worktree), and the STATE.md header has a `**Target**` line and a `**Branch**` matching the current branch. Other plans may be running in sibling worktrees at the same time. In any other worktree (for example one opened with `claude -w`), ignore this section and follow the normal steps.

Differences from the normal steps:

- **Plan required**: run the named plan, or the active plan in this worktree's STATE.md. If there's neither, stop: "This worktree needs an existing plan. Create plans in the main checkout, then run `/dispatch`." Don't brainstorm, write plans, or bootstrap here.
- **Single repo**: skip multi-repo detection.
- **Branch**: `/dispatch` already checked it out. In Step 3, skip 3a and branch creation: use the current branch and the `**Base**` from STATE.md.
- **Dependencies**: a fresh worktree has none installed. Before Step 4 or Step 5, whichever comes first, install them once with the lockfile-respecting command for the detected toolchain (e.g. `pnpm install --frozen-lockfile`, `npm ci`, `yarn install --immutable`, `bun install --frozen-lockfile`, `uv sync --locked`, `poetry install`), unless they're already present.
- **STATE.md is local**: `/dispatch` marks it `skip-worktree`, so git ignores your edits. Keep updating it as usual (it's how this run resumes), but never stage or commit it, and tell the commit agent not to. If `git add` warns that it's outside the sparse-checkout definition, that's this setting working. Whenever you update the header, change only the fields you're updating and keep `**Branch**`, `**Base**` and `**Target**`.
- **Step 6**: don't launch the update agent — `/integrate` syncs CLAUDE.md and the main checkout's STATE.md once, after merging. Keep `**Active**` and `**File**` on this plan (don't reset them to None) and set `**Status**` to `✅ Complete` or `⏸️ Paused`, so `/integrate` knows which plan this run built and whether it finished. Replace the PR steps in the report with: "Run `/integrate` from the main checkout ({main checkout path}) once the other dispatched plans finish."

---

### Step 1: Determine What to Work On

#### 1a. Resume an Active Plan

Look for `{{STATE_FILE}}` in `./` first, then `../` (useful when run from inside a child repo of a multi-repo setup). If found in the parent, say: "Found {{TASKS_DIR}}/ in the parent directory — treating it as the working root. Run `/autopilot` from `{parent_abspath}` next time." and change the working directory to the parent before continuing.

If a plan name was given and it isn't the active plan, skip to **1b**. Otherwise, if the STATE.md header shows an active plan (`🚧 In Progress` or `⏸️ Paused`):
- Locate the plan's phases with `grep -n -E '^#{1,4} ' {plan file}` and find the first phase with unchecked tasks (`grep -n -E '^[[:space:]]*([0-9]+\.|[-*]) \[ \]' {plan file}` shows where they are)
- **If tasks remain** → report "Resuming active plan: {NAME}, Phase {N}" and go to **Step 3**, then **Step 4**
- **If all phases are done but the plan isn't marked complete** → go to **Step 3**, then **Step 5**

#### 1b. Run a Named Plan

Outside worktree mode, check the `**Dispatched**` and `**Queued**` header lines first:
- **Dispatched** → stop: "{NAME} is running in its own worktree (`.claude/worktrees/{name}`). Attach to its session there, or run `/integrate` once it's done."
- **Queued** → `/dispatch` planned it to run after other plans are merged. Say so and ask before running it here (with `--full`, stop).

If a plan name was given, load that plan and activate it in `{{STATE_FILE}}`. Update these header fields, and keep the `**Dispatched**`/`**Queued**` lines (Step 3 rewrites `**Branch**`/`**Base**`):
```markdown
**Active**: {NN}_{NAME}
**File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
**Phase**: {first phase with unchecked tasks}
**Status**: 🚧 In Progress
**Updated**: [ISO timestamp]
```
and set the plan's row in `## Plans` to `🚧 In Progress` (add a row if missing). If the header pointed at a different plan that was `🚧 In Progress`, set that plan's row to `⏸️ Paused`. Then go to **Step 3**, then **Step 4**.

#### 1c. No Active Work — Brainstorm

**If arguments contain a feature description**, explore the idea — you are NOT implementing yet:
1. Understand the user's intent
2. Ask 2-4 focused follow-up questions about scope, approach, and constraints
3. Explore the codebase for relevant context (`Grep`, `Glob`, targeted `Read`s)
4. Converge on a clear approach

**If there are no arguments**, ask: "What would you like to build? Describe the feature or change you have in mind." Then brainstorm as above.

**Brainstorm rules:**
- DO NOT create, modify, or implement any code
- DO track image references the user shares (screenshots, mockups, wireframes) — note their file paths so the blueprint agent can copy them to `{{TASKS_DIR}}/references/`
- Keep it to 2-3 rounds of questions, then converge and move to Step 2

---

### Step 2: Create the Plan

**New project** (most of these hold: no `src/`/`app/`/`lib/`, empty or missing project manifest, fewer than 5 source files, or the user said "new project"):
1. Unless `{{PLANS_DIR}}/PLAN_00_INITIAL.md` exists, launch the blueprint agent with the `Agent` tool (`subagent_type: "blueprint"`) with plan name `INITIAL {NAME}` and the full brainstorm brief (stack, package manager, dependencies, structure, services, constraints). Then launch the bootstrap agent (`subagent_type: "bootstrap"`) with the same brief — it reuses `PLAN_00_INITIAL.md` and writes `bootstrap.sh`.
2. Ask: "Bootstrap script is ready. Should I run it to set up the project?" (with `--full`, run it). If yes → `bash bootstrap.sh --yes` (the shell here has no interactive input, so the script's own confirmation prompt must be skipped).
3. Launch the update agent (`subagent_type: "update"`) to create CLAUDE.md.
4. **COMMIT CHECKPOINT**: launch the commit agent (`subagent_type: "commit"`) with context "chore: bootstrap {NAME} project scaffolding".

**Existing project**:
1. Launch the blueprint agent (`subagent_type: "blueprint"`) with the feature name and brainstorm context, **including any image paths** collected during brainstorming. It writes `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and updates `{{STATE_FILE}}`.
2. Show a brief summary of the plan from the agent's report (objective, phases, key files).
3. **COMMIT CHECKPOINT** — only if cwd is a git repo (`git rev-parse --is-inside-work-tree`): stage the plan and STATE.md and launch the commit agent with context "docs: add implementation plan for {NAME}". If cwd is not a git repo (parent of child repos), leave them uncommitted as coordination artifacts and say so.

---

### Step 3: Detect Repositories & Create Feature Branch(es)

#### 3a. Discover Repos & Determine Mode

Always do all three discoveries before deciding:
1. `CWD_IS_REPO`: `git rev-parse --is-inside-work-tree 2>/dev/null`
2. `CHILD_REPOS`: `find . -mindepth 2 -maxdepth 2 -name .git -type d 2>/dev/null` (avoid `for`/`while` loops in inline shell — some harnesses reject them)
3. `AFFECTED_CHILDREN`: for each child repo, `grep -c "{child_repo_name}" {plan file}` — any child with > 0 mentions

**Mode decision** (first match wins):

| Condition | Mode | `AFFECTED_REPOS` |
|---|---|---|
| `--repos a,b,...` given | multi | `{a, b, ...}` |
| `AFFECTED_CHILDREN` non-empty | multi | `AFFECTED_CHILDREN` — even if cwd is itself a repo (meta-repo); the parent is NOT branched |
| `CWD_IS_REPO` | single | `[.]` |
| Otherwise | fail | "No git repo here, and the plan references no child directories with `.git/`. cd into a repo, initialize one, or fix the plan's paths." |

**Ambiguity warning**: if `CHILD_REPOS` is non-empty, `AFFECTED_CHILDREN` is empty, and cwd is a repo, warn: "Detected child repos {list}, but the plan doesn't reference any of them by directory name. Proceeding in single-repo mode. If you meant multi-repo, prefix the plan's file paths with the repo name (e.g. `{child}/src/...`) or re-run with `--repos {child}`." Ask the user to confirm (with `--full`, continue and keep the warning in the final report).

Report: "Branching in this repo." or "Plan touches {N} child repo(s): {list}. Will branch in each. Parent repo (if any) left untouched."

#### 3b. Pre-flight: Dirty Working State

For each affected repo, run `git status --short` (from `$PARENT_DIR/{repo}` in multi-repo mode). If any repo is dirty, list them and ask:
- **stash** — `git stash push -u -m 'autopilot pre-branch'` in each dirty repo (restore later with `git stash pop`)
- **abort** — stop so the user can handle the changes
- **continue** — carry the changes onto the new branch

With `--full`, default to **abort** — never silently stash or carry unintended work.

#### 3c. Create Branches and Record the Base

Branch name: plan name in lowercase kebab-case with a `feat/` prefix (e.g. `USER_AUTH` → `feat/user-auth`).

In each target repo (use absolute paths: `cd "$PARENT_DIR/{repo}"`):
1. If `feat/{name}` exists → `git checkout feat/{name}`; otherwise record the base commit first, `git rev-parse HEAD`, then `git checkout -b feat/{name}`
2. If the branch already existed and STATE.md has no base for it, compute one: `git merge-base "$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo main)" HEAD` (fall back to `master` if `main` doesn't exist)

**STATE UPDATE**: add these header lines to `{{STATE_FILE}}` (above the `---`):
```markdown
**Branch**: feat/{name}
**Base**: {sha}                       (multi-repo: repo-a@{sha}, repo-b@{sha})
**Repos**: repo-a, repo-b             (multi-repo only)
```

Report: "Working on branch `feat/{name}` in {N} repo(s): {list}"

---

### Step 4: Execute the Plan (Phase by Phase)

You own STATE.md during autopilot. Tell every implement/parallelize/showcase agent: "Autopilot updates STATE.md — don't edit it, and don't commit."

For each remaining phase:

#### 4a. Assess the Phase

Find the phase's line range from the heading list and count its unchecked tasks — read just that range, not the whole plan.

#### 4b. Execute the Phase

| Phase Type | Tasks | Agent |
|---|---|---|
| Landing page / homepage / marketing page / hero section / showcase page | Any | `showcase` |
| Regular | 1-5 | `implement` |
| Regular | 6+ | `parallelize` |

Launch it with the `Agent` tool with the plan name and: "Execute Phase {N} only, then stop." Include any reference files from `{{TASKS_DIR}}/references/` for showcase. **Multi-repo**: include the affected repos and their paths (the plan's file paths should already be prefixed with the repo name).

When the agent reports:
- **Blockers** → present them to the user and ask how to proceed. Don't continue until they're resolved or the user says to skip. (With `--full`, still stop on blockers that need a product decision, credentials, or a destructive operation.)
- **Plan changes it proposed** → apply small ones to the plan; ask the user about significant ones.

#### 4c. Commit the Phase

**COMMIT CHECKPOINT** after each phase:
- **Single-repo**: launch the commit agent with what the phase accomplished; the message should reference the plan and phase (e.g. "feat: implement user authentication (PLAN_AUTH Phase 1)").
- **Multi-repo**: set `PARENT_DIR=$(pwd)`. For each affected repo: `cd "$PARENT_DIR/{repo}"`, skip it if `git status --short` is empty, otherwise launch the commit agent with the phase summary and the repo name. Afterwards, `cd "$PARENT_DIR"` unconditionally and confirm with `pwd`. Record commit hashes per repo for the final report.

**STATE UPDATE** (from the parent dir in multi-repo mode): set `**Phase**` to the next phase and `**Updated**` to now, and update this plan's row in `## Plans` (Progress, e.g. `Phase 3/5 · 12/20 tasks`; Updated). Never add per-task tables or long notes — the plan's checkboxes are the source of truth, and the implement agents check them off. If STATE.md is in the legacy format, update the header and the plan's Overview row only.

#### 4d. Continue

More phases → back to 4a. All phases done → Step 5.

---

### Step 5: Validate & Fix (preflight)

All phases are committed, so review the branch range, not the working tree.

#### 5a. Gather Inputs (per affected repo)

```bash
git diff --name-only {BASE}...HEAD
```

- `BASE`: from the `**Base**` line in STATE.md (or the merge-base fallback from Step 3c)
- `FILES`: the list above
- `FRONTEND`: true if any file is UI code (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, `.css`, `.scss`, or under a components directory)

#### 5b. Run the `preflight` Workflow (preferred)

If the `Workflow` tool is available, run the saved workflow **`preflight`** with args:
```json
{ "base": "{BASE}", "files": [...FILES], "frontend": true|false, "plan": "{NAME}" }
```
Multi-repo: one run per affected repo, adding `"repo": "{repo}"`. You may launch them together.

The workflow runs in the background: `audit`, `secure`, `a11y` (UI changes only) and `test` review the range in parallel without editing; every finding gets an independent check; one fixer applies the confirmed findings and runs typecheck, lint and tests; each fix is rechecked (at most 2 rounds). Wait for the completion notification — don't poll. Its result lists `confirmed`, `dropped` (false positives), `unresolved`, `needsDecision`, and `changesMade`.

#### 5c. Fallback (no Workflow tool, workflows disabled, or the run fails)

1. In **one message**, launch these reviewers with the `Agent` tool so they run in parallel: `audit`, `secure`, `a11y` (only if `FRONTEND`), and `test`. Prompt each: "Review-only mode. Review the changes in `git diff {BASE}...HEAD`. Changed files: {FILES}. Follow your Review-Only Mode instructions."
2. Merge their findings, dropping duplicates (same file and line).
3. If there are any, launch one fixer (`subagent_type: "general-purpose"`) with the merged list: "For each finding, first confirm it's real in the current code (skip false positives and say why). Fix confirmed ones minimally, following `{{TASKS_DIR}}/CONVENTIONS.md` and CLAUDE.md. Skip with 'needs a decision' anything that would change auth design, encryption, public API, or product behavior. Add focused tests for missing-test findings. Then run typecheck, lint and tests once and fix what your edits broke. Don't commit. Report fixed / skipped / remaining."
4. If the fixer reports remaining failures, run one more fixer round for those only (max 2 rounds).

#### 5d. Commit and Decide

- **COMMIT CHECKPOINT**: if fixes were made (`changesMade`, or `git status --short` is non-empty), launch the commit agent with context "fix: address preflight findings for {NAME}" (per repo in multi-repo mode).
- **Unresolved critical findings or `needsDecision` items** → present them to the user and ask how to proceed. With `--full`, don't guess: finish Step 6 with status `⏸️ Paused` and list them in the report.
- Report briefly:
```markdown
**Preflight**: {N} confirmed · {M} dropped as false positives · {K} fixed · {U} unresolved
- Reviewers: audit ✅ · secure ✅ · a11y ✅/skipped (no UI changes) · tests ✅
```

---

### Step 6: Update & Report

**UPDATE CLAUDE.md and STATE.md** (skip in worktree mode): launch the update agent (`subagent_type: "update"`) to sync CLAUDE.md with new patterns, dependencies, or structure from this session and to reconcile STATE.md (it also migrates a legacy-format STATE.md). If it changed CLAUDE.md, commit it (commit agent, "docs: update CLAUDE.md for {NAME}").

**STATE UPDATE**:
- All phases and validation passed → (worktree mode: see Worktree Mode) `**Active**: None`, `**File**`/`**Phase**`: `—`, `**Status**: ✅ Complete`, and the plan's row `✅ Complete`
- Partially complete (blockers, user stopped, unresolved findings) → keep `**Active**` on the plan, `**Status**: ⏸️ Paused`, `**Phase**` = last completed phase
- Update `**Updated**`

Final summary:

```markdown
**Autopilot Complete**

**Branch**: `feat/{name}`  ·  **Plan**: {NAME}  ·  **Status**: {Complete / Paused}

**Commits**:
- `{hash}` {message}

**What Was Done**:
- [Phase 1 summary]
- [Phase 2 summary]

**Preflight**: {confirmed} confirmed · {fixed} fixed · {dropped} false positives dropped · {unresolved} unresolved
{list unresolved / needs-decision items, if any}

**Next Steps**:
- Review: `git log {BASE}..feat/{name} --oneline`
- Open a PR: `gh pr create`
- Or continue: `/autopilot` resumes from STATE.md
```

**Multi-repo**: same summary, with a per-repo section (branch, commits, preflight result, `cd {repo} && gh pr create`). Open one PR per repo; they can reference each other's branch name.

---

## Commit Checkpoint Rules

Autopilot commits **early and often** with the commit agent, which picks the conventional prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, …) from the diff.

**When to commit**: after bootstrap scaffolding, after the plan is written (git repos only), after each phase, after preflight fixes, after CLAUDE.md updates.
**When NOT to commit**: no changes (empty diff), or validation is failing and fixes haven't been applied yet.

Commits are non-destructive, so they happen automatically with or without `--full`. `--full` only removes the other approval gates.

## Critical Guidelines

### Be Autonomous But Not Reckless
- Run the full loop without unnecessary prompts, and commit after every milestone
- Always stop for blockers and for validation failures that can't be fixed automatically
- Never force-push, delete branches, or make destructive changes without asking

### Multi-Repo Mode
- Triggered when the plan references child directories that are git repos — whether or not the parent is a repo. The parent is never branched or committed in this mode; STATE.md and plans at the parent level stay uncommitted coordination artifacts (the user can commit them with `/commit`).
- The same branch name is created in every affected repo; commits, preflight and reports are per repo; a failure in one repo doesn't stop validation of the others.
- Plans should prefix file paths with the repo directory (e.g. `{repo}/src/models/...`) so agents write to the right place and repo detection works.

### Compose Existing Agents
- Agents: `bootstrap`, `blueprint`, `implement`, `parallelize`, `showcase`, `audit`, `secure`, `a11y`, `test`, `commit`, `update` — plus the `preflight` workflow
- Don't do their jobs inline — delegate to specialists
- Always use the commit agent for commits

### Handle Failures Gracefully
- At most 2 automatic fix rounds per validation; then report to the user
- Never silently skip failing validation

### Track State
`{{STATE_FILE}}` must always reflect progress so `/autopilot` can resume: update it at Step 1b (activate), after the blueprint agent (verify it exists), after each phase commit (4c), and at the end (Step 6). Keep the parseable header fields (`Active`, `File`, `Phase`, `Status`, `Updated`, plus `Branch`/`Base`/`Repos`, and `Target`/`Dispatched`/`Queued` from `/dispatch`) at the top, one row per plan under `## Plans`, and nothing else.

### Keep the User Informed
- Brief status updates between major steps
- Detailed reports only at the end or when asking for decisions
