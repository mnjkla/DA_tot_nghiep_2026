# Quy Trình Lĩnh Vật Tư Sản Xuất Hai Bước (Two-Step Material Requisition Approval)

Thay vì tự động trừ kho nguyên vật liệu ngay khi Lệnh sản xuất (Production Order) được khởi tạo, hệ thống bắt buộc quy trình hai bước: tạo Phiếu lĩnh vật tư ở trạng thái chờ duyệt (PENDING), và chỉ Thủ kho (WAREHOUSE_MANAGER) mới có thẩm quyền kiểm tra tồn kho thực tế, ký duyệt (APPROVED) để trừ kho và xuất hàng vào phân xưởng.

## Status
Accepted

## Considered Options
1. **Trừ kho tự động theo định mức BOM khi tạo Lệnh sản xuất**: Đơn giản về mã nguồn nhưng không phản ánh đúng thực tế xưởng sản xuất yến và cà phê, nơi nguyên vật liệu thực tế có thể bị thiếu hụt, ẩm mốc, hoặc lô vật tư đã hết hạn trước khi kịp đưa vào máy trộn/nấu.
2. **Quy trình phê duyệt hai bước có phân quyền chặt chẽ**: Lệnh sản xuất tính toán lượng vật tư cần theo định mức BOM và phát sinh bản ghi `material_requisitions`. Thủ kho kiểm tra lô vật tư thực tế tại kho rồi bấm duyệt để ghi nhận giao dịch `material_transactions` và cập nhật trừ `current_qty` trong `materials` và `material_lots`.

## Consequences
- Ngăn chặn hoàn toàn hiện tượng lệch tồn kho ảo giữa hệ thống phần mềm và kho vật lý.
- Đảm bảo tính minh bạch trách nhiệm: Nhân viên sản xuất chỉ có quyền đề xuất nhu cầu, Thủ kho chịu trách nhiệm về số lượng vật tư thực xuất giao.

