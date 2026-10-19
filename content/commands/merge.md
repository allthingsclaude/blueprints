---
description: Detect parent branch and merge the current branch into it
author: "@markoradak"
disable-model-invocation: true
---

# Merge into Parent Branch

I'll detect which branch the current branch was created from, then merge into it.

> **When to use**: You're done working on a feature branch and want to merge it back into the parent branch. This detects the parent automatically so you don't have to remember or type it.

## Current State

**Working Directory**: !`pwd`

**Current Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null || echo "Not a git repository"`

**Uncommitted Changes**:
!`git diff --stat 2>/dev/null || echo "No changes"`

---

## Steps

### 1. Preflight checks

- Verify we are in a git repository
- Verify we are NOT on `main` or `master` (refuse to merge main into itself)
- If there are uncommitted changes, warn the user and stop — they should commit or stash first

### 2. Detect the parent branch

Run:
```
git reflog show --format='%gs' <current-branch> | grep 'branch: Created from' | head -1
```

This extracts the reflog entry recorded when the branch was created (e.g. `branch: Created from main`). Parse the branch name from the end of that line.

**Fallbacks** — use them in order when the parsed value is `HEAD` or empty (`git checkout -b <branch>` without a start point, which is how `/autopilot` creates branches, records `Created from HEAD`), or when the reflog entry is missing (e.g. the branch was fetched, not created locally):
1. The branch you were on when you first checked out this one (the oldest checkout into it):
   ```
   git reflog show --format='%gs' HEAD | grep -E "^checkout: moving from .+ to <current-branch>$" | tail -1 | sed -E 's/^checkout: moving from (.+) to .*/\1/'
   ```
   Ignore the result if it's the current branch itself or a commit hash.
2. The remote's default branch: `git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null` (strip the `origin/` prefix)
3. `main` or `master`, whichever is an ancestor:
   ```
   git merge-base --is-ancestor main HEAD && echo main
   git merge-base --is-ancestor master HEAD && echo master
   ```
4. If none of these works, ask the user to specify the parent branch manually.

### 3. Confirm with the user

Show:
- Current branch name
- Detected parent branch name
- Summary of commits that will be merged: `git log --oneline <parent>..<current>`

**Ask for explicit confirmation before proceeding.** Do NOT merge without user approval.

### 4. Check out parent and pull latest

```bash
git checkout <parent>
git pull
```

### 5. Merge the current branch

```bash
git merge <current-branch>
```

### 6. Report result

- **Success**: Tell the user the merge completed. Show `git log --oneline -5` so they can see the result.
- **Conflict**: Tell the user there are merge conflicts. Show `git diff --name-only --diff-filter=U` to list conflicted files. Do NOT attempt to resolve conflicts automatically — let the user decide how to handle them.

**Do NOT push. Do NOT delete the feature branch.** Only merge locally. The user can push or clean up when ready.
