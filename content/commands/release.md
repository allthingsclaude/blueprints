---
description: Create a release — version bump, changelog, tag, and publish
argument-hint: [optional: major | minor | patch | version number | --dry-run]
author: "@markoradak"
---

# Release

I'll orchestrate a complete release for your project — detecting existing release scripts and tooling first.

> **When to use**: You're ready to cut a release. This handles version bumping, changelog updates, git tagging, and optionally GitHub Releases or publishing. Use `/changelog` if you only want to generate a changelog without releasing. Use `/commit` for a simple commit without release semantics.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short`

**Current Version**:
!`cat package.json 2>/dev/null | grep '"version"' | head -1 || cat Cargo.toml 2>/dev/null | grep '^version' | head -1 || cat pyproject.toml 2>/dev/null | grep '^version' | head -1 || echo "Could not detect version"`

**Latest Tags**:
!`git tag --sort=-version:refname 2>/dev/null | head -5 || echo "No tags found"`

**Commits Since Last Tag**:
!`git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline 2>/dev/null | head -15 || git log --oneline -10 2>/dev/null`

**Release Scripts Detected**:
!`cat package.json 2>/dev/null | grep -E '"(release|version|bump|publish|prepublish|postpublish|preversion|postversion|prepublishOnly)"' || echo "None in package.json"`
!`ls .release-it.* .changeset/ .versionrc* lerna.json .releaserc* release.config.* 2>/dev/null || echo "No release tool configs found"`
!`ls scripts/release* scripts/publish* scripts/version* Makefile 2>/dev/null || echo "No release scripts found"`

---

## Release Scope

$ARGUMENTS

---

## Launching Release Agent

The release agent will:
1. **Detect existing release infrastructure** — scripts in package.json, release-it, changesets, semantic-release, standard-version, Makefile targets, scripts/ directory, CI workflows
2. **If existing tooling found** — use it, guiding through any interactive steps
3. **If no existing tooling** — orchestrate the release manually:
   - Determine version bump from conventional commits (or use the specified version)
   - Update CHANGELOG.md
   - Bump version in manifest files
   - Create git commit and tag
   - Optionally create a GitHub Release
4. **Confirm every destructive step** before executing

**Workflows**:
- No argument → Auto-detect version bump from commits (major/minor/patch)
- `major` / `minor` / `patch` → Explicit bump type
- `1.2.3` → Explicit version number
- `--dry-run` → Show what would happen without making changes

Use the Task tool to launch the release agent (subagent_type="release") with the scope and any additional context.
