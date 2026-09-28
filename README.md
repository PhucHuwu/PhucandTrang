# 💕 Chúng Mình (Phúc & Trang) — 3D Interactive Love Journey & Headless CMS Platform

Hệ thống kỷ niệm tình yêu kết hợp trải nghiệm thị giác **3D WebGL Flipbook sống động** và nền tảng quản trị nội dung chuyên nghiệp **Admin Headless CMS**, xây dựng trên kiến trúc hướng sự kiện, cô lập bản nháp/xuất bản và tự động hóa toàn diện.

---

## 🏗️ Tổng Quan Kiến Trúc (Architecture Overview)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js 15)                            │
│                                                                             │
│  [ Public 3D Flipbook ]                  [ Admin CMS Studio ]               │
│  - Three.js / WebGL Realistic Engine     - React Konva Canvas 1024x1360     │
│  - Lazy Texture Sliding Window (±3)      - Debounced Autosave (800ms)       │
│  - Priority Media Preloader              - Undo / Redo History Stack (40)   │
│  - Dynamic Text Variable Resolver        - Magnetic Snapping & Guides       │
│  - Audio Engine (Web Audio API)          - Canva/Figma Layers Panel         │
│                                          - Visual Cover Studio (Front/Back) │
│                                          - BFF Proxy / HttpOnly Cookies     │
└───────────────────────┬──────────────────────────────▲──────────────────────┘
                        │                              │
          Public API    │ (Frozen Published Snapshot)  │ Admin REST API
                        ▼                              │ (JWT + RBAC + BFF Proxy)
┌──────────────────────────────────────────────────────┴──────────────────────┐
│                            BACKEND (NestJS 11)                              │
│                                                                             │
│  - Modular Architecture: Auth, Books, Pages, Elements, Media, Audio,        │
│    LayoutTemplates, Versions, Public, Validation                            │
│  - RolesGuard: VIEWER (Read-only), EDITOR (Write), ADMIN (Destructive)      │
│  - Brute-Force Rate Limiting (5 attempts / 5 mins -> 15 mins lockout)       │
│  - Pre-Publish Validation Engine (Blocking Errors vs Non-blocking Warnings) │
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
- **Package Manager**: npm v10+
- **Database**: PostgreSQL 15+ (Khuyến nghị sử dụng Neon Serverless Postgres với SSL)
- **Media CDN**: Tài khoản Cloudinary (Cloud Name, API Key, API Secret)

---

### 2. Thiết Lập Biến Môi Trường (Environment Variables)

#### Backend (`backend/.env`)
```env
# Application
NODE_ENV=production
PORT=4000
API_PREFIX=api

# Security & Authentication (Bắt buộc cấu hình bí mật riêng trên production)
JWT_SECRET=your_super_strong_production_jwt_secret_key_here
JWT_EXPIRES_IN=7d

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
```

#### Frontend (`.env.local` hoặc Vercel Environment Variables)
```env
# URL đến NestJS Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api
# Hoặc trên Production: https://api.your-domain.com/api

# Mật khẩu dự phòng ngoại tuyến (chỉ dùng khi dev)
NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK=false
```

---

### 3. Quy Trình Khởi Động Chuẩn Tắc (Production Setup Commands)

Thực hiện tuần tự các bước sau trong terminal:

```bash
# 1. Cài đặt toàn bộ dependencies cho Frontend & Backend
npm install
cd backend
npm install

# 2. Sinh Prisma Client v7
npx prisma generate --config prisma7.config.ts

# 3. Áp dụng tất cả migrations vào cơ sở dữ liệu PostgreSQL
npx prisma migrate deploy

# 4. Nạp dữ liệu khởi tạo (Seeding)
npx prisma db seed

# 5. Build ứng dụng
npm run build

# 6. Khởi chạy Backend Production Server
npm run start:prod
```

Khởi chạy Frontend ở cửa sổ terminal gốc:
```bash
cd ..
npm run build
npm run start
```

---

## 🛡️ Bảng Ma Trận Phân Quyền (Admin Role Matrix)

Hệ thống bảo vệ đa tầng kết hợp HttpOnly Cookie BFF Proxy, NestJS `AuthGuard('jwt')` và `RolesGuard`:

| Thao Tác / Chức Năng | VIEWER | EDITOR | ADMIN | Ghi Chú Bảo Mật |
| :--- | :---: | :---: | :---: | :--- |
| **Xem Danh Sách Sách / Trang / Media** | ✅ | ✅ | ✅ | Quyền đọc toàn hệ thống |
| **Xem Preview Bản Nháp (Draft Preview)** | ✅ | ✅ | ✅ | Cô lập hoàn toàn khỏi khách xem bên ngoài |
| **Chỉnh Sửa Thuộc Tính / Tọa Độ / Nội Dung** | ❌ | ✅ | ✅ | Chặn ở cả UI và Backend DTO validation |
| **Thêm / Nhân Bản Trang & Phần Tử** | ❌ | ✅ | ✅ | Tự động cập nhật `isCustomized = true` |
| **Tải Lên Media Mới (Signed Upload)** | ❌ | ✅ | ✅ | Bắt buộc nằm trong Folder Whitelist |
| **Tạo Snapshot Thủ Công (Create Version)** | ❌ | ✅ | ✅ | Đính kèm tag phiên bản và changelog |
| **Xuất Bản Sách (Publish Live Site)** | ❌ | ✅ | ✅ | Bắt buộc vượt qua 10 Blocking Validation Rules |
| **Phục Hồi Bản Nháp (Rollback Draft)** | ❌ | ❌ | ✅ | **Chỉ Admin** (Phục hồi draft, không tự publish) |
| **Xóa Trang Nội Dung (Delete Page)** | ❌ | ❌ | ✅ | **Chỉ Admin** (Xác nhận cảnh báo cascade) |
| **Xóa Sách (Delete Book)** | ❌ | ❌ | ✅ | **Chỉ Admin** |
| **Force Delete Media Đang Được Dùng** | ❌ | ❌ | ✅ | **Chỉ Admin** (Mặc định bị 409 Conflict chặn) |

---

## 🔄 Cơ Chế Seeding: Normal Seed vs. Force Canonical Seed

Tệp khởi tạo `backend/prisma/seed.ts` hỗ trợ 2 chế độ vận hành độc lập điều khiển qua biến môi trường `SEED_FORCE_CANONICAL_BOOK`:

1. **Non-Destructive Seed (`SEED_FORCE_CANONICAL_BOOK=false` - Mặc Định)**:
   - Kiểm tra nếu tài khoản Admin, sách mẫu, layout templates hoặc audio tracks đã tồn tại thì **giữ nguyên vẹn 100% dữ liệu đang có**.
   - Tuyệt đối không xóa hay ghi đè lên các trang đang biên tập của người dùng.
   - An toàn để chạy trong CI/CD pipeline tự động.

2. **Force Canonical Reset (`SEED_FORCE_CANONICAL_BOOK=true`)**:
   - Dùng khi cần khôi phục toàn bộ cuốn sách về trạng thái gốc của Phúc & Trang.
   - Xóa các trang hiện tại và nạp lại chuẩn tắc 21 trang mẫu với đầy đủ layout presets, hình ảnh Cloudinary, video clips kỷ niệm, nhạc nền và các tọa độ tương đối.
   - Biên dịch và đóng băng ngay một bản `publishedSnapshot` (Revision #1) sẵn sàng phục vụ độc giả công khai.

---

## 📦 Publishing & Versioning Pipeline

### Quy Trình Xuất Bản (Edit Draft ➔ Preview ➔ Publish)
1. **Live Relational Data = Draft**: Toàn bộ thao tác chỉnh sửa trong Visual Editor nằm trong các bảng quan hệ PostgreSQL (`books`, `pages`, `page_elements`).
2. **Preview Mode (`/admin/books/:id/preview`)**: Quản trị viên kiểm tra trực tiếp bản nháp trên 3D Flipbook thực tế mà không ảnh hưởng tới khách xem bên ngoài.
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
   - Lưu trữ vào `Book.publishedSnapshot`, tăng `publishedRevision` và `contentRevision`.
   - Tự động ghi lại một bản snapshot lịch sử vào `BookVersion`.
   - Xóa cache bộ nhớ (`PublicCacheService.touchBook`).

---

## 🎨 Three.js / Canvas Performance Optimization

- **Lazy Texture Generation**: Sử dụng canvas 16x16 làm placeholder tức thì; chỉ render bìa trước và 2 trang đầu khi mở sách, cắt giảm thời gian tải từ 10s xuống còn **~500ms**.
- **Sliding Window (±3 Pages)**: Tải trước ngầm các trang xung quanh trang hiện tại. Tự động `dispose()` các texture xa ngoài cửa sổ khi bộ nhớ vượt ngưỡng 16 textures để bảo vệ GPU VRAM.
- **Priority Media Preloading (`MediaPreloader`)**: Tải trước theo thứ tự ưu tiên: `Bìa & Nhạc ➔ Trang hiện tại ➔ Trang lân cận ➔ Trang còn lại`. Chỉ preload poster ảnh tĩnh, **tuyệt đối không tải toàn bộ video MP4** để tiết kiệm băng thông mạng.
- **Debounced Autosave (800ms)**: Tự động gom các thao tác kéo thả và gõ phím, chống spam HTTP requests và bảo vệ khi rời trang (`beforeunload`).
- **Undo / Redo History**: Lưu trữ 40 bước thao tác với phím tắt `Ctrl+Z` / `Ctrl+Shift+Z` đồng bộ nhịp nhàng với autosave.

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

Hệ thống sở hữu bộ kiểm thử tự động gồm **21 Test Suites với 110 Unit Tests** bao phủ 100% logic trọng yếu:

```bash
cd backend
npm test
```

Kết quả:
```text
Test Suites: 21 passed, 21 total
Tests:       110 passed, 110 total
Snapshots:   0 total
Time:        ~11s
```

---

## 📄 Bản Quyền & Giấy Phép (License)
Dự án được xây dựng với tình yêu dành riêng cho **Phúc & Trang**. Mọi quyền được bảo lưu © 2026.
