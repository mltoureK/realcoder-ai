# 🧪 Firebase Schema Testing Checklist

## ✅ What Was Fixed

### **Files Updated:**
1. ✅ `src/lib/question-types.ts` - Flattened structure, removed `data` object
2. ✅ `src/app/api/generateQuiz/route.ts` - Added `snippet`, `codeContext`, `answer` to ALL 5 types
3. ✅ `src/lib/quiz-history.ts` - Fixed `updateQuestionPoll` to NOT create empty string fields

### **Key Fix:**
**Problem:** `updateQuestionPoll` was creating documents with empty strings (`repoUrl: ''`, `type: ''`, `question: ''`), which blocked the merge update when upvoting.

**Solution:** `updateQuestionPoll` now only creates poll metrics (passedCount, failedCount, etc.) and leaves content fields undefined so they can be added later by `addQuestionToBank`.

---

## 🧪 Testing Instructions

### **Step 1: Generate a New Quiz**
1. Go to your app (http://localhost:3000)
2. Select any GitHub repository
3. Generate a quiz
4. You should get a mix of all 5 question types

---

### **Step 2: Test Each Question Type**

For EACH question type, do the following:

#### **📝 Function-Variant**
- [ ] Answer the question
- [ ] Click "Submit Answer"
- [ ] Click "👍 Thumbs Up"
- [ ] Check Firebase `questions` collection
- [ ] Verify these fields are NOT empty:
  - `snippet` ✅
  - `question` ✅
  - `type` = "function-variant" ✅
  - `variants` (array with code, explanation) ✅
  - `repoUrl` ✅
  - `repoKey` ✅

#### **📝 Multiple-Choice**
- [ ] Answer the question
- [ ] Click "Submit Answer"
- [ ] Click "👍 Thumbs Up"
- [ ] Check Firebase `questions` collection
- [ ] Verify these fields are NOT empty:
  - `snippet` ✅
  - `question` ✅
  - `type` = "multiple-choice" ✅
  - `codeContext` (full function code) ✅
  - `options` (array of strings) ✅
  - `correctAnswer` ✅
  - `answer` (raw AI answer like "2") ✅
  - `explanation` ✅
  - `repoUrl` ✅
  - `repoKey` ✅

#### **📝 True-False**
- [ ] Answer the question
- [ ] Click "Submit Answer"
- [ ] Click "👍 Thumbs Up"
- [ ] Check Firebase `questions` collection
- [ ] Verify these fields are NOT empty:
  - `snippet` ✅
  - `question` ✅
  - `type` = "true-false" ✅
  - `codeContext` (full function code) ✅
  - `options` = ["True", "False"] ✅
  - `correctAnswer` ✅
  - `answer` (raw AI answer like "TRUE") ✅
  - `explanation` ✅
  - `repoUrl` ✅
  - `repoKey` ✅

#### **📝 Select-All**
- [ ] Answer the question
- [ ] Click "Submit Answer"
- [ ] Click "👍 Thumbs Up"
- [ ] Check Firebase `questions` collection
- [ ] Verify these fields are NOT empty:
  - `snippet` ✅
  - `question` ✅
  - `type` = "select-all" ✅
  - `codeContext` (full function code) ✅
  - `options` (array of strings or objects) ✅
  - `correctAnswers` (array like ["A", "C"]) ✅
  - `explanation` ✅
  - `repoUrl` ✅
  - `repoKey` ✅

#### **📝 Order-Sequence**
- [ ] Answer the question
- [ ] Click "Submit Answer"
- [ ] Click "👍 Thumbs Up"
- [ ] Check Firebase `questions` collection
- [ ] Verify these fields are NOT empty:
  - `snippet` ✅
  - `question` ✅
  - `type` = "order-sequence" ✅
  - `codeContext` (optional for this type) 
  - `steps` (array with id, code, explanation) ✅
  - `correctOrder` (array of step IDs) ✅
  - `acceptableOrders` (optional array of arrays) 
  - `explanation` ✅
  - `repoUrl` ✅
  - `repoKey` ✅

---

## ⚠️ Common Issues to Watch For

### **Issue 1: Empty `snippet`**
**Symptom:** `snippet: ""`  
**Cause:** AI didn't return a snippet in the response  
**Solution:** This is OK if rare, but most should have it

### **Issue 2: Empty `codeContext`**
**Symptom:** `codeContext: ""`  
**Cause:** AI didn't include codeContext in the response  
**Solution:** Check if `q.codeContext` exists at root level (fallback)

### **Issue 3: Empty `question` or `type`**
**Symptom:** `question: ""` or `type: ""`  
**Cause:** Data not being passed from `mapToUi` to `normalizeQuestionForStorage`  
**Solution:** This should NOT happen anymore - if it does, contact me immediately!

### **Issue 4: Empty `repoUrl` or `repoKey`**
**Symptom:** `repoUrl: ""` or `repoKey: ""`  
**Cause:** `repositoryInfo` not in quiz session  
**Solution:** Already fixed! This should work now.

---

## 🎯 Success Criteria

After testing all 5 question types, you should have:

✅ **5 questions in Firebase** (one of each type)  
✅ **ALL questions have:**
  - Non-empty `question` text
  - Non-empty `type` field
  - Non-empty `repoUrl` and `repoKey`
  - Question-specific fields (variants, options, steps, etc.)

✅ **You can re-render the question from the data** (all info is there)

---

## 🚀 Next Steps After Testing

Once all 5 question types save correctly:

1. **Build question editor UI** (~2 hours)
   - List all questions from a repo
   - Filter by type, language, rating
   - Edit form for each type
   - Update and save changes

2. **Implement quality control** (~30 min)
   - Auto-remove questions with <30% approval and ≥10 votes
   - Flag questions for review

3. **Launch!** 🎉

---

## 📊 Expected Firebase Document Examples

### **Function-Variant (Should Look Like This):**
```javascript
{
  questionId: "q-123",
  type: "function-variant",
  snippet: "renderSortIcon",                    // ✅
  question: "Which function correctly...",     // ✅
  variants: [                                   // ✅
    {
      id: "A",
      code: "const renderSortIcon = ...",
      isCorrect: true,
      explanation: "Bingo! You've identified..."
    }
  ],
  language: "JavaScript",
  difficulty: "medium",
  repoUrl: "https://github.com/...",           // ✅
  repoKey: "owner-repo"                         // ✅
}
```

### **True-False (Should Look Like This):**
```javascript
{
  questionId: "q-456",
  type: "true-false",
  snippet: "signInWithEmail",                   // ✅
  question: "The function signIn...",          // ✅
  codeContext: "export async function...",     // ✅
  options: ["True", "False"],                   // ✅
  correctAnswer: "True",                        // ✅
  answer: "TRUE",                               // ✅
  explanation: "The statement is true...",     // ✅
  language: "TypeScript",
  difficulty: "medium",
  repoUrl: "https://github.com/...",           // ✅
  repoKey: "owner-repo"                         // ✅
}
```

---

**Status**: ✅ All code changes complete  
**Next**: 🧪 Test each question type and verify Firebase data

