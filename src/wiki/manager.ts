import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import md5 from 'md5';
import { WikiEntry, DecisionEntry, InteractionEntry } from '../types';
import { configStore } from '../config/store';

/**
 * WikiManager handles all file operations for the wiki
 */
export class WikiManager {
  private wikiPath: string;

  constructor(wikiPath?: string) {
    this.wikiPath = wikiPath || configStore.getWikiPath();
  }

  /**
   * Ensure wiki directory structure exists
   */
  ensureStructure(): void {
    const dirs = [
      this.wikiPath,
      path.join(this.wikiPath, 'decisions'),
      path.join(this.wikiPath, 'interactions'),
      path.join(this.wikiPath, 'notes'),
      path.join(this.wikiPath, 'personas'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get wiki path
   */
  getWikiPath(): string {
    return this.wikiPath;
  }

  /**
   * Set wiki path
   */
  setWikiPath(wikiPath: string): void {
    this.wikiPath = wikiPath;
  }

  /**
   * Read a wiki entry from a file
   */
  readEntry(filePath: string): { data: any; content: string } | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(fileContent);

      return {
        data: parsed.data,
        content: parsed.content,
      };
    } catch (error) {
      console.error(`Error reading entry ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write a wiki entry to a file
   */
  writeEntry(
    filePath: string,
    content: string,
    metadata: Record<string, any>
  ): void {
    const fileContent = matter.stringify(content, metadata);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, fileContent, 'utf-8');
  }

  /**
   * Create a new decision entry
   */
  createDecision(
    title: string,
    context: string,
    decision: string,
    options?: {
      outcome?: string;
      tags?: string[];
      summary?: string;
    }
  ): DecisionEntry {
    const id = md5(`${title}-${Date.now()}`);
    const date = new Date().toISOString();

    const entry: DecisionEntry = {
      id,
      title,
      date,
      summary: options?.summary || decision.substring(0, 100),
      context,
      decision,
      outcome: options?.outcome,
      tags: options?.tags || [],
    };

    const fileName = `${date.split('T')[0]}-${id.substring(0, 8)}.md`;
    const filePath = path.join(this.wikiPath, 'decisions', fileName);

    this.writeEntry(filePath, decision, {
      title,
      date,
      id,
      type: 'decision',
      tags: entry.tags,
      context,
      summary: entry.summary,
      outcome: entry.outcome,
    });

    return entry;
  }

  /**
   * Create an interaction entry (chat message)
   */
  createInteraction(
    persona: string,
    query: string,
    response: string,
    context?: string
  ): InteractionEntry {
    const id = md5(`${query}-${Date.now()}`);
    const date = new Date().toISOString();

    const entry: InteractionEntry = {
      id,
      date,
      persona,
      query,
      response,
      context,
    };

    const fileName = `${date.split('T')[0]}-${id.substring(0, 8)}.md`;
    const filePath = path.join(this.wikiPath, 'interactions', fileName);

    this.writeEntry(filePath, response, {
      title: `${persona}: ${query.substring(0, 50)}`,
      date,
      id,
      type: 'interaction',
      persona,
      query,
      context,
    });

    return entry;
  }

  /**
   * Get all decision entries
   */
  getDecisions(): DecisionEntry[] {
    const decisionsDir = path.join(this.wikiPath, 'decisions');

    if (!fs.existsSync(decisionsDir)) {
      return [];
    }

    const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
    const decisions: DecisionEntry[] = [];

    for (const file of files) {
      const filePath = path.join(decisionsDir, file);
      const entry = this.readEntry(filePath);

      if (entry) {
        decisions.push({
          id: entry.data.id || file,
          title: entry.data.title || 'Untitled',
          date: entry.data.date || '',
          summary: entry.data.summary || '',
          context: entry.data.context || '',
          decision: entry.content,
          outcome: entry.data.outcome,
          tags: entry.data.tags || [],
        });
      }
    }

    return decisions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Get all interaction entries
   */
  getInteractions(): InteractionEntry[] {
    const interactionsDir = path.join(this.wikiPath, 'interactions');

    if (!fs.existsSync(interactionsDir)) {
      return [];
    }

    const files = fs.readdirSync(interactionsDir).filter(f => f.endsWith('.md'));
    const interactions: InteractionEntry[] = [];

    for (const file of files) {
      const filePath = path.join(interactionsDir, file);
      const entry = this.readEntry(filePath);

      if (entry) {
        interactions.push({
          id: entry.data.id || file,
          date: entry.data.date || '',
          persona: entry.data.persona || 'unknown',
          query: entry.data.query || '',
          response: entry.content,
          context: entry.data.context,
        });
      }
    }

    return interactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Search entries by query
   */
  searchEntries(query: string, type?: 'decision' | 'interaction'): any[] {
    const results: any[] = [];
    const queryLower = query.toLowerCase();

    if (!type || type === 'decision') {
      const decisions = this.getDecisions();
      for (const decision of decisions) {
        if (
          decision.title.toLowerCase().includes(queryLower) ||
          decision.summary.toLowerCase().includes(queryLower) ||
          decision.context.toLowerCase().includes(queryLower) ||
          decision.decision.toLowerCase().includes(queryLower)
        ) {
          results.push({ ...decision, entryType: 'decision' });
        }
      }
    }

    if (!type || type === 'interaction') {
      const interactions = this.getInteractions();
      for (const interaction of interactions) {
        if (
          interaction.query.toLowerCase().includes(queryLower) ||
          interaction.response.toLowerCase().includes(queryLower) ||
          (interaction.context && interaction.context.toLowerCase().includes(queryLower))
        ) {
          results.push({ ...interaction, entryType: 'interaction' });
        }
      }
    }

    return results;
  }

  /**
   * Get entry by ID
   */
  getEntryById(id: string): any | null {
    // Search in decisions
    const decisions = this.getDecisions();
    const decision = decisions.find(d => d.id === id);
    if (decision) {
      return { ...decision, entryType: 'decision' };
    }

    // Search in interactions
    const interactions = this.getInteractions();
    const interaction = interactions.find(i => i.id === id);
    if (interaction) {
      return { ...interaction, entryType: 'interaction' };
    }

    return null;
  }

  /**
   * List all files in wiki
   */
  listFiles(): { decisions: string[]; interactions: string[]; notes: string[] } {
    return {
      decisions: fs.readdirSync(path.join(this.wikiPath, 'decisions')).filter(f =>
        f.endsWith('.md')
      ),
      interactions: fs.readdirSync(path.join(this.wikiPath, 'interactions')).filter(f =>
        f.endsWith('.md')
      ),
      notes: fs.existsSync(path.join(this.wikiPath, 'notes'))
        ? fs.readdirSync(path.join(this.wikiPath, 'notes')).filter(f => f.endsWith('.md'))
        : [],
    };
  }

  /**
   * Get wiki statistics
   */
  getStats(): {
    totalDecisions: number;
    totalInteractions: number;
    totalNotes: number;
    lastUpdated: string | null;
  } {
    const files = this.listFiles();

    const allFiles = [
      ...files.decisions,
      ...files.interactions,
      ...files.notes,
    ];

    let lastUpdated: string | null = null;
    if (allFiles.length > 0) {
      const stats = fs.statSync(
        path.join(this.wikiPath, 'decisions', files.decisions[0])
      );
      lastUpdated = stats.mtime.toISOString();
    }

    return {
      totalDecisions: files.decisions.length,
      totalInteractions: files.interactions.length,
      totalNotes: files.notes.length,
      lastUpdated,
    };
  }

  /**
   * Update a decision with outcome
   */
  updateDecisionOutcome(
    id: string,
    outcome: string
  ): boolean {
    const decisionsDir = path.join(this.wikiPath, 'decisions');

    if (!fs.existsSync(decisionsDir)) {
      return false;
    }

    const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(decisionsDir, file);
      const entry = this.readEntry(filePath);

      if (entry && entry.data.id === id) {
        const updatedMetadata = {
          ...entry.data,
          outcome,
          updatedAt: new Date().toISOString(),
        };

        this.writeEntry(filePath, entry.content, updatedMetadata);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if wiki exists and is initialized
   */
  isInitialized(): boolean {
    return (
      fs.existsSync(this.wikiPath) &&
      fs.existsSync(path.join(this.wikiPath, 'decisions'))
    );
  }
}

// Export singleton
export const wikiManager = new WikiManager();

export default wikiManager;