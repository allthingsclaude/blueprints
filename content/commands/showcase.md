---
description: Design an award-winning landing page with animations and micro-interactions
argument-hint: product/project name or description
author: "@markoradak"
---

# Showcase — Landing Page Design

I'll design and build a high-end landing page with polished animations, micro-interactions, and visual craft worthy of an Awwwards feature.

## Current Context

**Working Directory**: !`pwd`

**Project Detection**:
!`ls package.json tsconfig.json next.config.* vite.config.* astro.config.* tailwind.config.* 2>/dev/null || echo "No recognized project files"`

**Existing Pages**:
!`find . -maxdepth 4 -type f \( -name "page.tsx" -o -name "page.jsx" -o -name "index.tsx" -o -name "index.jsx" -o -name "index.html" \) -not -path "*/node_modules/*" 2>/dev/null | head -40 | grep . || echo "None found"`

**Reference Files** (images/videos provided):
!`ls {{TASKS_DIR}}/references/ 2>/dev/null || echo "No references found"`

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

If no references are provided and `design/brand-brief.md` doesn't exist, establish the direction **here, before launching the agent** (the agent runs as a subagent and can't ask). Use `AskUserQuestion` with these questions:

1. **Visual Mood**: Minimal & Clean (Apple, Linear, Vercel) · Bold & Expressive (Stripe, Lemon Squeezy, Arc) · Playful & Vibrant (Notion, Figma, Raycast) · Dark & Premium (GitHub Copilot, Midjourney, Framer)
2. **Animation Intensity**: Subtle (gentle fades, minimal motion) · Moderate (scroll reveals, hover effects) · Cinematic (dramatic scroll sequences, 3D transforms)
3. **Sections Needed** (multi-select): Hero with CTA · Feature highlights · How it works · Social proof / Testimonials · Pricing · FAQ · Footer with links

Pass the answers to the agent in its prompt. If the user skips the questions, the agent derives the direction from existing styles or uses its defaults.

### How It Integrates

- In `/autopilot` or `/implement` — if the plan includes a landing page task, the showcase agent is used instead of the generic implement agent for that task
- In `/parallelize` — landing page work can be a dedicated stream using the showcase agent
- Standalone — run `/showcase` directly to design a landing page from scratch or redesign an existing one

Use the `Agent` tool to launch the showcase agent (subagent_type="showcase") with the product/project context and any reference files.
