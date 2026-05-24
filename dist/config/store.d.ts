import { Config, ProviderConfig, PersonaConfig } from '../types';
export declare class ConfigStore {
    private config;
    private configFilePath;
    constructor(configPath?: string);
    /**
     * Load configuration from file or create default
     */
    load(): Config;
    /**
     * Save configuration to file
     */
    save(): void;
    /**
     * Get current config
     */
    get(): Config;
    /**
     * Update configuration
     */
    set(updates: Partial<Config>): void;
    /**
     * Get a specific provider config
     */
    getProvider(providerName: string): ProviderConfig | undefined;
    /**
     * Set a provider config
     */
    setProvider(providerName: string, providerConfig: ProviderConfig): void;
    /**
     * Get a specific persona config
     */
    getPersona(personaName: string): PersonaConfig | undefined;
    /**
     * Set a persona config
     */
    setPersona(personaName: string, personaConfig: PersonaConfig): void;
    /**
     * Remove a persona
     */
    removePersona(personaName: string): boolean;
    /**
     * List all personas
     */
    listPersonas(): Record<string, PersonaConfig>;
    /**
     * Get wiki path
     */
    getWikiPath(): string;
    /**
     * Set wiki path
     */
    setWikiPath(wikiPath: string): void;
    /**
     * Get default provider name
     */
    getDefaultProvider(): string;
    /**
     * Set default provider
     */
    setDefaultProvider(providerName: string): void;
    /**
     * Get API key for provider
     */
    getAPIKey(providerName: string): string | undefined;
    /**
     * Set API key for provider
     */
    setAPIKey(providerName: string, apiKey: string): void;
    /**
     * Check if auto mode is enabled
     */
    isAutoModeEnabled(): boolean;
    /**
     * Toggle auto mode
     */
    setAutoMode(enabled: boolean): void;
    /**
     * Get config file path
     */
    getConfigPath(): string;
    /**
     * Reset to defaults
     */
    reset(): void;
}
export declare const configStore: ConfigStore;
export default configStore;
//# sourceMappingURL=store.d.ts.map