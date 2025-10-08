# Firebase Collections Setup Guide

## Collections to Create:

### 1. `questions` Collection
**Purpose**: Store all questions with flexible schema for different types

**Document Structure**:
```typescript
{
  questionId: "q-123", // Unique ID
  repoUrl: "https://github.com/facebook/react", // Repository URL
  repoKey: "facebook-react", // owner-repo for easy querying
  type: "multiple-choice", // Question type
  
  // Common fields for all question types
  question: "What does useState return?",
  language: "JavaScript",
  difficulty: "medium",
  
  // Flexible data object for type-specific content
  data: {
    // For multiple-choice:
    options: ["Option A", "Option B", "Option C"],
    correctAnswer: "Option A",
    explanation: "useState returns an array with state and setter",
    
    // For function-variant:
    variants: [
      {
        id: "var-1",
        code: "const [count, setCount] = useState(0);",
        isCorrect: true,
        explanation: "Correct implementation"
      }
    ],
    
    // For select-all:
    options: ["Option A", "Option B", "Option C"],
    correctAnswers: ["A", "B"], // Array of correct option letters
    explanation: "Both A and B are correct",
    
    // For true-false:
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "This statement is true because...",
    
    // For order-sequence:
    steps: [
      { id: "step-1", code: "Initialize state", isDistractor: false },
      { id: "step-2", code: "Set up event handler", isDistractor: false }
    ],
    correctOrder: ["step-1", "step-2"],
    explanation: "Steps must be in this order"
  },
  
  // Community voting data
  upvotes: 15,
  downvotes: 3,
  totalVotes: 18,
  approvalRate: 83.3, // (upvotes / totalVotes) * 100
  
  // Poll data (pass/fail tracking)
  passedCount: 89,
  failedCount: 38,
  totalAttempts: 127,
  passRate: 70.1, // (passedCount / totalAttempts) * 100
  
  // Metadata
  status: "active", // "active" | "removed" | "flagged"
  createdAt: timestamp,
  lastUpdated: timestamp
}
```

### 2. `questionVotes` Collection
**Purpose**: Track individual user votes to prevent double-voting

**Document Structure**:
```typescript
{
  voteId: "q-123-user-456", // Composite key: questionId-userId
  questionId: "q-123",
  userId: "user-456",
  vote: "up", // "up" | "down"
  timestamp: timestamp
}
```

### 3. `questionBanks` Collection
**Purpose**: Store curated question collections per repository

**Document Structure**:
```typescript
{
  repoKey: "facebook-react", // owner-repo
  repoUrl: "https://github.com/facebook/react",
  owner: "facebook",
  repo: "react",
  
  // Array of question IDs (not full questions for performance)
  questionIds: ["q-123", "q-456", "q-789"],
  totalQuestions: 45,
  activeQuestions: 42, // Excludes removed questions
  averageQuality: 78.5,
  
  createdAt: timestamp,
  lastUpdated: timestamp
}
```

### 4. `quizHistory` Collection
**Purpose**: Track user quiz sessions and results

**Document Structure**:
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

### 5. `users` Collection
**Purpose**: User data and usage tracking

**Document Structure**:
```typescript
{
  userId: "user-456",
  email: "user@example.com",
  name: "John Doe",
  provider: "google", // "google" | "github" | "anonymous"
  plan: "free", // "free" | "pro" | "edu"
  quizzesUsed: 3,
  lastQuizDate: timestamp,
  joinedAt: timestamp,
  badges: ["real-code-tester"] // Array of earned badges
}
```

## Security Rules

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
    
    // Question banks - read for all, write for authenticated
    match /questionBanks/{bankId} {
      allow read: if true;
      allow write: if request.auth != null;
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

## Indexes to Create

1. **questions collection**:
   - repoKey (Ascending)
   - status (Ascending)
   - approvalRate (Descending)
   - createdAt (Descending)

2. **questionVotes collection**:
   - questionId (Ascending)
   - userId (Ascending)

3. **quizHistory collection**:
   - userId (Ascending)
   - completedAt (Descending)

4. **questionBanks collection**:
   - repoKey (Ascending)
