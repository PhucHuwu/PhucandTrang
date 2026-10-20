# AGENTS.md

Guide for coding agents working on this repo. Read it before changing anything.

## Project

Memorial love journal for Phúc & Trang: a public 3D WebGL flipbook plus a single-admin CMS.

- `apps/web`: Next.js 15. Public 3D journal, admin studio (`/admin/*`, React Konva editor), and a BFF (`src/app/api/admin/*`) that holds the JWT in an HttpOnly cookie and proxies to the API.
- `apps/api`: NestJS 10 + Prisma 7 (PostgreSQL on Neon). Schema, migrations and seed live in `apps/api/prisma`.
- `packages/shared`: pure TypeScript shared by web and api (settings defaults, layout presets, coordinates, interaction contract). Must be built before web or api typecheck: `npm run build:shared`.
- `docs/`: design notes and audits.

Production: web `https://love.phuchuwu.io.vn` (Vercel project `we`), API `https://api-we.vercel.app/api` (Vercel project `we-api`). **Pushing to `main` deploys both.**

## Working rules

- Talk to the user in **Vietnamese**. Code, comments and commit messages stay in English.
- **Never commit, push or deploy without the user's explicit OK.** Ask first.
- Never write passwords, tokens or secrets into files, commits or logs. `.env*` files are gitignored; keep it that way.
- **Local `apps/api/.env` points at the production database.** Do not run `prisma migrate dev/reset`, the seed, or any write query against it without explicit approval and a backup (`pg_dump`). Read-only queries are fine.
- Do not touch `stash@{0}` or unrelated user changes. Revert incidental `package-lock.json` churn from `npm install` unless dependencies were meant to change.

## Commands (run from repo root unless noted)

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Build shared | `npm run build:shared` |
| Dev | `npm run dev:web` / `npm run dev:api` |
| Typecheck | `npx tsc --noEmit -p apps/web` and `npx tsc --noEmit -p apps/api` |
| API unit tests (Jest) | `npm run test --workspace=@phucandtrang/api` |
| API lint | in `apps/api`: `npx eslint "{src,prisma,test}/**/*.ts" --rule "prettier/prettier: off"` |
| Format check | in `apps/api`: `npx prettier --check <files> --end-of-line auto` |
| Web build | `npm run build:web` |
| Web E2E (Playwright) | in `apps/web`: `npx playwright test --project=chromium` |
| Prisma | `npm run prisma:validate`, `npm run prisma:generate` |

Before reporting work as done: typecheck both apps, run API tests, and run `npm run build:web` if web code changed. CI (`.github/workflows/ci.yml`) also checks migrations against the schema and runs E2E on chromium and webkit.

Windows note: `core.autocrlf=true`, so full API lint reports thousands of CRLF-only prettier errors. Lint with prettier off and format-check changed files with `--end-of-line auto`.

## Architecture rules that must hold

**One book only.** There is no slug (the column was dropped). The journal is resolved as the earliest-created book.

**Security**
- The only public endpoint is `GET /api/public/journal`. Everything else goes through the global `AdminAccessGuard`.
- `@Roles(ADMIN)` protects publish, archive, rollback and media delete.
- JWT is pinned to HS256 with no fallback secret. Changing the admin password invalidates older tokens (`pwf` claim). Use `npm run admin:set-password` in `apps/api`.
- Cloudinary upload signatures sign only server-chosen params and whitelisted folders.
- BFF routes check `isSameOriginRequest` (CSRF). Security headers and CSP live in `apps/web/next.config.js`; media comes only from `res.cloudinary.com`.
- `x-client-ip` is trusted only with a matching `x-bff-secret` (`BFF_SHARED_SECRET`).

**Draft vs published**
- Relational tables (`books`, `pages`, `page_elements`) are the draft.
- Publishing validates, compiles into `Book.publishedSnapshot`, records a `BookVersion`, and invalidates the public cache. Never make the public viewer read draft data.

**Concurrency in the editor**
- Page saves and element mutations (create, duplicate, delete, apply-layout) send `baseUpdatedAt`. The API checks it with `touchPageGuarded` (`apps/api/src/common/page-concurrency.ts`) and returns `409` with `code: 'PAGE_CONFLICT'`.
- A `409` with `code: 'DUPLICATE'` is a Prisma unique violation, not an edit conflict.
- On the client, wrap mutations in `runServerMutation` (`apps/web/src/hooks/useAutosavePage.ts`). Use `isPageConflictError` in `apps/web/src/services/adminApi.ts`.
- New DTO fields must be whitelisted, because `forbidNonWhitelisted` rejects unknown fields.

**Media**
- Never delete a Cloudinary file that is still referenced by `books.published_snapshot`, `book_versions.snapshot`, or `PROTECTED_PUBLIC_IDS` (see `apps/api/src/media/media.service.ts`).
- Forced delete of in-use media removes only the DB row.

**Seed**
- `SEED_FORCE_CANONICAL_BOOK=true` wipes pages.
- It always requires `SEED_CONFIRM_DESTRUCTIVE=yes-wipe-pages`.

**Settings**
- Read book settings through `withBookSettingsDefaults` from `@phucandtrang/shared` (deep merge), so missing nested keys never crash the viewer.

**Database naming**
- Some DB columns are snake_case (`published_snapshot`), so raw SQL must use the mapped names from `schema.prisma`.

## 3D viewer (`apps/web/src/components/3d`)

- Must stay smooth on weak, average and strong machines.
- Quality tiers are in `qbject/quality.ts`.
- Page textures are generated lazily by `LazyPageTextureManager`. It keeps a sliding window and evicts by distance from the current spread, and it never releases visible faces.
- Texture work runs only while the book is still (`isTextureWorkSafe`), and texture swaps are applied one per frame. Do not add per-frame heavy work, synchronous canvas rendering during a page turn, or unbounded caches.
- Files under `qbject/` use tabs. Elsewhere the code uses 2 spaces and single quotes.

## Product and UX rules

- Butterflies, flowers and leaves share one pastel watercolor style and must be clearly visible.
- Users never paste storage links. Uploads are pick-a-file or drag-and-drop.
- Destructive actions need a confirmation modal.
- User-facing text is Vietnamese.

## Code style

- Follow the surrounding code: NestJS modules, services and DTOs with `class-validator`, plus a `*.spec.ts` next to the service under test.
- Add or adjust Jest tests for API behavior changes.
- Keep comments sparse and only for non-obvious behavior.
- Keep changes small and focused, and don't refactor unrelated code.
