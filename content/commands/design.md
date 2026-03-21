---
description: Create on-brand design and marketing assets (social media, banners, ads)
argument-hint: [design brief] or leave empty for guided questionnaire
author: "@markoradak"
---

# Design — Marketing Asset Creation

I'll create on-brand design and marketing assets — social media banners, ad creatives, email headers, OG images, and more.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Assets**:
!`ls tailwind.config.* src/app/globals.css src/styles/*.css public/images/*.svg 2>/dev/null | head -15 || echo "No brand files detected"`

**Design Directory**:
!`ls design/ 2>/dev/null && echo == existing campaigns == && ls -d design/*/ 2>/dev/null || echo "No existing design directory"`

**Previous Brand Brief**:
!`cat design/brand-brief.md 2>/dev/null | head -30 || echo "No brand brief yet"`

**Image Generation APIs**:
- GEMINI_API_KEY: !`test -n "$GEMINI_API_KEY" && echo AVAILABLE || echo NOT_SET`
- FAL_KEY: !`test -n "$FAL_KEY" && echo AVAILABLE || echo NOT_SET`

---

## Design Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: asset type, platform(s), goal, style direction, messaging, and count. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the design agent.

### If the brief is empty or vague:

Conduct a focused discovery questionnaire. Ask questions **one at a time**, adapting based on previous answers. Don't dump all questions at once — this should feel like a conversation.

#### First, determine the repo context:

Check the "Existing Brand Assets" and "Previous Brand Brief" sections above. If brand files were detected (CSS, Tailwind config, SVGs, design tokens, or an existing `design/brand-brief.md`), this is a **brand-rich repo** — the codebase contains enough to derive brand identity, visual style, and messaging automatically.

#### Always ask (every context):

**Q1: What are we creating?**
- Social media banners (Instagram, Twitter/X, LinkedIn, etc.)
- Ad creatives (display, retargeting)
- Email headers / newsletter graphics
- Open Graph / social preview images
- App store screenshots
- Presentation slides / pitch deck graphics
- Product Hunt launch assets
- Custom (describe)

**Q2: For which platform(s)?**
Offer platform-specific dimensions — these will be auto-applied:
| Platform | Format | Dimensions |
|----------|--------|------------|
| Instagram Post | Square | 1080×1080 |
| Instagram Story | Vertical | 1080×1920 |
| Twitter/X Post | Landscape | 1200×675 |
| Twitter/X Header | Wide | 1500×500 |
| LinkedIn Post | Landscape | 1200×627 |
| LinkedIn Cover | Wide | 1584×396 |
| Facebook Post | Landscape | 1200×630 |
| YouTube Thumbnail | Landscape | 1280×720 |
| Product Hunt | Landscape | 1270×760 |
| Open Graph | Landscape | 1200×630 |

**Q3: What's the campaign goal?**
- Product launch / announcement
- Feature spotlight
- Brand awareness
- Event promotion
- Testimonial / social proof
- Tutorial / how-to
- Hiring / team culture

**Q4: How many designs?** (default: 6)

#### Only ask in bare repos (no brand files detected):

If no CSS, Tailwind config, design tokens, or brand assets were found, the agent has nothing to analyze — so you need to ask:

**Q5: Where should brand identity come from?**
- **I'll describe it** — you'll provide colors, fonts, tone
- **Start from scratch** — design freely, establish a new visual identity

**Q6: What visual style?**
- Minimal / editorial (whitespace, typography-driven, structural grids)
- Bold / high-contrast (oversized type, strong colors, dramatic)
- Dark / premium (dark backgrounds, glow effects, sleek)
- Playful / colorful (gradients, rounded shapes, vibrant)
- Technical / developer (terminal mockups, monospace, code aesthetics)
- Photo-centric (imagery-driven, lifestyle)

**Q7: What's the primary headline or message?**
(Free text — the core copy direction)

#### In brand-rich repos, skip Q5-Q7:

The agent will automatically analyze the codebase for colors, typography, design patterns, logos, and product copy. Brand identity, visual style, and messaging will be derived from the existing design system and content. The user can still override any of these when confirming the brief.

After gathering answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

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
