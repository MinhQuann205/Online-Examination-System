import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { ZodExceptionFilter } from './common/zod-exception.filter';

async function bootstrap() {
  config({ path: resolve(process.cwd(), '../../.env') });
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ZodExceptionFilter());
  const origin = process.env.WEB_ORIGIN;
  if (!origin) throw new Error('WEB_ORIGIN is required');
  app.enableCors({ origin, credentials: true });
  app.use(cookieParser());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Online Examination API')
      .setDescription('Phase 1 authentication and role-aware API')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
      })
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
  await app.listen(Number(process.env.API_PORT || 4000));
}
void bootstrap();
