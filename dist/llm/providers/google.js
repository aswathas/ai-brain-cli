"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const store_1 = require("../../config/store");
/**
 * Google AI (Gemini) provider implementation
 */
class GoogleProvider {
    apiKey;
    baseURL;
    defaultModelValue;
    constructor() {
        const config = store_1.configStore.getProvider('google') || { type: 'google' };
        this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || '';
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
        this.defaultModelValue = config.defaultModel || 'gemini-2.0-flash';
    }
    name() {
        return 'google';
    }
    displayName() {
        return 'Google AI (Gemini)';
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
            throw new Error('Google API key not configured. Run "ai-brain config set-provider google" or set GOOGLE_API_KEY environment variable.');
        }
        const model = options?.model || this.defaultModelValue;
        const temperature = options?.temperature ?? 0.7;
        const maxTokens = options?.maxTokens || 4096;
        // Convert messages to Google format
        // Gemini uses a different format - combine into single prompt
        let systemPrompt = options?.systemPrompt || '';
        let fullPrompt = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
            }
            else {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                fullPrompt += `${role}: ${msg.content}\n`;
            }
        }
        if (systemPrompt) {
            fullPrompt = `Instructions: ${systemPrompt}\n\n${fullPrompt}`;
        }
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: fullPrompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                },
            };
            const response = await client.post(`/models/${model}:generateContent?key=${this.apiKey}`, requestBody);
            const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            return {
                content: responseText,
                model: model,
                usage: {
                    promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
                    completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
                },
                done: true,
            };
        }
        catch (error) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                if (status === 401) {
                    throw new Error('Invalid Google API key. Please check your configuration.');
                }
                else if (status === 429) {
                    throw new Error('Google API rate limit exceeded. Please try again later.');
                }
                else if (status === 400) {
                    throw new Error(`Google API error: ${data.error?.message || 'Bad request'}`);
                }
                throw new Error(`Google API error (${status}): ${data.error?.message || 'Unknown error'}`);
            }
            throw new Error(`Google API request failed: ${error.message}`);
        }
    }
    async listModels() {
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
            });
            const response = await client.get('/models', {
                params: { key: this.apiKey },
            });
            return response.data.models
                ?.filter((m) => m.name.includes('generateContent'))
                .map((m) => m.name.replace('models/', '')) || [];
        }
        catch (error) {
            return [
                'gemini-2.0-flash',
                'gemini-1.5-pro',
                'gemini-1.5-flash',
                'gemini-1.0-pro',
            ];
        }
    }
    /**
     * Set API key
     */
    setAPIKey(apiKey) {
        this.apiKey = apiKey;
        store_1.configStore.setAPIKey('google', apiKey);
    }
    /**
     * Check if configured
     */
    isConfigured() {
        return !!this.apiKey;
    }
}
exports.GoogleProvider = GoogleProvider;
exports.default = GoogleProvider;
//# sourceMappingURL=google.js.map