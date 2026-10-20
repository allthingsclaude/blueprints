# Dispatch Procedure

Followed by `/dispatch`, and by `/autopilot` when the user takes its offer to run plans in parallel. It checks which plans can safely run side by side, settles up front what each run will need from the user, gives each plan its own git worktree and branch, and starts `/autopilot` in each. The runs don't wait for approvals: anything only the user can do is set aside and listed when the run finishes. `/integrate`, or `/autopilot` run again here, merges the finished runs back.

## Inputs

From the caller:
- **Plans**: the plans the user named, or none (step 3 then suggests a set). From `/autopilot`: the plan it was asked to run, if any, followed by the other ready plans it found.
- **Caller**: `dispatch` or `autopilot`.
- **`--yes`**: skip the confirmation in step 6 (`/dispatch --yes`, or `/autopilot --full`).
- **`--max N`**: at most N runs at once (default 3).
<!-- claude-only -->
- **`--permission-mode <mode>`**: passed to each background session; otherwise they start in the user's default mode.
<!-- /claude-only -->

When the caller is `/autopilot` and this procedure can't go ahead (a check fails, or fewer than two plans can start together), don't stop: say why in one line and hand back to `/autopilot`, which carries on with its normal steps.

## 1. Context

The `/dispatch` command shows these under Current State; from `/autopilot`, run the ones you don't already have:
- `git rev-parse --show-toplevel` and `git worktree list --porcelain | head -1`: this checkout, then the main checkout
- `git branch --show-current`, `git status --short`, `git worktree list`
- `head -n 40 {{STATE_FILE}}`: the STATE.md header (and `grep -E '^\|' {{STATE_FILE}}` for every `## Plans` row, if the table is longer)
- `ls -1 {{PLANS_DIR}}/PLAN_*.md`
- whether `{{TASKS_DIR}}/CONVENTIONS.md` and `.worktreeinclude` exist

## 2. Check Preconditions

Stop (from `/autopilot`, hand back) with a clear message when:
- This isn't a git repo, or this checkout isn't the main one (its top-level path differs from the path on the `worktree` line): "Run it from the main checkout ({path}), not from inside a worktree."
- The plans live above several child repos (multi-repo): "Parallel runs work inside one repo. Run them in each repo, or use `/autopilot` for multi-repo plans."
- HEAD is detached, or the current branch is the `feat/` branch of a plan that isn't complete (runs branch from the main line, not from the middle of another plan): "Switch to the branch the plans should start from (e.g. `main`) first."
- The working tree has changes (other than `{{STATE_FILE}}`). From `/dispatch`, ask whether to commit them first (with the commit agent) or stop; with `--yes`, stop, so unrelated work never ends up in the runs. From `/autopilot`, hand back: "Other plans could run in parallel, but the working tree has changes, so I'm continuing with {plan} alone. Commit first next time to get that option."

Record:
- `TARGET`: the current branch. Every run branches from it, and `/integrate` merges back into it.
- `ROOT`: `git rev-parse --show-toplevel`
- `COMMON`: `git rev-parse --absolute-git-dir` (in the main checkout, that's the repository's shared git directory)

## 3. Choose the Plans

`{name}` is the plan name in lowercase kebab-case, the same branch name `/autopilot` uses (`USER_AUTH` → `feat/user-auth`). If two plans map to the same `{name}`, use `{name}-{NN}` for both.

A plan is **complete** when its row in STATE.md says `✅ Complete`, or when no task checkbox is left unchecked inside its phase sections except tasks marked **(USER)** (steps only the user can do). Count only from the first phase heading to the next section that isn't a phase: the plan's Success Criteria and testing checklists also use `- [ ]` and nobody ticks them. A plan is **under way** when a task in its phase sections is checked or its `feat/{name}` branch exists.

**Plans named** → use them. **No plans named** → suggest the **ready** plans: not complete, not under way, not on the `**Dispatched**` line, and every plan in their `**Depends on**` line is complete (`grep -m1 -i 'depends on' {{PLANS_DIR}}/PLAN_*.md` reads them all at once). A plan on the `**Queued**` line counts once the plans it waits for are complete. If none are ready, say so and stop. (From `/autopilot`, the plans come already chosen this way.)

For each plan:
- **Already complete** → skip it and say so.
- **Already dispatched**: `feat/{name}` is checked out in a worktree (see `git worktree list`) → don't create anything. Its session may still be running; only relaunch it (step 9) if the user wants and nothing is running there.
- **Branch exists without a worktree**:
  - If it's already merged into `TARGET` (`git merge-base --is-ancestor feat/{name} "$TARGET"`), it's left over from earlier work: tell the user and use `{name}-2` instead, so the branch is `feat/{name}-2` (never delete the old branch).
  - Otherwise, reuse it in step 8.
- **Not tracked by git** (`git ls-files --error-unmatch {plan file}` fails, e.g. `{{TASKS_DIR}}/` is gitignored) → step 8 copies `{{TASKS_DIR}}/` into its worktree, and `/integrate` copies the plan back.

## 4. Plan the Waves

For each plan, read only what you need: the header (first ~15 lines) for a `**Depends on**:` line, and the **📁 Files Involved** section (find it with `grep -n -E '^#{1,4} ' {plan file}`). If a plan has no such section, collect the backticked file paths from its task lines instead.

Compare every pair of plans:

| Overlap | Decision |
|---|---|
| One depends on the other (`**Depends on**`, or it modifies files the other creates) | Later wave |
| Both create or modify the same source file | Later wave, unless both only add entries to a list (route table, barrel export, registry) — then allow and note it |
| Both change the database schema or add migrations | Later wave — migration order and generated clients clash |
| Only shared manifests (`package.json`, lockfiles, `pyproject.toml`, `go.mod`, `Cargo.toml`) | Allow — `/integrate` regenerates lockfiles |
| Both append numbered entries to the same log (decision records like `D43`, changelog sections) | Allow — `/integrate` renumbers the later run's entries |
| Both add tests against the same fixed port or local service | Allow, but note it: their test runs can collide |

Also warn when a plan depends on one that is neither complete, nor in this dispatch, nor already dispatched. Respect `--max`: extra plans wait for a later wave.

From `/autopilot`, hand back without asking anything when the plan it was asked to run can't start in wave 1 (it then runs here as usual), or when fewer than two plans can start in wave 1. From `/dispatch`, a single run is still fine (it keeps this checkout free), so carry on unless the user stops you in step 6.

## 5. What Each Run Will Need From the User

The runs work without approval prompts, so settle now what they would otherwise stop for. For each wave-1 plan, search its tasks and acceptance criteria instead of reading it whole, e.g. `grep -n -i -E 'user|ask|approv|confirm|decide|decision|tbd|paid|cost|\$[0-9]|credential|secret|api key|account|access|subscription|sign.?off|manual' {plan file}`, and sort what you find:
- **Decide now**: a choice the plan leaves open (options listed, "decide in phase X", "TBD", "ask the user which"). Ask it in step 6.
- **Left for the user**: a step only the user can do: a paid run or anything else that spends money, credentials or access the user has to grant, a sign-off with the user, changes outside this repository. The run sets these aside and builds everything else.
- **Blocks the run**: a step left for the user that the rest of the plan can't do without, for example access the first phase needs and every later phase builds on. Leave that plan out of this dispatch (don't queue it) and say what it needs first.

## 6. Confirm

Show the result:

```markdown
**Parallel runs** from `{TARGET}` @ `{short sha}`

| Plan | Branch | Wave | Left for you | Notes |
|------|--------|------|--------------|-------|
| 02_PAYMENTS | feat/payments | 1 | paid smoke test (≈ $2) | shares package.json with 04 (fine) |
| 04_SEARCH | feat/search | 1 | — | — |
| 03_CHECKOUT | feat/checkout | 2 | — | depends on 02 · both edit src/lib/cart.ts |

Wave 1 runs without approval prompts: whatever only you can do is set aside and listed when the run finishes. Later waves start after the plans they wait for are merged.
Usage: {N} runs at once use about {N}× the tokens per hour of one `/autopilot` run; the total is about the same as running them one after another.
```

Then ask with `AskUserQuestion`, in one call (at most 4 questions; ask the rest in a second call):
- **Run them?** "Run wave 1 as shown" and "Change something" (the user says what). From `/autopilot`, add "No, just run {plan} here" when it has a plan to run, and "No, something else" when the user didn't name one; either answer ends this procedure and hands back to `/autopilot`.
- Each **Decide now** question, with its options and your recommendation first.
<!-- claude-only -->
- **Permission mode**, unless `--permission-mode` was given. The runs start in the user's default mode: the most specific `permissions.defaultMode` in `.claude/settings.local.json`, `.claude/settings.json` and `~/.claude/settings.json` (`grep -h defaultMode` them), `default` if none. In `auto`, `dontAsk` or `bypassPermissions` they run unattended, so don't ask. Otherwise they would stop at their first file edit or command until the user approves it in `claude agents`, so ask: "Start the runs in auto mode (Recommended)" (passed as `--permission-mode auto`; if auto mode isn't available on the user's account, `claude --bg` says so and they can pick again) or "Keep {mode}, I'll approve as they go". Never choose `bypassPermissions` or `dontAsk` for the user.
<!-- /claude-only -->

With `--yes`, skip the confirmation and don't ask the Decide-now questions. Record each in the plan's Notes instead: an internal, reversible choice as `- Provisional: {your recommendation} ({why})`, anything else (money, a public API, product behavior) as `- Needs your decision: {question}`, which the run sets aside. Also skip the permission-mode question. If the runs would start in a mode that stops at edits, say so prominently in the report: each run will wait for approval at its first edit.

If the user declines and a plan will run here instead, write their answers about that plan into its Notes now (`- Decided ({date}): {question} → {answer}`, uncommitted), so `/autopilot` doesn't ask them again, then hand back.

## 7. Prepare the Target Branch (once)

1. **Conventions**: if `{{TASKS_DIR}}/CONVENTIONS.md` is missing, create it now so the runs share one file instead of each writing their own. Launch the implement agent with the `Agent` tool (`subagent_type: "implement"`): "Only do step 1.5, Load or Discover Codebase Conventions: write `{{TASKS_DIR}}/CONVENTIONS.md`, then stop. Don't implement anything and don't edit STATE.md."
2. **Plan notes**: for each wave-1 plan, add the answers and the set-aside steps to its `## Notes & Observations` section (add the section at the end if it's missing), so the run reads them with the plan, and mark each set-aside task **(USER)** at the start of its text:
   - `- Decided before dispatch ({date}): {question} → {answer}`
   - `- Left for the user: {step}`
3. **STATE.md**: so this checkout doesn't resume a plan that's running elsewhere:
   - If `**Active**` is one of the plans in this dispatch (any wave), set the header to `**Active**: None`, `**File**: —`, `**Phase**: —`, `**Status**: ✅ Complete`. Leave the header alone when it points at another plan.
   - Add the wave-1 plans to `**Dispatched**: {NN}_{NAME}, …`, keeping the plans already listed there (they may still be running), and remove them from `**Queued**`.
   - Add later waves to `**Queued**: {NN}_{NAME} (after {NN}_{NAME}), …`. Drop either line when it's empty. Both go above the `---`.
   - Set each wave-1 plan's row in `## Plans` to `🚧 In Progress` with Progress `dispatched → feat/{name}`.
4. **Local git settings** for this clone (nothing to commit): ignore the worktrees, and let git merge `CONVENTIONS.md` by keeping both sides' lines, since several runs may append to it:
   ```bash
   mkdir -p "$COMMON/info" && { grep -qxF '.claude/worktrees/' "$COMMON/info/exclude" 2>/dev/null || echo '.claude/worktrees/' >> "$COMMON/info/exclude"; }
   grep -qxF '{{TASKS_DIR}}/CONVENTIONS.md merge=union' "$COMMON/info/attributes" 2>/dev/null || echo '{{TASKS_DIR}}/CONVENTIONS.md merge=union' >> "$COMMON/info/attributes"
   ```
5. **Commit** if a tracked file changed: launch the commit agent (`subagent_type: "commit"`) with "chore: dispatch plans {list}". The runs branch from this commit, so they all start with the same conventions and notes.
6. Record `BASE`: `git rev-parse HEAD`.

## 8. Create the Worktrees (wave 1)

For each wave-1 plan, with `WT="$ROOT/.claude/worktrees/{name}"`, running these from `$ROOT`:

1. **Create**:
   ```bash
   git worktree add "$WT" -b feat/{name} "$BASE"   # new branch
   git worktree add "$WT" feat/{name}              # the branch already exists
   ```
   For an existing branch, its base is `git merge-base "$TARGET" feat/{name}` instead of `BASE`.
2. **Local files**: a worktree only has tracked files. Copy the gitignored files and folders that `.worktreeinclude` lists (gitignore syntax, one pattern per line). Whole folders are copied at once, as copy-on-write clones where the disk supports them (APFS on macOS, Btrfs or XFS on Linux), so even large local data takes almost no space:
   ```bash
   git ls-files --others --ignored --exclude-from=.worktreeinclude --directory | git check-ignore --stdin |
     while IFS= read -r p; do
       p=${p%/}; mkdir -p "$WT/$(dirname "$p")"
       cp -R --reflink=auto "$p" "$WT/$p" 2>/dev/null || cp -cR "$p" "$WT/$p" 2>/dev/null || cp -R "$p" "$WT/$p"
     done
   ```
   Without a `.worktreeinclude`, copy gitignored env files instead (`git ls-files --others --ignored --exclude-standard --directory | grep -E '(^|/)\.env[^/]*$'` piped into the same loop), and suggest creating `.worktreeinclude` in the report. Never print these files' contents.
3. **Untracked plans**: if the plans aren't tracked, `cp -R {{TASKS_DIR}} "$WT/"`.
<!-- claude-only -->
   If blueprints is installed in this project rather than globally (`{{BLUEPRINTS_DIR}}` is inside `$ROOT`) and `.claude/commands/` isn't tracked by git, copy what the run needs into the worktree: `.claude/commands`, `.claude/agents`, `.claude/workflows`, `.claude/blueprints` and `.claude/settings.local.json`, the ones that exist (`mkdir -p "$WT/.claude"`, then `cp -R` each into it). Never copy `.claude/worktrees`. If they aren't gitignored either, add them to `$COMMON/info/exclude` (as in step 7.4) so they don't show up as uncommitted changes.
<!-- /claude-only -->
<!-- codex-only -->
   If blueprints is installed in this project rather than globally and `.agents/skills/` or `.codex/agents/` aren't tracked by git, copy them into the worktree too (`cp -R .agents .codex "$WT/"`, only the ones that exist), so the run finds `$autopilot` and its agents. If they aren't gitignored either, add `.agents/` and `.codex/` to `$COMMON/info/exclude` (as in step 7.4) so they don't show up as uncommitted changes.
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

## 9. Launch the Runs

<!-- claude-only -->
Start one background Claude Code session per worktree. Start it from inside the worktree, so Claude Code uses that worktree instead of creating another one, and in a subshell as shown, so this session's own working directory stays in the main checkout:

```bash
(cd "$WT" && claude --bg --name "{name}" "/autopilot {NN}_{NAME}")
```

Add `--permission-mode <mode>` with the mode from step 6 (or from `--permission-mode`), unless the runs keep the user's default. Each command prints the session's id and returns right away. No `--full` is needed: `/autopilot` recognizes a dispatched run and never waits for approvals there.

`claude --bg` writes to `~/.claude/jobs`, so a sandboxed shell blocks it; retrying outside the sandbox with the user's approval is fine. If it still fails, or this Claude Code version has no `--bg` (it needs background agents), don't look for workarounds: print the commands so the user can run them, prefixed with `! ` to run them from this prompt, or in their own terminals.
<!-- /claude-only -->
<!-- codex-only -->
Codex can't start background sessions from here, so print one command per worktree for the user to run in separate terminals. `--add-dir` lets the session write to the repository's shared `.git` directory, which commits from a worktree need:

```bash
codex -C "{WT}" --add-dir "{COMMON}" '$autopilot {NN}_{NAME}'
```

No `--full` is needed: `$autopilot` recognizes a dispatched run and never waits for approvals there.
<!-- /codex-only -->

## 10. Report

```markdown
**Dispatched** {N} plan(s) from `{TARGET}` @ `{short BASE}`

| Plan | Worktree | Branch | Left for you |
|------|----------|--------|--------------|
| 02_PAYMENTS | .claude/worktrees/payments | feat/payments | paid smoke test |

**Decided before dispatch**: {question → answer, per plan; with `--yes`, the provisional choices and the questions left for you}
**Queued**: 03_CHECKOUT — wave 2, after 02_PAYMENTS

**Next**:
<!-- claude-only -->
- Watch the runs: `claude agents` (or `claude attach {name}` to look inside one). A run that hits a permission prompt shows as "Needs input" there
<!-- /claude-only -->
<!-- codex-only -->
- Start the runs, one terminal each: {the commands from step 9}
- Watch them: `codex agents`
<!-- /codex-only -->
- When they finish: run `/autopilot` here (or `/integrate`). It merges the finished runs into `{TARGET}`, tests them together, shows the steps left for you and the decisions the runs made, and tells you which queued plans are unblocked
- Prefer pull requests? Push each branch and open a PR instead
- Don't delete a run's worktree or session before it's integrated
```

From `/autopilot`, also say that this session doesn't build any of the plans itself.

## Rules

- Never push, and never delete branches or worktrees here.
- Never start two runs on the same branch.
- Don't change the plans' tasks; step 7 only adds notes and **(USER)** marks.
- This checkout stays on `{TARGET}`. The user can keep working here, but should avoid files the runs are changing. Lint and test runners here may also scan `.claude/worktrees/`; exclude it if they pick up the runs' files.
