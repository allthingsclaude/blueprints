---
description: Generate detailed explanations of code, architecture, or features
argument-hint: file path, component name, feature, or concept to explain
author: "@markoradak"
---

# Explain Code

I'll provide a detailed, educational explanation of the code, architecture, or feature you're interested in.

## Current Context

**Working Directory**: !`pwd`

**Project Structure**:
!`ls -la src/ 2>/dev/null || echo "No src/ directory"`

---

## What to Explain

$ARGUMENTS

---

## Launching Explanation Agent

Launching the explain agent to analyze the code and generate a comprehensive explanation...

Use the `Agent` tool to launch the explain agent:

```
Agent({
  subagent_type: "explain",
  prompt: "Explain the following: $ARGUMENTS

Working directory context has been gathered above. Read the target code in full; for related files (imports, consumers, tests), locate the relevant part with `Grep` and read just that range. Produce a clear, educational explanation."
})
```

The agent will:
1. **Find the code** — Locate the relevant files using `Glob` and `Grep`
2. **Read the context** — Read the target implementation in full, and the relevant ranges of related files
3. **Trace connections** — Follow imports, consumers, and test files
4. **Build the explanation** — Structured walkthrough with visual aids and file:line references
