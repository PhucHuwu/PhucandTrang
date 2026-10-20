import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { requireJwtSecret } from './auth/jwt-secret';
import { buildCorsOrigin, securityHeaders } from './http-security';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Every environment needs its own JWT_SECRET; there is no built-in fallback.
  // A short secret in production only logs a warning so the API keeps booting.
  try {
    requireJwtSecret(process.env.JWT_SECRET);
  } catch {
    console.error('FATAL: JWT_SECRET environment variable must be properly configured!');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityHeaders);

  // Enable shutdown hooks for graceful termination (SIGTERM / SIGINT)
  app.enableShutdownHooks();

  app.enableCors({
    origin: buildCorsOrigin(isProduction, process.env.CORS_ORIGINS),
    credentials: true,
  });

  // Set global API prefix: /api
  app.setGlobalPrefix('api');

  // Global validation pipe with strict whitelist enforcement
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Phuc & Trang Love Journey Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
