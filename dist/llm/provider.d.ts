import { Message, Response, ChatOptions, LLMProvider } from '../types';
/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces the provider interface contract
 */
export declare abstract class BaseProvider implements LLMProvider {
    protected apiKey?: string;
    protected baseURL?: string;
    protected defaultModelValue: string;
    constructor(defaultModel?: string);
    /**
     * Provider name identifier
     */
    abstract name(): string;
    /**
     * Human-readable display name
     */
    abstract displayName(): string;
    /**
     * Whether this provider supports API key authentication
     */
    abstract supportsAPIKey(): boolean;
    /**
     * Whether this provider supports OAuth authentication
     */
    abstract supportsOAuth(): boolean;
    /**
     * Default model for this provider
     */
    abstract defaultModel(): string;
    /**
     * Send a chat message and get a response
     */
    abstract chat(messages: Message[], options?: ChatOptions): Promise<Response>;
    /**
     * List available models for this provider
     */
    abstract listModels(): Promise<string[]>;
    /**
     * Validate that the provider is properly configured
     */
    isConfigured(): boolean;
    /**
     * Get the configured API key
     */
    protected getAPIKey(): string | undefined;
    /**
     * Set the API key
     */
    protected setAPIKey(key: string): void;
    /**
     * Build a user message object
     */
    protected userMessage(content: string): Message;
    /**
     * Build an assistant message object
     */
    protected assistantMessage(content: string): Message;
    /**
     * Build a system message object
     */
    protected systemMessage(content: string): Message;
    /**
     * Combine multiple system messages into one
     */
    protected combineSystemMessages(messages: Message[]): string;
    /**
     * Extract non-system messages
     */
    protected extractMessages(messages: Message[]): Message[];
}
/**
 * Provider capability flags
 */
export interface ProviderCapabilities {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    jsonMode: boolean;
}
/**
 * Get provider capabilities
 */
export declare function getProviderCapabilities(provider: LLMProvider): ProviderCapabilities;
/**
 * Validate a message array before sending to API
 */
export declare function validateMessages(messages: Message[]): void;
/**
 * Create a chat options validator
 */
export declare function validateChatOptions(options?: ChatOptions): void;
export default BaseProvider;
//# sourceMappingURL=provider.d.ts.map