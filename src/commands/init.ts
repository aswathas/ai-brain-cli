import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { getProvider, listProviders } from '../llm/router';
import { Message } from '../types';

/**
 * LLM-led onboarding - conversational setup like Claude Code
 * The AI asks questions naturally to understand the user deeply
 */
export async function runOnboarding(): Promise<void> {
  console.log();
  console.log(chalk.bold.cyan('━'.repeat(50)));
  console.log(chalk.bold.cyan('  AI Brain — First Time Setup'));
  console.log(chalk.bold.cyan('━'.repeat(50)));
  console.log();
  console.log(chalk.white('  I\'m going to ask you some questions to get to know you.'));
  console.log(chalk.white('  This helps me give better advice and remember your context.'));
  console.log(chalk.dim('  Take your time - there\'s no rush.\n'));

  // Step 1: Configure provider first (need AI to chat)
  const providerName = await askProvider();

  // Step 2: Set wiki location
  const wikiPath = await askWikiPath();

  // Step 3: Create wiki structure
  const wikiManager = new WikiManager(wikiPath);
  wikiManager.ensureStructure();
  configStore.setWikiPath(wikiPath);

  console.log(chalk.green(`\n  ✓ Created your wiki at: ${wikiPath}\n`));

  // Step 4: LLM-led deep profiling
  await runProfilingInterview(wikiManager);

  // Summary
  console.log(chalk.bold.cyan('\n━'.repeat(50)));
  console.log(chalk.bold.cyan('  All Set!'));
  console.log(chalk.bold.cyan('━'.repeat(50)));
  console.log();
  console.log(chalk.white(`  Wiki: ${wikiPath}`));
  console.log(chalk.white(`  Provider: ${providerName}`));
  console.log();
  console.log(chalk.green('  Ready to start. Type: ai-brain\n'));
}

/**
 * Ask user to choose a provider
 */
async function askProvider(): Promise<string> {
  console.log(chalk.bold.cyan('  Step 1: Choose your AI provider'));
  console.log(chalk.dim('  (This is the AI model that powers your brain)\n'));

  const choices = listProviders().map(p => ({
    name: getProviderDisplayName(p),
    value: p,
  }));

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which AI provider would you like to use?',
      choices,
    },
  ]);

  configStore.setDefaultProvider(provider);

  // Check for API key in environment
  const envVarMap: Record<string, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    minimax: 'ANTHROPIC_AUTH_TOKEN',
  };

  const envKey = envVarMap[provider];
  const envValue = envKey ? process.env[envKey] : '';

  if (envValue) {
    console.log(chalk.green(`\n  Found ${envKey} in environment ✓`));
    configStore.setAPIKey(provider, envValue);
  } else {
    console.log(chalk.dim(`\n  No API key found in environment.`));
    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${provider} API key:`,
      },
    ]);
    if (apiKey) {
      configStore.setAPIKey(provider, apiKey);
      console.log(chalk.green('  API key saved ✓'));
    }
  }

  return provider;
}

/**
 * Get display name for provider
 */
function getProviderDisplayName(p: string): string {
  const names: Record<string, string> = {
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI (GPT-4)',
    google: 'Google (Gemini)',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter (multiple models)',
    ollama: 'Ollama (local models)',
    minimax: 'MiniMax',
  };
  return names[p] || p;
}

/**
 * Ask for wiki path
 */
async function askWikiPath(): Promise<string> {
  const defaultPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', 'wiki');
  const config = configStore.load();

  console.log(chalk.bold.cyan('\n  Step 2: Where should I store your brain?'));
  console.log(chalk.dim('  (All your decisions, interactions, and profile will be saved here)\n'));

  const { wikiPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'wikiPath',
      message: 'Wiki folder location:',
      default: config.wikiPath || defaultPath,
    },
  ]);

  return wikiPath;
}

/**
 * LLM-led profiling interview - asks questions to deeply understand the user
 */
async function runProfilingInterview(wikiManager: WikiManager): Promise<void> {
  const provider = getProvider(configStore.getDefaultProvider());
  if (!provider) {
    console.log(chalk.yellow('\n  Skipping profiling - no provider configured.\n'));
    return;
  }

  console.log(chalk.bold.cyan('\n  Step 3: Let\'s get to know each other'));
  console.log(chalk.dim('  (I\'ll ask questions to understand your context)\n'));

  const profilingQuestions = [
    {
      tag: 'identity',
      question: 'What should I call you? And what do you do for work or life?',
      file: 'profile/identity.md',
    },
    {
      tag: 'values',
      question: 'What matters most to you in life? (Family, freedom, growth, impact...)',
      file: 'profile/values.md',
    },
    {
      tag: 'goals',
      question: 'What are you working toward right now? Any big goals or decisions ahead?',
      file: 'profile/goals.md',
    },
    {
      tag: 'strengths',
      question: 'What are you naturally good at? What do people often ask for your help with?',
      file: 'profile/mind.md',
    },
    {
      tag: 'challenges',
      question: 'What challenges are you facing? What decisions are you wrestling with?',
      file: 'profile/mind.md',
      append: true,
    },
    {
      tag: 'financial',
      question: 'How would you describe your financial situation? (Just high-level - comfortable, building, struggling?)',
      file: 'profile/financial.md',
    },
    {
      tag: 'health',
      question: 'Any health priorities or conditions I should know about?',
      file: 'profile/health.md',
    },
    {
      tag: 'relationships',
      question: 'What does your circle of people look like? (Close family, friends, community)',
      file: 'profile/relationships.md',
    },
  ];

  // Ask each question via LLM and save response
  for (const item of profilingQuestions) {
    try {
      // First check if we already have this info
      const existingPath = path.join(wikiManager.getWikiPath(), item.file);

      console.log(chalk.dim(`  Asking about ${item.tag}...`));

      // Create a conversation to ask the question naturally
      const systemPrompt = `You are a friendly AI companion doing initial setup. Ask the user the following question in a warm, conversational way (1-2 sentences max). Do NOT be verbose. Just ask the question clearly.`;

      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: item.question },
      ];

      const response = await provider.chat(messages, { maxTokens: 100 });
      const aiQuestion = response.content;

      console.log(chalk.white(`\n  ${aiQuestion}`));

      // Get user response
      const { answer } = await inquirer.prompt([
        {
          type: 'input',
          name: 'answer',
          message: 'Your response:',
        },
      ]);

      if (answer && answer.trim()) {
        // Save to profile file
        const content = `---
created: ${new Date().toISOString().split('T')[0]}
tag: ${item.tag}
---

# ${item.tag.charAt(0).toUpperCase() + item.tag.slice(1)}

${answer.trim()}

`;
        // Ensure directory exists
        const dir = path.dirname(existingPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.appendFileSync(existingPath, content);
        console.log(chalk.green(`  ✓ Saved to ${item.tag}\n`));
      }

    } catch (error: any) {
      console.log(chalk.yellow(`  Could not ask about ${item.tag}: ${error.message}\n`));
    }
  }

  // Create the main user profile summary
  await createUserSummary(wikiManager);

  console.log(chalk.green('\n  ✓ Profiling complete! I now know you better.\n'));
}

/**
 * Create a summary of user profile from all collected info
 */
async function createUserSummary(wikiManager: WikiManager): Promise<void> {
  const profileDir = path.join(wikiManager.getWikiPath(), 'profile');

  // Compile all profile info
  let summary = '# User Summary\n\n';
  summary += `*Generated during onboarding: ${new Date().toLocaleDateString()}*\n\n`;

  const profileFiles = ['identity.md', 'values.md', 'goals.md', 'mind.md', 'financial.md', 'health.md', 'relationships.md'];

  for (const file of profileFiles) {
    const filePath = path.join(profileDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Extract just the user's answers (skip frontmatter)
      const match = content.match(/^# .+\n\n(.+)/s);
      if (match) {
        summary += `## ${file.replace('.md', '')}\n${match[1]}\n\n`;
      }
    }
  }

  // Save to user.md
  const userPath = path.join(wikiManager.getWikiPath(), 'user.md');
  fs.writeFileSync(userPath, summary);

  // Also update memory.md with current context
  const memoryPath = path.join(wikiManager.getWikiPath(), 'memory.md');
  const memoryContent = `# Memory

*Last updated: ${new Date().toISOString().split('T')[0]}*

## Current Context
- Just completed onboarding
- Wiki initialized and configured

## Active Projects
(TBD - to be filled during conversations)

## Recent Decisions
(TBD - filled as you make decisions)

## Open Questions
- What is the user working on right now?
- Any pending decisions or follow-ups?

## Notes
(TBD - updated during conversations)
`;
  fs.writeFileSync(memoryPath, memoryContent);
}

export default runOnboarding;