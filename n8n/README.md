# Hướng Dẫn Vận Hành & Demo n8n Automation Engine (Version 1.5.0)

Thư mục này chứa 3 Workflows tự động hóa cốt lõi của hệ thống **ERP & BI Yến Sào Tinh Hoa Việt**:

1. **`01_etl_star_schema.json`**: Luồng ETL trực quan trích xuất dữ liệu từ OLTP (`public.*`), phân bổ công nợ theo `Line Ratio`, gán nhãn mùa vụ Tết (`TET_SEASON`) và nạp sang Data Warehouse (`dw.*`).
2. **`02_ai_tool_calling.json`**: Luồng Webhook `/webhook/ai-tool` đóng vai trò Tool Server cho Trợ lý AI Copilot truy vấn tồn kho NVL, doanh thu và định mức BOM.
3. **`03_event_driven_alerts.json`**: Luồng Webhook `/webhook/system-alert` tiếp nhận sự kiện thời gian thực từ FastAPI (Đơn hàng mới, Cảnh báo tồn kho NVL dưới ngưỡng an toàn, Phê duyệt xuất kho sản xuất) và đẩy thông báo vào `system_notifications`.

## Cách Khởi Chạy Tự Động Bằng Docker Compose
```bash
docker compose up -d
```
Container `erp_n8n` tự động gắn volume `./n8n/workflows:/backup/workflows` tại cổng `http://localhost:5678`.

## Cơ Chế Hybrid Offline-Safe
Trong trường hợp thuyết trình trên máy cá nhân không bật Docker n8n, **FastAPI Webhook Dispatcher** (`backend/main.py`) sẽ tự động chuyển sang chế độ **Local Fallback Execution**, thực thi trọn vẹn logic ETL / Cảnh báo và ghi nhận đầy đủ vào bảng `n8n_execution_logs` trên giao diện Web.

