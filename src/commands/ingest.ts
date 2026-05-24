import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { WikiParser } from '../wiki/parser';

/**
 * Ingest a source file into the wiki
 */
export async function ingestCommand(
  filePath?: string
): Promise<void> {
  const config = configStore.load();
  const wikiManager = new WikiManager(config.wikiPath);
  const parser = new WikiParser();

  // Ensure wiki structure exists
  wikiManager.ensureStructure();

  // If no file path provided, ask for it
  if (!filePath) {
    const { path: enteredPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter the file path to ingest:',
        validate: (input: string) => {
          if (!input) return 'Please enter a file path';
          if (!fs.existsSync(input)) return 'File does not exist';
          return true;
        },
      },
    ]);
    filePath = enteredPath;
  }

  if (!fs.existsSync(filePath!)) {
    console.error(`Error: File not found: ${filePath}`);
    return;
  }

  const stats = fs.statSync(filePath!);

  if (stats.isDirectory()) {
    // Ingest all files in directory
    await ingestDirectory(filePath!, wikiManager, parser);
  } else {
    // Ingest single file
    await ingestFile(filePath!, wikiManager, parser);
  }
}

/**
 * Ingest a single file
 */
async function ingestFile(
  filePath: string,
  wikiManager: WikiManager,
  parser: WikiParser
): Promise<void> {
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
    title = title.replace(/\b\w/g, (c: string) => c.toUpperCase());
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
async function ingestDirectory(
  dirPath: string,
  wikiManager: WikiManager,
  parser: WikiParser
): Promise<void> {
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
    } catch (error) {
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
export async function ingestURL(url: string): Promise<void> {
  console.log(`Fetching URL: ${url}`);
  console.log('URL ingestion requires additional setup. Use a local file instead.');
}

export default ingestCommand;