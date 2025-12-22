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

**Plans in .claude/temp/**:
!`ls -1 .claude/temp/PLAN_*.md 2>/dev/null || echo "No plans found"`

**Current Branch**: !`git branch --show-current`

**Working Directory**: !`pwd`

---

## Interactive Implementation

I'll work through this plan collaboratively with you:

### How This Works

1. **Load & Review**: I'll load the plan and show you a summary
2. **Environment Check**: Verify git status and project state
3. **Task Tracking**: Set up TodoWrite for all plan tasks
4. **Step-by-Step**: Execute tasks one at a time with your input
5. **Validation**: Run type checks and lints after each task
6. **Phase Approval**: Ask before moving between phases
7. **Adapt Together**: Discuss blockers and adjustments as we go

### Your Role

- You can guide, ask questions, and make decisions as we work
- Interrupt at any time to change direction
- Review changes before I move to the next task
- Stay involved throughout the implementation

**This is collaborative implementation in the main conversation.**

---

Now let me load the plan and we'll get started together.

Use Read to load `.claude/temp/PLAN_{NAME}.md`, display a comprehensive summary with:
- Objective
- Phases and task counts
- Key files involved
- Any open questions or risks

Then ask: "Ready to start implementing? Which phase should we tackle first?"

Use TodoWrite to create todos for all tasks from the plan once user confirms.

Then begin executing tasks step-by-step, staying in the main context, validating as you go.
