import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { QuestionDoc, QuestionRatingDoc } from './quiz-history';

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  MIN_VOTES_FOR_FLAG: 10,
  FLAG_THRESHOLD: 30, // 30% approval rate
  EXCELLENT_THRESHOLD: 80, // 80% approval rate
  GOOD_THRESHOLD: 60, // 60% approval rate
  POOR_THRESHOLD: 40 // 40% approval rate
} as const;

export type QualityStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'flagged';

export interface QualityMetrics {
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  approvalRate: number;
  qualityScore: number;
  status: QualityStatus;
  needsReview: boolean;
}

/**
 * Calculate quality metrics for a question
 */
export function calculateQualityMetrics(question: QuestionDoc): QualityMetrics {
  const { upvotes, downvotes } = question;
  const totalVotes = upvotes + downvotes;
  
  let approvalRate = 0;
  if (totalVotes > 0) {
    approvalRate = (upvotes / totalVotes) * 100;
  }
  
  // Calculate quality score (0-100)
  let qualityScore = 100; // Start with perfect score
  
  if (totalVotes > 0) {
    qualityScore = approvalRate;
  }
  
  // Determine status
  let status: QualityStatus = 'excellent';
  let needsReview = false;
  
  if (totalVotes >= QUALITY_THRESHOLDS.MIN_VOTES_FOR_FLAG && approvalRate < QUALITY_THRESHOLDS.FLAG_THRESHOLD) {
    status = 'flagged';
    needsReview = true;
  } else if (approvalRate < QUALITY_THRESHOLDS.POOR_THRESHOLD) {
    status = 'poor';
  } else if (approvalRate < QUALITY_THRESHOLDS.GOOD_THRESHOLD) {
    status = 'fair';
  } else if (approvalRate < QUALITY_THRESHOLDS.EXCELLENT_THRESHOLD) {
    status = 'good';
  } else {
    status = 'excellent';
  }
  
  return {
    upvotes,
    downvotes,
    totalVotes,
    approvalRate: Math.round(approvalRate * 10) / 10,
    qualityScore: Math.round(qualityScore * 10) / 10,
    status,
    needsReview
  };
}

/**
 * Update question quality score after a new rating
 */
export async function updateQuestionQualityScore(questionId: string): Promise<void> {
  try {
    // Get all ratings for this question
    const ratingsQuery = query(
      collection(db, 'questionRatings'),
      where('questionId', '==', questionId)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    let upvotes = 0;
    let downvotes = 0;
    
    ratingsSnapshot.forEach((doc) => {
      const rating = doc.data() as QuestionRatingDoc;
      if (rating.rating === 'up') {
        upvotes++;
      } else if (rating.rating === 'down') {
        downvotes++;
      }
    });
    
    const totalVotes = upvotes + downvotes;
    const metrics = calculateQualityMetrics({
      upvotes,
      downvotes,
      totalVotes,
      qualityScore: 100, // Will be recalculated
      status: 'active'
    } as QuestionDoc);
    
    // Update the question document
    const questionRef = doc(db, 'questions', questionId);
    await updateDoc(questionRef, {
      upvotes,
      downvotes,
      totalVotes,
      qualityScore: metrics.qualityScore,
      status: metrics.needsReview ? 'flagged' : 'active',
      lastUpdated: new Date()
    });
    
    console.log(`✅ Updated quality score for question ${questionId}: ${metrics.qualityScore}% (${metrics.status})`);
  } catch (error) {
    console.error('❌ Error updating question quality score:', error);
    throw error;
  }
}

/**
 * Get questions that need review (flagged)
 */
export async function getFlaggedQuestions(): Promise<QuestionDoc[]> {
  try {
    const q = query(
      collection(db, 'questions'),
      where('status', '==', 'flagged')
    );
    
    const querySnapshot = await getDocs(q);
    const flaggedQuestions: QuestionDoc[] = [];
    
    querySnapshot.forEach((doc) => {
      flaggedQuestions.push({
        id: doc.id,
        ...doc.data()
      } as QuestionDoc);
    });
    
    console.log(`📋 Found ${flaggedQuestions.length} flagged questions for review`);
    return flaggedQuestions;
  } catch (error) {
    console.error('❌ Error getting flagged questions:', error);
    throw error;
  }
}

/**
 * Approve or reject a flagged question
 */
export async function reviewQuestion(
  questionId: string, 
  action: 'approve' | 'reject',
  adminUserId: string
): Promise<void> {
  try {
    const questionRef = doc(db, 'questions', questionId);
    
    if (action === 'approve') {
      await updateDoc(questionRef, {
        status: 'active',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        lastUpdated: new Date()
      });
      console.log(`✅ Approved question ${questionId}`);
    } else if (action === 'reject') {
      await updateDoc(questionRef, {
        status: 'removed',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        lastUpdated: new Date()
      });
      console.log(`❌ Rejected question ${questionId}`);
    }
  } catch (error) {
    console.error('❌ Error reviewing question:', error);
    throw error;
  }
}

/**
 * Get quality statistics for a repository
 */
export async function getRepoQualityStats(repoUrl: string): Promise<{
  totalQuestions: number;
  averageQuality: number;
  flaggedCount: number;
  excellentCount: number;
  goodCount: number;
  fairCount: number;
  poorCount: number;
}> {
  try {
    const q = query(
      collection(db, 'questions'),
      where('repoUrl', '==', repoUrl)
    );
    
    const querySnapshot = await getDocs(q);
    let totalQuestions = 0;
    let totalQuality = 0;
    let flaggedCount = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;
    
    querySnapshot.forEach((doc) => {
      const question = doc.data() as QuestionDoc;
      const metrics = calculateQualityMetrics(question);
      
      totalQuestions++;
      totalQuality += metrics.qualityScore;
      
      switch (metrics.status) {
        case 'excellent':
          excellentCount++;
          break;
        case 'good':
          goodCount++;
          break;
        case 'fair':
          fairCount++;
          break;
        case 'poor':
          poorCount++;
          break;
        case 'flagged':
          flaggedCount++;
          break;
      }
    });
    
    const averageQuality = totalQuestions > 0 ? totalQuality / totalQuestions : 0;
    
    return {
      totalQuestions,
      averageQuality: Math.round(averageQuality * 10) / 10,
      flaggedCount,
      excellentCount,
      goodCount,
      fairCount,
      poorCount
    };
  } catch (error) {
    console.error('❌ Error getting repo quality stats:', error);
    throw error;
  }
}

/**
 * Get quality trends over time
 */
export async function getQualityTrends(days: number = 30): Promise<{
  date: string;
  questionsAdded: number;
  averageQuality: number;
  flaggedCount: number;
}[]> {
  try {
    // This would typically involve more complex date queries
    // For now, return mock data structure
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        questionsAdded: Math.floor(Math.random() * 10),
        averageQuality: Math.floor(Math.random() * 40) + 60,
        flaggedCount: Math.floor(Math.random() * 3)
      });
    }
    
    return trends;
  } catch (error) {
    console.error('❌ Error getting quality trends:', error);
    return [];
  }
}

/**
 * Batch update quality scores for all questions
 */
export async function batchUpdateQualityScores(): Promise<void> {
  try {
    const q = query(collection(db, 'questions'));
    const querySnapshot = await getDocs(q);
    
    const updatePromises = [];
    
    querySnapshot.forEach((doc) => {
      const question = doc.data() as QuestionDoc;
      const metrics = calculateQualityMetrics(question);
      
      updatePromises.push(
        updateDoc(doc.ref, {
          qualityScore: metrics.qualityScore,
          status: metrics.needsReview ? 'flagged' : 'active',
          lastUpdated: new Date()
        })
      );
    });
    
    await Promise.all(updatePromises);
    console.log(`✅ Batch updated quality scores for ${updatePromises.length} questions`);
  } catch (error) {
    console.error('❌ Error batch updating quality scores:', error);
    throw error;
  }
}

/**
 * Get quality score color for UI
 */
export function getQualityScoreColor(qualityScore: number): string {
  if (qualityScore >= QUALITY_THRESHOLDS.EXCELLENT_THRESHOLD) {
    return 'text-green-600 dark:text-green-400';
  } else if (qualityScore >= QUALITY_THRESHOLDS.GOOD_THRESHOLD) {
    return 'text-blue-600 dark:text-blue-400';
  } else if (qualityScore >= QUALITY_THRESHOLDS.POOR_THRESHOLD) {
    return 'text-yellow-600 dark:text-yellow-400';
  } else {
    return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Get quality score background color for UI
 */
export function getQualityScoreBg(qualityScore: number): string {
  if (qualityScore >= QUALITY_THRESHOLDS.EXCELLENT_THRESHOLD) {
    return 'bg-green-100 dark:bg-green-900/20';
  } else if (qualityScore >= QUALITY_THRESHOLDS.GOOD_THRESHOLD) {
    return 'bg-blue-100 dark:bg-blue-900/20';
  } else if (qualityScore >= QUALITY_THRESHOLDS.POOR_THRESHOLD) {
    return 'bg-yellow-100 dark:bg-yellow-900/20';
  } else {
    return 'bg-red-100 dark:bg-red-900/20';
  }
}
