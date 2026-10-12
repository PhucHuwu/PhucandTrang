# Kế hoạch responsive CMS: tablet-first

## Phạm vi và bằng chứng

Ưu tiên tablet sử dụng cảm ứng ở cả chiều dọc và ngang; giữ đầy đủ chức năng trên điện thoại và desktop. Giữ màu sắc, typography và cấu trúc nội dung hiện có, không thiết kế lại thương hiệu.

Phân tích dựa trên mã nguồn hiện tại và `docs/cms-responsive-audit.md`. Chưa có ảnh chụp trình duyệt hoặc kiểm chứng trên tablet thực. Các ngưỡng chiều rộng bên dưới là đề xuất ban đầu, phải hiệu chỉnh bằng kiểm tra trình duyệt. Tài liệu này không thay đổi runtime.

## Vấn đề cần giải quyết

| Ưu tiên | Vấn đề | Dẫn chứng |
| --- | --- | --- |
| P0 | Sidebar 256px luôn hiện; content không có `min-w-0` | `apps/web/src/app/admin/layout.tsx:26-30`, `apps/web/src/components/admin/AdminSidebar.tsx` |
| P0 | Editor và preview chiếm viewport lần thứ hai bên trong shell | Page Editor `h-[100dvh]`, Cover Studio `h-screen`, Preview `w-screen h-screen` |
| P0 | Cover Studio giữ các panel desktop; Page Editor dùng breakpoint viewport thay vì workspace | `apps/web/src/app/admin/cover/page.tsx`, `apps/web/src/app/admin/pages/[pageId]/page.tsx:720,843` |
| P1 | Header hiện nhãn hành động từ `sm`, thêm thông tin user từ `md` đúng lúc tablet thiếu chỗ | `apps/web/src/components/admin/AdminHeader.tsx:12-65` |
| P1 | Grid Media có 4 cột từ 768px, 6 cột từ 1024px dù sidebar đang lấy 256px | `apps/web/src/app/admin/media/page.tsx:258` |
| P1 | Layout Templates chia 7/5 cột từ 1024px rồi chia đôi danh sách; card bị thu hẹp nhiều tầng | `apps/web/src/app/admin/layout-templates/page.tsx:192-194` |
| P1 | Layers dựa vào HTML drag/drop và có thao tác chỉ lộ khi hover | `apps/web/src/components/admin/LayersPanel.tsx:254-256,326,341,385` |
| P1 | Canvas có onTap nhưng resize handle chỉ 8 đơn vị; cần đo kích thước thực sau scale | `apps/web/src/components/admin/KonvaPageCanvas.tsx:212,769-789` |
| P1 | ResizeObserver luôn đặt lại zoom khi vùng canvas thay đổi | `apps/web/src/app/admin/pages/[pageId]/page.tsx:112-125` |
| P1 | Modal thiếu chính sách chiều cao/cuộn thống nhất; history mất detail/rollback trên phone | `SaveAsLayoutModal.tsx`, `AdvancedVideoEditor.tsx`, `VersionHistoryModal.tsx` |

Ví dụ chiều rộng, chưa trừ padding: tablet dọc 768px chỉ còn 512px sau sidebar; mở inspector 320px còn 192px cho canvas. Viewport 1280px bật hai panel editor 256px + 320px bên cạnh sidebar thì canvas còn 448px. Không thể giải quyết chỉ bằng giảm font hoặc thêm `overflow-hidden`.

## Kiến trúc bố cục đề xuất

### Shell chung

- Dưới 1200px viewport: navigation mở bằng nút có nhãn “Menu”; drawer phủ nội dung, không trừ cố định 256px. Đóng sau điều hướng, Escape, chạm backdrop; quản lý focus và khóa cuộn nền.
- Từ 1200px: sidebar có thể hiện cố định và có nút thu gọn. Editor cho phép thu gọn navigation để ưu tiên canvas.
- Shell là chủ thể duy nhất dùng chiều cao `100dvh`; flex children có `min-w-0`, `min-h-0`.
- Trang danh sách/form cuộn ở main; editor cuộn riêng canvas/panel, không tạo hai vùng cuộn toàn trang.
- Preview bỏ shell sidebar/header nhưng giữ auth và JournalProvider. Login tiếp tục độc lập.
- Header giữ hành động chính, chuyển thông tin phụ và hành động phụ vào menu thật khi thiếu chỗ. Không xóa khả năng truy cập Preview, public site, logout.

### Editor dùng chung cho Pages và Cover

Đặt container query trên workspace, không suy ra không gian editor từ viewport. Dùng một `EditorWorkspace` chung để Page và Cover không có hai bộ breakpoint khác nhau.

| Chiều rộng workspace khả dụng | Trạng thái đề xuất |
| --- | --- |
| Dưới 900px | Canvas là vùng chính; Layers/Inspector mở dạng panel phủ có nút đóng, không ép canvas còn vài trăm px. Khi form cần bàn phím, panel có cuộn và vị trí focus rõ ràng. |
| 900-1199px | Canvas + một panel 280-320px có thể đóng; chuyển giữa Layers/Inspector tại cùng vị trí. |
| Từ 1200px | Cho phép ba cột nếu canvas vẫn còn ít nhất khoảng 600px; nếu không đủ thì quay về một panel. |

- Giữ Save và trạng thái autosave dễ thấy; nhóm thêm phần tử, lịch sử, template và công cụ phụ được gom lại có chủ đích, không wrap toolbar thành nhiều hàng tùy ý.
- Canvas có hai chế độ rõ ràng: “Vừa vùng làm việc” tự fit khi resize; “Zoom thủ công” giữ mức zoom khi mở panel. Xoay màn hình không đổi dữ liệu transform.
- Chọn, di chuyển, resize, xoay, bỏ chọn hoạt động bằng touch. Tăng hit area handle theo kích thước màn hình thực, không chỉ tăng giá trị trong canvas đã scale.
- Layers có nút di chuyển lên/xuống và menu hành động luôn truy cập được bằng tap/keyboard. Touch drag là nâng cấp sau; không cần đợi drag hoàn chỉnh mới có reorder sử dụng được.
- Không thay đổi tọa độ normalized, quy tắc giữ tỷ lệ ảnh, autosave/history hoặc contract API.

### Danh sách, form và modal

- Grid dựa vào chiều rộng container và độ rộng tối thiểu card; kiểm chứng số cột thay vì đặt 6 cột ở viewport tablet ngang.
- Pages: giữ table với cuộn ngang nội bộ trên tablet khi phù hợp; đặt tiêu đề và hành động quan trọng trong vùng dễ truy cập. Chỉ thêm card view nếu table không đáp ứng thao tác thực tế.
- Settings: chia nhóm theo nội dung; form hai cột chỉ khi từng trường đủ rộng. Playlist cho title/artist wrap và nhóm reorder/delete riêng.
- Versions/Layout Templates: hai vùng list/detail chỉ khi đủ chỗ; ở chiều dọc dùng chuyển list/detail có nút quay lại. Không ẩn chức năng detail/rollback.
- Dashboard/Audio: grid co giãn; heading/actions xuống hàng có kiểm soát; tên dài không đẩy nút ra ngoài.
- Modal dùng một khung chung: chiều rộng theo available space, max-height theo `dvh`, header/footer không mất, body cuộn. Escape, focus trap, restore focus và safe-area thống nhất.
- Media picker/upload và các form phải dùng được khi bàn phím ảo mở. Input không ép zoom ngoài ý muốn trên iPad; kiểm tra cỡ chữ thực tế và focus scrolling.
- Mục tiêu vùng chạm 44x44 CSS px; áp dụng theo component, không dùng selector toàn cục làm phình mọi nút.

## Các đợt triển khai

### 1. Baseline và shell (P0)

Chụp từng route ở tablet dọc/ngang trước sửa; ghi overflow, vùng bị che và thao tác không truy cập được. Thêm navigation drawer/collapse, sửa flex sizing, phân loại content/editor/fullscreen preview. Kiểm tra shell trước khi thay grid các trang.

Đầu ra: mọi route sử dụng đúng vùng nội dung, menu/preview/logout dùng được; không có overflow toàn trang do shell.

### 2. Page Editor và Cover Studio (P0)

Tạo workspace/panel/toolbar dùng chung; chuyển cả hai editor sang states theo container; sửa height và fit/manual zoom. Đảm bảo chuyển panel không mất selected element, draft, lịch sử hoặc trạng thái lưu.

Đầu ra: tablet dọc không bị ép ba cột; tablet ngang hiển thị canvas + panel khi đủ chỗ; Save luôn truy cập được.

### 3. Touch và dialog (P1)

Sửa Layers hover/reorder; hit area transformer, xung đột drag/scroll; thống nhất modal. Chạy kiểm tra MediaPicker, LayoutPicker, SaveAsLayout, History, PublishValidation, video preview và xác nhận rollback.

Đầu ra: không có chức năng chỉ dùng được bằng chuột; không có nút xác nhận bị che khi xoay hoặc mở bàn phím.

### 4. Các màn hình còn lại (P1)

Thứ tự: Media → Pages list → Settings → Layout Templates → Versions → Audio → Dashboard → Login. Chỉnh grid/header/form theo component chung và actual container width.

Đầu ra: title dài, danh sách lớn và trạng thái empty/loading/error vẫn giữ bố cục; touch actions và cuối form đều truy cập được.

### 5. Regression và nghiệm thu (bắt buộc)

- Thêm browser tests cho shell, drawer, panel state, overflow và các luồng CMS chính. Repo hiện chưa tìm thấy Playwright config; cần thiết lập nếu chưa có công cụ tương đương.
- Chromium touch emulation + WebKit để kiểm tra bước đầu; Safari trên iPad thực cho bàn phím, dynamic viewport và touch. Emulation không thay thế kiểm tra máy thực.
- Build/typecheck, unit tests liên quan và `git diff --check`; chia commit theo đợt, không gộp với sửa performance sách 3D.

## Ma trận kiểm chứng

Tablet chính: 768x1024 / 1024x768; 820x1180 / 1180x820; 834x1194 / 1194x834. Tablet lớn: 1024x1366 / 1366x1024. Split view và màn hình hẹp: 600-900px, kéo resize liên tục qua các ngưỡng. Regression: phone 375x812 và desktop 1440x900. Đây là kích thước viewport mục tiêu, không cam kết giống mọi thiết bị vật lý.

Kiểm tra cả thao tác touch, keyboard và mouse, kể cả tablet lớn có viewport desktop. Pointer capability quyết định hit target/hover behavior, không chỉ viewport width.

## Tiêu chí chấp nhận

1. Không có horizontal overflow toàn document hoặc control bị clip; table/canvas zoom chỉ cuộn trong vùng của mình.
2. Xoay dọc/ngang hoặc resize không mất draft, selection, modal state hoặc zoom thủ công.
3. Menu, logout, Save, Preview, Publish và rollback truy cập được ở mọi trạng thái layout.
4. Chọn ảnh → chỉnh phần tử → autosave/manual save → reload → Preview giữ nội dung và tỷ lệ ảnh; Publish được kiểm thử trên journal thử nghiệm, không tự publish dữ liệu thật.
5. Modal vẫn đóng/xác nhận được khi mở bàn phím; focus không lọt ra nền hoặc bị header che.
6. Layer reorder/duplicate/delete và canvas select/move/resize/rotate có đường thao tác bằng touch.
7. Mỗi route có bằng chứng ảnh chụp và kết quả thao tác ở tablet dọc/ngang; ghi rõ thiết bị hoặc browser, không coi build pass là responsive pass.

## Ranh giới triển khai

Chỉ thay layout và cách truy cập thao tác, không tự đổi API/schema, dữ liệu đã publish, layout tọa độ hoặc nhạc. Chưa sửa runtime trong bước lên kế hoạch này. Bắt đầu đợt 1 sau khi kế hoạch được duyệt; sau mỗi đợt kiểm chứng trước khi mở rộng phạm vi.
