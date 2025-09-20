import { BaseQualityFilter, QualityRatingRequest, QualityRatingResponse } from './BaseQualityFilter';
import { FunctionVariantQualityFilter } from './FunctionVariantQualityFilter';
import { MultipleChoiceQualityFilter } from './MultipleChoiceQualityFilter';
import { TrueFalseQualityFilter } from './TrueFalseQualityFilter';
import { SelectAllQualityFilter } from './SelectAllQualityFilter';
import { FillBlankQualityFilter } from './FillBlankQualityFilter';
import { OrderSequenceQualityFilter } from './OrderSequenceQualityFilter';

/**
 * Quality Filter Orchestrator - Routes questions to appropriate type-specific quality filters
 */
export class QualityFilterOrchestrator {
  private filters: Map<string, BaseQualityFilter>;
  private defaultFilter: BaseQualityFilter;
  
  // Global counters and rating tracking for logging
  private questionsAccepted = 0;
  private questionsRejected = 0;
  private allRatings: Array<{score: number, question: string, accepted: boolean, type: string}> = [];
  private rejectedQuestions: Array<{
    type: string;
    question: string;
    reason: string;
    score?: number;
    rawData?: any;
    timestamp: string;
  }> = [];

  constructor() {
    // Initialize type-specific filters
    this.filters = new Map([
      ['function-variant', new FunctionVariantQualityFilter()],
      ['multiple-choice', new MultipleChoiceQualityFilter()],
      ['true-false', new TrueFalseQualityFilter()],
      ['select-all', new SelectAllQualityFilter()],
      ['fill-blank', new FillBlankQualityFilter()],
      ['order-sequence', new OrderSequenceQualityFilter()],
    ]);

    // Default filter for unknown types (falls back to base quality criteria)
    this.defaultFilter = new BaseQualityFilter();
  }

  /**
   * Get the appropriate quality filter for a question type
   */
  private getFilterForType(type: string): BaseQualityFilter {
    return this.filters.get(type) || this.defaultFilter;
  }

  /**
   * Rate a question's quality using the appropriate type-specific filter
   */
  async rateQuestionQuality(question: QualityRatingRequest): Promise<QualityRatingResponse> {
    const filter = this.getFilterForType(question.type);
    return await filter.rateQuestionQuality(question);
  }

  /**
   * Check if a question meets the quality threshold using the appropriate filter
   */
  async shouldKeepQuestion(question: QualityRatingRequest, isPremium: boolean = false): Promise<boolean> {
    const filter = this.getFilterForType(question.type);
    const shouldKeep = await filter.shouldKeepQuestion(question, isPremium);
    
    // Track statistics
    const rating = await filter.rateQuestionQuality(question);
    const questionPreview = question.question?.substring(0, 50) + '...' || 'No question text';
    
    this.allRatings.push({
      score: rating.score,
      question: questionPreview,
      accepted: shouldKeep,
      type: question.type
    });

    if (shouldKeep) {
      this.questionsAccepted++;
    } else {
      this.questionsRejected++;
      
      // Log rejected question details
      this.rejectedQuestions.push({
        type: question.type,
        question: question.question || 'No question text',
        reason: rating.reasoning,
        score: rating.score,
        rawData: question,
        timestamp: new Date().toISOString()
      });
    }

    // Log stats every 10 questions
    const total = this.questionsAccepted + this.questionsRejected;
    if (total % 10 === 0) {
      const tierText = isPremium ? 'PREMIUM (8+)' : 'FREE (7+)';
      console.log(`📊 Quality Filter Stats ${tierText}: ${this.questionsAccepted} accepted, ${this.questionsRejected} rejected (${Math.round(this.questionsAccepted/total*100)}% acceptance rate)`);
    }

    return shouldKeep;
  }

  /**
   * Display a summary of all question ratings, grouped by type
   */
  displayQualityRatingSummary(): void {
    if (this.allRatings.length === 0) return;
    
    console.log('\n🎯 QUALITY RATING SUMMARY:');
    console.log('=' .repeat(50));
    
    // Group by type first
    const byType = this.allRatings.reduce((acc, rating) => {
      if (!acc[rating.type]) acc[rating.type] = [];
      acc[rating.type].push(rating);
      return acc;
    }, {} as Record<string, typeof this.allRatings>);

    // Display summary by type
    for (const [type, ratings] of Object.entries(byType)) {
      const accepted = ratings.filter(r => r.accepted).length;
      const rejected = ratings.filter(r => !r.accepted).length;
      const avgScore = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
      
      console.log(`📊 ${type}: ${ratings.length} questions (${accepted} accepted, ${rejected} rejected, avg: ${avgScore.toFixed(1)}/10)`);
      
      // Show score distribution for this type
      const scoreGroups = ratings.reduce((acc, rating) => {
        if (!acc[rating.score]) acc[rating.score] = 0;
        acc[rating.score]++;
        return acc;
      }, {} as Record<number, number>);
      
      const scoreSummary = Object.entries(scoreGroups)
        .sort(([a], [b]) => parseInt(b) - parseInt(a))
        .slice(0, 3) // Show top 3 scores
        .map(([score, count]) => `${score}/10: ${count}`)
        .join(', ');
      
      console.log(`   📈 Top scores: ${scoreSummary}`);
    }
    
    console.log('=' .repeat(50));
    console.log(`📈 Total: ${this.allRatings.length} rated, ${this.questionsAccepted} accepted (${Math.round(this.questionsAccepted/this.allRatings.length*100)}% acceptance)`);
  }

  /**
   * Get statistics for a specific question type
   */
  getTypeStats(type: string): {total: number, accepted: number, rejected: number, avgScore: number} {
    const typeRatings = this.allRatings.filter(r => r.type === type);
    if (typeRatings.length === 0) {
      return { total: 0, accepted: 0, rejected: 0, avgScore: 0 };
    }

    const accepted = typeRatings.filter(r => r.accepted).length;
    const rejected = typeRatings.filter(r => !r.accepted).length;
    const avgScore = typeRatings.reduce((sum, r) => sum + r.score, 0) / typeRatings.length;

    return {
      total: typeRatings.length,
      accepted,
      rejected,
      avgScore: Math.round(avgScore * 10) / 10
    };
  }

  /**
   * Reset statistics (useful for testing or new sessions)
   */
  resetStats(): void {
    this.questionsAccepted = 0;
    this.questionsRejected = 0;
    this.allRatings = [];
    this.rejectedQuestions = [];
  }

  /**
   * Get detailed rejection statistics
   */
  getRejectionStats(): {
    total: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
    rejectionRate: number;
    byType: Record<string, {total: number, accepted: number, rejected: number, rate: number}>;
    byScore: Record<number, number>;
    byReason: Record<string, number>;
  } {
    const total = this.questionsAccepted + this.questionsRejected;
    const acceptanceRate = total > 0 ? Math.round((this.questionsAccepted / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((this.questionsRejected / total) * 100) : 0;

    // Group by type
    const byType: Record<string, {total: number, accepted: number, rejected: number, rate: number}> = {};
    this.allRatings.forEach(rating => {
      if (!byType[rating.type]) {
        byType[rating.type] = { total: 0, accepted: 0, rejected: 0, rate: 0 };
      }
      byType[rating.type].total++;
      if (rating.accepted) {
        byType[rating.type].accepted++;
      } else {
        byType[rating.type].rejected++;
      }
    });

    // Calculate acceptance rates by type
    Object.keys(byType).forEach(type => {
      const typeStats = byType[type];
      typeStats.rate = typeStats.total > 0 ? Math.round((typeStats.accepted / typeStats.total) * 100) : 0;
    });

    // Group rejected questions by score
    const byScore: Record<number, number> = {};
    this.rejectedQuestions.forEach(rejected => {
      const score = rejected.score || 0;
      byScore[score] = (byScore[score] || 0) + 1;
    });

    // Group by common rejection reasons
    const byReason: Record<string, number> = {};
    this.rejectedQuestions.forEach(rejected => {
      const reason = rejected.reason.toLowerCase();
      // Categorize common reasons
      let category = 'Other';
      if (reason.includes('json') || reason.includes('parse')) {
        category = 'JSON Parsing Error';
      } else if (reason.includes('ambiguous') || reason.includes('unclear')) {
        category = 'Ambiguous/Unclear';
      } else if (reason.includes('repository-specific') || reason.includes('domain-specific')) {
        category = 'Repository-Specific Trivia';
      } else if (reason.includes('cosmetic') || reason.includes('formatting')) {
        category = 'Cosmetic/Formatting';
      } else if (reason.includes('wrong') || reason.includes('incorrect')) {
        category = 'Wrong/Incorrect Logic';
      } else if (reason.includes('insufficient context')) {
        category = 'Insufficient Context';
      } else if (reason.includes('too easy') || reason.includes('obvious')) {
        category = 'Too Easy/Obvious';
      }
      byReason[category] = (byReason[category] || 0) + 1;
    });

    return {
      total,
      accepted: this.questionsAccepted,
      rejected: this.questionsRejected,
      acceptanceRate,
      rejectionRate,
      byType,
      byScore,
      byReason
    };
  }

  /**
   * Export rejected questions to a text file
   */
  exportRejectedQuestions(): string {
    const stats = this.getRejectionStats();
    let output = '';
    
    output += `# QUALITY FILTER REJECTION REPORT\n`;
    output += `Generated: ${new Date().toISOString()}\n\n`;
    
    output += `## SUMMARY STATISTICS\n`;
    output += `Total Questions: ${stats.total}\n`;
    output += `Accepted: ${stats.accepted} (${stats.acceptanceRate}%)\n`;
    output += `Rejected: ${stats.rejected} (${stats.rejectionRate}%)\n\n`;
    
    output += `## REJECTION RATES BY QUESTION TYPE\n`;
    Object.entries(stats.byType).forEach(([type, typeStats]) => {
      output += `${type}: ${typeStats.rejected}/${typeStats.total} rejected (${100 - typeStats.rate}% rejection rate)\n`;
    });
    output += '\n';
    
    output += `## REJECTION REASONS\n`;
    Object.entries(stats.byReason).forEach(([reason, count]) => {
      const percentage = Math.round((count / stats.rejected) * 100);
      output += `${reason}: ${count} (${percentage}%)\n`;
    });
    output += '\n';
    
    output += `## REJECTED QUESTIONS BY SCORE\n`;
    Object.entries(stats.byScore)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([score, count]) => {
        const percentage = Math.round((count / stats.rejected) * 100);
        output += `${score}/10: ${count} questions (${percentage}%)\n`;
      });
    output += '\n';
    
    output += `## DETAILED REJECTED QUESTIONS\n`;
    output += `\n`;
    
    this.rejectedQuestions.forEach((rejected, index) => {
      output += `### REJECTED QUESTION #${index + 1}\n`;
      output += `Type: ${rejected.type}\n`;
      output += `Score: ${rejected.score}/10\n`;
      output += `Timestamp: ${rejected.timestamp}\n`;
      output += `Reason: ${rejected.reason}\n\n`;
      output += `Question: ${rejected.question}\n\n`;
      
      if (rejected.rawData) {
        output += `Raw Data:\n`;
        output += `${JSON.stringify(rejected.rawData, null, 2)}\n`;
      }
      
      output += `\n---\n\n`;
    });
    
    return output;
  }

  /**
   * Get all rejected questions data
   */
  getRejectedQuestions(): Array<{
    type: string;
    question: string;
    reason: string;
    score?: number;
    rawData?: any;
    timestamp: string;
  }> {
    return [...this.rejectedQuestions];
  }

  /**
   * Log JSON parsing errors specifically
   */
  logJsonParsingError(rawQuestion: any, errorMessage: string): void {
    this.rejectedQuestions.push({
      type: rawQuestion?.quiz?.type || 'unknown',
      question: rawQuestion?.quiz?.question || 'JSON parsing failed',
      reason: `JSON Parsing Error: ${errorMessage}`,
      score: 0, // JSON errors get 0 score
      rawData: rawQuestion,
      timestamp: new Date().toISOString()
    });
    
    this.questionsRejected++;
    console.log(`🚫 JSON parsing error logged: ${errorMessage.substring(0, 100)}...`);
  }

  /**
   * Get all registered question types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.filters.keys());
  }

  /**
   * Add or update a custom quality filter for a specific type
   */
  setCustomFilter(type: string, filter: BaseQualityFilter): void {
    this.filters.set(type, filter);
  }
}

// Create and export a singleton instance
export const qualityFilterOrchestrator = new QualityFilterOrchestrator();
