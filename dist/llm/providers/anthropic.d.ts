import { Message, Response, ChatOptions, LLMProvider } from '../../types';
/**
 * Anthropic (Claude) provider implementation
 */
export declare class AnthropicProvider implements LLMProvider {
    private apiKey;
    private baseURL;
    private defaultModelValue;
    constructor();
    name(): string;
    displayName(): string;
    supportsAPIKey(): boolean;
    supportsOAuth(): boolean;
    defaultModel(): string;
    /**
     * Convert messages format for Anthropic API
     */
    private formatMessages;
    chat(messages: Message[], options?: ChatOptions): Promise<Response>;
    listModels(): Promise<string[]>;
    /**
     * Set API key
     */
    setAPIKey(apiKey: string): void;
    /**
     * Check if configured
     */
    isConfigured(): boolean;
}
export default AnthropicProvider;
//# sourceMappingURL=anthropic.d.ts.map