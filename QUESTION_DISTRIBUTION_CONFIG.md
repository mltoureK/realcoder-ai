# Question Distribution Configuration

This file explains how to customize the question type distribution for quiz generation.

## Current Configuration (15 API Calls per Quiz)

**Distribution:**
- 5 Function Variant (FV) - 33%
- 5 Select All (SA) - 33%
- 2 Order Sequence (OS) - 13%
- 2 True/False (TF) - 13%
- 1 Multiple Choice (MCQ) - 7%

**Total: 15 API calls per quiz**

---

## How to Change Question Distribution

### Location
File: `src/lib/question-plugins/question-distribution-config.ts`

### Instructions

1. **Modify the counts array** - Each number represents how many questions of that type to generate:
```typescript
export const QUESTION_DISTRIBUTION = [
  { type: 'function-variant', count: 5 },
  { type: 'select-all', count: 5 },
  { type: 'order-sequence', count: 2 },
  { type: 'true-false', count: 2 },
  { type: 'multiple-choice', count: 1 },
];
```

2. **Change individual counts** - Want more Function Variants?
```typescript
{ type: 'function-variant', count: 8 },  // Changed from 5 to 8
```

3. **Add new question types** - If you create a new plugin:
```typescript
{ type: 'your-new-type', count: 3 },
```

4. **Remove a question type** - Set count to 0 or remove the entry:
```typescript
{ type: 'multiple-choice', count: 0 },  // Will be excluded
```

---

## Important Rules

### 1. Never Show Order Sequence First
Order Sequence questions can't be the first question shown to users (it's confusing without context).

The system automatically ensures:
- Order Sequence questions are shuffled to positions 2-15
- They never appear at index 0 (first position)

### 2. Total API Calls = Total Count
The sum of all counts equals total API calls:
- 5 + 5 + 2 + 2 + 1 = **15 API calls**

To change total API calls, adjust the counts accordingly.

### 3. Randomization
Questions are generated in the order specified, but then **randomly shuffled** before being presented to users (respecting Rule #1).

---

## Cost Considerations

**OpenAI API costs vary by question type:**
- Function Variant: Medium cost (analyzes code deeply)
- Select All: Medium-High cost (generates multiple correct options)
- Order Sequence: Medium cost (orders code steps)
- True/False: Low cost (simple statement evaluation)
- Multiple Choice: Low cost (single correct answer + distractors)

**Current cost per 15-question quiz: ~$0.05-0.15** (estimated)

---

## Examples

### More Budget-Friendly (Cheaper)
```typescript
export const QUESTION_DISTRIBUTION = [
  { type: 'true-false', count: 6 },        // Cheap
  { type: 'multiple-choice', count: 5 },   // Cheap
  { type: 'function-variant', count: 3 },  // Medium
  { type: 'order-sequence', count: 1 },    // Medium
];
// Total: 15 calls, lower cost
```

### More Advanced (Higher Quality)
```typescript
export const QUESTION_DISTRIBUTION = [
  { type: 'function-variant', count: 8 },  // Deep understanding
  { type: 'select-all', count: 5 },        // Complex thinking
  { type: 'order-sequence', count: 2 },    // Logical sequencing
];
// Total: 15 calls, higher cost but better learning
```

### Balanced for Interviews
```typescript
export const QUESTION_DISTRIBUTION = [
  { type: 'function-variant', count: 4 },
  { type: 'order-sequence', count: 4 },
  { type: 'select-all', count: 4 },
  { type: 'multiple-choice', count: 2 },
  { type: 'true-false', count: 1 },
];
// Total: 15 calls
```

---

## Testing Your Changes

After modifying the distribution:

1. **Restart your dev server:**
```bash
npm run dev
```

2. **Generate a test quiz:**
   - Pick any GitHub repository
   - Generate a quiz
   - Check the browser console logs

3. **Verify in console:**
```
🎯 Scheduled: function-variant call 1/5
🎯 Scheduled: function-variant call 2/5
...
📊 Scheduled 15 total calls
```

4. **Check question order:**
   - First question should NEVER be Order Sequence
   - Types should appear randomly mixed

---

## Advanced: Dynamic Distribution

Want different distributions based on repo size or difficulty? 

Edit `src/lib/question-plugins/orchestrator.ts` and modify `getQuestionDistribution()`:

```typescript
function getQuestionDistribution(repoSize: number, difficulty: string) {
  if (repoSize > 100000) {
    // Large repos: focus on architecture
    return [
      { type: 'function-variant', count: 8 },
      { type: 'order-sequence', count: 4 },
      { type: 'select-all', count: 3 },
    ];
  }
  // Default distribution for smaller repos
  return QUESTION_DISTRIBUTION;
}
```

---

## Questions?

If you need help customizing the distribution, search for `QUESTION_DISTRIBUTION` in the codebase or check `src/lib/question-plugins/orchestrator.ts`.

