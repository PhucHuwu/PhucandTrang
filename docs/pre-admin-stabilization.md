# Pre-Admin CMS Stabilization & Architecture Freeze (Prompt 13.6)
> Tài liệu tổng hợp toàn bộ các chuẩn hóa kiến trúc dữ liệu, API contract, bảo mật và tính đồng nhất giữa Backend NestJS, Database PostgreSQL, Generic 2D Canvas Renderer và Three.js WebGL Flipbook Engine trước khi bước vào xây dựng Admin CMS Foundation (Prompt 14).

---

## 1. Tóm Tắt Các Thay Đổi Kiến Trúc Đã Chuẩn Hóa

### 1.1. Chiến Lược Migration Prisma Bắt Buộc (Prisma Migration Strategy)
- **Khôi phục migration ban đầu sạch**:
  - `backend/prisma/migrations/20260920000000_init/migration.sql` được đưa về đúng trạng thái gốc, loại bỏ hoàn toàn lỗi duplicate index `media_type_idx`.
- **Tạo migration mới cho stabilization**:
  - `backend/prisma/migrations/20260921000000_pre_admin_stabilization/migration.sql`:
    - Thay đổi default role của `User.role` thành `'VIEWER'`.
    - Bổ sung cột `content_revision` (INTEGER NOT NULL DEFAULT 1) vào bảng `books`.
- Cả hai trường hợp database mới tinh và database đã chạy init cũ đều có migration path 100% hợp lệ.

### 1.2. Bảo Vệ Toàn Bộ Admin Read APIs (Admin Read Route Protection)
- Chỉ có 2 nhóm endpoint mở công khai không cần JWT:
  - `GET /api/public/**`
  - `POST /api/auth/login` (và `POST /api/auth/register` ở development)
- Tất cả các endpoint quản trị còn lại đều bắt buộc JWT:
  - `/books/**`
  - `/pages/**`
  - `/page-elements/**`
  - `/layout-templates/**`
  - `/media/**`
  - `/audio/**`
  - `/versions/**`
- Phân quyền theo RBAC:
  - `VIEWER`, `EDITOR`, `ADMIN`: Có quyền xem (`GET`) thông tin CMS/draft/references.
  - `EDITOR`, `ADMIN`: Có quyền sửa đổi/thêm mới (`POST`, `PUT`, `PATCH`).
  - `ADMIN`: Có quyền xóa (`DELETE`), rollback version, quản lý hệ thống.

### 1.3. Vô Hiệu Hóa Đăng Ký Công Khai Ở Production (Disable Public Register)
- Endpoint `POST /api/auth/register` tự động chặn và trả lỗi `403 Forbidden` khi chạy ở môi trường `production`.
- Ở môi trường `development`, đăng ký luôn tạo tài khoản mang quyền `VIEWER`, client tuyệt đối không thể tự nâng quyền lên `ADMIN`.

### 1.4. Quản Lý Thông Tin Seed Admin An Toàn (Admin Seed Credentials)
- Production yêu cầu biến môi trường `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD`. Nếu thiếu, script seed sẽ dừng lại với thông báo lỗi rõ ràng thay vì dùng password hardcode.
- Ở development, cho phép dùng tài khoản dev khi `ENABLE_DEV_SEED=true` hoặc `NODE_ENV !== 'production'`.
- Cơ chế kiểm tra an toàn: Không tự ý reset password của tài khoản admin đã tồn tại khi chạy lại `prisma db seed`.

### 1.5. Khắc Phục Lỗi Renderer Bìa Sau (Back Cover Generic Renderer)
- Bìa sau (inside và outside) sử dụng `pageNumber = -1` (thay vì số ảo `999`), ngăn chặn hoàn toàn việc Generic Renderer vẽ footer `— 999 —` lên bìa sách.
- Truyền đầy đủ `bookContext` vào `createBackCoverTexture(url, isInside, book)` để bìa sau thừa hưởng đúng canvas resolution, elements từ DB và dynamic text variables.

### 1.6. Bìa Trước và Bìa Sau Hoàn Toàn Do Database Điều Khiển (Database-Driven Covers)
- Cấu hình bìa trước trong PostgreSQL chứa đầy đủ danh sách `elements`:
  - Tiêu đề "Chúng Mình" (`TEXT`)
  - Đường kẻ phân cách (`SHAPE`)
  - Bộ đếm ngày yêu `{{daysTogether | number}} NGÀY` (`TEXT`)
  - Lời đề tựa `Bên nhau từ ngày {{anniversaryDate}}` (`TEXT`)
- Public API compiler quét và phân giải `mediaId` cho cả các phần tử trên bìa trước và bìa sau.
- Media reference checker quét cả `cover.front.elements` và `cover.back.elements` để ngăn chặn xóa nhầm ảnh đang dùng trên bìa.

### 1.7. Thuật Toán `objectFit` và `focalPoint` Chuẩn Xác
- Xây dựng module tính toán tọa độ thuần toán học `shared/imageFitting.ts` (`computeImageFit`):
  - **`contain`**: Giữ nguyên tỉ lệ ảnh, thu phóng vừa vặn bên trong hộp đích và căn giữa, không cắt xén.
  - **`cover`**: Lấp đầy 100% hộp đích, cắt bỏ phần thừa của ảnh nguồn dựa trên điểm neo `focalPoint: { x, y }` (0..1).
  - **`fill`**: Kéo dãn trực tiếp ảnh nguồn để phủ kín toàn bộ hộp đích.
- Áp dụng đồng bộ cho cả phần tử `IMAGE` và nền trang `PageBackground`.

### 1.8. Chuẩn Hóa Thứ Tự Trang và Mặt Lật Sau Mutation (Page Order & Side Normalization)
- Bổ sung phương thức `normalizeBookPageSequence(bookId)` trong `PagesService`:
  - Sau mọi thao tác thêm, xóa, nhân bản (`duplicate`), hoặc sắp xếp lại (`reorder`), hệ thống tự động đánh số lại `order` liên tục từ `0` đến `N-1`.
  - Tự động gán lại mặt lật `side`: `order` chẵn = `LEFT`, `order` lẻ = `RIGHT`.
- Phương thức `duplicate` hỗ trợ cờ `insertAfter?: boolean` để chèn trang mới ngay sau trang gốc thay vì luôn đẩy về cuối sách.

### 1.9. Cache Invalidation Cho Audio và Rollback An Toàn (Audio & Version Rollback Cache)
- Khi thêm, sửa, xóa `AudioTrack`, hệ thống tự động tìm tất cả sách (`backgroundMusicId`) và trang (`audioTrackId`) có liên quan để gọi `PublicCacheService.touchBook(bookId)`.
- Phương thức `rollbackToSnapshot` kiểm tra nghiêm ngặt cấu trúc snapshot: Nếu snapshot không chứa danh sách trang hợp lệ (`pages` array), hệ thống từ chối rollback ngay lập tức để bảo vệ dữ liệu sách hiện tại.
- Khi rollback thành công, hệ thống tăng `contentRevision` và xóa sạch cache để Public API phản ánh ngay lập tức.

### 1.10. Validation DTO Chặt Chẽ (Strict Nested DTOs)
- `ElementTransformDto`: Kiểm tra kiểu số hữu hạn, `width > 0`, `height > 0`, `scale > 0`, `rotation` (-3600..3600), tọa độ `x`, `y` (-2..3).
- `PageBackgroundDto`: Kiểm tra `type` (`'color'`, `'image'`, `'gradient'`), `opacity` (0..1), `focalPoint` (x/y 0..1), `objectFit`, `gradient.stops`.
- `ElementInteractionDto`: Kiểm tra `enabled`, `action` (trong danh sách cho phép), `activeArea` (`left`, `top`, `width > 0`, `height > 0`).
- Bảo tồn ngữ nghĩa `safeDeepMerge`: Khi gửi request `PATCH`, các trường lồng nhau không bị xóa mất dữ liệu cũ và chặn đứng prototype pollution (`__proto__`, `constructor`, `prototype`).

### 1.11. Loại Bỏ Trùng Lặp Nguồn Chân Lý (Shared Workspace Module)
- Toàn bộ definitions của 9 Layout Presets, `imageFitting`, `coordinateConversion`, `safeMerge`, `textVariableResolver` và `pageUtils` được đặt tập trung tại thư mục `shared/`.
- Cả Frontend Next.js và Backend NestJS đều import trực tiếp từ nguồn chân lý duy nhất này, loại bỏ hoàn toàn nguy cơ sửa một bên mà quên bên còn lại.
- Hỗ trợ `LayoutTemplateId = BuiltInLayoutTemplateId | string` để không bị xung đột kiểu khi quản trị viên tạo thêm layout tùy biến trong CMS.

### 1.12. Serializer BigInt và Cấu Hình Cloudinary & CORS
- `AudioService` chuẩn hóa `media.size` thành safe number hoặc string, loại bỏ global monkey-patch `BigInt.prototype.toJSON`.
- Kiểm tra bắt buộc biến môi trường Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) ở production.
- Cấu hình CORS production hỗ trợ domain chính thức `https://love.phuchuwu.io.vn` bên cạnh whitelist tùy biến qua `CORS_ORIGINS`.

---

## 2. Ma Trận Quyền Hạn API (API Access Matrix)

| Endpoint | Anonymous | VIEWER | EDITOR | ADMIN |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/public/**` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/register` | ✅ *(dev only)* | ❌ | ❌ | ❌ |
| `GET /api/books/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST /api/books` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `PUT/PATCH /api/books/:id` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `DELETE /api/books/:id` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `GET /api/pages/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST/PUT/PATCH /api/pages/**` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `DELETE /api/pages/:id` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `GET /api/page-elements/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST/PUT/PATCH /api/page-elements/**` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `DELETE /api/page-elements/:id` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `GET /api/media/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST /api/media/signature` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `POST/PUT /api/media/**` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `DELETE /api/media/:id` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `GET /api/audio/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST/PUT /api/audio/**` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `DELETE /api/audio/:id` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `GET /api/versions/**` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST /api/versions/book/:id/snapshot` | ❌ (401) | ❌ (403) | ✅ | ✅ |
| `POST /api/versions/book/:id/rollback/:verId` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |

---

## 3. Kết Quả Kiểm Thử Tự Động (Test Verification)
- **Tổng số test suites**: 14 passed (100%).
- **Tổng số unit/integration tests**: 67 passed (100%).
  1. `utils/image-fitting.spec.ts`: Test contain, cover, fill, focalPoint crop calculation.
  2. `utils/coordinate-conversion.spec.ts`: Test active area relative-to-element coordinate conversion.
  3. `utils/page-utils.spec.ts`: Test deterministic sequencing, side derivation, leaf/face calculation.
  4. `utils/safe-merge.spec.ts`: Test safe partial deep-merge and prototype pollution blocking.
  5. `utils/text-variable-resolver.spec.ts`: Test variable parsing, pipes, timezone consistency.
  6. `auth/roles.guard.spec.ts`: Test RBAC authorization rules and role gating.
  7. `pages/pages.service.spec.ts`: Test Option B contract (pageNumber preserved, contiguous order 0..N-1, duplicate insertAfter with integer math, reorder foreign/incomplete/duplicate ID rejections, order/side PATCH rejection, page audioTrackId null update).
  8. `books/books.service.spec.ts`: Test Book nullable audio semantics (Case A: null disables music, Case B: string updates track, Case C: omitted keeps music intact).
  9. `versions/versions.service.spec.ts`: Test cross-book rollback rejection, backgroundMusicId null restoration, atomic execution.
  10. `public/public.service.spec.ts`: Test public document compilation, mediaId resolution, hidden elements filtering, null audio, ETag.
  11. `media/media.service.spec.ts`: Test signed upload config, media reference scanner (cover source, cover video poster, page, audio, video).
  12. `common/dto/dto-validation.spec.ts`: Test strict DTO validation for interaction (action, target number/string), background (boolean enabled), and transform.
  13. `prisma/prisma.service.spec.ts`: Test production fail-fast without DATABASE_URL, hardened shutdown cleanup (pool.end called even if $disconnect fails).
  14. `app.controller.spec.ts`: Test basic server controller.
- **Biên dịch & Chạy thực tế**:
  - `backend`: `npm run build` thành công 100%.
  - `backend start:prod`: `node dist/backend/src/main` smoke test thành công 100% (cổng 4000).
  - `frontend`: `npm run build` thành công 100% (0 errors).

---

## 4. Architecture Freeze — Prompt 13.9 (Final Hotfixes)

Trước khi bước vào Prompt 14 (Admin CMS Foundation), toàn bộ kiến trúc lõi được chính thức đóng băng (freeze) với các nguyên tắc bất biến sau:

1. **Page Ordering & Sequencing Contract (Option B Triệt Để)**:
   - `order`: Số nguyên liên tục `0..N-1`. Là nguồn chân lý vật lý duy nhất cho vị trí lật sách của 3D Flipbook Engine.
   - `pageNumber`: Thuộc tính metadata hiển thị (presentation / display number). Hoàn toàn được bảo tồn qua các thao tác `normalizeBookPageSequence`, `reorder`, `remove`.
   - `side`: Bắt buộc tự động tính từ `order`: chẵn = `LEFT`, lẻ = `RIGHT`. Client không được quyền tự truyền `side`.
   - `create`: Nếu không truyền `order`, mặc định append cuối (`max(order) + 1`).
   - `duplicate(insertAfter=true)`: Hoạt động hoàn toàn trên số nguyên: dịch chuyển các trang sau bằng integer increment, gán `targetPageNumber` duy nhất (`max(pageNumber) + 1`), và không overwrite display numbers của các trang khác.
   - `PATCH /pages/:id`: Cấm chỉnh sửa trực tiếp `order` hoặc `side`, trả lỗi 400 và hướng dẫn gọi endpoint reorder chuyên biệt.

2. **Reorder Endpoint Là Nguồn Duy Nhất Cho Thứ Tự Trang**:
   - DTO tối giản: `items: [{ id: string }]`. Vị trí phần tử trong mảng chính là thứ tự `order` mới.
   - Kiểm tra chặt chẽ:
     - Toàn bộ page IDs phải thuộc đúng cuốn sách (chặn đứng foreign page).
     - Không cho phép thiếu trang (phải gửi đủ toàn bộ page set của sách).
     - Không cho phép trùng lặp page ID.
   - Cập nhật atomic trong một transaction duy nhất và touch book cache đúng 1 lần.

3. **Final Nullable Audio Contract (Book & Page)**:
   - `Book.backgroundMusicId`:
     - `undefined`: Giữ nguyên bài hát nền hiện tại.
     - `string`: Đổi sang track được chỉ định.
     - `null`: Tắt hoàn toàn nhạc nền của cuốn sách.
   - `Page.audioTrackId`:
     - `undefined`: Giữ nguyên bài hát riêng của trang.
     - `string`: Gắn bài hát riêng cho trang.
     - `null`: Xóa bài hát riêng của trang.
   - Public API: Trả về `{ "audio": null }` khi `backgroundMusicId = null`, không tự ý fallback nhạc local.

4. **Shutdown Lifecycle & Production Fail-Fast**:
   - `app.enableShutdownHooks()`:
     `SIGTERM / SIGINT -> Nest shutdown -> onModuleDestroy() -> Prisma $disconnect() -> pg Pool close (pool.end())`.
   - `$disconnect()` nếu thất bại thì `pool.end()` vẫn luôn được gọi trong khối try-catch độc lập.
   - `PrismaService` và `seed.ts` bắt buộc `DATABASE_URL` khi chạy `NODE_ENV=production`, fail-fast ngay lập tức nếu thiếu hoặc mất kết nối cơ sở dữ liệu.

5. **Prisma 7 Seed & Non-Destructive Policy**:
   - `backend/prisma7.config.ts` cấu hình:
     ```ts
     migrations: { path: "prisma/migrations", seed: "ts-node prisma/seed.ts" }
     ```
     `npx prisma db seed` chạy trực tiếp qua Prisma 7.
   - **Mặc định non-destructive**: Không ghi đè sách, trang, phần tử, ảnh bìa, âm thanh hay metadata của Media đã tồn tại. Không reset `contentRevision`.
   - **Chế độ reset cưỡng chế**: Khi `SEED_FORCE_CANONICAL_BOOK=true`, xóa sạch và tái tạo chính xác 21 trang mẫu và tăng `contentRevision`.
   - Không đụng chạm các layout template tùy biến (`isSystem: false`).

6. **Cover Video Poster Media References**:
   - `MediaService.checkReferences()` quét đầy đủ `posterMediaId`, `thumbnailUrl`, `posterUrl` trên cả bìa trước và bìa sau.

7. **Renderer Baseline**:
   - Chế độ `contain` của ảnh nền tự động lót màu nền giấy (`paperColor`) trước khi vẽ ảnh, tránh khoảng trống trong suốt.
   - Không còn số ảo `999` trên bìa.

---

## 5. Xác Nhận Sẵn Sàng Chuyển Giao Cho Prompt 14
Hệ thống đã đạt toàn bộ 16 điều kiện trong Definition of Done. Cơ sở dữ liệu, API contract, Generic Renderer và cơ chế bảo mật đã hoàn thành mọi hotfix và chính thức đóng băng. Sẵn sàng 100% để triển khai Prompt 14 — Admin CMS Foundation!
