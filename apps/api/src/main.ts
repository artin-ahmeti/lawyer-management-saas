import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { configureHttp } from './common/http';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureHttp(app);
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Lawyer Management API')
    .setDescription('Practice management platform API. All writes flow through here (Plan §3).')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, openApiConfig));
  // Serves interactive docs at /docs and the raw spec at /openapi.json
  // (consumed by packages/api-client `generate`).
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port} (docs at /docs)`);
}

void bootstrap();
