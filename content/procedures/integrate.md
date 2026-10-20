# Integrate Procedure

Followed by `/integrate`, and by `/autopilot` when it finds finished runs and the user wants them merged. It merges the finished dispatched runs into the branch they started from, one at a time, testing after each merge, then syncs CLAUDE.md and STATE.md once and removes the worktrees of the completed runs.

## Inputs

From the caller:
- **Plans** (optional): integrate only these, matched like `/dispatch` does (`{NN}`, `{NAME}`, `{NN}_{NAME}`). Default: every finished run.
- **Caller**: `integrate` or `autopilot`.
- **`--review`**: after merging, also run a full review of everything merged. Each run already passed its own preflight, so this is only worth it for risky combinations.
- **`--yes`**: skip the confirmation in step 4.

## 1. Context

The `/integrate` command shows these under Current State; from `/autopilot`, run the ones you don't already have:
- `git rev-parse --show-toplevel` and `git worktree list --porcelain | head -1`: this checkout, then the main checkout
- `git branch --show-current`, `git status --short`, `git worktree list`
- `head -n 40 {{STATE_FILE}}`: the STATE.md header (and `grep -E '^\|' {{STATE_FILE}}` for every `## Plans` row, if the table is longer)

## 2. Check Preconditions

Stop with a clear message when:
- This checkout isn't the main one (its top-level path differs from the path on the `worktree` line): "Run it from the main checkout ({path})."
- HEAD is detached, or the working tree has changes (other than `{{STATE_FILE}}`): "Commit or stash first."

Record `TARGET` (the current branch) and `START` (`git rev-parse HEAD`), the undo point for everything below.

## 3. Collect the Runs

Dispatched runs are worktrees under `.claude/worktrees/` on a `feat/*` branch; cross-check them with the `**Dispatched**` line in STATE.md. For each `WT`:
- `head -n 12 "$WT/{{STATE_FILE}}"` → its plan (`Active`/`File`), `Status`, `Base` and `Target`. If the header no longer names the plan, match the branch to a `**Dispatched**` entry (`feat/{name}` is the plan name in kebab-case).
- `git -C "$WT" status --short` → uncommitted work (its STATE.md is hidden from git on purpose)
- `git log --oneline "$TARGET..{branch}"` → the commits to merge
- tasks left: unchecked task checkboxes in the phase sections of `$WT/{plan file}` (ignore Success Criteria and testing checklists)
- what the run left for the user, decided on its own, or needs decided: `grep -n -E '^- (Left for the user|Provisional|Needs your decision)' "$WT/{plan file}"`

Classify each run:
- **Finished**: `✅ Complete`, nothing uncommitted (other than `{{STATE_FILE}}`), at least one commit. Tasks marked **(USER)** may remain; they're listed, not blocking.
- **Not finished**: `🚧 In Progress` (probably still running), `⏸️ Paused` (stopped on a blocker, a decision only the user can make, or an open critical finding; its plan notes say why), or uncommitted changes
- **Empty**: no commits

Skip runs whose `**Target**` isn't the current branch, and say which branch they belong to.
<!-- claude-only -->
To check whether a run is still going, `claude agents --json` lists the background sessions with their state; the session name is the worktree name.
<!-- /claude-only -->

If the user named a run that isn't finished, show its status and ask whether to merge what it has (with `--yes`, skip it). Make sure its session isn't still working first: a run merged this way keeps its worktree and branch, so it can carry on and be integrated again later.

From `/autopilot` with nothing finished: say which runs are still going or paused (and why), and hand back.

## 4. Order and Confirm

Merge dependencies first (`**Depends on**` in the plan headers), then the smallest diff first (`git diff --shortstat "$TARGET...{branch}"`), so the conflicts that are left show up in the later, larger merges.

```markdown
**Integration plan** into `{TARGET}` (undo point `{short START}`)

| # | Plan | Branch | Commits | Files | Status |
|---|------|--------|---------|-------|--------|
| 1 | 04_SEARCH | feat/search | 4 | 9 | ✅ Finished |
| 2 | 02_PAYMENTS | feat/payments | 6 | 21 | ✅ Finished · left for you: paid smoke test |
| — | 03_CHECKOUT | feat/checkout | 2 | 5 | ⏸️ Paused (needs your decision: …) — skipped |

**Decisions the runs made for you** (merging keeps them):
- 02_PAYMENTS: retries use exponential backoff, max 3 (reversible: one constant)

After merging: remove the worktrees of the completed runs and delete their branches (`git branch -d`).
```

Ask the user to confirm or change anything (skip with `--yes`). To change a run's decision, leave that run out: it stays in its worktree, where the user can rework it (by attaching to its session, or running `/autopilot` in that worktree) and integrate it later.

## 5. Merge One at a Time

Detect the toolchain once: the package manager from the lockfile, and the typecheck, lint and test commands from `package.json` scripts or the ecosystem's standard tools.

**Baseline**: run the checks once before the first merge. Failures here aren't caused by any run: tell the user and ask whether to continue with them as known failures or stop (with `--yes`, continue). Later, only new failures count.

The other runs' worktrees live under `.claude/worktrees/` inside this checkout. If a check's output includes files from there, rerun that check with the directory excluded (for example ESLint `--ignore-pattern '.claude/**'`, Jest `--testPathIgnorePatterns '/.claude/worktrees/'`), and mention it in the report.

For each run, in order:

1. **Merge**: note `git rev-parse HEAD` (this merge's undo point), then `git merge --no-ff --no-edit {branch}`
2. **Conflicts**: resolve only these, then `git add` them and `git commit --no-edit`:
   - `{{TASKS_DIR}}/CONVENTIONS.md`: keep both sides' lines, without duplicates (`/dispatch` sets git's union merge for it, so this is rare)
   - `{{STATE_FILE}}`: keep `{TARGET}`'s version (step 8 rebuilds it)
   - Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`, `uv.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`): resolve the manifest first, then take `{TARGET}`'s lockfile and regenerate it with the package manager's install command
   - Manifests and lists where both sides only added entries (dependencies, barrel exports, route tables, registries): keep both sides' entries
   - Numbered entries both sides appended to the same log (decision records such as `D43`, changelog sections): keep both, renumbered as in step 5.2b below.

   Any other conflict: show the conflicting files with a one-line summary of what each side changed, and ask whether to resolve them (keeping both plans' intent) or stop. To stop, run `git merge --abort`, don't merge later runs, and go on to steps 7–9 for the runs merged so far. With `--yes`, stop.
2b. **Duplicate numbers**, conflict or not: if this run added numbered entries that `{TARGET}` also added since the run started (two `D43` rows in a decision log, two `0043-*.md` ADR files), keep `{TARGET}`'s as they are and renumber this run's after the highest number on `{TARGET}`. Update every reference to a renumbered entry in the files this run changed (`git diff --name-only HEAD^1...HEAD^2` after the merge commit, or `HEAD...MERGE_HEAD` during a conflicted merge, then search them for the old ids). During a conflict, `git add` every file you edited before `git commit --no-edit`; after a clean merge, commit the renumbering with the commit agent ("docs: renumber {NAME}'s entries after integration"). List the renumbering in the report.
3. **Install** if this merge changed a manifest or lockfile (`git diff --name-only HEAD^1 HEAD`).
4. **Check**: run typecheck, lint and tests. Each branch passed on its own, so a new failure here comes from the combination.
   - On failure, launch one fixer with the `Agent` tool (`subagent_type: "general-purpose"`): "These checks fail after merging `{branch}` into `{TARGET}`; each branch passed alone. {failing output, trimmed}. Find where the merged changes interact and fix it minimally, following `{{TASKS_DIR}}/CONVENTIONS.md` and CLAUDE.md. Don't change either plan's intended behavior — if a fix would, stop and explain. Rerun the checks. Don't commit." At most 2 rounds.
   - If the fixer changed files, commit them with the commit agent (`subagent_type: "commit"`): "fix: integrate {NAME} with {plans merged before it}".
   - Still failing → stop merging (never merge onto a failing state). Report that this merge is on `{TARGET}` with failing checks — fix it by hand, or undo just this merge with `git reset --hard {this merge's undo point}` (say so; never run it yourself) — keep this run's worktree and branch, and go on to steps 7–9 for the runs merged and checked before it.
5. **Untracked plans**: if the plan files aren't tracked by git, copy this run's plan file from `$WT/{{PLANS_DIR}}/` back to `{{PLANS_DIR}}/` — its checkboxes and notes are the run's progress.

If nothing was merged, skip to the report.

## 6. Review Everything Merged (`--review` only)

If the `Workflow` tool is available, run the saved workflow **`preflight`** with `{ "base": "{START}", "files": [git diff --name-only {START}...HEAD], "frontend": true|false, "plan": "integration of {plans}" }` and wait for it to finish. Otherwise, launch the `audit` and `test` agents together with "Review-only mode. Review the changes in `git diff {START}...HEAD`." and give their confirmed findings to one fixer. Commit any fixes with the commit agent.

## 7. Clean Up

Only for runs that were finished in step 3 and merged (as confirmed in step 4). Runs merged before they finished keep their worktree and branch.
- Record the branch's tip first: `git rev-parse feat/{name}`.
- `git worktree remove "$WT"` — if git refuses because of leftover changes, leave the worktree and the branch, and report it. Never use `--force`.
- `git branch -d feat/{name}` — only after its worktree is gone, and never `-D`.
<!-- claude-only -->
- The run's background session stays in `claude agents` as completed. The user can remove it there once they no longer need its transcript.
<!-- /claude-only -->

## 8. Sync CLAUDE.md and STATE.md (once)

Launch the update agent (`subagent_type: "update"`): "Plans {list} were just merged into `{TARGET}` (`git diff {START}...HEAD`). Sync CLAUDE.md with what they added. Reconcile STATE.md from the plan files. Remove from the `**Dispatched**` line the plans whose worktrees step 7 removed: {list} (runs merged early, or whose worktree is still there, stay listed). Remove from the `**Queued**` line every plan whose waited-for plans are now complete. Drop either line when it's empty. A plan whose only unchecked tasks are marked **(USER)** is complete: add `· left for you: {steps}` to its Progress. Leave `**Active**` as it is; don't promote another plan to Active. Plans still on `**Dispatched**` run in their own worktrees: keep their rows as they are." If anything changed, commit it with the commit agent: "docs: sync CLAUDE.md and STATE.md after integrating {plans}".

## 9. Report

```markdown
**Integrated** {N} plan(s) into `{TARGET}` — undo point `{short START}`

| Plan | Merge | Checks | Integration fixes |
|------|-------|--------|-------------------|
| 04_SEARCH | `{sha}` | ✅ | — |
| 02_PAYMENTS | `{sha}` | ✅ after 1 fix | `{sha}` fix: … |

**Left for you**: 02_PAYMENTS — paid smoke test (do it yourself, or run `/autopilot 02` when you're ready and approve it there)
**Decisions the runs made**: {one line each}
**Renumbered**: D43 → D46 in 02_PAYMENTS's docs/DECISIONS.md entries
**Not merged**: 03_CHECKOUT — ⏸️ Paused: {reason} (`/integrate 03` merges what it has)
**Unblocked**: 05_REPORTS (was queued after 02) → run `/autopilot` to start it, alone or alongside other ready plans

I didn't push. When you're happy: `git push`
```

To undo everything above, the user can run `git reset --hard {START}` — say so, but never run it yourself. Deleted branches are then only in the reflog, so list each deleted branch with its tip (`git branch feat/{name} {sha}` recreates it).

## Rules

- Never push, force-push, `reset --hard`, or use `--force`/`-D`.
- One merge at a time, and never merge onto failing checks.
- Merge only into the branch the runs were dispatched from.
