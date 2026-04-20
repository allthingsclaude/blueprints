---
description: Create an on-brand HTML presentation deck with speaker notes
argument-hint: pitch topic/audience or leave empty for guided questionnaire
author: "@markoradak"
---

# Pitch — Presentation Deck Creation

I'll create an on-brand, self-contained HTML presentation deck with keyboard navigation, slide transitions, and speaker notes — ready to present from any browser.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Brief**:
!`head -40 design/brand-brief.md 2>/dev/null || echo "No brand brief yet"`

**Project Identity**:
!`head -30 README.md 2>/dev/null || echo "No README found"`

**Package Description**:
!`head -10 package.json 2>/dev/null || echo "No package.json found"`

**Product Features & Stats**:
!`grep -rh "<h2\|<h3\|<strong\|features\|pricing\|stats\|metric" src/app/page.tsx src/components/*.tsx README.md 2>/dev/null || echo "No product features detected"`

**Design Directory**:
!`ls design/ 2>/dev/null || echo "No existing design directory"`

---

## Pitch Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: presentation type, audience, slide count, key points, and style direction. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the pitch agent.

### If the brief is empty or vague:

Conduct a focused discovery using the **AskUserQuestion tool** for interactive selection. The user should be able to click/select options rather than typing numbers. Adapt follow-up questions based on previous answers.

#### First, determine the repo context:

Check the "Existing Brand Brief", "Project Identity", "Package Description", and "Product Features & Stats" sections above. If meaningful product information was detected (README with clear positioning, product features, stats, metrics, or an existing `design/brand-brief.md`), this is a **brand-rich repo** — the codebase contains enough to derive brand identity, product messaging, and content automatically.

#### Round 1 — Core questions (single AskUserQuestion call, 3 questions):

**Q1** (header: "Presentation type", multiSelect: false):
Question: "What's the presentation for?"
Options:
- label: "Product launch" / description: "Announce a new product, feature, or version"
- label: "Investor pitch" / description: "Fundraising deck — vision, traction, the ask"
- label: "Conference talk" / description: "Keynote or session for an audience of peers"
- label: "Sales demo" / description: "Walk a prospect through product value and pricing"

**Q2** (header: "Audience", multiSelect: false):
Question: "Who's the audience?"
Options:
- label: "Investors" / description: "VCs, angels, or strategic capital partners"
- label: "Developers" / description: "Technical practitioners and engineering teams"
- label: "Customers / prospects" / description: "Buyers, end users, or decision-makers"
- label: "Team / internal" / description: "Colleagues, executives, or cross-functional peers"

**Q3** (header: "Slide count", multiSelect: false):
Question: "How many slides should the deck have?"
Options:
- label: "6-8 slides" / description: "Tight lightning-talk pacing"
- label: "10-12 slides (Recommended)" / description: "Standard pitch / launch length"
- label: "15-18 slides" / description: "Deeper narrative with room for demo and proof"
- label: "20+ slides" / description: "Long-form workshop or detailed walkthrough"

#### Round 2 — Content direction (single AskUserQuestion call, 1 question):

**Q4** (header: "Key points", multiSelect: false):
Question: "What should the deck cover?"
Options:
- label: "Derive from codebase" / description: "Auto-extract from README, features, and product info"
- label: "Narrative arc" / description: "Problem → solution → proof → CTA"
- label: "Feature-led" / description: "Core capabilities with demos and use cases"
- label: "Metrics-led" / description: "Traction, growth, and data-driven highlights"

#### Round 3 — Brand & style (only for bare repos, single AskUserQuestion call):

Only ask these if **no brand files, README positioning, or product info were detected**. In brand-rich repos, skip to confirmation.

**Q1** (header: "Style", multiSelect: false):
Question: "What visual style fits your brand?"
Options:
- label: "Minimal / editorial" / description: "Whitespace, typography-driven, structural grids"
- label: "Bold / dark premium" / description: "High-contrast, oversized type, dark backgrounds, glow"
- label: "Technical / developer" / description: "Terminal mockups, monospace, code aesthetics"
- label: "Corporate / clean" / description: "Structured, professional, restrained palette"

**Q2** (header: "Tone", multiSelect: false):
Question: "What's the tone of voice for the deck?"
Options:
- label: "Confident / bold" / description: "Declarative, punchy, no hedging"
- label: "Warm / conversational" / description: "Approachable, human, inviting"
- label: "Authoritative / precise" / description: "Data-driven, measured, expert"
- label: "Playful / energetic" / description: "Witty, spirited, brand-forward"

#### In brand-rich repos, skip Round 3:

The agent will automatically analyze the codebase for brand identity, product features, stats, and messaging. Visual style and content direction will be derived from the existing design system and product information. The user can still override any of these when confirming the brief.

After gathering all answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

### Launching the Agent

Use the Task tool to launch the pitch agent (subagent_type="pitch") with the complete brief including:
- Presentation type and audience
- Slide count
- Key points and narrative direction
- Brand source preference (and existing brand-brief.md content if available)
- Visual style direction
- Working directory path
- Any specific instructions or constraints from the user
