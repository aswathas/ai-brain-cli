import { Message, Response, ChatOptions, LLMProvider } from '../types';

/**
 * Abstract base class for LLM providers
 * Provides common functionality and enforces the provider interface contract
 */
export abstract class BaseProvider implements LLMProvider {
  protected apiKey?: string;
  protected baseURL?: string;
  protected defaultModelValue: string;

  constructor(defaultModel: string = 'gpt-4') {
    this.defaultModelValue = defaultModel;
  }

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
  isConfigured(): boolean {
    return true;
  }

  /**
   * Get the configured API key
   */
  protected getAPIKey(): string | undefined {
    return this.apiKey;
  }

  /**
   * Set the API key
   */
  protected setAPIKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Build a user message object
   */
  protected userMessage(content: string): Message {
    return {
      role: 'user',
      content,
      timestamp: Date.now(),
    };
  }

  /**
   * Build an assistant message object
   */
  protected assistantMessage(content: string): Message {
    return {
      role: 'assistant',
      content,
      timestamp: Date.now(),
    };
  }

  /**
   * Build a system message object
   */
  protected systemMessage(content: string): Message {
    return {
      role: 'system',
      content,
      timestamp: Date.now(),
    };
  }

  /**
   * Combine multiple system messages into one
   */
  protected combineSystemMessages(messages: Message[]): string {
    return messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n');
  }

  /**
   * Extract non-system messages
   */
  protected extractMessages(messages: Message[]): Message[] {
    return messages.filter(m => m.role !== 'system');
  }
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
export function getProviderCapabilities(provider: LLMProvider): ProviderCapabilities {
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
export function validateMessages(messages: Message[]): void {
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
export function validateChatOptions(options?: ChatOptions): void {
  if (!options) return;

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

export default BaseProvider;