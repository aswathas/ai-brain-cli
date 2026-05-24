import { Message, Response, ChatOptions, LLMProvider } from '../types';
import { configStore } from '../config/store';

/**
 * Get a provider instance by name
 */
export function getProvider(name: string): LLMProvider | null {
  switch (name.toLowerCase()) {
    case 'anthropic':
      return new (require('./providers/anthropic').AnthropicProvider)();
    case 'openai':
      return new (require('./providers/openai').OpenAIProvider)();
    case 'google':
      return new (require('./providers/google').GoogleProvider)();
    case 'deepseek':
      return new (require('./providers/deepseek').DeepSeekProvider)();
    case 'openrouter':
      return new (require('./providers/openrouter').OpenRouterProvider)();
    case 'ollama':
      return new (require('./providers/ollama').OllamaProvider)();
    case 'minimax':
      return new (require('./providers/minimax').MiniMaxProvider)();
    default:
      console.error(`Unknown provider: ${name}`);
      return null;
  }
}

/**
 * Get the default provider from config
 */
export function getDefaultProvider(): LLMProvider | null {
  const config = configStore.load();
  return getProvider(config.defaultProvider);
}

/**
 * List all available providers
 */
export function listProviders(): string[] {
  return ['anthropic', 'openai', 'google', 'deepseek', 'openrouter', 'ollama', 'minimax'];
}

/**
 * Router that selects best provider based on requirements
 */
export class ProviderRouter {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    for (const name of listProviders()) {
      const provider = getProvider(name);
      if (provider) {
        this.providers.set(name, provider);
      }
    }
  }

  /**
   * Get provider by name
   */
  get(name: string): LLMProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Get all providers
   */
  getAll(): Map<string, LLMProvider> {
    return this.providers;
  }

  /**
   * Check if a provider is available (has API key or is local)
   */
  isAvailable(name: string): boolean {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) return false;

    const config = configStore.getProvider(name);
    if (!config) return false;

    // Ollama and local providers are always available
    if (name === 'ollama') return true;

    // Others require API key
    return !!(config.apiKey);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return listProviders().filter(name => this.isAvailable(name));
  }

  /**
   * Select best provider for a task
   */
  selectForTask(task: 'chat' | 'reasoning' | 'creative' | 'code'): string {
    // For now, use default provider
    // Could implement smarter selection based on capabilities
    const config = configStore.load();
    return config.defaultProvider;
  }
}

export default new ProviderRouter();