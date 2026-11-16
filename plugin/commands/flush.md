---
description: Flush all task artifacts from tasks/
author: "@markoradak"
disable-model-invocation: true
---

> Lines marked "run `…`" are context to gather first: run those commands with the Bash tool before following the steps below, and use their output.

# Flush Task Artifacts

I'll flush all task artifacts from `tasks/`.

## Current Contents

run `ls -lhR -- "tasks/" 2>/dev/null || echo "Tasks directory is empty or doesn't exist"`

---

## Confirmation Required

Before deleting, list all files in `tasks/` to the user and ask for explicit confirmation.

If the user confirms, delete all files using `Bash`: `rm -rf -- "tasks"/*`

Then verify the directory is empty using `Bash`: `ls -lhR -- "tasks/" 2>/dev/null || echo "Tasks directory is now empty"`

**Do NOT delete anything without user confirmation.**
