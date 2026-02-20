---
description: Flush all task artifacts from {{TASKS_DIR}}/
author: "@markoradak"
---

# Flush Task Artifacts

I'll flush all task artifacts from `{{TASKS_DIR}}/`.

## Current Contents

!`ls -lhR {{TASKS_DIR}}/ 2>/dev/null || echo "Tasks directory is empty or doesn't exist"`

---

## Confirmation Required

Before deleting, list all files in `{{TASKS_DIR}}/` to the user and ask for explicit confirmation.

If the user confirms, delete all files using Bash: `rm -rf {{TASKS_DIR}}/*`

Then verify the directory is empty using Bash: `ls -lhR {{TASKS_DIR}}/ 2>/dev/null || echo "Tasks directory is now empty"`

**Do NOT delete anything without user confirmation.**
