---
description: Flush all plan artifacts from plans/
argument-hint:
author: "@markoradak"
---

# Flush Plan Artifacts

I'll flush all plan artifacts from `plans/`.

## Current Contents

!`ls -lh plans/ 2>/dev/null || echo "Plans directory is empty or doesn't exist"`

---

## Flushing

Now I'll remove all files from `plans/`:

!`rm -rf plans/* 2>/dev/null && echo "✅ Flushed plans/" || echo "✅ Nothing to flush"`

## Verification

!`ls -lh plans/ 2>/dev/null || echo "Plans directory is now empty"`

---

**Done!** All handoffs, plans, and other plan artifacts have been flushed.
