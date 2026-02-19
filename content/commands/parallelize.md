---
description: Parallelize plan execution across multiple agents for faster development
argument-hint: {PLAN_NAME} [optional: max-agents count]
author: "@markoradak"
---

# Parallelize Execution

I'll analyze your plan or task, identify parallelization opportunities, and spawn multiple agents to work simultaneously.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Available Plans**:
!`ls -1 plans/PLAN_*.md 2>/dev/null || echo "No plans found"`

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
- **Agent Spawning**: Launch agents for each stream using Task tool
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

### Agent Limits

- **Default**: 3-5 agents (balances speed vs. coordination overhead)
- **Maximum**: 8 agents (beyond this, conflicts become likely)
- **Minimum**: 2 agents (otherwise just use `/implement`)

---

## Expected Output

After parallel execution completes:

```markdown
# Parallel Execution Complete

**Plan**: {PLAN_NAME}
**Agents Spawned**: [X]
**Total Duration**: [time]
**Tasks Completed**: [Y/Z]

## Stream Results

### Stream 1: [Description]
- Agent: [ID]
- Status: Complete
- Tasks: [list]
- Files Modified: [list]

### Stream 2: [Description]
- Agent: [ID]
- Status: Complete
- Tasks: [list]
- Files Modified: [list]

## Validation

- Type Check: [Pass/Fail]
- Lint: [Pass/Fail]
- Conflicts: [None/List]

## Summary

[What was accomplished across all streams]

## Next Steps

1. Review changes: `git diff`
2. Run tests: `pnpm test`
3. Continue with remaining tasks (if any)
```

---

Use the Task tool to launch the parallelize orchestrator agent (subagent_type="parallelize") which will analyze the plan, partition work, spawn agents, and coordinate parallel execution.
