# Captain Obvious bot

## Behavior
- Lives in a group chat
- Matches a reply that contains a trigger phrase
- Takes content from the message being replied to
- Explains it in plain language
- Posts the answer in the chat

## Activation rules
- ✅ Trigger present **and** message is a reply → call the LLM
- ❌ Trigger without a reply → canned reply, no API:
  "We don't know what this is.... If we knew what this was... But it's definitely not text or an image"

## Content types
- ✅ Text — processed and explained
- ✅ Photo — processed and explained
- ❌ Everything else (documents, video, voice, stickers, etc.) → canned reply, no API

## Triggers (case-insensitive)
- "captain explain"
- "captain clarify"
- "captain your turn"
- "captain explain more"
- "hey captain"
- "hey, captain"

## System prompt
- File: `prompt.md`
- Read with `fs.readFileSync` at startup
- Sent as the system message on every API request
- Mounted in Docker as a volume (change without rebuild)

## AI
- Default: OpenAI `gpt-5.4-mini` (or set via `MODEL`)
- Provider abstraction: switch to Anthropic Claude via `.env`
- Config: `AI_PROVIDER=openai | anthropic`, `MODEL=…`

## Webhook
- Domain in `.env`
- Bot registers webhook on startup via Telegram API

## Runtime
- Docker, standalone container

## Database (PostgreSQL)
- `users` — telegram_id, username, created_at, limits, bonus balance
- `requests` — user_id, created_at (rate limiting)
- `transactions` — user_id, stars_amount, type (purchase/spend), created_at

## Rate limiting
- Enforced in PostgreSQL
- Rolling 24h free quota (`DAILY_LIMIT`)
- Extra calls via Telegram Stars packs

## Research direction
- Experimental sandbox for agentic AI in real Telegram workloads
- Prompt injection resistance and guardrails (see README)
