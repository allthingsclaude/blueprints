---
description: Full autonomous development loop - from idea to committed code
argument-hint: [--full] [feature description or plan name]
author: "@markoradak"
---

# Auto Mode

Full autonomous development loop. I'll take it from idea to committed code on a feature branch.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Git Status**:
!`git status --short 2>/dev/null || echo "Not a git repository"`

**Active Plan**:
!`cat {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

**Available Plans**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null || echo "No plans found"`

**Project Detection**:
!`ls package.json tsconfig.json Cargo.toml go.mod pyproject.toml requirements.txt 2>/dev/null || echo "No recognized project files"`

---

## Arguments

$ARGUMENTS

---

## Auto Mode Protocol

You are now in **AUTO MODE** — a full development loop that orchestrates the entire workflow from idea to committed code. Follow these steps precisely and in order.

### Step 0: Parse Arguments

Parse `$ARGUMENTS` for:
- **`--full`** flag: If present, run the entire loop without stopping for confirmation — commit automatically, skip approval prompts, maximize autonomy. Remove this flag from the remaining arguments before further processing.
- **Plan name**: If the first remaining word matches an existing plan in `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md`, treat it as a plan name to execute.
- **Feature description**: Otherwise, treat remaining arguments as a feature description for brainstorming.

Store the `--full` preference — you'll check it at every commit checkpoint and decision point.

---

### Step 1: Determine What to Work On

Follow this decision tree **in order**:

#### 1a. Check for Active Plan in STATE.md

Read `{{STATE_FILE}}`. If it contains an active plan (status is `In Progress` or `Paused`):
- Load the plan file referenced in STATE.md
- Check which phase we're on and what tasks remain
- **If there are uncompleted tasks** → skip to **Step 3** (branch) then **Step 4** (execute)
- Report: "Resuming active plan: {NAME}, Phase {N}"

#### 1b. Check if Arguments Match an Existing Plan

If a plan name was provided, find the matching plan file in `{{PLANS_DIR}}/` (match by name portion, e.g., `AUTH` matches `PLAN_01_AUTH.md`):
- Load that plan
- **STATE UPDATE**: Update `{{STATE_FILE}}` to activate this plan. Read the existing STATE.md first to preserve the Plans table and other plan sections. Update the header fields:
  ```markdown
  **Active**: {NN}_{NAME}
  **File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
  **Phase**: 1
  **Status**: 🚧 In Progress
  **Updated**: [ISO timestamp]
  ```
- Update the plan's status in the Plans table to `🚧 In Progress`
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

**COMMIT CHECKPOINT**: After bootstrap completes, commit the scaffolding:
- Stage all new project files
- Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context: "chore: bootstrap {NAME} project scaffolding"

**If existing project:**
Use the Task tool to launch the plan agent (`subagent_type="plan"`) with the feature name and brainstorm context. This will generate `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and update `{{STATE_FILE}}`.

Wait for the plan agent to complete, then load and display a brief summary of the plan.

**COMMIT CHECKPOINT**: After plan is created, commit it:
- Stage the plan file and STATE.md
- Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context: "docs: add implementation plan for {NAME}"

---

### Step 3: Create Feature Branch

Before starting implementation, create a feature branch:

1. Determine the branch name from the plan name:
   - Convert plan name to lowercase kebab-case
   - Prefix with `feat/` (e.g., plan "USER_AUTH" → branch `feat/user-auth`)
2. Check if the branch already exists:
   - If yes and we're resuming → switch to it: `git checkout feat/{name}`
   - If yes and NOT resuming → switch to it (it may have prior work)
   - If no → create it: `git checkout -b feat/{name}`
3. Confirm the branch: `git branch --show-current`

Report: "Working on branch: `feat/{name}`"

---

### Step 4: Execute the Plan (Phase by Phase)

Load the plan from `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and identify all phases.

**For each phase**, repeat this cycle:

#### 4a. Assess the Phase

Count the `- [ ]` uncompleted tasks in the current phase.

#### 4b. Execute the Phase

| Phase Tasks | Mode | Rationale |
|---|---|---|
| 1-5 tasks | `/implement` | Small enough for a single agent |
| 6+ tasks | `/parallelize` | Benefits from concurrent execution |

**For `/implement` mode:**
Use the Task tool to launch the implement agent (`subagent_type="implement"`) with the plan name and instruction to work on the current phase only (e.g., "Execute Phase 1 only, then stop").

**For `/parallelize` mode:**
Use the Task tool to launch the parallelize orchestrator (`subagent_type="parallelize"`) with the plan name and instruction to work on the current phase only.

Wait for the agent to complete. Review its summary.

**If the agent reports blockers:**
Present the blockers to the user and ask how to proceed. Do NOT continue until blockers are resolved or the user says to skip them.

#### 4c. Commit the Phase

**COMMIT CHECKPOINT**: After each phase completes:
- Use the Task tool to launch the commit agent (`subagent_type="commit"`) with context describing what was accomplished in this phase
- The commit agent will determine the appropriate prefix (`feat:`, `fix:`, `refactor:`, `chore:`, etc.) based on the nature of the changes
- The commit message should reference the plan and phase (e.g., "feat: implement user authentication (PLAN_AUTH Phase 1)")

**STATE UPDATE**: Read and update `{{STATE_FILE}}`:
- Increment `**Phase**` to the next phase number
- Keep `**Status**` as `🚧 In Progress`
- Update `**Updated**` timestamp
- Mark completed tasks as `✅` in the per-plan task tables
- Update completed phase headers from `🚧` to `✅`
- Update the Progress column in the Plans overview table

#### 4d. Continue to Next Phase

After committing and updating STATE.md, check if there are more phases remaining:
- **More phases** → loop back to 4a for the next phase
- **All phases done** → proceed to Step 5

---

### Step 5: Validate & Fix

After all phases are implemented and committed, run validation. Each step uses a subagent:

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

**If ALL validation passes cleanly**, report:
```markdown
**Validation Complete**
- Audit: Passed
- Tests: Passed
- Security: Passed
```

---

### Step 6: Report

**STATE UPDATE**: Before reporting, read and update `{{STATE_FILE}}` to reflect final status:
- If all phases and validation passed: set `**Active**` to `None`, update plan's status to `✅ Complete` in Plans table, set `**Status**: ✅ Complete`
- If partially complete (blockers, user stopped): keep `**Active**` pointing to the plan, set `**Status**: ⏸️ Paused`
- Update `**Phase**` to the last completed phase number
- Update `**Updated**` timestamp
- Update all task statuses in the per-plan task tables to reflect final state

After everything is done (or stopped), provide a final summary:

```markdown
**Auto Mode Complete**

**Branch**: `feat/{name}`
**Plan**: {NAME}
**Status**: {Complete / Partially Complete}

**Commits Made**:
- `{hash}` {commit message 1}
- `{hash}` {commit message 2}
- `{hash}` {commit message 3}

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
- Or continue working: `/auto` (will resume from STATE.md)
```

---

## Commit Checkpoint Rules

Auto mode commits **early and often** using the commit agent (`subagent_type="commit"`). The commit agent determines the right prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, etc.) based on the changes.

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

### Compose Existing Agents
- Use the existing subagent types: `bootstrap`, `plan`, `implement`, `parallelize`, `audit`, `test`, `secure`, `commit`
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
# Project State

**Active**: {NN}_{NAME}
**File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
**Phase**: {current_phase_number}
**Status**: 🚧 In Progress
**Updated**: {ISO timestamp}
```

**When updating STATE.md**:
- Always READ existing STATE.md first to preserve the Plans table and per-plan task sections
- Update the header fields (Active, File, Phase, Status, Updated)
- Update the active plan's status in the Plans overview table
- Update task statuses (`⏳` → `🚧` → `✅`) in the per-plan task tables
- Update phase status emoji in phase headers (`⏳` → `🚧` → `✅`)
- Update the Progress column in the Plans table (e.g., `5/18 tasks`)

**When all work on a plan is done**:
- Set `**Active**` to `None` (or the next plan if one exists)
- Update the plan's status in the Plans table to `✅ Complete`
- Mark all tasks as `✅` in the plan's task tables
- Set `**Status**` to `✅ Complete`

If `/auto` is interrupted or paused, ensure STATE.md reflects where it stopped so the next `/auto` run can resume correctly. Plan document checkboxes are updated by the implement/parallelize agents.

### Keep the User Informed
- Brief status updates between major steps
- Detailed reports only at the end or when asking for decisions
- Don't flood with intermediate output — the subagents handle that internally
