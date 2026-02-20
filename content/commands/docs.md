---
description: Generate or update project documentation
argument-hint: [readme | api | architecture | file path or component to document]
author: "@markoradak"
---

# Generate Documentation

I'll analyze your codebase and generate or update documentation.

> **When to use**: You need to create or update documentation — READMEs, API references, architecture overviews, or inline docstrings. Use `/explain` when you want to understand code yourself rather than document it for others.

## Current Context

**Working Directory**: !`pwd`

**Project**:
!`ls README* 2>/dev/null; ls docs/ 2>/dev/null | head -10; echo "---"; cat package.json 2>/dev/null | head -5`

**Existing Docs**:
!`find . -maxdepth 3 -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -15`

---

## Documentation Target

$ARGUMENTS

---

## Launching Documentation Agent

The docs agent will:
- Analyze the codebase structure, exports, and public interfaces
- Read existing documentation to understand current state
- Identify gaps between code and documentation
- Generate accurate, well-structured documentation
- Use real code examples from the codebase (not invented ones)
- Preserve existing documentation where it's still accurate

**Workflows**:
- `readme` — Generate or update the project README
- `api` — Document public APIs, endpoints, or exported functions
- `architecture` — Create an architecture overview with diagrams
- `[file or component]` — Generate docs for a specific file or component
- No arguments — Scan for documentation gaps and suggest what to document

Use the Task tool to launch the docs agent (subagent_type="docs") with the documentation target and any additional context.
