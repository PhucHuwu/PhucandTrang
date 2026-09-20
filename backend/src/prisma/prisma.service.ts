import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const connectionString = process.env.DATABASE_URL;

    // Fail-fast in production if DATABASE_URL is missing
    if (isProduction && !connectionString) {
      throw new Error(
        'FATAL: DATABASE_URL environment variable must be provided in production mode!',
      );
    }

    const effectiveConnectionString =
      connectionString ||
      'postgresql://postgres:postgres@localhost:5432/phuc_and_trang_db?schema=public';

    const pool = new Pool({
      connectionString: effectiveConnectionString,
      ssl: effectiveConnectionString.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    const isProduction = process.env.NODE_ENV === 'production';
    try {
      await this.$connect();
    } catch (err: any) {
      if (isProduction) {
        // Fail-fast: in production, connection failure stops the server immediately
        throw new Error(
          `FATAL: Failed to connect to PostgreSQL database in production: ${err?.message || err}`,
        );
      }
      console.warn(
        '[PrismaService] Database connection not established (offline mode):',
        err?.message || err,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err: any) {
      console.warn('[PrismaService] Error disconnecting Prisma during shutdown:', err?.message || err);
    }

    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch (err: any) {
      console.warn('[PrismaService] Error closing PostgreSQL pool during shutdown:', err?.message || err);
    }
  }
}
