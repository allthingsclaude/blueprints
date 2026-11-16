---
description: Auto-generate Open Graph images for all pages in your project
argument-hint: specific page or route or leave empty for all pages
author: "@markoradak"
---

# OG — Open Graph Image Generation

I'll generate on-brand Open Graph images for your pages — each a self-contained 1200x630 HTML file in `design/og/` with per-page content, plus a script that screenshots them to PNGs in `public/og/`.

## Current Context

**Working Directory**: !`pwd`

**Framework Detection**:
!`ls next.config.* nuxt.config.* astro.config.* remix.config.* svelte.config.* vite.config.* angular.json 2>/dev/null || echo "No framework config detected"`

**App Router Pages** (Next.js):
!`find src/app -name "page.tsx" -o -name "page.jsx" -o -name "page.ts" -o -name "page.js" 2>/dev/null | head -60 | grep . || echo "No App Router pages"`

**Pages Router** (Next.js/Nuxt):
!`find src/pages pages -maxdepth 4 \( -name "*.tsx" -o -name "*.jsx" -o -name "*.vue" \) 2>/dev/null | head -40 | grep . || echo "No Pages Router files"`

**Astro Pages**:
!`find src/pages -name "*.astro" -o -name "*.md" -o -name "*.mdx" 2>/dev/null | head -60 | grep . || echo "No Astro pages"`

**Static HTML**:
!`find . -maxdepth 3 -name "*.html" ! -path "./node_modules/*" ! -path "./design/*" ! -path "./public/og/*" ! -path "./.next/*" ! -path "./dist/*" 2>/dev/null | head -60 | grep . || echo "No static HTML files"`

**Existing OG Images**:
!`find public/og design/og -maxdepth 1 \( -name "*.png" -o -name "*.html" \) 2>/dev/null | head -40 | grep . || echo "No existing OG images"`

**Brand Assets**:
!`head -30 design/brand-brief.md 2>/dev/null || echo "No brand brief yet"`

**Metadata / SEO**:
!`grep -rn "openGraph\|og:image\|og:title\|og:description\|meta.*property.*og:" src/ pages/ app/ 2>/dev/null | head -40 | grep . || echo "No existing OG meta tags found"`

---

## Target

$ARGUMENTS

---

## Instructions

### If the user specified a page or route above:

Parse the target to identify the specific page file(s). Confirm the framework and the file path, then launch the og agent to generate an OG image for that page only.

### If the target is empty:

Summarize what was detected:

```
Based on your project, I found:
- Framework: {detected framework}
- Pages: {count} routes detected
- Brand: {brand brief exists / will analyze codebase / none detected}
- Existing OG: {existing OG images or none}

I'll scan all routes, extract titles and descriptions, and generate
a branded OG image (1200×630) for each page.

Ready to proceed? (yes / or tell me which pages to skip)
```

After confirmation, launch the og agent.

### Launching the Agent

Use the `Agent` tool to launch the og agent (subagent_type="og") with the complete context including:
- Framework type (Next.js App Router, Pages Router, Astro, static, etc.)
- List of detected page files with paths
- Target scope (specific page or all pages)
- Existing brand brief content (if available)
- Whether existing OG images were found
- Working directory path
- Any specific instructions or constraints from the user
