from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(
    title="Hệ thống Quản trị Kinh doanh & Sản xuất Enterprise API",
    description="API Server cho Đồ án Tốt nghiệp SMB Management & AI Integration",
    version="1.0.0"
)

# Cấu hình CORS cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kết nối Cơ sở dữ liệu PostgreSQL
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "enterprise_erp")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgrespassword")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"Lỗi kết nối CSDL: {e}")
        return None

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Enterprise ERP & AI System Backend API",
        "version": "1.0.0"
    }

# =============================================================================
# 1. API SẢN XUẤT (PRODUCTION MODULE)
# =============================================================================
@app.get("/api/products")
def get_products():
    """Lấy danh sách 5 dòng sản phẩm chính và quy cách đóng gói"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Không thể kết nối CSDL")
    with conn.cursor() as cur:
        cur.execute("SELECT p.*, c.category_name FROM products p JOIN product_categories c ON p.category_id = c.category_id ORDER BY p.product_id;")
        products = cur.fetchall()
    conn.close()
    return {"data": products}

@app.get("/api/bom/{product_id}")
def get_bom(product_id: int):
    """Lấy định mức sản xuất (BOM) cho 1 sản phẩm"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Không thể kết nối CSDL")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT b.*, m.material_code, m.material_name, m.unit as material_unit
            FROM bill_of_materials b
            JOIN materials m ON b.material_id = m.material_id
            WHERE b.product_id = %s;
        """, (product_id,))
        bom_items = cur.fetchall()
    conn.close()
    return {"product_id": product_id, "bom": bom_items}

# =============================================================================
# 2. API BÁN HÀNG (SALES MODULE)
# =============================================================================
@app.get("/api/customers")
def get_customers():
    """Lấy danh sách khách hàng và phân loại (Khách lẻ, Đại lý, NPP, Doanh nghiệp)"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Không thể kết nối CSDL")
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM customers ORDER BY customer_id;")
        customers = cur.fetchall()
    conn.close()
    return {"data": customers}

# =============================================================================
# 3. API AI INTEGRATION (CHATBOT RAG & TEXT-TO-SQL)
# =============================================================================
class ChatQuery(BaseModel):
    question: str

@app.post("/api/ai/chat")
def ai_chatbot(query: ChatQuery):
    """
    Endpoint nhận câu hỏi tiếng Việt từ người dùng:
    - Text-to-SQL cho các câu hỏi tra cứu dữ liệu thực tế (doanh thu, tồn kho)
    - RAG cho câu hỏi quy trình sản xuất & chính sách
    """
    q = query.question.lower()
    
    # Giả lập phản hồi Text-to-SQL / n8n Webhook placeholder
    if "bán chạy" in q or "doanh thu" in q:
        reply = "Theo dữ liệu báo cáo real-time, sản phẩm bán chạy nhất tháng này là **Yến Lọ Chưng Đường Phèn 70ml** với doanh số dự kiến chiếm 45% tổng doanh thu."
    elif "tồn kho" in q or "yến chai" in q:
        reply = "Hiện tại trong kho thành phẩm còn **5,000 chai Yến chai nguyên chất 300ml** (Lô LOT-2026-10) và 50,000g Đường phèn nguyên liệu."
    else:
        reply = f"Hệ thống AI Agent đã nhận được câu hỏi: '{query.question}'. Đang kết nối n8n Webhook & RAG vector store để trích xuất dữ liệu..."
        
    return {"answer": reply, "question": query.question}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
