import * as http from 'http';
import { config } from './config';
import { db } from './db';
import { runMigrations } from './db/migrate';
import { bot, handleUpdate } from './bot';

async function bootstrap(): Promise<void> {
  await db.query('SELECT 1');
  console.log('✅ PostgreSQL connected');

  await runMigrations();

  const webhookUrl = `${config.bot.webhookDomain}/webhook`;
  await bot.api.setWebhook(webhookUrl);
  console.log(`✅ Webhook: ${webhookUrl}`);

  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      try {
        await handleUpdate(req, res);
      } catch (err) {
        console.error('Webhook error:', err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        }
      }
    } else if (req.url === '/health') {
      res.writeHead(200);
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(config.bot.webhookPort, () => {
    console.log(`🚀 Listening on port ${config.bot.webhookPort}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});
