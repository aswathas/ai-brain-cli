import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { TimeTravel } from '../wiki/timeTravel';

/**
 * Show wiki statistics and status
 */
export async function statusCommand(): Promise<void> {
  const config = configStore.load();
  const wikiManager = new WikiManager(config.wikiPath);
  const timeTravel = new TimeTravel(wikiManager);

  console.log('\n===========================================');
  console.log('  AI Brain Status');
  console.log('===========================================\n');

  // Wiki existence check
  const wikiExists = wikiManager.isInitialized();

  if (!wikiExists) {
    console.log(chalk.yellow('Wiki not initialized.'));
    console.log('Run "ai-brain init" to set up your wiki.\n');
    return;
  }

  // Wiki path
  console.log(chalk.bold('Wiki:'));
  console.log(`  Path: ${wikiManager.getWikiPath()}`);
  console.log(`  Status: ${chalk.green('Initialized')}`);
  console.log();

  // Statistics
  const stats = wikiManager.getStats();
  console.log(chalk.bold('Statistics:'));
  console.log(`  Decisions: ${chalk.cyan(stats.totalDecisions)}`);
  console.log(`  Interactions: ${chalk.cyan(stats.totalInteractions)}`);
  console.log(`  Notes: ${chalk.cyan(stats.totalNotes)}`);

  if (stats.lastUpdated) {
    const lastUpdated = new Date(stats.lastUpdated);
    const relativeTime = getRelativeTime(lastUpdated);
    console.log(`  Last updated: ${relativeTime}`);
  }
  console.log();

  // Provider configuration
  console.log(chalk.bold('LLM Provider:'));
  console.log(`  Default: ${chalk.cyan(config.defaultProvider)}`);
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
  console.log(chalk.bold('Available Providers:'));
  const availableProviders = ['anthropic', 'openai', 'google', 'deepseek', 'openrouter', 'ollama'];
  for (const prov of availableProviders) {
    const provConfig = config.providers?.[prov];
    const isConfigured = provConfig?.apiKey ? true : (prov === 'ollama');
    const status = isConfigured ? chalk.green('Configured') : chalk.gray('Not configured');
    console.log(`  ${prov}: ${status}`);
  }
  console.log();

  // Personas
  const personas = configStore.listPersonas();
  console.log(chalk.bold('Personas:'));
  console.log(`  Total: ${personas.length}`);
  if (Object.keys(personas).length > 0) {
    for (const [key, persona] of Object.entries(personas)) {
      console.log(`  - @${key}: ${persona.description}`);
    }
  }
  console.log();

  // Auto mode
  console.log(chalk.bold('Auto Mode:'));
  console.log(`  Enabled: ${config.autoMode ? chalk.green('Yes') : chalk.gray('No')}`);
  console.log();

  // Recent timeline
  console.log(chalk.bold('Recent Timeline:'));
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
  } else {
    console.log('  No decisions yet.');
  }
  console.log();

  // Storage info
  console.log(chalk.bold('Storage:'));
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
  console.log(chalk.bold('Config:'));
  console.log(`  Location: ${configStore.getConfigPath()}`);
  console.log('\n===========================================\n');
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default statusCommand;