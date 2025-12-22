---
description: Generate detailed explanations of code, architecture, or features
argument-hint: [file path, component name, feature, or concept to explain]
author: "@markoradak"
---

# Code Explainer

I'll provide a detailed, educational explanation of the code, architecture, or feature you're interested in.

## Current Context

**Working Directory**: !`pwd`

**Project Structure**:
!`ls -la src/ 2>/dev/null | head -15`

---

## What to Explain

$ARGUMENTS

---

## Explanation Framework

Based on what you want to understand, I'll provide explanations at different levels:

### For a **File**:
1. **Purpose**: Why this file exists
2. **Structure**: How it's organized
3. **Key Components**: Main functions/classes/exports
4. **Data Flow**: How data moves through it
5. **Dependencies**: What it imports and why
6. **Usage**: Where and how it's used

### For a **Component/Function**:
1. **Purpose**: What problem it solves
2. **Interface**: Inputs, outputs, props
3. **Implementation**: How it works step-by-step
4. **State Management**: What state it manages
5. **Side Effects**: External interactions
6. **Usage Examples**: How to use it

### For a **Feature**:
1. **Overview**: What the feature does
2. **Architecture**: Components involved
3. **Data Flow**: End-to-end flow
4. **Key Files**: Where the implementation lives
5. **Entry Points**: Where it starts
6. **Integration Points**: How it connects to rest of system

### For an **Architecture Concept**:
1. **Definition**: What the concept means
2. **Why It's Used**: Benefits in this project
3. **Implementation**: How it's applied here
4. **Examples**: Concrete examples from codebase
5. **Trade-offs**: Pros and cons
6. **Related Patterns**: Connected concepts

---

## Explanation Output Format

```markdown
# Understanding: [Topic]

## Quick Summary

[2-3 sentence overview for someone in a hurry]

---

## The Big Picture

### What Is This?

[Plain English explanation of what this is and why it exists]

### Why Does It Matter?

[Why this is important in the context of the project]

### Where Does It Fit?

```
[ASCII diagram showing where this fits in the architecture]

┌─────────────────────────────────────────────┐
│                  Application                 │
├─────────────────────────────────────────────┤
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │   UI    │ → │  State  │ → │   API   │   │
│  └─────────┘   └─────────┘   └─────────┘   │
│       ↑             ↑             ↓         │
│       └─────────────┴─────────────┘         │
│                                             │
│  [THIS COMPONENT] ←── You are here          │
└─────────────────────────────────────────────┘
```

---

## Deep Dive

### How It Works

#### Step 1: [First thing that happens]

```typescript
// Relevant code snippet with annotations
const example = doThing() // <- This does X because Y
```

**What's happening**: [Explanation]

#### Step 2: [Second thing]

```typescript
// Next relevant code
```

**What's happening**: [Explanation]

#### Step 3: [And so on...]

---

### Key Concepts

#### [Concept 1 Name]

**Definition**: [What it means]

**In This Code**: [How it's applied]

**Example**:
```typescript
// Example from the actual codebase
```

#### [Concept 2 Name]

[Same structure...]

---

### Data Flow

```
[Input]
    ↓
┌───────────────┐
│ [Process 1]   │  "Transforms X into Y"
└───────────────┘
    ↓
┌───────────────┐
│ [Process 2]   │  "Validates and enriches"
└───────────────┘
    ↓
┌───────────────┐
│ [Process 3]   │  "Persists to database"
└───────────────┘
    ↓
[Output]
```

---

### File Structure

```
src/
├── feature/
│   ├── components/     # UI components
│   │   ├── Thing.tsx   # [purpose] ← THIS FILE
│   │   └── Other.tsx   # [purpose]
│   ├── hooks/          # Custom hooks
│   │   └── useThing.ts # [purpose]
│   ├── lib/            # Business logic
│   │   └── thing.ts    # [purpose]
│   └── types/          # TypeScript types
│       └── thing.ts    # [purpose]
```

---

## Code Walkthrough

### `path/to/file.ts`

```typescript
// Line 1-10: Imports
import { x } from 'y'  // We need X because...

// Line 12-25: Types
interface Props {      // Defines what this component accepts
  name: string         // The user's display name
  onSubmit: () => void // Called when form is submitted
}

// Line 27-50: Main Component
export function Component({ name, onSubmit }: Props) {
  // Line 28: State setup
  const [value, setValue] = useState('')  // Tracks input value

  // Line 31-35: Effect for side effects
  useEffect(() => {
    // This runs when X changes because we need to Y
  }, [dependency])

  // Line 37-45: Event handler
  const handleClick = () => {
    // Validates input, then calls onSubmit
  }

  // Line 47-60: Render
  return (
    // JSX that displays the UI
  )
}
```

---

## Common Questions

### "Why is it done this way?"

[Explain the reasoning behind key design decisions]

### "What would break if I changed X?"

[Explain dependencies and ripple effects]

### "How do I modify this?"

[Guide for making common changes]

### "Where should I add new feature Y?"

[Point to the right location based on the architecture]

---

## Related Files

| File | Relationship | Purpose |
|------|--------------|---------|
| `path/to/related.ts` | Imports from | Provides utility functions |
| `path/to/parent.tsx` | Uses this | Parent component that renders this |
| `path/to/types.ts` | Types from | Type definitions |

---

## Key Takeaways

1. **[Takeaway 1]**: [One sentence summary]
2. **[Takeaway 2]**: [One sentence summary]
3. **[Takeaway 3]**: [One sentence summary]

---

## Next Steps for Learning

- [ ] Read `related/file.ts` to understand [concept]
- [ ] Try modifying [small thing] to see how it works
- [ ] Look at how [similar feature] is implemented
- [ ] Check the tests in `__tests__/` for usage examples
```

---

## Explanation Depth Levels

### Quick (1-2 minutes to read)
- Purpose and key points only
- Good for: "What is this file?"

### Standard (5-10 minutes to read)
- Full explanation with code walkthrough
- Good for: "How does this work?"

### Deep (15+ minutes to read)
- Architecture, history, design decisions
- Good for: "I need to maintain/extend this"

**Ask**: "Would you like a quick, standard, or deep explanation?"

---

## Visual Explanation Tools

### ASCII Architecture Diagrams
```
┌─────────────────────────────────────┐
│             Frontend                 │
│  ┌─────────┐      ┌─────────┐       │
│  │ React   │ ───→ │ Hooks   │       │
│  └─────────┘      └─────────┘       │
└─────────────────────────────────────┘
         │
         ↓ tRPC / REST
┌─────────────────────────────────────┐
│             Backend                  │
│  ┌─────────┐      ┌─────────┐       │
│  │ Routes  │ ───→ │ Prisma  │       │
│  └─────────┘      └─────────┘       │
└─────────────────────────────────────┘
```

### Data Flow Arrows
```
User Input → Validation → Transform → API Call → Response → UI Update
                ↓
           Error Handling → Error Display
```

### State Transitions
```
[Initial] ──load──→ [Loading] ──success──→ [Ready]
                        │
                        └──error──→ [Error] ──retry──→ [Loading]
```

---

## Explanation Best Practices

1. **Start with WHY** before HOW
2. **Use analogies** for complex concepts
3. **Show real code** from the codebase
4. **Highlight patterns** that repeat
5. **Connect to the big picture**
6. **Anticipate questions**

---

Read the relevant files, analyze the structure, and provide a comprehensive explanation. Use Read to examine code, Grep to find related files, and Glob to understand file organization. Tailor the explanation depth to what seems most useful.
