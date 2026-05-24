export type MessageRole = 'user' | 'assistant' | 'system';
export interface Message {
    role: MessageRole;
    content: string;
    timestamp?: number;
    persona?: string;
}
export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    persona?: string;
}
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
export interface LLMProvider {
    name(): string;
    displayName(): string;
    supportsAPIKey(): boolean;
    supportsOAuth(): boolean;
    chat(messages: Message[], options?: ChatOptions): Promise<Response>;
    listModels(): Promise<string[]>;
    defaultModel(): string;
}
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
export interface WikiEntry {
    title: string;
    date: string;
    tags: string[];
    type: 'decision' | 'interaction' | 'note' | 'persona';
    personas?: string[];
    related?: string[];
}
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
export interface InteractionEntry {
    id: string;
    date: string;
    persona: string;
    query: string;
    response: string;
    context?: string;
}
export interface CommandContext {
    wikiPath: string;
    provider: LLMProvider;
    config: Config;
}
//# sourceMappingURL=types.d.ts.map