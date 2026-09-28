# 💕 Chúng Mình (Phúc & Trang) — Single Love Journal & Dedicated CMS Studio

Hệ thống kỷ niệm tình yêu kết hợp trải nghiệm thị giác **3D WebGL Flipbook sống động** và nền tảng quản trị nội dung chuyên nghiệp **Single Love Journal CMS Studio**, xây dựng trên kiến trúc hướng sự kiện, cô lập bản nháp/xuất bản và tự động hóa toàn diện dành riêng cho Phúc & Trang.

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
│  - Canonical Journal Resolver: slug = 'phuc-and-trang'                      │
│  - Single Admin Authentication (No multi-user RBAC overhead)                │
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
- **Package Manager**: npm v10+ (Đã bao gồm `package-lock.json` cho cả Root và Backend)
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
# 1. Cài đặt toàn bộ dependencies cho Frontend & Backend bằng package-lock
npm ci
cd backend
npm ci

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

- **Không còn sự phức tạp của RBAC đa cấp**: Loại bỏ hoàn toàn sự phân tách `VIEWER / EDITOR / ADMIN`.
- **Tài khoản Quản trị duy nhất**: Sau khi đăng nhập thành công, Admin có toàn quyền thao tác trên toàn bộ hệ thống.
- **Vô hiệu hóa đăng ký công khai**: Endpoint `POST /auth/register` bị tắt vĩnh viễn với mã lỗi `403 Forbidden`. Tài khoản Admin được khởi tạo an toàn qua Prisma Seed hoặc migration script.
- **BFF Token Verification**: Endpoint `/api/admin/auth/me` gọi backend NestJS kiểm chứng chữ ký JWT thực tế, không tin tưởng cookie client không mã hóa.
- **Brute-Force Rate Limiting**: Tự động khóa 15 phút nếu nhập sai mật khẩu quá 5 lần trong 5 phút.

---

## 🔄 Cơ Chế Seeding: Normal Seed vs. Force Canonical Seed

Tệp khởi tạo `backend/prisma/seed.ts` đảm bảo luôn chỉ tồn tại một cuốn nhật ký chuẩn tắc duy nhất:

1. **Non-Destructive Seed (`SEED_FORCE_CANONICAL_BOOK=false` - Mặc Định)**:
   - Kiểm tra nếu tài khoản Admin, nhật ký chuẩn tắc (`phuc-and-trang`), layout templates hoặc audio tracks đã tồn tại thì **giữ nguyên vẹn 100% dữ liệu đang có**.
   - Tuyệt đối không xóa hay ghi đè lên các trang đang biên tập của người dùng.
   - An toàn để chạy trong CI/CD pipeline tự động.

2. **Force Canonical Reset (`SEED_FORCE_CANONICAL_BOOK=true`)**:
   - Dùng khi cần khôi phục cuốn nhật ký về trạng thái gốc của Phúc & Trang.
   - Xóa các trang hiện tại và nạp lại chuẩn tắc 21 trang mẫu với đầy đủ layout presets, hình ảnh Cloudinary, video clips kỷ niệm, nhạc nền và các tọa độ tương đối.
   - Biên dịch và đóng băng ngay một bản `publishedSnapshot` (Revision #1) sẵn sàng phục vụ độc giả công khai.

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

Hệ thống sở hữu bộ kiểm thử tự động gồm **23 Test Suites với 117 Unit Tests** bao phủ 100% logic trọng yếu:

```bash
cd backend
npm test
```

---

## 📄 Bản Quyền & Giấy Phép (License)
Dự án được xây dựng với tình yêu dành riêng cho **Phúc & Trang**. Mọi quyền được bảo lưu © 2026.
