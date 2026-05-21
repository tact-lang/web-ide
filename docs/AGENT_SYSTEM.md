# TON IDE Agent System

## Agent definition

Each agent is configured in `src/features/agent/config.ts`:

- `id`, `name`, `description` — UI
- `skillPath` — markdown skill (system instructions)
- `tools` — allowed tool IDs from the tool registry
- `defaultModel` — optional model hint for the runtime

## Skill format

Skills live under `src/features/agent/skills/<id>.md`:

1. Role and expertise boundaries
2. TON-specific conventions (cells, messages, gas, bounce)
3. Language notes (FunC vs Tact vs Tolk)
4. Checklists (deploy, security)
5. References to official docs

Skills are loaded at runtime and prepended to the model context.

## Tool registry

Tools are registered in `src/features/agent/tools/registry.ts` (planned). Each tool has:

- JSON schema for parameters
- `execute(context, args)` — calls IDE services (compile, FS, sandbox)
- Permission level: `read` | `write` | `chain`

## MCP integration

MCP servers are declared in config and spawned by the agent host (desktop or backend). The IDE passes:

- Project root path (virtual FS mount)
- Active network
- User-approved wallet session id

Browser-only mode may proxy MCP through a same-origin backend to avoid CORS and secret exposure.

## Message flow

1. User sends prompt in Agent Panel
2. Context builder attaches project snapshot
3. Router selects agent + tools
4. Model streams response; tool calls loop until done
5. Patches applied via diff preview (user approves writes)

## Environment variables (planned)

| Variable | Purpose |
|----------|---------|
| `TON_IDE_AI_GATEWAY_URL` | AI Gateway / API base |
| `TON_IDE_AI_API_KEY` | Provider key (server-side only) |
| `TON_API_KEY` | TonAPI for MCP |
| `TONCENTER_API_KEY` | Toncenter for MCP |

Never commit secrets. Use `.env` locally and deployment secrets in production.
