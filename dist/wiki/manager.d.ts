import { DecisionEntry, InteractionEntry } from '../types';
/**
 * WikiManager handles all file operations for the wiki
 */
export declare class WikiManager {
    private wikiPath;
    constructor(wikiPath?: string);
    /**
     * Ensure wiki directory structure exists
     */
    ensureStructure(): void;
    /**
     * Get wiki path
     */
    getWikiPath(): string;
    /**
     * Set wiki path
     */
    setWikiPath(wikiPath: string): void;
    /**
     * Read a wiki entry from a file
     */
    readEntry(filePath: string): {
        data: any;
        content: string;
    } | null;
    /**
     * Write a wiki entry to a file
     */
    writeEntry(filePath: string, content: string, metadata: Record<string, any>): void;
    /**
     * Create a new decision entry
     */
    createDecision(title: string, context: string, decision: string, options?: {
        outcome?: string;
        tags?: string[];
        summary?: string;
    }): DecisionEntry;
    /**
     * Create an interaction entry (chat message)
     */
    createInteraction(persona: string, query: string, response: string, context?: string): InteractionEntry;
    /**
     * Get all decision entries
     */
    getDecisions(): DecisionEntry[];
    /**
     * Get all interaction entries
     */
    getInteractions(): InteractionEntry[];
    /**
     * Search entries by query
     */
    searchEntries(query: string, type?: 'decision' | 'interaction'): any[];
    /**
     * Get entry by ID
     */
    getEntryById(id: string): any | null;
    /**
     * List all files in wiki
     */
    listFiles(): {
        decisions: string[];
        interactions: string[];
        notes: string[];
    };
    /**
     * Get wiki statistics
     */
    getStats(): {
        totalDecisions: number;
        totalInteractions: number;
        totalNotes: number;
        lastUpdated: string | null;
    };
    /**
     * Update a decision with outcome
     */
    updateDecisionOutcome(id: string, outcome: string): boolean;
    /**
     * Check if wiki exists and is initialized
     */
    isInitialized(): boolean;
}
export declare const wikiManager: WikiManager;
export default wikiManager;
//# sourceMappingURL=manager.d.ts.map