---
description: Create on-brand design and marketing assets (social media, banners, ads)
argument-hint: design brief or leave empty for guided questionnaire
author: "@markoradak"
---

# Design — Marketing Asset Creation

I'll create on-brand design and marketing assets — social media banners, ad creatives, email headers, OG images, and more.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Assets**:
!`ls tailwind.config.* src/app/globals.css src/styles/*.css public/images/*.svg 2>/dev/null || echo "No brand files detected"`

**Design Directory**:
!`ls design/ 2>/dev/null || echo "No existing design directory"`

**Previous Brand Brief**:
!`head -30 design/brand-brief.md 2>/dev/null || echo "No brand brief yet"`

**Image Generation APIs** (agent will check GEMINI_API_KEY and FAL_KEY availability at runtime):

---

## Design Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: asset type, platform(s), goal, style direction, messaging, and count. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the design agent.

### If the brief is empty or vague:

Conduct a focused discovery using the **AskUserQuestion tool** for interactive selection. The user should be able to click/select options rather than typing numbers. Adapt follow-up questions based on previous answers.

#### First, determine the repo context:

Check the "Existing Brand Assets" and "Previous Brand Brief" sections above. If brand files were detected (CSS, Tailwind config, SVGs, design tokens, or an existing `design/brand-brief.md`), this is a **brand-rich repo** — the codebase contains enough to derive brand identity, visual style, and messaging automatically.

#### Round 1 — Core questions (single AskUserQuestion call, 3 questions):

**Q1** (header: "Asset type", multiSelect: false):
Question: "What type of design asset do you need?"
Options:
- label: "Social media banners" / description: "Instagram, Twitter/X, LinkedIn, Facebook"
- label: "Ad creatives & email" / description: "Display ads, retargeting, email headers, newsletter graphics"
- label: "Product assets" / description: "Open Graph images, App Store screenshots, Product Hunt"
- label: "Presentation graphics" / description: "Pitch deck slides, keynote visuals"

**Q2** (header: "Goal", multiSelect: false):
Question: "What's the campaign goal?"
Options:
- label: "Launch / announcement" / description: "New product, feature, or version release"
- label: "Feature spotlight" / description: "Highlight a specific capability or use case"
- label: "Brand awareness" / description: "General brand visibility and recognition"
- label: "Event / hiring / culture" / description: "Promote events, open roles, or team culture"

**Q3** (header: "Count", multiSelect: false):
Question: "How many designs should I create?"
Options:
- label: "3 designs" / description: "Focused, tight set"
- label: "6 designs (Recommended)" / description: "Balanced variety for a campaign"
- label: "9 designs" / description: "Extended campaign coverage"
- label: "12 designs" / description: "Full campaign suite with maximum variety"

#### Round 2 — Platform selection (single AskUserQuestion call, 1 question):

Ask a **multiSelect: true** question for platform(s). Offer the 4 most relevant platforms based on the asset type from Round 1:

If **social media banners**:
- label: "Instagram Post" / description: "Square — 1080×1080"
- label: "Instagram Story" / description: "Vertical — 1080×1920"
- label: "Twitter/X Post" / description: "Landscape — 1200×675"
- label: "LinkedIn Post" / description: "Landscape — 1200×627"

If **ad creatives & email**:
- label: "Email header" / description: "Wide — 600×200"
- label: "Newsletter graphic" / description: "Landscape — 1200×630"
- label: "Display ad" / description: "Landscape — 1200×628"
- label: "Retargeting banner" / description: "Rectangle — 300×250"

If **product assets**:
- label: "Open Graph" / description: "Landscape — 1200×630"
- label: "Product Hunt" / description: "Landscape — 1270×760"
- label: "YouTube Thumbnail" / description: "Landscape — 1280×720"
- label: "App Store screenshot" / description: "Portrait — 1284×2778"

If **presentation graphics**:
- label: "Slide 16:9" / description: "Widescreen — 1920×1080"
- label: "Slide 4:3" / description: "Standard — 1024×768"
- label: "LinkedIn Post" / description: "Landscape — 1200×627"
- label: "Twitter/X Post" / description: "Landscape — 1200×675"

#### Round 3 — Brand & style (only for bare repos, single AskUserQuestion call):

Only ask these if **no brand files were detected**. In brand-rich repos, skip to confirmation.

**Q1** (header: "Style", multiSelect: false):
Question: "What visual style fits your brand?"
Options:
- label: "Minimal / editorial" / description: "Whitespace, typography-driven, structural grids"
- label: "Bold / dark premium" / description: "High-contrast, oversized type, dark backgrounds, glow effects"
- label: "Playful / colorful" / description: "Gradients, rounded shapes, vibrant colors"
- label: "Technical / developer" / description: "Terminal mockups, monospace, code aesthetics"

**Q2** (header: "Headline", multiSelect: false):
Question: "What's the primary headline direction?"
Options:
- label: "Product name + tagline" / description: "Lead with brand identity and value prop"
- label: "Feature benefit" / description: "Lead with what the product does for users"
- label: "Call to action" / description: "Lead with urgency — try it, sign up, launch day"
- label: "I'll write it" / description: "Select Other to provide your own headline"

#### In brand-rich repos, skip Round 3:

The agent will automatically analyze the codebase for colors, typography, design patterns, logos, and product copy. Brand identity, visual style, and messaging will be derived from the existing design system and content. The user can still override any of these when confirming the brief.

After gathering all answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

### Launching the Agent

Use the Task tool to launch the design agent (subagent_type="design") with the complete design brief including:
- Asset type and platform(s) with exact pixel dimensions
- Campaign goal and key messaging
- Brand source preference (and existing brand-brief.md content if available)
- Visual style direction
- Number of designs to create
- Working directory path
- Whether image generation APIs are available (and which)
- Any specific instructions or constraints from the user
