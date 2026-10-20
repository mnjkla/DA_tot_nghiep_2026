# 📖 HƯỚNG DẪN TRIỂN KHAI CƠ SỞ DỮ LIỆU & DATA WAREHOUSE (CHO TEAM MEMBER)

> Tài liệu hướng dẫn chi tiết từng bước dành cho thành viên trong nhóm khi kéo code từ Git về máy cá nhân để khởi tạo toàn bộ hệ thống Database (OLTP 19 bảng) và Data Warehouse (Star Schema 6 bảng) phục vụ AI Text-to-SQL và Dashboard.

---

## 🛠️ YÊU CẦU MÔI TRƯỜNG TRƯỚC KHI CHẠY

Đảm bảo máy của bạn đã cài đặt:
1. **Git**
2. **Docker Desktop** (Đang mở và chạy ngầm)
3. **Python 3.10+** (Kèm `pip`)

---

## 🚀 QUY TRÌNH THỰC HIỆN TỪNG BƯỚC

### BƯỚC 1: Kéo Code mới nhất về máy

Mở Terminal / PowerShell tại thư mục dự án và chạy:

```bash
# Kiểm tra nhánh hiện tại
git branch

# Kéo code mới nhất từ nhánh bao17 (hoặc main)
git checkout bao17
git pull origin bao17
```

---

### BƯỚC 2: Cài đặt thư viện Python cần thiết

Cài đặt các dependencies để chạy script sinh dữ liệu và ETL:

```bash
pip install pandas numpy sqlalchemy psycopg2-binary
```

---

### BƯỚC 3: Khởi động Docker Container (PostgreSQL)

Khởi động container PostgreSQL từ file `docker-compose.yml`:

```bash
docker-compose up -d
```

> **Lưu ý:**
> Container có tên **`erp_postgres_db`** chạy ở cổng **`5432`**.
> Khi container khởi động lần đầu, Docker sẽ tự động nạp cấu trúc 19 bảng từ `database/schema.sql` và dữ liệu mẫu từ `database/seed.sql`.

*Kiểm tra container đã chạy thành công chưa:*
```bash
docker ps
```
*(Nếu thấy `erp_postgres_db` hiển thị trạng thái `Up ... (healthy)` hoặc `0.0.0.0:5432->5432/tcp` là thành công).*

---

### BƯỚC 4: Sinh bộ dữ liệu ERP thực tế (2024 - 2025)

Chạy script mô phỏng dữ liệu 2 năm cho 5 dòng sản phẩm (Yến lọ, Yến chai, Yến lon, Cháo yến, Cà phê phin giấy):

```bash
python generate_erp_dataset.py
```

* **Kết quả:** Script sẽ sinh ra 19 file `.csv` chứa gần 65.000 dòng dữ liệu vào thư mục `erp_dataset_csv/`.

---

### BƯỚC 5: Nạp 19 file CSV vào PostgreSQL (Schema `public` - OLTP)

Chạy script nạp tự động toàn bộ 19 file CSV vào database PostgreSQL theo đúng ràng buộc khóa ngoại:

```bash
python load_csv_to_postgres.py
```

* **Kết quả:** Toàn bộ 19 bảng trong schema `public` sẽ được nạp đầy đủ dữ liệu (6.617 đơn hàng, 13.306 dòng chi tiết, 688 lệnh sản xuất, v.v.).

---

### BƯỚC 6: Chạy Pipeline ETL tạo Data Warehouse (Schema `dw`)

Chạy pipeline chuyển đổi dữ liệu từ 19 bảng OLTP sang mô hình hình sao (Star Schema) cho Data Warehouse:

```bash
python backend/etl_pipeline.py
```

* **Kết quả:** Tạo schema **`dw`** với 6 bảng tối ưu tốc độ:
  - `dw.dim_date`: Trục thời gian 2 năm có gắn cờ mùa Tết (`TET_SEASON`).
  - `dw.dim_product`: Danh mục 5 sản phẩm cốt lõi.
  - `dw.dim_customer`: Danh mục 120 khách hàng.
  - `dw.fact_sales`: Doanh thu, giá vốn, lợi nhuận gộp, chiết khấu và công nợ.
  - `dw.fact_production`: Hiệu suất sản xuất, tỷ lệ lỗi và chi phí xưởng.
  - `dw.fact_inventory_daily`: Báo cáo snapshot tồn kho theo từng ngày (không khuyết ngày).
  - Tự động gán toàn bộ `PRIMARY KEY` và `FOREIGN KEY` để AI Text-to-SQL tự động JOIN bảng.

---

### BƯỚC 7: Kiểm tra kết nối từ Backend Engine (Hybrid DB)

Chạy file kiểm tra engine kết nối:

```bash
python backend/db_engine.py
```

Nếu màn hình in ra kết quả như sau là hệ thống đã hoạt động hoàn hảo:
```text
Schema chính thức : schema.sql
Seed data chính   : seed.sql
PostgreSQL target : localhost:5432/enterprise_erp
[Hybrid DB] Đã kết nối thành công tới PostgreSQL (localhost:5432/enterprise_erp).

Dữ liệu kiểm tra từ [POSTGRESQL] (Chuẩn 19 bảng ERP):
   - SP01: Yến lọ (Tồn kho: ...)
   - SP02: Yến chai (Tồn kho: ...)
   - SP03: Yến lon (Tồn kho: ...)
   - SP04: Cháo yến (Tồn kho: ...)
   - SP05: Cà phê phin giấy (Tồn kho: ...)
```

---

## 🖥️ HƯỚNG DẪN XEM DATABASE BẰNG VS CODE (HOẶC DBEAVER)

Nếu muốn xem dữ liệu trực quan bằng giao diện trên VS Code:

1. Cài Extension **Database Client**.
2. Click biểu tượng Database ở thanh công cụ bên trái -> Nhấn **Create Connection** -> Chọn **PostgreSQL**.
3. Nhập thông tin kết nối:
   * **Host:** `localhost` (hoặc `127.0.0.1`)
   * **Port:** `5432`
   * **Username:** `erp_user`
   * **Password:** `erp_password`
   * **Database:** `enterprise_erp`
4. Nhấn **Connect**. Bạn sẽ thấy 2 schema:
   * **`public`**: Chứa 19 bảng nghiệp vụ vận hành (OLTP).
   * **`dw`**: Chứa 6 bảng dữ liệu đã tinh chế cho AI và Báo cáo (Data Warehouse).

---

## ⚠️ XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi `password authentication failed for user "erp_user"`:**
   - Nguyên nhân: Docker còn lưu cache volume cũ với mật khẩu cũ.
   - Khắc phục: Xóa sạch volume và dựng lại bằng lệnh:
     ```bash
     docker-compose down -v
     docker-compose up -d
     python load_csv_to_postgres.py
     python backend/etl_pipeline.py
     ```

2. **Lỗi không kết nối được port `5432`:**
   - Kiểm tra xem máy bạn có cài PostgreSQL cục bộ đang chiếm cổng 5432 không. Nếu có, hãy tắt dịch vụ Postgres local đi hoặc đổi cổng forward trong `docker-compose.yml` (ví dụ `"5433:5432"`).
