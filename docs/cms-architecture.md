# Kiến Trúc Cuốn Sách & Báo Cáo Audit Chuẩn Hóa (CMS Architecture)

Tài liệu này tổng hợp phân tích hiện trạng kiến trúc mã nguồn của dự án **Phúc & Trang (Love Journey Book)**, bóc tách dữ liệu đang hardcode, phân định ranh giới giữa tầng hiển thị (Renderer/Engine) và tầng dữ liệu (Content/Data), đồng thời đề xuất mô hình dữ liệu chuẩn **Book -> Pages -> Elements** để chuẩn bị kết nối Backend/CMS mà không làm ảnh hưởng đến UI/UX hay hiệu ứng 3D hiện tại.

---

## 1. Phân Tích Luồng Dữ Liệu Hiện Tại (Data Flow Pipeline)

```
[Hardcoded Calls in Component]
             │
             ▼
1. QbjectAuthenticExperience.tsx (Orchestrator & State Container)
   │  - Khởi tạo tiến trình loading giả lập (loadingProgress).
   │  - Khởi tạo mảng calls tuần tự đến PageTextureGenerator.
   │  - Chuyển đổi HTMLCanvasElement sang Data URLs (image/jpeg).
   │  - Cấu hình mảng pageActiveAreas cho video popup.
   │
   ▼
2. PageTextureGenerator.ts (2D Canvas Layout Rasterizer)
   │  - Tạo Canvas 1024x1360 tĩnh cho từng trang sách.
   │  - Vẽ nền (ảnh hoặc #F9F5EC), header, text, polaroid, washi-tape.
   │  - Trả về THREE.CanvasTexture.
   │
   ▼
3. flipbook.ts (3D Flipbook Core Engine)
   │  - Nhận danh sách textureUrls và pageActiveAreas.
   │  - Quản lý WebGL Scene, Camera (fov: 14, z: 5200), Lighting, Raycaster.
   │  - Khởi tạo các thể hiện Page (leaf 3D), gáy sách (spineMesh), mặt bàn.
   │  - Quản lý tương tác vuốt/kéo (SwipeHandler), quán tính (SlidingNumber).
   │  - Kích hoạt VideoOverlay khi click trúng active area.
   │
   ▼
4. page.ts (Leaf Geometry & Vertex Deformation Engine)
      - Tạo BoxGeometry (thickness: 1|5, width: 764, height: 1080, segments: 32x32).
      - Tính toán biến dạng uốn cong Cubic / Quadratic Bézier per frame.
      - Bo góc tròn mượt 2 mép ngoài (R = 75px) và tính toán Ambient Occlusion.
```

---

## 2. Thống Kê Chi Tiết Toàn Bộ Dữ Liệu Đang Hardcode

Hiện tại, toàn bộ dữ liệu nội dung của cuốn sách nằm rải rác trực tiếp trong code logic:

| Nhóm Dữ Liệu | Vị Trí Code Hiện Tại | Nội Dung Đang Hardcode |
| :--- | :--- | :--- |
| **Bìa Trước (Front Cover)** | `QbjectAuthenticExperience.tsx` + `PageTextureGenerator.ts` | - Ảnh nền: `backgrounds/first-cover.jpg`<br>- Tiêu đề: `"Chúng Mình"`<br>- Font tiêu đề: `public/font/2.otf`<br>- Ngày bắt đầu: `"2022-10-20T00:00:00"` (tính số ngày cùng nhau)<br>- Tọa độ card chữ, gradient tối mờ cục bộ |
| **Bìa Sau (Back Cover)** | `QbjectAuthenticExperience.tsx` + `PageTextureGenerator.ts` | - Ảnh nền 2 mặt trong/ngoài: `backgrounds/last-cover.jpg`<br>- Đang để trống chữ (chỉ hiển thị ảnh) |
| **Nội Dung Trang (Pages)** | `QbjectAuthenticExperience.tsx` (dòng 32 - 425) | - 22 trang ruột (11 tờ lật mở đôi)<br>- Thứ tự cố định `pageNumber: 0` đến `20`<br>- Gán cờ `side: 'left'` hoặc `'right'` thủ công |
| **Văn Bản (Text & Copy)** | `QbjectAuthenticExperience.tsx` | - `chapter`: `"Chapter I"`, `"Chapter II"`...<br>- `title`: `"Lần Đầu Gặp Gỡ"`, `"Khoảnh Khắc 20.10.2022"`...<br>- `quote`: `"Vạn vật như muốn hai mình bên nhau..."`, `"Thế cậu đồng ý làm bạn gái tớ không?"`...<br>- `textLines`: Các mảng câu văn tự sự theo từng trang<br>- `handwriting`: `"Mình đây…"` |
| **Ảnh Kỷ Niệm (Media Items)** | `QbjectAuthenticExperience.tsx` | - Danh sách tên file ảnh (`First-meet-13-10-2022.jpg`, `02-01-2025.jpg`...)<br>- Ánh xạ qua `cloudinaryUrls.json` |
| **Ảnh Nền Từng Trang (Backgrounds)** | `QbjectAuthenticExperience.tsx` | - `backgrounds/page-0.jpg` đến `page-15.jpg`, `page-16-17.jpg`, `page-18.jpg` đến `page-20.jpg`<br>- Trang nào có nền thì dùng ảnh, không có thì fallback `#F9F5EC` |
| **Chú Thích Ảnh (Captions)** | `QbjectAuthenticExperience.tsx` | - Caption từng ảnh: `"13.10.2022"`, `"25.12.2022 • Merry Christmas"`, `"Nét dịu dàng của bạn"`, `"Một ngày thật đẹp"`... |
| **Video Kỷ Niệm** | `QbjectAuthenticExperience.tsx` | - 3 video: `26-06-2323.mp4`, `Brithdate-together-25-05-2024.mp4`, `17-01-2025.mp4`<br>- File thumbnail: `26-06-2323_thumb.jpg`, `Brithdate-together-25-05-2024_thumb.jpg`, `17-01-2025_thumb.jpg` |
| **Vùng Click Video (Active Areas)** | `QbjectAuthenticExperience.tsx` (dòng 465 - 495) | - Tọa độ hardcode: `top: 0.1, left: 0.05, width: 0.9, height: 0.85`<br>- `faceIndex: 8` (Trang 7), `faceIndex: 9` (Trang 8), `faceIndex: 12` (Trang 11) |
| **Bố Cục Trang (Layout Types)** | `QbjectAuthenticExperience.tsx` + `PageTextureGenerator.ts` | - Định danh layout: `dual-columns`, `single-hero`, `diagonal-duo`, `quad-gallery`, `dual-stacked`, `asymmetric-featured`, `scrapbook-trio`<br>- Tọa độ từng slot ảnh, padding, washi-tape |
| **Nhạc Nền (Music)** | `VintageMusicPlayer.tsx` + `storyData.ts` | - Tiêu đề: `"Vạn vật như muốn ta bên nhau"`<br>- File source: `"/music/van-vat-nhu-muon-ta-ben-nhau.mp3"` |

---

## 3. Phân Định Ranh Giới: Content/Data vs. Renderer/Engine

Để chuẩn bị tích hợp Backend/CMS, hệ thống cần được phân định rạch ròi theo 2 tầng:

```
┌─────────────────────────────────────────────────────────────┐
│                    TẦNG NỘI DUNG (DATA)                     │
│  - Thông tin cặp đôi (tên, ngày kỷ niệm)                   │
│  - Nhạc nền (audio URL, tên bài hát)                       │
│  - Danh sách trang sách (pages metadata)                   │
│  - Văn bản (tiêu đề, trích dẫn, nhật ký, chữ ký)           │
│  - Phương tiện (ảnh, video, ảnh nền, caption, thumbnail)   │
│  - Cấu hình layout (chọn template bố cục, gán vị trí)      │
│  - Vùng tương tác video (vị trí bounding box)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / API Contract
┌──────────────────────────────▼──────────────────────────────┐
│                  TẦNG HIỂN THỊ (ENGINE)                      │
│  - WebGL Context, Three.js Scene, Camera fov 14, Shadows    │
│  - Thuật toán uốn cong trang Bézier Curve (Cubic/Quadratic)  │
│  - Cơ chế lật trang, quán tính SlidingNumber, SwipeHandler  │
│  - Canvas 2D Texture Renderer (PageTextureGenerator)        │
│  - Hệ thống hạt, bướm 3D, cánh hoa bay (AtmosphericSystem)  │
│  - Video Modal Player (VideoOverlay)                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.1. Những Gì Thuộc Về Content/Data (Sẽ chuyển cho Backend quản lý)
- **Toàn bộ chuỗi văn bản**: Tiêu đề trang, tiêu đề chương, trích dẫn, nội dung tự sự, chữ ký tay.
- **Tài nguyên Media**: URL ảnh, video, audio, thumbnail, CDN mapping.
- **Metadata sách**: Ngày kỷ niệm, tên 2 bạn, danh mục chương.
- **Cấu hình thứ tự & gán trang**: Thứ tự xuất hiện các trang, layout template được áp dụng cho mỗi trang.

### 3.2. Những Gì Thuộc Về Renderer/Engine (Giữ nguyên bất biến)
- **Three.js Core**: Khởi tạo WebGL Renderer, Scene, Camera góc nhìn điện ảnh (`fov: 14`, cự ly `5200`), Studio Light (SpotLight 60, AmbientLight 0.45).
- **Page Geometry & Deformation**: Mô hình `BoxGeometry` 32x32, thuật toán uốn cong theo đường Bézier (`getCurve`), lực uốn cong quán tính (`turnProgressLag`), thuật toán bo góc tròn `Math.hypot(deltaZ, deltaY)`.
- **Flipbook Controller**: Thuật toán tính góc xoay cả cuốn sách `bookAngle = 1 - val`, vector dịch tâm xoay gáy sách `rotateY`.
- **Micro-interactions**: Bộ lắng nghe thao tác chuột và cảm ứng `SwipeHandler`, quán tính vuốt trượt `SlidingNumber`.
- **Hiệu Ứng Khí Quyển**: Đàn bướm 3D lượn vòng quanh sách, cánh hoa đào bay lượn, bụi nắng thần tiên (`AtmosphericSystem`).
- **Texture Painter**: Engine vẽ 2D Canvas kích thước chuẩn `1024x1360`, quy tắc bảo toàn tỉ lệ ảnh không biến dạng (`drawAdaptivePolaroid`).

---

## 4. Đề Xuất Cấu Trúc Mô Hình Chuẩn: Book -> Pages -> Elements

Mô hình hướng tới để Backend trả về một cấu trúc JSON dạng cây lồng nhau chuẩn hóa:

```
Book (Cấu hình tổng quan cuốn sách)
 ├── Metadata (Tên, ngày kỷ niệm, cấu hình nhạc, màu chủ đạo)
 ├── Covers (Bìa trước, bìa sau, ảnh nền bìa)
 └── Pages [] (Danh sách trang sách theo thứ tự lật)
      ├── Page Configuration (pageNumber, side, layoutType, background)
      ├── Content Block (chapterTitle, pageTitle, quote, textLines, handwriting)
      └── Elements [] (Các phần tử đa phương tiện trên trang)
           ├── Type: "photo" | "video"
           ├── Media URLs (image, video, thumbnail)
           ├── Caption & Date
           └── ActiveZone (tọa độ tương tác mở video nếu là type video)
```

### 4.1. TypeScript Interface Đề Xuất (Data Contracts)

```typescript
// 1. Phân tử trên trang (Element)
export interface BookElement {
  id: string;
  type: 'photo' | 'video';
  src: string;                  // URL ảnh hoặc thumbnail
  videoSrc?: string;            // URL video nếu type === 'video'
  caption?: string;             // Chú thích (ví dụ: "13.10.2022")
  aspectRatio?: number;         // Tỷ lệ gốc (w / h)
}

// 2. Cấu trúc một trang sách (Page)
export interface BookPage {
  id: string;
  pageNumber: number;           // 0, 1, 2, ...
  side: 'left' | 'right';
  chapter?: string;             // "Chapter I", "Chapter II"...
  title?: string;               // Tiêu đề trang
  quote?: string;               // Câu trích dẫn
  textLines?: string[];         // Các dòng nhật ký
  handwriting?: string;         // Lời đề tặng / chữ ký tay (ví dụ: "Mình đây…")
  backgroundUrl?: string;       // URL ảnh nền riêng của trang
  layout: LayoutTemplate;
  layoutMode?: 'PRESET' | 'FREEFORM';
  sourceTemplateId?: LayoutTemplate | null;
  isCustomized?: boolean;
  elements: BookElement[];
}

// 3. Cấu trúc toàn bộ cuốn sách (Book)
export interface BookStoryConfig {
  id: string;
  title: string;                 // "CHÚNG MÌNH"
  couple: {
    he: string;                  // "Phúc"
    she: string;                 // "Trang"
  };
  anniversaryDate: string;       // "2022-10-20T00:00:00"
  theme: {
    edgeColor: number;           // 0xb1a283
    paperColor: string;          // "#F9F5EC"
    textColor: string;           // "#292522"
    roseColor: string;           // "#94384F"
  };
  covers: {
    front: {
      photoUrl: string;          // backgrounds/first-cover.jpg
      titleFont: string;         // "SVN-Housttely Signature"
    };
    back: {
      photoUrl: string;          // backgrounds/last-cover.jpg
    };
  };
  music: {
    title: string;               // "Vạn vật như muốn ta bên nhau"
    src: string;                 // URL file mp3
    autoPlay: boolean;
  };
  pages: BookPage[];
}
```

---

## 5. Báo Cáo Audit Code Legacy Không Còn Được Sử Dụng

Qua rà soát toàn bộ dự án, ứng dụng hiện tại chỉ chạy duy nhất qua entry point `src/app/page.tsx -> QbjectAuthenticExperience.tsx`. Nhiều file thuộc các phiên bản prototype trước đây hiện đang bị bỏ trống (dead code) nhưng vẫn nằm trong repository:

### 5.1. Nhóm UI Component Cũ (HTML/CSS Prototype)
- `src/components/spreads/`:
  - `ChapterOneSpread.tsx` (Không được import ở đâu)
  - `ChapterTwoSpread.tsx` (Không được import ở đâu)
  - `ChapterThreeSpread.tsx` (Không được import ở đâu)
  - `ChapterFourSpread.tsx` (Không được import ở đâu)
  - `ChapterFinalSpread.tsx` (Không được import ở đâu)
- `src/components/pages/`:
  - `PagePrologue.tsx`, `PageConfession.tsx`, `PageMemoriesOne.tsx`, `PageMemoriesTwo.tsx`, `PageLoveLetter.tsx`, `PageEpilogue.tsx` (Không được import ở đâu)
- `src/components/`:
  - `BookPageFlipper.tsx` (Component lật trang CSS 2D cũ)
  - `ClosedBookCover.tsx` (Bìa sách 3D CSS cũ)
  - `ChapterBookmark.tsx` (Dấu trang ribbon HTML cũ)
  - `ScrapbookGallery.tsx` (Gallery ảnh polaroid HTML cũ)
  - `RealtimeLoveCounter.tsx` (Đồng hồ đếm ngày HTML cũ)
  - `InteractiveLoveLetter.tsx` (Phong bì thư mở cánh hoa cũ)
  - `Interactive3DBookExperience.tsx` (Bản thử nghiệm Three.js sơ khai)
  - `AmbientParticles.tsx` (Canvas 2D hạt cũ, đã thay bằng 3D AtmosphericSystem)

### 5.2. Nhóm 3D Engine Prototype Cũ
- `src/components/3d/BookCanvas3D.tsx` (Engine Three.js đời đầu)
- `src/components/3d/Book3DModel.ts` (Model sách hình hộp đơn giản đời đầu)
- `src/components/3d/RealisticSkinnedBook.ts` (Model thử nghiệm skinned mesh xương)
- `src/components/3d/qbject/PaperTextureManager.ts` (Tạo bumpMap/roughnessMap, hiện không dùng do đã bỏ texture nhám theo yêu cầu)

### 5.3. Nhóm Dữ Liệu Cũ
- `src/data/storyData.ts`: Phần lớn mảng `bookPages` và `gallery` không còn dùng; chỉ duy nhất đối tượng `LOVE_STORY_DATA.couple.songSrc` và `songTitle` đang được `VintageMusicPlayer.tsx` tham chiếu tạm thời.

*(Ghi chú: Toàn bộ code trên vẫn được giữ nguyên trạng theo đúng yêu cầu, không xóa trong đợt này).*

---

## 6. Lộ Trình Triển Khai Backend (Implementation Roadmap)

1. **Giai đoạn 1 (Đã hoàn thành - Chuẩn hóa Schema, Generic Renderer & Layout Presets)**:
   - Toàn bộ nội dung cuốn sách (21 trang ruột + 2 trang bìa) đã được chuyển thành mô hình `PHUC_AND_TRANG_BOOK` trong `src/data/bookData.ts` tuân thủ 100% schema `Book -> Page[] -> PageElement[]`.
   - `PageTextureGenerator` đã được nâng cấp thành **Generic Page Renderer** (`renderPageTexture(page)`), duyệt render thuần túy theo `transform.zIndex` và hoàn toàn **không chứa bất kỳ tên layout nào**.
   - Xây dựng **Layout Preset System** tại `src/templates/layoutPresets.ts` cung cấp hàm `applyLayoutTemplate(page, template, slotData)` hỗ trợ các slot chuẩn (`title`, `subtitle`, `quote`, `primaryImage`, `secondaryImage`, `caption`...).
   - Layout chỉ đóng vai trò là điểm bắt đầu (starting point); các phần tử sau khi sinh ra có thể di dời, co giãn, đổi góc xoay và chỉnh sửa hoàn toàn tự do.
   - `QbjectAuthenticExperience.tsx` được rút gọn từ 620+ dòng xuống ~190 dòng, hoàn toàn sạch bóng mã hardcode story text và tự động suy diễn `pageActiveAreas` từ `book.pages`.
2. **Giai đoạn 2 (Đã hoàn thành - Backend NestJS, PostgreSQL, Prisma & Full CRUD APIs)**:
   - Khởi tạo thư mục `backend/` với NestJS 10, Prisma ORM và cấu hình PostgreSQL.
   - Triển khai đầy đủ 8 model dữ liệu: `User`, `Book`, `Page`, `PageElement`, `LayoutTemplate`, `Media`, `AudioTrack`, `BookVersion`.
   - Các trường dữ liệu linh hoạt (`transform`, `style`, `data`, `interaction`, `settings`, `background`, `cover`) được lưu dạng PostgreSQL `JSONB`.
   - Các trường cần query thường xuyên (`id`, `bookId`, `pageId`, `type`, `order`, `zIndex`, `status`, `slug`) được đánh index chuẩn chỉ.
   - Hoàn thành đầy đủ 9 module NestJS: `auth`, `books`, `pages`, `page-elements`, `layout-templates`, `media`, `audio`, `versions`, `public`.
   - Tạo file migration SQL ban đầu (`20260920000000_init`) và script seed (`backend/prisma/seed.ts`).
   - **Triển khai toàn diện Full CRUD & Batch API**:
     - `Book`: Create, Read (findAll, findOne, findBySlug), Update, Delete.
     - `Page`: Create, Read, Update, Duplicate (nhân bản toàn bộ element con), Delete (cascade sạch sẽ), Reorder (`PUT /api/pages/book/:id/reorder`).
     - `PageElement`: Create, Read, Update, Duplicate (tự động offset tọa độ), Delete, Reorder zIndex.
     - **Batch Updates**: Hỗ trợ `PATCH /api/pages/:pageId/elements/batch` và `PATCH /api/page-elements/batch` cho phép editor kéo thả hàng loạt element trong 1 transaction duy nhất.
     - **Validation nghiêm ngặt**: DTOs tích hợp `class-validator`, kích hoạt `forbidNonWhitelisted: true` triệt tiêu việc ghi trường tùy tiện ngoài schema.
   - **Triển khai Public Book API Compiled Document**:
     - Endpoint: `GET /api/public/books/:slug` (và alias `GET /api/public/book`).
     - Trả về toàn bộ cuốn sách trong đúng **1 request duy nhất**: metadata, cover, settings, audio, pages (chỉ visible elements), và danh mục media references (`allUrls`, `images`, `videos`, `audio`, `backgrounds`).
     - Chỉ trả phiên bản đang `PUBLISHED`, loại bỏ hoàn toàn các trường nhạy cảm, draft và admin metadata.
     - Tích hợp in-memory cache TTL 60s, HTTP `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` và ETag/304 Not Modified.
3. **Giai đoạn 3 (Đã hoàn thành - Kết nối Frontend với Backend API)**:
   - Tạo Client Service `src/services/bookApi.ts` chịu trách nhiệm fetch `GET /public/books/phuc-and-trang`.
   - `QbjectAuthenticExperience.tsx` hoàn toàn không hardcode story:
     - Luồng tải: `API Book Document -> PageTextureGenerator -> CanvasTexture -> Flipbook`.
     - Tích hợp **AbortController (timeout 3.5s)**: Tránh đơ giao diện khi backend chưa được bật lúc dev.
     - **Graceful Fallback**: Tự động fallback sang `PHUC_AND_TRANG_BOOK` local khi backend offline hoặc lỗi mạng.
     - **Error Fallback Screen**: Giao diện báo lỗi sang trọng kèm nút "Tải lại trang" nếu phát sinh lỗi nghiêm trọng.
     - Bảo tồn 100% Three.js WebGL Engine, chuyển động lật sách uốn cong Bézier, thao tác vuốt trượt, VideoOverlay popup, nhạc nền kỷ niệm và đàn bướm bay lượn.
4. **Giai đoạn 4 (Đã hoàn thành - Media Library & Cloudinary Direct Upload)**:
   - Quản lý siêu dữ liệu đa phương tiện cho 6 loại: `IMAGE`, `VIDEO`, `AUDIO`, `BACKGROUND`, `TEXTURE`, `DECORATION`.
   - Bỏ qua hoàn toàn việc upload file lớn qua NestJS:
     - Admin yêu cầu chữ ký upload: `POST /api/media/signature`.
     - Trình duyệt upload trực tiếp lên Cloudinary CDN (`api.cloudinary.com`).
     - Backend lưu trữ metadata: `POST /api/media`.
   - Cơ chế Safe Deletion Check:
     - Kiểm tra toàn diện sách (`cover`), trang (`background`), phần tử trang (`IMAGE`/`VIDEO`/`DECORATION` data), và nhạc nền (`audio_tracks`).
     - Nếu đang sử dụng, chặn xóa và trả về danh sách chi tiết các references kèm mã lỗi `409 Conflict`.
     - Hỗ trợ cờ `?force=true` khi cần xóa cưỡng chế.
   - Loại bỏ dần sự phụ thuộc vào `cloudinaryUrls.json`:
     - Tự động nạp toàn bộ legacy media vào cơ sở dữ liệu qua seed script và endpoint `POST /api/media/sync-legacy`.
     - Nâng cấp `src/data/mediaConfig.ts` với Dynamic Registry và lookup API.
5. **Giai đoạn 5 (Đã hoàn thành - Dynamic Audio Track System & Background Music)**:
   - Mở rộng model `AudioTrack` trong PostgreSQL với đầy đủ các thuộc tính:
     - `title`, `artist`, `src`, `mediaId`, `volume` (0.0 - 1.0), `loop`, `startAt` (offset giây), `fadeIn` (thời lượng fade in giây), `fadeOut` (thời lượng fade out giây), `durationSeconds`, `autoPlay`.
   - `Book` chọn nhạc nền qua trường `backgroundMusicId` (`@relation("BookBackgroundMusic")`).
   - `Page` chuẩn bị sẵn trường `audioTrackId` (`@relation("PageAudioTrack")`) để gắn nhạc riêng cho từng chương / từng trang.
   - Frontend `VintageMusicPlayer` hoàn toàn tách biệt khỏi file hardcode `storyData.ts`:
     - Lấy toàn bộ thông số (`src`, `title`, `volume`, `fadeIn`, `fadeOut`, `startAt`) trực tiếp từ API `GET /public/books/:slug`.
     - Giữ nguyên cơ chế tương tác kích hoạt autoplay thông minh: tự động play khi lật trang hoặc phát ngay khi người dùng chạm/click lần đầu vào màn hình.
6. **Giai đoạn 6 (Đã hoàn thành - Dynamic Text Variables)**:
   - Xây dựng hệ thống phân giải biến động (`TextVariableResolver`) cho `TEXT` elements và captions:
     - Biến hỗ trợ cốt lõi: `{{couple.he}}`, `{{couple.she}}`, `{{anniversaryDate}}`, `{{daysTogether}}`, `{{currentDate}}`.
     - Ví dụ: `{{daysTogether}} NGÀY` tự động tính số ngày từ ngày kỷ niệm (20.10.2022) đến hôm nay (VD: `1432 NGÀY`).
   - Bảo mật & Độ tin cậy tuyệt đối:
     - **Hoàn toàn KHÔNG dùng `eval()`** - phân giải an toàn bằng Regex tokenization.
     - Kháng lỗi Prototype Pollution (chặn triệt để `__proto__`, `constructor`, `prototype`).
     - Không bao giờ làm sập renderer nếu biến không tồn tại (giữ nguyên token hoặc fallback mượt mà).
   - Mở rộng linh hoạt:
     - Hỗ trợ cú pháp Pipe Filter: `{{daysTogether | number}}`, `{{couple.he | uppercase}}`.
     - Hỗ trợ hàm `TextVariableResolver.registerVariable()` và `registerFilter()`.
7. **Giai đoạn 7 (Đã hoàn thành - Pre-Admin Architecture Stabilization & Security Freeze)**:
   - Chuẩn hóa `PageElement.zIndex` làm source of truth duy nhất, loại bỏ hoàn toàn `transform.zIndex`.
   - Chuẩn hóa Media Contract với canonical `mediaId`, phân giải URL động trong Public API compiler.
   - Sửa toàn diện phần tử Video: tách rời video source (`.mp4`) và ảnh poster thumbnail (`.jpg`).
   - Chuẩn hóa Video ActiveArea: chuyển đổi tọa độ tương đối bên trong element sang tọa độ toàn trang chính xác.
   - Tách physical leaf/face sequencing khỏi `pageNumber`, sử dụng hàm tập trung `derivePageSide(order)`.
   - Nạp đầy đủ slots và element prototypes thật vào bảng `LayoutTemplate` trong Database.
   - Tách Caption ảnh thành phần tử `TEXT` (`variant: 'caption'`) độc lập có thể kéo thả, đổi kiểu dáng.
   - Hoàn thiện Renderer: `objectFit` + `focalPoint` cho ảnh, `wrapText` tự động cho chữ, nền gradient/color/image.
   - Chuyển bìa trước và bìa sau sang mô hình generic `Page` + `PageElement[]`, đưa toàn bộ quy trình vẽ về cùng 1 renderer.
   - Centralized Cache Invalidation với `PublicCacheService.touchBook()` và ETag dựa trên `contentRevision`.
   - Bảo mật RBAC (`ADMIN`, `EDITOR`, `VIEWER`), bảo vệ toàn bộ mutation routes và endpoint lấy chữ ký Cloudinary.
   - Seed toàn diện đầy đủ 21 trang kèm elements vào PostgreSQL, decouple production fallback.
8. **Giai đoạn 8 (Đã hoàn thành - Prompt 14 Admin CMS Foundation)**:
   - Xây dựng hệ thống Admin CMS hoàn chỉnh bằng Next.js:
     - Màn hình Đăng nhập quản trị: `/admin/login`
     - Màn hình Quản lý Sách: `/admin/books`
     - Màn hình Cài đặt Sách: `/admin/books/[bookId]/settings` (General, Audio, Dimensions, Camera 3D, Theme Colors, Atmosphere, Covers)
     - Màn hình Quản lý Trang: `/admin/books/[bookId]/pages` (Reorder thứ tự vật lý, Duplicate, Xóa trang, Thêm trang mới)
     - Màn hình Chỉnh sửa Phần tử & Chi tiết Trang: `/admin/books/[bookId]/pages/[pageId]`
       - Form chỉnh sửa đầy đủ thuộc tính: `x`, `y`, `width`, `height`, `rotation`, `opacity`, `zIndex`, `text`, `font`, `color`, `media`, `interaction`
       - **Live Preview thời gian thực**: Sử dụng trực tiếp `PageTextureGenerator.renderPageToCanvas()` dùng chung với public frontend, cam kết **không duplicate renderer**
     - Màn hình Kho Bố Cục (Layout Templates): `/admin/layout-templates`
     - Màn hình Thư viện Media: `/admin/media` (Tải lên Cloudinary trực tiếp qua Signed Config, tra cứu liên kết, xóa an toàn)
     - Màn hình Kho Âm Thanh: `/admin/audio` (Nghe thử, điều chỉnh volume, loop, fade in, fade out, start at)
9. **Giai đoạn 9 (Prompt 15+ Visual Editor & Drag-and-Drop Canvas)**:
   - Tích hợp Visual Canvas Editor kéo thả trực quan (React Konva / Canvas Interactive Layer).
   - Lưu trữ cache texture bằng IndexedDB để người dùng mở sách lần thứ 2 không phải render lại Canvas từ đầu.
   - Di dời/xóa bỏ an toàn các file legacy trong `src/components/spreads` và `src/components/pages`.
