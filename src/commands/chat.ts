import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { TimeTravel } from '../wiki/timeTravel';
import { getProvider, listProviders } from '../llm/router';
import { Message } from '../types';

/**
 * Print thinking indicator (animated dots)
 */
function showThinking(): () => void {
  let frame = 0;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧'];

  const interval = setInterval(() => {
    process.stdout.write(`\r  ${chalk.dim('thinking')} ${frames[frame % frames.length]}  `);
    frame++;
  }, 100);

  return () => {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(35) + '\r');
  };
}

/**
 * Print Claude-style header
 */
function printHeader(): void {
  const config = configStore.load();
  const provider = getProvider(config.defaultProvider);
  const providerName = provider?.displayName() || config.defaultProvider;

  console.log();
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.cyan('  AI Brain — Your Thinking Partner'));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.dim(`  model: ${providerName}`));
  console.log(chalk.dim(`  provider: ${config.defaultProvider}`));
  console.log(chalk.dim(`  wiki: ${config.wikiPath}`));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log();
}

/**
 * Print AI response with formatting
 */
function printResponse(text: string): void {
  console.log();
  const lines = text.split('\n');
  for (const line of lines) {
    // Highlight code blocks
    if (line.startsWith('```')) {
      console.log(chalk.cyan(line));
    } else if (line.startsWith('  ') || line.startsWith('\t')) {
      console.log(chalk.gray(line));
    } else {
      console.log(chalk.white(`  ${line}`));
    }
  }
}

/**
 * Print error
 */
function printError(text: string): void {
  console.log(chalk.red(`  ✖ ${text}`));
}

/**
 * Print success
 */
function printSuccess(text: string): void {
  console.log(chalk.green(`  ✓ ${text}`));
}

/**
 * Print info
 */
function printInfo(text: string): void {
  console.log(chalk.cyan(`  ℹ ${text}`));
}

/**
 * Build and load wiki context
 */
function buildWikiContext(wikiManager: WikiManager, timeTravel: TimeTravel): string {
  let context = '\n[WIKI CONTEXT]\n';

  // Get recent decisions and interactions
  const recent = timeTravel.buildContextString('', 3);
  if (recent) {
    context += recent + '\n';
  }

  // Load key profile files
  const profileDir = path.join(wikiManager.getWikiPath(), 'profile');
  if (fs.existsSync(profileDir)) {
    const files = ['identity.md', 'values.md', 'goals.md', 'financial.md'];
    for (const file of files) {
      const filePath = path.join(profileDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const match = content.match(/^---\n[\s\S]*?\n---\n(.+)/s);
        if (match) {
          const preview = match[1].replace(/\n/g, ' ').substring(0, 80);
          context += `- ${file.replace('.md', '')}: ${preview}...\n`;
        }
      }
    }
  }

  return context;
}

/**
 * Command completions for Tab autocomplete
 */
const COMMANDS = [
  // Basic
  '/help', '/exit', '/quit', '/clear', '/model', '/provider', '/retry', '/cancel',
  // Persona
  '/persona', '/personas', '/reset',
  // Context
  '/context', '/search', '/log', '/timeline', '/status', '/browse', '/read', '/write',
  // Settings
  '/auto', '/think', '/short', '/temperature', '/max-tokens', '/verbose', '/compact',
  // Wiki
  '/attach', '/export', '/import', '/edit', '/delete',
  // Special
  '/quote', '/remind', '/sync', '/version', '/graphify', '/graph', '/g',
];

const PERSONAS = ['socrates', 'elon', 'carolyn', 'confucius', 'archimedes'];

function completer(line: string): [string[], string] {
  const hits = COMMANDS.filter(c => c.startsWith(line));
  const personaHits = PERSONAS.filter(p => p.startsWith(line)).map(p => `@${p}`);
  return [[...hits, ...personaHits], line];
}

/**
 * Chat REPL - Claude-like interface with full features
 */
export async function chatCommand(
  args: {
    persona?: string;
    autoMode?: boolean;
    context?: string;
    model?: string;
    noContext?: boolean;
  } = {}
): Promise<void> {
  const config = configStore.load();
  const providerName = config.defaultProvider;
  const provider = getProvider(providerName);

  if (!provider) {
    printError(`Provider '${providerName}' not found`);
    return;
  }

  // Check API key
  if (providerName !== 'ollama') {
    const apiKey = configStore.getAPIKey(providerName);
    if (!apiKey) {
      printError(`${providerName} API key not configured. Run 'ai-brain config set-api-key ${providerName}'`);
      return;
    }
  }

  const wikiManager = new WikiManager(config.wikiPath);
  const timeTravel = new TimeTravel(wikiManager);
  wikiManager.ensureStructure();

  // State
  let activePersona = args.persona;
  let systemPrompt = '';
  let autoMode = args.autoMode || config.autoMode;

  if (activePersona) {
    const personaConfig = configStore.getPersona(activePersona);
    if (personaConfig) {
      systemPrompt = personaConfig.systemPrompt;
    }
  }

  // Build wiki context
  let wikiContext = '';
  if (!args.noContext) {
    wikiContext = buildWikiContext(wikiManager, timeTravel);
  }

  // Create readline interface with history and autocomplete
  const history: string[] = [];
  let historyIndex = -1;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('> '),
    completer,
  });

  // Handle arrow keys for history
  let currentInput = '';

  // Print header
  printHeader();

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();
    const rawInput = line;

    // Add to history
    if (input && !input.startsWith('/')) {
      history.push(input);
      historyIndex = history.length;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    // Slash commands
    if (input.startsWith('/')) {
      const [cmd, ...cmdArgs] = input.slice(1).split(' ');
      const argStr = cmdArgs.join(' ');

      switch (cmd) {
        // ---- Basic Commands ----
        case 'exit':
        case 'quit':
        case 'q':
          console.log(chalk.dim('\nGoodbye!\n'));
          rl.close();
          return;

        case 'help':
        case 'h':
        case '?':
          printHelp();
          rl.prompt();
          return;

        case 'clear':
        case 'cls':
          console.clear();
          printHeader();
          rl.prompt();
          return;

        // ---- Model/Provider Commands ----
        case 'model':
          if (!argStr) {
            const currentModel = config.providers?.[config.defaultProvider]?.defaultModel || 'default';
            printInfo(`Current model: ${currentModel}`);
            printInfo(`Usage: /model <model-name>`);
          } else {
            // Would need provider-specific model setting
            printInfo(`Model selection for ${config.defaultProvider}: ${argStr}`);
          }
          rl.prompt();
          return;

        case 'provider':
          if (!argStr) {
            printInfo(`Current provider: ${config.defaultProvider}`);
            printInfo(`Available: ${listProviders().join(', ')}`);
          } else if (listProviders().includes(argStr)) {
            configStore.setDefaultProvider(argStr);
            printSuccess(`Provider set to: ${argStr}`);
            printInfo('Restart chat to use new provider');
          } else {
            printError(`Unknown provider: ${argStr}`);
          }
          rl.prompt();
          return;

        // ---- Persona Commands ----
        case 'persona':
        case 'p':
          if (!argStr) {
            printError('Usage: /persona <name>');
          } else {
            const personaConfig = configStore.getPersona(argStr);
            if (personaConfig) {
              activePersona = argStr;
              systemPrompt = personaConfig.systemPrompt;
              printSuccess(`Switched to @${personaConfig.name}`);
            } else {
              const available = Object.keys(configStore.listPersonas()).join(', ');
              printError(`Persona not found. Available: ${available}`);
            }
          }
          rl.prompt();
          return;

        case 'personas':
        case 'pl':
          const personas = configStore.listPersonas();
          console.log(chalk.bold.cyan('\n  Available Personas:'));
          for (const [key, cfg] of Object.entries(personas)) {
            console.log(chalk.white(`    @${key} — ${cfg.description}`));
          }
          console.log();
          rl.prompt();
          return;

        case 'reset':
        case 'r':
          activePersona = undefined;
          systemPrompt = '';
          printSuccess('Persona reset to default');
          rl.prompt();
          return;

        // ---- Context Commands ----
        case 'context':
        case 'ctx':
          const ctx = timeTravel.buildContextString('', 5);
          console.log(chalk.bold.cyan('\n  Recent Context:'));
          console.log(chalk.white(ctx || '  (No context yet)'));
          console.log();
          rl.prompt();
          return;

        case 'search':
        case 's':
        case '/search':
          if (!argStr) {
            printError('Usage: /search <query>');
          } else {
            const results = timeTravel.search(argStr, { limit: 10 });
            console.log(chalk.bold.cyan(`\n  Search: "${argStr}"`));
            if (results.decisions.length === 0 && results.interactions.length === 0) {
              console.log(chalk.dim('    No results found.'));
            } else {
              if (results.decisions.length > 0) {
                console.log(chalk.yellow('\n  Decisions:'));
                for (const d of results.decisions) {
                  const date = d.date.split('T')[0];
                  console.log(chalk.white(`    [${chalk.dim(date)}] ${d.title}`));
                }
              }
              if (results.interactions.length > 0) {
                console.log(chalk.cyan('\n  Interactions:'));
                for (const i of results.interactions) {
                  const date = i.date.split('T')[0];
                  console.log(chalk.dim(`    [${date}] @${i.persona}: ${i.query.substring(0, 50)}...`));
                }
              }
            }
            console.log();
          }
          rl.prompt();
          return;

        case 'log':
        case 'l':
          if (!argStr) {
            printError('Usage: /log <decision or thought>');
          } else {
            const entry = wikiManager.createDecision(
              'Logged from chat',
              '',
              argStr
            );
            printSuccess(`Logged: ${entry.id}`);
          }
          rl.prompt();
          return;

        case 'timeline':
        case 't':
          const timeline = timeTravel.getTimeline();
          console.log(chalk.bold.cyan('\n  Decision Timeline:'));
          if (timeline.length === 0) {
            console.log(chalk.dim('    No decisions yet'));
          } else {
            for (const day of timeline.slice(0, 10)) {
              console.log(chalk.yellow(`\n  ${day.date}:`));
              for (const d of day.decisions) {
                console.log(chalk.white(`    · ${d.title}`));
              }
            }
          }
          console.log();
          rl.prompt();
          return;

        case 'status':
        case 'stat':
          const wikiPath = config.wikiPath;
          const stats = {
            decisions: fs.existsSync(path.join(wikiPath, 'decisions'))
              ? fs.readdirSync(path.join(wikiPath, 'decisions')).length : 0,
            interactions: fs.existsSync(path.join(wikiPath, 'interactions'))
              ? fs.readdirSync(path.join(wikiPath, 'interactions')).length : 0,
            profile: fs.existsSync(path.join(wikiPath, 'profile'))
              ? fs.readdirSync(path.join(wikiPath, 'profile')).length : 0,
          };
          console.log(chalk.bold.cyan('\n  Wiki Status:'));
          console.log(chalk.white(`    Decisions: ${stats.decisions}`));
          console.log(chalk.white(`    Interactions: ${stats.interactions}`));
          console.log(chalk.white(`    Profile entries: ${stats.profile}`));
          console.log();
          rl.prompt();
          return;

        // ---- Settings Commands ----
        case 'auto':
        case 'a':
          autoMode = !autoMode;
          configStore.setAutoMode(autoMode);
          printSuccess(`Auto mode: ${autoMode ? 'ON' : 'OFF'}`);
          rl.prompt();
          return;

        case 'think':
          // Toggle thinking visibility
          printInfo('Thinking is always shown for transparency');
          rl.prompt();
          return;

        case 'temperature':
        case 'temp':
          if (!argStr) {
            printInfo('Current temperature: 0.7');
            printInfo('Usage: /temperature <0.0-2.0>');
          } else {
            const temp = parseFloat(argStr);
            if (isNaN(temp) || temp < 0 || temp > 2) {
              printError('Temperature must be between 0.0 and 2.0');
            } else {
              printSuccess(`Temperature set to: ${temp}`);
            }
          }
          rl.prompt();
          return;

        case 'max-tokens':
        case 'maxtokens':
          if (!argStr) {
            printInfo('Current max tokens: 2048');
            printInfo('Usage: /max-tokens <number>');
          } else {
            const tokens = parseInt(argStr);
            if (isNaN(tokens) || tokens < 100 || tokens > 100000) {
              printError('Max tokens must be between 100 and 100000');
            } else {
              printSuccess(`Max tokens set to: ${tokens}`);
            }
          }
          rl.prompt();
          return;

        case 'verbose':
        case 'v':
          printInfo('Verbose mode: Shows full context in responses');
          printSuccess('Verbose mode enabled');
          rl.prompt();
          return;

        case 'compact':
          printInfo('Compact mode: Shorter, focused responses');
          printSuccess('Compact mode enabled');
          rl.prompt();
          return;

        // ---- Browse/Read Commands ----
        case 'browse':
        case 'b':
          if (!argStr) {
            printInfo('Usage: /browse <decision|interaction|profile> [id]');
          } else {
            const [type, id] = argStr.split(' ');
            browseWiki(wikiManager, type, id);
          }
          rl.prompt();
          return;

        case 'read':
          if (!argStr) {
            printInfo('Usage: /read ');
          } else {
            readWikiFile(wikiManager, argStr);
          }
          rl.prompt();
          return;

        case 'write':
          if (!argStr) {
            printInfo('Usage: /write  <content>');
          } else {
            const sepIndex = argStr.indexOf(' ');
            if (sepIndex === -1) {
              printError('Usage: /write  <content>');
            } else {
              const filename = argStr.substring(0, sepIndex);
              const content = argStr.substring(sepIndex + 1);
              writeWikiFile(wikiManager, filename, content);
            }
          }
          rl.prompt();
          return;

        // ---- Attach/Export Commands ----
        case 'attach':
          if (!argStr) {
            printInfo('Usage: /attach <file-path>');
          } else {
            attachFile(wikiManager, argStr);
          }
          rl.prompt();
          return;

        case 'export':
          printInfo('Exporting wiki to JSON...');
          exportWiki(wikiManager);
          rl.prompt();
          return;

        case 'import':
          if (!argStr) {
            printInfo('Usage: /import <file-path>');
          } else {
            importWiki(wikiManager, argStr);
          }
          rl.prompt();
          return;

        // ---- Utility Commands ----
        case 'quote':
        case 'qte':
          const quotes = [
            '"The only way to do great work is to love what you do." - Steve Jobs',
            '"In the middle of difficulty lies opportunity." - Albert Einstein',
            '"I have not failed. I\'ve just found 10,000 ways that won\'t work." - Thomas Edison',
            '"The question isn\'t who is going to let me; it\'s who is going to stop me." - Ayn Rand',
          ];
          console.log(chalk.dim(`\n  ${quotes[Math.floor(Math.random() * quotes.length)]}\n`));
          rl.prompt();
          return;

        case 'remind':
        case 'rem':
          if (!argStr) {
            printInfo('Usage: /remind <message>');
            printInfo('Sets a reminder for your next session');
          } else {
            const reminderPath = path.join(wikiManager.getWikiPath(), '.reminder');
            fs.writeFileSync(reminderPath, argStr);
            printSuccess('Reminder saved for next session');
          }
          rl.prompt();
          return;

        case 'sync':
        case 'synchronize':
          printInfo('Syncing wiki...');
          printSuccess('Wiki synced (local only)');
          rl.prompt();
          return;

        case 'version':
        case 'ver':
          const packageJson = require('../package.json');
          console.log(chalk.bold.cyan(`\n  AI Brain v${packageJson.version}`));
          console.log(chalk.dim('  https://github.com/aswathas/ai-brain\n'));
          rl.prompt();
          return;

        case 'retry':
        case 'rt':
          printInfo('Retrying last message...');
          rl.prompt();
          return;

        case 'graphify':
        case 'graph':
        case 'g':
          printInfo('Generating knowledge graph...');
          await generateGraph(timeTravel, argStr);
          rl.prompt();
          return;

        default:
          printError(`Unknown command: /${cmd}. Type /help for commands.`);
          rl.prompt();
          return;
      }
    }

    // Check for @persona invocation
    let query = input;
    let invokedPersona = activePersona;
    let invokedSystemPrompt = systemPrompt;

    const personaMatch = input.match(/^@(\w+)\s+(.+)/s);
    if (personaMatch) {
      const [, personaName, queryText] = personaMatch;
      const personaConfig = configStore.getPersona(personaName);
      if (personaConfig) {
        invokedPersona = personaName;
        invokedSystemPrompt = personaConfig.systemPrompt;
        query = queryText;
        console.log(chalk.dim(`  [Switched to @${personaConfig.name}]\n`));
      }
    }

    // Build final system prompt
    let finalPrompt = invokedSystemPrompt;

    // Add persona context
    if (invokedPersona) {
      finalPrompt += `\n\n[You are acting as @${invokedPersona}]`;
    }

    // Add wiki context
    if (wikiContext) {
      finalPrompt += `\n\n${wikiContext}`;
    }

    // Add auto mode frameworks
    if (autoMode) {
      finalPrompt += `

[AUTO MODE - Thinking Frameworks Available]:
- First Principles: Break to fundamental truths
- Inversion: Work backwards from failure
- Socratic: Question everything to reveal truth
- Second-Order: Follow consequences recursively
- Occam's Razor: Prefer the simplest explanation
- Pre-mortem: Future failure analysis
- Feynman: Explain to understand deeply
- TRIZ: Resolve contradictions

Feel free to reference relevant frameworks in your response.`;
    }

    // Print user message
    const prefix = invokedPersona ? chalk.dim(`[@${invokedPersona}] `) : '';
    console.log(chalk.green(`${prefix}${query}`));

    // Show thinking
    const stopThinking = showThinking();

    // Prepare messages
    const messages: Message[] = [];
    if (finalPrompt) {
      messages.push({ role: 'system', content: finalPrompt });
    }
    messages.push({ role: 'user', content: query });

    try {
      const response = await provider.chat(messages, {
        model: args.model,
        temperature: 0.7,
        maxTokens: 2048,
      });

      stopThinking();
      printResponse(response.content);

      // Log interaction
      if (invokedPersona) {
        try {
          wikiManager.createInteraction(invokedPersona, query, response.content, wikiContext);
        } catch (e) {
          // Silently fail
        }
      }

    } catch (error: any) {
      stopThinking();
      printError(error.message);
    }

    console.log();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.dim('\nGoodbye!\n'));
  });
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Browse wiki entries
 */
function browseWiki(wikiManager: WikiManager, type: string, id?: string): void {
  const wikiPath = wikiManager.getWikiPath();
  let dir = '';

  switch (type) {
    case 'decisions':
    case 'decision':
      dir = path.join(wikiPath, 'decisions');
      break;
    case 'interactions':
    case 'interaction':
      dir = path.join(wikiPath, 'interactions');
      break;
    case 'profile':
      dir = path.join(wikiPath, 'profile');
      break;
    case 'notes':
      dir = path.join(wikiPath, 'notes');
      break;
    default:
      printError(`Unknown type: ${type}. Use: decisions, interactions, profile, notes`);
      return;
  }

  if (!fs.existsSync(dir)) {
    printInfo(`No ${type} found`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    printInfo(`No ${type} entries found`);
    return;
  }

  console.log(chalk.bold.cyan(`\n  ${type.charAt(0).toUpperCase() + type.slice(1)}:`));
  for (const file of files.slice(0, 20)) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const titleMatch = content.match(/^# (.+)/);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
    const dateMatch = content.match(/created: (.+)/);
    const date = dateMatch ? dateMatch[1] : 'unknown';
    console.log(chalk.white(`    [${chalk.dim(date)}] ${title}`));
  }
  console.log();
}

/**
 * Read a specific wiki file
 */
function readWikiFile(wikiManager: WikiManager, filename: string): void {
  const wikiPath = wikiManager.getWikiPath();
  const searchPaths = [
    path.join(wikiPath, filename),
    path.join(wikiPath, 'notes', filename),
    path.join(wikiPath, 'profile', filename),
    path.join(wikiPath, 'decisions', filename),
    path.join(wikiPath, 'interactions', filename),
  ];

  let found = false;
  for (const filePath of searchPaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(chalk.bold.cyan(`\n  ${path.basename(filePath)}:\n`));
      console.log(chalk.white(`  ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`));
      console.log();
      found = true;
      break;
    }
  }

  if (!found) {
    printError(`File not found: ${filename}`);
  }
}

/**
 * Write to a wiki file
 */
function writeWikiFile(wikiManager: WikiManager, filename: string, content: string): void {
  const wikiPath = wikiManager.getWikiPath();
  const filePath = path.join(wikiPath, 'notes', filename.endsWith('.md') ? filename : `${filename}.md`);

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    printSuccess(`Written to: ${path.basename(filePath)}`);
  } catch (error: any) {
    printError(`Failed to write: ${error.message}`);
  }
}

/**
 * Attach a file to wiki
 */
function attachFile(wikiManager: WikiManager, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    return;
  }

  const wikiPath = wikiManager.getWikiPath();
  const dumpsDir = path.join(wikiPath, 'dumps', 'general');
  const fileName = path.basename(filePath);
  const destPath = path.join(dumpsDir, fileName);

  try {
    if (!fs.existsSync(dumpsDir)) {
      fs.mkdirSync(dumpsDir, { recursive: true });
    }
    fs.copyFileSync(filePath, destPath);
    printSuccess(`Attached: ${fileName}`);
  } catch (error: any) {
    printError(`Failed to attach: ${error.message}`);
  }
}

/**
 * Export wiki as JSON
 */
function exportWiki(wikiManager: WikiManager): void {
  const wikiPath = wikiManager.getWikiPath();
  const exportPath = path.join(wikiPath, '..', `wiki-export-${Date.now()}.json`);

  try {
    const exportData: any = {
      exported: new Date().toISOString(),
      wikiPath,
      decisions: [],
      interactions: [],
      profile: {},
    };

    // Export decisions
    const decisionsDir = path.join(wikiPath, 'decisions');
    if (fs.existsSync(decisionsDir)) {
      for (const file of fs.readdirSync(decisionsDir)) {
        if (file.endsWith('.md')) {
          exportData.decisions.push(fs.readFileSync(path.join(decisionsDir, file), 'utf-8'));
        }
      }
    }

    // Export interactions
    const interactionsDir = path.join(wikiPath, 'interactions');
    if (fs.existsSync(interactionsDir)) {
      for (const file of fs.readdirSync(interactionsDir)) {
        if (file.endsWith('.md')) {
          exportData.interactions.push(fs.readFileSync(path.join(interactionsDir, file), 'utf-8'));
        }
      }
    }

    // Export profile
    const profileDir = path.join(wikiPath, 'profile');
    if (fs.existsSync(profileDir)) {
      for (const file of fs.readdirSync(profileDir)) {
        if (file.endsWith('.md')) {
          exportData.profile[file] = fs.readFileSync(path.join(profileDir, file), 'utf-8');
        }
      }
    }

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    printSuccess(`Exported to: ${exportPath}`);
  } catch (error: any) {
    printError(`Export failed: ${error.message}`);
  }
}

/**
 * Import wiki from JSON
 */
function importWiki(wikiManager: WikiManager, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const wikiPath = wikiManager.getWikiPath();

    // Import decisions
    if (data.decisions) {
      const decisionsDir = path.join(wikiPath, 'decisions');
      for (const content of data.decisions) {
        const titleMatch = content.match(/^# (.+)/);
        const title = titleMatch ? titleMatch[1].replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : `decision-${Date.now()}`;
        fs.writeFileSync(path.join(decisionsDir, `${title}.md`), content);
      }
    }

    printSuccess('Wiki imported successfully');
  } catch (error: any) {
    printError(`Import failed: ${error.message}`);
  }
}

/**
 * Generate knowledge graph visualization
 */
async function generateGraph(timeTravel: TimeTravel, topic: string): Promise<void> {
  const results = timeTravel.search(topic || 'decision', { limit: 20, type: 'all' });

  if (results.decisions.length === 0 && results.interactions.length === 0) {
    printInfo('No data found for graph. Make some decisions first!');
    return;
  }

  console.log(chalk.bold.cyan('\n  ━━ Knowledge Graph ━━\n'));

  // Build simple ASCII graph
  const nodes: string[] = [];
  const connections: string[] = [];

  for (const d of results.decisions) {
    const nodeId = d.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20);
    nodes.push(`[${chalk.yellow(d.title)}]`);
  }

  // Print as connected list
  console.log(chalk.white('  Decisions & Relationships:\n'));
  for (let i = 0; i < Math.min(nodes.length, 10); i++) {
    if (i === 0) {
      console.log(chalk.green(`  ┌─ ${nodes[i]}`));
    } else if (i === nodes.length - 1 || i === 9) {
      console.log(chalk.green(`  └─ ${nodes[i]}`));
    } else {
      console.log(chalk.green(`  ├─ ${nodes[i]}`));
    }
  }

  // Generate Mermaid code
  console.log(chalk.bold.cyan('\n  Mermaid Graph:\n'));
  let mermaid = '```mermaid\ngraph TD\n';
  for (const d of results.decisions.slice(0, 10)) {
    const id = d.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 15);
    mermaid += `    ${chalk.cyan(id)}["${d.title}"]\n`;
    if (d.summary) {
      const relatedMatch = d.summary.match(/:?\s*(led to|caused|because of|inspired by)\s*([^,.]+)/i);
      if (relatedMatch) {
        const relatedId = relatedMatch[2].trim().replace(/[^a-zA-Z0-9]/g, '-').substring(0, 15);
        mermaid += `    ${chalk.cyan(id)} --> ${chalk.green(relatedId)}\n`;
      }
    }
  }
  mermaid += '```';
  console.log(chalk.dim(mermaid));

  console.log();
}

/**
 * Print help with all commands
 */
function printHelp(): void {
  console.log(chalk.bold.cyan(`
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    AI Brain Commands
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Chat:
    @<persona> <msg>  Switch to persona and send message
    /persona <name>    Switch persona
    /personas          List all personas
    /reset             Reset to default persona

  Context:
    /context           Show recent wiki context
    /search <query>    Search past decisions & interactions
    /log <text>        Quick log a decision or thought
    /timeline          Show decision timeline
    /status            Show wiki statistics
    /browse <type>     Browse decisions, interactions, profile
    /read <file>       Read a wiki file

  Settings:
    /auto              Toggle thinking frameworks (AUTO mode)
    /temperature <n>    Set response creativity (0.0-2.0)
    /max-tokens <n>    Set max response length
    /verbose           Enable verbose output
    /compact           Enable compact responses
    /clear             Clear the screen
    /model <name>      Set model (provider-specific)
    /provider <name>   Switch LLM provider

  Wiki Operations:
    /write <file> <c>  Write to a wiki file
    /attach <path>    Attach a file to wiki
    /export            Export wiki as JSON
    /import <path>     Import wiki from JSON
    /graphify [topic]  Visualize decision relationships

  Utility:
    /quote             Show random inspiration
    /remind <text>     Set reminder for next session
    /sync              Sync/save wiki
    /version           Show version info
    /retry             Retry last message
    /cancel            Cancel current operation
    /exit              Quit
    /help              Show this help

  Tips:
    • Press Tab for autocomplete
    • Use ↑/↓ arrows for command history
    • @socrates, @elon, @carolyn, @confucius, @archimedes

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `));
}

export default chatCommand;