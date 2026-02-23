---
description: Start implementing a plan interactively in main context
argument-hint: {NAME} [optional: starting phase or task]
author: "@markoradak"
---

# Kickoff Plan Implementation

I'll load the plan and work through it **with you** in this conversation.

## Plan to Execute

$ARGUMENTS

---

## Available Plans

**Active Plan**:
!`cat {{STATE_FILE}} 2>/dev/null || echo "No active plan set"`

**Plans in {{PLANS_DIR}}/**:
!`ls -1 {{PLANS_DIR}}/PLAN_*.md 2>/dev/null || echo "No plans found"`

**Current Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Working Directory**: !`pwd`

---

## Interactive Implementation

I'll work through this plan collaboratively with you:

### How This Works

1. **Load & Review**: I'll load the plan and show you a summary
2. **Environment Check**: Verify git status and project state
3. **Convention Discovery**: Scan the codebase for established patterns (error handling, styling, state management, data fetching, test infrastructure) and share findings so we're aligned on which patterns to follow
4. **Task Tracking**: Set up TodoWrite for all plan tasks
5. **Step-by-Step**: Execute tasks one at a time with your input
6. **Validation**: Run type checks and lints after each task
7. **Phase Approval**: Ask before moving between phases
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

**Before implementing**, scan the codebase for established conventions (error handling approach, styling method, state management, data fetching patterns, test infrastructure). Share the findings with the user so you're aligned on which patterns to follow throughout implementation. Use Grep/Glob to sample patterns — look for things like toast/notification usage, CSS module vs SCSS vs inline patterns, custom hooks, test frameworks, etc. Present a brief summary of discovered conventions before starting tasks.

Use Read to load `{{PLANS_DIR}}/PLAN_{NN}_{NAME}.md`, display a comprehensive summary with:
- Objective
- Phases and task counts
- Key files involved
- Any open questions or risks
- Reference files in `{{TASKS_DIR}}/references/` (if any exist — list them so the user knows what design context is available)

Then ask: "Ready to start implementing? Which phase should we tackle first?"

Use TodoWrite to create todos for all tasks from the plan once user confirms.

Then begin executing tasks step-by-step, staying in the main context, validating as you go.
