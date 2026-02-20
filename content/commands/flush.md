---
description: Flush all task artifacts from tasks/
argument-hint:
author: "@markoradak"
---

# Flush Task Artifacts

I'll flush all task artifacts from `tasks/`.

## Current Contents

!`ls -lhR tasks/ 2>/dev/null || echo "Tasks directory is empty or doesn't exist"`

---

## Confirmation Required

Before deleting, list all files in `tasks/` to the user and ask for explicit confirmation.

If the user confirms, delete all files using Bash: `rm -rf tasks/*`

Then verify the directory is empty using Bash: `ls -lhR tasks/ 2>/dev/null || echo "Tasks directory is now empty"`

**Do NOT delete anything without user confirmation.**
