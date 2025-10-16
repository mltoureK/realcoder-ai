# 📊 Community Stats & Firebase Management Guide

## 🎯 Overview

The RealCoder AI platform tracks community statistics for quiz questions to provide users with insights into question difficulty and community performance. This guide covers how community stats are managed in Firebase and how they integrate with the quiz system.

## 🏗️ Firebase Collections Structure

### 1. `questions` Collection
**Primary collection for storing questions and their community statistics**

```typescript
{
  // Question identification
  id: "q-1234567890",
  questionId: "q-1234567890", // Same as id for consistency
  repoUrl: "https://github.com/facebook/react",
  repoKey: "facebook-react", // owner-repo format
  
  // Question content
  type: "multiple-choice" | "select-all" | "fill-blank" | "function-variant" | "true-false",
  question: "What does useState return?",
  language: "JavaScript",
  difficulty: "medium",
  
  // Question data (type-specific)
  data: {
    // For multiple-choice:
    options: ["Option A", "Option B", "Option C"],
    correctAnswer: "Option A",
    explanation: "useState returns an array with state and setter",
    
    // For select-all:
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctAnswers: ["A", "B"], // Array of correct option letters
    explanation: "Both A and B are correct",
    
    // For function-variant:
    variants: [
      {
        id: "var-1",
        code: "const [count, setCount] = useState(0);",
        isCorrect: true,
        explanation: "Correct implementation"
      }
    ]
  },
  
  // Community Statistics (Core Stats)
  passedCount: 89,        // Number of users who passed
  failedCount: 38,        // Number of users who failed
  totalAttempts: 127,     // Total attempts (passed + failed)
  passRate: 70.1,         // Calculated: (passedCount / totalAttempts) * 100
  
  // Community Voting (Quality Assessment)
  upvotes: 15,            // Thumbs up votes
  downvotes: 3,           // Thumbs down votes
  totalVotes: 18,         // Total votes (upvotes + downvotes)
  approvalRate: 83.3,     // Calculated: (upvotes / totalVotes) * 100
  
  // Metadata
  status: "active",       // "active" | "removed" | "flagged"
  createdAt: timestamp,
  lastUpdated: timestamp
}
```

### 2. `questionVotes` Collection
**Tracks individual user votes to prevent double-voting**

```typescript
{
  voteId: "q-123-user-456", // Composite key: questionId-userId
  questionId: "q-123",
  userId: "user-456",
  vote: "up" | "down",
  timestamp: timestamp
}
```

### 3. `users` Collection
**User data and usage tracking**

```typescript
{
  userId: "user-456",
  email: "user@example.com",
  name: "John Doe",
  provider: "google" | "github" | "anonymous",
  plan: "free" | "pro" | "edu",
  quizzesUsed: 3,
  lastQuizDate: timestamp,
  joinedAt: timestamp,
  badges: ["real-code-tester"] // Array of earned badges
}
```

### 4. `quizHistory` Collection
**Individual user quiz sessions and results**

```typescript
{
  historyId: "quiz-123",
  userId: "user-456",
  repoUrl: "https://github.com/facebook/react",
  repoName: "facebook/react",
  score: 8,
  totalQuestions: 10,
  completedAt: timestamp,
  results: [
    {
      questionId: "q-123",
      isCorrect: true,
      timeSpent: 45,
      selectedAnswer: "Option A"
    }
  ],
  sessionId: "session-789",
  language: "JavaScript",
  difficulty: "medium"
}
```

## 🔄 Community Stats Update Flow

### 1. Question Answer Submission
When a user answers a question in `QuizInterface.tsx`:

```typescript
// Calculate correctness (lines 288-308)
const hasCorrectSelections = selectedAnswers.some((answer: string) => 
  correctOptions.includes(answer));
const hasIncorrectSelections = selectedAnswers.some((answer: string) => 
  !correctOptions.includes(answer));
isCorrect = hasCorrectSelections && !hasIncorrectSelections;

// For select-all questions, calculate perfect score for community stats
const hasAllCorrectSelections = correctOptions.every((answer: string) => 
  selectedAnswers.includes(answer));
const isPerfectScore = hasAllCorrectSelections && !hasIncorrectSelections;

// Store for community stats
(currentQuestion as any).__isPerfectScore = isPerfectScore;
```

### 2. Community Stats Update
In `QuestionPoll.tsx`, stats are updated via `updateQuestionPoll()`:

```typescript
// Update poll with current result AND full question data
const questionWithRepo = questionData ? {
  ...questionData,
  repoUrl: repoUrl
} : undefined;

await updateQuestionPoll(questionId, isCorrect, questionWithRepo);
```

### 3. Firebase Update Process
The `updateQuestionPoll()` function in `quiz-history.ts`:

1. **Creates or updates question document** in `questions` collection
2. **Increments appropriate counters**:
   - `passedCount++` if `isCorrect = true`
   - `failedCount++` if `isCorrect = false`
   - `totalAttempts++` always
3. **Recalculates pass rate**: `(passedCount / totalAttempts) * 100`
4. **Updates timestamp**: `lastUpdated = now()`

## 🎯 Special Handling: Select-All Questions

### The Problem
Select-all questions have **partial credit** in the UI but should only count as "passed" in community stats if the user gets a **perfect score**.

### The Solution
Two separate calculations:

1. **UI/Grading Logic**: Partial credit allowed
   ```typescript
   // User selects 2 out of 4 correct answers = "passed" in UI
   const hasCorrectSelections = selectedAnswers.some(answer => 
     correctOptions.includes(answer));
   const hasIncorrectSelections = selectedAnswers.some(answer => 
     !correctOptions.includes(answer));
   isCorrect = hasCorrectSelections && !hasIncorrectSelections;
   ```

2. **Community Stats Logic**: Perfect score required
   ```typescript
   // Only perfect score counts as "passed" for community stats
   const hasAllCorrectSelections = correctOptions.every(answer => 
     selectedAnswers.includes(answer));
   const isPerfectScore = hasAllCorrectSelections && !hasIncorrectSelections;
   ```

### Implementation
In `QuizInterface.tsx` (lines 1774-1778):

```typescript
isCorrect={(() => {
  const questionResult = results.find(r => r.questionId === currentQuestion.id);
  const wasCorrect = questionResult?.isCorrect || false;
  
  // For select-all questions, use perfect score for community stats
  if (currentQuestion.type === 'select-all') {
    const isPerfectScore = (currentQuestion as any).__isPerfectScore;
    return isPerfectScore || false;
  }
  
  return wasCorrect;
})()}
```

## 📊 Community Stats Display

### QuestionPoll Component
Shows real-time community statistics:

```typescript
// Display format
{
  totalAttempts: 127,    // Total attempts
  passed: 89,           // Users who passed
  failed: 38,           // Users who failed  
  passRate: 70.1        // Pass rate percentage
}
```

### Visual Elements
- **Progress bar**: Shows pass rate as percentage
- **Counters**: Displays passed/failed counts
- **User indicator**: Shows if current user passed/failed
- **Loading state**: Shows "Loading community stats..." while fetching

## 🔧 Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Questions - read for all, write for authenticated
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Question votes - users can only vote once per question
    match /questionVotes/{voteId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Quiz history - users can only access their own
    match /quizHistory/{historyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Users - users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

## 📈 Firebase Indexes

### Required Indexes for Performance

1. **questions collection**:
   - `repoKey` (Ascending)
   - `status` (Ascending) 
   - `passRate` (Descending)
   - `approvalRate` (Descending)
   - `createdAt` (Descending)

2. **questionVotes collection**:
   - `questionId` (Ascending)
   - `userId` (Ascending)

3. **quizHistory collection**:
   - `userId` (Ascending)
   - `completedAt` (Descending)

4. **users collection**:
   - `plan` (Ascending)
   - `joinedAt` (Descending)

## 🚀 Key Functions

### Core Functions in `quiz-history.ts`

1. **`updateQuestionPoll(questionId, isCorrect, questionData)`**
   - Updates community stats for a question
   - Creates question document if it doesn't exist
   - Increments appropriate counters

2. **`getQuestionPollData(questionId)`**
   - Retrieves current community stats for a question
   - Returns pass/fail counts and rates

3. **`addQuestionToBank(question, repoUrl)`**
   - Saves complete question data to Firebase
   - Initializes community stats counters

4. **`saveQuizResults(userId, repoUrl, repoName, score, totalQuestions, results, sessionId)`**
   - Saves individual user quiz results
   - Tracks user progress and statistics

## 🧪 Testing Community Stats

### Manual Testing Steps

1. **Take a quiz** with different question types
2. **Answer questions** (both correctly and incorrectly)
3. **Check Firebase Console**:
   - Go to `questions` collection
   - Verify counters are incrementing
   - Check pass rates are calculating correctly
4. **Verify UI Display**:
   - Community stats should show in `QuestionPoll` component
   - Progress bar should reflect actual pass rates
   - User result indicator should be accurate

### Test Cases

1. **Multiple Choice**: Standard pass/fail counting
2. **Select-All**: Perfect score required for community stats
3. **Function Variant**: Standard pass/fail counting
4. **True/False**: Standard pass/fail counting
5. **Fill-in-Blank**: Standard pass/fail counting

## 🔍 Monitoring & Debugging

### Console Logs to Watch

```typescript
// In QuizInterface.tsx
console.log('🔍 [addQuestionToBank] Saving to questions collection with ID:', question.id);
console.log('✅ Question ${question.id} saved to questions collection with complete data');

// In QuestionPoll.tsx  
console.log('🔍 [QuestionPoll] Updating poll for questionId:', questionId, 'isCorrect:', isCorrect);
console.log('🚀 [QuestionPoll] About to call loadPollData for', questionId);
```

### Firebase Console Checks

1. **questions collection**: Verify documents are being created/updated
2. **Counter values**: Check `passedCount`, `failedCount`, `totalAttempts`
3. **Calculated fields**: Verify `passRate` is calculating correctly
4. **Timestamps**: Ensure `lastUpdated` is being set

## 🎯 Best Practices

### Data Consistency
- Always use atomic operations for counter updates
- Handle race conditions with Firebase transactions
- Validate data before saving to Firebase

### Performance
- Use Firebase indexes for efficient queries
- Batch operations when possible
- Cache frequently accessed data

### User Experience
- Show loading states while fetching stats
- Provide fallback data if Firebase is unavailable
- Update stats in real-time as users interact

## 🚨 Common Issues & Solutions

### Issue: Stats Not Updating
**Solution**: Check Firebase security rules and authentication

### Issue: Incorrect Pass Rates
**Solution**: Verify counter logic and calculation formulas

### Issue: Select-All Questions Counting Wrong
**Solution**: Ensure perfect score logic is being used for community stats

### Issue: Performance Issues
**Solution**: Add Firebase indexes and optimize queries

---

**Status**: ✅ Production Ready
**Last Updated**: Current
**Maintainer**: Development Team
