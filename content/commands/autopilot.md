---
description: Full autonomous development loop - from idea to committed code
argument-hint: [--full] plan name(s) or feature description
disable-model-invocation: true
author: "@markoradak"
---

# Autopilot Mode

Full autonomous development loop. I'll take it from idea to committed code on a feature branch.

## Current State

**Working Directory**: !`pwd`

**Is Git Repo**: !`git rev-parse --is-inside-work-tree 2>/dev/null || echo "no"`

**Branch**: !`git branch --show-current 2>/dev/null || echo "(not a repo — will scan children)"`

**Checkout** (this checkout's top level, then the main checkout — they differ in a linked worktree):
!`git rev-parse --show-toplevel 2>/dev/null || echo "(not a repo)"`
!`git worktree list --porcelain 2>/dev/null | head -1 || true`

**Git Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "(clean, or not a repo)"`

**Child Git Repos** (for multi-repo mode):
!`find . -mindepth 2 -maxdepth 2 -name .git -type d 2>/dev/null || true`

**STATE.md** (header and plans):
!`head -n 40 {{STATE_FILE}} 2>/dev/null || echo "No active plan"`

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
- **`--full`** flag: never stop to ask — whatever needs the user is set aside and listed at the end (see **When to Ask**). Without it, autopilot still asks only what needs the user. Remove it from the remaining arguments.
- **`--repos a,b,c`** flag: overrides auto-detection for multi-repo mode (comma-separated child directory names). Remove it and its value; store as `REPOS_OVERRIDE`.
- **Plan names**: a word names a plan when it matches an existing `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` (case-insensitive, as `{NAME}`, `{NN}_{NAME}`, `PLAN_{NN}_{NAME}`, or just `{NN}`).
  - **Two or more** remaining words name plans → the user wants them built together: go to **Parallel Runs**.
  - **The first word** names a plan → execute that plan. A named plan always wins over resuming a different active plan.
- **Feature description**: otherwise, treat the remaining arguments as a feature description to brainstorm.

A plan is **complete** when its row in `## Plans` says `✅ Complete`, or when no task is left unchecked in its phase sections except tasks marked **(USER)** (steps only the user can do). Count only from the first phase heading to the next section that isn't a phase: Success Criteria and testing checklists also use `- [ ]` and nobody ticks them.

### When to Ask

Ask only when the answer is genuinely the user's. Decide everything else yourself and keep going.

**Decide yourself**: internal choices that are easy to change later — naming, file structure, internal defaults and constants, small plan adjustments, how to handle a minor review finding. Take the option you'd recommend, record it where the project keeps decisions (if it has a decision log), add `- Provisional: {decision} ({why}; how to change it)` to the plan's `## Notes & Observations`, and list it under **Decided for you** in the final report.

**Needs the user** (this list wins when a choice fits both):
- spending money (paid runs, cloud resources), credentials, accounts or access
- deleting data, rewriting git history, or anything else destructive or outside this repository
- security design, a public API, or product behavior the plan doesn't settle — including significant plan changes an agent proposes
- the user's own uncommitted work
- checks still failing after the fix rounds, or a technical blocker you can't get past
- an unresolved critical review finding

What happens to those depends on the mode:
- **Default**: ask with `AskUserQuestion` (at most 4 questions per call; put everything that's pending into one), but don't stop for it. First launch whatever doesn't depend on the answer, then ask. If nothing later depends on it (a paid run at the end of the plan, say), finish Steps 5–6 first and ask at the end. For a step only the user can do, they can do it themselves, approve one you can run (such as a paid run), or leave it for later; anything they leave for later is set aside as with `--full`.
- **`--full`**, and every dispatched run: never ask.
  - A step only the user can do is set aside: leave its checkbox unchecked, mark the task **(USER)** at the start of its text, add `- Left for the user: {step} ({why})` to the plan's Notes (unless it's already there), tell the agents to skip it, and carry on.
  - A decision only the user can make, or an open critical finding: leave the tasks that depend on it unchecked, add `- Needs your decision: {question} (blocks: {tasks})` to the Notes, and carry on with the rest. Skip a phase that depends on it; Step 5 still reviews what was built.
  - Checks still failing after the fix rounds, or a technical blocker: don't build on top of it. Stop and finish Step 6 as `⏸️ Paused`, with the failure in the report.
  - The run ends `⏸️ Paused` while a `Needs your decision` note or a failing check is open. Steps marked **(USER)** don't keep it from completing. The final report lists everything that was set aside.

**Record answers, then act on them**: write each answer from the user into the plan's Notes as `- Decided ({date}): {question} → {answer}`, replacing the matching `- Needs your decision` line if there is one. Then act on it: relaunch the implement agent for the tasks that were waiting (telling it what was decided), or for a preflight item, launch one fixer and commit its fix. Do the same for your own provisional decisions that leave work undone.

**On resume** (Steps 1a and 1b), read the plan's open notes first: `grep -n -E '^- (Needs your decision|Left for the user)' {plan file}`. In default mode, ask the open decisions before launching agents. With `--full`, tell the agents to skip the tasks they block. Implement agents don't read the Notes section, so pass them the `Decided` and `Provisional` lines that matter for their phase in the prompt.

### Worktree Mode (dispatched runs)

This is a run that `/dispatch` (or this command's Parallel Runs offer) started when both hold: the two **Checkout** paths above differ (this is a linked git worktree), and the STATE.md header has a `**Target**` line and a `**Branch**` matching the current branch. Other plans may be running in sibling worktrees at the same time, and nobody is watching this session. In any other worktree (for example one you opened yourself), ignore this section and follow the normal steps.

Differences from the normal steps:

- **Plan required**: run the named plan, or the active plan in this worktree's STATE.md. If there's neither, stop: "This worktree needs an existing plan. Create plans in the main checkout, then run `/autopilot` there." Don't brainstorm, write plans, or bootstrap here, and skip **Parallel Runs** and **Dispatched Runs**.
- **Never asks**: follow **When to Ask** as with `--full`, whether or not it was passed; integration shows the user what you decided and set aside. Read the plan's `## Notes & Observations` first: the lines starting "Decided before dispatch" are the user's answers, and "Left for the user" lines are steps already set aside. Stop early (Step 6, `⏸️ Paused`) only when nothing else can move.
- **Single repo**: skip multi-repo detection.
- **Branch**: the dispatch already checked it out. In Step 3, skip 3a and branch creation: use the current branch and the `**Base**` from STATE.md.
- **Dependencies**: a fresh worktree has none installed. Before Step 4 or Step 5, whichever comes first, install them once with the lockfile-respecting command for the detected toolchain (e.g. `pnpm install --frozen-lockfile`, `npm ci`, `yarn install --immutable`, `bun install --frozen-lockfile`, `uv sync --locked`, `poetry install`), unless they're already present.
- **STATE.md is local**: the dispatch marks it `skip-worktree`, so git ignores your edits. Keep updating it as usual (it's how this run resumes), but never stage or commit it, and tell the commit agent not to. If `git add` warns that it's outside the sparse-checkout definition, that's this setting working. Whenever you update the header, change only the fields you're updating and keep `**Branch**`, `**Base**` and `**Target**`.
- **Step 6**: don't launch the update agent — integration syncs CLAUDE.md and the main checkout's STATE.md once, after merging. First commit whatever is still uncommitted apart from STATE.md (plan notes, decision-log entries) with the commit agent ("docs: record {NAME} notes for integration"), so integration finds a clean worktree. Keep `**Active**` and `**File**` on this plan (don't reset them to None) and set `**Status**` to `✅ Complete` when the plan is complete (only **(USER)** tasks left) and no `Needs your decision` note or failing check is open, otherwise `⏸️ Paused`, so integration knows which plan this run built and whether it finished. In the report, list the steps left for the user and the provisional decisions, and replace the PR steps with: "Run `/autopilot` (or `/integrate`) from the main checkout ({main checkout path}) to merge this run once the others finish."

### Dispatched Runs (main checkout)

Skip this in worktree mode. If the STATE.md header has a `**Dispatched**` line, check on those runs first: `grep -H -E '^\*\*(Active|Status)\*\*' .claude/worktrees/*/{{STATE_FILE}}`. A run is **finished** when its status is `✅ Complete`; a `⏸️ Paused` run stopped on something it needs from the user (its plan's Notes say what).
- **No plan named, and some runs finished** → say which runs finished, which are still going, and which are paused and why, then merge the finished ones: read `{{BLUEPRINTS_DIR}}/procedures/integrate.md` and follow it with caller `autopilot` (and `--yes` with `--full`). Its confirmation, which shows the decisions the runs made for the user, is the one question; if the user answers "Not now", end here ("Run `/autopilot` again when you want them merged"). Otherwise this session ends with its report.
- **Otherwise** → mention the runs in one line ("02 and 04 are still running in worktrees; 03 is paused: needs your decision on …") and continue below. A paused run can be merged as it is with `/integrate {plan}`, or finished in its worktree.

While runs are going, never edit files under `.claude/worktrees/` from here, and tell the agents you launch the same. If a typecheck, lint or test run here picks up files from there, exclude that directory (for example ESLint `--ignore-pattern '.claude/**'`, Jest `--testPathIgnorePatterns '/.claude/worktrees/'`).

### Parallel Runs

Skip this in worktree mode and in multi-repo mode.

**Several plans named** → read `{{BLUEPRINTS_DIR}}/procedures/dispatch.md` and follow it with caller `dispatch` and those plans (add `--yes` with `--full`). This session ends with its report; don't start a plan here.

**One plan named, or none** → before starting a plan here, check whether other plans could be built at the same time, each in its own worktree. Skip this without a word with `--full`, when the user described a new feature instead of naming a plan, and when the plan to run is already **under way** (a task in its phase sections is checked, or its `feat/` branch exists) or is on the `**Dispatched**` or `**Queued**` line (Step 1b handles those). The plan to run is the named one, else the active plan in STATE.md, else (no arguments) the plan Step 1c would suggest next.

1. **Find the ready plans**: from the `## Plans` rows (`grep -E '^\|' {{STATE_FILE}}` lists them all) and each plan's `**Depends on**` line (`grep -m1 -i 'depends on' {{PLANS_DIR}}/PLAN_*.md` reads them all at once), the plans that are not complete, not under way, not on the `**Dispatched**` line, and whose dependencies are all complete. A plan on the `**Queued**` line counts once the plans it waits for are complete.
2. **Nothing else ready** (apart from the plan to run) → continue with Step 1 and don't mention it.
3. **Otherwise** → read `{{BLUEPRINTS_DIR}}/procedures/dispatch.md` and follow it with caller `autopilot` and these plans, the plan to run first. Its overlap check decides which can really run together, and its confirmation is the only question you ask. It hands back when the user answers "just {plan} here" (then run that plan: Step 1b), "something else" (Step 1c, without suggesting a plan again), when the plan to run can't start in the first wave, when fewer than two plans can start together, or when a precondition fails: then continue with Step 1. If it launches the runs, this session's work is done: end with its report, and don't start any plan here.

---

### Step 1: Determine What to Work On

#### 1a. Resume an Active Plan

Look for `{{STATE_FILE}}` in `./` first, then `../` (useful when run from inside a child repo of a multi-repo setup). If found in the parent, say: "Found {{TASKS_DIR}}/ in the parent directory — treating it as the working root. Run `/autopilot` from `{parent_abspath}` next time." and change the working directory to the parent before continuing.

If a plan name was given and it isn't the active plan, skip to **1b**. Otherwise, if the STATE.md header shows an active plan (`🚧 In Progress` or `⏸️ Paused`):
- Read its open notes first (see **When to Ask**, On resume)
- Locate the plan's phases with `grep -n -E '^#{1,4} ' {plan file}` and find the first phase with unchecked tasks, not counting tasks marked **(USER)** (`grep -n -E '^[[:space:]]*([0-9]+\.|[-*]) \[ \]' {plan file}` shows where they are)
- **If tasks remain** → report "Resuming active plan: {NAME}, Phase {N}" and go to **Step 3**, then **Step 4**
- **If all phases are done but the plan isn't marked complete** → go to **Step 3**, then **Step 5**. In default mode, ask about any **(USER)** tasks once along the way (When to Ask).

#### 1b. Run a Named Plan

Outside worktree mode, check the `**Dispatched**` and `**Queued**` header lines first:
- **Dispatched** → if its run is finished (`✅ Complete` in `.claude/worktrees/{name}/{{STATE_FILE}}`), offer to merge it now (the integrate procedure, as in **Dispatched Runs**, with this plan). Otherwise stop: "{NAME} is being built in its own worktree (`.claude/worktrees/{name}`). Attach to its session there, or run `/autopilot` here once it's done to merge it."
- **Queued** → if the plans it waits for are complete, remove it from the `**Queued**` line (drop the line when it's empty) and continue. Otherwise say which plans it waits for and ask before running it here (with `--full`, stop).

If a plan name was given, load that plan and read its open notes (see **When to Ask**, On resume). If it's complete except tasks marked **(USER)** (integration leaves plans like that), ask about those tasks (When to Ask); for any the user approves, activate the plan, create its branch (Step 3) and run just those tasks, then finish with Step 6. Otherwise activate it in `{{STATE_FILE}}`. Update these header fields, and keep the `**Dispatched**`/`**Queued**` lines (Step 3 rewrites `**Branch**`/`**Base**`):
```markdown
**Active**: {NN}_{NAME}
**File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
**Phase**: {first phase with unchecked tasks}
**Status**: 🚧 In Progress
**Updated**: [ISO timestamp]
```
and set the plan's row in `## Plans` to `🚧 In Progress` (add a row if missing). If the header pointed at a different plan that was `🚧 In Progress`, set that plan's row to `⏸️ Paused`. Then go to **Step 3**, then **Step 4**.

#### 1c. No Active Work — Next Plan or Brainstorm

**If arguments contain a feature description**, explore the idea — you are NOT implementing yet:
1. Understand the user's intent
2. Ask 2-4 focused follow-up questions about scope, approach, and constraints
3. Explore the codebase for relevant context (`Grep`, `Glob`, targeted `Read`s)
4. Converge on a clear approach

**If there are no arguments**, pick up the plans first. Look for the next plan:
1. an unfinished plan that's already under way (its row says `🚧 In Progress` or `⏸️ Paused` and it isn't on the `**Dispatched**` line; with `--full`, skip one whose remaining tasks all wait on a `Needs your decision` note, since it would only pause again), else
2. the next ready plan (see **Parallel Runs**, step 1; find them now if that section was skipped): the one other ready plans depend on, otherwise the lowest-numbered.

If there is one, and the user hasn't already chosen something else in **Parallel Runs**, say "Next up: {plan} ({Phase N, x/y tasks done} or {ready; 03 waits for it}). To build something else, run `/autopilot` with a description." and continue with it in **1b**.

Otherwise, or if the user chose something else, ask: "What would you like to build? Describe the feature or change you have in mind." Then brainstorm as above.

**Brainstorm rules:**
- DO NOT create, modify, or implement any code
- DO track image references the user shares (screenshots, mockups, wireframes) — note their file paths so the blueprint agent can copy them to `{{TASKS_DIR}}/references/`
- Keep it to 2-3 rounds of questions, then converge and move to Step 2

---

### Step 2: Create the Plan

**New project** (most of these hold: no `src/`/`app/`/`lib/`, empty or missing project manifest, fewer than 5 source files, or the user said "new project"):
1. Unless `{{PLANS_DIR}}/PLAN_00_INITIAL.md` exists, launch the blueprint agent with the `Agent` tool (`subagent_type: "blueprint"`) with plan name `INITIAL {NAME}` and the full brainstorm brief (stack, package manager, dependencies, structure, services, constraints). Then launch the bootstrap agent (`subagent_type: "bootstrap"`) with the same brief — it reuses `PLAN_00_INITIAL.md` and writes `bootstrap.sh`.
2. Run the bootstrap script, unless the bootstrap agent's report lists steps that need the user (global installs, credentials, paid services); those follow **When to Ask**. Run it as `bash bootstrap.sh --yes` (the shell here has no interactive input, so the script's own confirmation prompt must be skipped).
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

**Ambiguity warning**: if `CHILD_REPOS` is non-empty, `AFFECTED_CHILDREN` is empty, and cwd is a repo, warn: "Detected child repos {list}, but the plan doesn't reference any of them by directory name. Proceeding in single-repo mode. If you meant multi-repo, prefix the plan's file paths with the repo name (e.g. `{child}/src/...`) or re-run with `--repos {child}`." Continue in single-repo mode and keep the warning in the final report.

Report: "Branching in this repo." or "Plan touches {N} child repo(s): {list}. Will branch in each. Parent repo (if any) left untouched."

#### 3b. Pre-flight: Dirty Working State

For each affected repo, run `git status --short` (from `$PARENT_DIR/{repo}` in multi-repo mode), ignoring what this session wrote itself (`{{STATE_FILE}}`, and the plan's notes from the parallel-runs question). If any repo is dirty, list them and ask:
- **stash** — `git stash push -u -m 'autopilot pre-branch'` in each dirty repo (restore later with `git stash pop`)
- **abort** — stop so the user can handle the changes
- **continue** — carry the changes onto the new branch

With `--full`, default to **abort** — never silently stash or carry unintended work.

#### 3c. Create Branches and Record the Base

Branch name: plan name in lowercase kebab-case with a `feat/` prefix (e.g. `USER_AUTH` → `feat/user-auth`).

In each target repo (use absolute paths: `cd "$PARENT_DIR/{repo}"`):
1. If `feat/{name}` exists → `git checkout feat/{name}` (if git says it's checked out in another worktree, a dispatched run is building it: stop and say so); otherwise record the base commit first, `git rev-parse HEAD`, then `git checkout -b feat/{name}`
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
| Regular | 6+ that can be built independently of each other | `parallelize` |
| Regular | 6+ that build on each other | `implement`, in passes of a few tasks each, one after another |

Launch it with the `Agent` tool with the plan name and: "Execute Phase {N} only, then stop." (For a pass: "Execute only these tasks of Phase {N}: …, then stop." Add "Skip the phase's validation items" to every pass but the last.) Include any reference files from `{{TASKS_DIR}}/references/` for showcase. **Multi-repo**: include the affected repos and their paths (the plan's file paths should already be prefixed with the repo name).

<!-- claude-only -->
**`parallelize` as a workflow**: if the `Workflow` tool is available, run the saved workflow **`streams`** instead of the `parallelize` agent, with args `{ "plan": "{NN}_{NAME}", "phase": N, "updateState": false, "tests": false }` (4c runs the tests), plus `"context"` carrying what you'd tell the agent: this phase's `Decided`/`Provisional` notes, the tasks to skip (marked **(USER)**, or blocked by a `Needs your decision` note with `--full`), "don't touch `.claude/worktrees/` and leave it out of checks" while dispatched runs are going, and in multi-repo mode the repos and their paths. It splits the phase into streams, builds them in parallel, then finishes what crossed stream boundaries and typechecks, lints and fixes the combined result. Wait for the completion notification — don't poll. Then:
- `checkedOff` is false → check the `done` tasks off in the plan yourself.
- `notDone` tasks (including those of a stream that returned nothing) → launch the implement agent for just those tasks before committing, unless they are **(USER)** tasks or wait on a decision.
- `blockers`, `userTasks`, `choices` and `planChanges` → handle them as in an agent's report, below.
- Not `passing` → carry on to 4c; its checks and fixer rounds deal with it.

If the workflow isn't available or the run fails, launch the `parallelize` agent; if the run got as far as building (`git status` shows its changes), tell the agent the tasks may be partly built: check the diff first and finish what's missing rather than start over.
<!-- /claude-only -->

When the agent reports:
- **Blockers** (including tasks marked **(USER)**, which agents leave to you) and **choices** the plan doesn't settle → follow **When to Ask**. If the user approves a step you can run (such as a paid run), launch the implement agent for just that task, saying the user approved it, and drop its **(USER)** mark. Move on to the next phase only when it doesn't depend on what's still open.
- **Plan changes it proposed** → apply small ones to the plan (decide yourself); significant ones need the user.

#### 4c. Commit the Phase

**COMMIT CHECKPOINT** after each phase:
- **Checks first**: don't rely on the implement agent's own test run, which may predate its last edit. Tell the commit agent to run typecheck, lint and the test suite before committing (tests without build-tool caches, e.g. `turbo run test --force`), and to commit nothing and report the failing command with its trimmed output if any of them fails. (While dispatched runs are going, exclude `.claude/worktrees/` from these checks.) On a failure, launch one fixer (`subagent_type: "general-purpose"`): "These checks fail after Phase {N} of {plan}: {output}. Fix what the phase's changes broke, minimally, following `{{TASKS_DIR}}/CONVENTIONS.md` and CLAUDE.md. Rerun the failing checks. Don't commit." Then run the commit agent again. At most 2 rounds; still failing → treat it as a blocker (4b).
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
- **`needsDecision` items and unresolved critical findings** → follow **When to Ask**. They're usually the user's (auth, encryption, public API, product behavior); decide yourself only internal, reversible ones. Act on each answer or decision with one fixer and a commit. With `--full`, record the rest as `Needs your decision` notes and finish Step 6 as `⏸️ Paused`.
- Report briefly:
```markdown
**Preflight**: {N} confirmed · {M} dropped as false positives · {K} fixed · {U} unresolved
- Reviewers: audit ✅ · secure ✅ · a11y ✅/skipped (no UI changes) · tests ✅
```

---

### Step 6: Update & Report

**UPDATE CLAUDE.md and STATE.md** (skip in worktree mode): launch the update agent (`subagent_type: "update"`) to sync CLAUDE.md with new patterns, dependencies, or structure from this session and to reconcile STATE.md (it also migrates a legacy-format STATE.md). If it changed CLAUDE.md, commit it (commit agent, "docs: update CLAUDE.md for {NAME}").

**STATE UPDATE**:
- All phases and validation passed (tasks marked **(USER)** may remain; they're listed under **Left for you**) → (worktree mode: see Worktree Mode) `**Active**: None`, `**File**`/`**Phase**`: `—`, `**Status**: ✅ Complete`, and the plan's row `✅ Complete`
- Partially complete (open decisions, unresolved critical findings, failing checks, or the user stopped) → keep `**Active**` on the plan, `**Status**: ⏸️ Paused`, `**Phase**` = last completed phase
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

**Decided for you** (easy to change; see the plan's notes): {one line each, or "—"}
**Left for you**: {steps marked (USER), and decisions still open, or "—"}

**Next Steps**:
- Review: `git log {BASE}..feat/{name} --oneline`
- Open a PR: `gh pr create`
- Or continue: `/autopilot` resumes from STATE.md, and offers to build other ready plans in parallel
```

**Multi-repo**: same summary, with a per-repo section (branch, commits, preflight result, `cd {repo} && gh pr create`). Open one PR per repo; they can reference each other's branch name.

---

## Commit Checkpoint Rules

Autopilot commits **early and often** with the commit agent, which picks the conventional prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, …) from the diff.

**When to commit**: after bootstrap scaffolding, after the plan is written (git repos only), after each phase, after preflight fixes, after CLAUDE.md updates.
**When NOT to commit**: no changes (empty diff), or validation is failing and fixes haven't been applied yet.

Commits are non-destructive, so they happen automatically with or without `--full`. `--full` only changes what happens to things that need the user (see **When to Ask**).

## Critical Guidelines

### Be Autonomous But Not Reckless
- Run the full loop without unnecessary prompts, and commit after every milestone
- Ask only what needs the user (see **When to Ask**), and keep working while you wait
- Never build on failing checks: after the fix rounds, they need the user
- Never force-push, delete branches, or make destructive changes without asking

### Multi-Repo Mode
- Triggered when the plan references child directories that are git repos — whether or not the parent is a repo. The parent is never branched or committed in this mode; STATE.md and plans at the parent level stay uncommitted coordination artifacts (the user can commit them with `/commit`).
- The same branch name is created in every affected repo; commits, preflight and reports are per repo; a failure in one repo doesn't stop validation of the others.
- Plans should prefix file paths with the repo directory (e.g. `{repo}/src/models/...`) so agents write to the right place and repo detection works.

### Compose Existing Agents
- Agents: `bootstrap`, `blueprint`, `implement`, `parallelize`, `showcase`, `audit`, `secure`, `a11y`, `test`, `commit`, `update` — plus the `preflight` workflow and the dispatch and integrate procedures for parallel runs
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
