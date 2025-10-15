# 🐛 Debug Cache Not Showing

## Quick Checks

### **1. Check Firebase Directly**

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Open `questions` collection
4. Look for documents with:
   - `repoUrl == "https://github.com/facebook/react"` (or whatever repo you used)
   - `upvotes > 0`

**If NO documents:** Questions aren't being saved on upvote

**If documents exist but `upvotes == 0`:** Questions saved but upvote not incrementing

---

### **2. Check Browser Console Logs**

When you **upvote a question**, you should see:

```
🚨 [QuizInterface] handleQuestionRating called with: {questionId: "q-123", rating: "up"}
🚨 [QuizInterface] Checking conditions: {isUpvote: true, hasRepositoryInfo: true, ...}
🔍 [QuizInterface] Upvoting question: {id: "q-123", type: "true-false", ...}
🔍 [QuizInterface] Repository URL: https://github.com/facebook/react
🚨 [QuizInterface] About to call addQuestionToBank with complete data...
🔍 [addQuestionToBank] Starting with question: {...}
🔍 [addQuestionToBank] Repository URL: https://github.com/facebook/react
🔍 [addQuestionToBank] Normalized question: {...}
🔍 [addQuestionToBank] Document to save: {...}
✅ Question q-123 saved to questions collection with complete data
✅ Question added to https://github.com/facebook/react question bank!
```

**If you DON'T see these logs:**
- Check if `quizSession.repositoryInfo` exists
- Check console for errors

---

### **3. Check Cache Query**

When you **reload the page and paste URL**, you should see:

```
✅ Branches loaded: ["main", "dev", ...]
🎯 Using default branch: main
📦 Cache status: 5 questions available for https://github.com/facebook/react
```

**If you see `0 questions available`:**
- Questions didn't save properly
- OR repoUrl mismatch (check exact URL)

---

### **4. Common Issues**

#### **Issue A: `repositoryInfo` Missing**
**Symptom:** Console shows `❌ [QuizInterface] Not saving to question bank: no repository info`

**Fix:** Already fixed in `page.tsx` - but verify `quizSession.repositoryInfo` exists

#### **Issue B: Validation Failing**
**Symptom:** Console shows `❌ [addQuestionToBank] Validation failed`

**Cause:** Question missing required fields

**Check:** Look at the validation error details

#### **Issue C: Firebase Permissions**
**Symptom:** Console shows Firebase permission denied error

**Fix:** Check Firebase security rules allow writes

#### **Issue D: URL Mismatch**
**Symptom:** Questions saved but cache query doesn't find them

**Example:**
- Saved as: `https://github.com/facebook/react/`
- Querying: `https://github.com/facebook/react`
- Trailing slash mismatch!

**Check:** Firebase documents for exact `repoUrl` value

---

## 🔧 Manual Debug Script

Open browser console and run this:

```javascript
// 1. Check what's in your quiz session
console.log('Quiz session:', window.__quizSession);

// 2. Manually query Firebase (if getCachedQuestions is exported)
const { getCachedQuestions } = await import('/src/lib/quiz-history');
const cached = await getCachedQuestions('https://github.com/facebook/react', 50);
console.log('Cached questions:', cached);

// 3. Check Firebase directly
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '/src/lib/firebase';

const q = query(
  collection(db, 'questions'),
  where('repoUrl', '==', 'https://github.com/facebook/react')
);
const snap = await getDocs(q);
console.log('All questions for repo:', snap.docs.map(d => d.data()));
```

---

## 📊 What to Send Me

Please copy and paste:

1. **Console logs when upvoting:**
   - Everything from clicking thumbs up to completion

2. **Console logs when loading repo:**
   - Everything after pasting GitHub URL

3. **Firebase screenshot:**
   - Show the `questions` collection
   - Filter by your repo URL
   - Show me what documents exist

This will help me pinpoint the exact issue!

