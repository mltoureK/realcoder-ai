# Select All That Apply Questions

## Overview

The select-all-that-apply question type allows users to select multiple correct options from a list of 5-6 choices. This question type uses advanced logic to randomly determine how many options should be correct (from 0 to all of them).

## Features

### Flexible Correct Count Logic
- **0 correct answers**: All options are incorrect (10% chance)
- **1 correct answer**: Rare, essentially becomes MCQ (5% chance)  
- **2-3 correct answers**: Sweet spot for balanced difficulty (50% total chance)
- **4+ correct answers**: More challenging scenarios (25% total chance)
- **All correct**: Everything is correct (10% chance)

### Smart Generation
- Uses coding logic to determine correct count based on total options
- Mentioned in the AI prompt for consistency
- No hardcoded possibilities - fully dynamic

### UI Design
- Checkbox interface with clear visual feedback
- Selection counter showing how many options are selected
- Detailed explanations showing correct/incorrect status for each option
- Supports both 5 and 6 option layouts (randomly chosen)

## Usage

### Environment Variables

To test only select-all questions, set:
```bash
FORCE_SELECT_ALL_ONLY=true
```

To customize the AI model for select-all questions:
```bash
OPENAI_MODEL_SELECT_ALL=gpt-4o-mini  # Default
```

### API Integration

Include `'select-all'` in the `questionTypes` array when calling the `/api/generateQuiz` endpoint:

```javascript
const response = await fetch('/api/generateQuiz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: yourCode,
    questionTypes: ['select-all'], // or mixed with other types
    difficulty: 'medium',
    numQuestions: 10
  })
});
```

### Question Structure

Generated questions follow this format:

```typescript
{
  type: 'select-all',
  question: 'Select all statements that are correct about this function...',
  options: [
    'Statement 1',
    'Statement 2', 
    'Statement 3',
    'Statement 4',
    'Statement 5'
  ],
  correctAnswers: [0, 2, 4], // Array of correct indices
  explanation: 'Detailed explanation...',
  codeContext: 'function code...'
}
```

## Testing

1. Set `FORCE_SELECT_ALL_ONLY=true` in your environment
2. Generate a quiz with any question types (will be overridden)
3. All questions will be select-all type for easy testing

## Design Principles

- **Randomization**: Correct count is determined algorithmically, not hardcoded
- **Balance**: Weighted probabilities ensure good distribution of difficulty
- **Flexibility**: Supports 0 to all correct answers for maximum variety
- **User Experience**: Clear checkbox interface with helpful feedback
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Examples

### Zero Correct (All False)
"Which of these statements about the `validateEmail` function are correct?"
- All 5 options are incorrect statements
- Tests understanding by requiring user to recognize all are wrong

### All Correct (Everything True)  
"Which of these are valid ways the `processData` function handles input?"
- All 6 options are correct approaches
- Tests comprehensive understanding

### Mixed (2-3 Correct)
"Which statements about the `asyncFetch` function are accurate?"
- 2 out of 5 options are correct
- Balanced challenge requiring careful analysis
