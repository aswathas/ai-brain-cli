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
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCommand = chatCommand;
const readline = __importStar(require("readline"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const timeTravel_1 = require("../wiki/timeTravel");
const router_1 = require("../llm/router");
/**
 * Persona invocation pattern: @personaName message
 */
const PERSONA_PATTERN = /^@(\w+)\s+(.+)/s;
/**
 * Chat REPL command with time-travel and persona support
 */
async function chatCommand(args = {}) {
    const config = store_1.configStore.load();
    const providerName = config.defaultProvider;
    const provider = (0, router_1.getProvider)(providerName);
    if (!provider) {
        console.error(`Error: Provider '${providerName}' not found or not configured.`);
        console.log('Available providers:', (0, router_1.listProviders)().join(', '));
        return;
    }
    // Check if API key is configured (except for ollama)
    if (providerName !== 'ollama') {
        const apiKey = store_1.configStore.getAPIKey(providerName);
        if (!apiKey) {
            console.error(`Error: API key not configured for ${providerName}.`);
            console.log(`Run 'ai-brain config set-api-key ${providerName}' to configure.`);
            return;
        }
    }
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    const timeTravel = new timeTravel_1.TimeTravel(wikiManager);
    // Ensure wiki structure exists
    wikiManager.ensureStructure();
    // Get initial context (past decisions)
    let contextString = '';
    if (!args.noContext) {
        contextString = timeTravel.buildContextString('recent decisions and interactions', 5);
    }
    // Get persona system prompt
    let systemPrompt = '';
    let activePersona = args.persona;
    if (activePersona) {
        const personaConfig = store_1.configStore.getPersona(activePersona);
        if (personaConfig) {
            systemPrompt = personaConfig.systemPrompt;
        }
        else {
            console.log(`Warning: Persona '${activePersona}' not found. Available personas: ${Object.keys(config.personas).join(', ')}`);
        }
    }
    // Add auto mode system prompt
    if (args.autoMode || config.autoMode) {
        systemPrompt += '\n\n[AUTO MODE ENABLED] When responding, consider applying relevant thinking frameworks from these: First Principles, Inversion, Second Order Thinking, Circle of Competence, Pre-Mortem, Occam\'s Razor. You may reference these frameworks in your response.';
    }
    console.log('\n===========================================');
    console.log('  AI Brain Chat');
    console.log('===========================================');
    console.log(`Provider: ${provider.displayName()}`);
    if (activePersona) {
        console.log(`Persona: ${activePersona}`);
    }
    if (args.autoMode || config.autoMode) {
        console.log('Mode: AUTO (thinking frameworks enabled)');
    }
    console.log('Type @<persona> to switch personas');
    console.log('Type /exit to quit, /help for commands');
    console.log('===========================================\n');
    // If initial query provided as context, process it
    if (args.context) {
        await processQuery(args.context, provider, wikiManager, timeTravel, { systemPrompt, contextString, model: args.model });
    }
    // Create readline interface for REPL
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${activePersona ? `[${activePersona}] ` : ''}> `,
    });
    rl.prompt();
    rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
            rl.prompt();
            return;
        }
        // Handle special commands
        if (input === '/exit' || input === '/quit') {
            console.log('\nGoodbye!');
            rl.close();
            return;
        }
        if (input === '/help') {
            printHelp();
            rl.prompt();
            return;
        }
        if (input === '/personas') {
            listPersonasCommand();
            rl.prompt();
            return;
        }
        if (input.startsWith('/persona ')) {
            const newPersona = input.substring('/persona '.length).trim();
            if (newPersona) {
                const personaConfig = store_1.configStore.getPersona(newPersona);
                if (personaConfig) {
                    activePersona = newPersona;
                    systemPrompt = personaConfig.systemPrompt;
                    console.log(`Switched to persona: ${personaConfig.name}`);
                }
                else {
                    console.log(`Persona '${newPersona}' not found. Available: ${Object.keys(store_1.configStore.listPersonas()).join(', ')}`);
                }
            }
            rl.prompt();
            return;
        }
        if (input === '/persona reset') {
            activePersona = undefined;
            systemPrompt = '';
            console.log('Persona reset to default.');
            rl.prompt();
            return;
        }
        if (input === '/context') {
            const recent = timeTravel.buildContextString('', 5);
            console.log('\n--- Recent Context ---');
            console.log(recent || '(No context yet)');
            console.log('----------------------\n');
            rl.prompt();
            return;
        }
        if (input.startsWith('/search ')) {
            const query = input.substring('/search '.length).trim();
            const results = timeTravel.search(query, { limit: 5 });
            console.log('\n--- Search Results ---');
            if (results.decisions.length === 0 && results.interactions.length === 0) {
                console.log('No results found.');
            }
            else {
                if (results.decisions.length > 0) {
                    console.log('\nDecisions:');
                    for (const d of results.decisions) {
                        console.log(`  - [${d.date.split('T')[0]}] ${d.title}`);
                    }
                }
                if (results.interactions.length > 0) {
                    console.log('\nInteractions:');
                    for (const i of results.interactions) {
                        console.log(`  - [${i.date.split('T')[0]}] ${i.persona}: ${i.query.substring(0, 50)}...`);
                    }
                }
            }
            console.log('----------------------\n');
            rl.prompt();
            return;
        }
        if (input === '/auto') {
            console.log(`Auto mode: ${store_1.configStore.isAutoModeEnabled() ? 'ON' : 'OFF'}`);
            rl.prompt();
            return;
        }
        if (input.startsWith('/log ')) {
            const decision = input.substring('/log '.length).trim();
            const entry = wikiManager.createDecision('Quick decision', 'Logged from chat', decision);
            console.log(`Decision logged: ${entry.id}`);
            rl.prompt();
            return;
        }
        if (input === '/timeline') {
            const timeline = timeTravel.getTimeline();
            console.log('\n--- Decision Timeline ---');
            for (const day of timeline.slice(0, 10)) {
                console.log(`\n${day.date}:`);
                for (const d of day.decisions) {
                    console.log(`  - ${d.title}`);
                }
            }
            console.log('------------------------\n');
            rl.prompt();
            return;
        }
        // Check for persona invocation
        let query = input;
        let invokedPersona = activePersona;
        const personaMatch = input.match(PERSONA_PATTERN);
        if (personaMatch) {
            const [, personaName, queryText] = personaMatch;
            const personaConfig = store_1.configStore.getPersona(personaName);
            if (personaConfig) {
                invokedPersona = personaName;
                systemPrompt = personaConfig.systemPrompt;
                query = queryText;
                console.log(`[Using persona: ${personaConfig.name}]\n`);
            }
            else {
                console.log(`Warning: Persona '${personaName}' not found. Using default.\n`);
            }
        }
        // Get time-travel context for the query
        let queryContext = '';
        if (!args.noContext) {
            queryContext = timeTravel.buildContextString(query, 3);
        }
        // Build final system prompt
        let finalSystemPrompt = systemPrompt;
        if (queryContext) {
            finalSystemPrompt += '\n\n[Relevant past context from your history]:\n' + queryContext;
        }
        if (contextString) {
            finalSystemPrompt += '\n\n[General context]:\n' + contextString;
        }
        await processQuery(query, provider, wikiManager, timeTravel, {
            systemPrompt: finalSystemPrompt,
            persona: invokedPersona,
            model: args.model,
        });
        rl.prompt();
    });
    rl.on('close', () => {
        console.log('\nGoodbye!');
    });
}
/**
 * Process a single query
 */
async function processQuery(query, provider, wikiManager, timeTravel, options = {}) {
    const messages = [];
    if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: query });
    process.stdout.write('\nThinking...\n\n');
    try {
        const response = await provider.chat(messages, {
            model: options.model,
            temperature: 0.7,
            maxTokens: 2048,
        });
        console.log(response.content);
        // Log interaction
        if (options.persona) {
            try {
                wikiManager.createInteraction(options.persona, query, response.content, options.contextString);
            }
            catch (error) {
                // Silently fail logging
            }
        }
        console.log();
    }
    catch (error) {
        console.error(`\nError: ${error.message}`);
    }
}
/**
 * Print help text
 */
function printHelp() {
    console.log(`
Commands:
  @<persona> <message>  - Switch to a persona and send message
  /persona <name>        - Switch persona (use without message)
  /persona reset          - Reset to no persona
  /personas              - List available personas
  /context               - Show recent context from wiki
  /search <query>        - Search past decisions and interactions
  /log <decision>        - Quick log a decision
  /timeline              - Show recent decision timeline
  /auto                  - Toggle auto mode
  /exit, /quit           - Exit chat
  /help                  - Show this help
`);
}
/**
 * List personas command
 */
function listPersonasCommand() {
    const personas = store_1.configStore.listPersonas();
    console.log('\nAvailable Personas:');
    console.log('--------------------');
    for (const [key, config] of Object.entries(personas)) {
        console.log(`  @${key} - ${config.description}`);
    }
    console.log();
}
exports.default = chatCommand;
//# sourceMappingURL=chat.js.map