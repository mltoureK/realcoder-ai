# 🚀 Question Caching System

## 🎯 Overview

The caching system serves **community-reviewed questions** to users instantly, eliminating API costs and loading time for popular repositories.

---

## ⚡ How It Works

### **Scenario 1: Repository with ≥50 Cached Questions**

```
User selects: https://github.com/facebook/react
      ↓
Check Firebase for upvoted questions
      ↓
Found: 73 cached questions ✅
      ↓
Show 15 random cached questions (INSTANT!)
      ↓
No API call needed = $0 cost + 0 loading time
```

**UI Shows:** `🟢 Community Reviewed` badge on each question

---

### **Scenario 2: Repository with 4-49 Cached Questions**

```
User selects: https://github.com/new-repo/app
      ↓
Check Firebase for upvoted questions
      ↓
Found: 7 cached questions
      ↓
Use 7 cached + generate 8 new ones = 15 total
      ↓
Show cached FIRST (questions 1-7), then new (questions 8-15)
```

**UI Shows:**
- **Questions 1-7:** `🟢 Community Reviewed` badge (cached)
- **Questions 8-15:** No badge (fresh AI-generated)

**Smart Logic:** Always aims for 15 total questions, using cached + generating the rest

### **Scenario 3: Repository with 1-3 Cached Questions**

```
User selects: https://github.com/new-repo/app
      ↓
Check Firebase for upvoted questions
      ↓
Found: 2 cached questions
      ↓
Use 2 cached + generate 13 new ones
      ↓
Show cached FIRST (questions 1-2), then new (questions 3-15)
```

**UI Shows:**
- **Questions 1-2:** `🟢 Community Reviewed` badge (cached)
- **Questions 3-15:** No badge (fresh AI-generated)

**Note:** Cached questions are shown FIRST, not shuffled with new ones.

---

### **Scenario 4: Repository with 0 Cached Questions**

```
User selects: https://github.com/brand-new/repo
      ↓
Check Firebase for upvoted questions
      ↓
Found: 0 cached questions
      ↓
Generate all 15 questions via OpenAI
      ↓
Standard quiz flow
```

**UI Shows:** No badges (all fresh questions)

---

## 🔧 Implementation Details

### **1. Cache Query** (`src/lib/quiz-history.ts`)

```typescript
export const getCachedQuestions = async (
  repoUrl: string,
  limit: number = 50
): Promise<Question[]> => {
  const q = query(
    collection(db, 'questions'),
    where('repoUrl', '==', repoUrl),
    where('upvotes', '>', 0),      // Only upvoted questions
    where('status', '==', 'active'), // Not removed
    orderBy('upvotes', 'desc'),     // Most upvoted first (NOT by approval)
    limit(limit)
  );
  
  const querySnapshot = await getDocs(q);
  // Convert to Question objects
  return questions;
};
```

**Key Points:**
- ✅ Only retrieves upvoted questions (community approved)
- ✅ Orders by upvote count (most popular first)
- ✅ Does NOT filter by approval rate (per your request)
- ✅ Excludes removed/flagged questions

---

### **2. Cache Logic** (`src/app/page.tsx`, lines 316-372)

```typescript
// Check cache BEFORE generating quiz
const cachedQuestions = await getCachedQuestions(repoUrl, 50);

if (cachedQuestions.length >= 50) {
  // ONLY cached questions
  const shuffled = cachedQuestions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 15).map(q => ({
    ...q,
    isCached: true
  }));
  
  setQuizSession({
    title: 'Community Reviewed Quiz',
    questions: selected,
    isCached: true
  });
  
  return; // Skip API call
  
} else if (cachedQuestions.length > 0 && cachedQuestions.length < 50) {
  // Mix up to 10 cached + generate rest
  const numCached = Math.min(10, cachedQuestions.length);
  const cachedToUse = cachedQuestions.slice(0, numCached).map(q => ({
    ...q,
    isCached: true
  }));
  
  // Store temporarily to merge after API generation
  (window as any).__cachedQuestionsToMerge = cachedToUse;
  
  // Continue to API generation...
}
```

---

### **3. Community Reviewed Badge** (`src/components/QuizInterface.tsx`, lines 1215-1222)

```tsx
{currentQuestion.isCached && (
  <span className="ml-3 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full flex items-center gap-1">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
    Community Reviewed
  </span>
)}
```

---

### **4. Poll Stats Update**

Poll stats update for **ALL questions** (cached and new):
- ✅ When user answers, `updateQuestionPoll` is called
- ✅ Increments pass/fail counts in Firebase
- ✅ Works for both cached and newly generated questions

---

## 📊 Benefits

| Benefit | Impact |
|---------|--------|
| **Zero Loading Time** | Cached questions load instantly |
| **Zero API Cost** | No OpenAI calls for popular repos |
| **Quality Guarantee** | Only upvoted questions shown |
| **Scalability** | More users = better cache = faster for everyone |
| **Cost Savings** | Popular repos cost $0 after initial caching |

---

## 🧪 Testing The Cache

### **Test 1: Fresh Repo (No Cache)**
1. Select a repo you've never tested
2. Generate quiz
3. Should see: "⚡ No cached questions found"
4. All 15 questions generated via API

### **Test 2: Small Cache (1-49 Questions)**
1. Upvote 5 questions from a repo
2. Generate quiz again
3. Should see: "🔄 Using 5 cached + generating 10 new"
4. Mix of cached (with badge) and new questions

### **Test 3: Large Cache (50+ Questions)**
1. Once a repo has 50+ upvoted questions
2. Generate quiz
3. Should see: "✅ Using ONLY cached questions"
4. ALL 15 questions have `🟢 Community Reviewed` badge
5. Quiz loads instantly (no API call)

---

## 📈 Growth Flywheel

```
User 1: Generates quiz → Upvotes 3 questions
   ↓
User 2: Gets 3 cached + 12 new → Upvotes 5 questions
   ↓
User 3: Gets 8 cached + 7 new → Upvotes 4 questions
   ↓
... after 50 upvotes total ...
   ↓
User N: Gets 15 cached (instant!) → Upvotes more
   ↓
Cache grows stronger over time
```

**The more users, the better it gets!**

---

## 🔍 Firebase Query Performance

### **Indexes Required:**
Firebase will auto-create composite indexes for:
```
Collection: questions
- repoUrl (ASC) + upvotes (DESC) + status (ASC)
```

### **Query Cost:**
- Reads: 1 per cached question (up to 50)
- Writes: Only when users upvote or answer
- **Much cheaper than generating via API**

---

## ⚙️ Configuration

Current settings (can be adjusted):

| Setting | Value | Location |
|---------|-------|----------|
| Cache threshold | 50 questions | `page.tsx:326` |
| Max cached to show | 15 questions | `page.tsx:331` |
| Max cached to mix | 10 questions | `page.tsx:359` |
| Cache query limit | 50 questions | `quiz-history.ts:643` |
| Sort order | By upvotes (desc) | `quiz-history.ts:653` |

---

## 🎯 Next Steps

1. **Test with different repos**
2. **Build up cache** by upvoting good questions
3. **Monitor Firebase usage** (should decrease over time)
4. **Add cache stats to UI** (optional: show "X questions cached for this repo")

---

**Status:** ✅ Caching system fully implemented  
**Ready to test!** 🚀

