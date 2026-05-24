import axios, { AxiosInstance } from 'axios';
import { Message, Response, ChatOptions, LLMProvider } from '../../types';
import { configStore } from '../../config/store';

/**
 * Ollama provider - local LLM server
 */
export class OllamaProvider implements LLMProvider {
  private baseURL: string;
  private defaultModelValue: string;

  constructor() {
    const config = configStore.getProvider('ollama') || { type: 'ollama' };
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.defaultModelValue = config.defaultModel || 'llama3';
  }

  name(): string {
    return 'ollama';
  }

  displayName(): string {
    return 'Ollama (Local)';
  }

  supportsAPIKey(): boolean {
    return false;
  }

  supportsOAuth(): boolean {
    return false;
  }

  defaultModel(): string {
    return this.defaultModelValue;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<Response> {
    const model = options?.model || this.defaultModelValue;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens || 4096;

    // Format messages for Ollama
    // Ollama uses a similar format to OpenAI
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
        },
      });

      const requestBody: any = {
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
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Ollama server. Make sure Ollama is running (ollama serve).');
      }

      throw new Error(`Ollama API request failed: ${error.message}`);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const client: AxiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 5000,
      });

      const response = await client.get('/api/tags');
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      return ['llama3', 'llama3.2', 'mistral', 'codellama'];
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const client: AxiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 3000,
      });

      await client.get('/');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set base URL
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    const config = configStore.getProvider('ollama') || { type: 'ollama' };
    config.baseURL = baseURL;
    configStore.setProvider('ollama', config);
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return true; // Ollama doesn't need API key
  }
}

export default OllamaProvider;