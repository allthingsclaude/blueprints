---
description: Find and remove dead code, unused imports, and technical debt
argument-hint: [optional: "imports" | "dead-code" | "types" | "todos" | focus area]
author: "@markoradak"
---

# Code Cleanup Assistant

I'll help identify and clean up dead code, unused imports, and technical debt in your codebase.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Files to Analyze**:
!`find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l` TypeScript files

---

## Focus Area

$ARGUMENTS

---

## Cleanup Workflow

Based on the arguments, I'll focus on specific cleanup tasks:

### If "imports" or no argument:
- Find and remove unused imports
- Organize import order
- Remove duplicate imports

### If "dead-code":
- Find unreferenced exports
- Identify unused functions/components
- Detect unreachable code

### If "types":
- Audit `any` usage
- Find implicit any
- Identify redundant type assertions

### If "todos":
- Inventory all TODO/FIXME/HACK comments
- Categorize by priority
- Suggest which to address or remove

### If specific file/folder provided:
- Deep cleanup of that area only

---

## Cleanup Categories

### 1. Unused Imports

**Detection**:
```bash
# ESLint can find these
pnpm eslint src --rule '@typescript-eslint/no-unused-vars: error' --format compact 2>&1 | grep "no-unused-vars"

# Or check specific file
grep -E "^import" path/to/file.ts
```

**Cleanup Strategy**:
- Remove imports not referenced in the file
- Remove type-only imports if types aren't used
- Consolidate multiple imports from same module

### 2. Dead Code

**Detection Patterns**:

**Unreferenced Exports**:
```bash
# Find all exports
grep -rn "export " src/ --include="*.ts" --include="*.tsx"

# Check if each is imported anywhere
grep -rn "import.*{.*ExportName" src/
```

**Unused Functions**:
- Functions defined but never called
- Event handlers attached to removed elements
- Utility functions from old features

**Unreachable Code**:
- Code after return/throw statements
- Conditions that can never be true
- Catch blocks for errors that can't occur

### 3. Type Cleanup

**`any` Audit**:
```bash
# Find explicit any
grep -rn ": any" src/ --include="*.ts" --include="*.tsx"

# Find any in function parameters
grep -rn "(.*any.*)" src/ --include="*.ts"
```

**Categories**:
- **Justified**: External library types, truly dynamic data
- **Lazy**: Should be properly typed
- **Accidental**: Implicit any from missing types

### 4. TODO/FIXME Inventory

**Detection**:
```bash
# Find all TODOs
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx"
```

**Categories**:
- **Stale**: Old TODOs that are no longer relevant
- **Completed**: Work is done but comment remains
- **Valid**: Still needs to be done
- **Won't Do**: Decided against implementing

### 5. Console Statements

**Detection**:
```bash
# Find console.log/warn/error
grep -rn "console\." src/ --include="*.ts" --include="*.tsx"
```

**Categories**:
- **Debug**: Should be removed
- **Intentional**: Error logging, should use proper logger
- **Temporary**: Left from debugging session

### 6. Commented Code

**Detection**:
- Large blocks of commented-out code
- Commented function definitions
- "Old" or "backup" comments

**Policy**:
- If it's in git history, delete it
- If it might be needed, create a branch
- Never commit commented-out code

---

## Cleanup Report Format

```markdown
# Cleanup Report

**Scanned**: [X] files in [path]
**Date**: [timestamp]
**Focus**: [area or "all"]

---

## Summary

| Category | Found | Auto-fixable | Manual Review |
|----------|-------|--------------|---------------|
| Unused Imports | X | X | 0 |
| Dead Code | X | 0 | X |
| `any` Types | X | 0 | X |
| TODOs | X | N/A | X |
| Console Statements | X | X | 0 |
| Commented Code | X | X | 0 |

**Estimated Impact**: -[X] lines of code

---

## Unused Imports

### `src/components/Example.tsx`

**Remove**:
```typescript
// Line 3: unused
import { unusedFunction } from '@/lib/utils'

// Line 5: only 'used' is used, remove 'unused'
import { used, unused } from '@/lib/helpers'
```

**After**:
```typescript
import { used } from '@/lib/helpers'
```

---

## Dead Code

### Unreferenced Exports

| Export | File | Last Modified | Recommendation |
|--------|------|---------------|----------------|
| `oldHelper` | `src/lib/utils.ts:45` | 3 months ago | Remove |
| `deprecatedFn` | `src/lib/api.ts:123` | 6 months ago | Remove |

### Unused Functions

**`src/lib/helpers.ts:78`** - `formatOldDate()`
- Not imported anywhere
- Last modified: [date]
- **Recommendation**: Remove

---

## Type Issues

### `any` Usage

| Location | Context | Recommendation |
|----------|---------|----------------|
| `src/api/route.ts:23` | API response | Type as `ApiResponse` |
| `src/utils/parse.ts:45` | JSON parse | Use `unknown` + validation |
| `src/lib/external.ts:12` | 3rd party | Justified - add comment |

---

## TODO Inventory

### Stale (Remove)

- `src/old.ts:45`: "TODO: refactor this" (file deleted 2 months ago)
- `src/api.ts:23`: "FIXME: temporary" (been there 6 months)

### Valid (Keep/Address)

- `src/auth.ts:89`: "TODO: add rate limiting" - Still needed
- `src/db.ts:34`: "FIXME: optimize query" - Performance issue

### Completed (Remove)

- `src/user.ts:56`: "TODO: add validation" - Validation exists

---

## Console Statements

| Location | Type | Action |
|----------|------|--------|
| `src/debug.ts:12` | `console.log` | Remove (debug) |
| `src/api.ts:45` | `console.error` | Replace with logger |

---

## Commented Code

| Location | Lines | Age | Action |
|----------|-------|-----|--------|
| `src/old.tsx:34-56` | 22 | 4 months | Remove |
| `src/utils.ts:78-89` | 11 | 2 months | Remove |

---

## Recommended Actions

### Auto-fix (Safe)

These can be automatically cleaned up:

1. [ ] Remove unused imports
2. [ ] Remove console.log statements
3. [ ] Remove commented-out code

Run: "Would you like me to auto-fix these?"

### Manual Review Required

These need human decision:

1. [ ] Review dead code exports before removal
2. [ ] Decide on TODO items
3. [ ] Type the `any` usages appropriately

---

## Next Steps

1. Review this report
2. Approve auto-fixes
3. Address manual review items
4. Run `pnpm typecheck && pnpm lint` to verify
5. Commit cleanup: `git commit -m "chore: code cleanup"`
```

---

## Auto-Fix Capabilities

When user approves, I can automatically:

- **Remove unused imports**: Edit files to remove
- **Remove console statements**: Edit to remove (except console.error in catch blocks)
- **Remove commented code**: Edit to remove blocks
- **Organize imports**: Sort and group imports

I will NOT automatically:
- Remove functions (might have dynamic usage)
- Change `any` types (needs proper typing)
- Remove TODOs (needs human decision)
- Remove exports (might be used externally)

---

## Safety Guidelines

1. **Always validate after cleanup**: Run typecheck and lint
2. **Review before committing**: Show git diff
3. **Don't break functionality**: When in doubt, leave it
4. **Track what was removed**: Clear commit message

---

Begin cleanup analysis based on the focus area provided. Use Grep to find patterns, Read to analyze context, and Edit to apply fixes (with user approval).
