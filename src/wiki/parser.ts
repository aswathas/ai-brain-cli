import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import LinkifyIt from 'linkify-it';
import { WikiEntry } from '../types';

/**
 * WikiParser handles parsing of wiki entries
 */
export class WikiParser {
  private linkify: LinkifyIt;

  constructor() {
    this.linkify = new LinkifyIt();
    // Add common patterns
    this.linkify.add('wiki:', 'http://');
    this.linkify.add('doc:', 'http://');
  }

  /**
   * Parse a markdown file and extract frontmatter and content
   */
  parseFile(filePath: string): {
    frontmatter: Record<string, any>;
    content: string;
    links: string[];
    tags: string[];
  } | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const rawContent = fs.readFileSync(filePath, 'utf-8');
      return this.parse(rawContent);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse markdown content
   */
  parse(rawContent: string): {
    frontmatter: Record<string, any>;
    content: string;
    links: string[];
    tags: string[];
  } {
    const parsed = matter(rawContent);

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
  extractLinks(content: string): string[] {
    const links: string[] = [];
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
  extractTags(content: string, frontmatter: Record<string, any>): string[] {
    const tags: Set<string> = new Set();

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
  extractWikiLinks(content: string): string[] {
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = wikiLinkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Parse frontmatter from raw markdown
   */
  parseFrontmatter(rawContent: string): Record<string, any> {
    try {
      const parsed = matter(rawContent);
      return parsed.data;
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return {};
    }
  }

  /**
   * Extract headers from content
   */
  extractHeaders(content: string): { level: number; text: string }[] {
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const headers: { level: number; text: string }[] = [];
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
  extractCodeBlocks(content: string): { language: string; code: string }[] {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks: { language: string; code: string }[] = [];
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
  generateSummary(content: string, maxLength: number = 200): string {
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
  searchInContent(content: string, query: string): {
    matches: number;
    snippets: string[];
  } {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const snippets: string[] = [];
    let matches = 0;

    let index = 0;
    while ((index = contentLower.indexOf(queryLower, index)) !== -1) {
      matches++;

      // Extract snippet around match
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 50);
      let snippet = content.substring(start, end);

      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';

      snippets.push(snippet);
      index += query.length;
    }

    return { matches, snippets };
  }

  /**
   * Validate frontmatter has required fields
   */
  validateFrontmatter(
    frontmatter: Record<string, any>,
    requiredFields: string[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

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
  stringifyFrontmatter(data: Record<string, any>): string {
    const lines: string[] = ['---'];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${key}:`);
        for (const [k, v] of Object.entries(value)) {
          lines.push(`  ${k}: ${v}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Parse date string from filename
   */
  parseDateFromFilename(filename: string): Date | null {
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
  hasSection(content: string, sectionTitle: string): boolean {
    const sectionRegex = new RegExp(`^#{1,6}\\s+${sectionTitle}`, 'im');
    return sectionRegex.test(content);
  }

  /**
   * Extract section content
   */
  extractSection(content: string, sectionTitle: string): string | null {
    const lines = content.split('\n');
    let inSection = false;
    let sectionLevel = 0;
    const sectionLines: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)/);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        if (title.toLowerCase() === sectionTitle.toLowerCase()) {
          inSection = true;
          sectionLevel = level;
          continue;
        } else if (inSection && level <= sectionLevel) {
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

// Export singleton
export const wikiParser = new WikiParser();

export default wikiParser;