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
exports.ingestCommand = ingestCommand;
exports.ingestURL = ingestURL;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const store_1 = require("../config/store");
const manager_1 = require("../wiki/manager");
const parser_1 = require("../wiki/parser");
/**
 * Ingest a source file into the wiki
 */
async function ingestCommand(filePath) {
    const config = store_1.configStore.load();
    const wikiManager = new manager_1.WikiManager(config.wikiPath);
    const parser = new parser_1.WikiParser();
    // Ensure wiki structure exists
    wikiManager.ensureStructure();
    // If no file path provided, ask for it
    if (!filePath) {
        const { path: enteredPath } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'path',
                message: 'Enter the file path to ingest:',
                validate: (input) => {
                    if (!input)
                        return 'Please enter a file path';
                    if (!fs.existsSync(input))
                        return 'File does not exist';
                    return true;
                },
            },
        ]);
        filePath = enteredPath;
    }
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        return;
    }
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        // Ingest all files in directory
        await ingestDirectory(filePath, wikiManager, parser);
    }
    else {
        // Ingest single file
        await ingestFile(filePath, wikiManager, parser);
    }
}
/**
 * Ingest a single file
 */
async function ingestFile(filePath, wikiManager, parser) {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExtensions = ['.md', '.txt', '.pdf', '.doc', '.docx'];
    if (!supportedExtensions.includes(ext)) {
        console.log(`Skipping unsupported file type: ${ext}`);
        console.log(`Supported types: ${supportedExtensions.join(', ')}`);
        return;
    }
    console.log(`Ingesting: ${filePath}`);
    const parsed = parser.parseFile(filePath);
    if (!parsed) {
        console.error(`Error: Could not parse file: ${filePath}`);
        return;
    }
    // Generate entry title
    let title = parsed.frontmatter.title;
    if (!title) {
        title = path.basename(filePath, path.extname(filePath));
        // Replace underscores and hyphens with spaces
        title = title.replace(/[_-]/g, ' ');
        // Capitalize words
        title = title.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    // Determine entry type
    let entryType = parsed.frontmatter.type || 'note';
    // Create entry in wiki
    const fileName = `${new Date().toISOString().split('T')[0]}-${path.basename(filePath)}`;
    const destPath = path.join(wikiManager.getWikiPath(), 'notes', fileName);
    wikiManager.writeEntry(destPath, parsed.content, {
        title,
        date: new Date().toISOString(),
        type: entryType,
        tags: parsed.tags,
        source: filePath,
        ingested: true,
    });
    console.log(`Successfully ingested as: ${entryType}`);
    console.log(`Tags: ${parsed.tags.join(', ') || 'none'}`);
}
/**
 * Ingest all files in a directory
 */
async function ingestDirectory(dirPath, wikiManager, parser) {
    const files = fs.readdirSync(dirPath);
    let ingested = 0;
    let skipped = 0;
    console.log(`\nIngesting directory: ${dirPath}`);
    console.log(`Found ${files.length} files\n`);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            continue;
        }
        try {
            await ingestFile(filePath, wikiManager, parser);
            ingested++;
        }
        catch (error) {
            skipped++;
        }
    }
    console.log(`\nIngestion complete:`);
    console.log(`  Ingested: ${ingested}`);
    console.log(`  Skipped: ${skipped}`);
}
/**
 * Ingest URL content (web page)
 */
async function ingestURL(url) {
    console.log(`Fetching URL: ${url}`);
    console.log('URL ingestion requires additional setup. Use a local file instead.');
}
exports.default = ingestCommand;
//# sourceMappingURL=ingest.js.map