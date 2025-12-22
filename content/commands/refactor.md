---
description: Safely refactor code with DRY analysis, pattern extraction, and validation
argument-hint: [operation] [target] (e.g., "dry-check", "rename:old:new", "extract:ComponentName")
author: "@markoradak"
---

# Refactor Assistant

I'll help you safely refactor code with a focus on DRY principles, pattern extraction, and thorough validation.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

---

## Refactoring Request

$ARGUMENTS

---

## Refactoring Operations

### `dry-check` or no argument
Analyze codebase for DRY violations and duplication opportunities.

### `rename:oldName:newName`
Safely rename a function, component, variable, or type across the codebase.

### `extract:Name`
Extract repeated code into a reusable function, component, or hook.

### `inline:Name`
Inline a function/component that's only used once or adds unnecessary abstraction.

### `move:source:destination`
Move a function/component to a different file with all imports updated.

### `consolidate:pattern`
Find and consolidate similar implementations into one.

---

## DRY Analysis Framework

### Duplication Categories

**1. Exact Duplication**
- Copy-pasted code blocks
- Identical functions in different files
- Repeated component structures

**2. Structural Duplication**
- Same pattern with different values
- Similar functions with minor variations
- Components that differ only in props

**3. Logical Duplication**
- Same business logic in multiple places
- Repeated validation patterns
- Similar error handling

**4. Data Duplication**
- Repeated constants/magic values
- Similar type definitions
- Duplicate API endpoint definitions

### Detection Strategy

```bash
# Find similar code blocks (requires manual review)
# Look for repeated patterns
grep -rn "pattern" src/ --include="*.ts" --include="*.tsx"

# Find duplicate function names
grep -rn "function functionName\|const functionName" src/

# Find similar component structures
grep -rn "className=\"similar-class\"" src/
```

---

## DRY Check Output Format

```markdown
# DRY Analysis Report

**Scanned**: [X] files
**Duplications Found**: [Y] instances
**Estimated Lines Saveable**: [Z]

---

## High Priority (Extract Immediately)

### 1. [Duplication Name]

**Type**: Exact / Structural / Logical

**Occurrences**:
- `src/components/A.tsx:23-45` (22 lines)
- `src/components/B.tsx:67-89` (22 lines)
- `src/pages/C.tsx:12-34` (22 lines)

**Current Code** (from first occurrence):
```typescript
// Repeated code block
```

**Proposed Extraction**:

**New File**: `src/lib/extracted.ts` or `src/components/Shared.tsx`

```typescript
// Extracted reusable code
export function extractedFunction() {
  // ...
}
```

**Refactored Usage**:
```typescript
import { extractedFunction } from '@/lib/extracted'

// Use it
extractedFunction()
```

**Impact**:
- Lines removed: [X]
- Files affected: [Y]
- Maintainability: Improved (single source of truth)

---

## Medium Priority (Consider Extracting)

### 2. [Duplication Name]

**Type**: Structural

**Occurrences**: 2 places

**Pattern**:
```typescript
// Similar structure, different values
```

**Options**:
1. **Extract with parameters**: Create function with configurable parts
2. **Leave as-is**: If variations are likely to diverge
3. **Create factory**: If generating similar structures

**Recommendation**: [Which option and why]

---

## Low Priority (Monitor)

### 3. [Duplication Name]

**Note**: Only 2 occurrences, may diverge in future

---

## Type/Interface Duplication

| Type | Locations | Recommendation |
|------|-----------|----------------|
| `UserData` | `types/user.ts`, `api/users.ts` | Consolidate to `types/user.ts` |
| `ApiResponse` | 5 different files | Create shared `types/api.ts` |

---

## Constants Duplication

| Value | Occurrences | Recommendation |
|-------|-------------|----------------|
| `"api/v1"` | 12 files | Extract to `lib/constants.ts` |
| `3000` | 4 files | Extract as `DEFAULT_PORT` |

---

## Summary

| Priority | Count | Lines Saveable |
|----------|-------|----------------|
| High | X | ~Y lines |
| Medium | X | ~Y lines |
| Low | X | ~Y lines |

**Total Potential Reduction**: ~[Z] lines ([N]% of codebase)

---

## Recommended Actions

1. [ ] Extract [high priority item 1]
2. [ ] Extract [high priority item 2]
3. [ ] Consolidate types to shared location
4. [ ] Create constants file for repeated values

Would you like me to perform any of these extractions?
```

---

## Rename Operation

### Safety Protocol

1. **Find all references** (not just text matches):
   - Variable/function declarations
   - Import statements
   - Type references
   - String literals (if component name)
   - Test files
   - Documentation/comments

2. **Validate scope**:
   - Is this a local or exported symbol?
   - Are there name conflicts with new name?
   - Will imports need updating?

3. **Execute rename**:
   - Update declaration
   - Update all usages
   - Update imports/exports
   - Update related test files

4. **Verify**:
   - Run typecheck
   - Run lint
   - Run related tests

### Rename Output

```markdown
# Rename: `oldName` -> `newName`

## Scope Analysis

**Symbol Type**: [function/component/type/variable]
**Defined In**: `src/lib/file.ts:23`
**Exported**: [Yes/No]

## References Found

| File | Line | Context |
|------|------|---------|
| `src/lib/file.ts` | 23 | Definition |
| `src/components/A.tsx` | 5 | Import |
| `src/components/A.tsx` | 34 | Usage |
| `src/tests/file.test.ts` | 12 | Test |

**Total**: [X] references in [Y] files

## Changes to Make

### `src/lib/file.ts`
- Line 23: `export function oldName` -> `export function newName`

### `src/components/A.tsx`
- Line 5: `import { oldName }` -> `import { newName }`
- Line 34: `oldName()` -> `newName()`

## Verification Plan

1. [ ] Apply all changes
2. [ ] Run `pnpm typecheck`
3. [ ] Run `pnpm lint`
4. [ ] Run `pnpm test [related]`

Proceed with rename?
```

---

## Extract Operation

### Extraction Checklist

1. **Identify boundaries**:
   - What are the inputs?
   - What are the outputs?
   - What are the side effects?

2. **Choose location**:
   - Same file (private helper)?
   - `lib/` (utility function)?
   - `components/` (React component)?
   - `hooks/` (custom hook)?

3. **Define interface**:
   - Function signature
   - Props interface (for components)
   - Return type

4. **Extract and replace**:
   - Create new function/component
   - Replace original code with call
   - Update imports

5. **Verify**:
   - Types match at call sites
   - Behavior unchanged
   - Tests pass

### Extract Output

```markdown
# Extract: `NewComponentName`

## Source Analysis

**Extracting from**: `src/components/Large.tsx:45-78`
**Reason**: [DRY violation / Reusability / Clarity]

## Extracted Code

**New File**: `src/components/NewComponentName.tsx`

```typescript
interface NewComponentNameProps {
  // Inferred from usage
}

export function NewComponentName({ ... }: NewComponentNameProps) {
  // Extracted code
}
```

## Updated Original

**File**: `src/components/Large.tsx`

```typescript
import { NewComponentName } from './NewComponentName'

// ...
<NewComponentName {...props} />
```

## Other Usages to Update

- `src/components/Other.tsx:34` - Same pattern exists
- `src/pages/Page.tsx:56` - Similar code

Proceed with extraction?
```

---

## Validation Requirements

After ANY refactoring operation:

```bash
# Type check - MUST pass
pnpm typecheck

# Lint - MUST pass
pnpm lint

# Tests - MUST pass
pnpm test:run

# Build - Should pass
pnpm build
```

**If any fail**: Revert changes and investigate.

---

## Refactoring Principles

### DO
- Extract when 3+ occurrences exist
- Keep extracted units focused (single responsibility)
- Name clearly based on purpose
- Maintain backwards compatibility when possible
- Test before and after

### DON'T
- Extract prematurely (wait for patterns to emerge)
- Create abstractions for 1-2 usages
- Mix concerns in extracted units
- Change behavior during refactoring
- Skip validation steps

### DRY Balance
- **Too DRY**: Over-abstracted, hard to understand
- **Too WET**: Maintenance nightmare, inconsistencies
- **Just Right**: Clear abstractions, obvious where to change things

---

Analyze the refactoring request and execute the appropriate operation. Use Grep to find patterns, Read to understand context, Edit to make changes, and Bash to validate. Always show the plan before executing.
