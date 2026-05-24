"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const store_1 = require("../../config/store");
/**
 * Ollama provider - local LLM server
 */
class OllamaProvider {
    baseURL;
    defaultModelValue;
    constructor() {
        const config = store_1.configStore.getProvider('ollama') || { type: 'ollama' };
        this.baseURL = config.baseURL || 'http://localhost:11434';
        this.defaultModelValue = config.defaultModel || 'llama3';
    }
    name() {
        return 'ollama';
    }
    displayName() {
        return 'Ollama (Local)';
    }
    supportsAPIKey() {
        return false;
    }
    supportsOAuth() {
        return false;
    }
    defaultModel() {
        return this.defaultModelValue;
    }
    async chat(messages, options) {
        const model = options?.model || this.defaultModelValue;
        const temperature = options?.temperature ?? 0.7;
        const maxTokens = options?.maxTokens || 4096;
        // Format messages for Ollama
        // Ollama uses a similar format to OpenAI
        const chatMessages = [];
        let systemPrompt = options?.systemPrompt || '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
            }
            else {
                chatMessages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content,
                });
            }
        }
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const requestBody = {
                model,
                messages: chatMessages,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                },
            };
            if (systemPrompt) {
                // Ollama uses system in messages array
                requestBody.messages = [
                    { role: 'system', content: systemPrompt },
                    ...chatMessages,
                ];
            }
            const response = await client.post('/api/chat', requestBody);
            const responseMessage = response.data.message;
            return {
                content: responseMessage?.content || '',
                model: response.data.model || model,
                usage: {
                    promptTokens: response.data.prompt_eval_count || 0,
                    completionTokens: response.data.eval_count || 0,
                    totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
                },
                done: response.data.done || true,
            };
        }
        catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Ollama server. Make sure Ollama is running (ollama serve).');
            }
            throw new Error(`Ollama API request failed: ${error.message}`);
        }
    }
    async listModels() {
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                timeout: 5000,
            });
            const response = await client.get('/api/tags');
            return response.data.models?.map((m) => m.name) || [];
        }
        catch (error) {
            return ['llama3', 'llama3.2', 'mistral', 'codellama'];
        }
    }
    /**
     * Check if Ollama server is running
     */
    async isServerRunning() {
        try {
            const client = axios_1.default.create({
                baseURL: this.baseURL,
                timeout: 3000,
            });
            await client.get('/');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Set base URL
     */
    setBaseURL(baseURL) {
        this.baseURL = baseURL;
        const config = store_1.configStore.getProvider('ollama') || { type: 'ollama' };
        config.baseURL = baseURL;
        store_1.configStore.setProvider('ollama', config);
    }
    /**
     * Check if configured
     */
    isConfigured() {
        return true; // Ollama doesn't need API key
    }
}
exports.OllamaProvider = OllamaProvider;
exports.default = OllamaProvider;
//# sourceMappingURL=ollama.js.map