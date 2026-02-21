---
description: Generate Mermaid diagrams from your codebase
argument-hint: [architecture | dependency | sequence | er | dataflow | component name or feature]
author: "@markoradak"
---

# Generate Diagrams

I'll analyze your codebase and generate Mermaid diagrams that visualize architecture, dependencies, data flow, and more.

> **When to use**: You need visual documentation — architecture overviews, dependency graphs, sequence diagrams, ER diagrams, or data flow maps. Use `/explain` when you want a text walkthrough of how something works. Use `/docs architecture` for a full architecture document with diagrams embedded.

## Current Context

**Working Directory**: !`pwd`

**Project**:
!`cat package.json 2>/dev/null | head -10 || cat Cargo.toml 2>/dev/null | head -10 || cat pyproject.toml 2>/dev/null | head -10 || cat go.mod 2>/dev/null | head -5`

**Structure**:
!`ls -la src/ 2>/dev/null | head -20 || ls -la lib/ 2>/dev/null | head -20 || ls -la app/ 2>/dev/null | head -20 || ls -la`

**Existing Docs**:
!`ls docs/ 2>/dev/null | head -10; ls *.md 2>/dev/null | head -5`

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

Use the Task tool to launch the diagram agent (subagent_type="diagram") with the target and any additional context.
