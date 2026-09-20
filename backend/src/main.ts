import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Safe serialization for BigInt in Prisma responses
(BigInt.prototype as any).toJSON = function () {
  const int = Number.parseInt(this.toString(), 10);
  return Number.isNaN(int) ? this.toString() : int;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend Next.js
  app.enableCors({
    origin: true,
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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Phuc & Trang Love Journey Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
