---
description: Create an on-brand HTML presentation deck with speaker notes
argument-hint: [pitch topic/audience] or leave empty for guided questionnaire
author: "@markoradak"
---

# Pitch — Presentation Deck Creation

I'll create an on-brand, self-contained HTML presentation deck with keyboard navigation, slide transitions, and speaker notes — ready to present from any browser.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Brief**:
!`cat design/brand-brief.md 2>/dev/null | head -40 || echo "No brand brief yet"`

**Project Identity**:
!`cat README.md 2>/dev/null | head -30 || echo "No README found"`

**Package Description**:
!`node -p 'var p=require("./package.json");[p.name,p.description,p.homepage].filter(Boolean).join(" | ")' 2>/dev/null || echo "No package.json found"`

**Product Features & Stats**:
!`grep -rh "<h2\|<h3\|<strong\|features\|pricing\|stats\|metric" src/app/page.tsx src/components/*.tsx README.md 2>/dev/null | head -20 || echo "No product features detected"`

**Design Directory**:
!`ls design/ 2>/dev/null && echo == existing campaigns == && ls -d design/*/ 2>/dev/null || echo "No existing design directory"`

---

## Pitch Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: presentation type, audience, slide count, key points, and style direction. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the pitch agent.

### If the brief is empty or vague:

Conduct a focused discovery questionnaire. Ask questions **one at a time**, adapting based on previous answers. Don't dump all questions at once — this should feel like a conversation.

#### First, determine the repo context:

Check the "Existing Brand Brief", "Project Identity", "Package Description", and "Product Features & Stats" sections above. If meaningful product information was detected (README with clear positioning, product features, stats, metrics, or an existing `design/brand-brief.md`), this is a **brand-rich repo** — the codebase contains enough to derive brand identity, product messaging, and content automatically.

#### Always ask (every context):

**Q1: What's the presentation for?**
- Product launch
- Investor pitch
- Conference talk
- Team update
- Sales demo
- Workshop
- Custom (describe)

**Q2: Who's the audience?**
- Investors
- Developers
- Customers
- Team / internal
- Executives
- Conference attendees
- Custom (describe)

**Q3: How many slides?** (default: 10-12)

**Q4: Key points to cover?**
- List specific topics, features, stats, or talking points
- Or say "derive from codebase" to auto-extract from README, features, and product info

#### Only ask in bare repos (no brand or product info detected):

If no README positioning, brand brief, features, or product info was found, the agent has nothing to derive from — so you need to ask:

**Q5: What's the brand/style direction?**
- Minimal / editorial (whitespace, typography-driven)
- Bold / high-contrast (oversized type, strong colors)
- Dark / premium (dark backgrounds, glow effects, sleek)
- Technical / developer (terminal aesthetics, monospace)
- Corporate / clean (structured, professional)
- Playful / colorful (gradients, rounded shapes, vibrant)

**Q6: What content should the deck cover?**
(Free text — outline the narrative arc, key arguments, data points, or story beats)

#### In brand-rich repos, skip Q5-Q6:

The agent will automatically analyze the codebase for brand identity, product features, stats, and messaging. Visual style and content direction will be derived from the existing design system and product information. The user can still override any of these when confirming the brief.

After gathering answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

### Launching the Agent

Use the Task tool to launch the pitch agent (subagent_type="pitch") with the complete brief including:
- Presentation type and audience
- Slide count
- Key points and narrative direction
- Brand source preference (and existing brand-brief.md content if available)
- Visual style direction
- Working directory path
- Any specific instructions or constraints from the user
