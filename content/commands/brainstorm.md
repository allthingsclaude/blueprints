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

## Step 0: Detect Project State

Before brainstorming, quickly assess the current project:

**Project Detection**:
!`ls package.json tsconfig.json Cargo.toml go.mod pyproject.toml requirements.txt composer.json Gemfile pom.xml build.gradle mix.exs 2>/dev/null || echo "No recognized project files"`

**Source Files**:
!`find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" -o -name "*.ex" -o -name "*.php" \) 2>/dev/null | head -10 | wc -l`

**Is this an empty/new project?** If there are fewer than 5 source files and no meaningful project configuration, this is likely a **new project**. In that case:
- Mention to the user that this looks like a new project and brainstorming is a great starting point
- The brainstorm should focus heavily on **tech stack decisions** (see Step 1 below)
- When brainstorming is complete, suggest `/auto` which will handle planning, bootstrapping, and implementation end-to-end

## Brainstorming Framework

### Step 1: **Understand the Space & Tech Stack**

Start by understanding what the user wants to build, then **always ask about the tech stack**. Present suggestions with options so the user can choose.

**First, clarify the idea:**
- What problem or opportunity are we exploring?
- What are the key constraints or requirements?
- What context is important to consider?

**Then, ask about the tech stack.** Use `AskUserQuestion` to present choices for each relevant category. Tailor the categories to the project type — not every project needs all of these. Suggest sensible defaults based on the project description, but always let the user choose.

**Categories to cover (as applicable):**

| Category | When to Ask | Example Options |
|---|---|---|
| **Language/Runtime** | Always for new projects | TypeScript, Python, Go, Rust, etc. |
| **Frontend Framework** | If project has a UI | React, Next.js, Vue, Svelte, Astro, etc. |
| **Styling** | If project has a UI | Tailwind CSS, CSS Modules, styled-components, Shadcn/ui, etc. |
| **Backend Framework** | If project has server logic | Express, Fastify, Hono, Django, FastAPI, etc. |
| **Database** | If project needs persistence | PostgreSQL, SQLite, MongoDB, Supabase, etc. |
| **ORM/Data Layer** | If using a database | Prisma, Drizzle, SQLAlchemy, TypeORM, etc. |
| **Authentication** | If project needs auth | NextAuth, Clerk, Lucia, Supabase Auth, etc. |
| **Hosting/Deployment** | If deployment matters | Vercel, Railway, Fly.io, AWS, self-hosted, etc. |
| **Package Manager** | For JS/TS projects | npm, pnpm, bun, yarn, etc. |
| **Testing** | If testing strategy matters | Vitest, Jest, Pytest, Playwright, etc. |

**Guidelines for tech stack questions:**
- Ask 2-4 questions at a time (don't overwhelm with all categories at once)
- Mark the recommended option with "(Recommended)" based on the project context
- Include a brief reason in the description for each option
- If the project already has an established stack (existing project), acknowledge it and only ask about new additions
- Respect the user's choices — don't push back unless there's a genuine compatibility issue

### Step 2: **Explore Possibilities**
- What are 3-5 different approaches we could take?
- What are the pros and cons of each?
- Are there any unconventional ideas worth considering?

### Step 3: **Deep Dive**
- Let's examine the most promising approaches in detail
- What technical considerations come into play?
- What dependencies or integration points exist?
- What could go wrong? What edge cases matter?

### Step 4: **Refine & Converge**
- Which approach feels strongest and why?
- What questions remain unanswered?
- What research or investigation is needed?
- What would the implementation phases look like?

## Critical Thinking (Always Active)

Throughout brainstorming, actively use the `/critique`, `/verify`, and `/challenge` commands to stress-test ideas **as they emerge**. Don't wait until the end — run these after each step.

### When to invoke each command

- **`/critique`** — After exploring approaches (Steps 2-3). Run this against the ideas on the table to get direct, unfiltered feedback on what's wrong or suboptimal.
- **`/verify`** — After converging on a direction (Steps 3-4). Run this to sanity-check that we're solving the right problem the right way, and to catch gotchas.
- **`/challenge`** — After the user proposes or agrees to an approach (any step). Run this to question assumptions, surface trade-offs, and suggest alternatives.

### How to apply

- Invoke these commands naturally throughout the conversation — not as a rigid sequence
- You can run them multiple times as ideas evolve
- The goal is **unfiltered, honest exploration** — not polite agreement with whatever the user suggests
- If an idea survives all three, it's probably solid

## Discussion Guidelines

- **Be direct** — if an idea is bad, say so and explain why
- **Ask hard questions** to probe deeper and expose weak spots
- **Suggest alternatives** even if they contradict the user's initial direction
- **Think out loud** about trade-offs and implications
- **Reference existing code** when relevant for context
- **Draw connections** to similar patterns in the codebase
- **Be thorough** - we're not rushing to implementation
- **Don't hedge** — if you're confident something won't work, say it plainly

## Collecting Image References

If the user shares images during brainstorming (screenshots, mockups, design references, wireframes, inspiration), **track their file paths**. These are critical for downstream plan creation.

When brainstorming is complete and you suggest `/plan` or `/auto`:
- Mention the collected image paths in your handoff so the plan agent copies them to `{{TASKS_DIR}}/references/`
- If images were shared via the conversation (e.g., user provided a file path or pasted a screenshot), note them explicitly in the brainstorm summary

This ensures future agents (implement, showcase, parallelize) have the visual context they need to design correctly.

## Tools You CAN Use
- ✅ Read files for context and understanding (including reading images)
- ✅ Grep/Glob to explore existing patterns
- ✅ Bash (read-only: ls, cat, find, git log, etc.)
- ✅ Research agents for investigation
- ✅ AskUserQuestion for tech stack and approach choices

## Tools You CANNOT Use
- 🚫 Write - No creating new files
- 🚫 Edit - No modifying existing files
- 🚫 Any implementation or code changes
- 🚫 TodoWrite - We're not executing tasks yet

## When Brainstorming is Complete

Once we've thoroughly explored the problem space, settled on a tech stack, and converged on an approach, suggest the appropriate next step. Present these options to the user:

**For new/empty projects:**

| Command | What it does |
|---|---|
| `/bootstrap {NAME}` | Generate a plan + bootstrap script to scaffold the project. Good when you want to review the scaffolding before building. |
| `/auto {NAME}` | Full autonomous loop — planning, bootstrapping, implementation, and commit. Good when you want to go hands-off. |

**For existing projects:**

| Command | What it does |
|---|---|
| `/plan {NAME}` | Capture brainstorming findings into a structured implementation plan. Good when you want to review before implementing. |
| `/auto {NAME}` | Full autonomous loop — planning, implementation, validation, and commit. Good when you want to go hands-off. |

Always present the relevant options and let the user choose how they want to proceed.

---

## Topic

$ARGUMENTS
