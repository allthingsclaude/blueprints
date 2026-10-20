---
description: Create a release — version bump, changelog, tag, and publish
argument-hint: optional: major | minor | patch | version number | --dry-run
author: "@markoradak"
disable-model-invocation: true
---

# Release

I'll orchestrate a complete release for your project — detecting existing release scripts and tooling first.

> **When to use**: You're ready to cut a release. This handles version bumping, changelog updates, git tagging, and optionally GitHub Releases or publishing. Use `/changelog` if you only want to generate a changelog without releasing. Use `/commit` for a simple commit without release semantics.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean (or not a git repository)"`

**Current Version**:
!`grep '"version"' package.json 2>/dev/null || grep '^version' Cargo.toml 2>/dev/null || grep '^version' pyproject.toml 2>/dev/null || echo "Could not detect version"`

**Latest Tags**:
!`git tag --sort=-version:refname 2>/dev/null | head -5 | grep . || echo "No tags found"`

**Last Tag**: !`git describe --tags --abbrev=0 2>/dev/null || echo "(no tags)"`

**Recent Commits** (the ones since the last tag are what this release ships; with no tag, all of them):
!`git log --oneline --decorate -100 2>/dev/null || echo "No git history"`

**Release Scripts Detected**:
!`grep -E '"[^"]*(release|version|bump|publish)[^"]*"[[:space:]]*:' package.json 2>/dev/null | head -20 | grep . || echo "None in package.json"`
!`ls .release-it.* .changeset/ .versionrc* lerna.json .releaserc* release.config.* 2>/dev/null || echo "No release tool configs found"`
!`ls scripts/release* scripts/publish* scripts/version* Makefile 2>/dev/null || echo "No release scripts found"`

---

## Release Scope

$ARGUMENTS

---

## Launching Release Agent

Releases are partly irreversible (pushed tags, published versions), so the release agent works in **two passes** and never pushes, tags, or publishes without your explicit approval:

**Pass 1 — Plan** (always first; the only pass for `--dry-run`):
1. **Detect existing release infrastructure** — scripts in package.json, release-it, changesets, semantic-release, standard-version, Makefile targets, scripts/ directory, CI workflows
2. **Determine the version** from conventional commits (or use the specified version)
3. **Preview** the changelog and run only dry-run / read-only commands
4. **Return a numbered list of steps**, marking which ones write files, commit, tag, push, or publish

**Pass 2 — Execute approved steps**: only the steps you approve, nothing else.

**Workflows**:
- No argument → Auto-detect version bump from commits (major/minor/patch)
- `major` / `minor` / `patch` → Explicit bump type
- `1.2.3` → Explicit version number
- `--dry-run` → Pass 1 only: show what would happen without making changes

### How to run it

1. Use the `Agent` tool to launch the release agent (subagent_type="release") with the scope and any additional context. This is pass 1.
2. When it returns, show the user the plan and the numbered steps. Unless the scope was `--dry-run`, ask with `AskUserQuestion` which steps to run (multi-select). Call out any step that pushes, tags, publishes, or runs a script that does so.
3. If the user approves any steps, launch the release agent again with the same scope plus the plan it returned and an explicit line: `Approved steps: 1, 2, 4` (list the step names too). Steps that aren't listed don't run.
4. Report the result. Remaining steps (e.g. push or publish) can be approved later the same way.
