---
description: Create on-brand HTML email templates (newsletters, announcements, transactional)
argument-hint: email brief or leave empty for guided questionnaire
author: "@markoradak"
---

# Email — HTML Email Template Creation

I'll create on-brand, email-client-compatible HTML templates — newsletters, product announcements, welcome sequences, transactional emails, and more. Every template is built with table-based layouts and inline CSS for maximum compatibility across Gmail, Outlook, Apple Mail, and every other email client.

## Current Context

**Working Directory**: !`pwd`

**Existing Brand Assets**:
!`ls tailwind.config.* src/app/globals.css src/styles/*.css public/images/*.svg 2>/dev/null | head -15 || echo "No brand files detected"`

**Design Directory**:
!`ls design/ 2>/dev/null && echo == existing campaigns == && ls -d design/*/ 2>/dev/null || echo "No existing design directory"`

**Previous Brand Brief**:
!`cat design/brand-brief.md 2>/dev/null | head -30 || echo "No brand brief yet"`

**Existing Email Templates**:
!`find . -maxdepth 4 -name "*.html" -path "*email*" -o -name "*.html" -path "*newsletter*" -o -name "*.html" -path "*template*" -path "*mail*" 2>/dev/null | head -10 || echo "No existing email templates found"`

**Mail-Related Dependencies**:
!`grep -E "nodemailer|sendgrid|mailgun|postmark|resend|ses|mailchimp|mjml|react-email" package.json 2>/dev/null | head -10 || echo "No mail dependencies detected"`

---

## Email Brief

$ARGUMENTS

---

## Instructions

### If the user provided a detailed brief above:

Parse the brief for: email type, audience, key message/subject line direction, tone, and variant count. Infer reasonable defaults for anything missing based on the project context. Summarize your understanding in 2-3 sentences, then launch the email agent.

### If the brief is empty or vague:

Conduct a focused discovery questionnaire. Ask questions **one at a time**, adapting based on previous answers. Don't dump all questions at once — this should feel like a conversation.

#### First, determine the repo context:

Check the "Existing Brand Assets" and "Previous Brand Brief" sections above. If brand files were detected (CSS, Tailwind config, SVGs, design tokens, or an existing `design/brand-brief.md`), this is a **brand-rich repo** — the codebase contains enough to derive brand identity, visual style, and messaging automatically.

#### Always ask (every context):

**Q1: What type of email?**
- Newsletter (recurring content digest)
- Product announcement (new feature, major update)
- Feature update (smaller improvements, tips)
- Welcome / onboarding (new user sequence)
- Transactional (receipts, confirmations, password reset)
- Event invitation (webinar, launch event, meetup)
- Re-engagement (win-back, activity nudge)

**Q2: Who's the audience?**
- Users (active product users)
- Prospects (potential customers, leads)
- Developers (technical audience)
- Team (internal communications)
- Investors (updates, reports)

**Q3: What's the key message or subject line direction?**
(Free text — the core topic, announcement, or call to action)

**Q4: How many template variants?** (default: 3)

#### Only ask in bare repos (no brand files detected):

If no CSS, Tailwind config, design tokens, or brand assets were found, the agent has nothing to analyze — so you need to ask:

**Q5: Where should brand identity come from?**
- **I'll describe it** — you'll provide colors, fonts, tone
- **Start from scratch** — design freely, establish a new visual identity

**Q6: What visual style?**
- Clean / modern (whitespace, structured, professional)
- Bold / branded (strong colors, oversized headlines, high-impact)
- Minimal / text-first (content-focused, almost plain-text feel)
- Dark / premium (dark backgrounds, refined, sleek)
- Playful / colorful (gradients, rounded shapes, vibrant)
- Editorial / newspaper (columns, serif fonts, classic)

**Q7: What tone of voice?**
- Professional / formal
- Friendly / conversational
- Technical / developer-oriented
- Playful / casual
- Premium / exclusive

#### In brand-rich repos, skip Q5-Q7:

The agent will automatically analyze the codebase for colors, typography, design patterns, logos, and product copy. Brand identity, visual style, and tone will be derived from the existing design system and content. The user can still override any of these when confirming the brief.

After gathering answers, **summarize the complete brief and ask for confirmation** before launching the agent. Include what will be auto-derived from the codebase so the user can correct anything.

### Launching the Agent

Use the Task tool to launch the email agent (subagent_type="email") with the complete email brief including:
- Email type and purpose
- Target audience
- Key message / subject line direction
- Brand source preference (and existing brand-brief.md content if available)
- Visual style and tone direction
- Number of template variants to create
- Working directory path
- Any existing email templates or mail dependencies detected
- Any specific instructions or constraints from the user
