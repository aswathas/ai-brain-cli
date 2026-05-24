import { Message, Response, ChatOptions, LLMProvider } from '../../types';
/**
 * Ollama provider - local LLM server
 */
export declare class OllamaProvider implements LLMProvider {
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
     * Check if Ollama server is running
     */
    isServerRunning(): Promise<boolean>;
    /**
     * Set base URL
     */
    setBaseURL(baseURL: string): void;
    /**
     * Check if configured
     */
    isConfigured(): boolean;
}
export default OllamaProvider;
//# sourceMappingURL=ollama.d.ts.map