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

## 🚀 4. Hướng dẫn Khởi chạy Nhanh (Getting Started)

### Bước 1: Clone dự án về máy
```bash
git clone <URL_REPOSITORY_CUA_BAN>
cd "Đồ Án tốt nghiệp"
```

### Bước 2: Khởi chạy Database & n8n qua Docker Compose
```bash
docker compose up -d
```

### Bước 3: Khởi tạo Cơ sở Dữ liệu
```bash
# Nạp Schema & Seed data vào PostgreSQL
docker exec -i enterprise_db psql -U postgres -d enterprise_erp < database/schema.sql
docker exec -i enterprise_db psql -U postgres -d enterprise_erp < database/seed.sql
```

---

## 📄 5. Quy định Đóng góp & Commit Code
- Mọi tính năng mới tạo branch tương ứng: `feature/san-xuat`, `feature/ban-hang`, `feature/ai-chatbot`.
- Commit message rõ ràng, ví dụ: `feat(db): add production order and BOM tables`.
