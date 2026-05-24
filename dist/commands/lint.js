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
exports.lintCommand = lintCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const parser_1 = require("../wiki/parser");
/**
 * Run health check on wiki
 */
async function lintCommand(options = {}) {
    const config = store_1.configStore.load();
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    const parser = new parser_1.WikiParser();
    console.log('\n===========================================');
    console.log('  AI Brain Wiki Health Check');
    console.log('===========================================\n');
    // Check if wiki exists
    if (!wikiManager.isInitialized()) {
        console.log(chalk_1.default.yellow('Warning: Wiki not initialized.'));
        console.log('Run "ai-brain init" to initialize.\n');
        return;
    }
    const result = {
        passed: true,
        totalFiles: 0,
        issues: [],
    };
    // Run all checks
    checkWikiStructure(result, wikiManager);
    checkDecisions(result, wikiManager, parser);
    checkInteractions(result, wikiManager, parser);
    checkNotes(result, wikiManager, parser);
    checkConfig(result, config);
    // Print results
    console.log(`Total files checked: ${result.totalFiles}`);
    console.log(`Issues found: ${result.issues.length}\n`);
    if (result.issues.length === 0) {
        console.log(chalk_1.default.green('All checks passed!'));
    }
    else {
        // Group by severity
        const errors = result.issues.filter(i => i.severity === 'error');
        const warnings = result.issues.filter(i => i.severity === 'warning');
        const infos = result.issues.filter(i => i.severity === 'info');
        if (errors.length > 0) {
            console.log(chalk_1.default.red(`\nErrors (${errors.length}):`));
            for (const issue of errors) {
                printIssue(issue, options.verbose);
            }
            result.passed = false;
        }
        if (warnings.length > 0) {
            console.log(chalk_1.default.yellow(`\nWarnings (${warnings.length}):`));
            for (const issue of warnings) {
                printIssue(issue, options.verbose);
            }
        }
        if (infos.length > 0) {
            console.log(chalk_1.default.blue(`\nInfo (${infos.length}):`));
            for (const issue of infos) {
                printIssue(issue, options.verbose);
            }
        }
    }
    console.log('\n===========================================\n');
    // Auto-fix if requested
    if (options.fix && result.issues.length > 0) {
        console.log(chalk_1.default.blue('Auto-fix not yet implemented.\n'));
    }
}
/**
 * Check wiki directory structure
 */
function checkWikiStructure(result, wikiManager) {
    const wikiPath = wikiManager.getWikiPath();
    const requiredDirs = ['decisions', 'interactions', 'notes'];
    if (!fs.existsSync(wikiPath)) {
        result.issues.push({
            file: wikiPath,
            severity: 'error',
            message: 'Wiki root directory does not exist',
        });
        result.passed = false;
        return;
    }
    for (const dir of requiredDirs) {
        const dirPath = path.join(wikiPath, dir);
        if (!fs.existsSync(dirPath)) {
            result.issues.push({
                file: dirPath,
                severity: 'error',
                message: `Required directory missing: ${dir}`,
            });
            result.passed = false;
        }
    }
}
/**
 * Check decision files
 */
function checkDecisions(result, wikiManager, parser) {
    const decisions = wikiManager.getDecisions();
    result.totalFiles += decisions.length;
    for (const decision of decisions) {
        // Check if decision has required fields
        if (!decision.title) {
            result.issues.push({
                file: decision.id,
                severity: 'error',
                message: 'Decision missing title',
            });
            result.passed = false;
        }
        if (!decision.decision) {
            result.issues.push({
                file: decision.id,
                severity: 'error',
                message: 'Decision missing decision content',
            });
            result.passed = false;
        }
        if (!decision.context) {
            result.issues.push({
                file: decision.id,
                severity: 'warning',
                message: 'Decision missing context',
            });
        }
        // Check decision date format
        if (decision.date) {
            const date = new Date(decision.date);
            if (isNaN(date.getTime())) {
                result.issues.push({
                    file: decision.id,
                    severity: 'error',
                    message: 'Decision has invalid date format',
                });
                result.passed = false;
            }
        }
    }
    // Check for duplicate decisions (similar titles)
    const titles = new Set();
    for (const decision of decisions) {
        const titleLower = decision.title.toLowerCase();
        if (titles.has(titleLower)) {
            result.issues.push({
                file: decision.id,
                severity: 'info',
                message: `Possible duplicate: "${decision.title}"`,
            });
        }
        titles.add(titleLower);
    }
}
/**
 * Check interaction files
 */
function checkInteractions(result, wikiManager, parser) {
    const interactions = wikiManager.getInteractions();
    result.totalFiles += interactions.length;
    for (const interaction of interactions) {
        if (!interaction.persona) {
            result.issues.push({
                file: interaction.id,
                severity: 'error',
                message: 'Interaction missing persona',
            });
            result.passed = false;
        }
        if (!interaction.query) {
            result.issues.push({
                file: interaction.id,
                severity: 'error',
                message: 'Interaction missing query',
            });
            result.passed = false;
        }
        if (!interaction.response) {
            result.issues.push({
                file: interaction.id,
                severity: 'error',
                message: 'Interaction missing response',
            });
            result.passed = false;
        }
    }
    // Check for very long interactions (might indicate issues)
    for (const interaction of interactions) {
        if (interaction.query.length > 2000) {
            result.issues.push({
                file: interaction.id,
                severity: 'info',
                message: 'Very long query - consider breaking it down',
            });
        }
    }
}
/**
 * Check note files
 */
function checkNotes(result, wikiManager, parser) {
    const notesDir = path.join(wikiManager.getWikiPath(), 'notes');
    if (!fs.existsSync(notesDir)) {
        return;
    }
    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    result.totalFiles += files.length;
    for (const file of files) {
        const filePath = path.join(notesDir, file);
        const parsed = parser.parseFile(filePath);
        if (!parsed) {
            result.issues.push({
                file,
                severity: 'error',
                message: 'Could not parse file',
            });
            result.passed = false;
            continue;
        }
        // Check frontmatter
        const validation = parser.validateFrontmatter(parsed.frontmatter, ['title', 'date']);
        if (!validation.valid) {
            result.issues.push({
                file,
                severity: 'warning',
                message: `Missing frontmatter fields: ${validation.missing.join(', ')}`,
            });
        }
        // Check for empty content
        if (!parsed.content || parsed.content.trim().length === 0) {
            result.issues.push({
                file,
                severity: 'warning',
                message: 'Note has no content',
            });
        }
    }
}
/**
 * Check configuration
 */
function checkConfig(result, config) {
    // Check wiki path
    if (!config.wikiPath) {
        result.issues.push({
            file: store_1.configStore.getConfigPath(),
            severity: 'error',
            message: 'Wiki path not configured',
        });
        result.passed = false;
    }
    // Check default provider
    if (!config.defaultProvider) {
        result.issues.push({
            file: store_1.configStore.getConfigPath(),
            severity: 'warning',
            message: 'No default provider configured',
        });
    }
    // Check provider API keys
    const requiredProviders = ['anthropic', 'openai', 'google'];
    for (const providerName of requiredProviders) {
        const provider = config.providers?.[providerName];
        if (provider && !provider.apiKey) {
            result.issues.push({
                file: store_1.configStore.getConfigPath(),
                severity: 'info',
                message: `${providerName} API key not configured`,
            });
        }
    }
}
/**
 * Print an issue
 */
function printIssue(issue, verbose) {
    const prefix = issue.file ? `[${issue.file}] ` : '';
    const message = `${prefix}${issue.message}`;
    switch (issue.severity) {
        case 'error':
            console.log(chalk_1.default.red(`  - ${message}`));
            break;
        case 'warning':
            console.log(chalk_1.default.yellow(`  - ${message}`));
            break;
        case 'info':
            console.log(chalk_1.default.blue(`  - ${message}`));
            break;
    }
    if (verbose && issue.line) {
        console.log(chalk_1.default.gray(`    Line: ${issue.line}`));
    }
}
exports.default = lintCommand;
//# sourceMappingURL=lint.js.map