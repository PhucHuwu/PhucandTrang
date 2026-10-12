# Responsive CMS: trạng thái triển khai

## Đã triển khai

- Shell dùng một dynamic viewport, content có min-width/min-height; navigation drawer dưới 1200px, sidebar desktop đóng/mở được.
- Preview không còn nằm trong shell sidebar/header; vẫn giữ providers xác thực/journal.
- Page và Cover dùng chung EditorWorkspace: panel phủ dưới 900px workspace, một panel cạnh canvas từ 900px, ba cột từ 1200px.
- Hook canvas viewport dùng chung: auto-fit theo vùng làm việc; zoom thủ công không bị ResizeObserver đặt lại.
- Page toolbar gom công cụ phụ vào disclosure, giữ save/status và hành động xuất bản truy cập được.
- Layers hiện các nút thao tác không cần hover, hàng wrap, chọn layer bằng keyboard; các nút reorder hiện có tiếp tục là đường thay thế drag/drop.
- Canvas tăng vùng chạm transformer theo scale, canvas zoom cuộn với safe alignment.
- Media grid và Layout Templates dựa vào vùng nội dung; Settings header/playlist wrap và nhóm form dùng min card width; Dashboard giảm padding; Login dùng dvh.
- Modal Media/Layout/SaveAsLayout/Publish/History/Video có dynamic max-height và focus/Escape dùng chung. History detail không còn ẩn trên phone.
- Thêm Playwright và script `npm run test:responsive --workspace=@phucandtrang/web`.

## Bằng chứng hiện có

- Build web/typecheck thành công.
- 11 browser tests Chromium đạt với API giả lập, không gọi backend thật.
- 9 route được kiểm tra menu mở/đóng, editor panel mở/đóng và document overflow ở 768x1024, 1024x768, 820x1180, 1180x820, 834x1194, 1194x834, 600x900, 375x812.
- Test sửa text có sẵn và xóa rỗng; test disclosure công cụ/mở SaveAsLayout/đóng Escape; test resize dọc/ngang giữ nội dung và panel.
- Screenshot được lưu trong `apps/web/test-results` (gitignored); đã kiểm tra screenshot Page và Cover ở tablet. Dữ liệu bìa giả lập không chứng minh renderer bìa thật đạt.

## Chưa nghiệm thu đầy đủ

- Safari/WebKit và iPad thực, bàn phím ảo, split view thực.
- Publish/rollback, upload/save/reload/Preview trên backend thử nghiệm; tests hiện tại không chứng minh persistence.
- Touch drag/resize/rotate thực, manual zoom khi xoay và mọi trường hợp modal focus/scroll nền.
- Dữ liệu dài/lớn, trạng thái error của mọi route, preview 3D và desktop 3-column đầy đủ.
- Chính sách panel overlay hiện không phải modal focus trap; không công bố accessibility pass toàn CMS.
- Chưa tách toàn bộ touch sizing thành primitive component; hiện dùng CSS scoped CMS cho coarse pointer, cần tiếp tục rà soát trường hợp control bị phình.

Đây là bản triển khai nền tảng đã có browser regression, chưa phải xác nhận hoàn tất toàn bộ ma trận nghiệm thu trong kế hoạch. Chưa commit/push.
