// Re-export the modular quality filter system
export { QualityFilterOrchestrator, qualityFilterOrchestrator } from './quality-filters/QualityFilterOrchestrator';
export type { QualityRatingRequest, QualityRatingResponse } from './quality-filters/BaseQualityFilter';

// Legacy compatibility - delegate to the modular system
import { qualityFilterOrchestrator } from './quality-filters/QualityFilterOrchestrator';

/**
 * Legacy compatibility function - delegates to modular system
 * @deprecated Use qualityFilterOrchestrator.rateQuestionQuality() directly
 */
export async function rateQuestionQuality(question: any): Promise<any> {
  return await qualityFilterOrchestrator.rateQuestionQuality(question);
}

/**
 * Legacy compatibility function - delegates to modular system
 * @deprecated Use qualityFilterOrchestrator.shouldKeepQuestion() directly
 */
export async function shouldKeepQuestion(question: any, isPremium: boolean = false): Promise<boolean> {
  return await qualityFilterOrchestrator.shouldKeepQuestion(question, isPremium);
}

/**
 * Legacy compatibility function - delegates to modular system
 * @deprecated Use qualityFilterOrchestrator.displayQualityRatingSummary() directly
 */
export function displayQualityRatingSummary(): void {
  qualityFilterOrchestrator.displayQualityRatingSummary();
}
