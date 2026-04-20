---
description: Full autonomous development loop - from idea to committed code
argument-hint: --full feature description or plan name
author: "@markoradak"
---

# Autopilot Mode

Full autonomous development loop. I'll take it from idea to committed code on a feature branch.

## Current State

**Working Directory**: !`pwd`

**Is Git Repo**: !`git rev-parse --is-inside-work-tree 2>/dev/null || echo "no"`

**Branch**: !`git branch --show-current 2>/dev/null || echo "(not a repo — will scan children)"`

**Git Status**:
!`git status --short 2>/dev/null || echo "(not a repo)"`

**Child Git Repos** (for multi-repo mode):
!`find . -mindepth 2 -maxdepth 2 -name .git -type d 2>/dev/null`

**Active Plan**:
!`cat {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

**Available Plans**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null || echo "No plans found"`

**Project Detection**:
!`ls package.json tsconfig.json Cargo.toml go.mod pyproject.toml requirements.txt 2>/dev/null || echo "(no root-level project files — multi-repo likely)"`

---

## Arguments

$ARGUMENTS

---

## Autopilot Protocol

You are now in **AUTOPILOT MODE** — a full development loop that orchestrates the entire workflow from idea to committed code. Follow these steps precisely and in order.

### Step 0: Parse Arguments

Parse `$ARGUMENTS` for (in order):
- **`--full`** flag: If present, run the entire loop without stopping for confirmation — commit automatically, skip approval prompts, maximize autonomy. Remove this flag from the remaining arguments before further processing.
- **`--repos a,b,c`** flag: If present, overrides auto-detection for multi-repo mode. Value is a comma-separated list of child directory names that should be treated as "affected" regardless of what the plan references. Remove this flag and its value from the remaining arguments. Store as `REPOS_OVERRIDE`.
- **Plan name**: If the first remaining word matches an existing plan in `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` (case-insensitive, matched by the `{NAME}` portion), treat it as a plan name to execute.
- **Feature description**: Otherwise, treat remaining arguments as a feature description for brainstorming.

Store the `--full` and `REPOS_OVERRIDE` preferences — you'll check them at commit checkpoints and in Step 3a respectively.

---

### Step 1: Determine What to Work On

Follow this decision tree **in order**:

#### 1a. Check for Active Plan in STATE.md

Look for `{{STATE_FILE}}` in this search order (first match wins):
1. `./{{STATE_FILE}}` — cwd
2. `../{{STATE_FILE}}` — parent directory (useful when user accidentally ran from inside a child repo in a multi-repo setup)

If found in the parent, emit a notice: "Found {{TASKS_DIR}}/ in parent directory — treating parent as the working root. Suggest running `/autopilot` from `{parent_abspath}` in the future."

Then, if STATE.md contains an active plan (status is `In Progress` or `Paused`):
- If the resolved STATE.md is at `../`, **change working directory to the parent** before continuing. All subsequent steps (discovery, branching, commits) must operate relative to the parent.
- Load the plan file referenced in STATE.md
- Check which phase we're on and what tasks remain
- **If there are uncompleted tasks** → skip to **Step 3** (branch) then **Step 4** (execute)
- Report: "Resuming active plan: {NAME}, Phase {N}"

#### 1b. Check if Arguments Match an Existing Plan

If a plan name was provided, find the matching plan file in `{{PLANS_DIR}}/` (match by name portion, e.g., `AUTH` matches `PLAN_01_AUTH.md`):
- Load that plan
- **STATE UPDATE**: Update `{{STATE_FILE}}` to activate this plan. Read the existing STATE.md first to preserve the `## Overview` table and `## Plans` sections. Update the header fields:
  ```markdown
  **Active**: {NN}_{NAME}
  **File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
  **Phase**: 1
  **Status**: 🚧 In Progress
  **Updated**: [ISO timestamp]
  ```
- Update the plan's status in the Overview table to `🚧 In Progress`
- Skip to **Step 3** (branch) then **Step 4** (execute)

#### 1c. No Active Work — Enter Brainstorm

If there's nothing to resume:

**If arguments contain a feature description:**
Enter brainstorm mode. You are exploring the idea, NOT implementing. Your goals:
1. Understand the user's intent
2. Ask 2-4 focused followup questions to clarify scope, approach, and constraints
3. Explore the codebase for relevant context (use Read, Grep, Glob)
4. Converge on a clear approach

**If no arguments at all:**
Ask the user: "What would you like to build? Describe the feature or change you have in mind."
Then proceed with brainstorm as above once they respond.

**Brainstorm rules:**
- DO NOT create, modify, or implement any code
- DO ask clarifying questions (scope, approach, edge cases)
- DO explore existing code for context
- DO track any image references the user shares (screenshots, mockups, design references, wireframes) — note their file paths so the plan agent can copy them to `{{TASKS_DIR}}/references/`
- Keep it to 2-3 rounds of questions max, then converge
- Once the approach is clear, move to Step 2

---

### Step 2: Create the Plan

After brainstorming, determine which planning mode to use:

#### Detect Project Type

Check if this is a **new project** (needs bootstrapping) or an **existing project** (needs a plan):

**New project indicators** (if most are true):
- No `src/` or `app/` or `lib/` directory
- No or nearly empty `package.json` / `Cargo.toml` / `go.mod` etc.
- Very few source files (< 5)
- The user explicitly said "new project" or "start from scratch"

**If new project:**
Use the Task tool to launch the bootstrap agent (`subagent_type="bootstrap"`) with the feature name and brainstorm context. This will generate both a plan and a bootstrap.sh script.

After the bootstrap agent completes, ask the user: "Bootstrap script is ready. Should I run it to set up the project?"
- If yes → run `bash bootstrap.sh`
- If no → note it and continue

**UPDATE CLAUDE.md**: After bootstrap completes, run the update agent to generate an initial CLAUDE.md:
- Use the Task tool to launch the update agent (`subagent_type="update"`) to scan the newly bootstrapped project and create CLAUDE.md

**COMMIT CHECKPOINT**: After bootstrap and CLAUDE.md update complete, commit the scaffolding:
- Stage all new project files (including CLAUDE.md)
- Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context: "chore: bootstrap {NAME} project scaffolding"

**If existing project:**
Use the Task tool to launch the plan agent (`subagent_type="plan"`) with the feature name and brainstorm context. **Include any image file paths collected during brainstorming** so the plan agent copies them to `{{TASKS_DIR}}/references/` and links them in the plan. This will generate `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and update `{{STATE_FILE}}`.

Wait for the plan agent to complete, then load and display a brief summary of the plan.

**COMMIT CHECKPOINT (conditional)**: After plan is created, commit it **only if cwd is a git repo**:
- Check: `git rev-parse --is-inside-work-tree 2>/dev/null`
- If cwd IS a git repo (single-repo or meta-repo case):
  - Stage the plan file and STATE.md
  - Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context: "docs: add implementation plan for {NAME}"
- If cwd is NOT a git repo (parent-with-child-repos case):
  - **Skip the commit** — the plan and STATE.md stay as uncommitted coordination artifacts at the parent level.
  - Report: "Plan created at parent level (not a git repo) — left uncommitted as coordination artifact. To version it, init a meta-repo at the parent or commit in any workflow you choose."

---

### Step 3: Detect Repositories & Create Feature Branch(es)

Before starting implementation, detect the repository topology and create feature branches.

#### 3a. Discover Repos & Determine Mode

Always perform both discoveries below before deciding mode. Mode is chosen based on **what the plan references**, not purely on whether cwd is a git repo. This correctly handles three distinct layouts: plain single-repo, parent-is-not-a-repo-but-children-are, and parent-is-a-meta-repo-with-child-repos.

**Discovery 1 — is cwd itself a git repo?**
```bash
git rev-parse --is-inside-work-tree 2>/dev/null
```
Store as `CWD_IS_REPO` (true/false).

**Discovery 2 — are there child git repos?**
```bash
find . -mindepth 2 -maxdepth 2 -name .git -type d 2>/dev/null
```
Store the list as `CHILD_REPOS`. (Avoid `for` / `while` loops in inline shell — some harnesses reject control-flow statements.)

**Discovery 3 — which repos does the plan reference?**
If there's an active plan file (`{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md`), for each entry in `CHILD_REPOS`, grep the plan for its directory name:
```bash
grep -c "{child_repo_name}" {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
```
Any child with **> 0 mentions** goes into `AFFECTED_CHILDREN`.

**Mode decision** (evaluate in this order, first match wins):

| Condition | Mode | `AFFECTED_REPOS` | Notes |
|---|---|---|---|
| User passed `--repos a,b,...` | multi | `{a, b, ...}` | Explicit override wins over all auto-detection |
| `AFFECTED_CHILDREN` is non-empty | multi | `AFFECTED_CHILDREN` | Applies even if cwd is itself a git repo (meta-repo case). The parent repo, if any, is NOT branched — it stays where it is. |
| `CWD_IS_REPO` is true | single | `[.]` | No child repos mentioned in plan → plain single-repo |
| Otherwise | fail | — | "No git repo found here, and no child directories with `.git/` are referenced by the plan. Either cd into a repo, initialize one, or verify the plan references the correct repo directories." |

**Ambiguity warning**: If `CHILD_REPOS` is non-empty but `AFFECTED_CHILDREN` is empty AND `CWD_IS_REPO` is true (falling through to single-repo mode), this might indicate a plan authoring mistake. Emit a warning before proceeding:

> "Detected child git repos {list} but the plan does not reference any of them by directory name. Proceeding with single-repo mode (branching in cwd). If you intended multi-repo, either (a) update the plan's file paths to include the repo prefix (e.g., `{child_name}/src/...`), or (b) re-run with `--repos {child_name}` to force multi-repo mode."

Prompt the user to confirm before continuing (in `--full` mode, auto-continue with the warning still logged).

**Important — meta-repo case**: If cwd is a git repo AND there are affected children, we enter **multi-repo mode**. Branches are created only in the affected children. The parent (meta) repo is left alone — no branch, no commits, no state mutations. STATE.md changes at the parent level remain uncommitted coordination artifacts. If the user later wants to version those in the meta-repo, they can commit them manually via `/commit`.

Report the decision:
- Single-repo: "Branching in this repo."
- Multi-repo: "Plan touches {N} child repo(s): {list}. Will branch in each. Parent repo (if any) left untouched."

#### 3b. Pre-flight: Check for Dirty Working State

Before branching, guard against clobbering uncommitted work in any target repo.

For each repo in `AFFECTED_REPOS`:
1. `cd {repo}` (skip for single-repo mode where this is cwd)
2. Run: `git status --short`
3. If non-empty → mark this repo as "dirty" and collect the output.
4. `cd -`

If any repo is dirty:
- Report to the user: list each dirty repo and its `git status --short` output.
- Ask: "Uncommitted changes found in {N} repo(s). How should I proceed?
  - **stash** — I'll stash the changes in each dirty repo before branching (`git stash push -u -m 'autopilot pre-branch'`). You can restore with `git stash pop` later.
  - **abort** — stop autopilot so you can handle the changes manually.
  - **continue** — proceed anyway; the uncommitted changes will carry onto the new branch (only safe if you want them there)."
- In `--full` mode, default to **abort** (never silently discard or carry unintended work).
- Wait for user decision before proceeding.

If all repos are clean (or user chose stash/continue), proceed to 3c.

#### 3c. Create Branches

Determine the branch name:
- Convert plan name to lowercase kebab-case
- Prefix with `feat/` (e.g., plan "USER_AUTH" → branch `feat/user-auth`)

**Single-repo mode**: run branching in cwd.
**Multi-repo mode**: run branching in each affected repo.

For each target repo, in order:
1. `cd {repo}` (or stay at cwd for single-repo)
2. Check current branch: `git branch --show-current`
3. Check if `feat/{name}` exists:
   - Exists + we're resuming → switch to it: `git checkout feat/{name}`
   - Exists + not resuming → switch to it (prior work)
   - Does not exist → create it: `git checkout -b feat/{name}`
4. Confirm the branch.
5. `cd -` (return to parent)

**STATE UPDATE**: Add a `**Repos**:` line to STATE.md header listing the affected repos and the branch name:
```markdown
**Repos**: cli-shopnosis-shopper-app, cli-shopnosis-shopper-server
**Branch**: feat/{name}
```

Report: "Working on branch `feat/{name}` in {N} repo(s): {list}"

---

### Step 4: Execute the Plan (Phase by Phase)

Load the plan from `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and identify all phases.

**For each phase**, repeat this cycle:

#### 4a. Assess the Phase

Count the `- [ ]` uncompleted tasks in the current phase.

#### 4b. Execute the Phase

**First, check if this phase involves landing page / marketing page / homepage design work.** Look for task descriptions containing: "landing page", "homepage", "marketing page", "hero section", "showcase page", or similar. If the phase is primarily about designing/building a landing page, use the **showcase agent** instead of the generic implement agent.

| Phase Type | Phase Tasks | Mode | Rationale |
|---|---|---|---|
| Landing page | Any | `/showcase` | Specialized for high-end landing page design with animations |
| Regular | 1-5 tasks | `/implement` | Small enough for a single agent |
| Regular | 6+ tasks | `/parallelize` | Benefits from concurrent execution |

**For `/showcase` mode:**
Use the Task tool to launch the showcase agent (`subagent_type="showcase"`) with the plan context and any reference files from `{{TASKS_DIR}}/references/`.

**For `/implement` mode:**
Use the Task tool to launch the implement agent (`subagent_type="implement"`) with the plan name and instruction to work on the current phase only (e.g., "Execute Phase 1 only, then stop"). **Multi-repo mode**: include in the prompt the list of affected repos and their paths so the agent writes files into the correct sub-directories (file paths in the plan should already be prefixed with the repo name).

**For `/parallelize` mode:**
Use the Task tool to launch the parallelize orchestrator (`subagent_type="parallelize"`) with the plan name and instruction to work on the current phase only. **Multi-repo mode**: include the list of affected repos in the prompt.

Wait for the agent to complete. Review its summary.

**If the agent reports blockers:**
Present the blockers to the user and ask how to proceed. Do NOT continue until blockers are resolved or the user says to skip them.

#### 4c. Commit the Phase

**COMMIT CHECKPOINT**: After each phase completes:

**Single-repo mode**:
- Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context describing what was accomplished in this phase
- The commit agent will determine the appropriate prefix (`feat:`, `fix:`, `refactor:`, `chore:`, etc.) based on the nature of the changes
- The commit message should reference the plan and phase (e.g., "feat: implement user authentication (PLAN_AUTH Phase 1)")

**Multi-repo mode**:
- Before the commit loop, capture the parent directory: `PARENT_DIR=$(pwd)`.
- For each repo in `AFFECTED_REPOS`:
  1. `cd "$PARENT_DIR/{repo}"` (use the absolute path — never rely on `cd -` chains)
  2. Check `git status --short` — if empty, skip this repo for this phase (no changes here).
  3. If there are changes, launch the commit agent (`subagent_type="commit"`) with context including (a) what was accomplished in this phase, and (b) which repo this is. The commit runs inside the repo's working directory.
- After the loop, **unconditionally** return: `cd "$PARENT_DIR"`.
- Confirm cwd is the parent before the STATE.md update below (run `pwd` to verify).
- A single phase may produce commits in multiple repos; that's expected.
- Record the resulting commit hashes per repo for the final report.

**STATE UPDATE** (always from the parent dir — STATE.md lives at `$PARENT_DIR/{{STATE_FILE}}`): Read and update `{{STATE_FILE}}`:
- Increment `**Phase**` to the next phase number
- Keep `**Status**` as `🚧 In Progress`
- Update `**Updated**` timestamp
- Mark completed tasks as `✅` in the task tables under `## Plans`
- Update completed phase headers from `🚧` to `✅`
- Update the Progress column in the Overview table

#### 4d. Continue to Next Phase

After committing and updating STATE.md, check if there are more phases remaining:
- **More phases** → loop back to 4a for the next phase
- **All phases done** → proceed to Step 5

---

### Step 5: Validate & Fix

After all phases are implemented and committed, run validation. Each step uses a subagent.

**Multi-repo mode**: every validation step below runs **once per affected repo**, with `cd {repo}` before launching the agent. Aggregate results per repo into the final report. A failure in one repo does not short-circuit the others — validate all, then report aggregated findings and decide together.

#### 5a. Audit

Use the Task tool to launch the audit agent (`subagent_type="audit"`).

Review the audit report. If it finds **critical or important issues**:
- Attempt auto-fix (the audit agent can do this)
- Re-run typecheck/lint after fixes
- If issues persist after 2 fix attempts → report to user and ask whether to proceed

**COMMIT CHECKPOINT**: If the audit resulted in fixes, commit them:
- Use the commit agent with context: "fix: address audit findings for {NAME}"

#### 5b. Test

Use the Task tool to launch the test agent (`subagent_type="test"`).

Review test results:
- If all tests pass → continue
- If tests fail → attempt to fix (max 2 attempts)
- If tests still fail → report to user with failure details and ask whether to proceed

**COMMIT CHECKPOINT**: If test fixes were made, commit them:
- Use the commit agent with context: "fix: resolve test failures for {NAME}"

#### 5c. Security

Use the Task tool to launch the secure agent (`subagent_type="secure"`).

Review security report:
- If no critical/high findings → continue
- If critical findings → attempt to fix and re-scan (max 2 attempts)
- If still failing → report to user and ask whether to proceed

**COMMIT CHECKPOINT**: If security fixes were made, commit them:
- Use the commit agent with context: "fix: address security findings for {NAME}"

#### 5d. Accessibility

**Conditional** — only when frontend/UI code was modified in this plan.

**Detection**: Check if any modified files (from `git diff --name-only main...HEAD` or the plan's file list) are in typical frontend paths (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.html`, component directories).

- **If frontend code exists**: Use the Task tool to launch the a11y agent (`subagent_type="a11y"`).
  - Review the a11y report
  - If critical findings → attempt auto-fix (max 2 retries)
  - If still failing → report to user and ask whether to proceed
- **If no frontend code was touched**: Skip with note "No frontend changes — skipping accessibility audit"

**COMMIT CHECKPOINT**: If accessibility fixes were made, commit them:
- Use the commit agent with context: "fix: address accessibility findings for {NAME}"

**If ALL validation passes cleanly**, report:
```markdown
**Validation Complete**
- Audit: Passed
- Tests: Passed
- Security: Passed
- Accessibility: Passed (or Skipped — no frontend changes)
```

---

### Step 6: Update & Report

**UPDATE CLAUDE.md**: Before reporting, sync CLAUDE.md with the current project state:
- Use the Task tool to launch the update agent (`subagent_type="update"`) to scan the project and update CLAUDE.md with any new patterns, dependencies, or structural changes from this session
- If CLAUDE.md was updated, include it in the final commit

**STATE UPDATE**: Read and update `{{STATE_FILE}}` to reflect final status:
- If all phases and validation passed: set `**Active**` to `None`, update plan's status to `✅ Complete` in Overview table, set `**Status**: ✅ Complete`
- If partially complete (blockers, user stopped): keep `**Active**` pointing to the plan, set `**Status**: ⏸️ Paused`
- Update `**Phase**` to the last completed phase number
- Update `**Updated**` timestamp
- Update all task statuses in the task tables under `## Plans` to reflect final state

After everything is done (or stopped), provide a final summary.

**Single-repo mode**:

```markdown
**Autopilot Complete**

**Branch**: `feat/{name}`
**Plan**: {NAME}
**Status**: {Complete / Partially Complete}

**Commits Made**:
- `{hash}` {commit message 1}
- `{hash}` {commit message 2}

**What Was Done**:
- [Phase 1 summary]
- [Phase 2 summary]

**Validation Results**:
- Audit: {result}
- Tests: {result}
- Security: {result}

**Next Steps**:
- Review changes: `git log main..feat/{name} --oneline`
- Create PR when ready: `gh pr create`
- Or continue working: `/autopilot` (will resume from STATE.md)
```

**Multi-repo mode**:

```markdown
**Autopilot Complete (multi-repo)**

**Plan**: {NAME}
**Branch**: `feat/{name}` (same across all affected repos)
**Status**: {Complete / Partially Complete}

**Per-repo results**:

### {repo-name-1}
- Branch: `feat/{name}`
- Commits:
  - `{hash}` {commit message}
  - `{hash}` {commit message}
- Next: `cd {repo-name-1} && gh pr create`

### {repo-name-2}
- Branch: `feat/{name}`
- Commits:
  - `{hash}` {commit message}
- Next: `cd {repo-name-2} && gh pr create`

**What Was Done**:
- [Phase 1 summary]
- [Phase 2 summary]

**Validation Results**:
- Audit: {result per repo}
- Tests: {result per repo}
- Security: {result per repo}

**Next Steps**:
- Review changes in each repo individually.
- Open one PR per repo (they can reference each other's branch name).
- Or resume: `/autopilot` will pick up from STATE.md.
```

---

## Commit Checkpoint Rules

Autopilot commits **early and often** using the commit agent (`subagent_type="commit"`). The commit agent determines the right prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, etc.) based on the changes.

**When to commit:**
- After bootstrap scaffolding is created
- After plan document is generated
- After each implementation phase completes
- After audit/test/security fixes are applied

**When NOT to commit:**
- If there are no changes (empty diff)
- If validation is failing and fixes haven't been applied yet

**`--full` behavior at commit checkpoints:**
- With `--full`: commit agent runs automatically at every checkpoint, no user prompt
- Without `--full` (default): commit agent still runs automatically — commits are non-destructive and keep work safe. The `--full` flag controls other approval gates (like blocker decisions), not commits.

---

## Critical Guidelines

### Be Autonomous But Not Reckless
- Execute the full loop without unnecessary user prompts
- Commit after every major milestone to keep work safe
- BUT always stop for: blockers and validation failures that can't be auto-fixed
- Never force-push, delete branches, or make destructive changes without asking

### Multi-Repo Mode
- **Trigger**: multi-repo mode activates whenever the plan references child directories that are git repos — regardless of whether the parent (cwd) is itself a git repo. The parent is never branched in this mode.
- Three scenarios it handles:
  1. Parent is NOT a git repo + children are → multi-repo.
  2. Parent IS a git repo (meta-repo) + children are + plan mentions them → multi-repo, meta-repo untouched.
  3. Parent IS a git repo + no children mentioned in plan → single-repo (plain case).
- The same branch name (`feat/{name}`) is created in every "affected" child repo.
- Commits run per-repo: `cd {repo}`, check `git status`, launch commit agent, `cd -`.
- Validation (audit / test / security / a11y) runs per-repo. Failures in one repo don't short-circuit others — validate all, report together.
- STATE.md lives at the parent level and is NOT committed by autopilot; it's a coordination artifact. If the parent is itself a meta-repo and the user wants to version STATE.md/plan updates, they can do so manually via `/commit` in the parent — autopilot does not touch the parent.
- The plan document should prefix file paths with the repo directory name (e.g., `cli-shopnosis-shopper-server/src/models/...`) so the implement/parallelize agents write into the right sub-directory, and so the grep-for-mentions step correctly detects affected repos.
- If the user passes `--repos repoA,repoB`, override auto-detection with that explicit list.

### Compose Existing Agents
- Use the existing subagent types: `bootstrap`, `plan`, `implement`, `parallelize`, `showcase`, `audit`, `test`, `secure`, `a11y`, `commit`, `update`
- Do NOT try to do their jobs inline — delegate to specialists
- Always use the commit agent for commits — it writes proper conventional commit messages (`feat:`, `fix:`, `refactor:`, etc.)

### Handle Failures Gracefully
- Max 2 auto-fix retry attempts per validation step
- After 2 failures, stop and ask the user
- Never silently skip failing validation

### Track State (MANDATORY)

`{{STATE_FILE}}` must ALWAYS reflect current progress. Update it at these points:
1. **Step 1b** — when activating an existing plan (set Phase 1, Status In Progress)
2. **Step 2** — plan agent creates it (verify it exists after plan agent completes)
3. **Step 4c** — after each phase commit (increment Phase, update timestamp, mark completed tasks as ✅ in task tables)
4. **Step 6** — final status (Complete or Paused)

**STATE.md header fields** (always keep these parseable at the top):
```markdown
# State

**Active**: {NN}_{NAME}
**File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
**Phase**: {current_phase_number}
**Status**: 🚧 In Progress
**Updated**: {ISO timestamp}
```

**When updating STATE.md**:
- Always READ existing STATE.md first to preserve `## Overview` table and `## Plans` sections
- Update the header fields (Active, File, Phase, Status, Updated)
- Update the active plan's status in `## Overview` table
- Update task statuses (`⏳` → `🚧` → `✅`) in the task tables under `## Plans`
- Update phase status emoji in phase headers (`⏳` → `🚧` → `✅`)
- Update the Progress column in `## Overview` table (e.g., `5/18 tasks`)

**When all work on a plan is done**:
- Set `**Active**` to `None` (or the next plan if one exists)
- Update the plan's status in the Overview table to `✅ Complete`
- Mark all tasks as `✅` in the plan's task tables
- Set `**Status**` to `✅ Complete`

If `/autopilot` is interrupted or paused, ensure STATE.md reflects where it stopped so the next `/autopilot` run can resume correctly. Plan document checkboxes are updated by the implement/parallelize agents.

### Keep the User Informed
- Brief status updates between major steps
- Detailed reports only at the end or when asking for decisions
- Don't flood with intermediate output — the subagents handle that internally
