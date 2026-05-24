// Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// Chat message structure
export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: number;
  persona?: string;
}

// Chat options
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  persona?: string;
}

// Chat response
export interface Response {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  done: boolean;
}

// Provider interface that all LLM providers must implement
export interface LLMProvider {
  name(): string;
  displayName(): string;
  supportsAPIKey(): boolean;
  supportsOAuth(): boolean;
  chat(messages: Message[], options?: ChatOptions): Promise<Response>;
  listModels(): Promise<string[]>;
  defaultModel(): string;
}

// Config store types
export interface ProviderConfig {
  type: string;
  apiKey?: string;
  oauthToken?: string;
  baseURL?: string;
  defaultModel?: string;
}

export interface Config {
  wikiPath: string;
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  personas: Record<string, PersonaConfig>;
  autoMode: boolean;
}

export interface PersonaConfig {
  name: string;
  description: string;
  systemPrompt: string;
  color: string;
}

// Wiki entry frontmatter
export interface WikiEntry {
  title: string;
  date: string;
  tags: string[];
  type: 'decision' | 'interaction' | 'note' | 'persona';
  personas?: string[];
  related?: string[];
}

// Decision entry for time-travel
export interface DecisionEntry {
  id: string;
  title: string;
  date: string;
  summary: string;
  context: string;
  decision: string;
  outcome?: string;
  tags: string[];
}

// Interaction entry
export interface InteractionEntry {
  id: string;
  date: string;
  persona: string;
  query: string;
  response: string;
  context?: string;
}

// CLI command context
export interface CommandContext {
  wikiPath: string;
  provider: LLMProvider;
  config: Config;
}