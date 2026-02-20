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

**Plans in tasks/plans/**:
!`ls -1 tasks/plans/PLAN_*.md 2>/dev/null || echo "No plans found"`

**Current Branch**: !`git branch --show-current`

**Working Directory**: !`pwd`

---

## Autonomous Execution Mode

Launching the **implement agent** which will work independently in a separate context.

### What the Agent Will Do

- ✅ Load `tasks/plans/PLAN_{NAME}.md`
- ✅ Parse all phases, tasks, and dependencies
- ✅ Create comprehensive task tracking (TodoWrite)
- ✅ Execute tasks systematically with validation
- ✅ Update plan document as tasks complete
- ✅ Run type checks and linting after each task
- ✅ Validate each phase before proceeding
- ✅ Handle blockers (will pause and report)
- ✅ Adapt plan if better approaches discovered
- ✅ Return comprehensive summary when complete

### What You'll See

The agent will:
- Work autonomously in a separate context
- Come back with a **summary report** of what was done
- Ask for your input if it encounters blockers
- Update you on progress periodically

**This is hands-off autonomous implementation.**

### When to Use This

Use `/implement` when:
- You want the work done independently
- The plan is clear and self-contained
- You'll check back later for results
- You trust the autonomous execution

**Want to be involved?** Use `/kickoff` instead for collaborative implementation.

---

Use the Task tool to launch the implement agent (subagent_type="implement") with the plan name and any additional context from arguments.
