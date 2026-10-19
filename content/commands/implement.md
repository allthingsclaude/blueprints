---
description: Autonomously implement a plan using subagent
argument-hint: {NAME} [optional: starting phase or task]
author: "@markoradak"
---

# Autonomous Plan Implementation

I'll launch the implementation agent to **autonomously execute** your plan.

## Plan to Execute

$ARGUMENTS

---

## Available Plans

**Plans in {{PLANS_DIR}}/**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No plans found"`

**Current Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Working Directory**: !`pwd`

---

## Autonomous Execution Mode

Launching the **implement agent** once per phase, each in a fresh context — an agent's cost grows with how long it runs, so one phase per agent keeps every run short.

### What Each Agent Will Do

- ✅ Load only the parts of `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` it needs (overview + its phase)
- ✅ Follow `{{TASKS_DIR}}/CONVENTIONS.md` and check `{{TASKS_DIR}}/references/` for design references
- ✅ Execute the phase's tasks with a typecheck after each one
- ✅ Check off tasks in the plan and update STATE.md when the phase completes
- ✅ Review the phase's code for consistency and duplication
- ✅ Return a compact report: tasks done, files changed, validation results, blockers

The agents run unattended and don't commit. Blockers come back in the report at the end of a phase, not as questions mid-run.

**This is hands-off autonomous implementation.**

### When to Use This

Use `/implement` when:
- You want the work done independently
- The plan is clear and self-contained
- You'll check back later for results
- You trust the autonomous execution

**Want to be involved?** Use `/kickoff` instead for collaborative implementation.

---

Find the plan's remaining phases first: list the headings with `grep -n -E '^#{1,4} ' {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` and find unchecked tasks with `grep -n -E '^[[:space:]]*([0-9]+\.|[-*]) \[ \]' {{PLANS_DIR}}/PLAN_{NN}_{NAME}.md` (start from the phase or task in the arguments, if given).

Then, for each remaining phase **in order, one at a time**, use the `Agent` tool to launch the implement agent (subagent_type="implement") with the plan name, any additional context from the arguments, and "Execute Phase {N} only, then stop."

- If a phase's report has **blockers**, stop and relay them to the user before launching the next phase.
- Between phases, give the user a one-line status (phase done, tasks completed, validation result).

When all phases are done (or you stop on a blocker), summarize the reports and suggest next steps: review the changes (`git diff`), commit them with `/commit`, and review the branch with `/preflight` before opening a PR.
