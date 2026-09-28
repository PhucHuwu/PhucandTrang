# 📋 KIỂM TRÚC HỆ THỐNG & KẾT QUẢ REFATOR SINGLE LOVE JOURNAL CMS

## 1. Mục Tiêu Tinh Gọn (Product Simplification)
Hệ thống đã hoàn tất chuyển đổi toàn diện từ mô hình **Multi-Book CMS / Multi-User RBAC** sang **Single Love Journal CMS Studio**, phản ánh đúng bản chất sản phẩm là cuốn nhật ký tình yêu thiêng liêng duy nhất dành riêng cho **Phúc & Trang** được quản trị bởi một tài khoản duy nhất.

---

## 2. Các Thay Đổi Trọng Yếu Đã Thực Hiện

### A. Backend Architecture & API
1. **Canonical Journal Resolver**:
   - Tích hợp `BooksService.getCanonicalJournal()` và `BooksService.getCanonicalJournalId()` dựa trên `CANONICAL_JOURNAL_SLUG = 'phuc-and-trang'`.
   - Backend Controller chuyên biệt: `/api/journal`:
     - `GET /api/journal`: Lấy trực tiếp thông tin và cấu trúc cuốn nhật ký duy nhất.
     - `PATCH /api/journal`: Cập nhật cấu hình nhật ký an toàn (Safe PATCH semantics).
     - `GET /api/journal/preview`: Xuất dữ liệu bản nháp để xem trước.
     - `GET /api/journal/validate-publish`: Chạy kiểm toán trước xuất bản.
     - `POST /api/journal/publish`: Xuất bản bản snapshot mới.
     - `POST /api/journal/archive`: Lưu trữ nhật ký.
   - Thêm alias public endpoint: `GET /api/public/journal`.
2. **Loại Bỏ Phức Tạp RBAC**:
   - Giữ nguyên cấu trúc bảng quan hệ trong PostgreSQL mà không làm gián đoạn database schema.
   - Loại bỏ các điều kiện phân quyền rườm rà `RolesGuard`, chuyển về `AuthGuard('jwt')` bảo vệ tài khoản Quản trị viên duy nhất.
   - Vô hiệu hóa vĩnh viễn endpoint `POST /auth/register` (`403 Forbidden`).

### B. Frontend Admin CMS & Navigation
1. **Đơn Giản Hóa Hệ Thống Đường Dẫn (Route Flattening)**:
   - Thay vì truyền `bookId` khắp URL:
     - `/admin/books/:bookId/pages` ➔ `/admin/pages`
     - `/admin/books/:bookId/pages/:pageId` ➔ `/admin/pages/:pageId`
     - `/admin/books/:bookId/cover` ➔ `/admin/cover`
     - `/admin/books/:bookId/settings` ➔ `/admin/settings`
     - `/admin/books/:bookId/preview` ➔ `/admin/preview`
     - Màn hình lịch sử: `/admin/versions`
   - Đã xóa bỏ hoàn toàn thư mục thừa `src/app/admin/books`.
2. **Context Quản Trị Duy Nhất (`JournalContext`)**:
   - `JournalProvider` tự động nạp cuốn nhật ký chuẩn tắc ngay khi vào CMS.
   - Cung cấp hook `useJournal()` chia sẻ `journal`, `journalId`, `refreshJournal()` xuyên suốt mọi trang mà không cần chọn sách hay truyền props.
3. **Thanh Điều Hướng & Tiêu Đề Mới**:
   - Xóa bỏ nút chọn sách, danh sách sách, nút tạo sách và xóa sách.
   - Header hiển thị huy hiệu chuẩn **"Quản Trị Viên (Admin)"** thay vì các nhãn VIEWER/EDITOR cũ.

---

## 3. Kết Quả Kiểm Thử & Biên Dịch Dự Án
- **Backend NestJS**: **23/23 Test Suites Passed (117/117 Unit Tests, 100%)**.
- **Backend Build**: Thành công 100% (0 errors).
- **Frontend Build**: Thành công 100% (0 errors, 18 static & dynamic routes).

---

## 4. Monorepo Restructure

Repository được tổ chức bằng npm workspaces mà không thay đổi product behavior:

```text
PhucandTrang/
├── apps/
│   ├── web/                 # Next.js 15, Admin UI, BFF routes, public 3D journal
│   └── api/                 # NestJS 10, Prisma schema/migrations/seed
├── packages/
│   └── shared/              # Framework-independent contracts and pure utilities
├── docs/
├── .github/workflows/
├── package.json
├── package-lock.json
└── tsconfig.base.json
```

- Frontend source moved from root `src/` and `public/` to `apps/web/`.
- Backend moved from `backend/` to `apps/api/`.
- Shared code moved from `shared/` to the compiled workspace package `@phucandtrang/shared`.
- Prisma seed catalog moved into the shared package, so API seed no longer imports frontend files.
- Root scripts orchestrate development, builds, tests and Prisma commands.
- CI installs once with root `npm ci` and verifies shared, Prisma, API tests/build and web build.
