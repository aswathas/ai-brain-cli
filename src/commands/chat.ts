import * as readline from 'readline';
import inquirer from 'inquirer';
import * as fs from 'fs';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { TimeTravel } from '../wiki/timeTravel';
import { getProvider, listProviders } from '../llm/router';
import { Message } from '../types';

/**
 * Persona invocation pattern: @personaName message
 */
const PERSONA_PATTERN = /^@(\w+)\s+(.+)/s;

/**
 * Chat REPL command with time-travel and persona support
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
    console.error(`Error: Provider '${providerName}' not found or not configured.`);
    console.log('Available providers:', listProviders().join(', '));
    return;
  }

  // Check if API key is configured (except for ollama)
  if (providerName !== 'ollama') {
    const apiKey = configStore.getAPIKey(providerName);
    if (!apiKey) {
      console.error(`Error: API key not configured for ${providerName}.`);
      console.log(`Run 'ai-brain config set-api-key ${providerName}' to configure.`);
      return;
    }
  }

  const wikiManager = new WikiManager(config.wikiPath);
  const timeTravel = new TimeTravel(wikiManager);

  // Ensure wiki structure exists
  wikiManager.ensureStructure();

  // Get initial context (past decisions)
  let contextString = '';
  if (!args.noContext) {
    contextString = timeTravel.buildContextString('recent decisions and interactions', 5);
  }

  // Get persona system prompt
  let systemPrompt = '';
  let activePersona = args.persona;

  if (activePersona) {
    const personaConfig = configStore.getPersona(activePersona);
    if (personaConfig) {
      systemPrompt = personaConfig.systemPrompt;
    } else {
      console.log(`Warning: Persona '${activePersona}' not found. Available personas: ${Object.keys(config.personas).join(', ')}`);
    }
  }

  // Add auto mode system prompt
  if (args.autoMode || config.autoMode) {
    systemPrompt += '\n\n[AUTO MODE ENABLED] When responding, consider applying relevant thinking frameworks from these: First Principles, Inversion, Second Order Thinking, Circle of Competence, Pre-Mortem, Occam\'s Razor. You may reference these frameworks in your response.';
  }

  console.log('\n===========================================');
  console.log('  AI Brain Chat');
  console.log('===========================================');
  console.log(`Provider: ${provider.displayName()}`);
  if (activePersona) {
    console.log(`Persona: ${activePersona}`);
  }
  if (args.autoMode || config.autoMode) {
    console.log('Mode: AUTO (thinking frameworks enabled)');
  }
  console.log('Type @<persona> to switch personas');
  console.log('Type /exit to quit, /help for commands');
  console.log('===========================================\n');

  // If initial query provided as context, process it
  if (args.context) {
    await processQuery(
      args.context,
      provider,
      wikiManager,
      timeTravel,
      { systemPrompt, contextString, model: args.model }
    );
  }

  // Create readline interface for REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${activePersona ? `[${activePersona}] ` : ''}> `,
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle special commands
    if (input === '/exit' || input === '/quit') {
      console.log('\nGoodbye!');
      rl.close();
      return;
    }

    if (input === '/help') {
      printHelp();
      rl.prompt();
      return;
    }

    if (input === '/personas') {
      listPersonasCommand();
      rl.prompt();
      return;
    }

    if (input.startsWith('/persona ')) {
      const newPersona = input.substring('/persona '.length).trim();
      if (newPersona) {
        const personaConfig = configStore.getPersona(newPersona);
        if (personaConfig) {
          activePersona = newPersona;
          systemPrompt = personaConfig.systemPrompt;
          console.log(`Switched to persona: ${personaConfig.name}`);
        } else {
          console.log(`Persona '${newPersona}' not found. Available: ${Object.keys(configStore.listPersonas()).join(', ')}`);
        }
      }
      rl.prompt();
      return;
    }

    if (input === '/persona reset') {
      activePersona = undefined;
      systemPrompt = '';
      console.log('Persona reset to default.');
      rl.prompt();
      return;
    }

    if (input === '/context') {
      const recent = timeTravel.buildContextString('', 5);
      console.log('\n--- Recent Context ---');
      console.log(recent || '(No context yet)');
      console.log('----------------------\n');
      rl.prompt();
      return;
    }

    if (input.startsWith('/search ')) {
      const query = input.substring('/search '.length).trim();
      const results = timeTravel.search(query, { limit: 5 });
      console.log('\n--- Search Results ---');
      if (results.decisions.length === 0 && results.interactions.length === 0) {
        console.log('No results found.');
      } else {
        if (results.decisions.length > 0) {
          console.log('\nDecisions:');
          for (const d of results.decisions) {
            console.log(`  - [${d.date.split('T')[0]}] ${d.title}`);
          }
        }
        if (results.interactions.length > 0) {
          console.log('\nInteractions:');
          for (const i of results.interactions) {
            console.log(`  - [${i.date.split('T')[0]}] ${i.persona}: ${i.query.substring(0, 50)}...`);
          }
        }
      }
      console.log('----------------------\n');
      rl.prompt();
      return;
    }

    if (input === '/auto') {
      console.log(`Auto mode: ${configStore.isAutoModeEnabled() ? 'ON' : 'OFF'}`);
      rl.prompt();
      return;
    }

    if (input.startsWith('/log ')) {
      const decision = input.substring('/log '.length).trim();
      const entry = wikiManager.createDecision(
        'Quick decision',
        'Logged from chat',
        decision
      );
      console.log(`Decision logged: ${entry.id}`);
      rl.prompt();
      return;
    }

    if (input === '/timeline') {
      const timeline = timeTravel.getTimeline();
      console.log('\n--- Decision Timeline ---');
      for (const day of timeline.slice(0, 10)) {
        console.log(`\n${day.date}:`);
        for (const d of day.decisions) {
          console.log(`  - ${d.title}`);
        }
      }
      console.log('------------------------\n');
      rl.prompt();
      return;
    }

    // Check for persona invocation
    let query = input;
    let invokedPersona = activePersona;

    const personaMatch = input.match(PERSONA_PATTERN);
    if (personaMatch) {
      const [, personaName, queryText] = personaMatch;
      const personaConfig = configStore.getPersona(personaName);

      if (personaConfig) {
        invokedPersona = personaName;
        systemPrompt = personaConfig.systemPrompt;
        query = queryText;
        console.log(`[Using persona: ${personaConfig.name}]\n`);
      } else {
        console.log(`Warning: Persona '${personaName}' not found. Using default.\n`);
      }
    }

    // Get time-travel context for the query
    let queryContext = '';
    if (!args.noContext) {
      queryContext = timeTravel.buildContextString(query, 3);
    }

    // Build final system prompt
    let finalSystemPrompt = systemPrompt;
    if (queryContext) {
      finalSystemPrompt += '\n\n[Relevant past context from your history]:\n' + queryContext;
    }
    if (contextString) {
      finalSystemPrompt += '\n\n[General context]:\n' + contextString;
    }

    await processQuery(
      query,
      provider,
      wikiManager,
      timeTravel,
      {
        systemPrompt: finalSystemPrompt,
        persona: invokedPersona,
        model: args.model,
      }
    );

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
  });
}

/**
 * Process a single query
 */
async function processQuery(
  query: string,
  provider: any,
  wikiManager: WikiManager,
  timeTravel: TimeTravel,
  options: {
    systemPrompt?: string;
    contextString?: string;
    persona?: string;
    model?: string;
  } = {}
): Promise<void> {
  const messages: Message[] = [];

  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: query });

  process.stdout.write('\nThinking...\n\n');

  try {
    const response = await provider.chat(messages, {
      model: options.model,
      temperature: 0.7,
      maxTokens: 2048,
    });

    console.log(response.content);

    // Log interaction
    if (options.persona) {
      try {
        wikiManager.createInteraction(
          options.persona,
          query,
          response.content,
          options.contextString
        );
      } catch (error) {
        // Silently fail logging
      }
    }

    console.log();
  } catch (error: any) {
    console.error(`\nError: ${error.message}`);
  }
}

/**
 * Print help text
 */
function printHelp(): void {
  console.log(`
Commands:
  @<persona> <message>  - Switch to a persona and send message
  /persona <name>        - Switch persona (use without message)
  /persona reset          - Reset to no persona
  /personas              - List available personas
  /context               - Show recent context from wiki
  /search <query>        - Search past decisions and interactions
  /log <decision>        - Quick log a decision
  /timeline              - Show recent decision timeline
  /auto                  - Toggle auto mode
  /exit, /quit           - Exit chat
  /help                  - Show this help
`);
}

/**
 * List personas command
 */
function listPersonasCommand(): void {
  const personas = configStore.listPersonas();
  console.log('\nAvailable Personas:');
  console.log('--------------------');
  for (const [key, config] of Object.entries(personas)) {
    console.log(`  @${key} - ${config.description}`);
  }
  console.log();
}

export default chatCommand;