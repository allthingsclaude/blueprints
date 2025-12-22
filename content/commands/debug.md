---
description: Investigate and diagnose issues with systematic analysis
argument-hint: [error message, file path, or behavior description]
author: "@markoradak"
---

# Debug Assistant

I'll systematically investigate and diagnose the issue you're experiencing.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Recent Changes** (potential cause):
!`git log --oneline -5`

**Modified Files**:
!`git status --short`

---

## Issue Description

$ARGUMENTS

---

## Debugging Methodology

I'll follow a systematic approach to diagnose this issue:

### Phase 1: Reproduce & Understand

1. **Clarify the Issue**
   - What is the expected behavior?
   - What is the actual behavior?
   - When did this start happening?
   - Is it reproducible consistently?

2. **Gather Context**
   - Check error messages and stack traces
   - Review relevant logs
   - Identify affected files/components

### Phase 2: Isolate the Problem

3. **Narrow Down the Scope**
   - Which layer is the issue in? (UI, API, DB, external service)
   - Is it environment-specific? (dev, prod, test)
   - Does it affect all users/data or specific cases?

4. **Trace Data Flow**
   - Follow the execution path
   - Check input/output at each step
   - Identify where behavior diverges from expected

### Phase 3: Root Cause Analysis

5. **Identify Candidates**
   - Recent code changes (git blame, git log)
   - Configuration changes
   - Dependency updates
   - External factors (API changes, data issues)

6. **Verify Hypothesis**
   - Test each candidate systematically
   - Use console.log/debugger strategically
   - Check edge cases and boundary conditions

### Phase 4: Resolution

7. **Develop Fix**
   - Address root cause, not symptoms
   - Consider side effects
   - Validate fix doesn't break other things

8. **Prevent Recurrence**
   - Add test coverage
   - Improve error handling
   - Update documentation if needed

---

## Diagnostic Commands

### Error Analysis
```bash
# Search for error patterns in logs
grep -r "error" .next/server/ 2>/dev/null | tail -20

# Check recent console output
# (User should provide if available)

# TypeScript errors
pnpm typecheck 2>&1 | head -50
```

### Code Investigation
```bash
# Find where something is defined
grep -rn "functionName" src/

# Check recent changes to a file
git log -p --follow -5 -- path/to/file.ts

# Find all usages of a function/component
grep -rn "ComponentName" src/
```

### Runtime Investigation
```bash
# Check if dev server is running
lsof -i :3000 2>/dev/null || echo "Port 3000 not in use"

# Check environment
env | grep -E "^(DATABASE|NEXT|NODE)" | head -10
```

### Database Investigation
```bash
# Check Prisma schema
cat prisma/schema.prisma | grep -A5 "model"

# Verify database connection
pnpm prisma db pull --print 2>&1 | head -20
```

---

## Common Issue Patterns

### TypeScript Errors
- **"Cannot find module"**: Check imports, paths, tsconfig
- **"Type X is not assignable"**: Verify types match at boundaries
- **"Property does not exist"**: Check object shape, optional chaining

### React/Next.js Issues
- **Hydration mismatch**: Server/client rendering differences
- **"use client" missing**: Server component using client features
- **Stale data**: Cache invalidation, revalidation issues

### API/tRPC Issues
- **401/403**: Authentication/authorization check
- **500**: Server-side error, check logs
- **Network error**: CORS, URL configuration

### Database Issues
- **Connection refused**: Check DATABASE_URL, server running
- **Unique constraint**: Duplicate data, check upsert logic
- **Foreign key violation**: Related record doesn't exist

### Build Issues
- **Module not found**: Check dependencies, imports
- **Out of memory**: Increase Node memory, check for loops
- **Type errors**: Run `pnpm typecheck` for details

---

## Output Format

After investigation, provide a structured diagnosis:

```markdown
# Diagnosis Report

**Issue**: [One-line summary]
**Severity**: [Critical/High/Medium/Low]
**Category**: [TypeScript/Runtime/Database/Network/Configuration]

---

## Summary

[2-3 sentence overview of what's happening and why]

---

## Root Cause

**Location**: `path/to/file.ts:123`

**Problem**: [Detailed explanation of the root cause]

**Evidence**:
- [Finding 1 that supports this diagnosis]
- [Finding 2]
- [Relevant code snippet or error message]

---

## Investigation Trail

1. **Checked**: [What was investigated]
   - **Finding**: [What was found]

2. **Checked**: [Next investigation step]
   - **Finding**: [Result]

3. **Conclusion**: [How findings led to root cause]

---

## Recommended Fix

### Option 1: [Primary fix] (Recommended)

**File**: `path/to/file.ts:123`

**Current Code**:
```typescript
// problematic code
```

**Fixed Code**:
```typescript
// corrected code
```

**Why This Works**: [Explanation]

### Option 2: [Alternative fix]

[If there's a reasonable alternative approach]

---

## Verification Steps

1. [ ] Apply the fix
2. [ ] Run `pnpm typecheck` - should pass
3. [ ] Run `pnpm lint` - should pass
4. [ ] Test the specific scenario that was failing
5. [ ] Run related tests: `pnpm test [pattern]`

---

## Prevention

- [ ] Add test case for this scenario
- [ ] Consider adding validation at [location]
- [ ] Update documentation if behavior was unclear

---

## Related Files

- `path/to/related.ts` - [Why relevant]
- `path/to/another.ts` - [Why relevant]
```

---

## Investigation Strategies by Issue Type

### "It was working before"
1. Check `git log` for recent changes
2. Use `git bisect` to find breaking commit
3. Review dependency updates in package.json

### "It works locally but not in production"
1. Compare environment variables
2. Check build output differences
3. Review deployment logs
4. Verify database state

### "It works sometimes"
1. Look for race conditions
2. Check for timing-dependent logic
3. Review caching behavior
4. Check for data-dependent paths

### "The error message doesn't make sense"
1. Find where the error is thrown
2. Check what condition triggers it
3. Add logging to trace the path
4. Look for error transformation/wrapping

---

Begin systematic investigation based on the issue description provided. Use Read to examine files, Grep to search for patterns, and Bash for diagnostics. Ask clarifying questions if the issue description is insufficient.
