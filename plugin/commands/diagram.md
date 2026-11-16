---
description: Generate Mermaid diagrams from your codebase
argument-hint: architecture | dependency | sequence | er | dataflow | component name or feature
author: "@markoradak"
---

> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.

# Generate Diagrams

I'll analyze your codebase and generate Mermaid diagrams that visualize architecture, dependencies, data flow, and more.

> **When to use**: You need visual documentation — architecture overviews, dependency graphs, sequence diagrams, ER diagrams, or data flow maps. Use `/explain` when you want a text walkthrough of how something works. Use `/docs architecture` for a full architecture document with diagrams embedded.

## Current Context

**Working Directory**: run `pwd`

**Project**:
run `head -10 package.json 2>/dev/null || echo "No package.json"`

**Structure**:
run `ls -la src/ 2>/dev/null || echo "No src/ directory"`

**Existing Docs**:
run `ls docs/ 2>/dev/null || echo "No docs/ directory"`

---

## Diagram Target

$ARGUMENTS

---

## Launching Diagram Agent

The diagram agent will:
1. **Analyze the codebase** — Trace imports, exports, routes, models, and data flow
2. **Choose the right diagram type(s)** based on what's requested and what's useful
3. **Generate Mermaid syntax** — Renderable on GitHub, VS Code, Notion, and most markdown tools
4. **Write to file** — Saves diagrams as `.md` files (or appends to existing docs)

**Diagram types**:
- `architecture` — High-level system overview (components, layers, boundaries)
- `dependency` — Module/package dependency graph (imports, who depends on whom)
- `sequence` — Request/event flow through the system (step-by-step interactions)
- `er` — Entity-relationship diagram (database models, types, relationships)
- `dataflow` — How data moves through the system (input → transform → output)
- `[feature or component]` — Auto-detect the best diagram type for the subject
- No arguments — Survey the project and generate the most useful overview diagram

Use the `Agent` tool to launch the diagram agent (subagent_type="diagram") with the target and any additional context.
