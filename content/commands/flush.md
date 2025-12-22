---
description: Flush all temporary files in .claude/temp
argument-hint:
author: "@markoradak"
---

# Flush Temporary Files

I'll flush all temporary files from `.claude/temp/`.

## Current Contents

!`ls -lh .claude/temp/ 2>/dev/null || echo "Temp directory is empty or doesn't exist"`

---

## Flushing

Now I'll remove all files from `.claude/temp/`:

!`rm -rf .claude/temp/* 2>/dev/null && echo "✅ Flushed .claude/temp/" || echo "✅ Nothing to flush"`

## Verification

!`ls -lh .claude/temp/ 2>/dev/null || echo "Temp directory is now empty"`

---

**Done!** All temporary handoffs, plans, and other temp files have been flushed.
