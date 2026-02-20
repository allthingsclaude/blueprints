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

## Confirmation Required

Before deleting, list all files in `plans/` to the user and ask for explicit confirmation.

If the user confirms, delete all files using Bash: `rm -rf plans/*`

Then verify the directory is empty using Bash: `ls -lh plans/ 2>/dev/null || echo "Plans directory is now empty"`

**Do NOT delete anything without user confirmation.**
