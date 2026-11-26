# HƯỚNG DẪN CHIA SẺ SERVER TỪ LAPTOP RA INTERNET QUA CLOUDFLARE TUNNEL

> **Giải pháp:** Cloudflare Quick Tunnel (Reverse Tunneling)  
> **Ưu điểm vượt trội:**  
> - 100% miễn phí, không cần thẻ tín dụng hay đăng ký tài khoản.  
> - Link HTTPS chính chủ Cloudflare (`https://xxxx.trycloudflare.com`), bảo mật SSL 256-bit.  
> - Không có màn hình hỏi mật khẩu IP như Localtunnel hay trang cảnh báo như ngrok.  
> - Giảng viên xem trực tiếp từ điện thoại, máy tính bảng hay laptop ở bất cứ đâu.

---

## 📌 1. NGUYÊN LÝ HOẠT ĐỘNG

```text
[ Giảng Viên Hướng Dẫn ] 
   (Dùng điện thoại 4G, Tablet, Laptop ở trường hoặc ở nhà)
            │
            ▼  (Truy cập qua HTTPS bảo mật Cloudflare)
[ Cloudflare Global Edge Network (*.trycloudflare.com) ]
            │
            ▼  (Đường hầm mã hóa Quick Tunnel qua cloudflared.exe)
[ Laptop Sinh Viên (Đang bật máy & cắm sạc) ]
   ├── Port 8000: FastAPI Backend + Frontend React SPA Bundle
   ├── Port 5434: PostgreSQL Database trên Docker Desktop (24 Bảng)
   └── Port 5678: n8n Workflow Automation Engine
```

---

## 🚀 2. CÁCH SỬ DỤNG SIÊU NHANH (1-CLICK)

File chạy binary `cloudflared.exe` đã được tải sẵn ngay tại thư mục gốc của dự án (`d:\Đồ Án tốt nghiệp\cloudflared.exe`).

### Các bước thực hiện:

1. **Bước 1**: Đảm bảo Backend Server đang chạy tại cổng `8000` (nhấp đúp `start-project.bat` chọn `[1]` hoặc chạy lệnh `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`).
2. **Bước 2**: Nhấp đúp vào file script [`chia-se-internet.bat`](../../chia-se-internet.bat).
3. **Bước 3**: Cửa sổ Cloudflare sẽ hiển thị đường link HTTPS công khai trong log, ví dụ:
   ```text
   2026-11-22T... INF +--------------------------------------------------------------------------------------------+
   2026-11-22T... INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
   2026-11-22T... INF |  https://happy-forest-coffee.trycloudflare.com                                          |
   2026-11-22T... INF +--------------------------------------------------------------------------------------------+
   ```
4. **Bước 4**: Copy đường link `https://xxxx.trycloudflare.com` gửi cho Giảng viên.

---

## ⚡ 3. NHỮNG LƯU Ý BẮT BUỘC KHI HOST TỪ LAPTOP

| Yếu tố | Hướng dẫn kiểm tra |
| :--- | :--- |
| **Nguồn điện** | Cắm sạc liên tục để laptop không tự động giảm xung nhịp CPU hoặc ngắt kết nối nền. |
| **Chống ngủ máy (Sleep)** | Vào Windows `Settings > System > Power & battery > Screen and sleep`, đặt **"When plugged in, put my device to sleep after"** thành **Never**. |
| **Kết nối mạng** | Đảm bảo laptop kết nối WiFi/dây mạng ổn định. Nếu đổi mạng WiFi, chỉ cần chạy lại `chia-se-internet.bat` để lấy link mới. |
| **Cơ sở dữ liệu** | Nếu dùng PostgreSQL trên Docker, hãy mở Docker Desktop trước khi chạy server. |

---

## 📩 4. MẪU TIN NHẮN GỬI GIẢNG VIÊN HƯỚNG DẪN

Bạn có thể copy đoạn tin nhắn mẫu dưới đây để gửi qua Zalo / Email cho Thầy/Cô:

```text
Dạ em chào Thầy/Cô ạ,

Nhóm sinh viên thực hiện đề tài Đồ án Tốt nghiệp: "Hệ thống Quản trị Doanh nghiệp SMB Yến sào & Cà phê tích hợp AI" xin phép báo cáo tiến độ tuần này đến Thầy/Cô ạ.

Hiện tại nhóm em đã hoàn tất:
1. Triển khai CSDL PostgreSQL chuẩn 24 bảng trên Docker Desktop.
2. Hoàn thiện luồng sản xuất khép kín: Hoạch định định mức BOM, phê duyệt xuất xưởng 2 bước và Quản lý kho.
3. Tích hợp Trợ lý AI Hybrid RAG (kết nối Google Gemini 1.5 Flash và bộ giải mã ngữ nghĩa tiếng Việt độc lập).
4. Thiết lập tầng Tự động hóa n8n Workflows đồng bộ dữ liệu Star Schema.

Hệ thống đang được host trực tiếp từ máy trạm của nhóm qua đường truyền Cloudflare HTTPS để Thầy/Cô tiện xem thử và đánh giá tiến độ thực tế ạ:

🔗 Cổng Bán Hàng Trực Tuyến (Storefront B2C/B2B):
https://<Dán_Link_Cloudflare_Của_Bạn>/store

🔐 Cổng Quản Trị Doanh Nghiệp (ERP Admin Dashboard):
https://<Dán_Link_Cloudflare_Của_Bạn>/login

⚡ Thông tin tài khoản kiểm thử nhanh (có sẵn nút chọn 1-chạm trực tiếp trên trang đăng nhập):
- Giám Đốc (Admin):       admin   / admin123   (Toàn quyền điều hành, xem BI & Doanh thu)
- Trưởng Kho:             kho     / kho123     (Duyệt xuất kho vật tư 2 bước)
- Quản Đốc Sản Xuất:      sanxuat / sanxuat123 (Lập lệnh sản xuất theo BOM)
- Ban Thu Mua:            thumua  / thumua123  (Nhập kho NVL theo giá thị trường)

Nhóm kính nhờ Thầy/Cô xem qua và cho chúng em xin thêm những ý kiến góp ý quý báu để đồ án được hoàn thiện tốt nhất ạ. Nhóm em xin chân thành cảm ơn Thầy/Cô ạ!
```
