# 🔥 Firebase Database Setup Guide

## **Step 1: Create Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Project name: `realcoder-ai`
4. Enable Google Analytics (optional)
5. Create project

## **Step 2: Enable Firestore Database**

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll update security rules later)
4. Select location closest to your users
5. Enable

## **Step 3: Create Collections**

### Collection 1: `questions`
**Purpose**: Store all quiz questions with flexible schema

**Document ID**: Auto-generated or custom question ID

**Document Fields**:
```json
{
  "questionId": "q-123",
  "repoUrl": "https://github.com/facebook/react",
  "repoKey": "facebook-react",
  "type": "multiple-choice",
  "question": "What does useState return?",
  "language": "JavaScript",
  "difficulty": "medium",
  "data": {
    "options": ["Option A", "Option B", "Option C"],
    "correctAnswer": "Option A",
    "explanation": "useState returns an array with state and setter"
  },
  "upvotes": 15,
  "downvotes": 3,
  "totalVotes": 18,
  "approvalRate": 83.3,
  "passedCount": 89,
  "failedCount": 38,
  "totalAttempts": 127,
  "passRate": 70.1,
  "status": "active",
  "createdAt": "2025-01-27T10:30:00Z",
  "lastUpdated": "2025-01-27T10:30:00Z"
}
```

### Collection 2: `questionVotes`
**Purpose**: Track individual user votes to prevent double-voting

**Document ID**: `{questionId}-{userId}` (composite key)

**Document Fields**:
```json
{
  "voteId": "q-123-user-456",
  "questionId": "q-123",
  "userId": "user-456",
  "vote": "up",
  "timestamp": "2025-01-27T10:30:00Z"
}
```

### Collection 3: `questionBanks`
**Purpose**: Store curated question collections per repository

**Document ID**: `{owner}-{repo}` (e.g., `facebook-react`)

**Document Fields**:
```json
{
  "repoUrl": "https://github.com/facebook/react",
  "repoKey": "facebook-react",
  "owner": "facebook",
  "repo": "react",
  "questions": [
    {
      "questionId": "q-123",
      "upvotes": 15,
      "downvotes": 3,
      "approvalRate": 83.3,
      "status": "active"
    }
  ],
  "totalQuestions": 45,
  "activeQuestions": 42,
  "averageQuality": 78.5,
  "createdAt": "2025-01-27T10:30:00Z",
  "lastUpdated": "2025-01-27T10:30:00Z"
}
```

### Collection 4: `quizHistory`
**Purpose**: Track user quiz sessions and results

**Document ID**: Auto-generated

**Document Fields**:
```json
{
  "historyId": "quiz-123",
  "userId": "user-456",
  "repoUrl": "https://github.com/facebook/react",
  "repoName": "facebook/react",
  "score": 8,
  "totalQuestions": 10,
  "completedAt": "2025-01-27T10:30:00Z",
  "results": [
    {
      "questionId": "q-123",
      "isCorrect": true,
      "timeSpent": 45,
      "selectedAnswer": "Option A"
    }
  ],
  "sessionId": "session-789",
  "language": "JavaScript",
  "difficulty": "medium"
}
```

### Collection 5: `users`
**Purpose**: User data and usage tracking

**Document ID**: User's Firebase Auth UID

**Document Fields**:
```json
{
  "userId": "user-456",
  "email": "user@example.com",
  "name": "John Doe",
  "provider": "google",
  "plan": "free",
  "quizzesUsed": 3,
  "lastQuizDate": "2025-01-27T10:30:00Z",
  "joinedAt": "2025-01-20T10:30:00Z",
  "badges": ["real-code-tester"]
}
```

## **Step 4: Set Up Security Rules**

Go to **Firestore Database > Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Questions - read for all, write for authenticated users
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Question votes - users can only vote once per question
    match /questionVotes/{voteId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Question banks - read for all, write for authenticated users
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

## **Step 5: Create Indexes**

Go to **Firestore Database > Indexes** and create:

### Composite Indexes:

1. **questions collection**:
   - Fields: `repoKey` (Ascending), `status` (Ascending)
   - Fields: `status` (Ascending), `approvalRate` (Descending)
   - Fields: `repoKey` (Ascending), `createdAt` (Descending)

2. **questionVotes collection**:
   - Fields: `questionId` (Ascending), `userId` (Ascending)

3. **quizHistory collection**:
   - Fields: `userId` (Ascending), `completedAt` (Descending)

4. **questionBanks collection**:
   - Fields: `repoKey` (Ascending), `averageQuality` (Descending)

## **Step 6: Get Firebase Config**

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **"Web app"** (</> icon)
4. Register app name: `realcoder-ai-web`
5. Copy the config object

## **Step 7: Add Environment Variables**

Create `.env.local` file:

```bash
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Redis Config (for caching)
REDIS_URL=your_redis_url
REDIS_PASSWORD=your_redis_password
```

## **Step 8: Test Connection**

The app will automatically connect to Firebase when you start it. Check the browser console for connection logs.

## **🎯 Next Steps**

1. ✅ **Firebase Project Created**
2. ✅ **Firestore Database Enabled**
3. ✅ **Collections Created**
4. ✅ **Security Rules Set**
5. ✅ **Indexes Created**
6. ✅ **Environment Variables Added**
7. 🔄 **Test the voting system**
8. 🔄 **Test question bank auto-save**
9. 🔄 **Test poll system**

## **📊 Monitoring**

- **Firebase Console**: Monitor usage, errors, and performance
- **Firestore Usage**: Track read/write operations
- **Security Rules**: Monitor rule violations
- **Indexes**: Check index performance

Your Firebase database is now ready for the quiz system! 🚀
