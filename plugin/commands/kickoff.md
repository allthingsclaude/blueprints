---
description: Start implementing a plan interactively in main context
argument-hint: "{NAME} [optional: starting phase or task]"
author: "@markoradak"
---

> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.

# Kickoff Plan Implementation

I'll load the plan and work through it **with you** in this conversation.

## Plan to Execute

$ARGUMENTS

---

## Available Plans

**Active Plan**:
run `head -n 40 tasks/STATE.md 2>/dev/null || echo "No active plan"`

**Plans in tasks/plans/**:
run `ls -1 tasks/plans/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No plans found"`

**Current Branch**: run `git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Working Directory**: run `pwd`

---

## Interactive Implementation

I'll work through this plan collaboratively with you:

### How This Works

1. **Load & Review**: I'll load the plan and show you a summary
2. **Environment Check**: Verify git status and project state
3. **Convention Discovery**: Load `tasks/CONVENTIONS.md` (or create it — see below) and share the conventions so we're aligned on which patterns to follow. Never add inline styles unless absolutely necessary, always use the project's established styling method
4. **Task Tracking**: Check off tasks in the plan file as they're done (the plan's checkboxes are the source of truth), optionally mirrored in a task list (`TodoWrite` or the task tools, if available)
5. **Step-by-Step**: Execute tasks one at a time with your input
6. **Validation**: Run type checks and lints after each task
7. **Phase Approval**: Ask before moving between phases, and update STATE.md when a phase completes
8. **Adapt Together**: Discuss blockers and adjustments as we go

### Your Role

- You can guide, ask questions, and make decisions as we work
- Interrupt at any time to change direction
- Review changes before I move to the next task
- Stay involved throughout the implementation

**This is collaborative implementation in the main conversation.**

### Specialist Agents

For tasks involving landing page / marketing page / homepage design, I'll suggest using the **showcase agent** (`/showcase`) which specializes in high-end page design with animations and micro-interactions. You can approve or override this.

---

Now let me load the plan and we'll get started together.

**Before implementing**, load the codebase conventions. If `tasks/CONVENTIONS.md` exists, read it — the implementation agents share it. Otherwise scan the codebase for established conventions (error handling approach, styling method, state management, data fetching patterns, test infrastructure) using `Grep`/`Glob` to sample patterns — look for things like toast/notification usage, CSS module vs SCSS vs inline patterns, custom hooks, test frameworks, etc. — and save the authoritative ones to `tasks/CONVENTIONS.md` as a short bullet list. Present a brief summary of the conventions to the user before starting tasks so you're aligned on which patterns to follow.

Plans can be long, and anything you read stays in this conversation for every later turn, so load only what you need from `tasks/plans/PLAN_{NN}_{NAME}.md`:
- List the headings with line numbers: `grep -n -E '^#{1,4} ' tasks/plans/PLAN_{NN}_{NAME}.md` (phase headings vary — `## Phase 1:`, `### Phase 1:`, `## 4. Phase A —`)
- Count tasks per phase with `grep` instead of reading every phase: `grep -n -E '^[[:space:]]*([0-9]+\.|[-*]) \[[ xX]\]' tasks/plans/PLAN_{NN}_{NAME}.md`
- `Read` (with `offset`/`limit`) the top of the plan through **Proposed Approach**, plus the phase you're about to work on. Read another phase's section only when you start it.

Display a summary with:
- Objective
- Phases and task counts
- Key files involved
- Any open questions or risks
- Reference files in `tasks/references/` (if any exist — list them so the user knows what design context is available)

Then ask: "Ready to start implementing? Which phase should we tackle first?"

Once the user confirms:
- **Activate the plan in `tasks/STATE.md`**: set the header (`**Active**`, `**File**`, `**Phase**`, `**Status**: 🚧 In Progress`, `**Updated**`) and the plan's row in `## Plans` (add it if missing). Keep the compact format — header plus one row per plan, no per-task tables or long notes. If the file is in the legacy format (`## Overview` plus task tables), just update the header and the plan's Overview row.
- Optionally mirror the phase's tasks in a task list (`TodoWrite` or the task tools, if available).

Then begin executing tasks step-by-step, staying in the main context, validating as you go:
- **After each task**, check it off in the plan file with `Edit` (`- [ ]` → `- [x]`, or `1. [ ]` → `1. [x]`). `/autopilot`, `/implement` and `/update` read these checkboxes to know what's done.
- **After each phase**:
  - Review the phase's diff (`git diff`) for duplication — repeated helpers, near-identical components or handlers, repeated constants — and extract shared code where it clearly helps. Suggest `/dry <paths>` only if a broader pass looks warranted.
  - Update `tasks/STATE.md`: `**Phase**` → next phase, `**Updated**` → now, and the plan's `## Plans` row (Progress, e.g. `Phase 3/5 · 12/20 tasks`; Updated). When every phase is done, set `**Active**: None`, `**File**`/`**Phase**`: `—`, `**Status**: ✅ Complete`, and the plan's row to `✅ Complete`.
