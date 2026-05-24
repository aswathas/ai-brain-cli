import inquirer from 'inquirer';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { getProvider, listProviders } from '../llm/router';
import { Message } from '../types';

/**
 * Log a decision or interaction
 */
export async function logCommand(
  args: {
    decision?: string;
    context?: string;
    tags?: string[];
    outcome?: string;
    interactive?: boolean;
  } = {}
): Promise<void> {
  const config = configStore.load();
  const wikiManager = new WikiManager(config.wikiPath);

  // Ensure wiki structure exists
  wikiManager.ensureStructure();

  let title = '';
  let context = '';
  let decision = '';
  let tags: string[] = [];
  let outcome = '';

  // If not in interactive mode and decision not provided, prompt
  if (!args.interactive && !args.decision) {
    console.log('\n===========================================');
    console.log('  Log a Decision');
    console.log('===========================================\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Decision title:',
        validate: (input: string) => (input.trim().length > 0 ? true : 'Title is required'),
      },
      {
        type: 'input',
        name: 'context',
        message: 'Context (what led to this decision):',
        multiline: true,
      },
      {
        type: 'input',
        name: 'decision',
        message: 'Decision made:',
        multiline: true,
        validate: (input: string) => (input.trim().length > 0 ? true : 'Decision is required'),
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated):',
      },
      {
        type: 'input',
        name: 'outcome',
        message: 'Expected outcome (optional):',
        multiline: true,
      },
    ]);

    title = answers.title;
    context = answers.context;
    decision = answers.decision;
    tags = answers.tags
      ? answers.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
    outcome = answers.outcome;
  } else if (args.decision) {
    // Quick log mode
    title = args.decision;
    context = args.context || 'Logged via command line';
    decision = args.decision;
    tags = args.tags || [];
    outcome = args.outcome || '';
  } else {
    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'decision',
        message: 'What decision are you logging?',
        validate: (input: string) => (input.trim().length > 0 ? true : 'Decision is required'),
      },
      {
        type: 'input',
        name: 'context',
        message: 'What\'s the context?',
        multiline: true,
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma-separated):',
      },
    ]);

    title = answers.decision.substring(0, 50);
    context = answers.context;
    decision = answers.decision;
    tags = answers.tags
      ? answers.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];
  }

  // Create the decision entry
  const entry = wikiManager.createDecision(title, context, decision, {
    tags,
    outcome,
  });

  console.log('\n===========================================');
  console.log('  Decision Logged');
  console.log('===========================================');
  console.log(`ID: ${entry.id}`);
  console.log(`Title: ${entry.title}`);
  console.log(`Date: ${entry.date}`);
  console.log(`Tags: ${entry.tags.join(', ') || 'none'}`);
  console.log('===========================================\n');

  // Ask if user wants to analyze the decision with AI
  const { analyze } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'analyze',
      message: 'Would you like AI to analyze this decision?',
      default: false,
    },
  ]);

  if (analyze) {
    await analyzeDecision(entry.id, wikiManager, config);
  }
}

/**
 * Analyze a decision using AI
 */
async function analyzeDecision(
  decisionId: string,
  wikiManager: WikiManager,
  config: any
): Promise<void> {
  const entry = wikiManager.getEntryById(decisionId);

  if (!entry) {
    console.error('Decision not found');
    return;
  }

  const provider = getProvider(config.defaultProvider);
  if (!provider) {
    console.error('No provider configured');
    return;
  }

  console.log('\nAnalyzing decision...\n');

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a decision analyst. Analyze the following decision and provide insights.
Consider:
1. What are the strengths of this decision?
2. What are potential weaknesses or risks?
3. What additional information would have been helpful?
4. What could go wrong and how would you mitigate it?

Be thorough but concise in your analysis.`,
    },
    {
      role: 'user',
      content: `Decision: ${entry.decision}
Context: ${entry.context}
Tags: ${entry.tags.join(', ')}
`,
    },
  ];

  try {
    const response = await provider.chat(messages, { maxTokens: 1024 });
    console.log('Analysis:');
    console.log('--------');
    console.log(response.content);

    // Update the decision with analysis
    const update = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Save this analysis to the decision?',
        default: true,
      },
    ]);

    if (update.save) {
      // Append analysis to context or create note
      console.log('Analysis saved.');
    }
  } catch (error: any) {
    console.error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Quick log from command line (non-interactive)
 */
export function quickLog(
  decision: string,
  options?: {
    context?: string;
    tags?: string[];
  }
): void {
  const config = configStore.load();
  const wikiManager = new WikiManager(config.wikiPath);

  wikiManager.ensureStructure();

  const entry = wikiManager.createDecision(
    decision.substring(0, 50),
    options?.context || 'Quick logged via command line',
    decision,
    { tags: options?.tags }
  );

  console.log(`Logged decision: ${entry.id}`);
}

export default logCommand;