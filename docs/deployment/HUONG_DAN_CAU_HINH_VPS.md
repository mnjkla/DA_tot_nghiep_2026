# HƯỚNG DẪN CẤU HÌNH VPS TRIỂN KHAI HỆ THỐNG ERP YẾN SÀO & CÀ PHÊ (24/7 STABLE DEPLOYMENT)

Tài liệu này cung cấp toàn bộ quy trình thiết lập máy chủ ảo (VPS - Virtual Private Server) để vận hành hệ thống **Quản trị Doanh nghiệp Sản xuất Yến Sào & Cà Phê Đặc Sản** đạt độ ổn định tối đa, tự phục hồi khi có sự cố và bảo mật dữ liệu.

---

## 🖥️ 1. Yêu Cầu Phần Cứng & Hệ Điều Hành

| Tiêu chí | Cấu hình Tối thiểu (Budget) | Cấu hình Khuyến nghị (Production) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU | 2 - 4 vCPU |
| **RAM** | 2 GB (+ 4GB SWAP bắt buộc) | 4 GB - 8 GB (+ 4GB SWAP) |
| **Ổ cứng** | 25 GB SSD / NVMe | 40 GB - 50 GB NVMe |
| **Hệ điều hành** | **Ubuntu 22.04 LTS** hoặc **Ubuntu 24.04 LTS** (Khuyên dùng) | Ubuntu 22.04 / 24.04 LTS |
| **Băng thông** | 100 Mbps - 1 Gbps | 1 Gbps không giới hạn |

> [!IMPORTANT]
> **Bộ nhớ SWAP 4GB là bắt buộc** đối với các gói VPS 2GB RAM. Quá trình biên dịch Frontend React (`npm run build`) và tiến trình nền n8n có thể chiếm 1.5GB RAM đỉnh điểm; nếu không có SWAP, nhân Linux sẽ kích hoạt cơ chế `OOM-Killer` (Out Of Memory) làm tắt đột ngột backend hoặc cơ sở dữ liệu.

---

## 🏛️ 2. Kiến Trúc Vận Hành Trên VPS

```
                              INTERNET (Khách hàng & Cán bộ nhân viên)
                                                 │
                                                 ▼ (Port 80 / 443)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VPS Ubuntu (Máy chủ đám mây)                                                    │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ Nginx Reverse Proxy (Cổng 80/443 - Gzip nén trang, SSL HTTPS, Bảo vệ)   │   │
│   └───────────────────────┬───────────────────────────────┬─────────────────┘   │
│                           │                               │                     │
│             (Port 8000)   ▼                               ▼  (Port 5678)        │
│   ┌─────────────────────────────────────────┐   ┌───────────────────────────┐   │
│   │ Backend FastAPI (Uvicorn 2 Workers)     │   │ n8n Automation Engine     │   │
│   │  • Phục vụ REST API (/api/*)            │   │  • Webhooks tự động hóa   │   │
│   │  • Phục vụ Single Page App (/store)     │   │  • ETL chuyển đổi DW      │   │
│   │  • Trợ lý AI Hybrid RAG Gemini          │   │  • Tool calling AI        │   │
│   └───────────────────────┬─────────────────┘   └───────────────────────────┘   │
│                           │                                                     │
│             (Port 5432)   ▼                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ PostgreSQL 15 Container (enterprise_erp - 24 Bảng Chuẩn Nghiệp Vụ)      │   │
│   │ (Đóng cổng với bên ngoài, chỉ cho phép mạng nội bộ Docker truy cập)     │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 3. Hướng Dẫn Cài Đặt 1-Chạm (Khuyên Dùng)

Trên máy chủ VPS mới tạo, bạn chỉ cần thực hiện 3 lệnh sau:

### Bước 1: Kết nối vào VPS qua SSH
```bash
ssh root@<IP_VPS_CUA_BAN>
```

### Bước 2: Kéo mã nguồn dự án từ GitHub
```bash
git clone https://github.com/mnjkla/DA_tot_nghiep_2026.git erp_project
cd erp_project
```

### Bước 3: Cấp quyền và chạy kịch bản tự động `deploy-vps.sh`
```bash
chmod +x deploy-vps.sh
sudo bash deploy-vps.sh
```

**Script `deploy-vps.sh` sẽ tự động thực hiện từ A đến Z:**
1. ✅ Tự động tạo và kích hoạt **4GB SWAP** kèm tinh chỉnh `swappiness=15` chống tràn RAM.
2. ✅ Tự động cài đặt **Docker Engine & Docker Compose Plugin** chính thức.
3. ✅ Thiết lập **Tường lửa UFW**: Mở cổng 22 (SSH), 80 (HTTP), 443 (HTTPS); **Chặn triệt để cổng 5432 PostgreSQL** khỏi sự dò quét của hacker trên internet.
4. ✅ Khởi tạo file cấu hình `.env` cho môi trường sản xuất.
5. ✅ Build bản đóng gói Multi-stage Docker và khởi chạy cả 4 containers: `postgres`, `backend`, `n8n`, `nginx`.
6. ✅ Tự động kích hoạt cơ chế kiểm tra sức khỏe (`healthcheck`) sau mỗi 20 giây.

---

## 🔒 4. Cấu Hình Tên Miền & Chứng Chỉ SSL HTTPS (Miễn Phí)

Nếu bạn có tên miền riêng (ví dụ: `yencaphe.vn` hoặc `erp.yencaphe.vn`), hãy trỏ bản ghi **A record** của tên miền về `<IP_VPS_CUA_BAN>`.

Sau đó, cấp chứng chỉ SSL miễn phí tự động gia hạn bằng Certbot:

```bash
# 1. Cài đặt Certbot trên máy chủ VPS
sudo apt update
sudo apt install -y certbot

# 2. Tạm dừng Nginx container để Certbot xác thực cổng 80
docker stop erp_nginx_proxy

# 3. Xin chứng chỉ SSL Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 4. Khởi động lại Nginx
docker start erp_nginx_proxy
```

---

## 🛠️ 5. Các Lệnh Vận Hành & Giám Sát Cần Thiết

### 1. Xem trạng thái các container đang chạy
```bash
docker compose -f docker-compose.prod.yml ps
```

### 2. Xem nhật ký hoạt động thời gian thực (Logs)
```bash
# Xem log toàn bộ hệ thống
docker compose -f docker-compose.prod.yml logs -f

# Xem riêng log backend API & AI Chatbot
docker compose -f docker-compose.prod.yml logs -f backend

# Xem riêng log n8n
docker compose -f docker-compose.prod.yml logs -f n8n
```

### 3. Giám sát mức tiêu thụ tài nguyên (CPU / RAM)
```bash
docker stats
```
*(Lệnh này giúp bạn xem trực quan mỗi container đang tốn bao nhiêu MB RAM và % CPU).*

### 4. Sao lưu CSDL PostgreSQL (Backup)
```bash
# Xuất bản backup ra file SQL nén
docker exec -t erp_postgres_db pg_dump -U erp_user enterprise_erp | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 5. Phục hồi CSDL từ bản sao lưu (Restore)
```bash
gunzip < backup_20261116.sql.gz | docker exec -i erp_postgres_db psql -U erp_user -d enterprise_erp
```

### 6. Cập nhật code mới nhất từ Git
Khi có thay đổi mã nguồn mới đẩy lên GitHub, bạn chỉ cần gõ:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```
Hệ thống sẽ tự động build lại phiên bản mới mà **không làm mất dữ liệu CSDL** (dữ liệu được lưu an toàn trong Docker Volume `pg_erp_data`).

---

## 🛡️ 6. 4 Bí Quyết Giúp VPS Hoạt Động Ổn Định 24/7

1. **Giới hạn dung lượng Log của Docker (`max-size: 10m`):**
   Trong `docker-compose.prod.yml`, tất cả các dịch vụ đều được cài đặt giới hạn log tối đa 10MB và lưu 3 files quay vòng. Điều này đảm bảo VPS chạy hàng năm trời không bao giờ bị lỗi tràn ổ cứng (Disk Full 100%).
2. **Khởi động lại tự động khi VPS reboot (`restart: unless-stopped`):**
   Nếu nhà cung cấp VPS bảo trì hoặc máy chủ khởi động lại, toàn bộ ứng dụng và database sẽ tự động bật lại trong vòng 30 giây mà không cần người quản trị can thiệp.
3. **Cơ chế Healthcheck tự phục hồi:**
   Container backend được cấu hình curl kiểm tra `/api/health` định kỳ 20 giây. Nếu ứng dụng bị deadlock, Docker sẽ tự động nhận diện và restart lại container backend.
4. **Bảo mật cơ sở dữ liệu:**
   Cơ sở dữ liệu PostgreSQL chỉ nằm trong mạng ảo nội bộ của Docker (`erp_internal_network`), ngăn chặn 100% các cuộc tấn công Brute-force mật khẩu database từ internet.
