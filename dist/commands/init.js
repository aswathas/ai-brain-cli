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
exports.runOnboarding = runOnboarding;
const inquirer_1 = __importDefault(require("inquirer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const router_1 = require("../llm/router");
/**
 * LLM-led onboarding - conversational setup like Claude Code
 * The AI asks questions naturally to understand the user deeply
 */
async function runOnboarding() {
    console.log();
    console.log(chalk_1.default.bold.cyan('━'.repeat(50)));
    console.log(chalk_1.default.bold.cyan('  AI Brain — First Time Setup'));
    console.log(chalk_1.default.bold.cyan('━'.repeat(50)));
    console.log();
    console.log(chalk_1.default.white('  I\'m going to ask you some questions to get to know you.'));
    console.log(chalk_1.default.white('  This helps me give better advice and remember your context.'));
    console.log(chalk_1.default.dim('  Take your time - there\'s no rush.\n'));
    // Step 1: Configure provider first (need AI to chat)
    const providerName = await askProvider();
    // Step 2: Set wiki location
    const wikiPath = await askWikiPath();
    // Step 3: Create wiki structure
    const wikiManager = new manager_1.WikiManager(wikiPath);
    wikiManager.ensureStructure();
    store_1.configStore.setWikiPath(wikiPath);
    console.log(chalk_1.default.green(`\n  ✓ Created your wiki at: ${wikiPath}\n`));
    // Step 4: LLM-led deep profiling
    await runProfilingInterview(wikiManager);
    // Summary
    console.log(chalk_1.default.bold.cyan('\n━'.repeat(50)));
    console.log(chalk_1.default.bold.cyan('  All Set!'));
    console.log(chalk_1.default.bold.cyan('━'.repeat(50)));
    console.log();
    console.log(chalk_1.default.white(`  Wiki: ${wikiPath}`));
    console.log(chalk_1.default.white(`  Provider: ${providerName}`));
    console.log();
    console.log(chalk_1.default.green('  Ready to start. Type: ai-brain\n'));
}
/**
 * Ask user to choose a provider
 */
async function askProvider() {
    console.log(chalk_1.default.bold.cyan('  Step 1: Choose your AI provider'));
    console.log(chalk_1.default.dim('  (This is the AI model that powers your brain)\n'));
    const choices = (0, router_1.listProviders)().map(p => ({
        name: getProviderDisplayName(p),
        value: p,
    }));
    const { provider } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Which AI provider would you like to use?',
            choices,
        },
    ]);
    store_1.configStore.setDefaultProvider(provider);
    // Check for API key in environment
    const envVarMap = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
        openrouter: 'OPENROUTER_API_KEY',
        minimax: 'ANTHROPIC_AUTH_TOKEN',
    };
    const envKey = envVarMap[provider];
    const envValue = envKey ? process.env[envKey] : '';
    if (envValue) {
        console.log(chalk_1.default.green(`\n  Found ${envKey} in environment ✓`));
        store_1.configStore.setAPIKey(provider, envValue);
    }
    else {
        console.log(chalk_1.default.dim(`\n  No API key found in environment.`));
        const { apiKey } = await inquirer_1.default.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter your ${provider} API key:`,
            },
        ]);
        if (apiKey) {
            store_1.configStore.setAPIKey(provider, apiKey);
            console.log(chalk_1.default.green('  API key saved ✓'));
        }
    }
    return provider;
}
/**
 * Get display name for provider
 */
function getProviderDisplayName(p) {
    const names = {
        anthropic: 'Anthropic (Claude)',
        openai: 'OpenAI (GPT-4)',
        google: 'Google (Gemini)',
        deepseek: 'DeepSeek',
        openrouter: 'OpenRouter (multiple models)',
        ollama: 'Ollama (local models)',
        minimax: 'MiniMax',
    };
    return names[p] || p;
}
/**
 * Ask for wiki path
 */
async function askWikiPath() {
    const defaultPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'wiki');
    const config = store_1.configStore.load();
    console.log(chalk_1.default.bold.cyan('\n  Step 2: Where should I store your brain?'));
    console.log(chalk_1.default.dim('  (All your decisions, interactions, and profile will be saved here)\n'));
    const { wikiPath } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'wikiPath',
            message: 'Wiki folder location:',
            default: config.wikiPath || defaultPath,
        },
    ]);
    return wikiPath;
}
/**
 * LLM-led profiling interview - asks questions to deeply understand the user
 */
async function runProfilingInterview(wikiManager) {
    const provider = (0, router_1.getProvider)(store_1.configStore.getDefaultProvider());
    if (!provider) {
        console.log(chalk_1.default.yellow('\n  Skipping profiling - no provider configured.\n'));
        return;
    }
    console.log(chalk_1.default.bold.cyan('\n  Step 3: Let\'s get to know each other'));
    console.log(chalk_1.default.dim('  (I\'ll ask questions to understand your context)\n'));
    const profilingQuestions = [
        {
            tag: 'identity',
            question: 'What should I call you? And what do you do for work or life?',
            file: 'profile/identity.md',
        },
        {
            tag: 'values',
            question: 'What matters most to you in life? (Family, freedom, growth, impact...)',
            file: 'profile/values.md',
        },
        {
            tag: 'goals',
            question: 'What are you working toward right now? Any big goals or decisions ahead?',
            file: 'profile/goals.md',
        },
        {
            tag: 'strengths',
            question: 'What are you naturally good at? What do people often ask for your help with?',
            file: 'profile/mind.md',
        },
        {
            tag: 'challenges',
            question: 'What challenges are you facing? What decisions are you wrestling with?',
            file: 'profile/mind.md',
            append: true,
        },
        {
            tag: 'financial',
            question: 'How would you describe your financial situation? (Just high-level - comfortable, building, struggling?)',
            file: 'profile/financial.md',
        },
        {
            tag: 'health',
            question: 'Any health priorities or conditions I should know about?',
            file: 'profile/health.md',
        },
        {
            tag: 'relationships',
            question: 'What does your circle of people look like? (Close family, friends, community)',
            file: 'profile/relationships.md',
        },
    ];
    // Ask each question via LLM and save response
    for (const item of profilingQuestions) {
        try {
            // First check if we already have this info
            const existingPath = path.join(wikiManager.getWikiPath(), item.file);
            console.log(chalk_1.default.dim(`  Asking about ${item.tag}...`));
            // Create a conversation to ask the question naturally
            const systemPrompt = `You are a friendly AI companion doing initial setup. Ask the user the following question in a warm, conversational way (1-2 sentences max). Do NOT be verbose. Just ask the question clearly.`;
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: item.question },
            ];
            const response = await provider.chat(messages, { maxTokens: 100 });
            const aiQuestion = response.content;
            console.log(chalk_1.default.white(`\n  ${aiQuestion}`));
            // Get user response
            const { answer } = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'answer',
                    message: 'Your response:',
                },
            ]);
            if (answer && answer.trim()) {
                // Save to profile file
                const content = `---
created: ${new Date().toISOString().split('T')[0]}
tag: ${item.tag}
---

# ${item.tag.charAt(0).toUpperCase() + item.tag.slice(1)}

${answer.trim()}

`;
                // Ensure directory exists
                const dir = path.dirname(existingPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.appendFileSync(existingPath, content);
                console.log(chalk_1.default.green(`  ✓ Saved to ${item.tag}\n`));
            }
        }
        catch (error) {
            console.log(chalk_1.default.yellow(`  Could not ask about ${item.tag}: ${error.message}\n`));
        }
    }
    // Create the main user profile summary
    await createUserSummary(wikiManager);
    console.log(chalk_1.default.green('\n  ✓ Profiling complete! I now know you better.\n'));
}
/**
 * Create a summary of user profile from all collected info
 */
async function createUserSummary(wikiManager) {
    const profileDir = path.join(wikiManager.getWikiPath(), 'profile');
    // Compile all profile info
    let summary = '# User Summary\n\n';
    summary += `*Generated during onboarding: ${new Date().toLocaleDateString()}*\n\n`;
    const profileFiles = ['identity.md', 'values.md', 'goals.md', 'mind.md', 'financial.md', 'health.md', 'relationships.md'];
    for (const file of profileFiles) {
        const filePath = path.join(profileDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Extract just the user's answers (skip frontmatter)
            const match = content.match(/^# .+\n\n(.+)/s);
            if (match) {
                summary += `## ${file.replace('.md', '')}\n${match[1]}\n\n`;
            }
        }
    }
    // Save to user.md
    const userPath = path.join(wikiManager.getWikiPath(), 'user.md');
    fs.writeFileSync(userPath, summary);
    // Also update memory.md with current context
    const memoryPath = path.join(wikiManager.getWikiPath(), 'memory.md');
    const memoryContent = `# Memory

*Last updated: ${new Date().toISOString().split('T')[0]}*

## Current Context
- Just completed onboarding
- Wiki initialized and configured

## Active Projects
(TBD - to be filled during conversations)

## Recent Decisions
(TBD - filled as you make decisions)

## Open Questions
- What is the user working on right now?
- Any pending decisions or follow-ups?

## Notes
(TBD - updated during conversations)
`;
    fs.writeFileSync(memoryPath, memoryContent);
}
exports.default = runOnboarding;
//# sourceMappingURL=init.js.map