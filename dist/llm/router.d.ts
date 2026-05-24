import { LLMProvider } from '../types';
/**
 * Get a provider instance by name
 */
export declare function getProvider(name: string): LLMProvider | null;
/**
 * Get the default provider from config
 */
export declare function getDefaultProvider(): LLMProvider | null;
/**
 * List all available providers
 */
export declare function listProviders(): string[];
/**
 * Router that selects best provider based on requirements
 */
export declare class ProviderRouter {
    private providers;
    constructor();
    /**
     * Get provider by name
     */
    get(name: string): LLMProvider | undefined;
    /**
     * Get all providers
     */
    getAll(): Map<string, LLMProvider>;
    /**
     * Check if a provider is available (has API key or is local)
     */
    isAvailable(name: string): boolean;
    /**
     * Get all available providers
     */
    getAvailableProviders(): string[];
    /**
     * Select best provider for a task
     */
    selectForTask(task: 'chat' | 'reasoning' | 'creative' | 'code'): string;
}
declare const _default: ProviderRouter;
export default _default;
//# sourceMappingURL=router.d.ts.map