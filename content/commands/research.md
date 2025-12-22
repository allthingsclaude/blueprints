---
description: Activate a specialized research agent (codebase/web/docs) to investigate specific topics
argument-hint: [topic or question to research]
author: "@markoradak"
---

# Research Assistant

I'll intelligently route your research query to the appropriate specialized agent.

## Query

$ARGUMENTS

---

## Routing Logic

Analyze the query to determine the best research agent:

**Use `codebase-research` agent when:**
- Query mentions "in this codebase", "how does X work here", "where is X implemented"
- Looking for files, components, functions, or code patterns
- Understanding architecture, structure, or current implementation
- Keywords: "explore", "find in code", "how does our", "where is", "codebase structure"

**Use `docs-research` agent when:**
- Query mentions specific library/framework APIs (React, Next.js, Prisma, tRPC, etc.)
- Looking for package documentation or how to use a dependency
- Questions about official API references
- Keywords: "library docs", "API reference", "how to use [library]", "documentation for"
- Check package.json first to see if mentioned library is a project dependency

**Use `web-research` agent when:**
- Query asks for "latest", "best practices", "how to do X in 2025"
- Looking for online tutorials, guides, or examples
- Researching industry standards or modern approaches
- No specific library mentioned, or general "how to" questions
- Keywords: "research online", "best practices", "modern approach", "latest", "tutorial"

**Default to `codebase-research`** if the query is ambiguous and could apply to understanding existing code.

---

## Execution

Based on the query above, determine which agent to use and launch it with the Task tool:

- `subagent_type="codebase-research"` for codebase exploration
- `subagent_type="docs-research"` for library documentation
- `subagent_type="web-research"` for web searching

Pass the full query as the prompt to the agent.

**Note**: You can also manually specify the agent type by prefixing your query:
- `/research codebase: where is authentication handled`
- `/research web: tailwind grid best practices 2025`
- `/research docs: tRPC mutation error handling`
