import axios, { AxiosInstance } from 'axios';
import { Message, Response, ChatOptions, LLMProvider } from '../../types';
import { configStore } from '../../config/store';

/**
 * OpenAI provider implementation (GPT-4, GPT-3.5)
 */
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private defaultModelValue: string;

  constructor() {
    const config = configStore.getProvider('openai') || { type: 'openai' };
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = 'https://api.openai.com/v1';
    this.defaultModelValue = config.defaultModel || 'gpt-4-turbo';
  }

  name(): string {
    return 'openai';
  }

  displayName(): string {
    return 'OpenAI (GPT-4)';
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
      throw new Error('OpenAI API key not configured. Run "ai-brain config set-provider openai" or set OPENAI_API_KEY environment variable.');
    }

    const model = options?.model || this.defaultModelValue;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 4096;

    // Separate system messages
    let systemPrompt = options?.systemPrompt || '';
    const chatMessages: { role: string; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else {
        chatMessages.push({
          role: msg.role,
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
        },
      });

      const requestBody: any = {
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
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your configuration.');
        } else if (status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          throw new Error(`OpenAI API error: ${data.error?.message || 'Bad request'}`);
        }

        throw new Error(`OpenAI API error (${status}): ${data.error?.message || 'Unknown error'}`);
      }

      throw new Error(`OpenAI API request failed: ${error.message}`);
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
      return response.data.data
        .filter((m: any) => m.id.includes('gpt'))
        .map((m: any) => m.id);
    } catch (error) {
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
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
    configStore.setAPIKey('openai', apiKey);
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default OpenAIProvider;