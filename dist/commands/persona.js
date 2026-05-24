"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.personaCommand = personaCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../config/store");
/**
 * Manage personas (list, add, remove, edit)
 */
async function personaCommand(args = {}) {
    const action = args.action || 'list';
    switch (action) {
        case 'list':
            await listPersonas();
            break;
        case 'add':
            await addPersona(args.name);
            break;
        case 'remove':
            await removePersona(args.name);
            break;
        case 'edit':
            await editPersona(args.name);
            break;
        default:
            console.log('Invalid action. Use list, add, remove, or edit.');
    }
}
/**
 * List all personas
 */
async function listPersonas() {
    const personas = store_1.configStore.listPersonas();
    console.log('\n===========================================');
    console.log('  Personas');
    console.log('===========================================\n');
    if (Object.keys(personas).length === 0) {
        console.log('No custom personas configured.');
        console.log('Run "ai-brain persona add" to add one.\n');
        return;
    }
    console.log('Available personas:\n');
    for (const [key, persona] of Object.entries(personas)) {
        console.log(chalk_1.default.bold(`@${key}`));
        console.log(`  Name: ${persona.name}`);
        console.log(`  Description: ${persona.description}`);
        console.log(`  Color: ${persona.color || 'default'}`);
        console.log(`  System prompt preview: ${persona.systemPrompt.substring(0, 80)}...`);
        console.log();
    }
    console.log('===========================================\n');
}
/**
 * Add a new persona
 */
async function addPersona(name) {
    console.log('\n===========================================');
    console.log('  Add Persona');
    console.log('===========================================\n');
    let personaName = name;
    if (!personaName) {
        const { name: enteredName } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Persona key (e.g., "socrates", "elon"):',
                validate: (input) => {
                    if (!input || input.trim().length === 0)
                        return 'Name is required';
                    if (input.includes(' '))
                        return 'Name cannot contain spaces';
                    return true;
                },
            },
        ]);
        personaName = enteredName.toLowerCase();
    }
    // Check if persona already exists
    const existing = store_1.configStore.getPersona(personaName);
    if (existing) {
        console.log(chalk_1.default.red(`Persona "${personaName}" already exists.`));
        console.log('Use "ai-brain persona edit" to modify it.\n');
        return;
    }
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'displayName',
            message: 'Display name:',
            validate: (input) => (input.trim().length > 0 ? true : 'Display name is required'),
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description:',
        },
        {
            type: 'input',
            name: 'systemPrompt',
            message: 'System prompt (how the persona should behave):',
            multiline: true,
            validate: (input) => (input.trim().length > 0 ? true : 'System prompt is required'),
        },
        {
            type: 'list',
            name: 'color',
            message: 'Color:',
            choices: [
                { name: 'Red', value: '31' },
                { name: 'Green', value: '32' },
                { name: 'Yellow', value: '33' },
                { name: 'Blue', value: '34' },
                { name: 'Magenta', value: '35' },
                { name: 'Cyan', value: '36' },
                { name: 'White', value: '37' },
            ],
        },
    ]);
    const personaConfig = {
        name: answers.displayName,
        description: answers.description,
        systemPrompt: answers.systemPrompt,
        color: answers.color,
    };
    store_1.configStore.setPersona(personaName, personaConfig);
    console.log(chalk_1.default.green(`\nPersona "@${personaName}" created successfully!`));
    console.log(`\nUse it in chat: @${personaName} <your question>`);
    console.log('===========================================\n');
}
/**
 * Remove a persona
 */
async function removePersona(name) {
    if (!name) {
        const { name: enteredName } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter persona key to remove:',
            },
        ]);
        name = enteredName.toLowerCase();
    }
    const persona = store_1.configStore.getPersona(name);
    if (!persona) {
        console.log(chalk_1.default.yellow(`Persona "@${name}" not found.`));
        return;
    }
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to remove "${persona.name}"?`,
            default: false,
        },
    ]);
    if (confirm) {
        store_1.configStore.removePersona(name);
        console.log(chalk_1.default.green(`Persona "@${name}" removed.`));
    }
    else {
        console.log('Cancelled.');
    }
}
/**
 * Edit an existing persona
 */
async function editPersona(name) {
    if (!name) {
        const { name: enteredName } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Enter persona key to edit:',
            },
        ]);
        name = enteredName.toLowerCase();
    }
    const persona = store_1.configStore.getPersona(name);
    if (!persona) {
        console.log(chalk_1.default.yellow(`Persona "@${name}" not found.`));
        console.log('Use "ai-brain persona add" to create a new one.\n');
        return;
    }
    console.log(chalk_1.default.bold(`\nEditing @${name}`));
    console.log('(Press Enter to keep current value)\n');
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'displayName',
            message: 'Display name:',
            default: persona.name,
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description:',
            default: persona.description,
        },
        {
            type: 'input',
            name: 'systemPrompt',
            message: 'System prompt:',
            default: persona.systemPrompt,
            multiline: true,
        },
        {
            type: 'list',
            name: 'color',
            message: 'Color:',
            default: persona.color || '37',
            choices: [
                { name: 'Red', value: '31' },
                { name: 'Green', value: '32' },
                { name: 'Yellow', value: '33' },
                { name: 'Blue', value: '34' },
                { name: 'Magenta', value: '35' },
                { name: 'Cyan', value: '36' },
                { name: 'White', value: '37' },
            ],
        },
    ]);
    const updatedConfig = {
        name: answers.displayName || persona.name,
        description: answers.description || persona.description,
        systemPrompt: answers.systemPrompt || persona.systemPrompt,
        color: answers.color || persona.color,
    };
    store_1.configStore.setPersona(name, updatedConfig);
    console.log(chalk_1.default.green(`\nPersona "@${name}" updated successfully!`));
}
exports.default = personaCommand;
//# sourceMappingURL=persona.js.map