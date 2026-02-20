---
description: Generate a changelog from git history
argument-hint: [optional: version tag, date range, or "unreleased"]
author: "@markoradak"
---

# Generate Changelog

I'll analyze your git history and generate a well-structured changelog.

> **When to use**: You're preparing a release and need a changelog, or want to document what changed between versions. Use `/finalize` to commit and close a session, or `/docs` for general documentation.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Latest Tags**:
!`git tag --sort=-version:refname 2>/dev/null | head -5 || echo "No tags found"`

**Recent Commits**:
!`git log --oneline -10 2>/dev/null`

---

## Changelog Scope

$ARGUMENTS

---

## Launching Changelog Agent

The changelog agent will:
- Analyze git log between the specified range (or since last tag)
- Categorize commits by type (features, fixes, breaking changes, etc.)
- Group related changes and write clear descriptions
- Highlight breaking changes prominently
- Generate a changelog following Keep a Changelog format
- Append to or create CHANGELOG.md

**Workflows**:
- No argument → Changes since the last tag (unreleased)
- `v1.2.0` → Changes since that tag
- `v1.1.0..v1.2.0` → Changes between two tags
- `unreleased` → Same as no argument
- `2024-01-01..` → Changes since a date

Use the Task tool to launch the changelog agent (subagent_type="changelog") with the scope and any additional context.
