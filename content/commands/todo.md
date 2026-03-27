---
description: Scan codebase for TODO/FIXME/HACK markers and present an organized summary
argument-hint: optional: directory, file, or keyword to filter
author: "@markoradak"
---

# TODO Scanner

Scanning the codebase for code markers and annotations.

> **When to use**: You want a quick overview of outstanding TODOs, FIXMEs, and other code markers scattered across the project — without grepping manually.

## Current State

**Working Directory**: !`pwd`

**Git Root**: !`git rev-parse --show-toplevel 2>/dev/null || echo "Not a git repository"`

## Marker Scan

**High Priority (FIXME, HACK, XXX)**:
!`git grep -rn -E '\b(FIXME|HACK|XXX)\b' -- ':!node_modules' ':!.git' 2>/dev/null || echo "No high-priority markers found"`

**Standard (TODO, TASK, TEMP, DEPRECATED)**:
!`git grep -rn -E '\b(TODO|TASK|TEMP|DEPRECATED)\b' -- ':!node_modules' ':!.git' 2>/dev/null || echo "No standard markers found"`

**Informational (NOTE, WARN)**:
!`git grep -rn -E '\b(NOTE|WARN)\b' -- ':!node_modules' ':!.git' 2>/dev/null || echo "No informational markers found"`

## User Filter

$ARGUMENTS

---

## Instructions

Using the marker scan results above, present an organized summary:

### 1. Summary counts

Show a table of marker types and their total counts. Order by priority: FIXME > HACK > XXX > TODO > TASK > TEMP > DEPRECATED > NOTE > WARN.

### 2. Organize by priority

Group results into three tiers:
- **Needs attention** — FIXME, HACK, XXX (things that are broken or fragile)
- **Planned work** — TODO, TASK, TEMP, DEPRECATED (things that need doing)
- **Informational** — NOTE, WARN (context for future readers)

Within each tier, group by file or directory so related items stay together.

### 3. Apply user filter

If `$ARGUMENTS` was provided, filter results to only show markers matching that directory, file, or keyword. Ignore results outside the filter scope.

### 4. Highlight patterns

Call out anything notable:
- Files with an unusually high concentration of markers
- Very old TODOs (if recognizable from surrounding context)
- FIXMEs that reference specific bugs or issues

**This is read-only. Do not modify any files.**
