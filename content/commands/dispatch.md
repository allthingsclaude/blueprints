---
description: Run several plans at once, each in its own git worktree and session
argument-hint: {plan} {plan} ... [--full] [--yes] [--max N]
disable-model-invocation: true
author: "@markoradak"
---

# Dispatch Plans in Parallel

I'll check which plans can safely run side by side, give each one its own git worktree and branch, and start `/autopilot` in each. When they finish, `/integrate` merges them back.

> **When to use**: several independent plans are ready (e.g. 02, 03 and 04) and you want them built at the same time. For one plan, use `/autopilot`; to split one plan's phase across agents in this checkout, use `/parallelize`.

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

- **Plans**: each word that matches a plan file `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` — as `{NN}`, `{NAME}`, `{NN}_{NAME}` or `PLAN_{NN}_{NAME}`, case-insensitive. Stop and list the available plans if a word matches none.
- **`--full`**: passed to every `/autopilot` run, so they don't stop for approvals (they still stop for real blockers).
- **`--yes`**: skip the confirmation in step 3.
- **`--max N`**: at most N runs at once (default 3). Each run uses as much as a normal `/autopilot` run.
<!-- claude-only -->
- **`--permission-mode <mode>`**: passed to each background session; otherwise they start in your default mode.
<!-- /claude-only -->

### 2. Check Preconditions

Stop with a clear message when:
- This isn't a git repo, or the two **Git Dirs** differ: "Run `/dispatch` from the main checkout, not from inside a worktree."
- The plans live above several child repos (multi-repo): "`/dispatch` works inside one repo. Run it in each repo, or use `/autopilot` for multi-repo plans."
- HEAD is detached.
- The working tree has changes: ask whether to commit them first (with the commit agent) or stop. With `--yes`, stop — never carry unrelated work into the runs.

Record:
- `TARGET`: the current branch — every run branches from it, and `/integrate` merges back into it
- `ROOT`: `git rev-parse --show-toplevel`
- `COMMON`: the second **Git Dirs** line

`{name}` is the plan name in lowercase kebab-case, the same branch name `/autopilot` uses (`USER_AUTH` → `feat/user-auth`). If two of the plans map to the same `{name}`, use `{name}-{NN}` for both.

A plan is **complete** when its row in STATE.md says `✅ Complete`, or when no task checkbox is left unchecked inside its phase sections. Count only from the first phase heading to the next section that isn't a phase: the plan's Success Criteria and testing checklists also use `- [ ]` and nobody ticks them.

For each plan:
- **Already complete** → skip it and say so.
- **Already dispatched**: `feat/{name}` is checked out in a worktree (see **Worktrees**) → don't create anything. Its session may still be running; only relaunch it (step 6) if the user wants and nothing is running there.
- **Branch exists without a worktree**:
  - If it's already merged into `TARGET` (`git merge-base --is-ancestor feat/{name} "$TARGET"`), it's left over from earlier work: tell the user and use `{name}-2` instead, so the branch is `feat/{name}-2` (never delete the old branch).
  - Otherwise, reuse it in step 5.
- **Not tracked by git** (`git ls-files --error-unmatch {plan file}` fails, e.g. `{{TASKS_DIR}}/` is gitignored) → step 5 copies `{{TASKS_DIR}}/` into its worktree, and `/integrate` copies the plan back.

### 3. Plan the Waves

For each plan, read only what you need: the header (first ~15 lines) for a `**Depends on**:` line, and the **📁 Files Involved** section (find it with `grep -n -E '^#{1,4} ' {plan file}`). If a plan has no such section, collect the backticked file paths from its task lines instead.

Compare every pair of plans:

| Overlap | Decision |
|---|---|
| One depends on the other (`**Depends on**`, or it modifies files the other creates) | Later wave |
| Both create or modify the same source file | Later wave, unless both only add entries to a list (route table, barrel export, registry) — then allow and note it |
| Both change the database schema or add migrations | Later wave — migration order and generated clients clash |
| Only shared manifests (`package.json`, lockfiles, `pyproject.toml`, `go.mod`, `Cargo.toml`) | Allow — `/integrate` regenerates lockfiles |
| Both add tests against the same fixed port or local service | Allow, but note it: their test runs can collide |

Also warn when a plan depends on one that is neither complete, nor in this dispatch, nor already dispatched. Respect `--max`: extra plans wait for a later wave.

Show the result:

```markdown
**Dispatch plan** — from `{TARGET}` @ `{short sha}`

| Plan | Branch | Wave | Notes |
|------|--------|------|-------|
| 02_PAYMENTS | feat/payments | 1 | shares package.json with 04 (fine) |
| 04_SEARCH | feat/search | 1 | — |
| 03_CHECKOUT | feat/checkout | 2 | depends on 02 · both edit src/lib/cart.ts |

Wave 1 starts now. Later waves start after `/integrate` merges what they depend on.
```

Ask the user to confirm or adjust (skip with `--yes`).

### 4. Prepare the Target Branch (once)

1. **Conventions**: if `{{TASKS_DIR}}/CONVENTIONS.md` is missing, create it now so the runs share one file instead of each writing their own. Launch the implement agent with the `Agent` tool (`subagent_type: "implement"`): "Only do step 1.5, Load or Discover Codebase Conventions: write `{{TASKS_DIR}}/CONVENTIONS.md`, then stop. Don't implement anything and don't edit STATE.md."
2. **STATE.md**: so this checkout doesn't resume a plan that's running elsewhere:
   - If `**Active**` is one of the plans in this dispatch (any wave), set the header to `**Active**: None`, `**File**: —`, `**Phase**: —`, `**Status**: ✅ Complete`. Leave the header alone when it points at another plan.
   - Add the wave-1 plans to `**Dispatched**: {NN}_{NAME}, …`, keeping the plans already listed there (they may still be running), and remove them from `**Queued**`.
   - Add later waves to `**Queued**: {NN}_{NAME} (after {NN}_{NAME}), …`. Drop either line when it's empty. Both go above the `---`.
   - Set each wave-1 plan's row in `## Plans` to `🚧 In Progress` with Progress `dispatched → feat/{name}`.
3. **Local git settings** for this clone (nothing to commit): ignore the worktrees, and let git merge `CONVENTIONS.md` by keeping both sides' lines, since several runs may append to it:
   ```bash
   mkdir -p "$COMMON/info" && { grep -qxF '.claude/worktrees/' "$COMMON/info/exclude" 2>/dev/null || echo '.claude/worktrees/' >> "$COMMON/info/exclude"; }
   grep -qxF '{{TASKS_DIR}}/CONVENTIONS.md merge=union' "$COMMON/info/attributes" 2>/dev/null || echo '{{TASKS_DIR}}/CONVENTIONS.md merge=union' >> "$COMMON/info/attributes"
   ```
4. **Commit** if a tracked file changed: launch the commit agent (`subagent_type: "commit"`) with "chore: dispatch plans {list}". The runs branch from this commit, so they all start with the same conventions.
5. Record `BASE`: `git rev-parse HEAD`.

### 5. Create the Worktrees (wave 1)

For each wave-1 plan, with `WT="$ROOT/.claude/worktrees/{name}"`, running these from `$ROOT`:

1. **Create**:
   ```bash
   git worktree add "$WT" -b feat/{name} "$BASE"   # new branch
   git worktree add "$WT" feat/{name}              # the branch already exists
   ```
   For an existing branch, its base is `git merge-base "$TARGET" feat/{name}` instead of `BASE`.
2. **Local files**: a worktree only has tracked files. Copy the gitignored files that `.worktreeinclude` lists (gitignore syntax, one pattern per line):
   ```bash
   git ls-files --others --ignored --exclude-from=.worktreeinclude | git check-ignore --stdin | tar -cf - -T - | tar -xf - -C "$WT"
   ```
   Without a `.worktreeinclude`, copy gitignored env files instead (`git ls-files --others --ignored --exclude-standard --directory | grep -E '(^|/)\.env[^/]*$'` piped into the same `tar` pair), and suggest creating `.worktreeinclude` in the report. Never print these files' contents.
3. **Untracked plans**: if the plans aren't tracked, `cp -R {{TASKS_DIR}} "$WT/"`.
<!-- codex-only -->
   If blueprints is installed in this project rather than globally and `.agents/skills/` or `.codex/agents/` aren't tracked by git, copy them into the worktree too (`cp -R .agents .codex "$WT/"`, only the ones that exist), so the run finds `$autopilot` and its agents.
<!-- /codex-only -->
4. **The run's own STATE.md**: set the header of `$WT/{{STATE_FILE}}` (create the file if it doesn't exist) and keep the rest:
   ```markdown
   **Active**: {NN}_{NAME}
   **File**: {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md
   **Phase**: {first phase with unchecked tasks}
   **Status**: 🚧 In Progress
   **Updated**: [ISO timestamp]
   **Branch**: feat/{name}
   **Base**: {base sha}
   **Target**: {TARGET}
   ```
   Then, if STATE.md is tracked, hide the run's edits from git so they never reach its commits (that's what keeps STATE.md from conflicting at merge time):
   ```bash
   git -C "$WT" update-index --skip-worktree {{STATE_FILE}}
   ```

### 6. Launch the Runs

<!-- claude-only -->
Start one background Claude Code session per worktree. Start it from inside the worktree, so Claude Code uses that worktree instead of creating another one, and in a subshell as shown, so this session's own working directory stays in the main checkout:

```bash
(cd "$WT" && claude --bg --name "{name}" "/autopilot {NN}_{NAME} --full")
```

Leave out `--full` if the user didn't pass it, and add `--permission-mode <mode>` if they did. Each command prints the session's id and returns right away.

`claude --bg` writes to `~/.claude/jobs`, so a sandboxed shell blocks it; retrying outside the sandbox with the user's approval is fine. If it still fails, or this Claude Code version has no `--bg` (it needs background agents), don't look for workarounds: print the commands so the user can run them, prefixed with `! ` to run them from this prompt, or in their own terminals.
<!-- /claude-only -->
<!-- codex-only -->
Codex can't start background sessions from here, so print one command per worktree for the user to run in separate terminals. `--add-dir` lets the session write to the repository's shared `.git` directory, which commits from a worktree need:

```bash
codex -C "{WT}" --add-dir "{COMMON}" '$autopilot {NN}_{NAME} --full'
```

Leave out `--full` if the user didn't pass it.
<!-- /codex-only -->

### 7. Report

```markdown
**Dispatched** {N} plan(s) from `{TARGET}` @ `{short BASE}`

| Plan | Worktree | Branch |
|------|----------|--------|
| 02_PAYMENTS | .claude/worktrees/payments | feat/payments |

**Queued**: 03_CHECKOUT — wave 2, after 02_PAYMENTS

**Next**:
<!-- claude-only -->
- Watch the runs and answer anything marked "Needs input": `claude agents`
<!-- /claude-only -->
<!-- codex-only -->
- Start the runs, one terminal each: {the commands from step 6}
- Watch them: `codex agents`
<!-- /codex-only -->
- When they finish: `/integrate` — merges the finished runs into `{TARGET}`, tests them together, and tells you which queued plans are unblocked
- Prefer pull requests? Push each branch and open a PR instead of running `/integrate`
- Don't delete a run's worktree or session before it's integrated
```

## Rules

- Never push, and never delete branches or worktrees here.
- Never start two runs on the same branch.
- Don't edit the plans themselves.
- This checkout stays on `{TARGET}`. You can keep working here, but avoid files the runs are changing. Lint and test runners here may also scan `.claude/worktrees/`; exclude it if they pick up the runs' files.
