import inquirer from 'inquirer';
import chalk from 'chalk';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { TimeTravel } from '../wiki/timeTravel';
import { getProvider } from '../llm/router';
import { Message, DecisionEntry } from '../types';

/**
 * Run periodic review of past decisions
 */
export async function reviewCommand(
  options: {
    since?: number; // days
    persona?: string;
  } = {}
): Promise<void> {
  const config = configStore.load();
  const wikiManager = new WikiManager(config.wikiPath);
  const timeTravel = new TimeTravel(wikiManager);

  console.log('\n===========================================');
  console.log('  Decision Review');
  console.log('===========================================\n');

  // Determine date range
  const sinceDays = options.since || 7;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  // Get recent decisions
  const timeline = timeTravel.getTimeline(sinceDate);
  const recentDecisions = timeTravel.getRecentDecisions(20);

  const decisionsToReview = recentDecisions.filter(d => new Date(d.date) >= sinceDate);

  if (decisionsToReview.length === 0) {
    console.log(chalk.yellow(`No decisions in the last ${sinceDays} days.`));
    console.log('Try running with --since to specify a different time range.\n');
    return;
  }

  console.log(`Found ${decisionsToReview.length} decisions since ${sinceDate.toDateString()}\n`);

  // Show decision summary
  console.log('Decisions to review:');
  console.log('--------------------');
  for (let i = 0; i < decisionsToReview.length; i++) {
    const d = decisionsToReview[i];
    const date = new Date(d.date).toLocaleDateString();
    console.log(`${i + 1}. [${date}] ${d.title}`);
    if (d.tags && d.tags.length > 0) {
      console.log(`   Tags: ${d.tags.join(', ')}`);
    }
  }
  console.log();

  // Ask for review mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'What would you like to do?',
      choices: [
        { name: 'Review individual decisions', value: 'individual' },
        { name: 'Get AI analysis of recent decisions', value: 'analyze' },
        { name: 'Update decision outcomes', value: 'outcomes' },
        { name: 'Exit', value: 'exit' },
      ],
    },
  ]);

  switch (mode) {
    case 'individual':
      await reviewIndividual(decisionsToReview, wikiManager);
      break;
    case 'analyze':
      await analyzeDecisions(decisionsToReview, config);
      break;
    case 'outcomes':
      await updateOutcomes(decisionsToReview, wikiManager);
      break;
    case 'exit':
      console.log('Exiting review.');
      return;
  }
}

/**
 * Review each decision individually
 */
async function reviewIndividual(
  decisions: DecisionEntry[],
  wikiManager: WikiManager
): Promise<void> {
  for (const decision of decisions) {
    console.log('\n' + chalk.cyan('='.repeat(50)));
    console.log(chalk.bold(`Decision: ${decision.title}`));
    console.log(chalk.cyan('='.repeat(50)));
    console.log(`Date: ${new Date(decision.date).toLocaleString()}`);
    if (decision.tags.length > 0) {
      console.log(`Tags: ${decision.tags.join(', ')}`);
    }
    console.log();

    console.log(chalk.bold('Context:'));
    console.log(decision.context || '(no context)');
    console.log();

    console.log(chalk.bold('Decision:'));
    console.log(decision.decision);
    console.log();

    if (decision.outcome) {
      console.log(chalk.bold('Outcome:'));
      console.log(decision.outcome);
      console.log();
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Add/update outcome', value: 'outcome' },
          { name: 'Add reflection', value: 'reflect' },
          { name: 'Next decision', value: 'next' },
          { name: 'Exit review', value: 'exit' },
        ],
      },
    ]);

    if (action === 'outcome') {
      const { outcome } = await inquirer.prompt([
        {
          type: 'input',
          name: 'outcome',
          message: 'What was the outcome?',
          default: decision.outcome || '',
          multiline: true,
        },
      ]);

      if (outcome) {
        wikiManager.updateDecisionOutcome(decision.id, outcome);
        console.log(chalk.green('Outcome updated!'));
      }
    } else if (action === 'exit') {
      break;
    }
  }
}

/**
 * Get AI analysis of decisions
 */
async function analyzeDecisions(
  decisions: DecisionEntry[],
  config: any
): Promise<void> {
  const provider = getProvider(config.defaultProvider);

  if (!provider) {
    console.error('No LLM provider configured for analysis.');
    return;
  }

  console.log('\nAnalyzing decisions...\n');

  // Build summary of decisions
  const summary = decisions
    .map((d, i) => `${i + 1}. ${d.title}\n   ${d.decision.substring(0, 100)}...`)
    .join('\n\n');

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a decision analyst reviewing a series of decisions made over time.
Your task is to:
1. Identify patterns in the decisions
2. Note any potential issues or risks
3. Suggest areas for improvement
4. Highlight any particularly good or questionable decisions

Provide a concise but thorough analysis.`,
    },
    {
      role: 'user',
      content: `Here are the decisions to analyze:\n\n${summary}\n\nPlease analyze these decisions and provide insights.`,
    },
  ];

  try {
    const response = await provider.chat(messages, { maxTokens: 2048 });
    console.log(chalk.bold('\nAnalysis:'));
    console.log(chalk.cyan('-'.repeat(50)));
    console.log(response.content);
    console.log(chalk.cyan('-'.repeat(50)));
  } catch (error: any) {
    console.error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Update outcomes for decisions
 */
async function updateOutcomes(
  decisions: DecisionEntry[],
  wikiManager: WikiManager
): Promise<void> {
  const decisionsWithoutOutcome = decisions.filter(d => !d.outcome);

  if (decisionsWithoutOutcome.length === 0) {
    console.log(chalk.green('All decisions have outcomes recorded!'));
    return;
  }

  console.log(`\n${decisionsWithoutOutcome.length} decisions need outcomes.\n`);

  for (const decision of decisionsWithoutOutcome) {
    console.log(chalk.bold(`\nDecision: ${decision.title}`));
    console.log(`Context: ${decision.context?.substring(0, 100)}...`);
    console.log(`Decision: ${decision.decision?.substring(0, 100)}...`);

    const { outcome } = await inquirer.prompt([
      {
        type: 'input',
        name: 'outcome',
        message: 'What was the outcome? (or press Enter to skip)',
        multiline: true,
      },
    ]);

    if (outcome && outcome.trim()) {
      wikiManager.updateDecisionOutcome(decision.id, outcome);
      console.log(chalk.green('Outcome saved!'));
    }
  }
}

export default reviewCommand;