/**
 * Log a decision or interaction
 */
export declare function logCommand(args?: {
    decision?: string;
    context?: string;
    tags?: string[];
    outcome?: string;
    interactive?: boolean;
}): Promise<void>;
/**
 * Quick log from command line (non-interactive)
 */
export declare function quickLog(decision: string, options?: {
    context?: string;
    tags?: string[];
}): void;
export default logCommand;
//# sourceMappingURL=log.d.ts.map