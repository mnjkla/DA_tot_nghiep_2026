# Hybrid Database Engine: SQLite WAL for Portability and PostgreSQL for Enterprise Concurrency

Hệ thống ERP hỗ trợ song song hai cơ chế lưu trữ: PostgreSQL cho môi trường sản xuất đa người dùng với khối lượng giao dịch lớn, và SQLite cấu hình chế độ WAL (Write-Ahead Logging) kèm busy timeout để phục vụ môi trường chạy thử nghiệm, bảo vệ đồ án tốt nghiệp và môi trường đóng gói container độc lập không cần cài đặt dịch vụ database riêng biệt.

## Status
Accepted

## Considered Options
1. **Chỉ dùng PostgreSQL thuần túy**: Đảm bảo toàn vẹn dữ liệu doanh nghiệp và hỗ trợ đồng thời cao, nhưng gây rào cản lớn khi chấm thi hoặc triển khai demo nhanh trên máy tính cá nhân của hội đồng phản biện do yêu cầu cấu hình service PostgreSQL, quyền user và port networking.
2. **Chỉ dùng SQLite thông thường**: Cực kỳ gọn nhẹ và di động nhưng dễ gặp lỗi khóa cơ sở dữ liệu `database is locked` khi có nhiều yêu cầu đồng thời từ Storefront, ERP dashboard và tiến trình ETL nền.
3. **Cơ chế Hybrid Database (PostgreSQL + SQLite WAL)**: Tự động nhận diện biến môi trường `DATABASE_URL` để kết nối PostgreSQL nếu có; nếu không, tự động chuyển sang `erp.db` với `PRAGMA journal_mode=WAL`, `PRAGMA busy_timeout=5000` và `PRAGMA synchronous=NORMAL`.

## Consequences
- Hệ thống đạt thông lượng hơn 620 RPS với 100% tỷ lệ thành công trong các bài kiểm tra tải đồng thời trên SQLite WAL.
- Toàn bộ cú pháp DDL và DML được chuẩn hóa tuân thủ ANSI SQL để hoạt động trơn tru trên cả hai hệ quản trị cơ sở dữ liệu mà không cần tầng ORM nặng nề.

