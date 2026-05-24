"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = configCommand;
exports.listProvidersWithStatus = listProvidersWithStatus;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../config/store");
const router_1 = require("../llm/router");
/**
 * Manage provider configuration
 */
async function configCommand(args = {}) {
    const action = args.action || 'show';
    switch (action) {
        case 'show':
            await showConfig();
            break;
        case 'set-provider':
            await setDefaultProvider(args.provider);
            break;
        case 'set-api-key':
            await setAPIKey(args.provider, args.key);
            break;
        case 'set-wiki-path':
            await setWikiPath(args.provider);
            break;
        case 'reset':
            await resetConfig();
            break;
        default:
            console.log('Invalid action.');
            console.log('Available actions: show, set-provider, set-api-key, set-wiki-path, reset');
    }
}
/**
 * Show current configuration
 */
async function showConfig() {
    const config = store_1.configStore.load();
    console.log('\n===========================================');
    console.log('  AI Brain Configuration');
    console.log('===========================================\n');
    console.log(chalk_1.default.bold('Wiki:'));
    console.log(`  Path: ${config.wikiPath}`);
    console.log();
    console.log(chalk_1.default.bold('Default Provider:'));
    console.log(`  ${config.defaultProvider}`);
    console.log();
    console.log(chalk_1.default.bold('Available Providers:'));
    const router = new router_1.ProviderRouter();
    for (const providerName of (0, router_1.listProviders)()) {
        const provider = (0, router_1.getProvider)(providerName);
        const provConfig = config.providers?.[providerName];
        const isAvailable = router.isAvailable(providerName);
        if (provider) {
            console.log(`  ${chalk_1.default.cyan(providerName)}`);
            console.log(`    Display: ${provider.displayName()}`);
            console.log(`    Available: ${isAvailable ? chalk_1.default.green('Yes') : chalk_1.default.red('No')}`);
            if (provConfig?.apiKey) {
                const maskedKey = provConfig.apiKey.substring(0, 4) + '...' + provConfig.apiKey.substring(provConfig.apiKey.length - 4);
                console.log(`    API Key: ${maskedKey}`);
            }
            else {
                console.log(`    API Key: ${chalk_1.default.gray('Not set')}`);
            }
            if (provConfig?.defaultModel) {
                console.log(`    Default Model: ${provConfig.defaultModel}`);
            }
            console.log();
        }
    }
    console.log(chalk_1.default.bold('Personas:'));
    const personas = store_1.configStore.listPersonas();
    console.log(`  Count: ${Object.keys(personas).length}`);
    for (const [key, persona] of Object.entries(personas)) {
        console.log(`  - @${key}: ${persona.name}`);
    }
    console.log();
    console.log(chalk_1.default.bold('Auto Mode:'));
    console.log(`  ${config.autoMode ? chalk_1.default.green('Enabled') : chalk_1.default.gray('Disabled')}`);
    console.log();
    console.log(chalk_1.default.bold('Config Location:'));
    console.log(`  ${store_1.configStore.getConfigPath()}`);
    console.log('\n===========================================\n');
}
/**
 * Set default provider
 */
async function setDefaultProvider(providerName) {
    if (!providerName) {
        const { provider } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Select default provider:',
                choices: (0, router_1.listProviders)().map(p => ({
                    name: p,
                    value: p,
                })),
            },
        ]);
        providerName = provider;
    }
    const router = new router_1.ProviderRouter();
    if (!(0, router_1.listProviders)().includes(providerName)) {
        console.log(chalk_1.default.red(`Unknown provider: ${providerName}`));
        return;
    }
    if (!router.isAvailable(providerName)) {
        console.log(chalk_1.default.yellow(`Warning: ${providerName} may not be configured yet.`));
    }
    store_1.configStore.setDefaultProvider(providerName);
    console.log(chalk_1.default.green(`Default provider set to: ${providerName}`));
}
/**
 * Set API key for a provider
 */
async function setAPIKey(providerName, apiKey) {
    if (!providerName) {
        const { provider } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Select provider:',
                choices: (0, router_1.listProviders)().filter(p => p !== 'ollama').map(p => ({
                    name: p,
                    value: p,
                })),
            },
        ]);
        providerName = provider;
    }
    let key = apiKey;
    if (!key) {
        const { apiKey: enteredKey } = await inquirer_1.default.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter API key for ${providerName}:`,
            },
        ]);
        key = enteredKey;
    }
    if (key) {
        store_1.configStore.setAPIKey(providerName, key);
        console.log(chalk_1.default.green(`API key saved for ${providerName}`));
        // Test the connection
        const provider = (0, router_1.getProvider)(providerName);
        if (provider) {
            console.log('Testing connection...');
            try {
                const messages = [{ role: 'user', content: 'Hi' }];
                await provider.chat(messages, { maxTokens: 10 });
                console.log(chalk_1.default.green('Connection test successful!'));
            }
            catch (error) {
                console.log(chalk_1.default.yellow(`Connection test failed: ${error.message}`));
            }
        }
    }
    else {
        console.log(chalk_1.default.gray('No API key entered.'));
    }
}
/**
 * Set wiki path
 */
async function setWikiPath(newPath) {
    if (!newPath) {
        const { path } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'path',
                message: 'Enter wiki path:',
                default: store_1.configStore.getWikiPath(),
            },
        ]);
        newPath = path;
    }
    store_1.configStore.setWikiPath(newPath || store_1.configStore.getWikiPath());
    console.log(chalk_1.default.green(`Wiki path set to: ${newPath}`));
}
/**
 * Reset configuration to defaults
 */
async function resetConfig() {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to reset all configuration to defaults?',
            default: false,
        },
    ]);
    if (confirm) {
        store_1.configStore.reset();
        console.log(chalk_1.default.green('Configuration reset to defaults.'));
    }
    else {
        console.log('Cancelled.');
    }
}
/**
 * List available providers with status
 */
async function listProvidersWithStatus() {
    const config = store_1.configStore.load();
    const router = new router_1.ProviderRouter();
    console.log('\nAvailable Providers:');
    console.log('--------------------');
    for (const providerName of (0, router_1.listProviders)()) {
        const provider = (0, router_1.getProvider)(providerName);
        const isAvailable = router.isAvailable(providerName);
        if (provider) {
            const status = isAvailable ? chalk_1.default.green('[Configured]') : chalk_1.default.gray('[Not configured]');
            console.log(`  ${providerName.padEnd(12)} ${provider.displayName().padEnd(20)} ${status}`);
        }
    }
    console.log();
}
exports.default = configCommand;
//# sourceMappingURL=config.js.map