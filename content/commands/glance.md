---
description: Turn your last reply, or a plan or decision, into a visual HTML page to take in at a glance
argument-hint: "[topic or file] | auto on | auto off"
author: "@markoradak"
---

# Glance

Make one small HTML page that shows what the user would otherwise have to read: your previous reply, or what the arguments name (a plan, a handoff, a decision, a file). The page is saved in this project and never published.

## Current State

<!-- claude-only -->
**Glance hook**: !`grep -sl 'hooks/glance.mjs' ~/.claude/settings.json .claude/settings.json .claude/settings.local.json 2>/dev/null | head -1 | grep . || echo "not installed"`
<!-- /claude-only -->
<!-- codex-only -->
**Glance hook**: !`grep -sl 'hooks/glance.mjs' "${CODEX_HOME:-$HOME/.codex}/hooks.json" .codex/hooks.json 2>/dev/null | head -1 | grep . || echo "not installed"`
<!-- /codex-only -->

**Automatic pages in this project**: !`test -f {{TASKS_DIR}}/pages/.auto-off && echo "off" || echo "on (when the hook is installed)"`

**Now**: !`date +%Y-%m-%d-%H%M`

## Arguments

$ARGUMENTS

## Steps

1. **`auto off` / `auto on`**: switches automatic pages for long replies off or on for this project. Off: create `{{TASKS_DIR}}/pages/.auto-off` (set up the folder as in step 3 first). On: delete it. Say what changed and stop. Pages asked for with `/glance` still open either way.
2. **Subject**: your previous reply in this conversation, or what the arguments name. Take facts from the whole conversation, but put on the page only what the subject covers.
3. **Write the page** following `{{BLUEPRINTS_DIR}}/procedures/glance.md`. Save it as `{{TASKS_DIR}}/pages/{now}-{slug}.html` (**Now** above; the slug is two to five words from the title). If the folder is new, also create `{{TASKS_DIR}}/pages/.gitignore` containing `*`, so pages are never committed.
4. **Open it**: when the glance hook is installed (see above), it opens the page as soon as your reply ends, so don't open it yourself; your reply's path covers the case where it's switched off. Otherwise run `open {file}` on macOS or `xdg-open {file}` on Linux. If that's blocked, give the user that command to run.
5. **Reply in one line** with the file's path. Don't repeat the page's content.

Publish or share the page only if the user asks.
<!-- claude-only -->
If they do and the Artifact tool is available, publish the file with it.
<!-- /claude-only -->
