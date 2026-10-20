import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { buildPoolConfig } from '../src/prisma/pool-config';

/**
 * Rotates the admin password and touches nothing else (no books, pages, media or snapshots).
 *
 * Usage (from apps/api):
 *   read -rs ADMIN_NEW_PASSWORD && export ADMIN_NEW_PASSWORD
 *   npm run admin:set-password
 *   unset ADMIN_NEW_PASSWORD
 *
 * The password is read from the environment so it never lands in the repo or shell history.
 */

const MIN_LENGTH = 8;

async function main() {
  const newPassword = process.env.ADMIN_NEW_PASSWORD;
  if (!newPassword || newPassword.length < MIN_LENGTH) {
    throw new Error(
      `ADMIN_NEW_PASSWORD must be set and at least ${MIN_LENGTH} characters long.`,
    );
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL (or DATABASE_URL_UNPOOLED / DIRECT_URL) is required.',
    );
  }

  // Verifies the server certificate; DB_SSL_INSECURE=true opts out (see src/prisma/pool-config.ts)
  const pool = new Pool({ ...buildPoolConfig(connectionString), max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // Same lookup as AuthService.validateUser, so the account updated is the one login checks
    const canonicalEmail =
      process.env.ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      'admin@phucandtrang.love';
    const admin =
      (await prisma.user.findUnique({ where: { email: canonicalEmail } })) ||
      (await prisma.user.findFirst({
        where: { role: Role.ADMIN },
        orderBy: { createdAt: 'desc' },
      }));

    if (!admin) {
      throw new Error(
        `No admin account found (looked for ${canonicalEmail}, then any ADMIN).`,
      );
    }

    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount > 1) {
      console.warn(
        `⚠️ ${adminCount} ADMIN accounts exist. Updating the one login checks (id=${admin.id}); the others keep their old passwords.`,
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    const stored = await prisma.user.findUnique({ where: { id: admin.id } });
    if (!stored || !(await bcrypt.compare(newPassword, stored.passwordHash))) {
      throw new Error('Password verification after update failed.');
    }

    console.log(
      `✅ Admin password updated (id=${admin.id}, email=${admin.email || '(empty)'}). No other data was modified.`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
