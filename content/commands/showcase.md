---
description: Design an award-winning landing page with animations and micro-interactions
argument-hint: [product/project name or description]
author: "@markoradak"
---

# Showcase — Landing Page Design

I'll design and build a high-end landing page with polished animations, micro-interactions, and visual craft worthy of an Awwwards feature.

## Current Context

**Working Directory**: !`pwd`

**Project Detection**:
!`ls package.json tsconfig.json next.config.* vite.config.* astro.config.* tailwind.config.* 2>/dev/null || echo "No recognized project files"`

**Existing Pages**:
!`find . -maxdepth 4 -type f \( -name "page.tsx" -o -name "page.jsx" -o -name "index.tsx" -o -name "index.jsx" -o -name "index.html" \) -not -path "*/node_modules/*" 2>/dev/null | head -10`

**Reference Files** (images/videos provided):
!`ls {{TASKS_DIR}}/references/ 2>/dev/null | head -10 || echo "No references found"`

---

## Project / Product

$ARGUMENTS

---

## What This Does

The showcase agent will design and build a complete, production-ready landing page with:

- **Hero section** with striking visual impact and entrance animations
- **Scroll-driven animations** — elements that reveal, parallax, and transform on scroll
- **Micro-interactions** — hover states, button feedback, cursor effects, toggle animations
- **Smooth transitions** — page sections that flow into each other seamlessly
- **Typography craft** — deliberate type hierarchy, spacing, and rhythm
- **Responsive design** — fluid layouts that feel intentional at every breakpoint
- **Performance** — optimized animations that don't tank Core Web Vitals

### Style Direction

If reference images/videos were provided, the agent will extract the visual direction from them.

If no references are provided, the agent will ask you to choose a style direction before designing.

### How It Integrates

- In `/auto` or `/implement` — if the plan includes a landing page task, the showcase agent is used instead of the generic implement agent for that task
- In `/parallelize` — landing page work can be a dedicated stream using the showcase agent
- Standalone — run `/showcase` directly to design a landing page from scratch or redesign an existing one

Use the Task tool to launch the showcase agent (subagent_type="showcase") with the product/project context and any reference files.
