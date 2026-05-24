import axios, { AxiosInstance } from 'axios';
import { Message, Response, ChatOptions, LLMProvider } from '../../types';
import { configStore } from '../../config/store';

/**
 * DeepSeek provider implementation
 */
export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private baseURL: string;
  private defaultModelValue: string;

  constructor() {
    const config = configStore.getProvider('deepseek') || { type: 'deepseek' };
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseURL = 'https://api.deepseek.com';
    this.defaultModelValue = config.defaultModel || 'deepseek-chat';
  }

  name(): string {
    return 'deepseek';
  }

  displayName(): string {
    return 'DeepSeek';
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
      throw new Error('DeepSeek API key not configured. Run "ai-brain config set-provider deepseek" or set DEEPSEEK_API_KEY environment variable.');
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
          throw new Error('Invalid DeepSeek API key. Please check your configuration.');
        } else if (status === 429) {
          throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          throw new Error(`DeepSeek API error: ${data.error?.message || 'Bad request'}`);
        }

        throw new Error(`DeepSeek API error (${status}): ${data.error?.message || 'Unknown error'}`);
      }

      throw new Error(`DeepSeek API request failed: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'deepseek-chat',
      'deepseek-coder',
    ];
  }

  /**
   * Set API key
   */
  setAPIKey(apiKey: string): void {
    this.apiKey = apiKey;
    configStore.setAPIKey('deepseek', apiKey);
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default DeepSeekProvider;