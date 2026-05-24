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
exports.wikiParser = exports.WikiParser = void 0;
const fs = __importStar(require("fs"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const linkify_it_1 = __importDefault(require("linkify-it"));
/**
 * WikiParser handles parsing of wiki entries
 */
class WikiParser {
    linkify;
    constructor() {
        this.linkify = new linkify_it_1.default();
        // Add common patterns
        this.linkify.add('wiki:', 'http://');
        this.linkify.add('doc:', 'http://');
    }
    /**
     * Parse a markdown file and extract frontmatter and content
     */
    parseFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const rawContent = fs.readFileSync(filePath, 'utf-8');
            return this.parse(rawContent);
        }
        catch (error) {
            console.error(`Error parsing file ${filePath}:`, error);
            return null;
        }
    }
    /**
     * Parse markdown content
     */
    parse(rawContent) {
        const parsed = (0, gray_matter_1.default)(rawContent);
        return {
            frontmatter: parsed.data,
            content: parsed.content,
            links: this.extractLinks(parsed.content),
            tags: this.extractTags(parsed.content, parsed.data),
        };
    }
    /**
     * Extract links from markdown content
     */
    extractLinks(content) {
        const links = [];
        const matches = this.linkify.match(content);
        if (matches) {
            for (const match of matches) {
                links.push(match.url);
            }
        }
        return links;
    }
    /**
     * Extract tags from content and frontmatter
     */
    extractTags(content, frontmatter) {
        const tags = new Set();
        // Tags from frontmatter
        if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
            for (const tag of frontmatter.tags) {
                tags.add(tag);
            }
        }
        // Tags from content (#tag format)
        const tagRegex = /#([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            tags.add(match[1]);
        }
        return Array.from(tags);
    }
    /**
     * Extract wiki-style links from content [[link]]
     */
    extractWikiLinks(content) {
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        const links = [];
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
            links.push(match[1]);
        }
        return links;
    }
    /**
     * Parse frontmatter from raw markdown
     */
    parseFrontmatter(rawContent) {
        try {
            const parsed = (0, gray_matter_1.default)(rawContent);
            return parsed.data;
        }
        catch (error) {
            console.error('Error parsing frontmatter:', error);
            return {};
        }
    }
    /**
     * Extract headers from content
     */
    extractHeaders(content) {
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        const headers = [];
        let match;
        while ((match = headerRegex.exec(content)) !== null) {
            headers.push({
                level: match[1].length,
                text: match[2].trim(),
            });
        }
        return headers;
    }
    /**
     * Extract code blocks from content
     */
    extractCodeBlocks(content) {
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        const blocks = [];
        let match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                code: match[2],
            });
        }
        return blocks;
    }
    /**
     * Generate a summary from content
     */
    generateSummary(content, maxLength = 200) {
        // Remove markdown formatting
        let plainText = content
            .replace(/#{1,6}\s+/g, '') // Headers
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
            .replace(/\*([^*]+)\*/g, '$1') // Italic
            .replace(/`([^`]+)`/g, '$1') // Inline code
            .replace(/```[\s\S]*?```/g, '') // Code blocks
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
            .replace(/^\s*[-*+]\s+/gm, '') // List items
            .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
            .replace(/\n+/g, ' ') // Newlines to spaces
            .trim();
        if (plainText.length <= maxLength) {
            return plainText;
        }
        // Cut at word boundary
        const truncated = plainText.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }
    /**
     * Search within content using simple text matching
     */
    searchInContent(content, query) {
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        const snippets = [];
        let matches = 0;
        let index = 0;
        while ((index = contentLower.indexOf(queryLower, index)) !== -1) {
            matches++;
            // Extract snippet around match
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + query.length + 50);
            let snippet = content.substring(start, end);
            if (start > 0)
                snippet = '...' + snippet;
            if (end < content.length)
                snippet = snippet + '...';
            snippets.push(snippet);
            index += query.length;
        }
        return { matches, snippets };
    }
    /**
     * Validate frontmatter has required fields
     */
    validateFrontmatter(frontmatter, requiredFields) {
        const missing = [];
        for (const field of requiredFields) {
            if (!(field in frontmatter)) {
                missing.push(field);
            }
        }
        return {
            valid: missing.length === 0,
            missing,
        };
    }
    /**
     * Build frontmatter string from object
     */
    stringifyFrontmatter(data) {
        const lines = ['---'];
        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                lines.push(`${key}:`);
                for (const item of value) {
                    lines.push(`  - ${item}`);
                }
            }
            else if (typeof value === 'object' && value !== null) {
                lines.push(`${key}:`);
                for (const [k, v] of Object.entries(value)) {
                    lines.push(`  ${k}: ${v}`);
                }
            }
            else {
                lines.push(`${key}: ${value}`);
            }
        }
        lines.push('---');
        return lines.join('\n');
    }
    /**
     * Parse date string from filename
     */
    parseDateFromFilename(filename) {
        // Expected format: YYYY-MM-DD-hash.md
        const dateRegex = /^(\d{4}-\d{2}-\d{2})/;
        const match = filename.match(dateRegex);
        if (match) {
            return new Date(match[1]);
        }
        return null;
    }
    /**
     * Check if content has specific section
     */
    hasSection(content, sectionTitle) {
        const sectionRegex = new RegExp(`^#{1,6}\\s+${sectionTitle}`, 'im');
        return sectionRegex.test(content);
    }
    /**
     * Extract section content
     */
    extractSection(content, sectionTitle) {
        const lines = content.split('\n');
        let inSection = false;
        let sectionLevel = 0;
        const sectionLines = [];
        for (const line of lines) {
            const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const title = headerMatch[2].trim();
                if (title.toLowerCase() === sectionTitle.toLowerCase()) {
                    inSection = true;
                    sectionLevel = level;
                    continue;
                }
                else if (inSection && level <= sectionLevel) {
                    // Exited the section
                    break;
                }
            }
            if (inSection) {
                sectionLines.push(line);
            }
        }
        return sectionLines.length > 0 ? sectionLines.join('\n').trim() : null;
    }
}
exports.WikiParser = WikiParser;
// Export singleton
exports.wikiParser = new WikiParser();
exports.default = exports.wikiParser;
//# sourceMappingURL=parser.js.map