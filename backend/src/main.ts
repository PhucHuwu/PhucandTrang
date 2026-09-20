import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Production security check: enforce dedicated JWT_SECRET
  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('super_secret_romantic_jwt_key'))) {
    console.error('FATAL: JWT_SECRET environment variable must be properly configured in production!');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks for graceful termination (SIGTERM / SIGINT)
  app.enableShutdownHooks();

  // Secure CORS Configuration
  let corsOrigin: any = true;
  if (isProduction) {
    if (process.env.CORS_ORIGINS) {
      corsOrigin = process.env.CORS_ORIGINS.split(',').map((s) => s.trim());
    } else {
      corsOrigin = [
        'https://love.phuchuwu.io.vn',
        'https://phucandtrang.love',
        'https://phuc-and-trang.vercel.app',
        /\.vercel\.app$/,
      ];
    }
  } else {
    corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow localhost or server-to-server calls in development
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    };
  }

  app.enableCors({
    origin: corsOrigin,
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
