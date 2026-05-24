import axios, { AxiosInstance } from 'axios';
import { Message, Response, ChatOptions, LLMProvider } from '../../types';
import { configStore } from '../../config/store';

/**
 * MiniMax provider - Chinese LLM API with strong reasoning capabilities
 * Uses MiniMax's API endpoint with custom model names
 */
export class MiniMaxProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private defaultModelValue: string;

  constructor() {
    const config = configStore.getProvider('minimax') || { type: 'minimax' };
    // MiniMax uses Anthropic-compatible API at https://api.minimax.io/anthropic
    // API key is the token plan key (sk-cp-...)
    this.apiKey = config.apiKey || process.env.ANTHROPIC_AUTH_TOKEN || '';
    this.baseURL = 'https://api.minimax.io/anthropic/v1';
    // Model names
    this.defaultModelValue = config.defaultModel || 'MiniMax-M2.7';
  }

  name(): string {
    return 'minimax';
  }

  displayName(): string {
    return 'MiniMax';
  }

  supportsAPIKey(): boolean {
    return true;
  }

  supportsOAuth(): boolean {
    return false;
  }

  defaultModel(): string {
    return this.defaultModelValue;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('MiniMax API key not configured. Run "ai-brain config set-api-key minimax" or set MINIMAX_API_KEY environment variable.');
    }

    const model = options?.model || this.defaultModelValue;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 4096;

    // Format messages
    const chatMessages: { role: string; content: string }[] = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        chatMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    try {
      const client: AxiosInstance = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'anthropic-version': '2023-06-01',
        },
      });

      const requestBody: any = {
        model,
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens,
      };

      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }

      const response = await client.post('/messages', requestBody);

      // MiniMax Anthropic-compatible response format
      // Content is an array with objects that have type: "text" or "thinking"
      const contentArray = response.data.content || [];
      let responseText = '';
      for (const item of contentArray) {
        if (item.type === 'text') {
          responseText = item.text;
          break;
        }
      }

      return {
        content: responseText,
        model: response.data.model || model,
        usage: {
          promptTokens: response.data.usage?.input_tokens || 0,
          completionTokens: response.data.usage?.output_tokens || 0,
          totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        },
        done: true,
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new Error('Invalid MiniMax API key. Please check your configuration.');
        } else if (status === 429) {
          throw new Error('MiniMax API rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          throw new Error(`MiniMax API error: ${data.error?.message || 'Bad request'}`);
        }

        throw new Error(`MiniMax API error (${status}): ${data.error?.message || 'Unknown error'}`);
      }

      throw new Error(`MiniMax API request failed: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    return ['MiniMax-Text-01', 'abab6.5s-chat', 'abab6-chat'];
  }

  /**
   * Set API key
   */
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
    configStore.setAPIKey('minimax', apiKey);
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default MiniMaxProvider;