"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wikiManager = exports.WikiManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const md5_1 = __importDefault(require("md5"));
const store_1 = require("../config/store");
/**
 * WikiManager handles all file operations for the wiki
 */
class WikiManager {
    wikiPath;
    constructor(wikiPath) {
        this.wikiPath = wikiPath || store_1.configStore.getWikiPath();
    }
    /**
     * Ensure wiki directory structure exists
     */
    ensureStructure() {
        const dirs = [
            this.wikiPath,
            path.join(this.wikiPath, 'decisions'),
            path.join(this.wikiPath, 'interactions'),
            path.join(this.wikiPath, 'notes'),
            path.join(this.wikiPath, 'personas'),
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    /**
     * Get wiki path
     */
    getWikiPath() {
        return this.wikiPath;
    }
    /**
     * Set wiki path
     */
    setWikiPath(wikiPath) {
        this.wikiPath = wikiPath;
    }
    /**
     * Read a wiki entry from a file
     */
    readEntry(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsed = (0, gray_matter_1.default)(fileContent);
            return {
                data: parsed.data,
                content: parsed.content,
            };
        }
        catch (error) {
            console.error(`Error reading entry ${filePath}:`, error);
            return null;
        }
    }
    /**
     * Write a wiki entry to a file
     */
    writeEntry(filePath, content, metadata) {
        const fileContent = gray_matter_1.default.stringify(content, metadata);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, fileContent, 'utf-8');
    }
    /**
     * Create a new decision entry
     */
    createDecision(title, context, decision, options) {
        const id = (0, md5_1.default)(`${title}-${Date.now()}`);
        const date = new Date().toISOString();
        const entry = {
            id,
            title,
            date,
            summary: options?.summary || decision.substring(0, 100),
            context,
            decision,
            outcome: options?.outcome,
            tags: options?.tags || [],
        };
        const fileName = `${date.split('T')[0]}-${id.substring(0, 8)}.md`;
        const filePath = path.join(this.wikiPath, 'decisions', fileName);
        this.writeEntry(filePath, decision, {
            title,
            date,
            id,
            type: 'decision',
            tags: entry.tags,
            context,
            summary: entry.summary,
            outcome: entry.outcome,
        });
        return entry;
    }
    /**
     * Create an interaction entry (chat message)
     */
    createInteraction(persona, query, response, context) {
        const id = (0, md5_1.default)(`${query}-${Date.now()}`);
        const date = new Date().toISOString();
        const entry = {
            id,
            date,
            persona,
            query,
            response,
            context,
        };
        const fileName = `${date.split('T')[0]}-${id.substring(0, 8)}.md`;
        const filePath = path.join(this.wikiPath, 'interactions', fileName);
        this.writeEntry(filePath, response, {
            title: `${persona}: ${query.substring(0, 50)}`,
            date,
            id,
            type: 'interaction',
            persona,
            query,
            context,
        });
        return entry;
    }
    /**
     * Get all decision entries
     */
    getDecisions() {
        const decisionsDir = path.join(this.wikiPath, 'decisions');
        if (!fs.existsSync(decisionsDir)) {
            return [];
        }
        const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
        const decisions = [];
        for (const file of files) {
            const filePath = path.join(decisionsDir, file);
            const entry = this.readEntry(filePath);
            if (entry) {
                decisions.push({
                    id: entry.data.id || file,
                    title: entry.data.title || 'Untitled',
                    date: entry.data.date || '',
                    summary: entry.data.summary || '',
                    context: entry.data.context || '',
                    decision: entry.content,
                    outcome: entry.data.outcome,
                    tags: entry.data.tags || [],
                });
            }
        }
        return decisions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    /**
     * Get all interaction entries
     */
    getInteractions() {
        const interactionsDir = path.join(this.wikiPath, 'interactions');
        if (!fs.existsSync(interactionsDir)) {
            return [];
        }
        const files = fs.readdirSync(interactionsDir).filter(f => f.endsWith('.md'));
        const interactions = [];
        for (const file of files) {
            const filePath = path.join(interactionsDir, file);
            const entry = this.readEntry(filePath);
            if (entry) {
                interactions.push({
                    id: entry.data.id || file,
                    date: entry.data.date || '',
                    persona: entry.data.persona || 'unknown',
                    query: entry.data.query || '',
                    response: entry.content,
                    context: entry.data.context,
                });
            }
        }
        return interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    /**
     * Search entries by query
     */
    searchEntries(query, type) {
        const results = [];
        const queryLower = query.toLowerCase();
        if (!type || type === 'decision') {
            const decisions = this.getDecisions();
            for (const decision of decisions) {
                if (decision.title.toLowerCase().includes(queryLower) ||
                    decision.summary.toLowerCase().includes(queryLower) ||
                    decision.context.toLowerCase().includes(queryLower) ||
                    decision.decision.toLowerCase().includes(queryLower)) {
                    results.push({ ...decision, entryType: 'decision' });
                }
            }
        }
        if (!type || type === 'interaction') {
            const interactions = this.getInteractions();
            for (const interaction of interactions) {
                if (interaction.query.toLowerCase().includes(queryLower) ||
                    interaction.response.toLowerCase().includes(queryLower) ||
                    (interaction.context && interaction.context.toLowerCase().includes(queryLower))) {
                    results.push({ ...interaction, entryType: 'interaction' });
                }
            }
        }
        return results;
    }
    /**
     * Get entry by ID
     */
    getEntryById(id) {
        // Search in decisions
        const decisions = this.getDecisions();
        const decision = decisions.find(d => d.id === id);
        if (decision) {
            return { ...decision, entryType: 'decision' };
        }
        // Search in interactions
        const interactions = this.getInteractions();
        const interaction = interactions.find(i => i.id === id);
        if (interaction) {
            return { ...interaction, entryType: 'interaction' };
        }
        return null;
    }
    /**
     * List all files in wiki
     */
    listFiles() {
        return {
            decisions: fs.readdirSync(path.join(this.wikiPath, 'decisions')).filter(f => f.endsWith('.md')),
            interactions: fs.readdirSync(path.join(this.wikiPath, 'interactions')).filter(f => f.endsWith('.md')),
            notes: fs.existsSync(path.join(this.wikiPath, 'notes'))
                ? fs.readdirSync(path.join(this.wikiPath, 'notes')).filter(f => f.endsWith('.md'))
                : [],
        };
    }
    /**
     * Get wiki statistics
     */
    getStats() {
        const files = this.listFiles();
        const allFiles = [
            ...files.decisions,
            ...files.interactions,
            ...files.notes,
        ];
        let lastUpdated = null;
        if (allFiles.length > 0) {
            const stats = fs.statSync(path.join(this.wikiPath, 'decisions', files.decisions[0]));
            lastUpdated = stats.mtime.toISOString();
        }
        return {
            totalDecisions: files.decisions.length,
            totalInteractions: files.interactions.length,
            totalNotes: files.notes.length,
            lastUpdated,
        };
    }
    /**
     * Update a decision with outcome
     */
    updateDecisionOutcome(id, outcome) {
        const decisionsDir = path.join(this.wikiPath, 'decisions');
        if (!fs.existsSync(decisionsDir)) {
            return false;
        }
        const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const filePath = path.join(decisionsDir, file);
            const entry = this.readEntry(filePath);
            if (entry && entry.data.id === id) {
                const updatedMetadata = {
                    ...entry.data,
                    outcome,
                    updatedAt: new Date().toISOString(),
                };
                this.writeEntry(filePath, entry.content, updatedMetadata);
                return true;
            }
        }
        return false;
    }
    /**
     * Check if wiki exists and is initialized
     */
    isInitialized() {
        return (fs.existsSync(this.wikiPath) &&
            fs.existsSync(path.join(this.wikiPath, 'decisions')));
    }
}
exports.WikiManager = WikiManager;
// Export singleton
exports.wikiManager = new WikiManager();
exports.default = exports.wikiManager;
//# sourceMappingURL=manager.js.map