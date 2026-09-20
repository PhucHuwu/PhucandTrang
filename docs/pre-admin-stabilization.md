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
- **Tổng số test suites**: 12 passed (100%).
- **Tổng số unit/integration tests**: 51 passed (100%).
  1. `utils/image-fitting.spec.ts`: Test contain, cover, fill, focalPoint crop calculation.
  2. `utils/coordinate-conversion.spec.ts`: Test active area relative-to-element coordinate conversion.
  3. `utils/page-utils.spec.ts`: Test deterministic sequencing, side derivation, leaf/face calculation.
  4. `utils/safe-merge.spec.ts`: Test safe partial deep-merge and prototype pollution blocking.
  5. `utils/text-variable-resolver.spec.ts`: Test variable parsing, pipes, timezone consistency.
  6. `auth/roles.guard.spec.ts`: Test RBAC authorization rules and role gating.
  7. `pages/pages.service.spec.ts`: Test page order normalization (0..N-1), contiguous sequence, duplicate insertAfter.
  8. `versions/versions.service.spec.ts`: Test cross-book rollback rejection, backgroundMusicId null restoration, atomic execution.
  9. `public/public.service.spec.ts`: Test public document compilation, mediaId resolution, hidden elements filtering, ETag.
  10. `media/media.service.spec.ts`: Test signed upload config, media reference scanner (cover, page, audio, video).
  11. `common/dto/dto-validation.spec.ts`: Test strict DTO validation for interaction, background, and transform.
  12. `app.controller.spec.ts`: Test basic server controller.
- **Biên dịch**:
  - `backend`: `npm run build` thành công 100%.
  - `frontend`: `npm run build` thành công 100% (0 errors).

---

## 4. Architecture Freeze — Prompt 13.7

Trước khi bước vào Prompt 14 (Admin CMS Foundation), toàn bộ kiến trúc lõi được chính thức đóng băng (freeze) với các nguyên tắc bất biến sau:

1. **Page Ordering & Sequencing Contract (Option B)**:
   - `order`: Số nguyên liên tục `0..N-1`. Là nguồn chân lý vật lý duy nhất cho vị trí lật sách của 3D Flipbook Engine.
   - `pageNumber`: Thuộc tính metadata hiển thị (presentation / display number).
   - `side`: Tự động tính từ `order`: chẵn = `LEFT`, lẻ = `RIGHT`.
   - Hàm `PagesService.normalizeBookPageSequence()` tự động dọn dẹp khoảng trống sau mọi mutation (`create`, `delete`, `duplicate`, `reorder`).
   - `duplicate(insertAfter=true)` hoạt động hoàn toàn trên số nguyên, không dùng số thập phân.

2. **Element Interaction Actions**:
   - Định nghĩa duy nhất tại `shared/interactionContract.ts`:
     `'none' | 'open-video' | 'zoom' | 'open-link' | 'navigate-page' | 'play-audio'`
   - `target`: Bắt buộc là `string` hoặc `number`, nghiêm cấm nhận đối tượng/mảng tùy tiện.

3. **Cover Storage & Rendering Contract**:
   - Bìa trước và bìa sau được lưu trong database dưới dạng `cover.front.elements` và `cover.back.elements`.
   - Generic Canvas Renderer vẽ bìa qua cùng pipeline `renderPageTexture()`, không còn code vẽ cứng tọa độ.
   - Bìa đặt `showPageNumber = false` để không vẽ số trang footer. Bìa sau nhận đầy đủ `bookContext`.

4. **Single Source of Truth cho `zIndex`**:
   - `PageElement.zIndex` (`Int` trong DB) là nguồn chân lý duy nhất.
   - Không còn thuộc tính `transform.zIndex`.

5. **Canonical Media & URL Resolution**:
   - Database lưu `mediaId` (và `posterMediaId` cho video).
   - Public API compiler quét và tự động phân giải thành `src` (video/ảnh) và `thumbnailUrl` (poster) tại runtime.

6. **Mutation & Cache Revision Contract**:
   - `PublicCacheService.touchBook(bookId)` là nơi duy nhất tăng `contentRevision` và xóa cache khi có bất kỳ mutation nào.
   - Rollback phiên bản chỉ tăng `contentRevision` đúng 1 lần, kiểm tra snapshot hoàn chỉnh và từ chối rollback chéo sách (`version.bookId !== bookId`).

7. **Role Access Control (RBAC)**:
   - `VIEWER`: Đọc dữ liệu CMS qua JWT.
   - `EDITOR`: Sửa đổi nội dung (sách, trang, phần tử, media, audio).
   - `ADMIN`: Xóa dữ liệu, cấp quyền, rollback phiên bản.
   - Public registration bị vô hiệu hóa trên môi trường production.

8. **Prisma Migrations**:
   - `20260920000000_init`: Migration khởi tạo sạch sẽ, không trùng lặp index.
   - `20260921000000_pre_admin_stabilization`: Cập nhật `User.role = VIEWER` và `books.content_revision`.

---

## 5. Xác Nhận Sẵn Sàng Chuyển Giao Cho Prompt 14
Hệ thống đã đạt toàn bộ 20 điều kiện trong Definition of Done của Prompt 13.7. Sẵn sàng 100% để triển khai Prompt 14 — Admin CMS Foundation mà không cần điều chỉnh lại data contract.
