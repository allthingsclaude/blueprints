---
description: Run tests with intelligent analysis and fix suggestions
argument-hint: [optional: file pattern, test name, or "generate" for new tests]
author: "@markoradak"
---

# Test Assistant

I'll help you run tests, analyze failures, and generate missing test coverage.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current`

**Test Configuration**:
!`ls -la vitest.config.* jest.config.* 2>/dev/null || echo "No test config found"`

**Test Files**:
!`find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | head -20 | wc -l` test files found

---

## Focus Area

$ARGUMENTS

---

## Test Workflow

Based on the arguments, determine the appropriate action:

### If no arguments or "run":
1. Run the full test suite: `pnpm test` or `pnpm test:run`
2. Analyze any failures
3. Provide fix suggestions

### If file pattern provided (e.g., "auth", "user.test.ts"):
1. Run targeted tests: `pnpm test [pattern]`
2. Show detailed output for failures
3. Suggest fixes

### If "generate" or "coverage":
1. Identify files without test coverage
2. Analyze the code structure
3. Generate test file templates with meaningful test cases

### If "watch":
1. Start test watcher: `pnpm test:watch` or `pnpm test --watch`
2. Provide guidance on TDD workflow

---

## Test Analysis Framework

When tests fail, analyze systematically:

### 1. Categorize Failures

**Assertion Failures**:
- Expected vs actual value mismatch
- Missing or incorrect mock data
- Race conditions or timing issues

**Runtime Errors**:
- Import/module resolution
- Missing dependencies or mocks
- Type errors at runtime

**Environment Issues**:
- Missing env variables
- Database connection failures
- External service dependencies

### 2. Root Cause Analysis

For each failure:
- Read the test file and understand intent
- Read the implementation being tested
- Identify the gap between expected and actual behavior
- Check if it's a test bug or implementation bug

### 3. Fix Suggestions

Provide specific, actionable fixes:
```markdown
### `path/to/file.test.ts:42` - Test Name

**Error**: [Error message]

**Root Cause**: [Analysis]

**Fix Option 1** (Update test):
```typescript
// Change this...
// To this...
```

**Fix Option 2** (Update implementation):
```typescript
// The implementation should...
```

**Recommendation**: [Which fix is appropriate and why]
```

---

## Test Generation Guidelines

When generating tests:

### Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('[Component/Function Name]', () => {
  beforeEach(() => {
    // Reset mocks and state
  })

  describe('[method or behavior]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      // Act
      // Assert
    })

    it('should handle [edge case]', () => {
      // Test edge cases
    })

    it('should throw when [error condition]', () => {
      // Test error handling
    })
  })
})
```

### Coverage Priorities
1. **Happy path**: Normal expected usage
2. **Edge cases**: Empty inputs, boundaries, nulls
3. **Error cases**: Invalid inputs, network failures
4. **Integration points**: API calls, database operations

### Mocking Strategy
- Mock external dependencies (APIs, databases)
- Use real implementations for pure functions
- Mock time-sensitive operations (dates, timers)
- Use `vi.spyOn` for partial mocks

---

## Output Format

### After Running Tests

```markdown
# Test Results

**Suite**: [test suite name or pattern]
**Status**: [PASS/FAIL]
**Duration**: [time]

## Summary
- Total: [X] tests
- Passed: [Y]
- Failed: [Z]
- Skipped: [N]

## Failures (if any)

### 1. `path/to/test.ts:42` - [Test Name]

**Error**:
```
[Error output]
```

**Analysis**: [Root cause explanation]

**Suggested Fix**:
```typescript
[Code fix]
```

---

## Recommendations

- [Action item 1]
- [Action item 2]

## Next Steps

1. Fix failing tests (if any)
2. Run `pnpm test` to verify fixes
3. Consider adding tests for [uncovered area]
```

---

## Special Considerations

### Async Testing
- Use `async/await` properly
- Handle promise rejections
- Set appropriate timeouts

### Component Testing (React)
- Use `@testing-library/react`
- Test user behavior, not implementation
- Avoid testing internal state

### API/tRPC Testing
- Mock Prisma client
- Test input validation
- Verify error responses

### Database Testing
- Use transactions for isolation
- Clean up test data
- Consider test fixtures

---

Execute the appropriate test workflow based on the arguments provided. Use Bash to run tests, Read to analyze files, and provide comprehensive analysis of results.
