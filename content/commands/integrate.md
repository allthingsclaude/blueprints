---
description: Merge finished /dispatch runs back one at a time, test them together, and clean up
argument-hint: [plan ...] [--review] [--yes]
disable-model-invocation: true
author: "@markoradak"
---

# Integrate Dispatched Plans

I'll merge the finished `/dispatch` runs into the branch they started from, one at a time, testing after each merge. Then I'll sync CLAUDE.md and STATE.md once and remove the worktrees.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "(not a git repo)"`

**Git Dirs** (git dir, then common dir — they differ in a linked worktree):
!`git rev-parse --path-format=absolute --git-dir --git-common-dir 2>/dev/null || echo "(not a repo)"`

**Git Status**:
!`git status --short 2>/dev/null | head -20 | grep . || echo "(clean, or not a repo)"`

**Worktrees**:
!`git worktree list 2>/dev/null | head -20 || true`

**STATE.md header**:
!`sed -n '1,/^---$/p' {{STATE_FILE}} 2>/dev/null || echo "No STATE.md"`

---

## Arguments

$ARGUMENTS

---

## Steps

### 1. Parse Arguments

- **Plans** (optional): integrate only these, matched like `/dispatch` does (`{NN}`, `{NAME}`, `{NN}_{NAME}`). Default: every finished run.
- **`--review`**: after merging, also run a full review of everything merged. Each run already passed its own preflight, so this is only worth it for risky combinations.
- **`--yes`**: skip the confirmation in step 4.

### 2. Check Preconditions

Stop with a clear message when:
- The two **Git Dirs** differ: "Run `/integrate` from the main checkout."
- HEAD is detached, or the working tree has changes (other than `{{STATE_FILE}}`): "Commit or stash first."

Record `TARGET` (the current branch) and `START` (`git rev-parse HEAD`) — the undo point for everything below.

### 3. Collect the Runs

Dispatched runs are worktrees under `.claude/worktrees/` on a `feat/*` branch; cross-check them with the `**Dispatched**` line in STATE.md. For each `WT`:
- `sed -n '1,/^---$/p' "$WT/{{STATE_FILE}}"` → its plan (`Active`/`File`), `Status`, `Base` and `Target`. If the header no longer names the plan, match the branch to a `**Dispatched**` entry (`feat/{name}` is the plan name in kebab-case).
- `git -C "$WT" status --short` → uncommitted work (its STATE.md is hidden from git on purpose)
- `git log --oneline "$TARGET..{branch}"` → the commits to merge
- tasks left: unchecked task checkboxes in the phase sections of `$WT/{plan file}` (ignore Success Criteria and testing checklists)

Classify each run:
- **Ready**: `✅ Complete`, nothing uncommitted, at least one commit
- **Not ready**: `🚧 In Progress` (probably still running), `⏸️ Paused` (stopped on a blocker or open findings — its STATE.md and plan notes say why), or uncommitted changes
- **Empty**: no commits

Skip runs whose `**Target**` isn't the current branch, and say which branch they belong to.
<!-- claude-only -->
To check whether a run is still going, `claude agents --json` lists the background sessions with their state; the session name is the worktree name.
<!-- /claude-only -->

If the user named a run that isn't ready, show its status and ask whether to merge what it has (with `--yes`, skip it). Make sure its session isn't still working first: a run merged this way keeps its worktree and branch, so it can carry on and be integrated again later.

### 4. Order and Confirm

Merge dependencies first (`**Depends on**` in the plan headers), then the smallest diff first (`git diff --shortstat "$TARGET...{branch}"`), so the conflicts that are left show up in the later, larger merges.

```markdown
**Integration plan** into `{TARGET}` (undo point `{short START}`)

| # | Plan | Branch | Commits | Files | Status |
|---|------|--------|---------|-------|--------|
| 1 | 04_SEARCH | feat/search | 4 | 9 | ✅ Ready |
| 2 | 02_PAYMENTS | feat/payments | 6 | 21 | ✅ Ready |
| — | 03_CHECKOUT | feat/checkout | 2 | 5 | ⏸️ Paused — skipped |

After merging: remove the worktrees of the completed runs and delete their branches (`git branch -d`).
```

Ask the user to confirm or change anything (skip with `--yes`).

### 5. Merge One at a Time

Detect the toolchain once: the package manager from the lockfile, and the typecheck, lint and test commands from `package.json` scripts or the ecosystem's standard tools.

**Baseline**: run the checks once before the first merge. Failures here aren't caused by any run: tell the user and ask whether to continue with them as known failures or stop (with `--yes`, continue). Later, only new failures count.

The other runs' worktrees live under `.claude/worktrees/` inside this checkout. If a check's output includes files from there, rerun that check with the directory excluded (for example ESLint `--ignore-pattern '.claude/**'`, Jest `--testPathIgnorePatterns '/.claude/worktrees/'`), and mention it in the report.

For each run, in order:

1. **Merge**: note `git rev-parse HEAD` (this merge's undo point), then `git merge --no-ff --no-edit {branch}`
2. **Conflicts**: resolve only these, then `git add` them and `git commit --no-edit`:
   - `{{TASKS_DIR}}/CONVENTIONS.md`: keep both sides' lines, without duplicates (`/dispatch` sets git's union merge for it, so this is rare)
   - `{{STATE_FILE}}`: keep `{TARGET}`'s version (step 7 rebuilds it)
   - Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`, `uv.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`): resolve the manifest first, then take `{TARGET}`'s lockfile and regenerate it with the package manager's install command
   - Manifests and lists where both sides only added entries (dependencies, barrel exports, route tables, registries): keep both sides' entries

   Any other conflict: show the conflicting files with a one-line summary of what each side changed, and ask whether to resolve them (keeping both plans' intent) or stop. To stop, run `git merge --abort`, don't merge later runs, and go on to steps 7–9 for the runs merged so far. With `--yes`, stop.
3. **Install** if this merge changed a manifest or lockfile (`git diff --name-only HEAD^1 HEAD`).
4. **Check**: run typecheck, lint and tests. Each branch passed on its own, so a new failure here comes from the combination.
   - On failure, launch one fixer with the `Agent` tool (`subagent_type: "general-purpose"`): "These checks fail after merging `{branch}` into `{TARGET}`; each branch passed alone. {failing output, trimmed}. Find where the merged changes interact and fix it minimally, following `{{TASKS_DIR}}/CONVENTIONS.md` and CLAUDE.md. Don't change either plan's intended behavior — if a fix would, stop and explain. Rerun the checks. Don't commit." At most 2 rounds.
   - If the fixer changed files, commit them with the commit agent (`subagent_type: "commit"`): "fix: integrate {NAME} with {plans merged before it}".
   - Still failing → stop merging (never merge onto a failing state). Report that this merge is on `{TARGET}` with failing checks — fix it by hand, or undo just this merge with `git reset --hard {this merge's undo point}` (say so; never run it yourself) — keep this run's worktree and branch, and go on to steps 7–9 for the runs merged and checked before it.
5. **Untracked plans**: if the plan files aren't tracked by git, copy this run's plan file from `$WT/{{PLANS_DIR}}/` back to `{{PLANS_DIR}}/` — its checkboxes are the run's progress.

If nothing was merged, skip to the report.

### 6. Review Everything Merged (`--review` only)

If the `Workflow` tool is available, run the saved workflow **`preflight`** with `{ "base": "{START}", "files": [git diff --name-only {START}...HEAD], "frontend": true|false, "plan": "integration of {plans}" }` and wait for it to finish. Otherwise, launch the `audit` and `test` agents together with "Review-only mode. Review the changes in `git diff {START}...HEAD`." and give their confirmed findings to one fixer. Commit any fixes with the commit agent.

### 7. Sync CLAUDE.md and STATE.md (once)

Launch the update agent (`subagent_type: "update"`): "Plans {list} were just merged into `{TARGET}` (`git diff {START}...HEAD`). Sync CLAUDE.md with what they added. Reconcile STATE.md from the plan files and remove the merged, completed plans from the `**Dispatched**` line (drop the line when it's empty). Plans still on `**Dispatched**` or `**Queued**` run, or will run, in their own worktrees: never make one of them Active, and keep their rows as they are." If anything changed, commit it with the commit agent: "docs: sync CLAUDE.md and STATE.md after integrating {plans}".

### 8. Clean Up

Only for runs that were `✅ Complete` in step 3 and merged (as confirmed in step 4). Runs merged before they finished keep their worktree and branch.
- Record the branch's tip first: `git rev-parse feat/{name}`.
- `git worktree remove "$WT"` — if git refuses because of leftover changes, leave the worktree and the branch, and report it. Never use `--force`.
- `git branch -d feat/{name}` — only after its worktree is gone, and never `-D`.
<!-- claude-only -->
- The run's background session stays in `claude agents` as completed. The user can remove it there once they no longer need its transcript.
<!-- /claude-only -->

### 9. Report

```markdown
**Integrated** {N} plan(s) into `{TARGET}` — undo point `{short START}`

| Plan | Merge | Checks | Integration fixes |
|------|-------|--------|-------------------|
| 04_SEARCH | `{sha}` | ✅ | — |
| 02_PAYMENTS | `{sha}` | ✅ after 1 fix | `{sha}` fix: … |

**Not merged**: 03_CHECKOUT — ⏸️ Paused: {reason}
**Unblocked**: 05_REPORTS (was queued after 02) → `/dispatch 05_REPORTS`

I didn't push. When you're happy: `git push`
```

To undo everything above, the user can run `git reset --hard {START}` — say so, but never run it yourself. Deleted branches are then only in the reflog, so list each deleted branch with its tip (`git branch feat/{name} {sha}` recreates it).

## Rules

- Never push, force-push, `reset --hard`, or use `--force`/`-D`.
- One merge at a time, and never merge onto failing checks.
- Merge only into the branch the runs were dispatched from.
