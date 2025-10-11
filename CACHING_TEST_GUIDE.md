# 🧪 Caching System Test Guide

## ✅ Complete Implementation Summary

### **What Was Built:**
1. ✅ `getCachedQuestions()` - Queries Firebase for upvoted questions by repo
2. ✅ Cache check logic - Decides between cached-only, hybrid, or all-new
3. ✅ "Community Reviewed" badge - Green badge for cached questions
4. ✅ Question order - Cached questions shown FIRST

---

## 🧪 Testing Instructions

### **Test 1: Build Your Cache (Start Here)**

**Goal:** Create some cached questions to test with

1. **Generate a quiz** from any repo (e.g., facebook/react)
2. **Answer 10 questions**
3. **Upvote 5-10 of them** (thumbs up)
4. **Check Firebase Console:**
   - Go to `questions` collection
   - Filter by `repoUrl == "https://github.com/facebook/react"`
   - Should see 5-10 documents with complete data
   - Verify `upvotes: 1` and all fields populated

---

### **Test 2: Hybrid Mode (1-49 Cached)**

**Setup:** You now have 5-10 cached questions from Test 1

1. **Generate quiz again** for the same repo
2. **Watch console logs:**
   ```
   📦 Found 7 cached questions for https://github.com/facebook/react
   🔄 Using 7 cached questions + generating 8 new ones
   ```
3. **During quiz:**
   - **Questions 1-7:** Should have `🟢 Community Reviewed` badge
   - **Questions 8-15:** No badge (freshly generated)
4. **Verify:**
   - Cached questions load instantly
   - New questions stream in after

---

### **Test 3: Full Cache Mode (50+ Cached)**

**Setup:** Need to build cache to 50+ questions (takes time)

1. **Repeat Test 1 multiple times** with different repos OR same repo
2. **Upvote 50+ questions total** for one repo
3. **Generate quiz for that repo**
4. **Watch console logs:**
   ```
   📦 Found 52 cached questions for https://github.com/popular/repo
   ✅ Using ONLY cached questions (50+ available)
   ```
5. **During quiz:**
   - **ALL 15 questions** have `🟢 Community Reviewed` badge
   - **Quiz loads instantly** (no API call!)
   - **No loading spinner** for question generation
6. **Check browser network tab:**
   - Should NOT see call to `/api/generateQuiz`

---

## 📊 What to Look For

### **Console Logs:**

#### **Full Cache (50+):**
```
🚀 Starting quiz generation process...
📁 Generating quiz from stored repository files
🔍 Repository files available: 100
🔍 Checking for cached questions...
📦 Found 52 cached questions for https://github.com/owner/repo
✅ Using ONLY cached questions (50+ available)
```

#### **Hybrid (1-49):**
```
🚀 Starting quiz generation process...
🔍 Checking for cached questions...
📦 Found 7 cached questions for https://github.com/owner/repo
🔄 Using 7 cached questions + generating 8 new ones
📤 Streaming quiz request with code length: 123456
...
✅ Stream done: 8
🔄 Merging 7 cached questions with generated ones
```

#### **No Cache (0):**
```
🚀 Starting quiz generation process...
🔍 Checking for cached questions...
📦 Found 0 cached questions for https://github.com/owner/repo
⚡ No cached questions found - generating all from scratch
📤 Streaming quiz request with code length: 123456
```

---

### **UI Verification:**

#### **Community Reviewed Badge:**
Should appear like this:

```
Question 1 of 15  🟢 Community Reviewed
```

**Styling:**
- Green background (`bg-green-100`)
- Green text (`text-green-800`)
- Checkmark icon
- Rounded pill shape

#### **Question Order:**

For hybrid mode (e.g., 7 cached + 8 new):
```
Question 1 of 15  🟢 Community Reviewed  ← Cached
Question 2 of 15  🟢 Community Reviewed  ← Cached
Question 3 of 15  🟢 Community Reviewed  ← Cached
...
Question 7 of 15  🟢 Community Reviewed  ← Cached
Question 8 of 15                          ← New (no badge)
Question 9 of 15                          ← New (no badge)
...
Question 15 of 15                         ← New (no badge)
```

---

### **Firebase Verification:**

#### **Check `questions` Collection:**

After upvoting questions, verify each document has:

```javascript
{
  questionId: "q-123",
  type: "select-all",              // ✅ NOT EMPTY
  snippet: "functionName",         // ✅ NOT EMPTY
  question: "Which statements...", // ✅ NOT EMPTY
  codeContext: "export function...", // ✅ NOT EMPTY
  options: [...],                   // ✅ ARRAY WITH DATA
  correctAnswers: [...],            // ✅ ARRAY (for select-all)
  explanation: "...",               // ✅ NOT EMPTY
  repoUrl: "https://github.com/...", // ✅ NOT EMPTY
  repoKey: "owner-repo",            // ✅ NOT EMPTY
  upvotes: 1,                       // ✅ > 0
  status: "active"                  // ✅ ACTIVE
}
```

**All fields should be populated. NO empty strings!**

---

## 🐛 Troubleshooting

### **Issue 1: Badge Not Showing**
**Symptom:** No green "Community Reviewed" badge  
**Cause:** `isCached` flag not set on question  
**Check:** Console log should show `isCached: true` in question object

### **Issue 2: Not Using Cache**
**Symptom:** Always generates new questions even when cache exists  
**Cause:** Firebase query failing or no upvoted questions  
**Check:** Look for `📦 Found X cached questions` in console

### **Issue 3: Empty Cached Questions**
**Symptom:** Cached questions loaded but missing data  
**Cause:** Old questions saved before schema update  
**Solution:** Delete old incomplete questions from Firebase

### **Issue 4: Cache Query Fails**
**Symptom:** Error in console about Firebase index  
**Cause:** Need composite index  
**Solution:** Click the link in error message to create index in Firebase Console

---

## 📈 Expected Performance

| Cache Size | Load Time | API Cost | User Experience |
|------------|-----------|----------|-----------------|
| 0 questions | ~30s | $0.15 | Standard (acceptable) |
| 10 questions | ~20s | $0.10 | Faster (10 instant + 5 new) |
| 50+ questions | <1s | $0.00 | **INSTANT** ⚡ |

---

## 🎯 Success Criteria

After testing, you should have:

✅ **Scenario 1:** Generated quiz, upvoted 10 questions  
✅ **Scenario 2:** Regenerated quiz, saw cached questions FIRST with badges  
✅ **Scenario 3:** Verified Firebase has complete data (no empty fields)  
✅ **Scenario 4:** Confirmed poll stats update for all questions  

---

## 🚀 Next Steps

Once caching is working:

1. **Build up cache** for popular repos (React, Next.js, Vue, etc.)
2. **Monitor Firebase costs** (should decrease over time)
3. **Build admin UI** to manage cached questions
4. **Implement quality control** (auto-remove low-approval questions)

---

**Status:** ✅ Caching system ready  
**Action:** Refresh browser and test!

