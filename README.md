# ĐỒ ÁN TỐT NGHIỆP: HỆ THỐNG QUẢN TRỊ KINH DOANH & SẢN XUẤT SMB TÍCH HỢP AI

> **Đề tài:** Xây dựng ứng dụng hỗ trợ doanh nghiệp vừa và nhỏ trong quản trị kinh doanh có tích hợp AI  
> **Nhóm thực hiện:**  
> - **Trần Quốc Bảo**  
> - **Nguyễn Hồ Quang Minh**  

---

## 📌 1. Bối cảnh & Sản phẩm doanh nghiệp
Hệ thống phục vụ cho doanh nghiệp chuyên sản xuất và kinh doanh 05 nhóm mặt hàng cốt lõi:
1. **Yến lọ**
2. **Yến chai**
3. **Yến lon**
4. **Cháo yến**
5. **Cà phê phin giấy**

Luồng nghiệp vụ tổng thể:
$$\text{Nguyên vật liệu} \longrightarrow \text{Sản xuất (BOM/Lệnh)} \longrightarrow \text{Thành phẩm} \longrightarrow \text{Kho} \longrightarrow \text{Bán hàng} \longrightarrow \text{Khách hàng} \longrightarrow \text{Thanh toán / Công nợ}$$

---

## 🛠️ 2. Kiến trúc Công nghệ & AI
- **Cơ sở dữ liệu Cốt lõi:** PostgreSQL / MySQL (Quản lý nghiệp vụ Sản xuất & Bán hàng).
- **Hạ tầng BI & Tự động hóa (ETL):** **n8n** đóng vai trò tự động hóa luồng dữ liệu BI và cung cấp Webhook phục vụ Chatbot AI tool calling.
- **Trí tuệ nhân tạo (AI Core):**
  - **RAG (Retrieval-Augmented Generation):** Đọc trích xuất thông tin quy trình, tài liệu nội bộ (LangChain / LlamaIndex).
  - **Text-to-SQL:** Truy vấn trực tiếp các chỉ số tồn kho, doanh thu real-time từ CSDL.
  - **Dự báo (Forecasting):** Thư viện **FastAI** dự báo nhu cầu bán hàng và cảnh báo tồn kho.

---

## 📂 3. Cấu trúc Thư mục Dự án

```text
.
├── database/                   # Mã nguồn khởi tạo CSDL & Seed Data
│   ├── schema.sql              # Thiết kế Tables DDL (Sản xuất & Bán hàng)
│   └── seed.sql                # Dữ liệu mẫu (NVL, BOM, Sản phẩm, Khách hàng)
├── backend/                    # Core REST API (Node.js/Express hoặc Python FastAPI)
├── frontend/                   # Web Dashboard UI (Vite / React / Next.js)
├── ai-services/                # Module AI (RAG, Text-to-SQL, FastAI Forecasting)
├── n8n/                        # Workflows ETL & BI Webhooks
├── docker-compose.yml          # Đóng gói hạ tầng DB & n8n
└── README.md
```

---

## 🚀 4. Hướng dẫn Khởi chạy Nhanh Cho Thành Viên Nhóm (1-Click Quickstart)

### Cách 1: Chạy Tự Động Bằng File `.bat` (Khuyên Dùng Cho Đồng Đội Test)
Chỉ cần kéo code từ Git về và **nhấp đúp chuột vào file `start-project.bat`** (hoặc chạy trong cmd / PowerShell):

```bat
start-project.bat
```

File `.bat` sẽ tự động thực hiện từ A-Z:
1. ✅ **Kiểm tra môi trường:** Python 3.10+ và Node.js/npm.
2. 📦 **Tự động cài đặt thư viện:** `pip install` và `npm install` nếu máy chưa có.
3. 🗄️ **Tự động nạp CSDL mẫu:** Tự sinh `database/enterprise_erp.db` (19 bảng chuẩn + 5 sản phẩm cốt lõi + tài khoản mẫu + chính sách giá + BOM). Không bắt buộc cài PostgreSQL!
4. 🏗️ **Tự động build Frontend SPA:** Tạo sẵn `frontend/dist` sẵn sàng phục vụ single-port.
5. 🧪 **Chạy kiểm thử tự động:** Chạy 28 Unit Tests Backend xác nhận 100% hệ thống sẵn sàng.
6. 🌐 **Tự động mở trình duyệt:** Mở `http://localhost:8000/store` (Cửa hàng) và `http://localhost:8000/login` (ERP).

#### Tài Khoản Test Mẫu:
| Vai trò | Tên đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Giám Đốc / Admin** | `admin` | `admin123` | Toàn quyền quản trị, cấu hình AI, BI, duyệt tài chính |
| **Trưởng Kho** | `kho` | `kho123` | Quản lý tồn kho NVL & Thành phẩm, duyệt phiếu lĩnh |
| **Quản Đốc Sản Xuất** | `sx` | `sx123` | Lập kế hoạch, tạo lệnh sản xuất, đề xuất vật tư |
| **Nhân Viên Thu Mua** | `thumua` | `thumua123` | Nhập NVL biến động giá từ nhà cung cấp |

---

### Cách 2: Khởi chạy Nâng cao với Docker & PostgreSQL (Môi trường Production)
```bash
# 1. Khởi chạy Database PostgreSQL & n8n
docker compose up -d

# 2. Khởi chạy Backend API
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Khởi chạy Frontend Dev Server
cd frontend && npm run dev
```

---

## 📄 5. Quy định Đóng góp & Commit Code
- Mọi tính năng mới tạo branch tương ứng: `feature/san-xuat`, `feature/ban-hang`, `feature/ai-chatbot`.
- Commit message rõ ràng, ví dụ: `feat(db): add production order and BOM tables`.
