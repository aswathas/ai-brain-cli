import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs';
import { configStore } from '../config/store';
import { WikiManager } from '../wiki/manager';
import { getProvider } from '../llm/router';
import { Message } from '../types';

/**
 * LLM-led onboarding for initializing ai-brain
 */
export async function runOnboarding(): Promise<void> {
  console.log('\n===========================================');
  console.log('  Welcome to AI Brain! Let\'s get started.');
  console.log('===========================================\n');

  const config = configStore.load();

  // Step 1: Choose wiki location
  const { wikiPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'wikiPath',
      message: 'Where should we store your wiki?',
      default: config.wikiPath || path.join(process.env.HOME || process.env.USERPROFILE || '.', 'wiki'),
    },
  ]);

  // Step 2: Create wiki directory structure
  const wikiManager = new WikiManager(wikiPath);
  wikiManager.ensureStructure();
  configStore.setWikiPath(wikiPath);

  console.log(`\nCreated wiki at: ${wikiPath}`);

  // Step 3: Choose default provider
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Which LLM provider would you like to use as default?',
      choices: [
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'OpenAI (GPT-4)', value: 'openai' },
        { name: 'Google (Gemini)', value: 'google' },
        { name: 'DeepSeek', value: 'deepseek' },
        { name: 'OpenRouter', value: 'openrouter' },
        { name: 'Ollama (Local)', value: 'ollama' },
      ],
    },
  ]);

  configStore.setDefaultProvider(provider);

  // Step 3b: Configure API key for the selected provider
  const providerObj = getProvider(provider);
  if (providerObj && providerObj.supportsAPIKey()) {
    const providerConfig = configStore.getProvider(provider);
    const currentKey = providerConfig?.apiKey || '';

    // Check environment variable
    const envVarMap: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };

    const envKey = envVarMap[provider];
    const envValue = process.env[envKey];

    if (envValue && !currentKey) {
      console.log(`\nFound ${envKey} in environment. Using it.`);
      configStore.setAPIKey(provider, envValue);
    } else if (!currentKey && provider !== 'ollama') {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter your ${provider} API key (or press Enter to skip and set later):`,
        },
      ]);

      if (apiKey) {
        configStore.setAPIKey(provider, apiKey);
        console.log('API key saved!');
      }
    }
  }

  // Step 4: Enable auto mode?
  const { autoMode } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'autoMode',
      message: 'Enable Auto mode? (Automatically apply thinking frameworks)',
      default: false,
    },
  ]);

  configStore.setAutoMode(autoMode);

  // Step 5: Customize personas
  console.log('\n===========================================');
  console.log('  Personas');
  console.log('===========================================');
  console.log('\nPersonas are AI characters that can help you with different perspectives.');
  console.log('You have several built-in personas:');
  console.log('  - Socrates: Socratic questioning for clarity');
  console.log('  - Elon Musk: First principles thinking');
  console.log('  - Carolyn McKenna: Market strategy');
  console.log('  - Confucius: Wisdom and virtue');
  console.log('  - Archimedes: Mathematical problem solving');

  const { customizePersonas } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customizePersonas',
      message: 'Would you like to customize or add personas?',
      default: false,
    },
  ]);

  if (customizePersonas) {
    console.log('\nPersona customization coming soon. Check back later!');
  }

  // Step 6: LLM-led introduction
  console.log('\n===========================================');
  console.log('  Testing your setup...');
  console.log('===========================================');

  const testProvider = getProvider(configStore.getDefaultProvider());
  if (testProvider) {
    try {
      const messages: Message[] = [
        { role: 'user', content: 'Say "Hello! AI Brain is ready." in exactly those words.' },
      ];
      const response = await testProvider.chat(messages, { maxTokens: 50 });
      console.log(`\n${testProvider.displayName()} says: ${response.content}`);
    } catch (error: any) {
      console.log(`\nNote: Could not test provider: ${error.message}`);
      console.log('You can still use ai-brain. Run "ai-brain config set-api-key" to configure.');
    }
  }

  // Summary
  console.log('\n===========================================');
  console.log('  Setup Complete!');
  console.log('===========================================');
  console.log(`\nWiki path: ${configStore.getWikiPath()}`);
  console.log(`Default provider: ${configStore.getDefaultProvider()}`);
  console.log(`Auto mode: ${configStore.isAutoModeEnabled() ? 'Enabled' : 'Disabled'}`);
  console.log(`Config file: ${configStore.getConfigPath()}`);

  console.log('\nQuick start:');
  console.log('  ai-brain chat              # Start chatting');
  console.log('  ai-brain log "my decision" # Log a decision');
  console.log('  ai-brain status            # View wiki stats');
  console.log('  ai-brain help              # See all commands');
  console.log('\n');
}

export default runOnboarding;