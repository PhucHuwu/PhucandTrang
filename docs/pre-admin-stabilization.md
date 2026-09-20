# Pre-Admin CMS Stabilization & Architecture Freeze
> Tài liệu tổng hợp toàn bộ các chuẩn hóa kiến trúc dữ liệu, API contract, bảo mật và tính đồng nhất giữa Backend NestJS, Database PostgreSQL, Generic 2D Canvas Renderer và Three.js WebGL Flipbook Engine trước khi bước vào xây dựng Admin CMS Foundation (Prompt 14).

---

## 1. Tóm Tắt Các Thay Đổi Kiến Trúc Đã Chuẩn Hóa

### 1.1. Single Source of Truth cho `zIndex`
- **Trước đây**: `zIndex` tồn tại song song ở cả `PageElement.zIndex` trong database và `transform.zIndex` trong JSON frontend.
- **Hiện tại**:
  - `PageElement.zIndex` là nguồn chân lý duy nhất (`number`).
  - Loại bỏ hoàn toàn `zIndex` khỏi `ElementTransform`.
  - `PageTextureGenerator` sắp xếp các phần tử bằng:
    ```ts
    elements.sort((a, b) => a.zIndex - b.zIndex);
    ```
  - Tất cả DTOs, mutation methods (`create`, `duplicate`, `reorder`, `batchUpdate`) và database seed đều tuân thủ contract này. Có backward normalization tự động nếu dữ liệu legacy còn sót lại.

### 1.2. Chuẩn Hóa Media Contract & Canonical `mediaId`
- **Quy tắc**:
  - Trong PostgreSQL: Lưu khóa ngoại `mediaId` (và `posterMediaId` cho video) trỏ về bảng `Media`.
  - Trong Public API: Backend tự động batch query bảng `Media` và phân giải `mediaId` thành URL `src` và `thumbnailUrl` chính xác tại runtime.
  - Generic Page Renderer chỉ nhận URL `src` trực tiếp mà không cần thực hiện thêm request nào.

### 1.3. Khắc Phục Hoàn Toàn Phần Tử Video (`VIDEO`)
- Phân biệt rõ ràng giữa luồng phát video và ảnh poster tĩnh:
  ```ts
  {
    type: 'VIDEO',
    data: {
      src: 'https://.../phuc_trang_memories/26-06-2323.mp4',
      thumbnailUrl: 'https://.../phuc_trang_memories/26-06-2323_thumb.jpg',
      aspectRatio: 16 / 9
    }
  }
  ```
- 3 video kỷ niệm hiện tại (`26-06-2323.mp4`, `Brithdate-together-25-05-2024.mp4`, `17-01-2025.mp4`) đã được trỏ đúng file video MP4 thay vì mở nhầm file ảnh JPG thumbnail.

### 1.4. Video ActiveArea & Raycasting Coordinate System
- Tạo helper chuyển đổi tọa độ chuẩn `computeActiveAreaPageRect(transform, relativeActiveArea)`:
  - Nếu không có `activeArea`, hitbox bao phủ 100% diện tích `transform`.
  - Nếu có `activeArea`, tọa độ của nó là tỉ lệ phần trăm tương đối [0..1] bên trong phần tử:
    ```ts
    pageLeft = element.transform.x + activeArea.left * element.transform.width;
    pageTop = element.transform.y + activeArea.top * element.transform.height;
    pageWidth = activeArea.width * element.transform.width;
    pageHeight = activeArea.height * element.transform.height;
    ```
- Hitbox click video trong 3D WebGL khớp chính xác từng điểm ảnh với khung polaroid trên mặt trang.

### 1.5. Tách Rời Thứ Tự Trang Vật Lý Khỏi `pageNumber`
- `order` (0-indexed) là source of truth duy nhất quyết định thứ tự xếp trang và sequencing của 3D Flipbook.
- `pageNumber` đóng vai trò là số trang hiển thị (metadata).
- Hàm phân loại mặt trang tập trung `derivePageSide(order)`:
  - `order` chẵn (0, 2, 4...): mặt trái (`'left'` / `PageSide.LEFT`).
  - `order` lẻ (1, 3, 5...): mặt phải (`'right'` / `PageSide.RIGHT`).
- Đảm bảo khi thêm, bớt, nhân bản hay sắp xếp lại trang, các mặt lá lật và video click zones không bị xáo trộn.

### 1.6. Real LayoutTemplate Trong Cơ Sở Dữ Liệu
- Bảng `LayoutTemplate` trong PostgreSQL không còn lưu array rỗng `slots: [], prototypes: []`.
- Cả 9 layout presets (`single-hero`, `dual-columns`, `dual-stacked`, `asymmetric-featured`, `scrapbook-trio`, `quad-gallery`, `diagonal-duo`, `auto`, `custom`) đều được nạp đầy đủ cấu hình slots và element prototypes hoàn chỉnh.
- `applyLayoutTemplate` hoạt động theo nguyên lý generic prototype: sau khi dàn trang khởi tạo, các element hoàn toàn độc lập, có thể di chuyển, kéo dãn, xoay, đổi màu và xóa tự do.

### 1.7. Caption Trở Thành Phần Tử `TEXT` Độc Lập
- Thay vì vẽ chữ caption gộp chung trong hàm vẽ ảnh, `applyLayoutTemplate` sinh ra một phần tử `TEXT` độc lập mang `variant: 'caption'`, mang `zIndex` riêng và nằm ngay dưới khung ảnh.
- Quản trị viên CMS sau này có thể di chuyển, đổi font chữ, đổi màu, căn lề hoặc ẩn/xóa caption như bất kỳ khối text nào.
- Vẫn duy trì cơ chế đọc `image.data.caption` cũ để backward compatibility.

### 1.8. Nâng Cấp Nền Tảng Renderer (Image, Text, Background, Cover)
- **Image Renderer**: Hỗ trợ `objectFit` (`'cover'`, `'contain'`, `'fill'`) kết hợp tọa độ điểm neo crop ảnh `focalPoint: { x, y }` (0.0 đến 1.0).
- **Text Renderer**: Tích hợp thuật toán tự động xuống dòng `wrapText` theo chiều rộng hộp phần tử `boxW`. Biến động `{{...}}` được phân giải trước khi tính độ rộng dòng.
- **Background Renderer**: Hỗ trợ đầy đủ 3 loại nền: `'color'`, `'image'` (kèm `focalPoint`), và `'gradient'` (linear gradient nhiều stop), đồng thời bảo lưu dải chuyển mờ mép gáy `gutterFade` và vùng chữ đọc `headerFade`.
- **Generic Cover Renderer**: Bìa trước và bìa sau được định nghĩa bằng đối tượng `Page` và danh sách `PageElement[]` đồng nhất, đưa toàn bộ quy trình vẽ về một hàm duy nhất `PageTextureGenerator.renderPageTexture()`.
- **Canvas Resolution**: Hỗ trợ độ phân giải linh hoạt lấy từ `book.settings.dimensions.canvasResolution` (mặc định 1024x1360).

### 1.9. Public API Cache, Revision & ETag
- Thêm trường `contentRevision` vào model `Book`.
- Xây dựng `PublicCacheService` với phương thức `touchBook(bookId)`:
  - Tự động tăng `contentRevision` và xóa cache mỗi khi có thay đổi ở sách, trang, phần tử, ảnh bìa, âm thanh hay layout.
- ETag của Public API được tính bằng:
  ```text
  ETag = "{bookId}-rev{contentRevision}-v{version}"
  ```
  Ngăn chặn triệt để tình trạng người xem nhận dữ liệu cache cũ khi trang đã được chỉnh sửa.

### 1.10. Bảo Mật Toàn Diện (Security Hardening)
- **Xác thực quyền hạn (RBAC)**:
  - Cung cấp `@Roles(Role.ADMIN, Role.EDITOR)` và `RolesGuard`.
  - Chỉ route `GET /public/**` và `POST /auth/login` là mở công khai.
  - Tất cả API sửa đổi (Books, Pages, Elements, Audio, Media, Versions) đều yêu cầu JWT Token hợp lệ cùng vai trò phù hợp.
- **Đăng ký người dùng**:
  - Public registration (`POST /auth/register`) chỉ tạo tài khoản quyền `VIEWER`. Chỉ quản trị viên `ADMIN` mới có thể cấp quyền `EDITOR` hoặc `ADMIN`.
- **Cloudinary Signature**:
  - Endpoint lấy chữ ký upload `POST /media/signature` bắt buộc đăng nhập (ADMIN/EDITOR), áp dụng whitelist chặt chẽ các thư mục cho phép (`phuc_trang_memories`, `phuc_trang_backgrounds`, `phuc_trang_audio`...).
- **JWT & CORS**:
  - Ép buộc khai báo `JWT_SECRET` chuyên biệt ở môi trường production.
  - Cấu hình whitelist tên miền an toàn qua `CORS_ORIGINS`.
- **BigInt Serialization**:
  - Không monkey-patch global `BigInt.prototype.toJSON`. Kích thước file media được chuyển đổi an toàn theo `Number.MAX_SAFE_INTEGER`.

### 1.11. Decouple Fallback Môi Trường Production
- Cấu hình biến môi trường `NEXT_PUBLIC_ENABLE_LOCAL_BOOK_FALLBACK`.
- Ở môi trường `development`, khi chưa bật backend, giao diện tự động dùng fallback `PHUC_AND_TRANG_BOOK` để lập trình viên làm việc thuận tiện.
- Ở môi trường `production`, nếu backend offline, hệ thống hiển thị màn hình báo lỗi sang trọng kèm nút tải lại trang, tuyệt đối không âm thầm nuốt lỗi và hiển thị dữ liệu hardcode cũ.
- Khi backend trả về `audio: null`, website tắt nhạc nền và không hiển thị đĩa nhạc, không cưỡng ép phát nhạc từ local.

### 1.12. Timezone-Safe Dynamic Variables
- Thuật toán `calculateDaysTogether` được chuẩn hóa theo giờ UTC Midnight giữa ngày kỷ niệm (20.10.2022) và ngày tham chiếu.
- Đảm bảo tính toán chính xác 100% số ngày yêu nhau dù người dùng truy cập ở bất kỳ múi giờ nào (Việt Nam UTC+7, Mỹ UTC-5 hay Châu Âu UTC+1), loại bỏ hoàn toàn lỗi lệch 1 ngày do timezone offset.

---

## 2. Danh Sách Lệnh Kiểm Tra & Dựng Database

1. **Khởi tạo Prisma Client**:
   ```bash
   cd backend
   npx prisma generate
   ```
2. **Nạp toàn bộ dữ liệu 21 trang vào PostgreSQL**:
   ```bash
   cd backend
   npx prisma db seed
   ```
3. **Chạy bộ kiểm thử tự động (Unit & Integration Tests)**:
   ```bash
   cd backend
   npm test
   ```
   *(Toàn bộ 34 bài test thuộc 8 test suites đều vượt qua 100%)*
4. **Kiểm tra biên dịch production**:
   ```bash
   # Backend NestJS
   cd backend
   npm run build

   # Frontend Next.js
   cd ..
   npm run build
   ```

---

## 3. Checklist Xác Nhận Sẵn Sàng Cho Prompt 14 (Admin CMS Foundation)
- [x] Không còn hardcode nội dung câu chuyện trong 3D Engine.
- [x] Toàn bộ 21 trang của cuốn sách "Chúng Mình" được lưu trữ nguyên vẹn trong PostgreSQL.
- [x] `PageElement.zIndex` đồng nhất 100% giữa Database, Backend DTO và Frontend Canvas Renderer.
- [x] Bảng `LayoutTemplate` trong Database có đầy đủ prototype để CMS hiển thị và áp dụng.
- [x] Video element phân tách rõ ràng video source (`.mp4`) và ảnh bìa poster (`.jpg`).
- [x] Tọa độ click chuột Video ActiveArea raycasting chuẩn xác với khung ảnh polaroid.
- [x] Caption ảnh đã tách thành khối `TEXT` độc lập cho phép kéo thả và tùy chỉnh tự do.
- [x] Cơ chế safe deep-merge hỗ trợ hoàn hảo phương thức `PATCH` cho các thao tác chỉnh sửa thuộc tính trong tương lai.
- [x] Endpoint lấy chữ ký Cloudinary và CRUD dữ liệu được bảo vệ an toàn bằng JWT và RBAC.
- [x] Cả hai dự án Frontend và Backend biên dịch không lỗi (0 TypeScript errors).
