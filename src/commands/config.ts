import inquirer from 'inquirer';
import chalk from 'chalk';
import { configStore } from '../config/store';
import { getProvider, listProviders, ProviderRouter } from '../llm/router';

/**
 * Manage provider configuration
 */
export async function configCommand(
  args: {
    action?: string;
    provider?: string;
    key?: string;
  } = {}
): Promise<void> {
  const action = args.action || 'show';

  switch (action) {
    case 'show':
      await showConfig();
      break;
    case 'set-provider':
      await setDefaultProvider(args.provider);
      break;
    case 'set-api-key':
      await setAPIKey(args.provider, args.key);
      break;
    case 'set-wiki-path':
      await setWikiPath(args.provider);
      break;
    case 'reset':
      await resetConfig();
      break;
    default:
      console.log('Invalid action.');
      console.log('Available actions: show, set-provider, set-api-key, set-wiki-path, reset');
  }
}

/**
 * Show current configuration
 */
async function showConfig(): Promise<void> {
  const config = configStore.load();

  console.log('\n===========================================');
  console.log('  AI Brain Configuration');
  console.log('===========================================\n');

  console.log(chalk.bold('Wiki:'));
  console.log(`  Path: ${config.wikiPath}`);
  console.log();

  console.log(chalk.bold('Default Provider:'));
  console.log(`  ${config.defaultProvider}`);
  console.log();

  console.log(chalk.bold('Available Providers:'));
  const router = new ProviderRouter();
  for (const providerName of listProviders()) {
    const provider = getProvider(providerName);
    const provConfig = config.providers?.[providerName];
    const isAvailable = router.isAvailable(providerName);

    if (provider) {
      console.log(`  ${chalk.cyan(providerName)}`);
      console.log(`    Display: ${provider.displayName()}`);
      console.log(`    Available: ${isAvailable ? chalk.green('Yes') : chalk.red('No')}`);

      if (provConfig?.apiKey) {
        const maskedKey = provConfig.apiKey.substring(0, 4) + '...' + provConfig.apiKey.substring(provConfig.apiKey.length - 4);
        console.log(`    API Key: ${maskedKey}`);
      } else {
        console.log(`    API Key: ${chalk.gray('Not set')}`);
      }

      if (provConfig?.defaultModel) {
        console.log(`    Default Model: ${provConfig.defaultModel}`);
      }
      console.log();
    }
  }

  console.log(chalk.bold('Personas:'));
  const personas = configStore.listPersonas();
  console.log(`  Count: ${Object.keys(personas).length}`);
  for (const [key, persona] of Object.entries(personas)) {
    console.log(`  - @${key}: ${persona.name}`);
  }
  console.log();

  console.log(chalk.bold('Auto Mode:'));
  console.log(`  ${config.autoMode ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
  console.log();

  console.log(chalk.bold('Config Location:'));
  console.log(`  ${configStore.getConfigPath()}`);
  console.log('\n===========================================\n');
}

/**
 * Set default provider
 */
async function setDefaultProvider(providerName?: string): Promise<void> {
  if (!providerName) {
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select default provider:',
        choices: listProviders().map(p => ({
          name: p,
          value: p,
        })),
      },
    ]);
    providerName = provider;
  }

  const router = new ProviderRouter();
  if (!listProviders().includes(providerName!)) {
    console.log(chalk.red(`Unknown provider: ${providerName}`));
    return;
  }

  if (!router.isAvailable(providerName!)) {
    console.log(chalk.yellow(`Warning: ${providerName} may not be configured yet.`));
  }

  configStore.setDefaultProvider(providerName!);
  console.log(chalk.green(`Default provider set to: ${providerName}`));
}

/**
 * Set API key for a provider
 */
async function setAPIKey(providerName?: string, apiKey?: string): Promise<void> {
  if (!providerName) {
    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select provider:',
        choices: listProviders().filter(p => p !== 'ollama').map(p => ({
          name: p,
          value: p,
        })),
      },
    ]);
    providerName = provider;
  }

  let key = apiKey;

  if (!key) {
    const { apiKey: enteredKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `Enter API key for ${providerName}:`,
      },
    ]);
    key = enteredKey;
  }

  if (key) {
    configStore.setAPIKey(providerName!, key);
    console.log(chalk.green(`API key saved for ${providerName}`));

    // Test the connection
    const provider = getProvider(providerName!);
    if (provider) {
      console.log('Testing connection...');
      try {
        const messages = [{ role: 'user' as const, content: 'Hi' }];
        await provider.chat(messages, { maxTokens: 10 });
        console.log(chalk.green('Connection test successful!'));
      } catch (error: any) {
        console.log(chalk.yellow(`Connection test failed: ${error.message}`));
      }
    }
  } else {
    console.log(chalk.gray('No API key entered.'));
  }
}

/**
 * Set wiki path
 */
async function setWikiPath(newPath?: string): Promise<void> {
  if (!newPath) {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter wiki path:',
        default: configStore.getWikiPath(),
      },
    ]);
    newPath = path;
  }

  configStore.setWikiPath(newPath || configStore.getWikiPath());
  console.log(chalk.green(`Wiki path set to: ${newPath}`));
}

/**
 * Reset configuration to defaults
 */
async function resetConfig(): Promise<void> {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to reset all configuration to defaults?',
      default: false,
    },
  ]);

  if (confirm) {
    configStore.reset();
    console.log(chalk.green('Configuration reset to defaults.'));
  } else {
    console.log('Cancelled.');
  }
}

/**
 * List available providers with status
 */
export async function listProvidersWithStatus(): Promise<void> {
  const config = configStore.load();
  const router = new ProviderRouter();

  console.log('\nAvailable Providers:');
  console.log('--------------------');

  for (const providerName of listProviders()) {
    const provider = getProvider(providerName);
    const isAvailable = router.isAvailable(providerName);

    if (provider) {
      const status = isAvailable ? chalk.green('[Configured]') : chalk.gray('[Not configured]');
      console.log(`  ${providerName.padEnd(12)} ${provider.displayName().padEnd(20)} ${status}`);
    }
  }

  console.log();
}

export default configCommand;