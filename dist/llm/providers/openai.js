"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const store_1 = require("../../config/store");
/**
 * OpenAI provider implementation (GPT-4, GPT-3.5)
 */
class OpenAIProvider {
    apiKey;
    baseURL;
    defaultModelValue;
    constructor() {
        const config = store_1.configStore.getProvider('openai') || { type: 'openai' };
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseURL = 'https://api.openai.com/v1';
        this.defaultModelValue = config.defaultModel || 'gpt-4-turbo';
    }
    name() {
        return 'openai';
    }
    displayName() {
        return 'OpenAI (GPT-4)';
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
    async chat(messages, options) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured. Run "ai-brain config set-provider openai" or set OPENAI_API_KEY environment variable.');
        }
        const model = options?.model || this.defaultModelValue;
        const temperature = options?.temperature ?? 0.7;
        const maxTokens = options?.maxTokens || 4096;
        // Separate system messages
        let systemPrompt = options?.systemPrompt || '';
        const chatMessages = [];
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
            }
            else {
                chatMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            const requestBody = {
                model,
                messages: chatMessages,
                temperature,
                max_tokens: maxTokens,
            };
            if (systemPrompt && chatMessages[0]?.role !== 'system') {
                // Insert system prompt as first message if not already there
                requestBody.messages = [
                    { role: 'system', content: systemPrompt },
                    ...chatMessages,
                ];
            }
            const response = await client.post('/chat/completions', requestBody);
            const choice = response.data.choices[0];
            const responseMessage = choice?.message;
            return {
                content: responseMessage?.content || '',
                model: response.data.model || model,
                usage: {
                    promptTokens: response.data.usage?.prompt_tokens || 0,
                    completionTokens: response.data.usage?.completion_tokens || 0,
                    totalTokens: response.data.usage?.total_tokens || 0,
                },
                done: choice?.finish_reason === 'stop',
            };
        }
        catch (error) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                if (status === 401) {
                    throw new Error('Invalid OpenAI API key. Please check your configuration.');
                }
                else if (status === 429) {
                    throw new Error('OpenAI API rate limit exceeded. Please try again later.');
                }
                else if (status === 400) {
                    throw new Error(`OpenAI API error: ${data.error?.message || 'Bad request'}`);
                }
                throw new Error(`OpenAI API error (${status}): ${data.error?.message || 'Unknown error'}`);
            }
            throw new Error(`OpenAI API request failed: ${error.message}`);
        }
    }
    async listModels() {
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            const response = await client.get('/models');
            return response.data.data
                .filter((m) => m.id.includes('gpt'))
                .map((m) => m.id);
        }
        catch (error) {
            // Return known models if API call fails
            return [
                'gpt-4-turbo',
                'gpt-4-turbo-2024-04-09',
                'gpt-4o',
                'gpt-4o-mini',
                'gpt-4',
                'gpt-3.5-turbo',
            ];
        }
    }
    /**
     * Set API key
     */
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        store_1.configStore.setAPIKey('openai', apiKey);
    }
    /**
     * Check if configured
     */
    isConfigured() {
        return !!this.apiKey;
    }
}
exports.OpenAIProvider = OpenAIProvider;
exports.default = OpenAIProvider;
//# sourceMappingURL=openai.js.map