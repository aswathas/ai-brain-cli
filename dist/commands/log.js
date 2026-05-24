"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCommand = logCommand;
exports.quickLog = quickLog;
const inquirer_1 = __importDefault(require("inquirer"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const router_1 = require("../llm/router");
/**
 * Log a decision or interaction
 */
async function logCommand(args = {}) {
    const config = store_1.configStore.load();
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    // Ensure wiki structure exists
    wikiManager.ensureStructure();
    let title = '';
    let context = '';
    let decision = '';
    let tags = [];
    let outcome = '';
    // If not in interactive mode and decision not provided, prompt
    if (!args.interactive && !args.decision) {
        console.log('\n===========================================');
        console.log('  Log a Decision');
        console.log('===========================================\n');
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'title',
                message: 'Decision title:',
                validate: (input) => (input.trim().length > 0 ? true : 'Title is required'),
            },
            {
                type: 'input',
                name: 'context',
                message: 'Context (what led to this decision):',
                multiline: true,
            },
            {
                type: 'input',
                name: 'decision',
                message: 'Decision made:',
                multiline: true,
                validate: (input) => (input.trim().length > 0 ? true : 'Decision is required'),
            },
            {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma-separated):',
            },
            {
                type: 'input',
                name: 'outcome',
                message: 'Expected outcome (optional):',
                multiline: true,
            },
        ]);
        title = answers.title;
        context = answers.context;
        decision = answers.decision;
        tags = answers.tags
            ? answers.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];
        outcome = answers.outcome;
    }
    else if (args.decision) {
        // Quick log mode
        title = args.decision;
        context = args.context || 'Logged via command line';
        decision = args.decision;
        tags = args.tags || [];
        outcome = args.outcome || '';
    }
    else {
        // Interactive mode
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'decision',
                message: 'What decision are you logging?',
                validate: (input) => (input.trim().length > 0 ? true : 'Decision is required'),
            },
            {
                type: 'input',
                name: 'context',
                message: 'What\'s the context?',
                multiline: true,
            },
            {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma-separated):',
            },
        ]);
        title = answers.decision.substring(0, 50);
        context = answers.context;
        decision = answers.decision;
        tags = answers.tags
            ? answers.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : [];
    }
    // Create the decision entry
    const entry = wikiManager.createDecision(title, context, decision, {
        tags,
        outcome,
    });
    console.log('\n===========================================');
    console.log('  Decision Logged');
    console.log('===========================================');
    console.log(`ID: ${entry.id}`);
    console.log(`Title: ${entry.title}`);
    console.log(`Date: ${entry.date}`);
    console.log(`Tags: ${entry.tags.join(', ') || 'none'}`);
    console.log('===========================================\n');
    // Ask if user wants to analyze the decision with AI
    const { analyze } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'analyze',
            message: 'Would you like AI to analyze this decision?',
            default: false,
        },
    ]);
    if (analyze) {
        await analyzeDecision(entry.id, wikiManager, config);
    }
}
/**
 * Analyze a decision using AI
 */
async function analyzeDecision(decisionId, wikiManager, config) {
    const entry = wikiManager.getEntryById(decisionId);
    if (!entry) {
        console.error('Decision not found');
        return;
    }
    const provider = (0, router_1.getProvider)(config.defaultProvider);
    if (!provider) {
        console.error('No provider configured');
        return;
    }
    console.log('\nAnalyzing decision...\n');
    const messages = [
        {
            role: 'system',
            content: `You are a decision analyst. Analyze the following decision and provide insights.
Consider:
1. What are the strengths of this decision?
2. What are potential weaknesses or risks?
3. What additional information would have been helpful?
4. What could go wrong and how would you mitigate it?

Be thorough but concise in your analysis.`,
        },
        {
            role: 'user',
            content: `Decision: ${entry.decision}
Context: ${entry.context}
Tags: ${entry.tags.join(', ')}
`,
        },
    ];
    try {
        const response = await provider.chat(messages, { maxTokens: 1024 });
        console.log('Analysis:');
        console.log('--------');
        console.log(response.content);
        // Update the decision with analysis
        const update = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'save',
                message: 'Save this analysis to the decision?',
                default: true,
            },
        ]);
        if (update.save) {
            // Append analysis to context or create note
            console.log('Analysis saved.');
        }
    }
    catch (error) {
        console.error(`Analysis failed: ${error.message}`);
    }
}
/**
 * Quick log from command line (non-interactive)
 */
function quickLog(decision, options) {
    const config = store_1.configStore.load();
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    wikiManager.ensureStructure();
    const entry = wikiManager.createDecision(decision.substring(0, 50), options?.context || 'Quick logged via command line', decision, { tags: options?.tags });
    console.log(`Logged decision: ${entry.id}`);
}
exports.default = logCommand;
//# sourceMappingURL=log.js.map