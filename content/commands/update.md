---
description: Update CLAUDE.md and STATE.md to reflect current project state
argument-hint: [optional: section to focus on]
author: "@markoradak"
---

# Update CLAUDE.md

I'll scan the project and update CLAUDE.md and STATE.md to reflect the current state — tech stack, structure, patterns, conventions, and plan progress.

## Current Context

**Working Directory**: !`pwd`

**Existing CLAUDE.md**:
!`cat CLAUDE.md 2>/dev/null | head -5 || echo "No CLAUDE.md found"`

**Project Detection**:
!`ls package.json tsconfig.json Cargo.toml go.mod pyproject.toml requirements.txt composer.json Gemfile pom.xml build.gradle mix.exs 2>/dev/null || echo "No recognized project files"`

**Source Files**:
!`find . -maxdepth 3 -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.rb" -o -name "*.ex" -o -name "*.php" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l`

---

## Focus Area

$ARGUMENTS

---

## Launching Update Agent

The update agent will:
- ✅ Scan the project for tech stack, dependencies, and toolchain
- ✅ Map the directory structure and key files
- ✅ Detect patterns, conventions, and coding standards
- ✅ Read existing CLAUDE.md and preserve user-written sections
- ✅ Update or create auto-generated sections with current project state
- ✅ Reconcile STATE.md with actual plan files on disk — sync task completion, add missing plans, remove stale entries
- ✅ Never overwrite manual notes or custom instructions

Use the Task tool to launch the update agent (subagent_type="update") which will scan the project and update CLAUDE.md.
