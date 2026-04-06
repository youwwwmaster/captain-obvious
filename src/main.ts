import * as http from 'http';
import { config } from './config';
import { db } from './db';
import { runMigrations } from './db/migrate';
import { bot, handleUpdate } from './bot';

async function bootstrap(): Promise<void> {
  // Проверяем БД
  await db.query('SELECT 1');
  console.log('✅ PostgreSQL подключён');

  // Миграции
  await runMigrations();

  // Регистрируем webhook
  const webhookUrl = `${config.bot.webhookDomain}/webhook`;
  await bot.api.setWebhook(webhookUrl);
  console.log(`✅ Webhook: ${webhookUrl}`);

  // HTTP сервер
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      await handleUpdate(req, res);
    } else if (req.url === '/health') {
      res.writeHead(200);
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.bot.webhookPort, () => {
    console.log(`🚀 Порт ${config.bot.webhookPort}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Ошибка запуска:', err);
  process.exit(1);
});
