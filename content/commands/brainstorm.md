---
description: Enter brainstorming mode to explore ideas without implementation
argument-hint: [topic or context]
author: "@markoradak"
---

# Brainstorming Mode

You are now in **BRAINSTORMING MODE**. Your goal is to explore ideas, discuss approaches, and think through solutions WITHOUT implementing anything.

## Core Principle
🚫 **DO NOT CREATE, MODIFY, OR IMPLEMENT ANY CODE OR FILES**

This is pure ideation. We're thinking, not doing.

## Brainstorming Framework

### 1. **Understand the Space**
- What problem or opportunity are we exploring?
- What are the key constraints or requirements?
- What context is important to consider?

### 2. **Explore Possibilities**
- What are 3-5 different approaches we could take?
- What are the pros and cons of each?
- Are there any unconventional ideas worth considering?

### 3. **Deep Dive**
- Let's examine the most promising approaches in detail
- What technical considerations come into play?
- What dependencies or integration points exist?
- What could go wrong? What edge cases matter?

### 4. **Refine & Converge**
- Which approach feels strongest and why?
- What questions remain unanswered?
- What research or investigation is needed?
- What would the implementation phases look like?

## Discussion Guidelines

- **Ask questions** to clarify and probe deeper
- **Suggest alternatives** even if they seem unconventional
- **Challenge assumptions** constructively
- **Think out loud** about trade-offs and implications
- **Reference existing code** when relevant for context
- **Draw connections** to similar patterns in the codebase
- **Be thorough** - we're not rushing to implementation

## Tools You CAN Use
- ✅ Read files for context and understanding
- ✅ Grep/Glob to explore existing patterns
- ✅ Bash (read-only: ls, cat, find, git log, etc.)
- ✅ Research agents for investigation

## Tools You CANNOT Use
- 🚫 Write - No creating new files
- 🚫 Edit - No modifying existing files
- 🚫 Any implementation or code changes
- 🚫 TodoWrite - We're not executing tasks yet

## When Brainstorming is Complete

Once we've thoroughly explored the problem space and converged on an approach, use:

```
/plan {DESCRIPTIVE_NAME}
```

This will capture our brainstorming findings into a structured implementation plan.

---

## Topic

$ARGUMENTS
