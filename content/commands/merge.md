---
description: Detect parent branch and merge the current branch into it
author: "@markoradak"
---

# Merge into Parent Branch

I'll detect which branch the current branch was created from, then merge into it.

> **When to use**: You're done working on a feature branch and want to merge it back into the parent branch. This detects the parent automatically so you don't have to remember or type it.

## Current State

**Working Directory**: !`pwd`

**Current Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short`

**Uncommitted Changes**:
!`git diff --stat`

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

**Fallback** — if the reflog entry is missing (e.g. branch was fetched, not created locally):
- Compare merge-base distances to `main` and `master`:
  ```
  git merge-base --is-ancestor main HEAD && echo main
  git merge-base --is-ancestor master HEAD && echo master
  ```
- If neither works, ask the user to specify the parent branch manually.

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
