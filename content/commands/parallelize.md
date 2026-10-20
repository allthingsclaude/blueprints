---
description: Parallelize plan execution across multiple agents for faster development
argument-hint: {PLAN_NAME} [optional: max-agents count]
author: "@markoradak"
---

# Parallelize Execution

I'll analyze your plan or task, identify parallelization opportunities, and spawn multiple agents to work simultaneously.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Available Plans**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null | tail -30 | grep . || echo "No plans found"`

---

## Parallelization Target

$ARGUMENTS

---

## How This Works

1. **Analyze**: I'll examine the plan/task for independent work streams
2. **Partition**: Group tasks that can run in parallel (no file conflicts)
3. **Spawn**: Launch multiple agents, each handling a partition
4. **Monitor**: Track progress across all agents
5. **Consolidate**: Merge results and validate the combined work

---

## Launching Parallel Orchestrator

The orchestrator agent will:

- **Dependency Analysis**: Map which tasks depend on others
- **Conflict Detection**: Identify tasks that touch the same files
- **Optimal Partitioning**: Create work streams that maximize parallelism
- **Agent Spawning**: Launch agents for each stream using the `Agent` tool
- **Progress Tracking**: Monitor completion status
- **Validation**: Run typecheck/lint on combined results
- **Summary Report**: Show what was accomplished

### Parallelization Rules

**CAN Parallelize**:
- Tasks in different files/modules
- Independent feature implementations
- Research/exploration tasks
- Test writing for different areas
- Documentation updates

**CANNOT Parallelize**:
- Tasks that modify the same file
- Tasks with data dependencies (B needs output of A)
- Sequential migrations/schema changes
- Tasks requiring shared state

The orchestrator picks the number of streams from the size of the work (see its heuristics); a max-agents count in the arguments caps it.

---

<!-- claude-only -->
**As a workflow (preferred)**: if the `Workflow` tool is available, run the saved workflow **`streams`** instead of the orchestrator agent, with args `{ "plan": "{plan, if named}" }`, plus `"phase"` for a phase number, `"tasks"` for a task range and `"maxStreams"` for a max-agents count; for work described in words rather than a plan, pass `"description"` instead of `"plan"`. The orchestrator records the checks, installs new packages and splits the tasks into streams that never touch the same file; one `implement` (or `showcase`) agent per stream builds them in parallel; then the orchestrator finishes what crossed stream boundaries, runs typecheck, lint, the tests and the tasks' validation steps once on the combined result, fixes new failures (at most 2 rounds) and checks the tasks off. Wait for the completion notification — don't poll. Its result is the report: `status`, `done` tasks per stream, `notDone` with reasons (including the tasks of a stream that returned nothing), `checks` and `failing`, `fixes`, `conflicts`, plus `userTasks`, `choices`, `planChanges` and `blockers`. If `checkedOff` is false, check the `done` tasks off in the plan yourself.

If the workflow isn't available or the run fails, launch the agent. If the run got as far as building (`git status` shows its changes), tell the agent the tasks may be partly built: check the diff first and finish what's missing rather than start over.
<!-- /claude-only -->

Use the `Agent` tool to launch the parallelize orchestrator agent (subagent_type="parallelize") which will analyze the plan, partition work, spawn agents, and coordinate parallel execution. Pass along any max-agents count from the arguments.

When it returns, relay its report (and any blockers) to the user, then suggest next steps: review the changes (`git diff`), run the project's tests, commit with `/commit`, and review the branch with `/preflight` before opening a PR.
