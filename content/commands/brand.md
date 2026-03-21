---
description: Create or document a comprehensive brand identity system
argument-hint: [brand description] or leave empty for guided questionnaire
author: "@markoradak"
---

# Brand — Identity System

I'll create or document a comprehensive brand identity system — colors, typography, voice, visual patterns, and design tokens — all captured in a structured brand guide.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Assets**:
!`ls tailwind.config.* src/app/globals.css src/styles/*.css styles/*.css public/images/*.svg public/*.svg 2>/dev/null | head -20 || echo "No brand files detected"`

**Design Directory**:
!`ls design/ 2>/dev/null && echo == existing brand docs == && ls design/brand-brief.md design/brand-guide.md design/tokens.css 2>/dev/null || echo "No existing design directory"`

**Previous Brand Brief**:
!`cat design/brand-brief.md 2>/dev/null | head -40 || echo "No brand brief yet"`

**CSS / Tailwind Config**:
!`cat tailwind.config.* 2>/dev/null | head -40 || echo "No Tailwind config"`

**Font Imports**:
!`grep -rE "googleapis.com/css|next/font|@import.*font|@font-face|fontFamily" tailwind.config.* src/app/layout.tsx src/app/globals.css src/styles/*.css 2>/dev/null | head -15 || echo "No font declarations found"`

**Color Definitions**:
!`grep -rE "#[0-9A-Fa-f]{3,8}\b|--color-|rgba?\(|hsl" src/app/globals.css tailwind.config.* styles/*.css src/styles/*.css 2>/dev/null | head -30 || echo "No color definitions found"`

**Logo Files**:
!`ls public/images/logo* public/logo* public/images/icon* public/*.svg src/assets/*.svg 2>/dev/null | head -10 || echo "No logo files found"`

**README / Package Info**:
!`cat README.md 2>/dev/null | head -20 || echo "No README"`
!`cat package.json 2>/dev/null | head -10 || echo "No package.json"`

---

## Brand Description

$ARGUMENTS

---

## Instructions

### First, determine the repo context:

Check the "Existing Brand Assets", "CSS / Tailwind Config", "Color Definitions", and "Font Imports" sections above. Classify the repo into one of two modes:

**Brand-rich repo** — the codebase has meaningful design decisions already made (CSS with defined colors, Tailwind config with custom theme, font declarations, logo files, or an existing `design/brand-brief.md`). There is enough to analyze and document.

**Bare repo** — no CSS with custom values, no Tailwind config, no fonts, no logos, no design tokens. There is nothing meaningful to extract — the brand needs to be created from scratch.

---

### Document mode (brand-rich repo):

If the repo has existing design decisions, skip the questionnaire. Instead, summarize what you found:

```
Based on your codebase, I can see:
- Colors: {list detected colors and their apparent roles}
- Typography: {fonts and usage}
- Visual patterns: {borders, spacing, animation, layout approach}
- Logos: {detected logo files}

I'll analyze your entire codebase and produce a comprehensive brand guide
documenting everything — colors, typography, voice, visual identity, and
design tokens.

Ready to proceed? (yes / or tell me anything I should know first)
```

After confirmation, launch the brand agent.

### Create mode (bare repo):

If there's nothing to analyze, conduct a focused discovery questionnaire. Ask questions **one at a time**, adapting based on previous answers. Don't dump all questions at once — this should feel like a conversation.

**Q1: What is the product/company?**
Give me the name and a one-line description of what it does.

**Q2: Who is the target audience?**
- Developer / technical
- Designer / creative
- Marketer / growth
- General consumer
- Enterprise / B2B
- Other (describe)

**Q3: Brand personality?**
Pick 3-5 attributes that describe how the brand should feel:
- Bold
- Minimal
- Playful
- Premium
- Technical
- Warm
- Rebellious
- Trustworthy
- Innovative
- Approachable

**Q4: Competitive positioning?**
Who are you NOT? What should the brand deliberately avoid being confused with? (This defines differentiation — e.g., "not another generic SaaS", "not corporate/enterprise-feeling", "not cutesy/childish".)

**Q5: Any existing preferences?**
Do you have preferences for any of these? (All optional — skip what you don't have opinions on.)
- Colors (specific hex values, or vibes like "earth tones", "neon", "monochrome")
- Fonts (specific families, or vibes like "geometric sans", "editorial serif", "monospace")
- Inspirations (brands, websites, or aesthetics you admire)

After gathering answers, **summarize the complete brand direction and ask for confirmation** before launching the agent.

### If the user provided a detailed description above:

Parse the description for: product name, audience, personality, positioning, and visual preferences. Infer reasonable defaults for anything missing. Summarize your understanding in 2-3 sentences, then ask for confirmation before launching the agent.

### Launching the Agent

Use the Task tool to launch the brand agent (subagent_type="brand") with the complete brand context including:
- Mode: document or create
- Product/company name and description
- Target audience
- Brand personality attributes
- Competitive positioning / differentiation
- Visual preferences (colors, fonts, inspirations)
- Working directory path
- Detected existing assets (CSS, Tailwind, fonts, logos, brand brief)
- Any specific instructions or constraints from the user
