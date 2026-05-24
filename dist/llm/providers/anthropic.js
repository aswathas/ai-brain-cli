"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const store_1 = require("../../config/store");
/**
 * Anthropic (Claude) provider implementation
 */
class AnthropicProvider {
    apiKey;
    baseURL;
    defaultModelValue;
    constructor() {
        const config = store_1.configStore.getProvider('anthropic') || { type: 'anthropic' };
        this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
        this.baseURL = 'https://api.anthropic.com/v1';
        this.defaultModelValue = config.defaultModel || 'claude-3-5-sonnet-20241022';
    }
    name() {
        return 'anthropic';
    }
    displayName() {
        return 'Anthropic (Claude)';
    }
    supportsAPIKey() {
        return true;
    }
    supportsOAuth() {
        return false;
    }
    defaultModel() {
        return this.defaultModelValue;
    }
    /**
     * Convert messages format for Anthropic API
     */
    formatMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'user' : 'user',
            content: msg.content,
        }));
    }
    async chat(messages, options) {
        if (!this.apiKey) {
            throw new Error('Anthropic API key not configured. Run "ai-brain config set-provider anthropic" or set ANTHROPIC_API_KEY environment variable.');
        }
        const model = options?.model || this.defaultModelValue;
        const temperature = options?.temperature ?? 0.7;
        const maxTokens = options?.maxTokens || 4096;
        // Get system prompt from options or combine from messages
        let systemPrompt = options?.systemPrompt || '';
        const chatMessages = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
            }
            else {
                chatMessages.push(msg);
            }
        }
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
            });
            const requestBody = {
                model,
                messages: this.formatMessages(chatMessages),
                temperature,
                max_tokens: maxTokens,
            };
            if (systemPrompt) {
                requestBody.system = systemPrompt;
            }
            const response = await client.post('/messages', requestBody);
            const responseData = response.data;
            return {
                content: responseData.content[0].text,
                model: responseData.model || model,
                usage: {
                    promptTokens: responseData.usage?.input_tokens || 0,
                    completionTokens: responseData.usage?.output_tokens || 0,
                    totalTokens: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
                },
                done: true,
            };
        }
        catch (error) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                if (status === 401) {
                    throw new Error('Invalid Anthropic API key. Please check your configuration.');
                }
                else if (status === 429) {
                    throw new Error('Anthropic API rate limit exceeded. Please try again later.');
                }
                else if (status === 400) {
                    throw new Error(`Anthropic API error: ${data.error?.message || 'Bad request'}`);
                }
                throw new Error(`Anthropic API error (${status}): ${data.error?.message || 'Unknown error'}`);
            }
            throw new Error(`Anthropic API request failed: ${error.message}`);
        }
    }
    async listModels() {
        // Anthropic doesn't have a models list endpoint, return known models
        return [
            'claude-3-5-sonnet-20241022',
            'claude-3-5-sonnet-20241022',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
        ];
    }
    /**
     * Set API key
     */
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        store_1.configStore.setAPIKey('anthropic', apiKey);
    }
    /**
     * Check if configured
     */
    isConfigured() {
        return !!this.apiKey;
    }
}
exports.AnthropicProvider = AnthropicProvider;
exports.default = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map