import { DecisionEntry, InteractionEntry } from '../types';
import { WikiManager } from './manager';
/**
 * Thinking frameworks for auto mode
 */
export declare const THINKING_FRAMEWORKS: {
    name: string;
    description: string;
    prompt: string;
}[];
/**
 * TimeTravel search for past decisions and interactions
 */
export declare class TimeTravel {
    private wikiManager;
    constructor(wikiManager?: WikiManager);
    /**
     * Search for relevant past decisions and interactions
     */
    search(query: string, options?: {
        limit?: number;
        type?: 'decision' | 'interaction' | 'all';
        since?: Date;
    }): {
        decisions: DecisionEntry[];
        interactions: InteractionEntry[];
    };
    /**
     * Calculate simple relevance score based on term frequency
     */
    private calculateRelevance;
    /**
     * Get recent decisions
     */
    getRecentDecisions(limit?: number): DecisionEntry[];
    /**
     * Get recent interactions with a persona
     */
    getRecentInteractions(persona?: string, limit?: number): InteractionEntry[];
    /**
     * Get decisions related to a specific decision
     */
    getRelatedDecisions(decisionId: string): DecisionEntry[];
    /**
     * Get timeline of decisions
     */
    getTimeline(startDate?: Date, endDate?: Date): {
        date: string;
        decisions: DecisionEntry[];
    }[];
    /**
     * Build context string from past decisions for LLM prompt
     */
    buildContextString(query: string, limit?: number): string;
    /**
     * Get thinking framework for auto mode
     */
    getFramework(index?: number): typeof THINKING_FRAMEWORKS[0] | null;
    /**
     * Apply thinking framework to query
     */
    applyFramework(query: string, frameworkIndex?: number): string;
}
export declare const timeTravel: TimeTravel;
export default timeTravel;
//# sourceMappingURL=timeTravel.d.ts.map