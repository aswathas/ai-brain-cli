"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCommand = statusCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const timeTravel_1 = require("../wiki/timeTravel");
/**
 * Show wiki statistics and status
 */
async function statusCommand() {
    const config = store_1.configStore.load();
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    const timeTravel = new timeTravel_1.TimeTravel(wikiManager);
    console.log('\n===========================================');
    console.log('  AI Brain Status');
    console.log('===========================================\n');
    // Wiki existence check
    const wikiExists = wikiManager.isInitialized();
    if (!wikiExists) {
        console.log(chalk_1.default.yellow('Wiki not initialized.'));
        console.log('Run "ai-brain init" to set up your wiki.\n');
        return;
    }
    // Wiki path
    console.log(chalk_1.default.bold('Wiki:'));
    console.log(`  Path: ${wikiManager.getWikiPath()}`);
    console.log(`  Status: ${chalk_1.default.green('Initialized')}`);
    console.log();
    // Statistics
    const stats = wikiManager.getStats();
    console.log(chalk_1.default.bold('Statistics:'));
    console.log(`  Decisions: ${chalk_1.default.cyan(stats.totalDecisions)}`);
    console.log(`  Interactions: ${chalk_1.default.cyan(stats.totalInteractions)}`);
    console.log(`  Notes: ${chalk_1.default.cyan(stats.totalNotes)}`);
    if (stats.lastUpdated) {
        const lastUpdated = new Date(stats.lastUpdated);
        const relativeTime = getRelativeTime(lastUpdated);
        console.log(`  Last updated: ${relativeTime}`);
    }
    console.log();
    // Provider configuration
    console.log(chalk_1.default.bold('LLM Provider:'));
    console.log(`  Default: ${chalk_1.default.cyan(config.defaultProvider)}`);
    const provider = config.providers?.[config.defaultProvider];
    if (provider) {
        const hasApiKey = provider.apiKey ? 'Yes' : 'No';
        const apiKeyDisplay = provider.apiKey
            ? `${provider.apiKey.substring(0, 4)}...${provider.apiKey.substring(provider.apiKey.length - 4)}`
            : 'Not set';
        console.log(`  API Key configured: ${hasApiKey}`);
        if (provider.apiKey) {
            console.log(`  API Key: ${apiKeyDisplay}`);
        }
        if (provider.defaultModel) {
            console.log(`  Default Model: ${provider.defaultModel}`);
        }
    }
    console.log();
    // Available providers
    console.log(chalk_1.default.bold('Available Providers:'));
    const availableProviders = ['anthropic', 'openai', 'google', 'deepseek', 'openrouter', 'ollama'];
    for (const prov of availableProviders) {
        const provConfig = config.providers?.[prov];
        const isConfigured = provConfig?.apiKey ? true : (prov === 'ollama');
        const status = isConfigured ? chalk_1.default.green('Configured') : chalk_1.default.gray('Not configured');
        console.log(`  ${prov}: ${status}`);
    }
    console.log();
    // Personas
    const personas = store_1.configStore.listPersonas();
    console.log(chalk_1.default.bold('Personas:'));
    console.log(`  Total: ${personas.length}`);
    if (Object.keys(personas).length > 0) {
        for (const [key, persona] of Object.entries(personas)) {
            console.log(`  - @${key}: ${persona.description}`);
        }
    }
    console.log();
    // Auto mode
    console.log(chalk_1.default.bold('Auto Mode:'));
    console.log(`  Enabled: ${config.autoMode ? chalk_1.default.green('Yes') : chalk_1.default.gray('No')}`);
    console.log();
    // Recent timeline
    console.log(chalk_1.default.bold('Recent Timeline:'));
    const timeline = timeTravel.getTimeline(undefined, undefined);
    if (timeline.length > 0) {
        for (const day of timeline.slice(0, 5)) {
            console.log(`  ${day.date}:`);
            for (const decision of day.decisions.slice(0, 3)) {
                console.log(`    - ${decision.title}`);
            }
            if (day.decisions.length > 3) {
                console.log(`    ... and ${day.decisions.length - 3} more`);
            }
        }
    }
    else {
        console.log('  No decisions yet.');
    }
    console.log();
    // Storage info
    console.log(chalk_1.default.bold('Storage:'));
    const files = wikiManager.listFiles();
    const totalFiles = files.decisions.length + files.interactions.length + files.notes.length;
    // Calculate approximate size
    let totalSize = 0;
    const allDirs = ['decisions', 'interactions', 'notes'];
    for (const dir of allDirs) {
        const dirPath = path.join(wikiManager.getWikiPath(), dir);
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }
        }
    }
    const sizeStr = formatBytes(totalSize);
    console.log(`  Files: ${totalFiles}`);
    console.log(`  Size: ${sizeStr}`);
    console.log();
    // Config location
    console.log(chalk_1.default.bold('Config:'));
    console.log(`  Location: ${store_1.configStore.getConfigPath()}`);
    console.log('\n===========================================\n');
}
/**
 * Get relative time string
 */
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins} minutes ago`;
    if (diffHours < 24)
        return `${diffHours} hours ago`;
    if (diffDays < 30)
        return `${diffDays} days ago`;
    return date.toLocaleDateString();
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
exports.default = statusCommand;
//# sourceMappingURL=status.js.map