---
description: Optimize code by eliminating DRY violations without changing behavior
argument-hint: [optional: file/folder path, "functions" | "components" | "hooks" | "types" | "constants"]
author: "@markoradak"
---

# DRY Optimization Assistant

I'll find and eliminate DRY violations across your codebase, consolidating duplicated logic into single sources of truth while guaranteeing identical behavior.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Status**:
!`git status --short`

**Files to Analyze**:
!`find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l` TypeScript files

---

## Focus Area

$ARGUMENTS

---

## Optimization Workflow

### Phase 1: Snapshot Baseline

Before any changes, capture the current state:

1. **Type safety**: Run `pnpm typecheck` — record result
2. **Lint compliance**: Run `pnpm lint` — record result
3. **Tests**: Run `pnpm test:run` — record result
4. **Build**: Run `pnpm build` — record result

All four MUST pass before and after optimization. If any fail before starting, stop and report.

---

### Phase 2: DRY Violation Scan

Based on the focus area, scan for specific duplication:

#### If "functions" or no argument:
- Find functions with identical or near-identical bodies across files
- Detect repeated inline logic (same 3+ line blocks)
- Identify utility patterns repeated instead of shared

#### If "components":
- Find components with overlapping JSX structures
- Detect repeated render patterns that differ only by props
- Identify components that could be parameterized into one

#### If "hooks":
- Find duplicated state + effect patterns across components
- Detect repeated data-fetching logic
- Identify shared lifecycle patterns not yet extracted

#### If "types":
- Find overlapping or identical type/interface definitions
- Detect types that are subsets of each other
- Identify repeated union types or utility type patterns

#### If "constants":
- Find magic values repeated across files
- Detect duplicate configuration objects
- Identify repeated string literals used as identifiers

#### If specific file/folder provided:
- Deep DRY analysis scoped to that area only

---

## Detection Strategies

### Exact Duplicates

```bash
# Find identical function bodies (same name, different files)
grep -rn "export function\|export const" src/ --include="*.ts" --include="*.tsx"

# Find repeated multi-line patterns
grep -rn "pattern" src/ --include="*.ts" --include="*.tsx"
```

### Structural Duplicates

Look for code that follows the same shape but with different values:

- **Same control flow** with different variables
- **Same JSX structure** with different props/text
- **Same validation logic** with different fields
- **Same API call pattern** with different endpoints

### Logical Duplicates

Look for code that achieves the same outcome through different implementations:

- **Same business rule** expressed differently
- **Same computation** performed in multiple places
- **Same transformation** applied to different data shapes

---

## Optimization Strategies

### 1. Extract Shared Function

**When**: 3+ occurrences of identical or parameterizable logic

**How**:
- Identify the common core and the varying parts
- Create a function that takes the varying parts as parameters
- Replace all occurrences with calls to the shared function

**Location Rules**:
- Used within one file → private helper in same file
- Used across files in one feature → `lib/[feature].ts`
- Used across features → `lib/shared.ts` or `lib/utils/[name].ts`

### 2. Extract Shared Component

**When**: 2+ components share significant JSX structure

**How**:
- Identify the common layout and the varying slots/values
- Design a props interface that captures all variations
- Create one component that renders all cases via props

**Guard**: Only extract if the shared component is simpler than the sum of its parts. If the props interface becomes complex to cover all cases, the duplication may be justified.

### 3. Extract Custom Hook

**When**: 2+ components share state + effect logic

**How**:
- Identify the shared state shape and effect triggers
- Extract into `hooks/use[Name].ts`
- Return the same interface each component was using

### 4. Consolidate Types

**When**: Overlapping interfaces or repeated type patterns

**How**:
- Identify the superset type
- Use `Pick`, `Omit`, `Partial`, or `extends` to derive variants
- Place shared types in `types/[domain].ts`

### 5. Extract Constants

**When**: Same literal value appears in 3+ places

**How**:
- Create a named constant in `lib/constants.ts`
- Replace all occurrences with the constant reference
- Use `as const` for literal types

---

## DRY Optimization Report Format

```markdown
# DRY Optimization Report

**Scanned**: [X] files in [path]
**Focus**: [area or "all"]
**Baseline**: typecheck OK | lint OK | tests OK | build OK

---

## Violations Found

| # | Type | Occurrences | Lines Duplicated | Saveable Lines | Priority |
|---|------|-------------|------------------|----------------|----------|
| 1 | [exact/structural/logical] | X | Y | Z | High |
| 2 | ... | ... | ... | ... | Medium |

**Total Duplication**: ~[X] lines across [Y] files
**Estimated Reduction**: ~[Z] lines ([N]%)

---

## High Priority Optimizations

### 1. [Descriptive Name]

**Violation Type**: Exact / Structural / Logical
**Occurrences**: [count]

**Found In**:
- `src/path/A.tsx:23-45` (22 lines)
- `src/path/B.tsx:67-89` (22 lines)
- `src/path/C.ts:12-34` (22 lines)

**Duplicated Code** (from first occurrence):
```typescript
// The repeated code
```

**Optimization**:

**Strategy**: Extract Shared [Function/Component/Hook/Type]
**New Location**: `src/lib/[name].ts`

```typescript
// The consolidated version
```

**Replacement** (at each call site):
```typescript
// How each occurrence changes
```

**Savings**: -[X] lines, [Y] files touched
**Risk**: None — identical behavior guaranteed

---

## Medium Priority Optimizations

### 2. [Descriptive Name]

**Violation Type**: Structural
**Occurrences**: 2

**Options**:
1. **Parameterize now** — extract with config parameter
2. **Wait** — only 2 occurrences, may diverge

**Recommendation**: [Which and why]

---

## Constants to Extract

| Value | Occurrences | Suggested Name | Target File |
|-------|-------------|----------------|-------------|
| `"api/v1"` | 12 | `API_BASE_PATH` | `lib/constants.ts` |
| `30000` | 4 | `DEFAULT_TIMEOUT_MS` | `lib/constants.ts` |

---

## Types to Consolidate

| Type | Locations | Strategy |
|------|-----------|----------|
| `UserData` / `UserInfo` | 3 files | Merge into `types/user.ts` |
| `ApiResponse<T>` | 5 files | Single definition in `types/api.ts` |

---

## Summary

| Priority | Count | Lines Saved |
|----------|-------|-------------|
| High | X | ~Y |
| Medium | X | ~Y |
| Constants | X | ~Y |
| Types | X | ~Y |
| **Total** | **X** | **~Y** |

---

## Execution Plan

### Auto-apply (Safe)

1. [ ] Extract constants to shared location
2. [ ] Consolidate duplicate type definitions
3. [ ] Replace exact-duplicate functions with shared imports

### Requires Review

1. [ ] Structural duplications (confirm parameterization approach)
2. [ ] Component extractions (confirm props interface design)
3. [ ] Hook extractions (confirm return interface)

---

## Post-Optimization Verification

1. [ ] `pnpm typecheck` — MUST match baseline
2. [ ] `pnpm lint` — MUST match baseline
3. [ ] `pnpm test:run` — MUST match baseline
4. [ ] `pnpm build` — MUST match baseline
5. [ ] Manual spot-check of changed behavior paths

Would you like me to apply the high-priority optimizations?
```

---

## Behavior Preservation Rules

These rules are non-negotiable:

1. **No functional changes**: Every optimization MUST produce identical behavior
2. **Baseline before, baseline after**: All checks must pass before starting and after finishing
3. **One optimization at a time**: Apply, verify, then proceed to next
4. **Revert on failure**: If any verification fails after a change, revert immediately
5. **No premature abstraction**: Only extract when the duplication is clear and stable

### DO
- Extract when the duplication is exact or clearly parameterizable
- Keep extracted units focused — one responsibility per function/component/hook
- Name based on what it does, not where it came from
- Preserve original function signatures at call sites
- Run full verification after each change

### DON'T
- Extract 2-occurrence patterns unless they're exact duplicates
- Create god-functions that handle too many variations via params
- Change public API signatures unless all consumers are updated
- Optimize code that's about to be deleted or rewritten
- Bundle unrelated optimizations into a single change
- Sacrifice readability for fewer lines

---

## When to Stop

Not all duplication should be eliminated:

- **2 occurrences with likely divergence**: Leave them — premature abstraction is worse than duplication
- **Similar but semantically different**: Two functions that happen to look alike but serve different purposes should stay separate
- **Test code**: Some duplication in tests improves readability and independence
- **Configuration**: Repeated config values that might change independently should stay separate

---

Use the Task tool to launch the optimize agent (subagent_type="optimize") which will capture the baseline, scan for DRY violations, present a prioritized report, and — with user approval — apply optimizations one at a time with validation after each change.
