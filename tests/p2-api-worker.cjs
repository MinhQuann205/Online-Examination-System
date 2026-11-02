// Disposable real Nest process for expiry/rotation acceptance. Never uses .env.
const path = require('node:path');
const { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { testDatabaseConfig, createTestPool } = require('./test-database.cjs');
const config = testDatabaseConfig();
process.env.DATABASE_URL = config.connectionString;
const { NestFactory } = req('@nestjs/core');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { csrfProtection } = require('../apps/api/dist/common/csrf.js');
let app;
(async () => {
  const verification = createTestPool(req('pg').Pool, config);
  try {
    await verification.verifiedIdentity();
  } finally {
    await verification.end();
  }
  app = await NestFactory.create(AppModule, { logger: false });
  app.use(csrfProtection(process.env.WEB_ORIGIN));
  app.use(req('cookie-parser')());
  await app.listen(0, '127.0.0.1');
  process.send({ port: app.getHttpServer().address().port });
})().catch(() => process.exit(1));
process.on('message', async (message) => {
  if (message === 'stop') {
    await app.close();
    process.exit(0);
  }
});
