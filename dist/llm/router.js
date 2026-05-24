"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRouter = void 0;
exports.getProvider = getProvider;
exports.getDefaultProvider = getDefaultProvider;
exports.listProviders = listProviders;
const store_1 = require("../config/store");
/**
 * Get a provider instance by name
 */
function getProvider(name) {
    switch (name.toLowerCase()) {
        case 'anthropic':
            return new (require('./providers/anthropic').AnthropicProvider)();
        case 'openai':
            return new (require('./providers/openai').OpenAIProvider)();
        case 'google':
            return new (require('./providers/google').GoogleProvider)();
        case 'deepseek':
            return new (require('./providers/deepseek').DeepSeekProvider)();
        case 'openrouter':
            return new (require('./providers/openrouter').OpenRouterProvider)();
        case 'ollama':
            return new (require('./providers/ollama').OllamaProvider)();
        default:
            console.error(`Unknown provider: ${name}`);
            return null;
    }
}
/**
 * Get the default provider from config
 */
function getDefaultProvider() {
    const config = store_1.configStore.load();
    return getProvider(config.defaultProvider);
}
/**
 * List all available providers
 */
function listProviders() {
    return ['anthropic', 'openai', 'google', 'deepseek', 'openrouter', 'ollama'];
}
/**
 * Router that selects best provider based on requirements
 */
class ProviderRouter {
    providers = new Map();
    constructor() {
        for (const name of listProviders()) {
            const provider = getProvider(name);
            if (provider) {
                this.providers.set(name, provider);
            }
        }
    }
    /**
     * Get provider by name
     */
    get(name) {
        return this.providers.get(name.toLowerCase());
    }
    /**
     * Get all providers
     */
    getAll() {
        return this.providers;
    }
    /**
     * Check if a provider is available (has API key or is local)
     */
    isAvailable(name) {
        const provider = this.providers.get(name.toLowerCase());
        if (!provider)
            return false;
        const config = store_1.configStore.getProvider(name);
        if (!config)
            return false;
        // Ollama and local providers are always available
        if (name === 'ollama')
            return true;
        // Others require API key
        return !!(config.apiKey);
    }
    /**
     * Get all available providers
     */
    getAvailableProviders() {
        return listProviders().filter(name => this.isAvailable(name));
    }
    /**
     * Select best provider for a task
     */
    selectForTask(task) {
        // For now, use default provider
        // Could implement smarter selection based on capabilities
        const config = store_1.configStore.load();
        return config.defaultProvider;
    }
}
exports.ProviderRouter = ProviderRouter;
exports.default = new ProviderRouter();
//# sourceMappingURL=router.js.map