# Tự Động Hóa Quy Trình Bằng n8n Webhook Kèm Ghi Nhận Lịch Sử Cục Bộ (Local Audit Logs)

Hệ thống ERP phân tách các nghiệp vụ tự động hóa chạy ngầm (chuyển đổi dữ liệu Star Schema Data Warehouse, cảnh báo ngưỡng tồn kho an toàn, kích hoạt gửi thông báo qua chuông) sang n8n qua giao thức Webhook bất đồng bộ, đồng thời lưu vết toàn bộ nhật ký phản hồi vào bảng `n8n_execution_logs` trong cơ sở dữ liệu lõi.

## Status
Accepted

## Considered Options
1. **Viết toàn bộ kịch bản tự động hóa bằng Cron Job cứng trong Python/Celery**: Giảm bớt số lượng dịch vụ bên ngoài, nhưng khiến logic nghiệp vụ phân tán, người quản trị không trực quan hóa được quy trình luồng dữ liệu (Visual Workflow) và khó tích hợp thêm kênh truyền thông (Telegram, Zalo ZNS, Email marketing) sau này.
2. **Ủy quyền toàn bộ cho n8n mà không có cơ chế dự phòng**: Nếu dịch vụ n8n gặp sự cố hoặc người dùng chạy bản demo không cài n8n, các chức năng phụ thuộc sẽ bị treo hoặc báo lỗi hệ thống.
3. **Mô hình Hybrid Webhook với Local Fallback & Audit Trail**: ERP phát sự kiện qua webhook tới n8n. Nếu webhook thành công hoặc phản hồi, ghi nhận chi tiết thời gian phản hồi (ms) vào `n8n_execution_logs`. Nếu n8n không phản hồi, ERP tự động kích hoạt tiến trình xử lý nội bộ tương đương để đảm bảo dữ liệu luôn được đồng bộ.

## Consequences
- Giao diện ERP cung cấp bảng điều khiển trực quan theo dõi nhật ký thực thi thời gian thực của n8n, hỗ trợ người vận hành dễ dàng phát hiện điểm nghẽn trong chuỗi cung ứng.
- Đảm bảo tính độc lập cao giữa tầng ứng dụng nghiệp vụ lõi (Core ERP) và tầng tích hợp tự động hóa (Integration Layer).

