#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chat_1 = require("./commands/chat");
const init_1 = __importDefault(require("./commands/init"));
const ingest_1 = require("./commands/ingest");
const log_1 = require("./commands/log");
const lint_1 = require("./commands/lint");
const review_1 = require("./commands/review");
const status_1 = require("./commands/status");
const persona_1 = require("./commands/persona");
const config_1 = require("./commands/config");
const store_1 = require("./config/store");
const router_1 = require("./llm/router");
const manager_1 = require("./wiki/manager");
const chalk_1 = __importDefault(require("chalk"));
/**
 * AI Brain CLI - Personal wiki with AI-powered context and personas
 */
// Create main program
const program = new commander_1.Command();
// Version
const packageJson = require('../package.json');
program.version(packageJson.version);
// Global options
program
    .option('-h, --help', 'Display help information');
// ============================================
// INIT COMMAND
// ============================================
program
    .command('init')
    .description('Initialize AI Brain with LLM-led onboarding')
    .action(async () => {
    try {
        await (0, init_1.default)();
    }
    catch (error) {
        console.error(chalk_1.default.red('Error during initialization:'), error.message);
        process.exit(1);
    }
});
// ============================================
// CHAT COMMAND
// ============================================
program
    .command('chat')
    .description('Start an interactive chat REPL')
    .option('-p, --persona <name>', 'Start with a specific persona')
    .option('-a, --auto', 'Enable auto mode with thinking frameworks')
    .option('-c, --context <text>', 'Provide initial context/query')
    .option('-m, --model <model>', 'Specify model to use')
    .option('--no-context', 'Disable time-travel context')
    .action(async (options) => {
    try {
        await (0, chat_1.chatCommand)({
            persona: options.persona,
            autoMode: options.auto,
            context: options.context,
            model: options.model,
            noContext: options.noContext,
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Chat error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// LOG COMMAND
// ============================================
program
    .command('log [decision]')
    .description('Log a decision with context')
    .option('-c, --context <text>', 'Decision context')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-o, --outcome <text>', 'Expected outcome')
    .option('-i, --interactive', 'Interactive mode')
    .action(async (decision, options) => {
    try {
        await (0, log_1.logCommand)({
            decision,
            context: options.context,
            tags: options.tags ? options.tags.split(',').map((t) => t.trim()) : [],
            outcome: options.outcome,
            interactive: options.interactive,
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error logging decision:'), error.message);
        process.exit(1);
    }
});
// ============================================
// INGEST COMMAND
// ============================================
program
    .command('ingest [path]')
    .description('Ingest a file or directory into the wiki')
    .action(async (filePath) => {
    try {
        await (0, ingest_1.ingestCommand)(filePath);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error ingesting:'), error.message);
        process.exit(1);
    }
});
// ============================================
// LINT COMMAND
// ============================================
program
    .command('lint')
    .description('Run health check on wiki')
    .option('-f, --fix', 'Attempt to fix issues automatically')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (options) => {
    try {
        await (0, lint_1.lintCommand)({ fix: options.fix, verbose: options.verbose });
    }
    catch (error) {
        console.error(chalk_1.default.red('Lint error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// REVIEW COMMAND
// ============================================
program
    .command('review')
    .description('Periodic review of past decisions')
    .option('-s, --since <days>', 'Review decisions from the last N days', '7')
    .option('-p, --persona <name>', 'Persona to use for review')
    .action(async (options) => {
    try {
        await (0, review_1.reviewCommand)({
            since: parseInt(options.since, 10),
            persona: options.persona,
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Review error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// STATUS COMMAND
// ============================================
program
    .command('status')
    .description('Show wiki statistics and status')
    .action(async () => {
    try {
        await (0, status_1.statusCommand)();
    }
    catch (error) {
        console.error(chalk_1.default.red('Status error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// PERSONA COMMAND
// ============================================
const personaCmd = program
    .command('persona')
    .description('Manage personas');
personaCmd
    .command('list')
    .description('List all personas')
    .action(async () => {
    try {
        await (0, persona_1.personaCommand)({ action: 'list' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
personaCmd
    .command('add [name]')
    .description('Add a new persona')
    .action(async (name) => {
    try {
        await (0, persona_1.personaCommand)({ action: 'add', name });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
personaCmd
    .command('remove <name>')
    .description('Remove a persona')
    .action(async (name) => {
    try {
        await (0, persona_1.personaCommand)({ action: 'remove', name });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
personaCmd
    .command('edit [name]')
    .description('Edit an existing persona')
    .action(async (name) => {
    try {
        await (0, persona_1.personaCommand)({ action: 'edit', name });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// Fallback for direct `persona` command without subcommand
personaCmd.action(async () => {
    try {
        await (0, persona_1.personaCommand)({ action: 'list' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// CONFIG COMMAND
// ============================================
const configCmd = program
    .command('config')
    .description('Manage configuration');
configCmd
    .command('show')
    .description('Show current configuration')
    .action(async () => {
    try {
        await (0, config_1.configCommand)({ action: 'show' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
configCmd
    .command('set-provider [provider]')
    .description('Set default provider')
    .action(async (provider) => {
    try {
        await (0, config_1.configCommand)({ action: 'set-provider', provider });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
configCmd
    .command('set-api-key [provider]')
    .description('Set API key for a provider')
    .option('-k, --key <key>', 'API key value')
    .action(async (provider, options) => {
    try {
        await (0, config_1.configCommand)({ action: 'set-api-key', provider, key: options.key });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
configCmd
    .command('set-wiki-path [path]')
    .description('Set wiki path')
    .action(async (newPath) => {
    try {
        await (0, config_1.configCommand)({ action: 'set-wiki-path', provider: newPath });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async () => {
    try {
        await (0, config_1.configCommand)({ action: 'reset' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// Fallback for direct `config` command without subcommand
configCmd.action(async () => {
    try {
        await (0, config_1.configCommand)({ action: 'show' });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// PROVIDERS COMMAND
// ============================================
program
    .command('providers')
    .description('List available LLM providers')
    .action(async () => {
    try {
        const config = store_1.configStore.load();
        const router = new (require('./llm/router').ProviderRouter)();
        console.log('\nAvailable Providers:');
        console.log('-------------------\n');
        for (const providerName of (0, router_1.listProviders)()) {
            const provider = (0, router_1.getProvider)(providerName);
            const isAvailable = router.isAvailable(providerName);
            const provConfig = config.providers?.[providerName];
            if (provider) {
                const status = isAvailable ? chalk_1.default.green('[+]') : chalk_1.default.red('[-]');
                console.log(`  ${status} ${chalk_1.default.cyan(providerName.padEnd(12))} ${provider.displayName()}`);
                if (provConfig?.defaultModel) {
                    console.log(`      Model: ${provConfig.defaultModel}`);
                }
            }
        }
        console.log(`\nDefault: ${config.defaultProvider}`);
        console.log();
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// SEARCH COMMAND
// ============================================
program
    .command('search <query>')
    .description('Search past decisions and interactions')
    .option('-t, --type <type>', 'Filter by type: decision, interaction, or all')
    .option('-l, --limit <n>', 'Limit results', '10')
    .action(async (query, options) => {
    try {
        const { TimeTravel } = require('./wiki/timeTravel');
        const { WikiManager } = require('./wiki/manager');
        const config = store_1.configStore.load();
        const wikiManager = new WikiManager(config.wikiPath);
        const timeTravel = new TimeTravel(wikiManager);
        const type = options.type === 'decision' ? 'decision'
            : options.type === 'interaction' ? 'interaction' : 'all';
        const results = timeTravel.search(query, {
            limit: parseInt(options.limit, 10),
            type,
        });
        console.log('\n===========================================');
        console.log(`  Search: "${query}"`);
        console.log('===========================================\n');
        if (results.decisions.length > 0) {
            console.log(chalk_1.default.bold(`Decisions (${results.decisions.length}):`));
            for (const d of results.decisions) {
                console.log(`  [${d.date.split('T')[0]}] ${d.title}`);
                if (options.verbose) {
                    console.log(`    ${d.summary || d.decision.substring(0, 100)}...`);
                }
            }
            console.log();
        }
        if (results.interactions.length > 0) {
            console.log(chalk_1.default.bold(`Interactions (${results.interactions.length}):`));
            for (const i of results.interactions) {
                console.log(`  [${i.date.split('T')[0]}] @${i.persona}: ${i.query.substring(0, 50)}...`);
            }
            console.log();
        }
        if (results.decisions.length === 0 && results.interactions.length === 0) {
            console.log('No results found.\n');
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Search error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// TIMELINE COMMAND
// ============================================
program
    .command('timeline')
    .description('Show decision timeline')
    .option('-l, --limit <days>', 'Show last N days', '30')
    .action(async (options) => {
    try {
        const { TimeTravel } = require('./wiki/timeTravel');
        const { WikiManager } = require('./wiki/manager');
        const config = store_1.configStore.load();
        const wikiManager = new WikiManager(config.wikiPath);
        const timeTravel = new TimeTravel(wikiManager);
        const days = parseInt(options.limit, 10);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);
        const timeline = timeTravel.getTimeline(sinceDate);
        console.log('\n===========================================');
        console.log(`  Decision Timeline (last ${days} days)`);
        console.log('===========================================\n');
        if (timeline.length === 0) {
            console.log('No decisions in this period.\n');
            return;
        }
        for (const day of timeline) {
            console.log(chalk_1.default.bold(`${day.date}:`));
            for (const decision of day.decisions) {
                console.log(`  - ${decision.title}`);
                if (decision.tags && decision.tags.length > 0) {
                    console.log(`    Tags: ${decision.tags.join(', ')}`);
                }
            }
            console.log();
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Timeline error:'), error.message);
        process.exit(1);
    }
});
// ============================================
// HELP COMMAND
// ============================================
program
    .command('help')
    .description('Display help information')
    .alias('h')
    .action(() => {
    program.help();
});
// ============================================
// MAIN
// ============================================
// If no arguments, show help
if (process.argv.length === 2) {
    // Check if wiki is initialized
    try {
        const config = store_1.configStore.load();
        const wikiManager = new manager_1.WikiManager(config.wikiPath);
        if (!wikiManager.isInitialized()) {
            console.log(chalk_1.default.yellow('\nAI Brain not initialized.'));
            console.log('Run "ai-brain init" to get started.\n');
        }
    }
    catch (error) {
        // Config might not exist yet
    }
    program.help();
}
// Parse and execute
program.parse(process.argv);
// Handle unknown commands gracefully
const unknownOptions = process.argv.slice(2).filter(arg => arg.startsWith('-') && !program.options.some((o) => o.short === arg.slice(1) || o.long === arg.slice(2)));
if (unknownOptions.length > 0) {
    console.log(chalk_1.default.yellow(`Unknown option(s): ${unknownOptions.join(', ')}`));
    console.log('Use "ai-brain help" for available commands.\n');
    process.exit(1);
}
//# sourceMappingURL=index.js.map