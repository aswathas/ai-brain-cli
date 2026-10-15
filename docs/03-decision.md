# 03 — Decisions

Recreated from `git log` on 2026-10-16. The repo has four commits, all dated
2026-05-25, so this records what the history shows rather than a longer design
discussion.

## Markdown-on-disk as the store

The wiki is a directory of `.md` files with YAML frontmatter, parsed by
`gray-matter` and written with the `fs` module (`src/wiki/manager.ts`,
`src/wiki/parser.ts`). No database, no server.

The `init` command scaffolds `decisions/`, `interactions/`, `notes/`,
`personas/`, `profile/`, `framework/`, `skills/`, `dumps/` and `periodic/`
under a single wiki path (`src/wiki/manager.ts:23`).

## Command surface

`src/index.ts` registers 12 subcommands. Two decisions are visible there:

**Chat is the default action.** `program.action()` handles a bare `ai-brain`
invocation: if the wiki is not initialized it runs onboarding first, then falls
into chat (`src/index.ts`). This is the Claude Code-shaped entry point added in
`30dc24e`.

**Help is a real subcommand, not `--help`.** `help` (alias `h`) calls
`program.help()` (`src/index.ts`). `--help` is registered as an option but the
trailing unknown-option guard in `src/index.ts` rejects it before it takes
effect — see README "Known gaps".

## Providers

Seven provider adapters live in `src/llm/providers/`: anthropic, openai,
google, deepseek, openrouter, ollama, minimax. `src/llm/router.ts` selects by
`defaultProvider` from config. Ollama needs no key and defaults to
`http://localhost:11434`. MiniMax was added in `30dc24e` alongside the Claude-like
UX work, which is why it is absent from the initial commit's "6 LLM providers".

## Persona system

Personas are config entries with a `systemPrompt` (`src/config/store.ts`), five
shipped by default. `@<persona> <message>` in the chat REPL switches persona for
one message (`src/commands/chat.ts`).

## Knowledge graph

`4978896` added `/graphify` (aliases `/graph`, `/g`), which renders an ASCII
graph plus a Mermaid diagram of decision relationships
(`src/commands/chat.ts`). It is the only feature with its own commit after the
Claude-like-UX commit.

## What the history does not record

There is no `docs/`, no `AGENTS.md`, and no `CLAUDE.md` in this repo, and no
commit message states the problem the tool was built to solve beyond
`package.json`'s description: "AI-powered personal wiki with time-travel context
and personas". `docs/01-problem.md` was deliberately not written for that reason
— the problem statement is not recoverable from the repo.