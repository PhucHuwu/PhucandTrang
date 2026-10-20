# 💕 Chúng Mình (Phúc & Trang) — Single Love Journal & Dedicated CMS Studio

Hệ thống kỷ niệm tình yêu kết hợp trải nghiệm thị giác **3D WebGL Flipbook sống động** và nền tảng quản trị nội dung chuyên nghiệp **Single Love Journal CMS Studio**, xây dựng trên kiến trúc hướng sự kiện, cô lập bản nháp/xuất bản và tự động hóa toàn diện dành riêng cho Phúc & Trang.

---

## 📁 Cấu Trúc Monorepo

```text
PhucandTrang/
├── apps/
│   ├── web/                 # Next.js 15 frontend, Admin BFF, public 3D journal
│   └── api/                 # NestJS 10 API, Prisma schema, migrations, seed
├── packages/
│   └── shared/              # Pure TypeScript contracts, math and utilities
├── docs/
├── .github/workflows/
├── package.json             # npm workspace orchestration
├── package-lock.json        # single lockfile for all workspaces
└── tsconfig.base.json
```

---

## 🏗️ Tổng Quan Kiến Trúc (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js 15)                            │
│                                                                             │
│  [ Public 3D Journal ]                   [ Single Journal Studio ]          │
│  - Three.js / WebGL Realistic Engine     - React Konva Canvas 1024x1360     │
│  - Lazy Texture Sliding Window (±3)      - Direct Journal Administration    │
│  - Priority Media Preloader              - Debounced Autosave (800ms)       │
│  - Dynamic Text Variable Resolver        - Undo / Redo History Stack (40)   │
│  - Audio Engine (Web Audio API)          - Magnetic Snapping & Guides       │
│                                          - Canva/Figma Layers Panel         │
│                                          - Visual Cover Studio (3 Sides)    │
│                                          - BFF Proxy / HttpOnly Cookies     │
└───────────────────────┬──────────────────────────────▲──────────────────────┘
                        │                              │
          Public API    │ (Frozen Published Snapshot)  │ Semantic Journal REST API
                        ▼                              │ (JWT + BFF Proxy)
┌──────────────────────────────────────────────────────┴──────────────────────┐
│                            BACKEND (NestJS 10)                              │
│                                                                             │
│  - Single Journal Controller: /api/journal (GET, PATCH, publish, preview)   │
│  - Single Journal Resolver: earliest created book (no slug)                 │
│  - Single Admin Account, password-only login (Role enum still enforced)     │
│  - Public Registration Completely Disabled                                  │
│  - Pre-Publish Validation Engine (10 Blocking Errors vs Warnings)           │
│  - Cache Invalidation & Sequential ETag Calculation                         │
└───────────────────────┬──────────────────────────────▲──────────────────────┘
                        │                              │
                        ▼                              ▼
┌──────────────────────────────────────┐     ┌────────────────────────────────┐
│        Neon PostgreSQL + Prisma 7    │     │       Cloudinary CDN           │
│                                      │     │                                │
│  - Connection Pooling (pg.Pool)      │     │  - Signed Direct Upload        │
│  - Option B Page Sequencing          │     │  - Whitelisted Folders         │
│  - Atomic $transaction Rollback      │     │  - Canonical Media Storage     │
│  - Published Snapshot Isolation      │     │  - Responsive Optimization     │
└──────────────────────────────────────┘     └────────────────────────────────┘
```

---

## 🚀 Hướng Dẫn Cài Đặt & Triển Khai (Setup & Deployment)

### 1. Yêu Cầu Hệ Thống (Prerequisites)
- **Node.js**: v20.x hoặc v22.x LTS
- **Package Manager**: npm v10+ với một root `package-lock.json`
- **Database**: PostgreSQL 15+ (Khuyến nghị sử dụng Neon Serverless Postgres với SSL)
- **Media CDN**: Tài khoản Cloudinary (Cloud Name, API Key, API Secret)

---

### 2. Thiết Lập Biến Môi Trường (Environment Variables)

#### Backend (`apps/api/.env`)
```env
# Application
NODE_ENV=production
PORT=4000
API_PREFIX=api

# Security & Authentication (Bắt buộc cấu hình bí mật riêng trên production)
JWT_SECRET=your_super_strong_production_jwt_secret_key_here
JWT_EXPIRATION=7d

# PostgreSQL Database (Neon connection pooler)
DATABASE_URL=postgresql://username:password@ep-host-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Cloudinary CDN Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS Whitelist (Phân cách bởi dấu phẩy)
CORS_ORIGINS=https://your-domain.com,https://your-app.vercel.app

# Seeding Control
# true: Khởi tạo/ghi đè chuẩn tắc 21 trang mẫu; false: Chỉ thêm nếu DB rỗng
SEED_FORCE_CANONICAL_BOOK=false

# Single Admin Provisioning & Seeding Credentials (Bắt buộc khi chạy seed)
SEED_ADMIN_EMAIL=admin@phucandtrang.love
SEED_ADMIN_PASSWORD=your_strong_admin_password_here
# Hoặc trên môi trường local development:
# DEV_ADMIN_PASSWORD=your_local_dev_password
```

#### Frontend (`.env.local` hoặc Vercel Environment Variables)
```env
# URL đến NestJS Backend API cho client browser
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api

# Internal Backend URL cho Next.js server-side / BFF Proxy (tránh roundtrip qua internet nếu deploy cùng network)
BACKEND_INTERNAL_URL=https://api.your-domain.com/api

# Mật khẩu dự phòng ngoại tuyến (chỉ dùng khi dev)
NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK=false
```

---

### 3. Quy Trình Khởi Động Chuẩn Tắc (Production Setup Commands)

Thực hiện tuần tự các bước sau trong terminal:

```bash
# 1. Cài đặt toàn bộ npm workspaces bằng root lockfile
npm ci

# 2. Kiểm tra và sinh Prisma Client v7
npm run prisma:validate
npm run prisma:generate

# 3. Áp dụng tất cả migrations vào cơ sở dữ liệu PostgreSQL
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts

# 4. Nạp dữ liệu khởi tạo (Seeding)
npx prisma db seed

# 5. Quay về root và build toàn bộ monorepo
cd ../..
npm run build

# 6. Khởi chạy Backend Production Server
npm run start:prod --workspace=@phucandtrang/api
```

Các lệnh phát triển từ root:
```bash
npm run dev:web
npm run dev:api
npm run build:web
npm run build:api
npm run test:api
```

---

## 🧭 Cấu Trúc Điều Hướng Admin CMS (Single Journal Navigation)

Sau khi đăng nhập, hệ thống điều hướng trực tiếp tới trang quản trị nhật ký duy nhất:

```
/admin               ➔ Tổng quan nhật ký (Dashboard, KPI thống kê, phím tắt nhanh)
/admin/pages         ➔ Quản lý danh sách trang, kéo thả sắp xếp 3D, thêm/xóa/nhân bản
/admin/pages/:pageId ➔ Visual Canvas Studio (React Konva 1024x1360, Autosave, Undo/Redo)
/admin/cover         ➔ Visual Cover Studio (Bìa trước, Mặt trong, Mặt ngoài bìa sau)
/admin/media         ➔ Thư viện ảnh/video Cloudinary, kiểm tra tham chiếu an toàn
/admin/audio         ➔ Kho nhạc nền sách và nhạc nền từng trang
/admin/layouts       ➔ Kho mẫu bố cục (Layout Templates) hệ thống và tùy biến
/admin/versions      ➔ Lịch sử phiên bản snapshot và phục hồi bản nháp (Rollback Draft)
/admin/settings      ➔ Cài đặt nhật ký (Thông tin cặp đôi, typography, 3D, atmosphere)
/admin/preview       ➔ Chế độ xem trước bản nháp trên 3D Flipbook thực tế
```

---

## 🔒 Mô Hình Xác Thực Đơn Giản & Bảo Mật (Single Admin Auth)

- **Đăng nhập chỉ bằng mật khẩu, một tài khoản Admin**: schema vẫn giữ enum `Role` (`ADMIN`/`EDITOR`/`VIEWER`) và guard toàn cục chặn ghi với role không phải ADMIN/EDITOR, nhưng thực tế chỉ có một tài khoản ADMIN.
- **Vô hiệu hóa đăng ký công khai**: Endpoint `POST /auth/register` trả `403 Forbidden`. Seed không bao giờ ghi đè mật khẩu của admin đã tồn tại.
- **Đổi mật khẩu admin**: `cd apps/api && read -rs ADMIN_NEW_PASSWORD && export ADMIN_NEW_PASSWORD && npm run admin:set-password`. Đổi mật khẩu sẽ vô hiệu hóa các token phát hành sau bản cập nhật này (claim `pwf`).
- **BFF Token Verification**: Endpoint `/api/admin/auth/me` gọi backend NestJS kiểm chứng chữ ký JWT thực tế.
- **Brute-Force Rate Limiting** (bộ nhớ trong, theo từng instance): mỗi client sai 5 lần/5 phút bị chặn 15 phút; sau 10 lần sai toàn cục, mỗi lần thử phải chờ tăng dần (tối đa 60 giây). Header `x-client-ip` chỉ được tin khi kèm `x-bff-secret` khớp `BFF_SHARED_SECRET`.

---

## 🔄 Cơ Chế Seeding: Normal Seed vs. Force Canonical Seed

Tệp khởi tạo `apps/api/prisma/seed.ts` đảm bảo luôn chỉ tồn tại một cuốn nhật ký chuẩn tắc duy nhất:

1. **Non-Destructive Seed (`SEED_FORCE_CANONICAL_BOOK=false` - Mặc Định)**:
   - Kiểm tra nếu tài khoản Admin, nhật ký chuẩn tắc (`phuc-and-trang`), layout templates hoặc audio tracks đã tồn tại thì **giữ nguyên vẹn 100% dữ liệu đang có**.
   - Tuyệt đối không xóa hay ghi đè lên các trang đang biên tập của người dùng.
   - An toàn để chạy trong CI/CD pipeline tự động.

2. **Force Canonical Reset (`SEED_FORCE_CANONICAL_BOOK=true`)**:
   - Dùng khi cần khôi phục cuốn nhật ký về trạng thái gốc của Phúc & Trang.
   - Xóa các trang hiện tại và nạp lại chuẩn tắc 21 trang mẫu với đầy đủ layout presets, hình ảnh Cloudinary, video clips kỷ niệm, nhạc nền và các tọa độ tương đối.
   - Biên dịch và đóng băng ngay một bản `publishedSnapshot` (Revision #1) sẵn sàng phục vụ độc giả công khai.
   - Khi `NODE_ENV=production`, bắt buộc thêm `SEED_CONFIRM_DESTRUCTIVE=yes-wipe-pages`.

> ⚠️ Không bao giờ chạy seed, `migrate dev/reset` hoặc `legacy-migration.ts --apply` lên database production khi chưa có bản backup (`pg_dump`). `legacy-migration.ts` mặc định chỉ chạy thử (dry run).

---

## 📦 Publishing & Versioning Pipeline

### Quy Trình Xuất Bản (Edit Draft ➔ Preview ➔ Publish)
1. **Live Relational Data = Draft**: Toàn bộ thao tác chỉnh sửa trong Visual Editor nằm trong các bảng quan hệ PostgreSQL (`books`, `pages`, `page_elements`).
2. **Preview Mode (`/admin/preview`)**: Quản trị viên kiểm tra trực tiếp bản nháp trên 3D Flipbook thực tế mà không ảnh hưởng tới khách xem bên ngoài.
3. **Pre-Publish Validation Engine**:
   - Hệ thống tự động kiểm tra 10 quy tắc chặn nghiêm ngặt:
     - `MISSING_COVER`: Thiếu ảnh nền bìa trước.
     - `NO_PAGES`: Sách chưa có trang nội dung nào.
     - `MISSING_REQUIRED_MEDIA`: Thiếu ảnh/video của phần tử.
     - `BROKEN_MEDIA_ID`: ID media tham chiếu không tồn tại trong Thư viện Media.
     - `INVALID_VIDEO_POSTER`: Phần tử Video thiếu poster đại diện.
     - `INVALID_INTERACTION_TARGET`: Mục tiêu tương tác sai định dạng URL/Page/Audio.
     - `INVALID_PAGE_ORDER`: Thứ tự trang bị trùng lặp hoặc âm.
     - `INVALID_LAYOUT`: Dùng layout ID không hợp lệ.
     - `DELETED_AUDIO_REFERENCE`: Nhạc tham chiếu đã bị xóa khỏi kho.
     - `MALFORMED_ELEMENT_TRANSFORM`: Tọa độ hoặc kích thước NaN / âm.
   - Nếu còn ít nhất 1 Blocking Error, hệ thống trả về HTTP `400 BadRequestException` và khóa nút Publish trên UI, hiển thị liên kết sửa nhanh (**Fix Link**).
4. **Publish Execution**:
   - Biên dịch toàn bộ tài liệu thành `CompiledBookDocument`.
   - Lưu trữ vào `Book.publishedSnapshot`, tăng `publishedRevision` và `contentRevision` đúng 1 lần duy nhất.
   - Tự động ghi lại một bản snapshot lịch sử vào `BookVersion`.
   - Xóa cache bộ nhớ (`PublicCacheService.invalidateBookCache`).

---

## 🎨 Three.js / Canvas Performance Optimization

- **Lazy Texture Generation**: Sử dụng canvas 16x16 làm placeholder tức thì; chỉ render bìa trước và 2 trang đầu khi mở sách, cắt giảm thời gian tải từ 10s xuống còn **~500ms**.
- **Sliding Window (±3 trang đôi, ±2 trên máy yếu)**: Tải trước ngầm các trang xung quanh trang hiện tại. Cache texture dạng LRU, tối đa 16 textures (10 trên máy yếu); không bao giờ giải phóng mặt trang đang hiển thị.
- **Priority Media Preloading (`MediaPreloader`)**: Tải trước theo thứ tự ưu tiên: `Bìa & Nhạc ➔ Trang hiện tại ➔ Trang lân cận ➔ Trang còn lại`. Chỉ preload poster ảnh tĩnh, **tuyệt đối không tải toàn bộ video MP4** để tiết kiệm băng thông mạng.
- **Debounced Autosave (800ms)**: Tự động gom các thao tác kéo thả và gõ phím, chống spam HTTP requests và bảo vệ khi rời trang (`beforeunload`).
- **Atomic Save**: Autosave gửi trang và phần tử trong một request `POST /pages/:id/save` (một transaction), kèm `baseUpdatedAt` để phát hiện xung đột (HTTP 409) khi trang bị sửa ở tab khác.
- **Undo / Redo History**: Lưu trữ 40 bước thao tác với phím tắt `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y`, đồng bộ với server (undo thao tác xóa sẽ tạo lại phần tử).

---

## 💾 Quy Trình Sao Lưu & Phục Hồi Dữ Liệu (Backup & Restore)

### Sao lưu toàn bộ Database (PostgreSQL Dump)
```bash
# Xuất toàn bộ schema và dữ liệu thành file nén SQL
pg_dump "YOUR_DATABASE_URL" -F c -b -v -f "phuc_and_trang_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Phục hồi Database từ bản Backup
```bash
# Phục hồi vào database đích
pg_restore -d "YOUR_TARGET_DATABASE_URL" -v "phuc_and_trang_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 🧪 Kiểm Thử Hệ Thống (Automated Test Suites)

Backend có **34 test suites / 224 unit tests**; frontend có Playwright E2E (`apps/web/tests`):

```bash
npm run test:api
cd apps/web && npx playwright test --project=chromium
```

---

## ☁️ Cấu Hình Vercel Monorepo

### Web Project
- **Root Directory**: `apps/web`
- **Framework**: Next.js
- `apps/web/vercel.json` giữ `{"framework":"nextjs"}`
- Biến môi trường: `NEXT_PUBLIC_API_URL`, `BACKEND_INTERNAL_URL`, `NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK`

### API Project
- **Root Directory**: `apps/api`
- **Framework**: NestJS
- `apps/api/vercel.json` giữ schema và `"framework": "nestjs"`
- Biến môi trường: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `JWT_EXPIRATION`, `CORS_ORIGINS`, Cloudinary keys và seed admin variables

Hai Vercel projects phải cho phép npm cài dependency từ root workspace để liên kết `@phucandtrang/shared`.

---

## 📄 Bản quyền & Giấy phép (License)

Dự án được xây dựng với tình yêu dành riêng cho **Phúc & Trang**. © 2026. Mọi quyền được bảo lưu, ngoại trừ các quyền được cho phép rõ ràng dưới đây.

- **Được phép:** Sử dụng, chỉnh sửa mã nguồn và phát triển thành sản phẩm cá nhân.
- **Điều kiện:** Khi sử dụng hoặc chỉnh sửa mã nguồn, phải giữ lại thông tin bản quyền và ghi rõ tên tác giả gốc cùng liên kết GitHub của tác giả trong file `README.md`.
- **Không được phép:** Tự nhận mình là tác giả gốc hoặc xóa bỏ thông tin ghi nhận tác giả ban đầu.

Việc sử dụng mã nguồn phải tuân thủ các điều kiện trên.

**Tác giả gốc:** [PhucHuwu](https://github.com/PhucHuwu)