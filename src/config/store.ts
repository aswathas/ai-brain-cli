import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config, ProviderConfig, PersonaConfig } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.ai-brain');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default configuration
const DEFAULT_CONFIG: Config = {
  wikiPath: path.join(os.homedir(), 'wiki'),
  defaultProvider: 'anthropic',
  providers: {
    anthropic: {
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      defaultModel: 'claude-3-5-sonnet-20241022',
    },
    openai: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: 'gpt-4-turbo',
    },
    google: {
      type: 'google',
      apiKey: process.env.GOOGLE_API_KEY || '',
      defaultModel: 'gemini-2.0-flash',
    },
    deepseek: {
      type: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      defaultModel: 'deepseek-chat',
    },
    openrouter: {
      type: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: 'anthropic/claude-3.5-sonnet',
    },
    ollama: {
      type: 'ollama',
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama3',
    },
  },
  personas: {
    socrates: {
      name: 'Socrates',
      description: 'Socratic philosopher who questions everything',
      systemPrompt: 'You are Socrates, the Greek philosopher. You engage in Socratic dialogue, asking probing questions to help people arrive at truth through their own reasoning. You are patient, wise, and gently challenging. You often respond with questions rather than answers, following the method of dialectical inquiry. Your tone is warm but intellectually rigorous.',
      color: '33', // green in ANSI
    },
    elon: {
      name: 'Elon Musk',
      description: 'First principles thinking, bold bets on future',
      systemPrompt: 'You are Elon Musk. You think in first principles, often say "the physics says" or "from a physics standpoint", and are willing to make bold predictions. You are direct, sometimes blunt, and push for radical solutions. You reference SpaceX, Tesla, Neuralink, and other ventures when relevant. You think about how things could be 10x better, not just 10% better.',
      color: '31', // red in ANSI
    },
    carolyn: {
      name: 'Carolyn McKenna',
      description: 'Analytical strategist with market expertise',
      systemPrompt: 'You are Carolyn McKenna, a seasoned market strategist with 20 years of experience. You are deeply analytical, cite market data and trends, and are skilled at risk assessment. You ask clarifying questions about markets, competitors, and financials before offering advice. Your tone is professional and evidence-based.',
      color: '36', // cyan in ANSI
    },
    confucius: {
      name: 'Confucius',
      description: 'Wise counselor emphasizing virtue and balance',
      systemPrompt: 'You are Confucius, the ancient Chinese philosopher. You speak with wisdom about virtue, proper conduct, and harmony. You offer balanced perspectives that consider family, community, and long-term consequences. Your advice emphasizes moral character, respect for tradition, and practical wisdom. You speak in a measured, aphoristic style.',
      color: '35', // magenta in ANSI
    },
    archimedes: {
      name: 'Archimedes',
      description: 'Mathematical and engineering problem solver',
      systemPrompt: 'You are Archimedes, the Greek mathematician and engineer. You approach problems with mathematical rigor, love elegant solutions, and often find insights through geometry and physics analogies. You say "give me a place to stand and I can move the world." Your tone is intellectually playful and precise.',
      color: '34', // blue in ANSI
    },
  },
  autoMode: false,
};

export class ConfigStore {
  private config: Config | null = null;
  private configFilePath: string;

  constructor(configPath?: string) {
    this.configFilePath = configPath || CONFIG_FILE;
  }

  /**
   * Load configuration from file or create default
   */
  load(): Config {
    if (this.config) {
      return this.config;
    }

    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Load from file or create default
    if (fs.existsSync(this.configFilePath)) {
      try {
        const data = fs.readFileSync(this.configFilePath, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
      } catch (error) {
        console.error('Error loading config, using defaults:', error);
        this.config = { ...DEFAULT_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_CONFIG };
      this.save();
    }

    return this.config!;
  }

  /**
   * Save configuration to file
   */
  save(): void {
    if (!this.config) {
      this.config = this.load();
    }

    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    try {
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Get current config
   */
  get(): Config {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  set(updates: Partial<Config>): void {
    if (!this.config) {
      this.load();
    }
    this.config = { ...this.config!, ...updates };
    this.save();
  }

  /**
   * Get a specific provider config
   */
  getProvider(providerName: string): ProviderConfig | undefined {
    const config = this.get();
    return config.providers[providerName];
  }

  /**
   * Set a provider config
   */
  setProvider(providerName: string, providerConfig: ProviderConfig): void {
    const config = this.get();
    config.providers[providerName] = providerConfig;
    this.save();
  }

  /**
   * Get a specific persona config
   */
  getPersona(personaName: string): PersonaConfig | undefined {
    const config = this.get();
    return config.personas[personaName];
  }

  /**
   * Set a persona config
   */
  setPersona(personaName: string, personaConfig: PersonaConfig): void {
    const config = this.get();
    config.personas[personaName] = personaConfig;
    this.save();
  }

  /**
   * Remove a persona
   */
  removePersona(personaName: string): boolean {
    const config = this.get();
    if (config.personas[personaName]) {
      delete config.personas[personaName];
      this.save();
      return true;
    }
    return false;
  }

  /**
   * List all personas
   */
  listPersonas(): Record<string, PersonaConfig> {
    return this.get().personas;
  }

  /**
   * Get wiki path
   */
  getWikiPath(): string {
    return this.get().wikiPath;
  }

  /**
   * Set wiki path
   */
  setWikiPath(wikiPath: string): void {
    this.set({ wikiPath });
  }

  /**
   * Get default provider name
   */
  getDefaultProvider(): string {
    return this.get().defaultProvider;
  }

  /**
   * Set default provider
   */
  setDefaultProvider(providerName: string): void {
    this.set({ defaultProvider: providerName });
  }

  /**
   * Get API key for provider
   */
  getAPIKey(providerName: string): string | undefined {
    const provider = this.getProvider(providerName);
    return provider?.apiKey;
  }

  /**
   * Set API key for provider
   */
  setAPIKey(providerName: string, apiKey: string): void {
    const provider = this.getProvider(providerName) || { type: providerName };
    provider.apiKey = apiKey;
    this.setProvider(providerName, provider);
  }

  /**
   * Check if auto mode is enabled
   */
  isAutoModeEnabled(): boolean {
    return this.get().autoMode;
  }

  /**
   * Toggle auto mode
   */
  setAutoMode(enabled: boolean): void {
    this.set({ autoMode: enabled });
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configFilePath;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }
}

// Export singleton instance
export const configStore = new ConfigStore();

export default configStore;