/**
 * WikiParser handles parsing of wiki entries
 */
export declare class WikiParser {
    private linkify;
    constructor();
    /**
     * Parse a markdown file and extract frontmatter and content
     */
    parseFile(filePath: string): {
        frontmatter: Record<string, any>;
        content: string;
        links: string[];
        tags: string[];
    } | null;
    /**
     * Parse markdown content
     */
    parse(rawContent: string): {
        frontmatter: Record<string, any>;
        content: string;
        links: string[];
        tags: string[];
    };
    /**
     * Extract links from markdown content
     */
    extractLinks(content: string): string[];
    /**
     * Extract tags from content and frontmatter
     */
    extractTags(content: string, frontmatter: Record<string, any>): string[];
    /**
     * Extract wiki-style links from content [[link]]
     */
    extractWikiLinks(content: string): string[];
    /**
     * Parse frontmatter from raw markdown
     */
    parseFrontmatter(rawContent: string): Record<string, any>;
    /**
     * Extract headers from content
     */
    extractHeaders(content: string): {
        level: number;
        text: string;
    }[];
    /**
     * Extract code blocks from content
     */
    extractCodeBlocks(content: string): {
        language: string;
        code: string;
    }[];
    /**
     * Generate a summary from content
     */
    generateSummary(content: string, maxLength?: number): string;
    /**
     * Search within content using simple text matching
     */
    searchInContent(content: string, query: string): {
        matches: number;
        snippets: string[];
    };
    /**
     * Validate frontmatter has required fields
     */
    validateFrontmatter(frontmatter: Record<string, any>, requiredFields: string[]): {
        valid: boolean;
        missing: string[];
    };
    /**
     * Build frontmatter string from object
     */
    stringifyFrontmatter(data: Record<string, any>): string;
    /**
     * Parse date string from filename
     */
    parseDateFromFilename(filename: string): Date | null;
    /**
     * Check if content has specific section
     */
    hasSection(content: string, sectionTitle: string): boolean;
    /**
     * Extract section content
     */
    extractSection(content: string, sectionTitle: string): string | null;
}
export declare const wikiParser: WikiParser;
export default wikiParser;
//# sourceMappingURL=parser.d.ts.map