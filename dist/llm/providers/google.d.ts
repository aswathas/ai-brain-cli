import { Message, Response, ChatOptions, LLMProvider } from '../../types';
/**
 * Google AI (Gemini) provider implementation
 */
export declare class GoogleProvider implements LLMProvider {
    private apiKey;
    private baseURL;
    private defaultModelValue;
    constructor();
    name(): string;
    displayName(): string;
    supportsAPIKey(): boolean;
    supportsOAuth(): boolean;
    defaultModel(): string;
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
export default GoogleProvider;
//# sourceMappingURL=google.d.ts.map