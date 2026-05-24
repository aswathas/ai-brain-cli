/**
 * Manage provider configuration
 */
export declare function configCommand(args?: {
    action?: string;
    provider?: string;
    key?: string;
}): Promise<void>;
/**
 * List available providers with status
 */
export declare function listProvidersWithStatus(): Promise<void>;
export default configCommand;
//# sourceMappingURL=config.d.ts.map