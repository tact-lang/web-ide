# TON IDE 2.0

Browser-based IDE for [TON](https://ton.org) smart contract development: FunC, Tact, Tolk, compile, sandbox tests, deploy, and **AI agents** with tool-calling and MCP.

Previously known as TON Web IDE ([ide.ton.org](https://ide.ton.org)). This tree is intended as a **standalone repository** (not a GitHub fork). See [docs/NEW_REPOSITORY.ru.md](./docs/NEW_REPOSITORY.ru.md) for publishing to a new repo.

## Features

- Monaco editor, WebContainer, `@ton/sandbox`
- FunC / Tact compile, Misti analyzer, TonConnect deploy
- **AI agents**: Contract, Jetton, DeFi, Frontend, Security
- Templates: blank, counter, **Jetton**, **AMM**
- MCP: TonAPI, TON docs (via `server/agent-api`)
- Plugins, cloud jobs (MVP), shared team context

Architecture: [docs/TON_IDE_2.0.md](./docs/TON_IDE_2.0.md) · Agent system: [docs/AGENT_SYSTEM.md](./docs/AGENT_SYSTEM.md)

## Quick start

```bash
npm install
npm run agent-api:install
cp .env.example .env

# terminal 1
npm run agent-api:dev

# terminal 2
npm run dev
```

Open http://localhost:3000 — sidebar **TON AI Agent**.

## Environment

| Variable | Purpose |
|----------|---------|
| `REACT_APP_AGENT_API_URL` | Agent API base (default `/api/agent`) |
| `AGENT_API_PROXY` | Webpack dev proxy target (default `http://127.0.0.1:8787`) |
| `OPENAI_API_KEY` | LLM for agent-api |
| `TON_API_KEY` | TonAPI for MCP |
| `REACT_APP_PROJECT_GITHUB_URL` | GitHub link in sidebar |

## Production build

```bash
npm run build
npm start
```

## License

MIT — see [LICENSE](./LICENSE). Based on MIT-licensed TON Web IDE; attribution to TON Community and original contributors.

## Publishing your own repo

```bash
./scripts/publish-standalone-repo.sh
# then push standalone-main to your new GitHub repository
```
