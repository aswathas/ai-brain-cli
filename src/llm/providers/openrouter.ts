import axios, { AxiosInstance } from 'axios';
import { Message, Response, ChatOptions, LLMProvider } from '../../types';
import { configStore } from '../../config/store';

/**
 * OpenRouter provider - aggregates multiple LLM APIs
 */
export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private defaultModelValue: string;

  constructor() {
    const config = configStore.getProvider('openrouter') || { type: 'openrouter' };
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseURL = config.baseURL || 'https://openrouter.ai/api/v1';
    this.defaultModelValue = config.defaultModel || 'anthropic/claude-3.5-sonnet';
  }

  name(): string {
    return 'openrouter';
  }

  displayName(): string {
    return 'OpenRouter';
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
      throw new Error('OpenRouter API key not configured. Run "ai-brain config set-provider openrouter" or set OPENROUTER_API_KEY environment variable.');
    }

    const model = options?.model || this.defaultModelValue;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 4096;

    // Format messages
    const chatMessages: { role: string; content: string }[] = [];
    let systemPrompt = options?.systemPrompt || '';

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
          'HTTP-Referer': 'https://ai-brain.local',
          'X-Title': 'AI Brain CLI',
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
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new Error('Invalid OpenRouter API key. Please check your configuration.');
        } else if (status === 429) {
          throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          throw new Error(`OpenRouter API error: ${data.error?.message || 'Bad request'}`);
        }

        throw new Error(`OpenRouter API error (${status}): ${data.error?.message || 'Unknown error'}`);
      }

      throw new Error(`OpenRouter API request failed: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const client: AxiosInstance = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const response = await client.get('/models');
      return response.data.data?.map((m: any) => m.id) || [];
    } catch (error) {
      return [
        'anthropic/claude-3.5-sonnet',
        'openai/gpt-4-turbo',
        'google/gemini-2.0-flash',
        'meta-llama/llama-3-70b-instruct',
      ];
    }
  }

  /**
   * Set API key
   */
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
    configStore.setAPIKey('openrouter', apiKey);
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default OpenRouterProvider;