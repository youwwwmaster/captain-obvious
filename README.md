# Captain Obvious

Telegram bot for group chats: reply with a trigger to get a plain-language explanation of text or an image.  
**License:** [MIT](LICENSE)

---

## Why this repository exists

**Captain Obvious is an experimental playground for developers**, not “just a production bot.”

The repo is public so you can:

- fork and run a **realistic** stack (Telegram webhook, Docker, PostgreSQL, LLM providers);
- study how **agentic and multi-step AI systems** behave inside a real app, not an isolated playground;
- grow practices for **prompt-injection resistance** and related attacks on LLM chains.

The maintainer uses this as a **living lab**: hypotheses, prompts, and architecture change here; observations are recorded. The project will **evolve toward** safer, more predictable agent pipelines—not only “another chatbot.”

> **Status:** experiment / research sandbox. APIs, prompts, and guardrails may change without notice. Not recommended for production without hardening.

### Conceptual focus (roadmap)

| Area | Meaning |
|------|---------|
| **Prompt injection** | User content from chat (text, photo captions) is untrusted input in the system/user chain. |
| **Agentic resilience** | Role separation, strict system prompts (`prompt.md`), rate limits, request audit in the DB, evolving guardrails. |
| **Observability** | Postgres (`users`, `requests`, `transactions`) for limits and later behavior analysis. |

Ideas and PRs on LLM security and agent patterns are welcome.

---

## What works today

- **Group chats**: responds only on a **reply** that includes a trigger phrase.
- **Triggers** (case-insensitive): `captain explain`, `captain clarify`, `captain your turn`, `captain explain more`, `hey captain`, `hey, captain`.
- **Text and photos** in the replied message → LLM call; other types → canned reply, no API.
- Trigger **without a reply** → canned reply, no model call.
- **OpenAI** or **Anthropic** (`AI_PROVIDER`, `MODEL` in `.env`).
- **Webhook** + `GET /health`, SQL migrations on startup.
- Rolling **24h** free limit (`DAILY_LIMIT`), optional **Telegram Stars** packs (`.env`).
- Commands: `/start`, `/terms`, `/support`.
- Check remaining quota: send `hey captain limit` (no reply needed).

System prompt: [`prompt.md`](prompt.md) (Docker volume—edit without rebuild).

---

## Stack

- **TypeScript**, [Grammy](https://grammy.dev/)
- **PostgreSQL 16**
- **Docker / Docker Compose**
- **OpenAI** / **Anthropic** SDK

---

## Quick start

### Requirements

- Docker and Docker Compose
- Public HTTPS domain for the webhook (or a dev tunnel)
- Bot token from [@BotFather](https://t.me/BotFather)
- OpenAI and/or Anthropic API key

### 1. Clone and configure

```bash
git clone https://github.com/youwwwmaster/captain-obvious.git
cd captain-obvious
cp env.example .env
```

Fill in `.env`. **Important:** `DB_PASSWORD` must match the password in `DATABASE_URL`.  
For Docker, the DB host in the URL is `postgres` (service name in `docker-compose.yml`).

### 2. Run

```bash
docker compose up -d --build
```

On startup the bot runs migrations and calls `setWebhook` to `{WEBHOOK_DOMAIN}/webhook`.

Health check:

```bash
curl -sS "https://YOUR_DOMAIN/health"
```

### 3. Local development (no Docker)

```bash
npm install
npm run build
# PostgreSQL must be reachable at DATABASE_URL from .env
npm run dev
```

---

## Environment variables

See [`env.example`](env.example). Main ones:

| Variable | Purpose |
|----------|---------|
| `BOT_TOKEN` | Telegram bot token |
| `BOT_USERNAME` | Username without `@` (terms links) |
| `WEBHOOK_DOMAIN` | `https://your-domain.com` (no `/webhook` suffix) |
| `WEBHOOK_PORT` | HTTP port inside the container |
| `AI_PROVIDER` | `openai` \| `anthropic` |
| `MODEL` | Provider model id |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | API keys |
| `DB_PASSWORD` | Postgres password (**required**, no default) |
| `DATABASE_URL` | Connection string |
| `DAILY_LIMIT` | Free requests per rolling 24h |
| `STARS_PACK_PRICE` / `STARS_PACK_CALLS` | Telegram Stars pack |
| `SUPPORT_ADMIN_CHAT_ID` | Numeric user id for `/support` (optional) |

Secrets live only in `.env` (gitignored).

---

## Repository layout

```
├── prompt.md          # system prompt (volume)
├── terms.md           # terms of use
├── src/               # bot source
├── src/db/migrations/ # SQL migrations
├── docker-compose.yml
├── Dockerfile
└── env.example
```

Product notes: [`captain-obvious-concept.md`](captain-obvious-concept.md).

---

## Contributing

This is an **open experimental base**:

- fork and run your own instance;
- propose changes to `prompt.md`, guardrails, injection test cases;
- share findings in Issues.

For large security-related changes, open an Issue first.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Mike
