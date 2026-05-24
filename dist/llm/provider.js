"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
exports.getProviderCapabilities = getProviderCapabilities;
exports.validateMessages = validateMessages;
exports.validateChatOptions = validateChatOptions;
/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces the provider interface contract
 */
class BaseProvider {
    apiKey;
    baseURL;
    defaultModelValue;
    constructor(defaultModel = 'gpt-4') {
        this.defaultModelValue = defaultModel;
    }
    /**
     * Validate that the provider is properly configured
     */
    isConfigured() {
        return true;
    }
    /**
     * Get the configured API key
     */
    getAPIKey() {
        return this.apiKey;
    }
    /**
     * Set the API key
     */
    setAPIKey(key) {
        this.apiKey = key;
    }
    /**
     * Build a user message object
     */
    userMessage(content) {
        return {
            role: 'user',
            content,
            timestamp: Date.now(),
        };
    }
    /**
     * Build an assistant message object
     */
    assistantMessage(content) {
        return {
            role: 'assistant',
            content,
            timestamp: Date.now(),
        };
    }
    /**
     * Build a system message object
     */
    systemMessage(content) {
        return {
            role: 'system',
            content,
            timestamp: Date.now(),
        };
    }
    /**
     * Combine multiple system messages into one
     */
    combineSystemMessages(messages) {
        return messages
            .filter(m => m.role === 'system')
            .map(m => m.content)
            .join('\n\n');
    }
    /**
     * Extract non-system messages
     */
    extractMessages(messages) {
        return messages.filter(m => m.role !== 'system');
    }
}
exports.BaseProvider = BaseProvider;
/**
 * Get provider capabilities
 */
function getProviderCapabilities(provider) {
    const name = provider.name().toLowerCase();
    switch (name) {
        case 'anthropic':
            return {
                streaming: true,
                functionCalling: false,
                vision: true,
                jsonMode: false,
            };
        case 'openai':
            return {
                streaming: true,
                functionCalling: true,
                vision: true,
                jsonMode: true,
            };
        case 'google':
            return {
                streaming: true,
                functionCalling: false,
                vision: true,
                jsonMode: false,
            };
        case 'deepseek':
            return {
                streaming: true,
                functionCalling: true,
                vision: false,
                jsonMode: true,
            };
        case 'openrouter':
            return {
                streaming: true,
                functionCalling: true,
                vision: true,
                jsonMode: true,
            };
        case 'ollama':
            return {
                streaming: false,
                functionCalling: false,
                vision: false,
                jsonMode: false,
            };
        default:
            return {
                streaming: false,
                functionCalling: false,
                vision: false,
                jsonMode: false,
            };
    }
}
/**
 * Validate a message array before sending to API
 */
function validateMessages(messages) {
    if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
    }
    if (messages.length === 0) {
        throw new Error('Messages array cannot be empty');
    }
    const validRoles = ['user', 'assistant', 'system'];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!validRoles.includes(msg.role)) {
            throw new Error(`Invalid message role at index ${i}: ${msg.role}`);
        }
        if (typeof msg.content !== 'string') {
            throw new Error(`Message content must be a string at index ${i}`);
        }
    }
}
/**
 * Create a chat options validator
 */
function validateChatOptions(options) {
    if (!options)
        return;
    if (options.model !== undefined && typeof options.model !== 'string') {
        throw new Error('Model must be a string');
    }
    if (options.temperature !== undefined) {
        if (typeof options.temperature !== 'number') {
            throw new Error('Temperature must be a number');
        }
        if (options.temperature < 0 || options.temperature > 2) {
            throw new Error('Temperature must be between 0 and 2');
        }
    }
    if (options.maxTokens !== undefined) {
        if (typeof options.maxTokens !== 'number') {
            throw new Error('maxTokens must be a number');
        }
        if (options.maxTokens < 1) {
            throw new Error('maxTokens must be at least 1');
        }
    }
}
exports.default = BaseProvider;
//# sourceMappingURL=provider.js.map