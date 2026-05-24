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
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const router_1 = require("../llm/router");
/**
 * LLM-led onboarding for initializing ai-brain
 */
async function runOnboarding() {
    console.log('\n===========================================');
    console.log('  Welcome to AI Brain! Let\'s get started.');
    console.log('===========================================\n');
    const config = store_1.configStore.load();
    // Step 1: Choose wiki location
    const { wikiPath } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'wikiPath',
            message: 'Where should we store your wiki?',
            default: config.wikiPath || path.join(process.env.HOME || process.env.USERPROFILE || '.', 'wiki'),
        },
    ]);
    // Step 2: Create wiki directory structure
    const wikiManager = new manager_1.WikiManager(wikiPath);
    wikiManager.ensureStructure();
    store_1.configStore.setWikiPath(wikiPath);
    console.log(`\nCreated wiki at: ${wikiPath}`);
    // Step 3: Choose default provider
    const { provider } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Which LLM provider would you like to use as default?',
            choices: [
                { name: 'Anthropic (Claude)', value: 'anthropic' },
                { name: 'OpenAI (GPT-4)', value: 'openai' },
                { name: 'Google (Gemini)', value: 'google' },
                { name: 'DeepSeek', value: 'deepseek' },
                { name: 'OpenRouter', value: 'openrouter' },
                { name: 'Ollama (Local)', value: 'ollama' },
            ],
        },
    ]);
    store_1.configStore.setDefaultProvider(provider);
    // Step 3b: Configure API key for the selected provider
    const providerObj = (0, router_1.getProvider)(provider);
    if (providerObj && providerObj.supportsAPIKey()) {
        const providerConfig = store_1.configStore.getProvider(provider);
        const currentKey = providerConfig?.apiKey || '';
        // Check environment variable
        const envVarMap = {
            anthropic: 'ANTHROPIC_API_KEY',
            openai: 'OPENAI_API_KEY',
            google: 'GOOGLE_API_KEY',
            deepseek: 'DEEPSEEK_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
        };
        const envKey = envVarMap[provider];
        const envValue = process.env[envKey];
        if (envValue && !currentKey) {
            console.log(`\nFound ${envKey} in environment. Using it.`);
            store_1.configStore.setAPIKey(provider, envValue);
        }
        else if (!currentKey && provider !== 'ollama') {
            const { apiKey } = await inquirer_1.default.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: `Enter your ${provider} API key (or press Enter to skip and set later):`,
                },
            ]);
            if (apiKey) {
                store_1.configStore.setAPIKey(provider, apiKey);
                console.log('API key saved!');
            }
        }
    }
    // Step 4: Enable auto mode?
    const { autoMode } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'autoMode',
            message: 'Enable Auto mode? (Automatically apply thinking frameworks)',
            default: false,
        },
    ]);
    store_1.configStore.setAutoMode(autoMode);
    // Step 5: Customize personas
    console.log('\n===========================================');
    console.log('  Personas');
    console.log('===========================================');
    console.log('\nPersonas are AI characters that can help you with different perspectives.');
    console.log('You have several built-in personas:');
    console.log('  - Socrates: Socratic questioning for clarity');
    console.log('  - Elon Musk: First principles thinking');
    console.log('  - Carolyn McKenna: Market strategy');
    console.log('  - Confucius: Wisdom and virtue');
    console.log('  - Archimedes: Mathematical problem solving');
    const { customizePersonas } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'customizePersonas',
            message: 'Would you like to customize or add personas?',
            default: false,
        },
    ]);
    if (customizePersonas) {
        console.log('\nPersona customization coming soon. Check back later!');
    }
    // Step 6: LLM-led introduction
    console.log('\n===========================================');
    console.log('  Testing your setup...');
    console.log('===========================================');
    const testProvider = (0, router_1.getProvider)(store_1.configStore.getDefaultProvider());
    if (testProvider) {
        try {
            const messages = [
                { role: 'user', content: 'Say "Hello! AI Brain is ready." in exactly those words.' },
            ];
            const response = await testProvider.chat(messages, { maxTokens: 50 });
            console.log(`\n${testProvider.displayName()} says: ${response.content}`);
        }
        catch (error) {
            console.log(`\nNote: Could not test provider: ${error.message}`);
            console.log('You can still use ai-brain. Run "ai-brain config set-api-key" to configure.');
        }
    }
    // Summary
    console.log('\n===========================================');
    console.log('  Setup Complete!');
    console.log('===========================================');
    console.log(`\nWiki path: ${store_1.configStore.getWikiPath()}`);
    console.log(`Default provider: ${store_1.configStore.getDefaultProvider()}`);
    console.log(`Auto mode: ${store_1.configStore.isAutoModeEnabled() ? 'Enabled' : 'Disabled'}`);
    console.log(`Config file: ${store_1.configStore.getConfigPath()}`);
    console.log('\nQuick start:');
    console.log('  ai-brain chat              # Start chatting');
    console.log('  ai-brain log "my decision" # Log a decision');
    console.log('  ai-brain status            # View wiki stats');
    console.log('  ai-brain help              # See all commands');
    console.log('\n');
}
exports.default = runOnboarding;
//# sourceMappingURL=init.js.map