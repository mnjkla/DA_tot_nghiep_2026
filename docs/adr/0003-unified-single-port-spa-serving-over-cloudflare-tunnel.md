# Unified Single-Port SPA Serving Phục Vụ Cloudflare Zero Trust Tunnel

FastAPI được cấu hình để phục vụ trực tiếp bản build Single Page Application (SPA) của frontend React từ thư mục `frontend/dist` trên cùng cổng 8000, thay vì chạy song song hai cổng riêng biệt (cổng 5173 cho frontend và cổng 8000 cho backend API), nhằm tối ưu hóa đường truyền qua Cloudflare Zero Trust Named Tunnel.

## Status
Accepted

## Considered Options
1. **Duy trì hai cổng riêng biệt với Reverse Proxy (Nginx) trung gian**: Đòi hỏi cài đặt thêm Nginx hoặc chạy 2 tunnel Cloudflare đồng thời, làm tăng độ phức tạp cấu hình trên máy tính Windows cục bộ và dễ phát sinh lỗi phân giải tên miền phụ.
2. **FastAPI kiêm nhiệm Static SPA Server trên cổng 8000**: API backend định tuyến tại `/api/*`, `/health`, `/webhook/*`, trong khi tất cả các định tuyến giao diện (`/`, `/store/*`, `/sales/*`, `/inventory/*`, `/production/*`) được ánh xạ về `frontend/dist/index.html`. Cloudflare Tunnel chỉ cần mở một ingress duy nhất trỏ về `http://127.0.0.1:8000`.

## Consequences
- Triệt tiêu hoàn toàn vấn đề Cross-Origin Resource Sharing (CORS) trên môi trường internet công cộng.
- Đơn giản hóa kịch bản triển khai chỉ với một lệnh khởi động backend và một lệnh chạy Cloudflare Tunnel (`cloudflared tunnel run --token ...`).
- Tránh được sự phụ thuộc vào cấu hình router/NAT phức tạp của mạng nội bộ và nhà mạng viễn thông.

