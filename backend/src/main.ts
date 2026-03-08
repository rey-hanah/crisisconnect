import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { validate } from './config';
import { AllExceptionsFilter } from './auth/exceptions/auth.exceptions';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const env = validate(process.env);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: env.CLIENT_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(env.PORT);
  logger.log(`🚀 Server running on http://localhost:${env.PORT}`);
}

bootstrap();
