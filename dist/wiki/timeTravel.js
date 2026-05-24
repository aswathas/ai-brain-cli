"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeTravel = exports.TimeTravel = exports.THINKING_FRAMEWORKS = void 0;
const manager_1 = require("./manager");
/**
 * Thinking frameworks for auto mode
 */
exports.THINKING_FRAMEWORKS = [
    {
        name: 'First Principles',
        description: 'Break down problems to fundamental truths',
        prompt: 'Break this down to first principles. What do we know to be absolutely true?',
    },
    {
        name: 'Inversion',
        description: 'Think about the opposite',
        prompt: 'Consider the inverse. What if we did the opposite? What would happen?',
    },
    {
        name: 'Second Order',
        description: 'Consider consequences of consequences',
        prompt: 'Think about second-order effects. What happens after what happens?',
    },
    {
        name: 'Circle of Competence',
        description: 'Know what you know and don\'t know',
        prompt: 'Are we within our circle of competence here? What do we not know that we need to know?',
    },
    {
        name: 'Pre-Mortem',
        description: 'Imagine failure and work backward',
        prompt: 'Imagine this failed spectacularly. Why did it fail? Work backward from that.',
    },
    {
        name: 'Occam\'s Razor',
        description: 'Simplest explanation is often best',
        prompt: 'What is the simplest explanation? What假设 are we making that could be wrong?',
    },
];
/**
 * TimeTravel search for past decisions and interactions
 */
class TimeTravel {
    wikiManager;
    constructor(wikiManager) {
        this.wikiManager = wikiManager || new manager_1.WikiManager();
    }
    /**
     * Search for relevant past decisions and interactions
     */
    search(query, options) {
        const limit = options?.limit || 10;
        const type = options?.type || 'all';
        const results = this.wikiManager.searchEntries(query);
        const decisions = [];
        const interactions = [];
        for (const result of results) {
            if (result.entryType === 'decision') {
                if (type === 'all' || type === 'decision') {
                    decisions.push(result);
                }
            }
            else if (result.entryType === 'interaction') {
                if (type === 'all' || type === 'interaction') {
                    interactions.push(result);
                }
            }
            // Apply date filter
            if (options?.since) {
                const entryDate = new Date(result.date);
                if (entryDate < options.since) {
                    continue;
                }
            }
        }
        // Sort by relevance (simple text matching score)
        const scoredDecisions = decisions.map(d => ({
            entry: d,
            score: this.calculateRelevance(query, d),
        }));
        const scoredInteractions = interactions.map(i => ({
            entry: i,
            score: this.calculateRelevance(query, i),
        }));
        // Sort by score descending
        scoredDecisions.sort((a, b) => b.score - a.score);
        scoredInteractions.sort((a, b) => b.score - a.score);
        return {
            decisions: scoredDecisions.slice(0, limit).map(s => s.entry),
            interactions: scoredInteractions.slice(0, limit).map(s => s.entry),
        };
    }
    /**
     * Calculate simple relevance score based on term frequency
     */
    calculateRelevance(query, entry) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        let score = 0;
        const title = (entry.title || '').toLowerCase();
        const summary = (entry.summary || '').toLowerCase();
        const context = (entry.context || '').toLowerCase();
        const decision = (entry.decision || '').toLowerCase();
        const query_text = (entry.query || '').toLowerCase();
        const response = (entry.response || '').toLowerCase();
        for (const term of queryTerms) {
            if (title.includes(term))
                score += 10;
            if (summary.includes(term))
                score += 5;
            if (context.includes(term))
                score += 3;
            if (decision.includes(term))
                score += 2;
            if (query_text.includes(term))
                score += 2;
            if (response.includes(term))
                score += 1;
        }
        return score;
    }
    /**
     * Get recent decisions
     */
    getRecentDecisions(limit = 10) {
        const decisions = this.wikiManager.getDecisions();
        return decisions.slice(0, limit);
    }
    /**
     * Get recent interactions with a persona
     */
    getRecentInteractions(persona, limit = 10) {
        let interactions = this.wikiManager.getInteractions();
        if (persona) {
            interactions = interactions.filter(i => i.persona.toLowerCase() === persona.toLowerCase());
        }
        return interactions.slice(0, limit);
    }
    /**
     * Get decisions related to a specific decision
     */
    getRelatedDecisions(decisionId) {
        const decision = this.wikiManager.getEntryById(decisionId);
        if (!decision)
            return [];
        const relatedTags = decision.tags || [];
        const allDecisions = this.wikiManager.getDecisions();
        const related = allDecisions
            .filter(d => {
            if (d.id === decisionId)
                return false;
            return d.tags?.some(tag => relatedTags.includes(tag));
        })
            .slice(0, 5);
        return related;
    }
    /**
     * Get timeline of decisions
     */
    getTimeline(startDate, endDate) {
        const decisions = this.wikiManager.getDecisions();
        const filtered = decisions.filter(d => {
            const date = new Date(d.date);
            if (startDate && date < startDate)
                return false;
            if (endDate && date > endDate)
                return false;
            return true;
        });
        // Group by date
        const groups = new Map();
        for (const decision of filtered) {
            const dateKey = decision.date.split('T')[0];
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey).push(decision);
        }
        // Convert to array and sort by date descending
        return Array.from(groups.entries())
            .map(([date, decisions]) => ({ date, decisions }))
            .sort((a, b) => b.date.localeCompare(a.date));
    }
    /**
     * Build context string from past decisions for LLM prompt
     */
    buildContextString(query, limit = 5) {
        const results = this.search(query, { limit });
        let context = '';
        if (results.decisions.length > 0) {
            context += '## Relevant Past Decisions\n\n';
            for (const decision of results.decisions) {
                context += `### ${decision.title} (${decision.date.split('T')[0]})\n`;
                context += `${decision.summary || decision.decision.substring(0, 200)}...\n\n`;
                if (decision.outcome) {
                    context += `Outcome: ${decision.outcome}\n`;
                }
                context += '\n';
            }
        }
        if (results.interactions.length > 0) {
            context += '## Relevant Past Interactions\n\n';
            for (const interaction of results.interactions) {
                context += `### ${interaction.persona} (${interaction.date.split('T')[0]})\n`;
                context += `Q: ${interaction.query.substring(0, 100)}...\n`;
                context += `A: ${interaction.response.substring(0, 100)}...\n\n`;
            }
        }
        return context;
    }
    /**
     * Get thinking framework for auto mode
     */
    getFramework(index) {
        if (index !== undefined) {
            return exports.THINKING_FRAMEWORKS[index % exports.THINKING_FRAMEWORKS.length] || null;
        }
        // Return random framework
        return exports.THINKING_FRAMEWORKS[Math.floor(Math.random() * exports.THINKING_FRAMEWORKS.length)];
    }
    /**
     * Apply thinking framework to query
     */
    applyFramework(query, frameworkIndex) {
        const framework = this.getFramework(frameworkIndex);
        if (!framework)
            return query;
        return `${framework.prompt}\n\nQuestion: ${query}`;
    }
}
exports.TimeTravel = TimeTravel;
// Export singleton
exports.timeTravel = new TimeTravel();
exports.default = exports.timeTravel;
//# sourceMappingURL=timeTravel.js.map