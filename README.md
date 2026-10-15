# AI Brain CLI

An AI-powered personal wiki with time-travel context and personas.

AI Brain keeps a plain-Markdown wiki on your disk (decisions, chat interactions,
notes, profile) and threads relevant parts of it into every LLM conversation, so
a chat starts with what it already knows about you instead of a blank prompt.

Everything is a local file. There is no server and no database.

## What it does

- **Wiki with time-travel context.** Decisions and interactions are stored as
  Markdown with YAML frontmatter. Past entries are scored against your query and
  injected into the system prompt on every turn (`src/wiki/timeTravel.ts`).
- **Personas.** Predefined personas with distinct system prompts: Socrates,
  Elon Musk, Carolyn McKenna, Confucius, Archimedes. You can add your own.
- **Local file ingest.** Drop an existing Markdown file or directory into the
  wiki with `ai-brain ingest`.
- **Wiki health check.** `ai-brain lint` reports structural problems across the
  wiki and the config.
- **Knowledge graph.** `/graphify` in chat renders decision relationships.

## Requirements

- Node.js >= 18 (`engines` in `package.json`)

## Install

```bash
git clone https://github.com/aswathas/ai-brain-cli.git
cd ai-brain-cli
npm install
npm run build
```

Then run it from the repo:

```bash
npm start
```

The `ai-brain` bin (`bin/ai-brain.js`) picks `dist/index.js` when it exists and
falls back to `ts-node` over `src/index.ts` when it does not, so `npm install`
alone is enough for development.

## Run

The first invocation has no config and no wiki, so it drops you straight into
LLM-led onboarding. After that, running the CLI with no subcommand starts chat.

```bash
npm start          # start chat (runs init automatically on first use)
npm start help     # list commands
npm run dev        # run src/index.ts via ts-node
npm run watch      # tsc --watch
```

### Commands

Verified against `src/index.ts`:

| Command | What it does |
| --- | --- |
| `init` | LLM-led onboarding: provider, wiki path, profiling interview |
| `chat` | Interactive REPL (`-p/--persona`, `-a/--auto`, `-c/--context`, `-m/--model`, `--no-context`) |
| `log [decision]` | Log a decision (`-c/--context`, `-t/--tags`, `-o/--outcome`, `-i/--interactive`) |
| `ingest [path]` | Ingest a file or directory into the wiki |
| `lint` | Wiki health check (`-f/--fix`, `-v/--verbose`) |
| `review` | Review past decisions (`-s/--since <days>`, default 7; `-p/--persona`) |
| `status` | Wiki statistics |
| `persona list\|add\|remove\|edit` | Manage personas |
| `config show\|set-provider\|set-api-key\|set-wiki-path\|reset` | Manage config |
| `providers` | List LLM providers and which are available |
| `search <query>` | Search decisions and interactions (`-t/--type`, `-l/--limit`, default 10) |
| `timeline` | Decision timeline (`-l/--limit <days>`, default 30) |
| `help` / `h` | Command list |

Note: `ai-brain --help` is currently broken. The unknown-option check at the end
of `src/index.ts` rejects `--help` and the default action fires onboarding. Use
`ai-brain help`.

### Chat slash commands

In the REPL, `@persona message` switches persona inline. Slash commands
(`src/commands/chat.ts`):

```
/help  /exit  /clear  /model  /provider  /retry  /cancel
/persona <name>  /personas  /reset
/context  /search  /log  /timeline  /status  /browse  /read  /write
/auto  /think  /short  /temperature  /max-tokens  /verbose  /compact
/attach  /export  /import  /edit  /delete
/quote  /remind  /sync  /version  /graphify
```

Tab completion covers these plus `@` for personas.

`--auto` enables AUTO mode, which appends a list of thinking frameworks
(First Principles, Inversion, Socratic, Second-Order, Occam's Razor) to the
system prompt.

## Configuration

Config lives at `~/.ai-brain/config.json`. API keys are read from the environment
at startup if not set in the config.

| Variable | Provider | Default model |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | anthropic (default provider) | `claude-3-5-sonnet-20241022` |
| `OPENAI_API_KEY` | openai | `gpt-4-turbo` |
| `GOOGLE_API_KEY` | google | `gemini-2.0-flash` |
| `DEEPSEEK_API_KEY` | deepseek | `deepseek-chat` |
| `OPENROUTER_API_KEY` | openrouter | `anthropic/claude-3.5-sonnet` |
| `MINIMAX_API_KEY` | minimax | `MiniMax-Text-01` |
| — (no key) | ollama | `llama3`, at `http://localhost:11434` |

`ai-brain providers` shows which ones are available. Set the default with
`ai-brain config set-provider <name>`.

The wiki defaults to `~/wiki`. Change it with `ai-brain config set-wiki-path
<path>`. `init` creates this structure:

```
decisions/  interactions/  notes/  personas/
profile/  framework/  skills/
dumps/{medical,financial,general}/
periodic/{weekly,monthly}/
```

## License

MIT

## Known gaps

- `--help` is broken (see above).
- `/edit` and `/delete` are offered in the `COMMANDS` completion list but have
  no `case` in the chat switch, so they fall through to "Unknown command".
- `node_modules/` and `dist/` build output are committed to the repo despite
  being in `.gitignore`.