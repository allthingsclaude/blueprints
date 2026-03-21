---
description: Write on-brand marketing copy for social media, ads, emails, and landing pages
argument-hint: [copy brief] or leave empty for guided questionnaire
author: "@markoradak"
---

# Copy — On-Brand Marketing Copywriting

I'll write on-brand marketing copy — social captions, ad copy, email subject lines, landing page headlines, product descriptions, and more — all grounded in your product's actual voice.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Brief**:
!`cat design/brand-brief.md 2>/dev/null | head -40 || echo "No brand brief yet"`

**Project Identity**:
!`cat README.md 2>/dev/null | head -30 || echo "No README found"`

**Package Description**:
!`node -e 'var p=require("./package.json");console.log("Name:",p.name||"n/a");console.log("Description:",p.description||"n/a");console.log("Homepage:",p.homepage||"n/a")' 2>/dev/null || echo "No package.json found"`

**Existing Copy & Messaging**:
!`grep -rh "content=\|<title>\|<meta name=\"description" src/app/layout.tsx src/app/page.tsx index.html 2>/dev/null | head -10 || echo "No meta/title tags detected"`

**Landing Page Copy**:
!`grep -rh "<h1\|<h2\|<p class.*hero\|<p class.*subtitle\|<p class.*tagline" src/app/page.tsx src/components/Hero.tsx src/components/Landing.tsx index.html 2>/dev/null | head -15 || echo "No landing page copy detected"`

**Design Directory**:
!`ls design/ 2>/dev/null && echo "---existing campaigns---" && ls -d design/*/ 2>/dev/null || echo "No existing design directory"`

---

## Copy Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: content type, platform(s), campaign goal, tone/voice direction, and variant count. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the copy agent.

### If the brief is empty or vague:

Conduct a focused discovery questionnaire. Ask questions **one at a time**, adapting based on previous answers. Don't dump all questions at once — this should feel like a conversation.

#### First, determine the repo context:

Check the "Existing Brand Brief", "Project Identity", "Existing Copy & Messaging", and "Landing Page Copy" sections above. If meaningful product copy was detected (README with clear positioning, meta descriptions, hero text, taglines, or an existing `design/brand-brief.md` with a "Voice & Tone" section), this is a **brand-rich repo** — the codebase contains enough to derive voice, tone, and messaging automatically.

#### Always ask (every context):

**Q1: What are we writing?**
- Social media captions (Instagram, Twitter/X, LinkedIn, etc.)
- Ad copy (display, retargeting, search)
- Email subject lines + preview text
- Landing page headlines + subheads
- Product descriptions
- Tweet thread
- LinkedIn post / article intro
- Blog intro / hook paragraph
- Custom (describe)

**Q2: For which platform(s)?**
Offer platform-specific character limits — these will be auto-applied:
| Platform | Format | Character Limit |
|----------|--------|-----------------|
| Twitter/X | Post | 280 |
| Twitter/X | Thread (per tweet) | 280 |
| Instagram | Caption | 2,200 |
| Instagram | Bio | 150 |
| LinkedIn | Post | 3,000 |
| LinkedIn | Headline | 120 |
| Facebook | Post | 63,206 |
| Email | Subject line | 60 |
| Email | Preview text | 90 |
| Meta description | SEO | 160 |
| Google Ads | Headline | 30 |
| Google Ads | Description | 90 |
| App Store | Subtitle | 30 |
| App Store | Description | 4,000 |

**Q3: What's the campaign goal?**
- Product launch / announcement
- Feature spotlight
- Brand awareness
- Event promotion
- Testimonial / social proof
- Tutorial / how-to
- Hiring / team culture

**Q4: How many variants?** (default: 5)

#### Only ask in bare repos (no brand copy detected):

If no README positioning, meta descriptions, hero text, or brand brief was found, the agent has nothing to derive voice from — so you need to ask:

**Q5: What tone should the copy have?**
- Professional / authoritative
- Casual / conversational
- Technical / precise
- Witty / clever
- Inspirational / aspirational
- Bold / provocative
- Warm / empathetic

**Q6: Who's the target audience?**
(Free text — describe the reader/customer in 1-2 sentences)

**Q7: What's the key message or value proposition?**
(Free text — the core thing we want the reader to know or feel)

#### In brand-rich repos, skip Q5-Q7:

The agent will automatically analyze the codebase for voice characteristics, tone markers, vocabulary patterns, and messaging hierarchy. Tone, audience, and value proposition will be derived from the existing copy and content. The user can still override any of these when confirming the brief.

After gathering answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

### Launching the Agent

Use the Task tool to launch the copy agent (subagent_type="copy") with the complete brief including:
- Content type and platform(s) with exact character limits
- Campaign goal and key messaging direction
- Voice/tone source (and existing brand-brief.md content if available)
- Number of variants to create
- Working directory path
- Any specific instructions or constraints from the user
