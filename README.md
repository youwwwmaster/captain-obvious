# Captain Obvious · Капитан Очевидность

Telegram-бот для групповых чатов: по реплаю с триггером объясняет текст или картинку простым языком.  
**Лицензия:** [MIT](LICENSE)

---

## Зачем этот репозиторий

**Captain Obvious — экспериментальная площадка для разработчиков**, а не «просто продакшен-бот».

Репозиторий открыт, чтобы:

- поднимать и форкать **реалистичный** стек (Telegram webhook, Docker, PostgreSQL, LLM-провайдеры);
- исследовать, как **агентские и мультишаговые ИИ-системы** ведут себя внутри настоящего приложения, а не в изолированном playground;
- наращивать практики **устойчивости к prompt injection** и смежным атакам на цепочки с LLM.

Автор использует проект как **живую лабораторию**: здесь проверяются гипотезы, меняются промпты и архитектура, фиксируются наблюдения. Код и документация будут **развиваться в этом направлении** — в сторону более безопасных и предсказуемых агентских пайплайнов, а не только «ещё одного чат-бота».

> Статус: **эксперимент / research sandbox**. API, промпты и меры защиты могут меняться без предупреждения. Для production без доработок не рекомендуется.

### Концептуальный фокус (roadmap)

| Направление | Смысл |
|-------------|--------|
| **Prompt injection** | Пользовательский контент приходит из чата (текст, подписи к фото) — это недоверенный ввод в system/user-цепочку. |
| **Устойчивость агентских систем** | Разделение ролей, жёсткие system-промпты (`prompt.md`), лимиты, аудит запросов в БД, эволюция guardrails. |
| **Наблюдаемость** | Postgres (`users`, `requests`, `transactions`) как основа для лимитов и последующего анализа поведения. |

Идеи и PR по безопасности LLM и агентским паттернам — приветствуются.

---

## Что умеет сейчас

- Работа в **групповом чате**: ответ только на **reply** с триггером.
- **Триггеры** (без учёта регистра): `капитан объясни`, `капитан поясни`, `капитан твой выход`, `капитан объясняй`.
- **Текст и фото** в replied-сообщении → запрос к LLM; остальные типы — ответ без API.
- Триггер **без reply** → шуточная отбивка без вызова модели.
- **OpenAI** или **Anthropic** (`AI_PROVIDER`, `MODEL` в `.env`).
- **Webhook** + `GET /health`, миграции SQL при старте.
- Лимит запросов в сутки (`DAILY_LIMIT`), опционально **Telegram Stars** (пакеты в `.env`).
- Команды: `/start`, `/terms`, `/support`.

Системный промпт — файл [`prompt.md`](prompt.md) (volume в Docker, можно менять без пересборки).

---

## Стек

- **TypeScript**, [Grammy](https://grammy.dev/)
- **PostgreSQL 16**
- **Docker / Docker Compose**
- **OpenAI** / **Anthropic** SDK

---

## Быстрый старт

### Требования

- Docker и Docker Compose
- Публичный HTTPS-домен для webhook (или туннель для разработки)
- Токен бота [@BotFather](https://t.me/BotFather)
- API-ключ OpenAI и/или Anthropic

### 1. Клонировать и настроить окружение

```bash
git clone https://github.com/youwwwmaster/captain-obvious.git
cd captain-obvious
cp env.example .env
```

Заполни `.env`. **Важно:** `DB_PASSWORD` и пароль в `DATABASE_URL` должны **совпадать**.  
Для Docker в URL хост БД — `postgres` (имя сервиса в `docker-compose.yml`).

### 2. Запуск

```bash
docker compose up -d --build
```

Бот при старте выполнит миграции и вызовет `setWebhook` на `{WEBHOOK_DOMAIN}/webhook`.

Проверка:

```bash
curl -sS "https://YOUR_DOMAIN/health"
```

### 3. Локальная разработка (без Docker)

```bash
npm install
npm run build
# PostgreSQL должен быть доступен по DATABASE_URL из .env
npm run dev
```

---

## Переменные окружения

См. [`env.example`](env.example). Основные:

| Переменная | Назначение |
|------------|------------|
| `BOT_TOKEN` | Токен Telegram-бота |
| `BOT_USERNAME` | Username без `@` (ссылки на условия) |
| `WEBHOOK_DOMAIN` | `https://your-domain.com` (без `/webhook`) |
| `WEBHOOK_PORT` | Порт HTTP внутри контейнера (проброс в compose) |
| `AI_PROVIDER` | `openai` \| `anthropic` |
| `MODEL` | Имя модели у провайдера |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Ключи API |
| `DB_PASSWORD` | Пароль Postgres (**обязателен**, дефолта нет) |
| `DATABASE_URL` | Строка подключения к БД |
| `DAILY_LIMIT` | Бесплатных запросов за 24 ч |
| `STARS_PACK_PRICE` / `STARS_PACK_CALLS` | Пакет Telegram Stars |
| `SUPPORT_ADMIN_CHAT_ID` | Числовой user id для `/support` (опционально) |

Секреты только в `.env` — файл в `.gitignore`, в репозиторий не коммитить.

---

## Структура репозитория

```
├── prompt.md          # system prompt (volume)
├── terms.md           # условия использования
├── src/               # исходники бота
├── src/db/migrations/ # SQL-миграции
├── docker-compose.yml
├── Dockerfile
└── env.example
```

Внутренние заметки по продукту: [`captain-obvious-concept.md`](captain-obvious-concept.md).

---

## Участие

Проект задуман как **открытая экспериментальная база**:

- форкайте и поднимайте свой инстанс;
- предлагайте изменения в `prompt.md`, guardrails, тесты на injection-сценарии;
- делитесь находками в Issues.

Перед крупными изменениями в ветке безопасности — обсудите в Issue.

---

## Лицензия

[MIT](LICENSE) — Copyright (c) 2026 Mike
