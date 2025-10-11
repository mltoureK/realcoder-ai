# 🔥 Firebase Schema Update - Flattened Structure

## ✅ What Was Changed

### **Before (Nested Structure)**
```javascript
{
  questionId: "q-123",
  type: "true-false",
  question: "",           // ❌ EMPTY
  data: {                 // ← Everything nested
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "...",
    codeContext: "..."
  }
}
```

### **After (Flattened Structure)**
```javascript
{
  questionId: "q-123",
  type: "true-false",
  snippet: "signInWithEmail",     // ✅ NEW - function name
  question: "The function...",    // ✅ POPULATED
  codeContext: "export async...", // ✅ AT ROOT
  options: ["True", "False"],     // ✅ AT ROOT
  correctAnswer: "True",          // ✅ AT ROOT
  explanation: "...",             // ✅ AT ROOT
  language: "TypeScript",
  difficulty: "medium",
  // ... metrics
}
```

---

## 📊 Complete Schema for Each Question Type

### **1. Multiple-Choice**
```javascript
{
  questionId: "q-123",
  type: "multiple-choice",
  snippet: "createClient",
  question: "What does this function do?",
  codeContext: "function createClient() {...}",
  options: ["A", "B", "C", "D"],
  correctAnswer: "B",
  answer: "2",               // Raw AI answer
  explanation: "...",
  language: "JavaScript",
  difficulty: "medium",
  repoUrl: "https://github.com/owner/repo",
  repoKey: "owner-repo"
}
```

### **2. True-False**
```javascript
{
  questionId: "q-456",
  type: "true-false",
  snippet: "signInWithEmail",
  question: "The function always redirects...",
  codeContext: "export async function signInWithEmail() {...}",
  options: ["True", "False"],
  correctAnswer: "True",
  answer: "TRUE",            // Raw AI answer
  explanation: "...",
  language: "TypeScript",
  difficulty: "medium"
}
```

### **3. Select-All**
```javascript
{
  questionId: "q-789",
  type: "select-all",
  snippet: "fetchUserData",
  question: "Which statements are correct?",
  codeContext: "function fetchUserData() {...}",
  options: ["Statement A", "Statement B", "Statement C"],
  correctAnswers: ["A", "C"],   // Array of correct answers
  explanation: "...",
  language: "JavaScript",
  difficulty: "hard"
}
```

### **4. Function-Variant**
```javascript
{
  questionId: "q-101",
  type: "function-variant",
  snippet: "handleAuth",
  question: "Select the correct function...",
  codeContext: "// Original context",
  variants: [
    {
      id: "A",
      code: "function handleAuth() {...}",
      isCorrect: true,
      explanation: "Correct because..."
    },
    {
      id: "B",
      code: "function handleAuth() {...}",
      isCorrect: false,
      explanation: "Wrong because..."
    }
  ],
  language: "TypeScript",
  difficulty: "medium"
}
```

### **5. Order-Sequence**
```javascript
{
  questionId: "q-202",
  type: "order-sequence",
  snippet: "initializeApp",
  question: "What is the correct execution order?",
  codeContext: "// Context",
  steps: [
    {
      id: "step1",
      code: "const client = createClient();",
      explanation: "Initialize client first"
    },
    {
      id: "step2",
      code: "await client.connect();",
      explanation: "Connect after creation"
    },
    {
      id: "distractor1",
      code: "return client;",
      isDistractor: true,
      explanation: "Can't return before connecting"
    }
  ],
  correctOrder: ["step1", "step2"],
  acceptableOrders: [["step1", "step2"]],
  constraints: [],
  explanation: "...",
  language: "JavaScript",
  difficulty: "medium"
}
```

---

## 🎯 Key Benefits

### **1. Easy Querying**
```typescript
// Direct access to any field
where('snippet', '==', 'signInWithEmail')
where('correctAnswer', '==', 'True')
where('language', '==', 'TypeScript')
```

### **2. Easy Editing**
```typescript
// Update fields directly
await updateDoc(docRef, {
  question: "New question text",
  explanation: "New explanation"
});
```

### **3. No Nested Access**
```typescript
// Before: data.data.options ❌
// After: data.options ✅
console.log(data.question);
console.log(data.options);
console.log(data.explanation);
```

---

## 🔧 What You Need to Do Next

### **1. Test the Schema**
1. Generate a quiz with all 5 question types
2. Upvote one question of each type
3. Check Firebase to verify ALL fields are populated

### **2. Check Firebase**
Look for these fields in the `questions` collection:
- ✅ `snippet` - should have function name
- ✅ `question` - should have the actual question text
- ✅ `codeContext` - should have the code snippet
- ✅ `options` - should have answer options
- ✅ `explanation` - should have the explanation
- ✅ `type` - should have the question type

### **3. Fields That Should NOT Be Empty**
```javascript
{
  questionId: "q-123",      // ✅ Never empty
  type: "true-false",       // ✅ Never empty
  snippet: "functionName",  // ✅ Should be populated
  question: "Text...",      // ✅ Should be populated
  repoUrl: "https://...",   // ✅ Should be populated
  repoKey: "owner-repo"     // ✅ Should be populated
}
```

---

## 🚀 Next Steps for Editing Questions

Once data is correctly saved, you can:

1. **Query questions by quality**
   ```typescript
   where('approvalRate', '>', 70)
   where('type', '==', 'function-variant')
   ```

2. **Edit any field**
   ```typescript
   updateDoc(questionRef, {
     question: "Improved question text",
     explanation: "Better explanation",
     options: ["New A", "New B", "New C"]
   })
   ```

3. **Build admin UI**
   - List all questions from a repo
   - Filter by type, language, rating
   - Edit form for each question type
   - Preview updated question

---

## 📝 Summary of Changes

| File | Changes Made |
|------|--------------|
| `src/lib/question-types.ts` | ✅ Complete rewrite - flattened structure |
| `src/lib/quiz-history.ts` | ✅ Already compatible (no changes needed) |
| `src/app/api/generateQuiz/route.ts` | ✅ Added `snippet`, `answer`, `codeContext` to all 5 question types in `mapToUi` |
| **Total Time** | ~20 minutes |

## 🔧 Specific Changes

### **API Route** (`src/app/api/generateQuiz/route.ts`)
For **ALL 5 question types**, added these fields to the `mapToUi` function:
- ✅ `snippet: q.snippet || ''` - Function name from root level
- ✅ `codeContext: questionData.codeContext || q.codeContext || ''` - Code snippet with fallback
- ✅ `answer: questionData.answer || ''` - Raw AI answer (for MCQ and T/F)
- ✅ `explanation: questionData.explanation || ''` - Explanation for all types

### **Poll System** (`src/lib/quiz-history.ts`)
- ✅ Updated `updateQuestionPoll` to accept optional `questionData` parameter
- ✅ If question data provided, saves FULL question immediately (not just poll metrics)
- ✅ Uses `normalizeQuestionForStorage` to flatten and save all fields

### **Question Poll Component** (`src/components/QuestionPoll.tsx`)
- ✅ Added `questionData` and `repoUrl` props
- ✅ Passes full question data to `updateQuestionPoll`
- ✅ Ensures complete data saved on FIRST answer (not just on upvote)

### **Quiz Interface** (`src/components/QuizInterface.tsx`)
- ✅ Passes `currentQuestion` and `repoUrl` to `QuestionPoll`
- ✅ Ensures repository info flows through to poll updates

This ensures **EVERY question that's answered gets saved with complete data**, not just upvoted ones.

---

## ⚠️ Important Notes

1. **Old questions in Firebase** with nested `data` object will still work (backwards compatible)
2. **New questions** will use the flattened structure
3. **No breaking changes** to existing code
4. **Testing required** to verify all fields populate correctly

---

**Status**: ✅ Code changes complete  
**Next**: 🧪 Test with real quiz generation and upvotes

