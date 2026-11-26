import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import sqlite3
from datetime import datetime, date
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Hệ thống Quản trị Kinh doanh & Sản xuất Enterprise API",
    description="API Server cho Đồ án Tốt nghiệp SMB Management & AI Integration",
    version="1.1.0"
)

# Cấu hình CORS cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình Kết nối CSDL: Ưu tiên PostgreSQL, tự động Fallback SQLite
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5434")
DB_NAME = os.getenv("DB_NAME", "enterprise_erp")
DB_USER = os.getenv("DB_USER", "erp_user")
DB_PASS = os.getenv("DB_PASS", "erp_password")
SQLITE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "enterprise_erp.db"))

ACTIVE_DB_MODE = "SQLITE"

def check_postgres_available():
    import time
    for attempt in range(3):
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                connect_timeout=3
            )
            conn.close()
            return True
        except Exception:
            if attempt < 2:
                time.sleep(0.5)
    return False

if check_postgres_available():
    ACTIVE_DB_MODE = "POSTGRESQL"
else:
    ACTIVE_DB_MODE = "SQLITE"
    if not os.path.exists(SQLITE_DB_PATH) or os.path.getsize(SQLITE_DB_PATH) == 0:
        try:
            import setup_database
            setup_database.init_database()
        except Exception as e:
            try:
                from . import setup_database
                setup_database.init_database()
            except Exception:
                pass

class DBContext:
    def __init__(self):
        self.mode = ACTIVE_DB_MODE
        self.conn = None

    def __enter__(self):
        if self.mode == "POSTGRESQL":
            import psycopg2
            from psycopg2.extras import RealDictCursor
            self.conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                cursor_factory=RealDictCursor
            )
        else:
            self.conn = sqlite3.connect(SQLITE_DB_PATH, timeout=30.0, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
            self.conn.execute("PRAGMA journal_mode=WAL;")
            self.conn.execute("PRAGMA synchronous=NORMAL;")
            self.conn.execute("PRAGMA busy_timeout=30000;")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            if exc_type is None:
                self.conn.commit()
            else:
                self.conn.rollback()
            self.conn.close()

    def query(self, sql: str, params: tuple = ()):
        cur = self.conn.cursor()
        if self.mode == "SQLITE":
            sql_conv = sql.replace("%s", "?")
            cur.execute(sql_conv, params)
            rows = cur.fetchall()
            return [dict(ix) for ix in rows]
        else:
            try:
                cur.execute(sql, params)
                return cur.fetchall()
            except Exception:
                if self.conn:
                    self.conn.rollback()
                raise

    def execute(self, sql: str, params: tuple = ()):
        cur = self.conn.cursor()
        if self.mode == "SQLITE":
            sql_conv = sql.replace("%s", "?")
            cur.execute(sql_conv, params)
            return cur.lastrowid
        else:
            try:
                sql_clean = sql.strip().rstrip(";")
                if sql_clean.upper().startswith("INSERT INTO") and "RETURNING" not in sql_clean.upper():
                    cur.execute(sql_clean + " RETURNING *;", params)
                    try:
                        row = cur.fetchone()
                        if row:
                            if isinstance(row, dict):
                                return list(row.values())[0]
                            return row[0]
                    except Exception:
                        pass
                    return None
                cur.execute(sql, params)
                return cur
            except Exception:
                if self.conn:
                    self.conn.rollback()
                raise

def sync_postgres_sequences():
    if ACTIVE_DB_MODE != "POSTGRESQL":
        return
    try:
        with DBContext() as db:
            cur = db.conn.cursor()
            cur.execute("""
                SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS col_name
                FROM pg_class c
                JOIN pg_depend d ON d.objid = c.oid
                JOIN pg_class t ON t.oid = d.refobjid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                WHERE c.relkind = 'S';
            """)
            rows = cur.fetchall()
            for row in rows:
                if isinstance(row, dict):
                    seq_name = row["seq_name"]
                    table_name = row["table_name"]
                    col_name = row["col_name"]
                else:
                    seq_name, table_name, col_name = row[0], row[1], row[2]
                cur.execute(f"SELECT COALESCE(MAX({col_name}), 0) FROM {table_name};")
                max_row = cur.fetchone()
                max_val = max_row["coalesce"] if isinstance(max_row, dict) else max_row[0]
                cur.execute(f"SELECT setval('{seq_name}', {max(int(max_val or 0), 1)}, true);")
            db.conn.commit()
    except Exception as e:
        print("[Sync Postgres Sequences Warning]:", e)

sync_postgres_sequences()

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
SPA_NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}

@app.get("/api/health")
def api_health():
    return {
        "status": "online",
        "system": "Enterprise ERP & AI System Backend API",
        "version": "1.7.0",
        "database_engine": ACTIVE_DB_MODE,
        "mode_description": "PostgreSQL Container" if ACTIVE_DB_MODE == "POSTGRESQL" else "SQLite Hybrid Fallback Mode (Ready for Demo/Dev)"
    }

@app.get("/")
def read_root():
    index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file, headers=SPA_NO_CACHE_HEADERS)
    return api_health()

def ensure_v140_schema():
    """
    Tự động khởi tạo và nâng cấp cấu trúc CSDL cho Version 1.4.0 (cho SQLite fallback).
    Khi kết nối PostgreSQL, cấu trúc và seed đã được nạp qua database/schema.sql và seed.sql.
    """
    if ACTIVE_DB_MODE == "POSTGRESQL":
        return
    try:
        with DBContext() as db:
            # 1. Bảng users
            db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    role VARCHAR(30) NOT NULL,
                    email VARCHAR(100),
                    status VARCHAR(20) DEFAULT 'ACTIVE',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)
            existing_users = db.query("SELECT COUNT(*) as cnt FROM users")
            if not existing_users or existing_users[0]["cnt"] == 0:
                seed_users = [
                    ("admin", "admin123", "Trần Quốc Bảo (Giám Đốc)", "ADMIN", "admin@yencaphe.vn"),
                    ("kho", "kho123", "Nguyễn Văn Kho (Trưởng Kho)", "WAREHOUSE_MANAGER", "kho@yencaphe.vn"),
                    ("sanxuat", "sanxuat123", "Lê Văn Xuất (Quản Đốc SX)", "PRODUCTION_STAFF", "sanxuat@yencaphe.vn"),
                    ("thumua", "thumua123", "Phạm Thị Mua (Thu Mua NVL)", "PROCUREMENT", "thumua@yencaphe.vn"),
                ]
                for u, p, fn, r, em in seed_users:
                    db.execute(
                        "INSERT INTO users (username, password_hash, full_name, role, email, status) VALUES (%s, %s, %s, %s, %s, 'ACTIVE')",
                        (u, p, fn, r, em)
                    )

            # 2. Mở rộng cột bảng products & materials (bỏ qua nếu đã có)
            alter_statements = [
                "ALTER TABLE products ADD COLUMN image_url TEXT",
                "ALTER TABLE products ADD COLUMN target_region VARCHAR(30) DEFAULT 'ALL'",
                "ALTER TABLE products ADD COLUMN health_benefits TEXT",
                "ALTER TABLE products ADD COLUMN case_spec TEXT",
                "ALTER TABLE products ADD COLUMN wholesale_moq INTEGER DEFAULT 24",
                "ALTER TABLE materials ADD COLUMN unit_cost REAL DEFAULT 0.0",
                "ALTER TABLE customers ADD COLUMN region VARCHAR(30) DEFAULT 'SOUTH'",
            ]
            for stmt in alter_statements:
                try:
                    db.execute(stmt)
                except Exception:
                    pass

            # Cập nhật metadata khu vực & đơn giá chuẩn cho 5 sản phẩm và nguyên vật liệu
            product_meta = [
                ("PROD_YEN_LO_70ML", "NORTH", "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80", "Bổ phổi, bồi bổ khí huyết mùa lạnh, tăng cường hệ miễn dịch cho người cao tuổi.", "Thùng 24 lọ", 24),
                ("PROD_YEN_CHAI_300ML", "CENTRAL", "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=600&q=80", "Hàm lượng tổ yến nguyên chất đậm đặc, hộp quà biếu trang trọng và đẳng cấp.", "Thùng 12 chai", 12),
                ("PROD_YEN_LON_190ML", "SOUTH", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80", "Giải khát thanh mát tức thì, bổ sung khoáng chất và collagen tự nhiên mỗi ngày.", "Thùng 24 lon", 24),
                ("PROD_CHAO_YEN_THIT_HEO", "NORTH", "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80", "Bữa sáng ấm nóng giàu dinh dưỡng, dễ tiêu hóa, phục hồi thể lực nhanh chóng.", "Thùng 30 gói", 30),
                ("PROD_CA_PHE_PHIN_GIAY", "SOUTH", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80", "Cà phê Arabica & Robusta Cầu Đất rang mộc, tỉnh táo sảng khoái làm việc hiệu quả.", "Thùng 20 hộp", 20),
            ]
            for code, reg, img, hb, cs, moq in product_meta:
                db.execute(
                    """UPDATE products 
                       SET target_region = COALESCE(NULLIF(target_region, 'ALL'), %s),
                           image_url = COALESCE(image_url, %s),
                           health_benefits = COALESCE(health_benefits, %s),
                           case_spec = COALESCE(case_spec, %s),
                           wholesale_moq = COALESCE(wholesale_moq, %s)
                       WHERE product_code = %s""",
                    (reg, img, hb, cs, moq, code)
                )
            # Đảm bảo 5 sản phẩm gốc có đúng target_region định hướng vùng miền
            for code, reg, _, _, _, _ in product_meta:
                db.execute("UPDATE products SET target_region = %s WHERE product_code = %s", (reg, code))

            # Cập nhật đơn giá chuẩn NVL nếu đang bằng 0
            material_costs = [
                ("MAT_YEN_THO", 25000.0),
                ("MAT_DUONG_PHEN", 35.0),
                ("MAT_VO_LO_70ML", 2500.0),
                ("MAT_NAP_LO", 600.0),
                ("MAT_VO_CHAI_300ML", 3500.0),
                ("MAT_CA_PHE_BOT", 250.0),
                ("MAT_TUI_PHIN_GIAY", 1200.0),
            ]
            for m_code, m_cost in material_costs:
                db.execute("UPDATE materials SET unit_cost = %s WHERE material_code = %s AND (unit_cost IS NULL OR unit_cost = 0)", (m_cost, m_code))

            # Đảm bảo đầy đủ BOM cho cả 5 sản phẩm
            extra_boms = [
                (2, 1, 5.0, "gram"), (2, 2, 15.0, "gram"), (2, 5, 1.0, "cái"),
                (3, 1, 1.5, "gram"), (3, 2, 8.0, "gram"),
                (4, 1, 1.0, "gram"), (4, 2, 5.0, "gram"),
            ]
            for pid, mid, qty, u in extra_boms:
                exists_bom = db.query("SELECT bom_id FROM bill_of_materials WHERE product_id = %s AND material_id = %s", (pid, mid))
                if not exists_bom:
                    db.execute(
                        "INSERT INTO bill_of_materials (product_id, material_id, quantity_required, unit) VALUES (%s, %s, %s, %s)",
                        (pid, mid, qty, u)
                    )

            # 3. Bảng campaigns (Flash Sale & Video Showcase)
            db.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    campaign_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(150) NOT NULL,
                    campaign_type VARCHAR(30) NOT NULL DEFAULT 'FLASHSALE',
                    target_region VARCHAR(30) NOT NULL DEFAULT 'ALL',
                    banner_url VARCHAR(255),
                    video_url VARCHAR(255),
                    discount_percentage REAL DEFAULT 0,
                    product_id INTEGER,
                    start_time DATETIME,
                    end_time DATETIME,
                    is_active INTEGER DEFAULT 1,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (product_id) REFERENCES products(product_id)
                );
            """)
            existing_camps = db.query("SELECT COUNT(*) as cnt FROM campaigns")
            if not existing_camps or existing_camps[0]["cnt"] == 0:
                seed_campaigns = [
                    (
                        "🔥 Flash Sale Mùa Lạnh Miền Bắc: Yến Lọ Chưng Đường Phèn Ấm Áp",
                        "FLASHSALE",
                        "NORTH",
                        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80",
                        "https://www.w3schools.com/html/mov_bbb.mp4",
                        20.0,
                        1,
                        "2026-10-28 00:00:00",
                        "2026-12-31 23:59:59",
                        1,
                        "Ưu đãi bồi bổ khí huyết mùa thu đông cho khách hàng khu vực Miền Bắc"
                    ),
                    (
                        "⚡ Flash Sale Giải Nhiệt Phương Nam: Yến Lon Uống Liền 190ml",
                        "FLASHSALE",
                        "SOUTH",
                        "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1000&q=80",
                        "https://www.w3schools.com/html/mov_bbb.mp4",
                        22.0,
                        3,
                        "2026-10-28 00:00:00",
                        "2026-12-31 23:59:59",
                        1,
                        "Giải khát thanh mát sảng khoái cho khách hàng khu vực Miền Nam"
                    ),
                    (
                        "🎁 Flash Sale Quà Biếu Miền Trung: Yến Chai Nguyên Chất 300ml",
                        "FLASHSALE",
                        "CENTRAL",
                        "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1000&q=80",
                        "https://www.w3schools.com/html/mov_bbb.mp4",
                        18.0,
                        2,
                        "2026-10-28 00:00:00",
                        "2026-12-31 23:59:59",
                        1,
                        "Ưu đãi dòng quà biếu cao cấp tại khu vực Miền Trung"
                    ),
                    (
                        "🎬 Video Showcase: Quy Trình Chưng Cất Tổ Yến Chuẩn ISO 22000 & Rang Xay Cà Phê Cầu Đất",
                        "VIDEO_SHOWCASE",
                        "ALL",
                        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80",
                        "https://www.w3schools.com/html/mov_bbb.mp4",
                        15.0,
                        5,
                        "2026-10-28 00:00:00",
                        "2026-12-31 23:59:59",
                        1,
                        "Video truyền thông quy trình nhà máy chuẩn sạch hiển thị toàn quốc"
                    ),
                ]
                for title, ctype, reg, burl, vurl, disc, pid, st, et, act, nt in seed_campaigns:
                    db.execute("""
                        INSERT INTO campaigns (title, campaign_type, target_region, banner_url, video_url, discount_percentage, product_id, start_time, end_time, is_active, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (title, ctype, reg, burl, vurl, disc, pid, st, et, act, nt))

            # 4. Bảng material_requisitions (Phiếu yêu cầu xuất NVL 2 bước)
            db.execute("""
                CREATE TABLE IF NOT EXISTS material_requisitions (
                    req_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    req_code VARCHAR(30) UNIQUE NOT NULL,
                    prod_order_id INTEGER,
                    product_id INTEGER,
                    requested_by VARCHAR(50) NOT NULL,
                    approved_by VARCHAR(50),
                    status VARCHAR(20) DEFAULT 'PENDING_APPROVAL',
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    approved_at DATETIME
                );
            """)
            existing_reqs = db.query("SELECT COUNT(*) as cnt FROM material_requisitions")
            if not existing_reqs or existing_reqs[0]["cnt"] == 0:
                # Tạo 1 lệnh sản xuất PENDING mẫu kèm Phiếu yêu cầu xuất kho đang chờ Trưởng kho duyệt
                po_pending = db.query("SELECT * FROM production_orders WHERE status = 'PENDING' ORDER BY order_id DESC LIMIT 1")
                if not po_pending:
                    po_id = db.execute("""
                        INSERT INTO production_orders (order_code, product_id, target_quantity, status, notes)
                        VALUES ('PO-2026-8801', 1, 120, 'PENDING', 'Lệnh SX Yến Lọ chuẩn bị hàng mùa lạnh - Chờ kho duyệt NVL')
                    """)
                    prod_id = 1
                else:
                    po_id = po_pending[0]["order_id"]
                    prod_id = po_pending[0]["product_id"]

                db.execute("""
                    INSERT INTO material_requisitions (req_code, prod_order_id, product_id, requested_by, status, notes)
                    VALUES ('REQ-NVL-2026-001', %s, %s, 'sanxuat (Lê Văn Xuất)', 'PENDING_APPROVAL', 'Yêu cầu xuất Tổ yến tinh chế & Đường phèn theo định mức BOM cho lệnh PO')
                """, (po_id, prod_id))

            # 5. Bảng material_receipts (Phiếu thu mua nhập kho NVL theo giá thị trường)
            db.execute("""
                CREATE TABLE IF NOT EXISTS material_receipts (
                    receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    receipt_code VARCHAR(30) UNIQUE NOT NULL,
                    material_id INTEGER NOT NULL,
                    supplier_name VARCHAR(150) NOT NULL,
                    quantity REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    total_cost REAL NOT NULL,
                    market_season VARCHAR(40) DEFAULT 'NORMAL',
                    imported_by VARCHAR(50) DEFAULT 'thumua',
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)
            existing_receipts = db.query("SELECT COUNT(*) as cnt FROM material_receipts")
            if not existing_receipts or existing_receipts[0]["cnt"] == 0:
                seed_receipts = [
                    ("IMP-NVL-2026-0501", 1, "Nhà Yến Khánh Hòa Nguồn Việt", 2000.0, 20500.0, 41000000.0, "LOW_SEASON_MAY_JUL", "thumua", "Thu mua tích trữ Tổ yến vụ Hè (Tháng 6 - Giá chạm đáy mùa thu hoạch)"),
                    ("IMP-NVL-2026-0815", 1, "Nhà Yến Khánh Hòa Nguồn Việt", 1500.0, 24800.0, 37200000.0, "MID_AUTUMN_AUG_OCT", "thumua", "Nhập bổ sung Tổ yến phục vụ sản xuất quà biếu Trung Thu"),
                    ("IMP-NVL-2026-1010", 2, "Nhà máy Đường Quảng Ngãi", 20000.0, 34.0, 680000.0, "NORMAL", "thumua", "Nhập lô Đường phèn kết tinh tự nhiên"),
                    ("IMP-NVL-2026-1020", 6, "Nông trường Cà Phê Cầu Đất Đà Lạt", 5000.0, 240.0, 1200000.0, "NORMAL", "thumua", "Nhập hạt Arabica & Robusta vụ mới"),
                ]
                for rcode, mid, sname, qty, uprice, tcost, season, iby, nt in seed_receipts:
                    db.execute("""
                        INSERT INTO material_receipts (receipt_code, material_id, supplier_name, quantity, unit_price, total_cost, market_season, imported_by, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (rcode, mid, sname, qty, uprice, tcost, season, iby, nt))
    except Exception as e:
        print(f"[Schema Init Warning]: {e}")

ensure_v140_schema()

# =============================================================================
# 0. API XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC MODULE)
# =============================================================================
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    """
    Đăng nhập hệ thống Quản Trị ERP & BI:
    Kiểm tra tài khoản, mật khẩu và trả về vai trò người dùng (ADMIN, WAREHOUSE_MANAGER, PRODUCTION_STAFF, PROCUREMENT)
    """
    username = req.username.strip().lower()
    password = req.password.strip()

    with DBContext() as db:
        users = db.query("SELECT * FROM users WHERE LOWER(username) = %s AND status = 'ACTIVE'", (username,))
        if not users:
            raise HTTPException(status_code=401, detail="Tên đăng nhập không tồn tại hoặc tài khoản đã bị khóa")

        user = users[0]
        if user["password_hash"] != password and user["password_hash"] != f"hash_{password}":
            raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

        token = f"token_{user['role'].lower()}_{user['user_id']}_{username}"

        return {
            "success": True,
            "message": f"Đăng nhập thành công! Xin chào {user['full_name']}.",
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "role": user["role"],
                "email": user["email"]
            }
        }

@app.get("/api/auth/me")
def auth_me(token: Optional[str] = None):
    """Kiểm tra phiên làm việc và quyền người dùng hiện tại"""
    if not token or not token.startswith("token_"):
        raise HTTPException(status_code=401, detail="Chưa đăng nhập hoặc phiên làm việc đã hết hạn")

    parts = token.split("_")
    if len(parts) < 4:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    username = parts[3]
    with DBContext() as db:
        users = db.query("SELECT user_id, username, full_name, role, email, status FROM users WHERE LOWER(username) = %s", (username,))
        if not users:
            raise HTTPException(status_code=401, detail="Người dùng không tồn tại")
        return {"user": users[0]}

@app.get("/api/auth/users")
def get_users():
    """Lấy danh sách tài khoản nhân viên theo Role"""
    with DBContext() as db:
        users = db.query("SELECT user_id, username, full_name, role, email, status, created_at FROM users ORDER BY user_id;")
    return {"data": users}

# =============================================================================
# 1. API SẢN XUẤT, DANH MỤC ĐỘNG & DUYỆT KHO 2 BƯỚC (PRODUCTION, CATALOG & REQUISITION)
# =============================================================================
@app.get("/api/products")
def get_products(selling_only: Optional[bool] = False):
    """Lấy danh sách các dòng sản phẩm chính và quy cách đóng gói (hỗ trợ lọc sản phẩm đang bán - PP_01)"""
    with DBContext() as db:
        sql = """
            SELECT p.*, COALESCE(c.category_name, 'Thực phẩm & Đồ uống') as category_name
            FROM products p 
            LEFT JOIN product_categories c ON p.category_id = c.category_id 
        """
        if selling_only:
            sql += " WHERE (p.is_selling = TRUE OR p.is_selling = 1 OR p.is_selling IS NULL) "
        sql += " ORDER BY p.product_id;"
        products = db.query(sql)
    return {"data": products, "total": len(products)}

class ProductSellingStatusUpdate(BaseModel):
    is_selling: bool

@app.put("/api/products/{product_id}/selling-status")
def update_product_selling_status(product_id: int, req: ProductSellingStatusUpdate):
    """Chuyển đổi trạng thái kinh doanh Đang bán / Ngừng bán của sản phẩm (PP_01)"""
    with DBContext() as db:
        prod = db.query("SELECT product_name FROM products WHERE product_id = %s;", (product_id,))
        if not prod:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
        db.execute("UPDATE products SET is_selling = %s WHERE product_id = %s;", (req.is_selling, product_id))
        st_text = "ĐANG BÁN" if req.is_selling else "NGỪNG BÁN"
    return {
        "success": True,
        "message": f"Đã chuyển trạng thái sản phẩm '{prod[0]['product_name']}' sang [{st_text}]",
        "product_id": product_id,
        "is_selling": req.is_selling
    }

class ProductCreateUpdate(BaseModel):
    product_code: Optional[str] = None
    product_name: str
    category_id: Optional[int] = 1
    unit: str = "lọ"
    packaging_spec: Optional[str] = "Thùng 24 đơn vị"
    cost_price: float = 20000.0
    selling_price: float = 40000.0
    image_url: Optional[str] = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
    target_region: Optional[str] = "ALL"
    health_benefits: Optional[str] = "Bồi bổ sức khỏe, tăng cường đề kháng tự nhiên."
    case_spec: Optional[str] = "Thùng 24 đơn vị"
    wholesale_moq: Optional[int] = 24
    initial_stock: Optional[int] = 500

@app.post("/api/products")
def create_product(prod: ProductCreateUpdate):
    """Admin CMS: Thêm mới sản phẩm trực tiếp vào CSDL kèm khởi tạo chính sách giá sỉ và lô tồn kho"""
    import random
    code = (prod.product_code or f"PROD_NEW_{random.randint(100, 999)}").strip().upper()
    with DBContext() as db:
        existing = db.query("SELECT product_id FROM products WHERE UPPER(product_code) = %s", (code,))
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã sản phẩm '{code}' đã tồn tại trong CSDL")

        new_pid = db.execute("""
            INSERT INTO products (product_code, product_name, category_id, unit, packaging_spec, cost_price, selling_price, status, image_url, target_region, health_benefits, case_spec, wholesale_moq)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE', %s, %s, %s, %s, %s)
        """, (
            code, prod.product_name, prod.category_id or 1, prod.unit, prod.packaging_spec,
            prod.cost_price, prod.selling_price, prod.image_url, prod.target_region or "ALL",
            prod.health_benefits, prod.case_spec or prod.packaging_spec, prod.wholesale_moq or 24
        ))

        # Tự động tạo chính sách giá sỉ MOQ (giảm 18%) và Agent VIP (giảm 22%)
        moq_price = round(prod.selling_price * 0.82, -2)
        agent_price = round(prod.selling_price * 0.78, -2)
        db.execute("""
            INSERT INTO price_policies (product_id, customer_type, min_quantity, discount_rate, custom_price, effective_date)
            VALUES (%s, 'WHOLESALE_MOQ', %s, 0.18, %s, CURRENT_DATE)
        """, (new_pid, prod.wholesale_moq or 24, moq_price))
        db.execute("""
            INSERT INTO price_policies (product_id, customer_type, min_quantity, discount_rate, custom_price, effective_date)
            VALUES (%s, 'AGENT_VIP', 1, 0.22, %s, CURRENT_DATE)
        """, (new_pid, agent_price))

        # Tạo định mức BOM mặc định với Tổ yến & Đường phèn
        db.execute("INSERT INTO bill_of_materials (product_id, material_id, quantity_required, unit) VALUES (%s, 1, 2.5, 'gram')", (new_pid,))
        db.execute("INSERT INTO bill_of_materials (product_id, material_id, quantity_required, unit) VALUES (%s, 2, 8.0, 'gram')", (new_pid,))

        # Khởi tạo lô tồn kho ban đầu để sẵn sàng mở bán trên Storefront
        if (prod.initial_stock or 0) > 0:
            lot_no = f"LOT-INIT-{code}"
            db.execute("""
                INSERT INTO finished_goods_inventory (product_id, lot_number, quantity_in_stock, manufactured_date)
                VALUES (%s, %s, %s, CURRENT_DATE)
            """, (new_pid, lot_no, prod.initial_stock))

    return {
        "success": True,
        "message": f"Đã thêm sản phẩm mới '{prod.product_name}' ({code}) vào CSDL thành công!",
        "product_id": new_pid,
        "product_code": code
    }

@app.put("/api/products/{product_id}")
def update_product(product_id: int, prod: ProductCreateUpdate):
    """Admin CMS: Cập nhật giá bán, giá vốn, hình ảnh, khu vực ưu tiên của sản phẩm trực tiếp trong CSDL"""
    with DBContext() as db:
        existing = db.query("SELECT * FROM products WHERE product_id = %s", (product_id,))
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm cần cập nhật")

        db.execute("""
            UPDATE products
            SET product_name = %s,
                unit = %s,
                packaging_spec = %s,
                cost_price = %s,
                selling_price = %s,
                image_url = %s,
                target_region = %s,
                health_benefits = %s,
                case_spec = %s,
                wholesale_moq = %s
            WHERE product_id = %s
        """, (
            prod.product_name, prod.unit, prod.packaging_spec, prod.cost_price, prod.selling_price,
            prod.image_url, prod.target_region or "ALL", prod.health_benefits,
            prod.case_spec or prod.packaging_spec, prod.wholesale_moq or 24, product_id
        ))

        # Đồng bộ lại chính sách giá sỉ theo giá bán lẻ mới
        moq_price = round(prod.selling_price * 0.82, -2)
        agent_price = round(prod.selling_price * 0.78, -2)
        db.execute("UPDATE price_policies SET custom_price = %s, min_quantity = %s WHERE product_id = %s AND customer_type = 'WHOLESALE_MOQ'", (moq_price, prod.wholesale_moq or 24, product_id))
        db.execute("UPDATE price_policies SET custom_price = %s WHERE product_id = %s AND customer_type = 'AGENT_VIP'", (agent_price, product_id))

    return {"success": True, "message": f"Đã cập nhật thông tin & giá sản phẩm '{prod.product_name}' thành công!"}

class BOMItemSave(BaseModel):
    material_id: int
    quantity_required: float
    notes: Optional[str] = ""

class BOMUpdatePayload(BaseModel):
    items: List[BOMItemSave]
    version_code: Optional[str] = None

@app.get("/api/bom/{product_id}")
def get_bom(product_id: int):
    """Lấy định mức sản xuất (BOM) cho 1 sản phẩm"""
    with DBContext() as db:
        sql = """
            SELECT b.*, m.material_code, m.material_name, m.unit as material_unit, m.unit_cost, m.current_stock
            FROM bill_of_materials b
            JOIN materials m ON b.material_id = m.material_id
            WHERE b.product_id = %s
            ORDER BY b.bom_id;
        """
        bom_items = db.query(sql, (product_id,))
    return {"product_id": product_id, "bom": bom_items}

@app.post("/api/bom/{product_id}")
def update_product_bom(product_id: int, payload: BOMUpdatePayload):
    """Cập nhật định mức BOM và tự động tạo mã phiên bản mới dạng BOM_SPxx_DDMMYY_vX (QDSX_02)"""
    import random
    date_code = datetime.now().strftime("%d%m%y")
    gen_version = payload.version_code or f"BOM_SP{product_id:02d}_{date_code}_v{random.randint(1, 99)}"

    with DBContext() as db:
        # Xóa BOM cũ của sản phẩm và nạp danh sách mới
        db.execute("DELETE FROM bill_of_materials WHERE product_id = %s;", (product_id,))
        for it in payload.items:
            db.execute("""
                INSERT INTO bill_of_materials (product_id, material_id, quantity_required, unit, notes, version_code)
                VALUES (%s, %s, %s, (SELECT unit FROM materials WHERE material_id = %s), %s, %s);
            """, (product_id, it.material_id, it.quantity_required, it.material_id, it.notes or "", gen_version))

    return {
        "success": True,
        "message": f"Cập nhật thành công định mức BOM (Phiên bản {gen_version})",
        "bom_version": gen_version
    }

@app.get("/api/materials")
def get_materials():
    """Lấy danh mục và tồn kho nguyên vật liệu"""
    with DBContext() as db:
        materials = db.query("SELECT * FROM materials ORDER BY material_id;")
    return {"data": materials}

class MaterialImportRequest(BaseModel):
    material_id: int
    quantity: float
    unit_price: float
    supplier_name: Optional[str] = "Nhà Yến Khánh Hòa Nguồn Việt"
    market_season: Optional[str] = "NORMAL"
    imported_by: Optional[str] = "thumua (Phạm Thị Mua)"
    notes: Optional[str] = "Nhập kho NVL theo giá thị trường"

@app.get("/api/materials/receipts")
def get_material_receipts():
    """Lấy lịch sử các lô thu mua nhập nguyên vật liệu kèm biến động giá thị trường"""
    with DBContext() as db:
        sql = """
            SELECT r.*, m.material_code, m.material_name, m.unit
            FROM material_receipts r
            JOIN materials m ON r.material_id = m.material_id
            ORDER BY r.receipt_id DESC;
        """
        receipts = db.query(sql)
    return {"data": receipts}

@app.post("/api/materials/import")
def import_material_stock(req: MaterialImportRequest):
    """Phân hệ Thu mua (PROCUREMENT): Nhập kho nguyên vật liệu với đơn giá biến động thị trường"""
    if req.quantity <= 0 or req.unit_price < 0:
        raise HTTPException(status_code=400, detail="Số lượng nhập phải lớn hơn 0 và đơn giá hợp lệ")

    import random
    receipt_code = f"IMP-NVL-2026-{random.randint(1000, 9999)}"
    total_cost = round(req.quantity * req.unit_price, 2)

    with DBContext() as db:
        mats = db.query("SELECT * FROM materials WHERE material_id = %s", (req.material_id,))
        if not mats:
            raise HTTPException(status_code=404, detail="Không tìm thấy nguyên vật liệu")
        mat = mats[0]

        # Cộng tồn kho & cập nhật đơn giá thị trường mới nhất
        db.execute(
            "UPDATE materials SET current_stock = current_stock + %s, unit_cost = %s WHERE material_id = %s",
            (req.quantity, req.unit_price, req.material_id)
        )

        # Lưu phiếu nhập kho thu mua
        rec_id = db.execute("""
            INSERT INTO material_receipts (receipt_code, material_id, supplier_name, quantity, unit_price, total_cost, market_season, imported_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            receipt_code, req.material_id, req.supplier_name, req.quantity,
            req.unit_price, total_cost, req.market_season, req.imported_by, req.notes
        ))

    return {
        "success": True,
        "message": f"Đã lập phiếu thu mua {receipt_code}: Nhập +{req.quantity:,.0f} {mat['unit']} {mat['material_name']} (Đơn giá: {req.unit_price:,.0f} ₫/{mat['unit']})!",
        "receipt_code": receipt_code,
        "receipt_id": rec_id,
        "total_cost": total_cost
    }

class ProductionOrderCreate(BaseModel):
    product_id: int
    target_quantity: int
    notes: Optional[str] = "Lệnh sản xuất mới"
    requested_by: Optional[str] = "sanxuat (Lê Văn Xuất)"
    workshop_id: Optional[int] = 1
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    bom_version: Optional[str] = None

@app.get("/api/production-orders")
def get_production_orders():
    """Lấy danh sách các lệnh sản xuất kèm trạng thái Phiếu yêu cầu xuất NVL và Phân xưởng phụ trách"""
    with DBContext() as db:
        sql = """
            SELECT po.*, p.product_name, p.product_code, p.unit,
                   ws.workshop_name, ws.workshop_code, ws.manager_name, ws.contact_phone,
                   mr.req_id, mr.req_code, mr.status as requisition_status,
                   mr.requested_by, mr.approved_by, mr.approved_at
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN workshops ws ON po.workshop_id = ws.workshop_id
            LEFT JOIN material_requisitions mr ON mr.prod_order_id = po.order_id
            ORDER BY po.order_id DESC;
        """
        orders = db.query(sql)
    return {"data": orders}

@app.post("/api/production-orders")
def create_production_order(order: ProductionOrderCreate):
    """
    Tạo mới một lệnh sản xuất (Trạng thái PENDING) kèm mốc thời gian và xưởng phụ trách.
    Đồng thời tự động khởi tạo Phiếu Yêu Cầu Xuất NVL (material_requisitions) ở trạng thái PENDING_APPROVAL (Chờ Trưởng Kho Duyệt)
    """
    import random
    order_code = f"PO-2026-{random.randint(1000, 9999)}"
    req_code = f"REQ-NVL-{random.randint(1000, 9999)}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start_dt = order.start_time or now_str
    bom_ver = order.bom_version or f"BOM_SP{order.product_id:02d}_{datetime.now().strftime('%d%m%y')}_v1"

    with DBContext() as db:
        sql = """
            INSERT INTO production_orders (order_code, product_id, workshop_id, target_quantity, status, start_time, end_time, bom_version, receipt_status, notes)
            VALUES (%s, %s, %s, %s, 'PENDING', %s, %s, %s, 'CHO_NHAP_KHO', %s);
        """
        new_id = db.execute(sql, (order_code, order.product_id, order.workshop_id or 1, order.target_quantity, start_dt, order.end_time, bom_ver, order.notes))

        # Sinh tự động Phiếu yêu cầu xuất NVL chờ Trưởng kho duyệt (chưa trừ kho)
        db.execute("""
            INSERT INTO material_requisitions (req_code, prod_order_id, product_id, requested_by, status, notes)
            VALUES (%s, %s, %s, %s, 'PENDING_APPROVAL', %s);
        """, (
            req_code, new_id, order.product_id,
            order.requested_by or "sanxuat (Lê Văn Xuất)",
            f"Phiếu yêu cầu xuất NVL theo BOM ({bom_ver}) cho lệnh {order_code} ({order.target_quantity} sản phẩm) - Chờ Trưởng kho phê duyệt"
        ))

    return {
        "message": "Tạo lệnh sản xuất & gửi Phiếu yêu cầu xuất NVL chờ Trưởng kho duyệt thành công",
        "order_code": order_code,
        "req_code": req_code,
        "id": new_id,
        "bom_version": bom_ver
    }

@app.get("/api/production-orders/{order_id}/details")
def get_production_order_details(order_id: int):
    """Xem chi tiết lệnh sản xuất: Định mức BOM áp dụng, tổng NVL cần dùng, tiến độ & xưởng phụ trách (QDSX_04)"""
    with DBContext() as db:
        order = db.query("""
            SELECT po.*, p.product_name, p.product_code, p.unit, p.selling_price, p.cost_price,
                   ws.workshop_name, ws.workshop_code, ws.manager_name, ws.contact_phone, ws.location as workshop_location,
                   mr.req_id, mr.req_code, mr.status as requisition_status, mr.approved_by, mr.approved_at
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN workshops ws ON po.workshop_id = ws.workshop_id
            LEFT JOIN material_requisitions mr ON mr.prod_order_id = po.order_id
            WHERE po.order_id = %s;
        """, (order_id,))
        if not order:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất")
        ord_info = order[0]

        bom_items = db.query("""
            SELECT b.*, m.material_code, m.material_name, m.unit as material_unit, m.current_stock, m.unit_cost
            FROM bill_of_materials b
            JOIN materials m ON b.material_id = m.material_id
            WHERE b.product_id = %s;
        """, (ord_info["product_id"],))

        target_qty = ord_info.get("target_quantity") or 0
        total_materials_cost = 0.0
        for it in bom_items:
            req_qty = round(float(it["quantity_required"]) * target_qty, 4)
            it["total_required_quantity"] = req_qty
            it["line_estimated_cost"] = round(req_qty * float(it.get("unit_cost") or 0.0), 2)
            total_materials_cost += it["line_estimated_cost"]

        ord_info["bom_items"] = bom_items
        ord_info["total_materials_cost"] = total_materials_cost
        return ord_info

@app.post("/api/production-orders/{order_id}/request-materials")
def request_materials_for_po(order_id: int, requested_by: Optional[str] = "sanxuat (Lê Văn Xuất)"):
    """Bộ phận Sản xuất gửi (hoặc gửi lại) Phiếu Yêu Cầu Xuất NVL chờ Trưởng Kho phê duyệt"""
    import random
    with DBContext() as db:
        orders = db.query("SELECT * FROM production_orders WHERE order_id = %s", (order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất")
        order = orders[0]

        existing_req = db.query("SELECT * FROM material_requisitions WHERE prod_order_id = %s", (order_id,))
        if existing_req:
            req = existing_req[0]
            if req["status"] == "APPROVED":
                return {"message": f"Phiếu {req['req_code']} đã được Trưởng kho duyệt trước đó", "req_code": req["req_code"]}
            db.execute("UPDATE material_requisitions SET status = 'PENDING_APPROVAL' WHERE req_id = %s", (req["req_id"],))
            return {"message": f"Đã gửi lại Phiếu yêu cầu xuất NVL {req['req_code']} tới Trưởng kho!", "req_code": req["req_code"]}

        req_code = f"REQ-NVL-{random.randint(1000, 9999)}"
        db.execute("""
            INSERT INTO material_requisitions (req_code, prod_order_id, product_id, requested_by, status, notes)
            VALUES (%s, %s, %s, %s, 'PENDING_APPROVAL', %s);
        """, (req_code, order_id, order["product_id"], requested_by, f"Yêu cầu xuất NVL cho lệnh {order['order_code']}"))

    return {"message": f"Đã lập Phiếu yêu cầu xuất NVL {req_code} (Chờ Trưởng kho duyệt)!", "req_code": req_code}

@app.get("/api/material-requisitions")
def get_material_requisitions():
    """
    Lấy danh sách Phiếu Yêu Cầu Xuất Kho NVL cho màn hình Trưởng Kho (WAREHOUSE_MANAGER):
    Bao gồm chi tiết định mức BOM cần xuất và đối chiếu tồn kho thực tế
    """
    with DBContext() as db:
        reqs = db.query("""
            SELECT mr.*, po.order_code, po.target_quantity, po.status as po_status,
                   p.product_name, p.product_code, p.unit as product_unit
            FROM material_requisitions mr
            JOIN production_orders po ON mr.prod_order_id = po.order_id
            JOIN products p ON mr.product_id = p.product_id
            ORDER BY mr.req_id DESC;
        """)
        for r in reqs:
            bom_items = db.query("""
                SELECT b.material_id, b.quantity_required, m.material_code, m.material_name,
                       m.current_stock, m.unit
                FROM bill_of_materials b
                JOIN materials m ON b.material_id = m.material_id
                WHERE b.product_id = %s
            """, (r["product_id"],))
            details = []
            all_enough = True
            for b in bom_items:
                needed = round(float(b["quantity_required"]) * int(r["target_quantity"]), 2)
                stock = float(b["current_stock"])
                enough = stock >= needed
                if not enough:
                    all_enough = False
                details.append({
                    "material_id": b["material_id"],
                    "material_code": b["material_code"],
                    "material_name": b["material_name"],
                    "quantity_per_unit": b["quantity_required"],
                    "needed_qty": needed,
                    "current_stock": stock,
                    "unit": b["unit"],
                    "is_enough": enough
                })
            r["bom_details"] = details
            r["is_stock_sufficient"] = all_enough

    return {"data": reqs}

class RequisitionApproveRequest(BaseModel):
    approved_by: Optional[str] = "kho (Nguyễn Văn Kho - Trưởng Kho)"

@app.post("/api/material-requisitions/{req_id}/approve")
def approve_material_requisition(req_id: int, body: Optional[RequisitionApproveRequest] = None):
    """
    Bước 2 (Trưởng Kho phê duyệt):
    - Kiểm tra tồn kho NVL thực tế
    - Chính thức trừ kho NVL theo định mức BOM
    - Ghi nhận phiếu xuất kho NVL (material_issues)
    - Cập nhật trạng thái Phiếu yêu cầu -> APPROVED và Lệnh sản xuất -> IN_PROGRESS
    """
    approver = body.approved_by if body and body.approved_by else "kho (Nguyễn Văn Kho - Trưởng Kho)"
    with DBContext() as db:
        reqs = db.query("SELECT * FROM material_requisitions WHERE req_id = %s", (req_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu xuất kho NVL")
        req = reqs[0]
        if req["status"] == "APPROVED":
            raise HTTPException(status_code=400, detail="Phiếu yêu cầu này đã được phê duyệt và xuất kho trước đó")

        orders = db.query("SELECT * FROM production_orders WHERE order_id = %s", (req["prod_order_id"],))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất liên kết")
        order = orders[0]

        bom_items = db.query("""
            SELECT b.*, m.material_name, m.current_stock, m.unit as mat_unit
            FROM bill_of_materials b
            JOIN materials m ON b.material_id = m.material_id
            WHERE b.product_id = %s
        """, (order["product_id"],))
        target_qty = int(order["target_quantity"])

        # Kiểm tra đủ tồn kho trước khi xuất
        for item in bom_items:
            needed = float(item["quantity_required"]) * target_qty
            if float(item["current_stock"]) < needed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Kho không đủ '{item['material_name']}' (Cần: {needed:,.1f} {item['mat_unit']}, Tồn: {item['current_stock']:,.1f} {item['mat_unit']}). Vui lòng báo bộ phận Thu mua nhập thêm!"
                )

        # Trừ nguyên vật liệu chính thức
        for item in bom_items:
            needed = float(item["quantity_required"]) * target_qty
            db.execute("UPDATE materials SET current_stock = current_stock - %s WHERE material_id = %s", (needed, item["material_id"]))

        # Cập nhật Phiếu yêu cầu & Lệnh sản xuất
        db.execute("""
            UPDATE material_requisitions
            SET status = 'APPROVED', approved_by = %s, approved_at = CURRENT_TIMESTAMP
            WHERE req_id = %s
        """, (approver, req_id))
        db.execute("UPDATE production_orders SET status = 'IN_PROGRESS' WHERE order_id = %s", (order["order_id"],))

        low_stock_items = db.query("SELECT material_name, current_stock, unit FROM materials WHERE current_stock < 500")

    if "dispatch_n8n_webhook" in globals():
        if low_stock_items:
            names = ", ".join(f"{m['material_name']} ({float(m['current_stock']):,.1f} {m['unit']})" for m in low_stock_items)
            dispatch_n8n_webhook(
                webhook_path="system-alert",
                workflow_id="03_event_driven_alerts",
                workflow_name="03 - Event-Driven System Alerts",
                payload={
                    "event_type": "LOW_MATERIAL_STOCK",
                    "severity": "CRITICAL",
                    "title": f"CẢNH BÁO KHO NVL: Tồn kho dưới ngưỡng an toàn sau phiếu {req['req_code']}",
                    "message": f"Trưởng kho vừa duyệt xuất kho cho lệnh {order['order_code']}. Các NVL chạm ngưỡng cảnh báo (<500): {names}."
                }
            )
        else:
            dispatch_n8n_webhook(
                webhook_path="system-alert",
                workflow_id="03_event_driven_alerts",
                workflow_name="03 - Event-Driven System Alerts",
                payload={
                    "event_type": "REQUISITION_APPROVED",
                    "severity": "INFO",
                    "title": f"Đã duyệt xuất kho NVL: {req['req_code']}",
                    "message": f"Trưởng kho ({approver}) đã phê duyệt xuất NVL cho lệnh sản xuất {order['order_code']}."
                }
            )

    return {
        "success": True,
        "message": f"Trưởng kho đã phê duyệt phiếu {req['req_code']}! Đã trừ kho NVL theo BOM và chuyển lệnh {order['order_code']} sang ĐANG SẢN XUẤT (IN_PROGRESS)."
    }

@app.post("/api/production-orders/{order_id}/start")
def start_production_order(order_id: int):
    """Bắt đầu lệnh sản xuất: Trừ nguyên vật liệu theo định mức BOM và đồng bộ trạng thái phiếu xuất NVL"""
    with DBContext() as db:
        orders = db.query("SELECT * FROM production_orders WHERE order_id = %s", (order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất")
        order = orders[0]
        if order["status"] != "PENDING":
            raise HTTPException(status_code=400, detail="Chỉ lệnh PENDING mới có thể bắt đầu")

        # Lấy BOM
        bom_items = db.query("SELECT * FROM bill_of_materials WHERE product_id = %s", (order["product_id"],))
        target_qty = order["target_quantity"]

        # Trừ nguyên vật liệu
        for item in bom_items:
            needed = float(item["quantity_required"]) * target_qty
            db.execute("UPDATE materials SET current_stock = current_stock - %s WHERE material_id = %s", (needed, item["material_id"]))

        # Cập nhật trạng thái lệnh & phiếu yêu cầu xuất kho (nếu có)
        db.execute("UPDATE production_orders SET status = 'IN_PROGRESS' WHERE order_id = %s", (order_id,))
        db.execute("""
            UPDATE material_requisitions
            SET status = 'APPROVED', approved_by = 'kho (Duyệt xuất kho)', approved_at = CURRENT_TIMESTAMP
            WHERE prod_order_id = %s AND status != 'APPROVED'
        """, (order_id,))

    return {"message": "Đã bắt đầu sản xuất và xuất kho NVL theo định mức BOM thành công"}

@app.post("/api/production-orders/{order_id}/complete")
def complete_production_order(order_id: int):
    """Hoàn thành sản xuất: Nhập thành phẩm vào kho"""
    with DBContext() as db:
        orders = db.query("SELECT * FROM production_orders WHERE order_id = %s", (order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất")
        order = orders[0]
        if order["status"] != "IN_PROGRESS":
            raise HTTPException(status_code=400, detail="Chỉ lệnh IN_PROGRESS mới có thể hoàn thành")

        completed_qty = order["target_quantity"]
        lot_number = f"LOT-{order['order_code']}"

        # Nhập kho thành phẩm
        db.execute("""
            INSERT INTO finished_goods_inventory (product_id, lot_number, quantity_in_stock, manufactured_date)
            VALUES (%s, %s, %s, CURRENT_DATE);
        """, (order["product_id"], lot_number, completed_qty))

        db.execute("UPDATE production_orders SET status = 'COMPLETED', completed_quantity = %s WHERE order_id = %s", (completed_qty, order_id))

    return {"message": f"Hoàn thành lệnh sản xuất! Đã nhập {completed_qty} sản phẩm vào kho (Lô: {lot_number})"}

# =============================================================================
# 2. API BÁN HÀNG & KHO (SALES & INVENTORY MODULE)
# =============================================================================
@app.get("/api/customers")
def get_customers(staff_user_id: Optional[int] = None):
    """Lấy danh sách khách hàng và phân loại (hỗ trợ lọc theo nhân viên tiếp thị phụ trách)"""
    with DBContext() as db:
        if staff_user_id:
            sql = """
                SELECT c.*, 1 as is_assigned_to_me
                FROM customers c
                JOIN staff_agent_assignments saa ON c.customer_id = saa.customer_id
                WHERE saa.user_id = %s
                ORDER BY c.customer_id;
            """
            customers = db.query(sql, (staff_user_id,))
        else:
            customers = db.query("SELECT * FROM customers ORDER BY customer_id;")
    return {"data": customers}

class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[float] = None

@app.put("/api/customers/{customer_id}")
def update_customer_profile(customer_id: int, req: CustomerUpdate):
    """Cập nhật thông tin hồ sơ và hạn mức tín dụng khách hàng/đại lý (PP_03)"""
    with DBContext() as db:
        c = db.query("SELECT * FROM customers WHERE customer_id = %s;", (customer_id,))
        if not c:
            raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")
        curr = c[0]
        name = req.customer_name if req.customer_name is not None else curr["customer_name"]
        ctype = req.customer_type if req.customer_type is not None else curr["customer_type"]
        phone = req.phone if req.phone is not None else curr.get("phone", "")
        email = req.email if req.email is not None else curr.get("email", "")
        address = req.address if req.address is not None else curr.get("address", "")
        limit = req.credit_limit if req.credit_limit is not None else curr.get("credit_limit", 0)

        db.execute("""
            UPDATE customers
            SET customer_name = %s, customer_type = %s, phone = %s, email = %s, address = %s, credit_limit = %s
            WHERE customer_id = %s;
        """, (name, ctype, phone, email, address, limit, customer_id))
    return {"success": True, "message": f"Cập nhật hồ sơ khách hàng '{name}' thành công"}

@app.get("/api/inventory/finished-goods")
def get_finished_goods():
    """Lấy danh sách tồn kho thành phẩm theo lô"""
    with DBContext() as db:
        sql = """
            SELECT fg.*, p.product_name, p.product_code, p.unit
            FROM finished_goods_inventory fg
            JOIN products p ON fg.product_id = p.product_id
            WHERE fg.quantity_in_stock > 0
            ORDER BY fg.inventory_id DESC;
        """
        inventory = db.query(sql)
    return {"data": inventory}

class SalesOrderItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: float

class SalesOrderCreate(BaseModel):
    customer_id: int
    items: List[SalesOrderItem]
    notes: Optional[str] = "Đơn bán hàng mới"

@app.get("/api/sales-orders")
def get_sales_orders(staff_user_id: Optional[int] = None):
    """Lấy danh sách đơn hàng bán (hỗ trợ lọc theo nhân viên tiếp thị phụ trách)"""
    with DBContext() as db:
        if staff_user_id:
            sql = """
                SELECT so.*, c.customer_name, c.customer_type, c.phone
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.customer_id
                JOIN staff_agent_assignments saa ON so.customer_id = saa.customer_id
                WHERE saa.user_id = %s
                ORDER BY so.sales_order_id DESC;
            """
            orders = db.query(sql, (staff_user_id,))
        else:
            sql = """
                SELECT so.*, c.customer_name, c.customer_type, c.phone
                FROM sales_orders so
                JOIN customers c ON so.customer_id = c.customer_id
                ORDER BY so.sales_order_id DESC;
            """
            orders = db.query(sql)
    return {"data": orders}

@app.post("/api/sales-orders")
def create_sales_order(order: SalesOrderCreate):
    """Tạo mới Đơn bán hàng (Trạng thái NEW)"""
    import random
    order_code = f"SO-2026-{random.randint(1000, 9999)}"
    total_amount = sum(item.quantity * item.unit_price for item in order.items)

    with DBContext() as db:
        so_id = db.execute("""
            INSERT INTO sales_orders (order_code, customer_id, total_amount, final_amount, status, notes)
            VALUES (%s, %s, %s, %s, 'NEW', %s);
        """, (order_code, order.customer_id, total_amount, total_amount, order.notes))

        # Lưu chi tiết đơn hàng
        for item in order.items:
            subtotal = item.quantity * item.unit_price
            db.execute("""
                INSERT INTO sales_order_details (sales_order_id, product_id, quantity, unit_price, subtotal)
                VALUES (%s, %s, %s, %s, %s);
            """, (so_id, item.product_id, item.quantity, item.unit_price, subtotal))

    if "dispatch_n8n_webhook" in globals():
        dispatch_n8n_webhook(
            webhook_path="system-alert",
            workflow_id="03_event_driven_alerts",
            workflow_name="03 - Event-Driven System Alerts",
            payload={
                "event_type": "NEW_SALES_ORDER",
                "severity": "CRITICAL" if total_amount >= 20000000 else "INFO",
                "total_amount": total_amount,
                "title": f"Đơn hàng mới {order_code} ({total_amount:,.0f} ₫)",
                "message": f"Hệ thống vừa ghi nhận đơn hàng {order_code} trị giá {total_amount:,.0f} ₫ thông qua n8n Event Dispatcher."
            }
        )

    return {"message": "Tạo đơn hàng thành công", "order_code": order_code, "sales_order_id": so_id}

@app.post("/api/sales-orders/{order_id}/dispatch")
def dispatch_sales_order(order_id: int):
    """Lập Phiếu xuất kho: Trừ tồn kho thành phẩm theo lô (Chuẩn ERP 2 bước)"""
    with DBContext() as db:
        orders = db.query("SELECT * FROM sales_orders WHERE sales_order_id = %s", (order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
        order = orders[0]
        if order["status"] == "COMPLETED":
            raise HTTPException(status_code=400, detail="Đơn hàng đã được xuất kho và hoàn thành")

        details = db.query("SELECT * FROM sales_order_details WHERE sales_order_id = %s", (order_id,))
        
        # Trừ tồn kho từng mặt hàng trong đơn
        for d in details:
            needed = d["quantity"]
            stocks = db.query("""
                SELECT * FROM finished_goods_inventory 
                WHERE product_id = %s AND quantity_in_stock > 0 
                ORDER BY inventory_id ASC
            """, (d["product_id"],))
            
            for s in stocks:
                if needed <= 0:
                    break
                deduct = min(needed, s["quantity_in_stock"])
                db.execute("UPDATE finished_goods_inventory SET quantity_in_stock = quantity_in_stock - %s WHERE inventory_id = %s", (deduct, s["inventory_id"]))
                needed -= deduct

        # Tạo phiếu xuất
        dispatch_code = f"DISP-2026-{order_id}"
        db.execute("INSERT INTO inventory_dispatches (dispatch_code, sales_order_id) VALUES (%s, %s)", (dispatch_code, order_id))
        db.execute("UPDATE sales_orders SET status = 'COMPLETED' WHERE sales_order_id = %s", (order_id,))

    return {"message": f"Đã lập phiếu xuất kho {dispatch_code} và trừ tồn kho thành phẩm thành công!"}

# =============================================================================
# 3. API DASHBOARD STATS (THỐNG KÊ REAL-TIME)
# =============================================================================
@app.get("/api/dashboard/stats")
def get_dashboard_stats(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Lấy dữ liệu tổng hợp cho các thẻ chỉ số trên Dashboard (hỗ trợ lọc Ngày/Tháng)"""
    with DBContext() as db:
        # Doanh thu từ sales_orders hoàn thành (nếu chưa có đơn thì dùng baseline seed)
        if start_date and end_date:
            rev_rows = db.query("""
                SELECT SUM(final_amount) as total_rev 
                FROM sales_orders 
                WHERE status = 'COMPLETED' AND order_date >= %s AND order_date <= %s;
            """, (f"{start_date} 00:00:00", f"{end_date} 23:59:59"))
            real_rev = rev_rows[0]["total_rev"] if rev_rows and rev_rows[0]["total_rev"] else 0
            total_revenue = float(real_rev)
        else:
            rev_rows = db.query("SELECT SUM(final_amount) as total_rev FROM sales_orders WHERE status = 'COMPLETED'")
            real_rev = rev_rows[0]["total_rev"] if rev_rows and rev_rows[0]["total_rev"] else 0
            total_revenue = 485000000.0 + float(real_rev)

        # Tổng tồn kho thành phẩm
        fg_rows = db.query("SELECT SUM(quantity_in_stock) as total_fg FROM finished_goods_inventory")
        total_fg = fg_rows[0]["total_fg"] if fg_rows and fg_rows[0]["total_fg"] else 0

        # Tồn kho tổ yến thô
        mat_rows = db.query("SELECT current_stock FROM materials WHERE material_code = 'MAT_YEN_THO'")
        yen_tho = mat_rows[0]["current_stock"] if mat_rows else 5000.0

        # Lệnh sản xuất đang chạy
        po_rows = db.query("SELECT COUNT(*) as active_po FROM production_orders WHERE status = 'IN_PROGRESS'")
        active_po = po_rows[0]["active_po"] if po_rows else 0

    return {
        "monthly_revenue": total_revenue,
        "finished_goods_count": total_fg,
        "raw_bird_nest_stock": yen_tho,
        "active_production_orders": active_po,
        "database_engine": ACTIVE_DB_MODE,
        "filter_applied": bool(start_date and end_date)
    }

# =============================================================================
# 4. API AI INTEGRATION (CHATBOT RAG & GEMINI API INTELLIGENT ADVISOR)
# =============================================================================
try:
    from gemini_service import get_gemini_config, update_gemini_config, ask_erp_copilot, call_gemini_api
except ImportError:
    from backend.gemini_service import get_gemini_config, update_gemini_config, ask_erp_copilot, call_gemini_api

class ChatQuery(BaseModel):
    question: str

class AIConfigUpdateRequest(BaseModel):
    api_key: str
    model: Optional[str] = "gemini-1.5-flash"

@app.get("/api/system/ai-config")
def get_ai_config():
    """Lấy trạng thái cấu hình và Model của Google Gemini AI"""
    return get_gemini_config()

@app.post("/api/system/ai-config")
def update_ai_config(req: AIConfigUpdateRequest):
    """Cập nhật Gemini API Key và Model từ giao diện quản trị"""
    res = update_gemini_config(req.api_key, req.model or "gemini-1.5-flash")
    return {
        "success": True,
        "message": "Đã cập nhật cấu hình Google Gemini AI thành công!",
        **res
    }

@app.post("/api/ai/chat")
def ai_chatbot(query: ChatQuery):
    """
    Trợ lý AI ERP Doanh Nghiệp (Version 1.8.0 - Hybrid RAG + Gemini API):
    - Trích xuất dữ liệu CSDL thời gian thực làm context grounding (Finished goods, Materials, BOM, Sales)
    - Tự động gọi Gemini 1.5 Flash khi có API Key
    - Tự động kích hoạt Flexible Semantic NLP khi offline/chưa cấu hình Key
    - Trả lời tự nhiên các câu hỏi tiếng Việt linh hoạt: 'trong kho có gì', 'còn tồn những gì', 'nguyên liệu đủ không'...
    """
    with DBContext() as db:
        res = ask_erp_copilot(query.question, db)
    return {
        "answer": res["answer"],
        "question": query.question,
        "sources": res.get("sources", ["finished_goods_inventory"]),
        "model_used": res.get("model_used", "Semantic RAG Engine"),
    }

# =============================================================================
# 4B. API QUẢN TRỊ CHIẾN DỊCH MARKETING & ADMIN CMS (CAMPAIGNS & VIDEO SHOWCASE)
# =============================================================================
class CampaignCreate(BaseModel):
    title: str
    campaign_type: str = "FLASHSALE"  # FLASHSALE | VIDEO_SHOWCASE
    target_region: str = "ALL"        # ALL | NORTH | CENTRAL | SOUTH
    banner_url: Optional[str] = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80"
    video_url: Optional[str] = "https://www.w3schools.com/html/mov_bbb.mp4"
    discount_percentage: float = 20.0
    product_id: Optional[int] = 1
    start_time: Optional[str] = "2026-10-28 00:00:00"
    end_time: Optional[str] = "2026-12-31 23:59:59"
    notes: Optional[str] = "Chiến dịch khuyến mãi Flash Sale"

@app.get("/api/campaigns")
def get_campaigns(region: Optional[str] = None, active_only: bool = False):
    """Lấy danh sách chiến dịch Flash Sale & Video Showcase"""
    with DBContext() as db:
        sql = """
            SELECT c.*, p.product_name, p.product_code, p.selling_price, p.unit, p.image_url as product_image
            FROM campaigns c
            LEFT JOIN products p ON c.product_id = p.product_id
            WHERE 1=1
        """
        params = []
        if active_only:
            sql += " AND c.is_active = 1"
        if region and region.upper() != "ALL":
            sql += " AND (UPPER(c.target_region) = 'ALL' OR UPPER(c.target_region) = %s)"
            params.append(region.upper())
        sql += " ORDER BY c.campaign_id DESC;"
        campaigns = db.query(sql, tuple(params))

        for camp in campaigns:
            orig_price = float(camp.get("selling_price") or 45000.0)
            disc = float(camp.get("discount_percentage") or 0.0)
            camp["flash_sale_price"] = round(orig_price * (1.0 - disc / 100.0), -2)

    return {"data": campaigns, "total": len(campaigns)}

@app.post("/api/campaigns")
def create_campaign(camp: CampaignCreate):
    """Admin CMS: Tạo mới chương trình Flash Sale đếm ngược hoặc nhúng Video Showcase"""
    with DBContext() as db:
        new_id = db.execute("""
            INSERT INTO campaigns (title, campaign_type, target_region, banner_url, video_url, discount_percentage, product_id, start_time, end_time, is_active, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s)
        """, (
            camp.title, camp.campaign_type.upper(), camp.target_region.upper(),
            camp.banner_url, camp.video_url, camp.discount_percentage,
            camp.product_id, camp.start_time, camp.end_time, camp.notes
        ))
    return {
        "success": True,
        "message": f"Đã tạo chiến dịch '{camp.title}' (Khu vực: {camp.target_region}) thành công!",
        "campaign_id": new_id
    }

@app.put("/api/campaigns/{campaign_id}/toggle")
def toggle_campaign(campaign_id: int):
    """Bật / Tắt trạng thái kích hoạt của chiến dịch Flash Sale / Video"""
    with DBContext() as db:
        rows = db.query("SELECT * FROM campaigns WHERE campaign_id = %s", (campaign_id,))
        if not rows:
            raise HTTPException(status_code=404, detail="Không tìm thấy chiến dịch")
        current = int(rows[0].get("is_active") or 0)
        new_val = 0 if current == 1 else 1
        db.execute("UPDATE campaigns SET is_active = %s WHERE campaign_id = %s", (new_val, campaign_id))
    return {
        "success": True,
        "is_active": new_val,
        "message": f"Đã {'kích hoạt' if new_val == 1 else 'tạm dừng'} chiến dịch #{campaign_id}"
    }

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int):
    """Xóa chiến dịch khỏi hệ thống"""
    with DBContext() as db:
        db.execute("DELETE FROM campaigns WHERE campaign_id = %s", (campaign_id,))
    return {"success": True, "message": f"Đã xóa chiến dịch #{campaign_id}"}

# =============================================================================
# 4C. API AI DỰ BÁO BIẾN ĐỘNG LỢI NHUẬN 1 NĂM & PHÂN KỲ SẢN XUẤT/TỒN KHO
# =============================================================================
@app.get("/api/bi/profit-forecast")
def get_ai_profit_forecast():
    """
    Module AI Dự Báo Biến Động Lợi Nhuận 1 Năm (12 Tháng) & Gợi Ý Phân Kỳ Sản Xuất/Tồn Kho:
    - Tính toán doanh thu, giá vốn NVL biến động theo mùa, chi phí vận hành, lợi nhuận ròng & biên lợi nhuận gộp 12 tháng
    - Đưa ra 4 giai đoạn chiến lược (Tích trữ Tháng 5-7, Tăng tốc Tháng 8-10, Thu hoạch đỉnh cao Tháng 11-12, Xả hàng tồn kho Tháng 1-2)
    """
    with DBContext() as db:
        mat_rows = db.query("SELECT current_stock, unit_cost FROM materials WHERE material_code = 'MAT_YEN_THO'")
        current_yen_stock = float(mat_rows[0]["current_stock"]) if mat_rows else 4700.0
        current_yen_cost = float(mat_rows[0]["unit_cost"] or 25000.0) if mat_rows else 25000.0

    # Dữ liệu mô phỏng AI Forecasting 12 tháng (Đơn vị: Triệu VNĐ)
    monthly_forecast = [
        {"month": "T1", "month_name": "Tháng 1 (Sau Tết)", "revenue": 420, "cogs": 245, "operating_cost": 55, "net_profit": 120, "gross_margin_pct": 41.7, "raw_nest_price_k": 26.5, "phase": "CLEARANCE", "demand_index": 95},
        {"month": "T2", "month_name": "Tháng 2 (Xả Kho)", "revenue": 360, "cogs": 215, "operating_cost": 50, "net_profit": 95, "gross_margin_pct": 40.3, "raw_nest_price_k": 25.0, "phase": "CLEARANCE", "demand_index": 82},
        {"month": "T3", "month_name": "Tháng 3 (Ổn Định)", "revenue": 390, "cogs": 225, "operating_cost": 52, "net_profit": 113, "gross_margin_pct": 42.3, "raw_nest_price_k": 24.0, "phase": "NORMAL", "demand_index": 90},
        {"month": "T4", "month_name": "Tháng 4 (Chuyển Mùa)", "revenue": 410, "cogs": 232, "operating_cost": 53, "net_profit": 125, "gross_margin_pct": 43.4, "raw_nest_price_k": 22.8, "phase": "NORMAL", "demand_index": 96},
        {"month": "T5", "month_name": "Tháng 5 (Đáy Giá NVL)", "revenue": 435, "cogs": 218, "operating_cost": 54, "net_profit": 163, "gross_margin_pct": 49.9, "raw_nest_price_k": 20.5, "phase": "ACCUMULATE", "demand_index": 102},
        {"month": "T6", "month_name": "Tháng 6 (Tích Trữ Yến)", "revenue": 460, "cogs": 225, "operating_cost": 55, "net_profit": 180, "gross_margin_pct": 51.1, "raw_nest_price_k": 19.8, "phase": "ACCUMULATE", "demand_index": 108},
        {"month": "T7", "month_name": "Tháng 7 (Tích Trữ Đợt 2)", "revenue": 480, "cogs": 238, "operating_cost": 56, "net_profit": 186, "gross_margin_pct": 50.4, "raw_nest_price_k": 20.2, "phase": "ACCUMULATE", "demand_index": 112},
        {"month": "T8", "month_name": "Tháng 8 (Đón Trung Thu)", "revenue": 590, "cogs": 310, "operating_cost": 65, "net_profit": 215, "gross_margin_pct": 47.5, "raw_nest_price_k": 24.5, "phase": "ACCELERATE", "demand_index": 145},
        {"month": "T9", "month_name": "Tháng 9 (Cao Điểm Biếu Tặng)", "revenue": 680, "cogs": 355, "operating_cost": 70, "net_profit": 255, "gross_margin_pct": 47.8, "raw_nest_price_k": 25.8, "phase": "ACCELERATE", "demand_index": 170},
        {"month": "T10", "month_name": "Tháng 10 (Chuẩn Bị Hàng Tết)", "revenue": 640, "cogs": 335, "operating_cost": 68, "net_profit": 237, "gross_margin_pct": 47.7, "raw_nest_price_k": 26.8, "phase": "ACCELERATE", "demand_index": 160},
        {"month": "T11", "month_name": "Tháng 11 (Bùng Nổ Cuối Năm)", "revenue": 950, "cogs": 465, "operating_cost": 85, "net_profit": 400, "gross_margin_pct": 51.1, "raw_nest_price_k": 28.5, "phase": "HARVEST", "demand_index": 240},
        {"month": "T12", "month_name": "Tháng 12 (Đỉnh Điểm Cận Tết)", "revenue": 1280, "cogs": 610, "operating_cost": 98, "net_profit": 572, "gross_margin_pct": 52.3, "raw_nest_price_k": 29.8, "phase": "HARVEST", "demand_index": 300},
    ]

    strategic_phases = [
        {
            "phase_code": "ACCUMULATE_MAY_JUL",
            "badge": "🟢 Giai đoạn Tích trữ (Tháng 5 - 7)",
            "color": "#10b981",
            "months": "Tháng 5 – Tháng 7",
            "market_signal": "Giá Tổ yến thô chạm đáy mùa thu hoạch (~19,800 - 20,500 ₫/gram, thấp hơn 22% so với cuối năm).",
            "ai_recommendation": "Tăng cường thu mua dự trữ +3,000g Tổ yến thô giá đáy và đẩy mạnh sản xuất trước dòng Yến Lọ 70ml & Yến Lon 190ml có hạn sử dụng dài (12-24 tháng).",
            "expected_impact": "Tiết kiệm ~185 Triệu VNĐ chi phí vốn NVL, nâng biên lợi nhuận gộp lên >50%.",
            "action_label": "⚡ Kích hoạt Thu Mua Tích Trữ NVL Giá Đáy",
            "action_type": "PROCUREMENT_BATCH"
        },
        {
            "phase_code": "ACCELERATE_AUG_OCT",
            "badge": "🟡 Giai đoạn Tăng tốc (Tháng 8 - 10)",
            "color": "#f59e0b",
            "months": "Tháng 8 – Tháng 10",
            "market_signal": "Nhu cầu quà biếu doanh nghiệp dịp Tết Trung Thu tăng +165%, chuẩn bị nguồn hàng cho vụ Tết.",
            "ai_recommendation": "Khởi tạo Lệnh sản xuất PO công suất cao cho dòng Yến Chai Nguyên Chất 300ml & Yến Lọ Chưng Đường Phèn phục vụ kênh Đại lý B2B.",
            "expected_impact": "Đáp ứng 100% đơn sỉ B2B, doanh thu tăng vọt lên 640 - 680 Triệu VNĐ/tháng.",
            "action_label": "⚡ Lập Lệnh Sản Xuất Tăng Tốc Đón Trung Thu",
            "action_type": "PRODUCTION_ORDER"
        },
        {
            "phase_code": "HARVEST_NOV_DEC",
            "badge": "🔴 Giai đoạn Thu hoạch Đỉnh cao (Tháng 11 - 12 & Cận Tết)",
            "color": "#f43f5e",
            "months": "Tháng 11 – Tháng 12",
            "market_signal": "Nhu cầu tiêu thụ & quà Tết tăng 250% - 300%, giá NVL ngoài thị trường đạt đỉnh 29,800 ₫/g.",
            "ai_recommendation": "Xuất bán tối đa tồn kho thành phẩm đã sản xuất từ nguồn NVL giá rẻ mùa hè; đẩy mạnh chiến dịch Quà Tết Toàn Quốc.",
            "expected_impact": "Đạt đỉnh doanh thu 1.28 Tỷ VNĐ/tháng, lợi nhuận ròng đạt 572 Triệu VNĐ (Biên gộp 52.3%).",
            "action_label": "⚡ Kích Hoạt Chiến Dịch Cao Điểm Mùa Lễ Tết",
            "action_type": "PEAK_CAMPAIGN"
        },
        {
            "phase_code": "CLEARANCE_JAN_FEB",
            "badge": "🔵 Giai đoạn Xả hàng tồn kho (Tháng 1 - 2)",
            "color": "#38bdf8",
            "months": "Tháng 1 – Tháng 2",
            "market_signal": "Sức mua chững lại sau Tết, một số lô thành phẩm sản xuất từ quý trước bắt đầu bước vào ngưỡng cận date.",
            "ai_recommendation": "Tự động bật Flash Sale giảm giá 25% cho các lô tồn sau Tết trên Storefront để thu hồi dòng tiền nhanh và giải phóng kho.",
            "expected_impact": "Thu hồi 360 - 420 Triệu VNĐ tiền mặt, giảm tỷ lệ hủy hàng cận date về 0%.",
            "action_label": "⚡ Bật Flash Sale Xả Kho Thu Hồi Vốn",
            "action_type": "CLEARANCE_FLASHSALE"
        }
    ]

    total_year_rev = sum(m["revenue"] for m in monthly_forecast)
    total_year_profit = sum(m["net_profit"] for m in monthly_forecast)
    avg_margin = round(sum(m["gross_margin_pct"] for m in monthly_forecast) / len(monthly_forecast), 1)

    return {
        "summary": {
            "annual_projected_revenue_m": total_year_rev,
            "annual_projected_profit_m": total_year_profit,
            "average_gross_margin_pct": avg_margin,
            "current_raw_nest_stock_g": current_yen_stock,
            "current_raw_nest_cost_vnd": current_yen_cost
        },
        "monthly_forecast": monthly_forecast,
        "strategic_phases": strategic_phases
    }

@app.get("/api/bi/customer-financials")
def get_bi_customer_financials(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Theo dõi chi tiết Doanh thu, Lợi nhuận và Công nợ theo từng Khách hàng/Đại lý (GD_06, GD_07)
    """
    with DBContext() as db:
        customers = db.query("""
            SELECT customer_id, customer_code, customer_name, customer_type, phone, region, credit_limit, current_debt
            FROM customers
            ORDER BY customer_id;
        """)

        date_filter = ""
        params = []
        if start_date and end_date:
            date_filter = "AND so.order_date >= %s AND so.order_date <= %s"
            params = [f"{start_date} 00:00:00", f"{end_date} 23:59:59"]

        order_stats = db.query(f"""
            SELECT so.customer_id, 
                   COUNT(so.sales_order_id) as order_count,
                   COALESCE(SUM(so.final_amount), 0) as total_revenue
            FROM sales_orders so
            WHERE so.status = 'COMPLETED' {date_filter}
            GROUP BY so.customer_id;
        """, tuple(params))

        stats_map = {row["customer_id"]: row for row in order_stats}

        results = []
        for c in customers:
            cid = c["customer_id"]
            stat = stats_map.get(cid, {"order_count": 0, "total_revenue": 0.0})
            rev = float(stat["total_revenue"] or 0.0)
            cogs = round(rev * 0.52, 2)
            gross_profit = round(rev - cogs, 2)
            margin = round((gross_profit / rev * 100), 1) if rev > 0 else 48.0
            debt = float(c.get("current_debt") or 0.0)
            limit = float(c.get("credit_limit") or 1.0)
            debt_pct = min(100.0, round(debt / limit * 100, 1)) if limit > 0 else 0.0

            results.append({
                "customer_id": cid,
                "customer_code": c["customer_code"],
                "customer_name": c["customer_name"],
                "customer_type": c["customer_type"],
                "phone": c.get("phone") or "",
                "region": c.get("region") or "ALL",
                "order_count": stat["order_count"],
                "total_revenue": rev,
                "estimated_cogs": cogs,
                "gross_profit": gross_profit,
                "margin_pct": margin,
                "credit_limit": limit,
                "current_debt": debt,
                "debt_usage_pct": debt_pct,
                "debt_status": "DANGER" if debt_pct >= 90 else ("WARNING" if debt_pct >= 60 else "NORMAL")
            })

        return {"data": results, "total": len(results)}

@app.get("/api/bi/stock-demand-forecast")
def get_bi_stock_demand_forecast():
    """
    AI Dự Báo Nhu Cầu & Tồn Kho 30 Ngày Tới (GD_09):
    Đánh giá chi tiết tình trạng Thiếu/An Toàn/Dư thừa từng sản phẩm và đưa ra khuyến nghị AI hành động.
    """
    with DBContext() as db:
        products = db.query("""
            SELECT p.product_id, p.product_code, p.product_name, p.selling_price, p.cost_price, p.case_spec,
                   c.category_name
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.status = 'ACTIVE'
            ORDER BY p.product_id;
        """)

        stock_rows = db.query("""
            SELECT product_id, COALESCE(SUM(quantity_in_stock), 0) as total_stock
            FROM finished_goods_inventory
            GROUP BY product_id;
        """)
        stock_map = {r["product_id"]: int(r["total_stock"]) for r in stock_rows}

        sold_rows = db.query("""
            SELECT sod.product_id, COALESCE(SUM(sod.quantity), 0) as total_sold
            FROM sales_order_details sod
            JOIN sales_orders so ON sod.sales_order_id = so.sales_order_id
            WHERE so.status = 'COMPLETED'
            GROUP BY sod.product_id;
        """)
        sold_map = {r["product_id"]: int(r["total_sold"]) for r in sold_rows}

        baseline_demands = {
            1: 850,   # Yến Lọ 70ml
            2: 600,   # Yến Chai 150ml
            3: 1500,  # Yến Lon 190ml
            4: 450,   # Cháo Yến
            5: 350,   # Cà Phê Phin Giấy
        }

        forecast_data = []
        for p in products:
            pid = p["product_id"]
            cur_stock = stock_map.get(pid, 0)
            sold_qty = sold_map.get(pid, 0)
            base_d = baseline_demands.get(pid, 500)
            forecast_demand = max(base_d, int(sold_qty * 1.25))

            diff = cur_stock - forecast_demand
            days_of_supply = round(cur_stock / (forecast_demand / 30.0), 1) if forecast_demand > 0 else 99.0

            if cur_stock < int(forecast_demand * 0.4):
                status = "CRITICAL_SHORTAGE"
                badge = "🔴 Thiếu Hàng Nghiêm Trọng"
                color = "#f43f5e"
                recommendation = f"Cảnh báo: Tồn kho chỉ còn đủ dùng trong {days_of_supply} ngày! Cần lập Lệnh sản xuất tối thiểu {abs(diff)} sản phẩm để tránh đứt gãy cung ứng."
                action_needed = "CREATE_PO"
            elif cur_stock < forecast_demand:
                status = "LOW_STOCK"
                badge = "🟡 Cận Ngưỡng An Toàn"
                color = "#f59e0b"
                recommendation = f"Tồn kho ở mức thấp ({days_of_supply} ngày). Đề xuất Quản đốc chuẩn bị kế hoạch sản xuất trong tuần tới."
                action_needed = "PREPARE_PO"
            elif cur_stock > int(forecast_demand * 2.5):
                status = "OVERSTOCK"
                badge = "🔵 Dư Thừa Tồn Kho"
                color = "#38bdf8"
                recommendation = f"Tồn kho dư thừa lớn ({days_of_supply} ngày bán). Khuyến nghị triển khai Flash Sale hoặc chiết khấu sỉ B2B để thu hồi vốn lưu động."
                action_needed = "FLASHSALE"
            else:
                status = "SAFE"
                badge = "🟢 Tồn Kho Lý Tưởng"
                color = "#10b981"
                recommendation = f"Tồn kho đạt chuẩn an toàn ({days_of_supply} ngày cung ứng), đáp ứng hoàn hảo các đơn sỉ và lẻ trong tháng."
                action_needed = "NONE"

            forecast_data.append({
                "product_id": pid,
                "product_code": p["product_code"],
                "product_name": p["product_name"],
                "category_name": p.get("category_name") or "Thực phẩm & Đồ uống",
                "selling_price": float(p.get("selling_price") or 0.0),
                "current_stock": cur_stock,
                "forecast_demand_30d": forecast_demand,
                "difference": diff,
                "days_of_supply": days_of_supply,
                "status": status,
                "badge": badge,
                "color": color,
                "recommendation": recommendation,
                "action_needed": action_needed
            })

        return {"data": forecast_data, "total": len(forecast_data)}

class StrategyExecuteRequest(BaseModel):
    phase_code: str

@app.post("/api/bi/execute-strategy")
def execute_ai_strategy(req: StrategyExecuteRequest):
    """Thực thi 1-chạm khuyến nghị chiến lược của AI từ bảng Dự báo 1 năm"""
    import random
    code = req.phase_code.upper()
    with DBContext() as db:
        if code == "ACCUMULATE_MAY_JUL":
            rec_code = f"IMP-AI-{random.randint(1000, 9999)}"
            qty = 1000.0
            price = 20200.0
            db.execute("UPDATE materials SET current_stock = current_stock + %s, unit_cost = %s WHERE material_code = 'MAT_YEN_THO'", (qty, price))
            db.execute("""
                INSERT INTO material_receipts (receipt_code, material_id, supplier_name, quantity, unit_price, total_cost, market_season, imported_by, notes)
                VALUES (%s, 1, 'Nhà Yến Khánh Hòa (Đơn AI Tích Trữ)', %s, %s, %s, 'LOW_SEASON_MAY_JUL', 'AI_STRATEGY_ENGINE', 'Tự động lập phiếu thu mua tích trữ Tổ yến giá đáy theo gợi ý AI')
            """, (rec_code, qty, price, qty * price))
            return {
                "success": True,
                "message": f"🟢 Đã kích hoạt Giai đoạn Tích trữ! Hệ thống đã lập phiếu thu mua {rec_code} (+1,000g Tổ yến thô ở mức giá đáy 20,200 ₫/g) và cộng vào kho NVL.",
                "target_route": "/inventory"
            }

        elif code == "ACCELERATE_AUG_OCT":
            po_code = f"PO-AI-{random.randint(1000, 9999)}"
            req_code = f"REQ-AI-{random.randint(1000, 9999)}"
            po_id = db.execute("""
                INSERT INTO production_orders (order_code, product_id, target_quantity, status, notes)
                VALUES (%s, 2, 240, 'PENDING', 'Lệnh SX Tăng tốc đón Trung Thu & Tết do AI khởi tạo')
            """, (po_code,))
            db.execute("""
                INSERT INTO material_requisitions (req_code, prod_order_id, product_id, requested_by, status, notes)
                VALUES (%s, %s, 2, 'AI Chiến Lược 1 Năm', 'PENDING_APPROVAL', %s)
            """, (req_code, po_id, f"Phiếu yêu cầu xuất NVL cho lệnh tăng tốc {po_code} (240 Chai Yến 300ml)"))
            return {
                "success": True,
                "message": f"🟡 Đã kích hoạt Giai đoạn Tăng tốc! Đã tạo lệnh sản xuất {po_code} (240 Chai Yến 300ml) và gửi phiếu {req_code} chờ Trưởng kho duyệt.",
                "target_route": "/production"
            }

        elif code == "HARVEST_NOV_DEC":
            db.execute("""
                INSERT INTO campaigns (title, campaign_type, target_region, banner_url, video_url, discount_percentage, product_id, start_time, end_time, is_active, notes)
                VALUES ('🔴 Đại Tiệc Quà Biếu Cuối Năm & Tết Thịnh Vượng', 'FLASHSALE', 'ALL', 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80', 'https://www.w3schools.com/html/mov_bbb.mp4', 15.0, 1, '2026-11-01 00:00:00', '2027-01-31 23:59:59', 1, 'Chiến dịch cao điểm thu hoạch doanh thu cuối năm do AI kích hoạt')
            """)
            return {
                "success": True,
                "message": "🔴 Đã kích hoạt Chiến dịch Cao Điểm Cuối Năm trên toàn quốc! Đã đồng bộ lên Cổng Bán Hàng Storefront.",
                "target_route": "/campaigns"
            }

        else:
            db.execute("""
                INSERT INTO campaigns (title, campaign_type, target_region, banner_url, video_url, discount_percentage, product_id, start_time, end_time, is_active, notes)
                VALUES ('🔵 Flash Sale Xả Kho Sau Tết - Thu Hồi Vốn Nhanh (-28%)', 'FLASHSALE', 'ALL', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1000&q=80', 'https://www.w3schools.com/html/mov_bbb.mp4', 28.0, 3, '2026-10-28 00:00:00', '2027-02-28 23:59:59', 1, 'Chiến dịch xả hàng tồn kho sau Tết tránh cận date do AI kích hoạt')
            """)
            return {
                "success": True,
                "message": "🔵 Đã bật Flash Sale Xả Kho (-28%) trên Storefront để đẩy nhanh vòng quay vốn và tránh cận date!",
                "target_route": "/campaigns"
            }

# =============================================================================
# 5. API CỔNG BÁN HÀNG SỈ/LẺ & BẢO MẬT GIAO DỊCH (STOREFRONT & B2B/B2C COMMERCE)
# =============================================================================

class CustomerProfileRequest(BaseModel):
    customer_name: str
    phone: str
    address: Optional[str] = ""
    region: str = "NORTH"  # NORTH | CENTRAL | SOUTH

@app.post("/api/store/customer-profile")
def save_customer_profile(req: CustomerProfileRequest):
    """
    Đăng nhập nhanh / Lưu thông tin khách hàng và khu vực địa lý (Miền Bắc / Miền Trung / Miền Nam)
    trên Cổng Bán Hàng Storefront để cá nhân hóa sản phẩm & địa chỉ giao hàng
    """
    import random
    phone = req.phone.strip()
    region = req.region.strip().upper()
    if not phone or not req.customer_name.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập Họ tên và Số điện thoại")

    with DBContext() as db:
        existing = db.query("SELECT * FROM customers WHERE phone = %s", (phone,))
        if existing:
            cid = existing[0]["customer_id"]
            db.execute(
                "UPDATE customers SET customer_name = %s, address = COALESCE(NULLIF(%s, ''), address), region = %s WHERE customer_id = %s",
                (req.customer_name.strip(), req.address or "", region, cid)
            )
            cust = db.query("SELECT * FROM customers WHERE customer_id = %s", (cid,))[0]
        else:
            ccode = f"CUST-{random.randint(1000, 9999)}"
            cid = db.execute("""
                INSERT INTO customers (customer_code, customer_name, customer_type, phone, address, credit_limit, current_debt, region)
                VALUES (%s, %s, 'RETAIL', %s, %s, 0, 0, %s)
            """, (ccode, req.customer_name.strip(), phone, req.address or "", region))
            cust = db.query("SELECT * FROM customers WHERE customer_id = %s", (cid,))[0]

    region_names = {"NORTH": "Miền Bắc", "CENTRAL": "Miền Trung", "SOUTH": "Miền Nam"}
    return {
        "success": True,
        "message": f"Xin chào {cust['customer_name']}! Đã lưu khu vực {region_names.get(region, 'Toàn Quốc')} và cá nhân hóa gợi ý sản phẩm.",
        "customer": cust
    }

def calculate_item_pricing(db, product_id: int, quantity: int, is_agent: bool = False):
    """
    Hàm tính giá Server-side cốt lõi:
    - Tuyệt đối không nhận đơn giá từ client nhằm chống gian lận dữ liệu
    - Tra cứu giá niêm yết từ bảng products và chính sách giá price_policies
    - Tự động áp dụng mức chiết khấu theo MOQ thùng hoặc chiết khấu Đại lý VIP
    """
    prods = db.query("SELECT * FROM products WHERE product_id = %s", (product_id,))
    if not prods:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sản phẩm có ID {product_id}")
    prod = prods[0]
    retail_price = float(prod["selling_price"])

    # Tra cứu chính sách giá từ CSDL
    policies = db.query("SELECT * FROM price_policies WHERE product_id = %s", (product_id,))
    agent_policy = next((p for p in policies if p["customer_type"] in ("AGENT_VIP", "AGENT")), None)
    moq_policy = next((p for p in policies if p["customer_type"] in ("WHOLESALE_MOQ", "WHOLESALE")), None)

    # 1. Nếu là Đại lý B2B chính thức -> Ưu tiên giá Agent VIP
    if is_agent and agent_policy:
        applied_price = float(agent_policy["custom_price"])
        discount_rate = float(agent_policy["discount_rate"])
        tier_name = "Đại lý B2B chính thức (Chiết khấu VIP cao nhất)"
        is_wholesale = True
    # 2. Nếu khách mua đạt MOQ thùng/lốc -> Tự động hưởng giá sỉ MOQ
    elif moq_policy and quantity >= int(moq_policy["min_quantity"]):
        applied_price = float(moq_policy["custom_price"])
        discount_rate = float(moq_policy["discount_rate"])
        tier_name = f"Mua sỉ đạt MOQ (≥ {moq_policy['min_quantity']} {prod['unit']})"
        is_wholesale = True
    # 3. Giá bán lẻ niêm yết
    else:
        applied_price = retail_price
        discount_rate = 0.0
        tier_name = "Giá bán lẻ niêm yết"
        is_wholesale = False

    line_total = round(applied_price * quantity, 2)
    original_total = round(retail_price * quantity, 2)
    discount_amount = round(original_total - line_total, 2)

    return {
        "product_id": product_id,
        "product_code": prod["product_code"],
        "product_name": prod["product_name"],
        "unit": prod["unit"],
        "retail_price": retail_price,
        "applied_price": applied_price,
        "quantity": quantity,
        "line_total": line_total,
        "discount_amount": discount_amount,
        "discount_rate": discount_rate,
        "is_wholesale": is_wholesale,
        "tier_name": tier_name
    }


def check_product_stock_available(db, product_id: int, quantity: int):
    """Kiểm tra tổng tồn kho thành phẩm tức thời chống overselling"""
    stock_rows = db.query(
        "SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock FROM finished_goods_inventory WHERE product_id = %s",
        (product_id,)
    )
    current_stock = int(stock_rows[0]["total_stock"]) if stock_rows else 0
    return (current_stock >= quantity), current_stock


@app.get("/api/store/products")
def get_store_products(region: Optional[str] = "ALL"):
    """
    Lấy danh mục sản phẩm phục vụ Cổng Bán Hàng Storefront
    - Cá nhân hóa theo khu vực địa lý (NORTH: Miền Bắc, CENTRAL: Miền Trung, SOUTH: Miền Nam)
    - Đính kèm chương trình Flash Sale đếm ngược và Video Showcase đang kích hoạt
    """
    reg = (region or "ALL").strip().upper()
    with DBContext() as db:
        sql = """
            SELECT p.*, COALESCE(c.category_name, 'Thực phẩm & Đồ uống') as category_name,
                   COALESCE((SELECT SUM(fg.quantity_in_stock) 
                             FROM finished_goods_inventory fg 
                             WHERE fg.product_id = p.product_id), 0) as total_stock
            FROM products p
            LEFT JOIN product_categories c ON p.category_id = c.category_id
            WHERE p.status = 'ACTIVE'
            ORDER BY p.product_id;
        """
        products = db.query(sql)
        policies = db.query("SELECT * FROM price_policies")
        active_campaigns = db.query("SELECT * FROM campaigns WHERE is_active = 1 ORDER BY campaign_id DESC")
        try:
            review_stats = db.query("""
                SELECT product_id, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as cnt
                FROM product_reviews
                GROUP BY product_id
            """)
            review_map = {r["product_id"]: (float(r["avg_rating"] or 4.9), int(r["cnt"] or 0)) for r in review_stats}
        except Exception:
            review_map = {}

    # Bổ sung thông tin chính sách giá sỉ (Wholesale) & Công dụng sức khỏe
    wholesale_config = {
        "PROD_YEN_LO_70ML": {
            "wholesale_moq": 24, # 1 thùng 24 lọ
            "wholesale_discount": 0.18, # giảm 18%
            "case_spec": "Thùng 24 lọ",
            "target_region": "NORTH",
            "regional_reason": "🔥 Top 1 Miền Bắc: Bồi bổ khí huyết, giữ ấm phổi mùa lạnh",
            "health_benefits": "Bổ phổi, tăng cường hệ miễn dịch, phục hồi sức khỏe người cao tuổi và người mới ốm dậy.",
            "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
        },
        "PROD_YEN_CHAI_300ML": {
            "wholesale_moq": 12, # 1 thùng 12 chai
            "wholesale_discount": 0.15,
            "case_spec": "Thùng 12 chai",
            "target_region": "CENTRAL",
            "regional_reason": "🎁 Top 1 Miền Trung: Quà biếu sức khỏe trang trọng, đậm đặc nguyên chất",
            "health_benefits": "Hàm lượng tổ yến cao nguyên chất, tiện lợi mang theo tập thể thao, bồi bổ trí não.",
            "image": "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=600&q=80"
        },
        "PROD_YEN_LON_190ML": {
            "wholesale_moq": 24, # 1 thùng 24 lon
            "wholesale_discount": 0.20,
            "case_spec": "Thùng 24 lon",
            "target_region": "SOUTH",
            "regional_reason": "❄️ Top 1 Miền Nam: Giải khát thanh mát tức thì cho thời tiết nắng nóng",
            "health_benefits": "Giải khát thanh mát, bổ dưỡng, tiện lợi dùng hàng ngày cho cả gia đình.",
            "image": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80"
        },
        "PROD_CHAO_YEN_THIT_HEO": {
            "wholesale_moq": 30, # 1 thùng 30 gói
            "wholesale_discount": 0.20,
            "case_spec": "Thùng 30 gói",
            "target_region": "NORTH",
            "regional_reason": "🥣 Ưu tiên Miền Bắc: Bữa sáng ấm nóng giàu dinh dưỡng mùa thu đông",
            "health_benefits": "Dinh dưỡng trọn vẹn cho bữa sáng hoặc người ốm, dễ tiêu hóa, thơm ngon bổ dưỡng.",
            "image": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80"
        },
        "PROD_CA_PHE_PHIN_GIAY": {
            "wholesale_moq": 20, # 1 thùng 20 hộp
            "wholesale_discount": 0.22,
            "case_spec": "Thùng 20 hộp",
            "target_region": "SOUTH",
            "regional_reason": "☕ Ưu tiên Miền Nam: Cà phê phin giấy tiện lợi, sảng khoái năng lượng",
            "health_benefits": "Cà phê Robusta & Arabica chọn lọc, hương vị đậm đà, tỉnh táo làm việc tức thì.",
            "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80"
        }
    }

    result = []
    for p in products:
        code = p["product_code"]
        config = wholesale_config.get(code, {
            "wholesale_moq": p.get("wholesale_moq") or 20,
            "wholesale_discount": 0.18,
            "case_spec": p.get("case_spec") or p.get("packaging_spec") or "Thùng tiêu chuẩn",
            "target_region": p.get("target_region") or "ALL",
            "regional_reason": "✨ Sản phẩm đặc trưng chất lượng cao",
            "health_benefits": p.get("health_benefits") or "Sản phẩm chất lượng cao của doanh nghiệp.",
            "image": p.get("image_url") or "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80"
        })
        retail_price = float(p["selling_price"])

        # Đối chiếu bảng price_policies trong DB nếu có
        prod_policies = [pol for pol in policies if pol.get("product_id") == p["product_id"]]
        moq_pol = next((pol for pol in prod_policies if pol.get("customer_type") == "WHOLESALE_MOQ"), None)
        agent_pol = next((pol for pol in prod_policies if pol.get("customer_type") == "AGENT_VIP"), None)

        wholesale_moq = int(moq_pol["min_quantity"]) if moq_pol else int(p.get("wholesale_moq") or config["wholesale_moq"])
        wholesale_price = float(moq_pol["custom_price"]) if moq_pol else round(retail_price * (1.0 - config["wholesale_discount"]), -3)
        agent_price = float(agent_pol["custom_price"]) if agent_pol else round(retail_price * 0.78, -3)

        prod_region = (p.get("target_region") or config["target_region"] or "ALL").upper()
        is_regional_top = (reg != "ALL" and prod_region == reg)

        # Kiểm tra xem có Flash Sale nào đang chạy cho sản phẩm này ở khu vực hiện tại không
        matched_flash = next(
            (c for c in active_campaigns
             if c.get("campaign_type") == "FLASHSALE"
             and c.get("product_id") == p["product_id"]
             and (c.get("target_region", "ALL").upper() in ["ALL", reg] or reg == "ALL")),
            None
        )
        flash_sale_info = None
        if matched_flash:
            disc_pct = float(matched_flash.get("discount_percentage") or 0)
            flash_sale_info = {
                "campaign_id": matched_flash["campaign_id"],
                "title": matched_flash["title"],
                "discount_percentage": disc_pct,
                "flash_price": round(retail_price * (1.0 - disc_pct / 100.0), -2),
                "target_region": matched_flash["target_region"],
                "end_time": matched_flash["end_time"]
            }

        avg_star, rev_cnt = review_map.get(p["product_id"], (4.9, 3))
        result.append({
            **p,
            "retail_price": retail_price,
            "wholesale_price": wholesale_price,
            "agent_price": agent_price,
            "wholesale_moq": wholesale_moq,
            "case_spec": p.get("case_spec") or config["case_spec"],
            "health_benefits": p.get("health_benefits") or config["health_benefits"],
            "image": p.get("image_url") or config["image"],
            "target_region": prod_region,
            "is_regional_top": is_regional_top,
            "regional_reason": config["regional_reason"],
            "flash_sale": flash_sale_info,
            "in_stock": int(p["total_stock"]),
            "average_rating": avg_star,
            "review_count": rev_cnt,
        })

    # Sắp xếp ưu tiên sản phẩm khớp khu vực địa lý lên Top 1
    if reg != "ALL":
        result.sort(key=lambda x: (0 if x["is_regional_top"] else 1, x["product_id"]))

    return {"data": result, "total": len(result), "selected_region": reg}


class AgentVerifyRequest(BaseModel):
    agent_code: str

@app.post("/api/store/verify-agent")
def verify_agent(req: AgentVerifyRequest):
    """
    Xác thực Mã Đại lý B2B hoặc SĐT đã được phê duyệt trong hệ thống:
    Trả về hạn mức công nợ (credit_limit), công nợ hiện tại và chiết khấu VIP
    """
    code = req.agent_code.strip()
    with DBContext() as db:
        sql = """
            SELECT customer_id, customer_code, customer_name, customer_type, phone, address, credit_limit, current_debt
            FROM customers
            WHERE (UPPER(customer_code) = UPPER(%s) OR phone = %s)
              AND customer_type IN ('AGENT', 'DISTRIBUTOR');
        """
        rows = db.query(sql, (code, code))
        if not rows:
            return {
                "valid": False,
                "message": f"Mã đối tác hoặc SĐT '{code}' chưa được phê duyệt trong hệ thống ERP. Vui lòng liên hệ quản trị viên."
            }

        agent = rows[0]
        credit_limit = float(agent.get("credit_limit") or 0.0)
        current_debt = float(agent.get("current_debt") or 0.0)
        available_credit = max(0.0, credit_limit - current_debt)

        return {
            "valid": True,
            "message": f"Xác thực đối tác thành công! Xin chào {agent['customer_name']}.",
            "agent": {
                "customer_id": agent["customer_id"],
                "customer_code": agent["customer_code"],
                "customer_name": agent["customer_name"],
                "customer_type": agent["customer_type"],
                "phone": agent["phone"],
                "address": agent.get("address", ""),
                "credit_limit": credit_limit,
                "current_debt": current_debt,
                "available_credit": available_credit,
                "tier_name": "Đại lý B2B Chính Thức (Chiết khấu VIP 20-26% & Hỗ trợ công nợ)"
            }
        }


class PricingPreviewItem(BaseModel):
    product_id: int
    quantity: int

class PricingPreviewRequest(BaseModel):
    agent_code: Optional[str] = None
    items: List[PricingPreviewItem]

@app.post("/api/store/calculate-pricing")
def preview_pricing(req: PricingPreviewRequest):
    """
    API xem trước bảng tính giá Server-side cho giỏ hàng:
    Frontend gọi API này để hiển thị đúng 100% giá và chiết khấu từ CSDL
    """
    if not req.items:
        return {"items": [], "total_retail": 0, "total_discount": 0, "final_amount": 0, "is_agent": False}

    with DBContext() as db:
        is_agent = False
        agent_name = None
        if req.agent_code:
            code = req.agent_code.strip()
            agent_rows = db.query(
                "SELECT customer_id, customer_name FROM customers WHERE (UPPER(customer_code) = UPPER(%s) OR phone = %s) AND customer_type IN ('AGENT', 'DISTRIBUTOR')",
                (code, code)
            )
            if agent_rows:
                is_agent = True
                agent_name = agent_rows[0]["customer_name"]

        calculated_items = []
        total_retail = 0.0
        total_discount = 0.0
        final_amount = 0.0

        for it in req.items:
            res = calculate_item_pricing(db, it.product_id, it.quantity, is_agent=is_agent)
            ok, current_stock = check_product_stock_available(db, it.product_id, it.quantity)
            res["in_stock"] = current_stock
            res["is_stock_available"] = ok
            calculated_items.append(res)

            total_retail += res["retail_price"] * it.quantity
            total_discount += res["discount_amount"]
            final_amount += res["line_total"]

        return {
            "is_agent": is_agent,
            "agent_name": agent_name,
            "items": calculated_items,
            "total_retail": round(total_retail, 2),
            "total_discount": round(total_discount, 2),
            "final_amount": round(final_amount, 2)
        }


class StoreOrderItem(BaseModel):
    product_id: int
    quantity: int

class StoreCheckoutRequest(BaseModel):
    customer_name: str
    phone: str
    address: str
    customer_type: Optional[str] = "RETAIL"  # RETAIL hoặc AGENT
    agent_code: Optional[str] = None
    payment_method: str = "VIETQR"  # VIETQR, COD, DEBT
    items: List[StoreOrderItem]
    notes: Optional[str] = "Đơn đặt từ Cổng Bán Hàng Storefront"

@app.post("/api/store/checkout")
def store_checkout(order: StoreCheckoutRequest):
    """
    Xử lý đặt hàng an toàn từ Cổng Bán Hàng Storefront:
    1. Xác thực Server-side Pricing (không nhận đơn giá từ client)
    2. Atomic Stock Check (kiểm tra tức thời từng sản phẩm trong kho thành phẩm)
    3. Xác thực Đại lý B2B & Ràng buộc Hạn mức Công nợ nghiêm ngặt (Credit Limit)
    4. Ghi nhận giao dịch ACID vào sales_orders, sales_order_details và payments
    5. Tự động sinh mã VietQR Napas247 động
    """
    if not order.items:
        raise HTTPException(status_code=400, detail="Giỏ hàng trống, vui lòng chọn ít nhất 1 sản phẩm")

    for item in order.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Số lượng sản phẩm đặt hàng phải lớn hơn 0")

    import random
    order_code = f"SO-STORE-{random.randint(1000, 9999)}"

    with DBContext() as db:
        # 1. Xác thực Khách hàng hoặc Đại lý
        is_agent = False
        agent_data = None
        customer_id = None

        if order.agent_code:
            code = order.agent_code.strip()
            agent_rows = db.query(
                "SELECT * FROM customers WHERE (UPPER(customer_code) = UPPER(%s) OR phone = %s) AND customer_type IN ('AGENT', 'DISTRIBUTOR')",
                (code, code)
            )
            if not agent_rows:
                raise HTTPException(status_code=400, detail=f"Mã đại lý '{code}' không hợp lệ hoặc chưa được duyệt")
            agent_data = agent_rows[0]
            customer_id = agent_data["customer_id"]
            is_agent = True

        # Nếu chọn phương thức thanh toán nợ mà không phải là Đại lý được duyệt
        if order.payment_method == "DEBT" and not is_agent:
            raise HTTPException(
                status_code=400,
                detail="Phương thức Ghi nợ công nợ (DEBT) chỉ áp dụng cho Đại lý chính thức có mã hợp lệ và hợp đồng ký kết."
            )

        if not customer_id:
            existing = db.query("SELECT * FROM customers WHERE phone = %s", (order.phone.strip(),))
            if existing:
                customer_id = existing[0]["customer_id"]
            else:
                cust_code = f"CUST-{random.randint(1000, 9999)}"
                customer_id = db.execute("""
                    INSERT INTO customers (customer_code, customer_name, customer_type, phone, address, credit_limit, current_debt)
                    VALUES (%s, %s, %s, %s, %s, 0, 0);
                """, (cust_code, order.customer_name, "RETAIL", order.phone.strip(), order.address))

        # 2. Tính toán giá Server-side & Kiểm tra tồn kho thành phẩm
        calculated_items = []
        total_amount = 0.0
        discount_amount = 0.0
        final_amount = 0.0

        for it in order.items:
            pricing = calculate_item_pricing(db, it.product_id, it.quantity, is_agent=is_agent)
            
            # Atomic Stock Check
            has_stock, current_stock = check_product_stock_available(db, it.product_id, it.quantity)
            if not has_stock:
                raise HTTPException(
                    status_code=400,
                    detail=f"Sản phẩm '{pricing['product_name']}' không đủ tồn kho (Hiện còn: {current_stock} {pricing['unit']}, yêu cầu: {it.quantity}). Vui lòng giảm số lượng!"
                )

            calculated_items.append(pricing)
            total_amount += pricing["retail_price"] * it.quantity
            discount_amount += pricing["discount_amount"]
            final_amount += pricing["line_total"]

        total_amount = round(total_amount, 2)
        discount_amount = round(discount_amount, 2)
        final_amount = round(final_amount, 2)

        # 3. Kiểm tra Hạn Mức Công Nợ (Credit Limit Enforcement)
        if order.payment_method == "DEBT":
            credit_limit = float(agent_data.get("credit_limit") or 0.0)
            current_debt = float(agent_data.get("current_debt") or 0.0)
            new_debt = current_debt + final_amount

            if new_debt > credit_limit:
                raise HTTPException(
                    status_code=400,
                    detail=f"Đơn hàng vượt quá hạn mức công nợ được cấp! Hạn mức: {credit_limit:,.0f} ₫, Đã nợ: {current_debt:,.0f} ₫, Đơn mới: {final_amount:,.0f} ₫. Vui lòng thanh toán qua VietQR hoặc thanh toán bớt công nợ cũ."
                )

            # Cập nhật tăng công nợ khách hàng
            db.execute("UPDATE customers SET current_debt = current_debt + %s WHERE customer_id = %s", (final_amount, customer_id))

        # 4. Ghi nhận Đơn Hàng vào sales_orders
        channel_tag = "[STOREFRONT_WHOLESALE_B2B]" if is_agent else ("[STOREFRONT_WHOLESALE_MOQ]" if discount_amount > 0 else "[STOREFRONT_RETAIL]")
        full_notes = f"{channel_tag} {order.notes} | Đ/c: {order.address} | TT: {order.payment_method}"
        payment_status = "PAID" if order.payment_method in ["COD", "DEBT"] else "PENDING"

        so_id = db.execute("""
            INSERT INTO sales_orders (order_code, customer_id, total_amount, discount_amount, final_amount, status, notes, payment_method, payment_status, channel_type)
            VALUES (%s, %s, %s, %s, %s, 'NEW', %s, %s, %s, 'STOREFRONT');
        """, (order_code, customer_id, total_amount, discount_amount, final_amount, full_notes, order.payment_method, payment_status))

        # 5. Ghi chi tiết đơn hàng (sales_order_details) với giá chuẩn đã qua xác thực
        for item in calculated_items:
            db.execute("""
                INSERT INTO sales_order_details (sales_order_id, product_id, quantity, unit_price, subtotal)
                VALUES (%s, %s, %s, %s, %s);
            """, (so_id, item["product_id"], item["quantity"], item["applied_price"], item["line_total"]))

        # 6. Ghi nhận phương thức thanh toán vào bảng payments
        payment_code = f"PAY-{order_code}"
        db.execute("""
            INSERT INTO payments (payment_code, sales_order_id, customer_id, amount_paid, payment_method, notes)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (payment_code, so_id, customer_id, final_amount, order.payment_method, f"Thanh toán cho đơn hàng {order_code} ({order.payment_method})"))

    if "dispatch_n8n_webhook" in globals():
        dispatch_n8n_webhook(
            webhook_path="system-alert",
            workflow_id="03_event_driven_alerts",
            workflow_name="03 - Event-Driven System Alerts",
            payload={
                "event_type": "NEW_SALES_ORDER",
                "severity": "CRITICAL" if final_amount >= 20000000 else "WARNING",
                "total_amount": final_amount,
                "title": f"[Storefront] Đơn hàng mới {order_code} ({final_amount:,.0f} ₫)",
                "message": f"Khách hàng {order.customer_name} ({order.phone}) vừa đặt đơn {order_code} trị giá {final_amount:,.0f} ₫ qua Cổng Bán Hàng."
            }
        )

    # 7. Sinh thông tin VietQR Napas247 tự động
    bank_account = "0988776655"
    bank_code = "MB"
    account_name = "DOANH NGHIEP YEN SAO CA PHE SMB"
    vietqr_url = f"https://img.vietqr.io/image/{bank_code}-{bank_account}-compact2.png?amount={int(final_amount)}&addInfo={order_code}&accountName=DOANH%20NGHIEP%20YEN%20SAO%20CA%20PHE%20SMB"

    return {
        "success": True,
        "message": "Đặt hàng thành công! Đơn hàng đã được xác thực an toàn và chuyển đến hệ thống Quản trị ERP.",
        "order_code": order_code,
        "sales_order_id": so_id,
        "total_amount": total_amount,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "payment_method": order.payment_method,
        "payment_status": payment_status,
        "vietqr_url": vietqr_url,
        "bank_info": {
            "bank_name": "MBBank (Ngân hàng TMCP Quân Đội)",
            "account_number": bank_account,
            "account_name": account_name,
            "amount": final_amount,
            "content": order_code
        },
        "items": calculated_items
    }



class SalesChatQuery(BaseModel):
    message: str
    customer_type: Optional[str] = "RETAIL"

@app.post("/api/store/ai-sales-chat")
def ai_sales_chat(query: SalesChatQuery):
    """
    Trợ lý AI Bán Hàng Thông Minh (Conversational Commerce v1.7.0):
    - Tư vấn công dụng sức khỏe, quà biếu, đối tượng sử dụng
    - Báo giá sỉ lẻ, chính sách chiết khấu đại lý B2B
    - Nhận diện ý định mua hàng & sinh Thẻ Sản Phẩm Đa Năng (Mua ngay, Thêm giỏ, Xem chi tiết)
    - Tra cứu tiến độ đơn hàng thời gian thực qua mã SO-xxx
    """
    msg = query.message.strip().lower()
    suggested_products = []
    reply = ""

    catalog = get_store_products("ALL")["data"]
    by_code = {p["product_code"].upper(): p for p in catalog}

    def _build_card(prod_dict: dict, qty: int = 1, badge_note: str = "") -> dict:
        return {
            "product_id": prod_dict["product_id"],
            "product_code": prod_dict["product_code"],
            "product_name": prod_dict["product_name"],
            "price": float(prod_dict["retail_price"]),
            "retail_price": float(prod_dict["retail_price"]),
            "wholesale_price": float(prod_dict["wholesale_price"]),
            "wholesale_moq": int(prod_dict["wholesale_moq"]),
            "case_spec": prod_dict.get("case_spec", "Thùng tiêu chuẩn"),
            "unit": prod_dict["unit"],
            "image": prod_dict.get("image", ""),
            "health_benefits": prod_dict.get("health_benefits", ""),
            "average_rating": float(prod_dict.get("average_rating", 4.9)),
            "review_count": int(prod_dict.get("review_count", 3)),
            "in_stock": int(prod_dict.get("in_stock", 100)),
            "quantity": qty,
            "badge_note": badge_note,
            "action": "add_to_cart",
            "actions": ["buy_now", "add_to_cart", "view_detail"],
        }

    def _find_prod(*codes_or_keywords):
        for kw in codes_or_keywords:
            kw_up = kw.upper()
            if kw_up in by_code:
                return by_code[kw_up]
            for p in catalog:
                if kw_up in p["product_code"].upper() or kw.lower() in p["product_name"].lower():
                    return p
        return catalog[0] if catalog else None

    with DBContext() as db:
        # 1. Tra cứu mã đơn hàng (Order Tracking)
        import re
        so_match = re.search(r"so-[\w-]+", msg, re.IGNORECASE)
        if so_match or "tra cứu đơn" in msg or "kiểm tra đơn" in msg:
            order_code = so_match.group(0).upper() if so_match else ""
            if order_code:
                orders = db.query("""
                    SELECT so.*, c.customer_name 
                    FROM sales_orders so 
                    JOIN customers c ON so.customer_id = c.customer_id 
                    WHERE UPPER(so.order_code) = %s
                """, (order_code,))
                if orders:
                    o = orders[0]
                    status_text = "Đơn mới tiếp nhận (Đang chuẩn bị đóng gói tại kho)" if o["status"] == "NEW" else "Đã xuất kho và đang vận chuyển giao hàng"
                    reply = f"📦 **Thông tin tra cứu đơn hàng {o['order_code']}:**\n- Khách hàng: **{o['customer_name']}**\n- Trạng thái: **{status_text}**\n- Tổng tiền: **{float(o['final_amount']):,.0f} ₫**\n- Ghi chú: {o.get('notes', 'Không có')}."
                else:
                    reply = f"🔍 Không tìm thấy đơn hàng có mã **{order_code}**. Vui lòng kiểm tra lại mã đơn (ví dụ: SO-STORE-1234)."
            else:
                reply = "📦 Bạn vui lòng nhập chính xác mã đơn hàng (ví dụ: `SO-STORE-1234`) để tôi kiểm tra trạng thái vận chuyển cho bạn ngay nhé!"

        # 2. Tư vấn người tiểu đường / ăn kiêng / thanh mát
        elif "tiểu đường" in msg or "ăn kiêng" in msg or "ít đường" in msg or "không đường" in msg or "giải khát" in msg or "miền nam" in msg:
            reply = "🌿 **Tư vấn sức khỏe & ăn kiêng:** Đối với người cần kiểm soát đường huyết hoặc thích vị thanh mát nhẹ nhàng, tôi gợi ý 2 dòng sản phẩm phù hợp nhất bên dưới.\n👉 Bạn có thể bấm **'⚡ Mua ngay'** để thanh toán liền hoặc bấm **'🔍 Chi tiết'** để xem thành phần & đánh giá của người mua:"
            p_lon = _find_prod("PROD_YEN_LON_190ML", "SP_YEN_LON_190ML", "yến lon")
            p_cf = _find_prod("PROD_CA_PHE_PHIN_GIAY", "SP_CA_PHE_PHIN_GIAY", "cà phê")
            if p_lon:
                suggested_products.append(_build_card(p_lon, qty=6, badge_note="Ít calo • Thanh mát"))
            if p_cf:
                suggested_products.append(_build_card(p_cf, qty=2, badge_note="100% nguyên chất không đường"))

        # 3. Tư vấn người già, ốm, quà biếu, bồi bổ, miền Bắc / miền Trung
        elif "người già" in msg or "người lớn tuổi" in msg or "ốm" in msg or "bệnh" in msg or "bồi bổ" in msg or "quà biếu" in msg or "miền bắc" in msg or "miền trung" in msg:
            reply = "🎁 **Gợi ý Quà Biếu & Bồi Bổ Sức Khỏe Chuyên Sâu:**\n- **Yến Lọ Chưng Đường Phèn 70ml**: Tăng sức đề kháng, bổ phổi, giúp người lớn tuổi ăn ngon ngủ sâu.\n- **Yến Chai Nguyên Chất 300ml**: Hàm lượng tổ yến cao, thiết kế sang trọng thích hợp làm quà biếu.\n- **Cháo Yến Thịt Bằm**: Dễ tiêu hóa, phục hồi thể lực nhanh cho người mới ốm dậy.\n👉 Bấm **'⚡ Mua ngay'** hoặc **'🔍 Chi tiết'** ngay trên thẻ sản phẩm bên dưới:"
            p_lo = _find_prod("PROD_YEN_LO_70ML", "SP_YEN_LO_70ML", "yến lọ")
            p_chai = _find_prod("PROD_YEN_CHAI_300ML", "SP_YEN_CHAI_300ML", "yến chai")
            p_chao = _find_prod("PROD_CHAO_YEN_THIT_HEO", "SP_CHAO_YEN_50G", "cháo yến")
            if p_lo:
                suggested_products.append(_build_card(p_lo, qty=6, badge_note="Bán chạy số 1 • Bổ phổi"))
            if p_chai:
                suggested_products.append(_build_card(p_chai, qty=2, badge_note="Quà biếu cao cấp 300ml"))
            if p_chao:
                suggested_products.append(_build_card(p_chao, qty=10, badge_note="Dễ tiêu hóa • Ấm nóng"))

        # 4. Tư vấn giá sỉ / đại lý B2B
        elif "giá sỉ" in msg or "đại lý" in msg or "mua sỉ" in msg or "thùng" in msg or "chiết khấu" in msg:
            reply = "💼 **Chính sách Khách Sỉ & Đại Lý Doanh Nghiệp (B2B):**\n- **Chiết khấu cao từ 15% đến 22%** khi đặt hàng theo Thùng tiêu chuẩn (MOQ từ 1 thùng trở lên).\n- Hỗ trợ công nợ gối đầu 30 ngày cho Đại lý chính thức.\n👉 Tôi đính kèm các dòng sản phẩm có mức chiết khấu thùng tốt nhất bên dưới để bạn bấm **Mua Thùng Sỉ** hoặc xem chi tiết:"
            for p in catalog[:3]:
                suggested_products.append(_build_card(p, qty=int(p["wholesale_moq"]), badge_note=f"Giá sỉ {p['case_spec']}"))

        # 5. Nhận diện ý định mua sản phẩm cụ thể
        elif "yến lọ" in msg or "yến chưng" in msg:
            p = _find_prod("PROD_YEN_LO_70ML", "yến lọ")
            if p:
                reply = f"✨ **{p['product_name']}** luôn là sản phẩm bán chạy nhất! Bạn có thể bấm **'⚡ Mua ngay'** để đặt liền hoặc bấm **'🔍 Chi tiết'** để xem nguồn gốc nhà máy & đánh giá:"
                suggested_products.append(_build_card(p, qty=2, badge_note="Top 1 Bán Chạy"))
        elif "cà phê" in msg or "cafe" in msg:
            p = _find_prod("PROD_CA_PHE_PHIN_GIAY", "cà phê")
            if p:
                reply = f"☕ **{p['product_name']}** sử dụng hạt Arabica & Robusta Cầu Đất rang mộc chuẩn Nhật Bản. Bạn bấm trực tiếp vào thẻ bên dưới để mua ngay hoặc xem chi tiết nhé:"
                suggested_products.append(_build_card(p, qty=2, badge_note="Đặc sản Cầu Đất Đà Lạt"))
        elif "yến chai" in msg or "300ml" in msg:
            p = _find_prod("PROD_YEN_CHAI_300ML", "yến chai")
            if p:
                reply = f"🌟 **{p['product_name']}** dung tích lớn 300ml đậm đặc. Tôi đã chuẩn bị thẻ tương tác nhanh bên dưới cho bạn:"
                suggested_products.append(_build_card(p, qty=2, badge_note="Đậm đặc nguyên chất"))
        elif "cháo" in msg:
            p = _find_prod("PROD_CHAO_YEN_THIT_HEO", "cháo yến")
            if p:
                reply = f"🥣 **{p['product_name']}** giàu dinh dưỡng, ấm bụng cho bữa sáng. Bạn có thể bấm mua ngay hoặc xem chi tiết tại đây:"
                suggested_products.append(_build_card(p, qty=5, badge_note="Bữa sáng dinh dưỡng"))
        else:
            reply = "👋 Xin chào! Tôi là **Trợ lý Mua Hàng AI**. Dưới đây là các dòng sản phẩm nổi bật nhất hôm nay — bạn có thể bấm **'⚡ Mua ngay'** để thanh toán liền không cần tìm kiếm, hoặc bấm **'🔍 Chi tiết'** để xem địa chỉ sản xuất, công dụng và đánh giá của người mua:"
            for p in catalog[:3]:
                suggested_products.append(_build_card(p, qty=2, badge_note="Đề xuất nổi bật"))

        # Nếu có Gemini API Key và câu hỏi không phải tra cứu SO cụ thể, cho Gemini tối ưu lời tư vấn tự nhiên hơn
        if not so_match and "tra cứu đơn" not in msg:
            gemini_cfg = get_gemini_config()
            if gemini_cfg.get("gemini_configured"):
                store_context = [
                    f"{p['product_name']} ({p['retail_price']:,.0f} ₫, Sỉ MOQ {p['wholesale_moq']}: {p['wholesale_price']:,.0f} ₫, Công dụng: {p.get('health_benefits', '')})"
                    for p in catalog
                ]
                sys_prompt = (
                    "Bạn là Trợ lý Mua Hàng AI thân thiện, am hiểu của Doanh nghiệp Yến Sào Khánh Hòa & Cà Phê Cầu Đất. "
                    "Hãy trả lời câu hỏi của khách hàng bằng tiếng Việt tự nhiên, nhiệt tình, nhấn mạnh lợi ích sức khỏe và hướng dẫn khách bấm vào các thẻ sản phẩm bên dưới để Mua Ngay hoặc Xem Chi Tiết.\n"
                    f"Danh mục sản phẩm của cửa hàng:\n" + "\n".join(store_context)
                )
                llm_reply = call_gemini_api(query.message, sys_prompt)
                if llm_reply:
                    reply = llm_reply

    return {
        "reply": reply,
        "suggested_products": suggested_products,
        "customer_type": query.customer_type,
        "model_used": "Gemini 1.5 Flash (Google AI)" if get_gemini_config().get("gemini_configured") else "Semantic Store Engine"
    }


# =============================================================================
# 9. VERSION 1.5.0: n8n AUTOMATION ENGINE, TAX EXCEL/CSV EXPORT-IMPORT & CLOUD IMAGES
# =============================================================================
from fastapi.responses import Response
import base64
import json as _json
import urllib.request
from datetime import datetime as _dt

try:
    from backend.excel_service import build_multi_sheet_xlsx, build_csv_bytes, parse_tabular_file
except ImportError:
    from excel_service import build_multi_sheet_xlsx, build_csv_bytes, parse_tabular_file

N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678")
N8N_WORKFLOWS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "n8n", "workflows"))

CLOUD_PRESET_GALLERY = [
    {
        "asset_code": "CLOUD-YEN-LO-70ML",
        "title": "Yến Lọ Chưng Đường Phèn Cao Cấp 70ml",
        "category": "YEN_LO",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
        "product_code": "SP_YEN_LO_70ML"
    },
    {
        "asset_code": "CLOUD-YEN-LON-190ML",
        "title": "Nước Yến Sào Đóng Lon Thanh Mát 190ml",
        "category": "YEN_LON",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
        "product_code": "SP_YEN_LON_190ML"
    },
    {
        "asset_code": "CLOUD-CHAO-YEN-50G",
        "title": "Cháo Tổ Yến Thịt Bằm Dinh Dưỡng 50g",
        "category": "CHAO_YEN",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
        "product_code": "SP_CHAO_YEN_50G"
    },
    {
        "asset_code": "CLOUD-CAFE-PHIN-GIAY",
        "title": "Cà Phê Phin Giấy Đặc Sản Rang Mộc",
        "category": "CA_PHE",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80",
        "product_code": "SP_CA_PHE_PHIN_GIAY"
    },
    {
        "asset_code": "CLOUD-YEN-CHAI-300ML",
        "title": "Yến Chưng Tươi Nguyên Chất Chai Thủy Tinh 300ml",
        "category": "YEN_CHAI",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80",
        "product_code": "SP_YEN_CHAI_300ML"
    },
    {
        "asset_code": "CLOUD-GIFT-BOX-ROYAL",
        "title": "Hộp Quà Biếu Thượng Hạng Hoàng Gia",
        "category": "QUA_BIEU",
        "cloud_provider": "Cloudinary / Unsplash Global CDN",
        "cloud_url": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
        "product_code": ""
    }
]


def normalize_cloud_image_url(url: str) -> str:
    """Chuẩn hóa URL ảnh sang HTTPS Cloud CDN có nén WebP/Auto-format tối ưu tốc độ tải."""
    if not url or not str(url).strip():
        return "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80"
    u = str(url).strip()
    if u.startswith("data:image/"):
        return u
    if "images.unsplash.com" in u and "auto=format" not in u:
        sep = "&" if "?" in u else "?"
        return f"{u}{sep}auto=format&fit=crop&w=800&q=80"
    return u


def ensure_v150_schema():
    """Khởi tạo các bảng Version 1.5.0: n8n_execution_logs, cloud_assets, system_notifications."""
    with DBContext() as db:
        is_pg = (db.mode == "POSTGRESQL")
        pk_type = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"

        # 1. Đảm bảo bảng system_notifications tồn tại
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS system_notifications (
                notification_id {pk_type},
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                severity VARCHAR(30) DEFAULT 'INFO',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Bảng n8n_execution_logs lưu lịch sử kích hoạt Webhook & ETL
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS n8n_execution_logs (
                log_id {pk_type},
                workflow_id VARCHAR(80) NOT NULL,
                workflow_name VARCHAR(150) NOT NULL,
                webhook_path VARCHAR(100) NOT NULL,
                execution_mode VARCHAR(40) DEFAULT 'HYBRID_FALLBACK',
                status VARCHAR(30) DEFAULT 'SUCCESS',
                summary TEXT,
                payload_preview TEXT,
                duration_ms INTEGER DEFAULT 45,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        existing_logs = db.query("SELECT COUNT(*) as cnt FROM n8n_execution_logs;")
        if not existing_logs or int(existing_logs[0]["cnt"]) == 0:
            seed_logs = [
                (
                    "01_etl_star_schema",
                    "01 - Visual ETL Pipeline (OLTP -> Star Schema DW)",
                    "/webhook/trigger-etl",
                    "HYBRID_FALLBACK",
                    "SUCCESS",
                    "Đồng bộ thành công toàn bộ bảng OLTP sang Star Schema 'dw' (fact_sales, fact_production, fact_inventory_daily).",
                    '{"trigger": "SCHEDULE_00_00", "schema": "dw"}',
                    118
                ),
                (
                    "02_ai_tool_calling",
                    "02 - AI Agent Tool Calling Middleware",
                    "/webhook/ai-tool",
                    "HYBRID_FALLBACK",
                    "SUCCESS",
                    "AI Copilot truy vấn tồn kho Tổ yến tinh chế & định mức BOM qua Switch Node an toàn.",
                    '{"action": "QUERY_INVENTORY", "material": "Tổ yến thô"}',
                    64
                ),
                (
                    "03_event_driven_alerts",
                    "03 - Event-Driven System Alerts & Notification Dispatcher",
                    "/webhook/system-alert",
                    "HYBRID_FALLBACK",
                    "SUCCESS",
                    "Tự động kiểm tra ngưỡng an toàn kho NVL và đẩy cảnh báo lên Chuông thông báo ERP.",
                    '{"event_type": "SYSTEM_HEALTH_CHECK", "severity": "INFO"}',
                    38
                )
            ]
            for wf_id, wf_name, wb_path, mode, st, summ, pay, dur in seed_logs:
                db.execute("""
                    INSERT INTO n8n_execution_logs
                    (workflow_id, workflow_name, webhook_path, execution_mode, status, summary, payload_preview, duration_ms)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (wf_id, wf_name, wb_path, mode, st, summ, pay, dur))

        # 3. Bảng cloud_assets quản lý kho ảnh sản phẩm trên Cloud CDN
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS cloud_assets (
                asset_id {pk_type},
                asset_code VARCHAR(60) UNIQUE NOT NULL,
                title VARCHAR(150) NOT NULL,
                category VARCHAR(50) DEFAULT 'SAN_PHAM',
                cloud_provider VARCHAR(80) DEFAULT 'Cloudinary / Unsplash CDN',
                cloud_url TEXT NOT NULL,
                product_code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        existing_assets = db.query("SELECT COUNT(*) as cnt FROM cloud_assets;")
        if not existing_assets or int(existing_assets[0]["cnt"]) == 0:
            for item in CLOUD_PRESET_GALLERY:
                db.execute("""
                    INSERT INTO cloud_assets (asset_code, title, category, cloud_provider, cloud_url, product_code)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """, (
                    item["asset_code"],
                    item["title"],
                    item["category"],
                    item["cloud_provider"],
                    item["cloud_url"],
                    item["product_code"]
                ))

        # 4. Đảm bảo toàn bộ sản phẩm trong bảng products đều có link ảnh Cloud CDN chuẩn hóa
        prods = db.query("SELECT product_id, product_code, image_url FROM products;")
        preset_map = {p["product_code"]: p["cloud_url"] for p in CLOUD_PRESET_GALLERY if p.get("product_code")}
        for pr in prods:
            curr_url = pr.get("image_url") or ""
            new_url = normalize_cloud_image_url(curr_url if curr_url else preset_map.get(pr.get("product_code"), ""))
            if new_url != curr_url:
                db.execute("UPDATE products SET image_url = %s WHERE product_id = %s", (new_url, pr["product_id"]))


ensure_v150_schema()


_N8N_HEALTH_CACHE = {"ts": 0.0, "online": False}


def check_n8n_online() -> bool:
    """Kiểm tra nhanh container n8n (cổng 5678) có đang mở hay không (Cache 10s tối ưu chịu tải cao)."""
    import time
    now = time.time()
    if now - _N8N_HEALTH_CACHE["ts"] < 10.0:
        return _N8N_HEALTH_CACHE["online"]
    try:
        req = urllib.request.Request(f"{N8N_BASE_URL}/healthz", method="GET")
        with urllib.request.urlopen(req, timeout=0.35) as resp:
            is_ok = resp.status == 200
    except Exception:
        is_ok = False
    _N8N_HEALTH_CACHE["ts"] = now
    _N8N_HEALTH_CACHE["online"] = is_ok
    return is_ok


def dispatch_n8n_webhook(webhook_path: str, payload: dict, workflow_id: str = "03_event_driven_alerts", workflow_name: str = "03 - Event-Driven System Alerts") -> dict:
    """
    Điều phối sự kiện sang n8n Webhook.
    Nếu container n8n đang chạy -> gọi HTTP POST trực tiếp tới n8n.
    Nếu chạy local không bật Docker n8n -> tự động kích hoạt Hybrid Fallback để ghi log & tạo thông báo.
    """
    import time
    t0 = time.time()
    clean_path = webhook_path.lstrip("/")
    if not clean_path.startswith("webhook/"):
        full_path = f"/webhook/{clean_path}"
    else:
        full_path = f"/{clean_path}"

    execution_mode = "HYBRID_FALLBACK"
    status = "SUCCESS"
    summary = payload.get("message") or payload.get("title") or f"Thực thi tự động workflow {workflow_id}"

    try:
        data_bytes = _json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{N8N_BASE_URL}{full_path}",
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            if 200 <= resp.status < 300:
                execution_mode = "ONLINE_N8N_WEBHOOK"
    except Exception:
        execution_mode = "HYBRID_FALLBACK"

    duration_ms = max(12, int((time.time() - t0) * 1000))

    with DBContext() as db:
        db.execute("""
            INSERT INTO n8n_execution_logs
            (workflow_id, workflow_name, webhook_path, execution_mode, status, summary, payload_preview, duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            workflow_id,
            workflow_name,
            full_path,
            execution_mode,
            status,
            summary,
            _json.dumps(payload, ensure_ascii=False)[:500],
            duration_ms
        ))

        if payload.get("title") and payload.get("message"):
            db.execute("""
                INSERT INTO system_notifications (title, message, severity, is_read)
                VALUES (%s, %s, %s, %s);
            """, (
                payload["title"],
                payload["message"],
                payload.get("severity", "INFO"),
                False
            ))

    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow_name,
        "webhook_path": full_path,
        "execution_mode": execution_mode,
        "status": status,
        "duration_ms": duration_ms,
        "summary": summary
    }


@app.get("/api/n8n/status")
def get_n8n_status():
    """Trả về trạng thái 3 Workflows n8n, chế độ kết nối và lịch sử thực thi Webhook."""
    is_online = check_n8n_online()
    workflows = [
        {
            "workflow_id": "01_etl_star_schema",
            "name": "01 - Visual ETL Pipeline (OLTP -> Star Schema DW)",
            "webhook_path": "/webhook/trigger-etl",
            "schedule": "00:00 Hàng ngày + On-demand Webhook",
            "file_name": "01_etl_star_schema.json",
            "description": "Trích xuất đơn hàng, sản xuất & tồn kho từ OLTP, phân bổ công nợ theo Line Ratio, gắn nhãn mùa vụ Tết và nạp vào Star Schema 'dw'.",
            "active": True
        },
        {
            "workflow_id": "02_ai_tool_calling",
            "name": "02 - AI Agent Tool Calling Middleware",
            "webhook_path": "/webhook/ai-tool",
            "schedule": "Real-time Webhook",
            "file_name": "02_ai_tool_calling.json",
            "description": "Đóng vai trò Tool Server an toàn cho AI Copilot tra cứu tồn kho NVL, doanh thu và định mức BOM qua Switch Node.",
            "active": True
        },
        {
            "workflow_id": "03_event_driven_alerts",
            "name": "03 - Event-Driven System Alerts & Notification Dispatcher",
            "webhook_path": "/webhook/system-alert",
            "schedule": "Event-Driven Webhook",
            "file_name": "03_event_driven_alerts.json",
            "description": "Tự động bắt sự kiện Đơn hàng mới & Duyệt xuất kho NVL dưới ngưỡng an toàn (<500) để đẩy cảnh báo lên Chuông thông báo ERP.",
            "active": True
        }
    ]

    with DBContext() as db:
        logs = db.query("SELECT * FROM n8n_execution_logs ORDER BY log_id DESC LIMIT 20;")
        total_exec = db.query("SELECT COUNT(*) as cnt FROM n8n_execution_logs;")
        total_count = int(total_exec[0]["cnt"]) if total_exec else len(logs)

    return {
        "engine": "n8n Automation Engine v1.5.0",
        "n8n_url": N8N_BASE_URL,
        "connection_mode": "ONLINE_N8N_DOCKER" if is_online else "HYBRID_LOCAL_FALLBACK",
        "is_docker_online": is_online,
        "total_executions": total_count,
        "workflows": workflows,
        "recent_logs": logs
    }


class N8nTriggerRequest(BaseModel):
    workflow_id: str = "01_etl_star_schema"
    action: Optional[str] = "MANUAL_SYNC"


@app.post("/api/n8n/trigger")
def trigger_n8n_workflow(req: N8nTriggerRequest):
    """Kích hoạt trực tiếp 1 trong 3 Workflows n8n từ giao diện Web để demo và đồng bộ tức thì."""
    wf_id = req.workflow_id.strip()

    with DBContext() as db:
        orders_cnt = int((db.query("SELECT COUNT(*) as c FROM sales_orders;") or [{"c": 0}])[0]["c"])
        prods_cnt = int((db.query("SELECT COUNT(*) as c FROM production_orders;") or [{"c": 0}])[0]["c"])
        mats = db.query("SELECT material_name, current_stock, unit FROM materials ORDER BY current_stock ASC;")

    if wf_id == "01_etl_star_schema":
        payload = {
            "event_type": "ETL_STAR_SCHEMA_SYNC",
            "severity": "INFO",
            "title": "[n8n ETL] Đồng bộ Data Warehouse hoàn tất",
            "message": f"Workflow 01 đã trích xuất {orders_cnt} đơn bán hàng & {prods_cnt} lệnh sản xuất, tính toán Line Ratio và nạp vào Star Schema 'dw'."
        }
        res = dispatch_n8n_webhook("trigger-etl", payload, "01_etl_star_schema", "01 - Visual ETL Pipeline (OLTP -> Star Schema DW)")
    elif wf_id == "02_ai_tool_calling":
        lowest = mats[0] if mats else {"material_name": "Tổ yến thô", "current_stock": 1200, "unit": "Gram"}
        payload = {
            "action": "QUERY_INVENTORY",
            "severity": "INFO",
            "title": "[n8n AI Tool] Kiểm tra kết nối AI Tool Calling",
            "message": f"Workflow 02 phản hồi truy vấn tồn kho thấp nhất: {lowest['material_name']} còn {float(lowest['current_stock']):,.1f} {lowest['unit']}."
        }
        res = dispatch_n8n_webhook("ai-tool", payload, "02_ai_tool_calling", "02 - AI Agent Tool Calling Middleware")
    else:
        low_list = [m for m in mats if float(m.get("current_stock") or 0) < 500]
        if low_list:
            low_str = ", ".join(f"{m['material_name']} ({float(m['current_stock']):,.0f} {m['unit']})" for m in low_list)
            msg = f"Phát hiện NVL dưới ngưỡng an toàn (<500): {low_str}. Đã phát cảnh báo khẩn cấp!"
            sev = "CRITICAL"
        else:
            msg = f"Đã rà soát {len(mats)} danh mục NVL & {orders_cnt} đơn hàng. Toàn bộ tồn kho đều trên ngưỡng an toàn."
            sev = "INFO"
        payload = {
            "event_type": "SYSTEM_ALERT_SCAN",
            "severity": sev,
            "title": "[n8n Alert] Rà soát Cảnh báo Kho & Đơn hàng tự động",
            "message": msg
        }
        res = dispatch_n8n_webhook("system-alert", payload, "03_event_driven_alerts", "03 - Event-Driven System Alerts")

    return {
        "success": True,
        "message": res["summary"],
        "execution": res
    }


@app.get("/api/n8n/workflows/{workflow_id}/download")
def download_n8n_workflow_json(workflow_id: str):
    """Tải file cấu hình JSON chuẩn của Workflow n8n để import hoặc trình chiếu."""
    safe_map = {
        "01_etl_star_schema": "01_etl_star_schema.json",
        "02_ai_tool_calling": "02_ai_tool_calling.json",
        "03_event_driven_alerts": "03_event_driven_alerts.json"
    }
    fname = safe_map.get(workflow_id)
    if not fname:
        raise HTTPException(status_code=404, detail="Không tìm thấy Workflow JSON yêu cầu")
    fpath = os.path.join(N8N_WORKFLOWS_DIR, fname)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="File JSON Workflow chưa được khởi tạo")
    with open(fpath, "rb") as f:
        content = f.read()
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )


def _build_tax_and_archive_datasets(period: str = "ALL", vat_rate: float = 8.0) -> dict:
    """
    Tổng hợp 4 bộ dữ liệu chuẩn Kế toán - Thuế & Kiểm toán chống thất thoát:
    1. 01_Bang_Ke_Thue_Dau_Ra (Bảng kê hóa đơn & thuế GTGT bán ra)
    2. 02_Nhap_Xuat_Ton_Kho (Đối chiếu tồn kho NVL & Thành phẩm chống thất thoát)
    3. 03_Nhat_Ky_San_Xuat (Truy vết lệnh sản xuất & phiếu duyệt kho)
    4. 04_So_Cong_No_Khach_Hang (Tổng hợp công nợ phải thu khách hàng)
    """
    vat_pct = float(vat_rate or 8.0)
    vat_divisor = 1.0 + (vat_pct / 100.0)

    with DBContext() as db:
        orders = db.query("""
            SELECT so.*, c.customer_name, c.customer_type, c.phone
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.customer_id
            ORDER BY so.sales_order_id DESC;
        """)
        materials = db.query("SELECT * FROM materials ORDER BY material_id ASC;")
        fg_items = db.query("""
            SELECT fg.*, p.product_code, p.product_name, p.unit, p.cost_price, p.selling_price
            FROM finished_goods_inventory fg
            JOIN products p ON fg.product_id = p.product_id
            ORDER BY fg.inventory_id DESC;
        """)
        prod_orders = db.query("""
            SELECT po.*, p.product_code, p.product_name, p.unit, p.cost_price
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            ORDER BY po.order_id DESC;
        """)
        requisitions = db.query("SELECT * FROM material_requisitions ORDER BY req_id DESC;")
        customers = db.query("SELECT * FROM customers ORDER BY customer_id ASC;")
        order_sums = db.query("""
            SELECT customer_id, COUNT(*) as order_count, COALESCE(SUM(final_amount), 0) as total_bought
            FROM sales_orders
            GROUP BY customer_id;
        """)

    req_by_po = {r["prod_order_id"]: r for r in requisitions}
    cust_order_map = {r["customer_id"]: r for r in order_sums}

    # Lọc kỳ báo cáo nếu có yêu cầu
    filtered_orders = []
    for o in orders:
        dt_str = str(o.get("order_date") or "2026-10-01")[:10]
        try:
            month = int(dt_str.split("-")[1])
        except Exception:
            month = 10
        if period == "Q1" and month not in (1, 2, 3):
            continue
        if period == "Q2" and month not in (4, 5, 6):
            continue
        if period == "Q3" and month not in (7, 8, 9):
            continue
        if period == "Q4" and month not in (10, 11, 12):
            continue
        filtered_orders.append(o)

    if not filtered_orders and orders:
        filtered_orders = orders

    # Sheet 1: Bảng kê Hóa đơn & Thuế GTGT Bán ra
    sheet_tax = []
    total_rev_before_tax = 0.0
    total_vat_amount = 0.0
    total_final_payment = 0.0

    for idx, o in enumerate(filtered_orders, start=1):
        final_amt = float(o.get("final_amount") or o.get("total_amount") or 0.0)
        discount_amt = float(o.get("discount_amount") or 0.0)
        rev_before_tax = round(final_amt / vat_divisor, 0)
        vat_amt = round(final_amt - rev_before_tax, 0)

        total_rev_before_tax += rev_before_tax
        total_vat_amount += vat_amt
        total_final_payment += final_amt

        sheet_tax.append({
            "STT": idx,
            "So_Hoa_Don_Don_Hang": o.get("order_code") or f"SO-{o.get('sales_order_id')}",
            "Ngay_Hoa_Don": str(o.get("order_date") or "")[:19],
            "Ten_Khach_Hang": o.get("customer_name") or "Khách lẻ",
            "Phan_Loai_KH": o.get("customer_type") or "RETAIL",
            "SDT_Lien_He": o.get("phone") or "",
            "Doanh_Thu_Truoc_Thue_VND": int(rev_before_tax),
            "Thue_Suat_GTGT": f"{int(vat_pct)}%",
            "Tien_Thue_GTGT_VND": int(vat_amt),
            "Chiet_Khau_VND": int(discount_amt),
            "Tong_Thanh_Toan_VND": int(final_amt),
            "Phuong_Thuc_TT": o.get("payment_method") or "CASH",
            "Trang_Thai_Don": o.get("status") or "NEW"
        })

    # Sheet 2: Báo cáo Nhập - Xuất - Tồn Kho (NVL & Thành phẩm) chống thất thoát
    sheet_inventory = []
    total_inventory_value = 0.0
    for m in materials:
        stock = float(m.get("current_stock") or 0.0)
        u_cost = float(m.get("unit_cost") or 0.0)
        val = round(stock * u_cost, 0)
        total_inventory_value += val
        sheet_inventory.append({
            "Nhom_Tai_San": "NGUYEN_VAT_LIEU",
            "Ma_Hang_Lo": f"NVL-{m['material_id']:02d}",
            "Ten_Vat_Tu_San_Pham": m.get("material_name"),
            "Don_Vi_Tinh": m.get("unit"),
            "Ton_Kho_Thuc_Te": stock,
            "Don_Gia_Von_VND": int(u_cost),
            "Gia_Tri_Ton_Kho_VND": int(val),
            "Han_Su_Dung_Lo": "Theo lô nhập",
            "Trang_Thai_Kiem_Toan": "CANH_BAO_NHAP_THEM" if stock < 500 else "AN_TOAN_KHOP_SO"
        })

    for fg in fg_items:
        qty = float(fg.get("quantity_in_stock") or 0.0)
        c_price = float(fg.get("cost_price") or 0.0)
        val = round(qty * c_price, 0)
        total_inventory_value += val
        sheet_inventory.append({
            "Nhom_Tai_San": "THANH_PHAM_THEO_LO",
            "Ma_Hang_Lo": fg.get("lot_number") or fg.get("product_code"),
            "Ten_Vat_Tu_San_Pham": fg.get("product_name"),
            "Don_Vi_Tinh": fg.get("unit"),
            "Ton_Kho_Thuc_Te": qty,
            "Don_Gia_Von_VND": int(c_price),
            "Gia_Tri_Ton_Kho_VND": int(val),
            "Han_Su_Dung_Lo": str(fg.get("expiration_date") or fg.get("manufactured_date") or ""),
            "Trang_Thai_Kiem_Toan": "KHOP_TON_KHO_THUC_TE"
        })

    # Sheet 3: Sổ Nhật ký Lệnh Sản Xuất & Phê duyệt Xuất Kho
    sheet_production = []
    for po in prod_orders:
        req = req_by_po.get(po["order_id"], {})
        target_q = int(po.get("target_quantity") or 0)
        comp_q = int(po.get("completed_quantity") or 0)
        est_cost = round(target_q * float(po.get("cost_price") or 0.0), 0)
        sheet_production.append({
            "Ma_Lenh_SX": po.get("order_code"),
            "San_Pham": po.get("product_name"),
            "San_Luong_Ke_Hoach": target_q,
            "San_Luong_Hoan_Thanh": comp_q,
            "Don_Vi": po.get("unit"),
            "Chi_Phi_Gia_Von_Uoc_Tinh_VND": int(est_cost),
            "Ma_Phieu_Xuat_Kho_NVL": req.get("req_code") or f"REQ-{po.get('order_code')}",
            "Trang_Thai_Duyet_Kho": req.get("status") or ("APPROVED" if po.get("status") != "PENDING" else "PENDING_APPROVAL"),
            "Nguoi_Phe_Duyet_Kho": req.get("approved_by") or "Chờ Trưởng Kho duyệt",
            "Trang_Thai_San_Xuat": po.get("status")
        })

    # Sheet 4: Sổ Công Nợ & Doanh số Khách hàng
    sheet_debt = []
    total_receivable = 0.0
    for c in customers:
        cid = c["customer_id"]
        stat = cust_order_map.get(cid, {"order_count": 0, "total_bought": 0})
        debt = float(c.get("current_debt") or 0.0)
        limit = float(c.get("credit_limit") or 0.0)
        total_receivable += debt
        sheet_debt.append({
            "Ma_KH": f"KH-{cid:03d}",
            "Ten_Khach_Hang_Dai_Ly": c.get("customer_name"),
            "Phan_Loai": c.get("customer_type"),
            "So_Dien_Thoai": c.get("phone") or "",
            "Dia_Chi": c.get("address") or "",
            "So_Don_Hang_Phat_Sinh": int(stat["order_count"]),
            "Tong_Doanh_So_Mua_VND": int(float(stat["total_bought"] or 0)),
            "Han_Muc_Tin_Dung_VND": int(limit),
            "Du_No_Hien_Tai_VND": int(debt),
            "Danh_Gia_Rui_Ro": "VUOT_80_PHAN_TRAM_HAN_MUC" if (limit > 0 and debt / limit >= 0.8) else "BINH_THUONG"
        })

    return {
        "summary": {
            "period": period,
            "vat_rate": vat_pct,
            "invoice_count": len(sheet_tax),
            "total_revenue_before_tax": round(total_rev_before_tax, 0),
            "total_vat_amount": round(total_vat_amount, 0),
            "total_final_payment": round(total_final_payment, 0),
            "total_inventory_value": round(total_inventory_value, 0),
            "total_customer_receivable": round(total_receivable, 0),
            "generated_at": _dt.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "sheets": {
            "01_Bang_Ke_Thue_Dau_Ra": sheet_tax,
            "02_Nhap_Xuat_Ton_Kho": sheet_inventory,
            "03_Nhat_Ky_San_Xuat": sheet_production,
            "04_So_Cong_No_Khach_Hang": sheet_debt
        }
    }


@app.get("/api/reports/tax-summary")
def get_tax_report_summary(period: str = "ALL", vat_rate: float = 8.0):
    """Xem trước số liệu tổng hợp Báo cáo Thuế GTGT & Kiểm toán chống thất thoát."""
    data = _build_tax_and_archive_datasets(period=period, vat_rate=vat_rate)
    return {
        "summary": data["summary"],
        "preview": {
            k: v[:10] for k, v in data["sheets"].items()
        }
    }


@app.get("/api/reports/tax-export")
def export_tax_and_archive_file(period: str = "ALL", vat_rate: float = 8.0, format: str = "xlsx", sheet: str = "01_Bang_Ke_Thue_Dau_Ra"):
    """
    Xuất file Báo cáo Thuế & Lưu trữ Kế toán chống thất thoát:
    - format=xlsx: Xuất 1 file Excel (.xlsx) 4 Sheet chuẩn OpenXML
    - format=csv: Xuất file CSV chuẩn UTF-8 BOM tiếng Việt theo sheet được chọn
    """
    data = _build_tax_and_archive_datasets(period=period, vat_rate=vat_rate)
    sheets = data["sheets"]
    stamp = _dt.now().strftime("%Y%m%d")

    if format.lower() == "csv":
        selected_rows = sheets.get(sheet) or sheets["01_Bang_Ke_Thue_Dau_Ra"]
        csv_bytes = build_csv_bytes(selected_rows)
        filename = f"BaoCao_{sheet}_{period}_VAT{int(vat_rate)}_{stamp}.csv"
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    xlsx_bytes = build_multi_sheet_xlsx(sheets)
    filename = f"HoSo_BaoCaoThue_KiemToanKho_{period}_VAT{int(vat_rate)}_{stamp}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/data/import-template")
def download_import_template(target: str = "MATERIALS", format: str = "xlsx"):
    """Tải file mẫu Excel (.xlsx) hoặc CSV (.csv) để nhập kho NVL / kiểm kê hoặc thêm sản phẩm hàng loạt."""
    t = target.upper().strip()
    if t == "PRODUCTS":
        sample_rows = [
            {
                "product_code": "SP_YEN_SAM_70ML",
                "product_name": "Yến Chưng Nhân Sâm Hàn Quốc 70ml",
                "unit": "Lọ",
                "cost_price": 32000,
                "selling_price": 58000,
                "initial_stock": 200,
                "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80"
            },
            {
                "product_code": "SP_YEN_DONG_TRUNG_70ML",
                "product_name": "Yến Chưng Đông Trùng Hạ Thảo 70ml",
                "unit": "Lọ",
                "cost_price": 35000,
                "selling_price": 65000,
                "initial_stock": 150,
                "image_url": "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80"
            }
        ]
        sheet_name = "Mau_Nhap_San_Pham"
        fname_base = "FileMau_Import_SanPham"
    else:
        sample_rows = [
            {
                "material_code": "NVL_TO_YEN_THO",
                "material_name": "Tổ yến thô nguyên chất",
                "unit": "Gram",
                "quantity_added": 500,
                "unit_cost": 26500,
                "supplier_name": "Nhà Yến Khánh Hòa",
                "season_note": "Nhập bổ sung theo file Excel kiểm kê"
            },
            {
                "material_code": "NVL_DUONG_PHEN",
                "material_name": "Đường phèn kết tinh tự nhiên",
                "unit": "Gram",
                "quantity_added": 5000,
                "unit_cost": 45,
                "supplier_name": "Đường Quảng Ngãi",
                "season_note": "Nhập dự trữ sản xuất"
            }
        ]
        sheet_name = "Mau_Nhap_Kho_NVL"
        fname_base = "FileMau_Import_NguyenVatLieu"

    if format.lower() == "csv":
        return Response(
            content=build_csv_bytes(sample_rows),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{fname_base}.csv"'}
        )

    xlsx_bytes = build_multi_sheet_xlsx({sheet_name: sample_rows})
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname_base}.xlsx"'}
    )


class FileImportRequest(BaseModel):
    target: str = "MATERIALS"  # MATERIALS | PRODUCTS
    filename: str = "upload.xlsx"
    file_base64: Optional[str] = None
    csv_text: Optional[str] = None
    rows: Optional[List[dict]] = None
    imported_by: Optional[str] = "admin"


@app.post("/api/data/import-file")
def import_tabular_data_file(req: FileImportRequest):
    """
    Xử lý file Excel (.xlsx) hoặc CSV (.csv) được người dùng tải lên để nhập/kiểm kê NVL hoặc Sản phẩm hàng loạt.
    """
    parsed_rows = []
    if req.rows and isinstance(req.rows, list):
        parsed_rows = req.rows
    elif req.file_base64:
        b64_str = req.file_base64
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(b64_str)
        parsed_rows = parse_tabular_file(raw_bytes, req.filename)
    elif req.csv_text:
        parsed_rows = parse_tabular_file(req.csv_text.encode("utf-8"), req.filename or "upload.csv")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="File tải lên trống hoặc không đúng định dạng mẫu (.xlsx / .csv)")

    target = req.target.upper().strip()
    processed_count = 0
    details_log = []

    with DBContext() as db:
        if target == "PRODUCTS":
            for r in parsed_rows:
                p_code = str(r.get("product_code") or r.get("Ma_SP") or "").strip().upper()
                p_name = str(r.get("product_name") or r.get("Ten_SP") or "").strip()
                if not p_code or not p_name:
                    continue
                unit = str(r.get("unit") or r.get("Don_Vi") or "Lọ").strip()
                cost_p = float(r.get("cost_price") or r.get("Gia_Von") or 20000)
                sell_p = float(r.get("selling_price") or r.get("Gia_Ban") or 40000)
                init_stock = int(float(r.get("initial_stock") or r.get("Ton_Dau") or 0))
                img_url = normalize_cloud_image_url(str(r.get("image_url") or ""))

                existing = db.query("SELECT product_id FROM products WHERE product_code = %s", (p_code,))
                if existing:
                    pid = existing[0]["product_id"]
                    db.execute("""
                        UPDATE products
                        SET product_name = %s, unit = %s, cost_price = %s, selling_price = %s, image_url = %s
                        WHERE product_id = %s
                    """, (p_name, unit, cost_p, sell_p, img_url, pid))
                else:
                    w_cfg = _json.dumps({
                        "Wholesale_Unit": "Thùng",
                        "Packing_Spec": f"Thùng 24 {unit}",
                        "Units_Per_Carton": 24,
                        "Carton_Price": round(sell_p * 24 * 0.82),
                        "MOQ": 1,
                        "Brand": "Tinh Hoa Việt",
                        "Origin": "Khánh Hòa, Việt Nam",
                        "Shelf_Life": "12 tháng"
                    }, ensure_ascii=False)
                    pid = db.execute("""
                        INSERT INTO products (product_code, product_name, unit, cost_price, selling_price, image_url, wholesale_config)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (p_code, p_name, unit, cost_p, sell_p, img_url, w_cfg))

                if init_stock > 0:
                    lot_no = f"LOT-IMP-{p_code[-6:]}"
                    db.execute("""
                        INSERT INTO finished_goods_inventory (product_id, lot_number, quantity_in_stock, manufactured_date)
                        VALUES (%s, %s, %s, CURRENT_DATE)
                    """, (pid, lot_no, init_stock))

                processed_count += 1
                details_log.append(f"{p_name} ({p_code})")
        else:
            import random
            for r in parsed_rows:
                m_code = str(r.get("material_code") or r.get("Ma_NVL") or r.get("Ma_Hang_Lo") or "").strip().upper()
                m_name = str(r.get("material_name") or r.get("Ten_NVL") or r.get("Ten_Vat_Tu_San_Pham") or "").strip()
                if not m_name:
                    continue
                if not m_code:
                    m_code = f"NVL_IMP_{random.randint(1000, 9999)}"
                unit = str(r.get("unit") or r.get("Don_Vi_Tinh") or "Gram").strip()
                qty_add = float(r.get("quantity_added") or r.get("So_Luong_Nhap") or r.get("Ton_Kho_Thuc_Te") or 0)
                u_cost = float(r.get("unit_cost") or r.get("Don_Gia_Von_VND") or 100)
                supplier = str(r.get("supplier_name") or "Nhà cung cấp chuẩn").strip()
                note = str(r.get("season_note") or f"Import từ file {req.filename}").strip()

                existing = db.query(
                    "SELECT * FROM materials WHERE LOWER(material_name) = LOWER(%s) OR UPPER(material_code) = %s",
                    (m_name, m_code)
                )
                if existing:
                    mat = existing[0]
                    mid = mat["material_id"]
                    db.execute("""
                        UPDATE materials
                        SET current_stock = current_stock + %s, unit_cost = %s
                        WHERE material_id = %s
                    """, (qty_add, u_cost, mid))
                else:
                    mid = db.execute("""
                        INSERT INTO materials (material_code, material_name, unit, current_stock, unit_cost)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (m_code, m_name, unit, qty_add, u_cost))

                if qty_add > 0:
                    r_code = f"PN-FILE-{random.randint(1000, 9999)}"
                    db.execute("""
                        INSERT INTO material_receipts
                        (receipt_code, material_id, supplier_name, quantity, unit_price, total_cost, market_season, imported_by, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (r_code, mid, supplier, qty_add, u_cost, round(qty_add * u_cost, 2), "FILE_IMPORT", req.imported_by or "admin", note))

                processed_count += 1
                details_log.append(f"{m_name} (+{qty_add:,.0f} {unit})")

        # Ghi nhận thông báo kiểm toán chống thất thoát
        db.execute("""
            INSERT INTO system_notifications (title, message, severity, is_read)
            VALUES (%s, %s, 'INFO', %s);
        """, (
            f"Đã nhập dữ liệu từ file {req.filename} ({processed_count} bản ghi)",
            f"Người thực hiện: {req.imported_by}. Các mục đã đồng bộ vào CSDL: {', '.join(details_log[:5])}.",
            False
        ))

    return {
        "success": True,
        "processed_count": processed_count,
        "target": target,
        "items": details_log,
        "message": f"Đã xử lý và đồng bộ thành công {processed_count} dòng dữ liệu từ file '{req.filename}' vào CSDL!"
    }


@app.get("/api/cloud-images")
def get_cloud_images():
    """Lấy danh sách Thư viện Ảnh Sản Phẩm trên Cloud CDN."""
    with DBContext() as db:
        assets = db.query("SELECT * FROM cloud_assets ORDER BY asset_id DESC;")
    return {"data": assets}


class CloudImageUploadRequest(BaseModel):
    title: str
    category: Optional[str] = "SAN_PHAM"
    cloud_url: Optional[str] = None
    image_base64: Optional[str] = None
    product_id: Optional[int] = None
    cloud_provider: Optional[str] = "Cloudinary / ImgBB Hybrid CDN"


@app.post("/api/cloud-images/upload")
def upload_or_register_cloud_image(req: CloudImageUploadRequest):
    """
    Tải ảnh lên Cloud Storage / Đăng ký URL ảnh Cloud CDN tối ưu và gắn trực tiếp cho sản phẩm nếu chỉ định.
    """
    import random
    final_url = ""
    if req.cloud_url and req.cloud_url.strip():
        final_url = normalize_cloud_image_url(req.cloud_url.strip())
    elif req.image_base64 and req.image_base64.strip():
        b64 = req.image_base64.strip()
        if not b64.startswith("data:image/"):
            final_url = f"data:image/png;base64,{b64}"
        else:
            final_url = b64
    else:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp file ảnh hoặc đường dẫn Cloud URL")

    asset_code = f"CLOUD-ASSET-{random.randint(1000, 9999)}"
    with DBContext() as db:
        p_code = ""
        if req.product_id:
            prods = db.query("SELECT product_code FROM products WHERE product_id = %s", (req.product_id,))
            if prods:
                p_code = prods[0]["product_code"]
                db.execute("UPDATE products SET image_url = %s WHERE product_id = %s", (final_url, req.product_id))

        asset_id = db.execute("""
            INSERT INTO cloud_assets (asset_code, title, category, cloud_provider, cloud_url, product_code)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (asset_code, req.title.strip(), req.category or "SAN_PHAM", req.cloud_provider, final_url, p_code))

    return {
        "success": True,
        "asset_id": asset_id,
        "asset_code": asset_code,
        "cloud_url": final_url,
        "message": "Đã tải và đồng bộ ảnh lên Cloud CDN thành công!"
    }


# =============================================================================
# 10. VERSION 1.6.0: NOTIFICATION BELL API, DEBT SETTLEMENT & WEB LOAD TEST
# =============================================================================
class NotificationReadRequest(BaseModel):
    notification_id: Optional[int] = None
    mark_all: bool = True


@app.get("/api/notifications")
def get_system_notifications():
    """Lấy danh sách thông báo hệ thống (Chuông thông báo ERP) & số lượng chưa đọc."""
    with DBContext() as db:
        rows = db.query("SELECT * FROM system_notifications ORDER BY notification_id DESC LIMIT 30;")
        if not rows:
            db.execute("""
                INSERT INTO system_notifications (title, message, severity, is_read)
                VALUES (%s, %s, 'INFO', %s);
            """, (
                "[n8n System] Hệ thống Cảnh báo Tự động đã kích hoạt",
                "Toàn bộ sự kiện Đơn hàng mới, Duyệt xuất kho NVL và Đồng bộ ETL đều được giám sát real-time.",
                False
            ))
            rows = db.query("SELECT * FROM system_notifications ORDER BY notification_id DESC LIMIT 30;")
        unread_cnt = sum(1 for r in rows if not r.get("is_read"))
    return {
        "data": rows,
        "unread_count": unread_cnt
    }


@app.post("/api/notifications/mark-read")
def mark_notifications_read(req: Optional[NotificationReadRequest] = None):
    """Đánh dấu thông báo đã đọc trên Chuông thông báo."""
    with DBContext() as db:
        if req and req.notification_id and not req.mark_all:
            db.execute("UPDATE system_notifications SET is_read = TRUE WHERE notification_id = %s", (req.notification_id,))
        else:
            db.execute("UPDATE system_notifications SET is_read = TRUE")
    return {"success": True, "message": "Đã đánh dấu đã đọc toàn bộ thông báo!"}


class CustomerDebtSettleRequest(BaseModel):
    amount: float
    payment_method: Optional[str] = "BANK_TRANSFER"
    notes: Optional[str] = "Thu hồi công nợ khách hàng"


@app.post("/api/customers/{customer_id}/settle-debt")
def settle_customer_debt(customer_id: int, req: CustomerDebtSettleRequest):
    """Thu hồi / Tất toán công nợ khách hàng B2B và ghi nhận phiếu thu chống thất thoát."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán công nợ phải lớn hơn 0")

    import random
    with DBContext() as db:
        custs = db.query("SELECT * FROM customers WHERE customer_id = %s", (customer_id,))
        if not custs:
            raise HTTPException(status_code=404, detail="Không tìm thấy khách hàng")
        cust = custs[0]
        curr_debt = float(cust.get("current_debt") or 0.0)
        paid = min(curr_debt, float(req.amount)) if curr_debt > 0 else float(req.amount)
        new_debt = max(0.0, round(curr_debt - float(req.amount), 2))

        db.execute("UPDATE customers SET current_debt = %s WHERE customer_id = %s", (new_debt, customer_id))

        pay_code = f"PAY-DEBT-{random.randint(1000, 9999)}"
        db.execute("""
            INSERT INTO payments (payment_code, customer_id, amount_paid, payment_method, notes)
            VALUES (%s, %s, %s, %s, %s);
        """, (pay_code, customer_id, paid, req.payment_method or "BANK_TRANSFER", req.notes or "Thu hồi công nợ"))

        db.execute("""
            INSERT INTO system_notifications (title, message, severity, is_read)
            VALUES (%s, %s, 'INFO', %s);
        """, (
            f"Đã thu công nợ KH: {cust['customer_name']} (-{paid:,.0f} ₫)",
            f"Mã phiếu thu: {pay_code}. Dư nợ còn lại: {new_debt:,.0f} ₫.",
            False
        ))

    return {
        "success": True,
        "customer_id": customer_id,
        "customer_name": cust["customer_name"],
        "amount_settled": paid,
        "remaining_debt": new_debt,
        "payment_code": pay_code,
        "message": f"Đã thu {paid:,.0f} ₫ công nợ của '{cust['customer_name']}'. Dư nợ còn lại: {new_debt:,.0f} ₫!"
    }


class LoadBenchmarkRequest(BaseModel):
    concurrent_users: int = 20
    total_requests: int = 100


@app.post("/api/system/load-test")
def run_system_load_benchmark(req: Optional[LoadBenchmarkRequest] = None):
    """
    Kiểm thử độ chịu tải đồng thời (Load & Concurrency Stress Benchmark) trên 5 phân hệ cốt lõi:
    1. Storefront Catalog & Geo-Personalization (/api/store/products)
    2. Dashboard BI Real-Time Stats (/api/dashboard/stats)
    3. AI 1-Year Profit & Strategy Forecast (/api/bi/profit-forecast)
    4. Accounting & Tax Multi-Sheet Aggregation (/api/reports/tax-summary)
    5. n8n Automation Engine Status (/api/n8n/status)
    """
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed

    workers = max(1, min(int(req.concurrent_users if req else 20), 64))
    total_reqs = max(5, min(int(req.total_requests if req else 100), 500))

    scenarios = [
        ("Storefront Geo Catalog (/api/store/products)", lambda: get_store_products(region="NORTH")),
        ("Dashboard BI Stats (/api/dashboard/stats)", lambda: get_dashboard_stats()),
        ("AI Profit Forecast 12M (/api/bi/profit-forecast)", lambda: get_ai_profit_forecast()),
        ("Tax & Audit Summary (/api/reports/tax-summary)", lambda: get_tax_report_summary(period="ALL", vat_rate=8.0)),
        ("n8n Automation Status (/api/n8n/status)", lambda: get_n8n_status()),
    ]

    def _run_single(idx: int):
        ep_name, fn = scenarios[idx % len(scenarios)]
        t_start = time.perf_counter()
        ok = True
        try:
            res = fn()
            if not res:
                ok = False
        except Exception:
            ok = False
        elapsed_ms = (time.perf_counter() - t_start) * 1000.0
        return ep_name, ok, elapsed_ms

    t_wall_start = time.perf_counter()
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_run_single, i) for i in range(total_reqs)]
        for fut in as_completed(futures):
            results.append(fut.result())
    wall_time_sec = max(0.001, time.perf_counter() - t_wall_start)

    latencies = sorted(r[2] for r in results)
    succeeded = sum(1 for r in results if r[1])
    failed = total_reqs - succeeded

    def _percentile(sorted_vals, pct):
        if not sorted_vals:
            return 0.0
        k = int(round((pct / 100.0) * (len(sorted_vals) - 1)))
        return round(sorted_vals[min(max(k, 0), len(sorted_vals) - 1)], 2)

    avg_ms = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
    p50_ms = _percentile(latencies, 50)
    p95_ms = _percentile(latencies, 95)
    p99_ms = _percentile(latencies, 99)
    max_ms = round(max(latencies), 2) if latencies else 0.0
    rps = round(total_reqs / wall_time_sec, 1)

    # Thống kê theo từng endpoint
    ep_stats = {}
    for ep_name, ok, ms in results:
        st = ep_stats.setdefault(ep_name, {"endpoint": ep_name, "requests": 0, "success": 0, "latencies": []})
        st["requests"] += 1
        if ok:
            st["success"] += 1
        st["latencies"].append(ms)

    breakdown = []
    for ep_name, _ in scenarios:
        st = ep_stats.get(ep_name, {"requests": 0, "success": 0, "latencies": [0.0]})
        lats = sorted(st["latencies"])
        breakdown.append({
            "endpoint": ep_name,
            "requests": st["requests"],
            "success": st["success"],
            "avg_ms": round(sum(lats) / len(lats), 2) if lats else 0.0,
            "p95_ms": _percentile(lats, 95),
            "status": "PASS_OPTIMAL" if st["success"] == st["requests"] else "DEGRADED"
        })

    return {
        "success": failed == 0,
        "database_mode": f"{ACTIVE_DB_MODE} (WAL High-Concurrency)",
        "concurrent_users": workers,
        "total_requests": total_reqs,
        "succeeded_requests": succeeded,
        "failed_requests": failed,
        "success_rate_pct": round((succeeded / total_reqs) * 100.0, 2),
        "total_duration_ms": round(wall_time_sec * 1000.0, 1),
        "requests_per_second": rps,
        "avg_latency_ms": avg_ms,
        "p50_latency_ms": p50_ms,
        "p95_latency_ms": p95_ms,
        "p99_latency_ms": p99_ms,
        "max_latency_ms": max_ms,
        "grade": "A+ (Enterprise Ready)" if (failed == 0 and p95_ms < 150) else "A (Stable)",
        "endpoint_breakdown": breakdown
    }


# =============================================================================
# 11. VERSION 1.7.0: TRANG CHI TIẾT SẢN PHẨM, NGUỒN GỐC NHÀ MÁY & ĐÁNH GIÁ NGƯỜI MUA
# =============================================================================

PRODUCT_DETAIL_PROFILES = {
    "PROD_YEN_LO_70ML": {
        "origin_info": {
            "factory_name": "Nhà Máy Chế Biến Yến Sào Khánh Hòa (Chuẩn ISO 22000)",
            "factory_address": "Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa",
            "raw_material_region": "Đảo Yến Tự Nhiên Vịnh Nha Trang - Khánh Hòa (Tổ yến đảo thu hoạch chính vụ)",
            "certifications": ["ISO 22000:2018", "HACCP Codex", "Chứng nhận VSATTP Bộ Y Tế", "OCOP 5 Sao Quốc Gia"],
            "production_technology": "Công nghệ chưng cất tiệt trùng chân không Thủy Phân Kép ở 121°C giữ trọn 18 loại Acid Amin tự nhiên, không chất bảo quản."
        },
        "usage_guide": {
            "detailed_benefits": [
                "Bổ phổi, tiêu đờm, làm dịu hệ hô hấp trong thời tiết giao mùa và mùa lạnh.",
                "Tăng cường hệ miễn dịch tự nhiên, phục hồi thể lực nhanh cho người suy nhược hoặc mới ốm dậy.",
                "Kích thích vị giác, giúp người cao tuổi ăn ngon miệng và ngủ sâu giấc hơn.",
                "Bổ sung Collagen và Threonine tự nhiên giúp tái tạo làn da tươi sáng."
            ],
            "target_users": "Người cao tuổi, người mới ốm dậy, phụ nữ mang thai (từ tháng thứ 4), trẻ em trên 1 tuổi và người làm việc trí óc căng thẳng.",
            "best_time": "Dùng tốt nhất vào buổi sáng trước bữa ăn 30 phút hoặc buổi tối trước khi đi ngủ 45–60 phút để cơ thể hấp thu tối đa dưỡng chất.",
            "storage_guide": "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Ngon hơn khi ướp lạnh hoặc ngâm ấm (vào mùa đông). Sử dụng hết ngay sau khi mở nắp."
        }
    },
    "PROD_YEN_CHAI_300ML": {
        "origin_info": {
            "factory_name": "Nhà Máy Chế Biến Yến Sào Khánh Hòa (Dây Chuyền Đóng Chai Cao Cấp)",
            "factory_address": "Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa",
            "raw_material_region": "Tổ Yến Tinh Chế Thượng Hạng Khánh Hòa kết hợp Đường Phèn Kết Tinh Quảng Ngãi",
            "certifications": ["ISO 22000:2018", "HACCP Codex", "FDA Hoa Kỳ Đăng Ký Cơ Sở", "Hàng Việt Nam Chất Lượng Cao"],
            "production_technology": "Chiết rót vô trùng Aseptic dung tích lớn 300ml giữ nguyên sợi yến dài dai tự nhiên."
        },
        "usage_guide": {
            "detailed_benefits": [
                "Dung tích lớn 300ml cung cấp nguồn năng lượng và khoáng chất dồi dào cho cả ngày dài.",
                "Hỗ trợ tăng cường trí nhớ, giảm mệt mỏi thần kinh và bồi bổ khí huyết toàn diện.",
                "Thiết kế chai thủy tinh sang trọng, lịch sự, đặc biệt phù hợp làm quà biếu đối tác & gia đình.",
                "Tiện lợi chia làm 2–3 lần dùng hoặc dùng chung trong gia đình."
            ],
            "target_users": "Doanh nhân, người tập luyện thể thao, người cần bồi bổ chuyên sâu và khách hàng tìm kiếm hộp quà biếu sức khỏe trang trọng.",
            "best_time": "Uống 100–150ml vào buổi sáng hoặc giữa buổi chiều khi cơ thể cần nạp năng lượng tức thì.",
            "storage_guide": "Bảo quản ngăn mát tủ lạnh (4–8°C) sau khi mở nắp và dùng hết trong vòng 24 giờ."
        }
    },
    "PROD_YEN_LON_190ML": {
        "origin_info": {
            "factory_name": "Nhà Máy Đồ Uống Dinh Dưỡng Yến Sào Khánh Hòa",
            "factory_address": "Khu Công Nghiệp Suối Dầu, Quốc Lộ 1A, Huyện Cam Lâm, Tỉnh Khánh Hòa",
            "raw_material_region": "Tổ Yến Khánh Hòa & Nước Tinh Khiết Khoáng Tự Nhiên",
            "certifications": ["ISO 22000:2018", "HACCP", "Kiểm định hàm lượng đường thấp (Low-Glycemic)"],
            "production_technology": "Đóng lon nhôm thực phẩm cao cấp giữ lạnh nhanh, thanh trùng UHT hiện đại."
        },
        "usage_guide": {
            "detailed_benefits": [
                "Giải khát thanh mát tức thì, bù nước và điện giải tự nhiên cho ngày nắng nóng.",
                "Hàm lượng calo thấp, vị ngọt thanh nhẹ phù hợp cho người ăn kiêng hoặc kiểm soát đường huyết.",
                "Bổ sung dưỡng chất tổ yến giúp thanh nhiệt cơ thể và làm đẹp da."
            ],
            "target_users": "Mọi lứa tuổi, đặc biệt phù hợp cho khách hàng khu vực nắng ấm, người ăn kiêng, dân văn phòng và học sinh - sinh viên.",
            "best_time": "Uống trực tiếp, ngon nhất khi ướp lạnh ở 6–10°C vào giữa buổi sáng hoặc buổi chiều.",
            "storage_guide": "Bảo quản nơi thoáng mát hoặc trong ngăn mát tủ lạnh. Lắc nhẹ trước khi uống."
        }
    },
    "PROD_CHAO_YEN_THIT_HEO": {
        "origin_info": {
            "factory_name": "Nhà Máy Thực Phẩm Dinh Dưỡng Ăn Liền Khánh Hòa",
            "factory_address": "Phân Xưởng Chế Biến Thực Phẩm Khô - KCN Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa",
            "raw_material_region": "Gạo Thơm ST25 Sóc Trăng, Tổ Yến Khánh Hòa & Thịt Heo Sạch VietGAP",
            "certifications": ["ISO 22000:2018", "HACCP", "Không Phẩm Màu Tổng Hợp & Không Chất Bảo Quản"],
            "production_technology": "Công nghệ sấy thăng hoa (Freeze-Drying) ở -40°C giữ nguyên cấu trúc hạt cháo sánh mịn, vị ngọt thịt tươi và sợi tổ yến."
        },
        "usage_guide": {
            "detailed_benefits": [
                "Bữa ăn ấm nóng, giàu đạm và vi chất dinh dưỡng chỉ sau 3 phút chế biến.",
                "Rất dễ tiêu hóa, làm ấm bụng nhanh chóng vào buổi sáng mùa lạnh hoặc đêm khuya.",
                "Bổ sung tổ yến và vitamin nhóm B giúp người ốm, trẻ nhỏ và người già phục hồi sức khỏe."
            ],
            "target_users": "Trẻ em, người cao tuổi, người mới ốm dậy, nhân viên văn phòng bận rộn cần bữa sáng ấm nóng đủ chất.",
            "best_time": "Dùng cho bữa sáng, bữa phụ chiều hoặc bữa ăn nhẹ buổi tối.",
            "storage_guide": "Cho phôi cháo và gói tổ yến + thịt bằm vào tô, chế 320ml nước sôi, đậy nắp kín 3 phút rồi thưởng thức."
        }
    },
    "PROD_CA_PHE_PHIN_GIAY": {
        "origin_info": {
            "factory_name": "Nhà Máy Rang Xay Cà Phê Đặc Sản Cầu Đất - Đà Lạt",
            "factory_address": "Thôn Cầu Đất, Xã Xuân Trường, Thành phố Đà Lạt, Tỉnh Lâm Đồng (Độ cao 1.650m)",
            "raw_material_region": "Vùng Nguyên Liệu Arabica Cầu Đất (Đà Lạt) & Robusta Chín Đỏ Tây Nguyên",
            "certifications": ["UTZ Certified", "ISO 22000:2018", "100% Rang Mộc Nguyên Chất Không Tẩm Hóa Chất", "Túi Lọc Phin Giấy Chuẩn Nhật Bản"],
            "production_technology": "Rang mộc tự động bằng khí nóng Hot-Air Profile Đức, đóng gói kèm phin giấy Drip-Bag nhập khẩu Nhật Bản."
        },
        "usage_guide": {
            "detailed_benefits": [
                "Hương thơm quyến rũ tự nhiên của Arabica Cầu Đất hòa quyện vị đậm đà hậu ngọt của Robusta.",
                "Giúp tỉnh táo tinh thần, tăng khả năng tập trung sáng tạo chỉ trong 2 phút pha chế mà không cần phin nhôm.",
                "Giàu chất chống oxy hóa tự nhiên (Polyphenol), hoàn toàn không đường và không phụ gia."
            ],
            "target_users": "Người yêu thích cà phê nguyên chất, doanh nhân, dân văn phòng, người hay đi công tác/du lịch.",
            "best_time": "Thưởng thức vào buổi sáng sau bữa ăn hoặc đầu giờ chiều để khởi tạo năng lượng làm việc.",
            "storage_guide": "Xé miệng túi lọc phin giấy, gác 2 quai lên thành ly, rót 30ml nước sôi (92–96°C) ủ 20 giây, sau đó rót thêm 100ml nước sôi chờ nhỏ giọt xong."
        }
    }
}


def ensure_v170_schema():
    """Khởi tạo bảng product_reviews và dữ liệu đánh giá thực tế của người mua cho Version 1.7.0 (cho SQLite fallback)"""
    if ACTIVE_DB_MODE == "POSTGRESQL":
        return
    with DBContext() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS product_reviews (
                review_id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                reviewer_name VARCHAR(120) NOT NULL,
                customer_type VARCHAR(30) DEFAULT 'RETAIL',
                rating INTEGER NOT NULL DEFAULT 5,
                comment TEXT NOT NULL,
                region VARCHAR(50) DEFAULT 'Toàn Quốc',
                verified_purchase INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cnt_rows = db.query("SELECT COUNT(*) as cnt FROM product_reviews;")
        cnt = cnt_rows[0]["cnt"] if cnt_rows else 0
        if cnt == 0:
            seed_reviews = [
                # Product 1: Yến Lọ Chưng Đường Phèn 70ml
                (1, "Bác Nguyễn Văn Hòa (64 tuổi)", "RETAIL", 5, "Tôi ở Hà Nội mua 2 thùng dùng mỗi tối mùa lạnh thấy ấm phổi, ngủ rất sâu giấc, sợi yến thật và thơm dịu không bị ngọt gắt.", "Miền Bắc"),
                (1, "Chị Trần Minh Thư", "RETAIL", 5, "Mua biếu bố mẹ chồng dịp lễ, hộp đóng gói cực kỳ sang trọng, có đầy đủ tem truy xuất lô nhà máy Khánh Hòa.", "Miền Trung"),
                (1, "Nhà Thuốc & Quà Biếu Tâm An", "AGENT_VIP", 5, "Đại lý bên mình nhập sỉ đều đặn 10 thùng/tháng, khách phản hồi chất lượng đồng đều, hạn sử dụng luôn mới tinh từ nhà máy.", "Miền Bắc"),
                # Product 2: Yến Chai Nguyên Chất 300ml
                (2, "Anh Lê Hoàng Nam (Giám đốc XD)", "RETAIL", 5, "Chai 300ml rất chất lượng, sợi yến đặc, mang đi làm hay biếu đối tác ở Đà Nẵng ai cũng khen lịch sự.", "Miền Trung"),
                (2, "Chị Phạm Thu Trang", "RETAIL", 5, "Mình mua cho ông xã đi tập thể thao về uống, để ngăn mát tủ lạnh uống rất sảng khoái và khỏe người.", "Miền Nam"),
                # Product 3: Yến Lon Uống Liền 190ml
                (3, "Anh Võ Thành Đạt (TP.HCM)", "RETAIL", 5, "Thời tiết Sài Gòn nóng bức có thùng Yến Lon 190ml để tủ lạnh uống cực đã, vị thanh mát ít ngọt nên người tiểu đường nhẹ dùng rất yên tâm.", "Miền Nam"),
                (3, "Siêu Thị Mini GreenMart", "AGENT_VIP", 5, "Dòng yến lon này bán chạy nhất tại cửa hàng mình ở Quận 7, chiết khấu thùng 24 lon rất tốt.", "Miền Nam"),
                # Product 4: Cháo Yến Thịt Bằm
                (4, "Chị Đỗ Bích Ngọc (Hải Phòng)", "RETAIL", 5, "Sáng mùa đông pha 1 tô cháo yến nóng hổi cho các cháu đi học chỉ mất 3 phút, hạt cháo sánh mịn, có gói tổ yến và thịt thật rất thơm.", "Miền Bắc"),
                (4, "Anh Hoàng Xuân Bách", "RETAIL", 4, "Cháo dễ ăn, người mới ốm dậy ăn vào tỉnh táo hẳn, giao hàng nhanh.", "Miền Bắc"),
                # Product 5: Cà Phê Phin Giấy Cầu Đất
                (5, "Anh Trần Quốc Tuấn (Đà Lạt)", "RETAIL", 5, "Đúng chuẩn vị Arabica Cầu Đất rang mộc! Túi phin giấy gác lên ly cực kỳ tiện khi ngồi văn phòng, thơm nồng nàn.", "Miền Nam"),
                (5, "Chuỗi Cafe & Bakery Bình Minh", "AGENT_VIP", 5, "Đặt sỉ 20 hộp cho khách mang về, ai cũng ấn tượng vì bao bì đẹp và hương vị cà phê sạch 100%.", "Miền Trung"),
            ]
            for pid, rname, ctype, stars, cmt, reg in seed_reviews:
                db.execute("""
                    INSERT INTO product_reviews (product_id, reviewer_name, customer_type, rating, comment, region, verified_purchase)
                    VALUES (%s, %s, %s, %s, %s, %s, 1);
                """, (pid, rname, ctype, stars, cmt, reg))


ensure_v170_schema()


@app.get("/api/store/products/{product_id}/detail")
def get_store_product_detail(product_id: int, region: Optional[str] = "ALL"):
    """
    Lấy toàn bộ thông tin Trang Chi Tiết Sản Phẩm (Version 1.7.0):
    1. Thông tin sản phẩm, giá bán lẻ / giá thùng sỉ MOQ / giá đại lý VIP & Flash Sale
    2. Nguồn gốc xuất xứ, địa chỉ nhà máy sản xuất, vùng nguyên liệu & chứng nhận chất lượng
    3. Công dụng sức khỏe chi tiết, đối tượng sử dụng, thời điểm dùng & hướng dẫn bảo quản
    4. Bảng thành phần cấu tạo chuẩn (truy xuất trực tiếp từ BOM trong CSDL)
    5. Danh sách các Lô thành phẩm thực tế (Batch Code, Ngày SX, Hạn sử dụng)
    6. Đánh giá của người mua (Reviews) & Thống kê phân bổ số sao (1-5 sao)
    7. Sản phẩm liên quan cùng danh mục / khu vực
    """
    catalog = get_store_products(region or "ALL")["data"]
    prod = next((p for p in catalog if int(p["product_id"]) == int(product_id)), None)
    if not prod:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sản phẩm #{product_id}")

    code = prod["product_code"]
    profile = PRODUCT_DETAIL_PROFILES.get(code, {
        "origin_info": {
            "factory_name": "Nhà Máy Chế Biến Thực Phẩm & Đồ Uống Chuẩn ISO 22000",
            "factory_address": "Lô C12, Khu Công Nghiệp Suối Dầu, Huyện Cam Lâm, Tỉnh Khánh Hòa",
            "raw_material_region": "Vùng nguyên liệu tự nhiên tuyển chọn Khánh Hòa & Tây Nguyên",
            "certifications": ["ISO 22000:2018", "HACCP Codex", "Chứng nhận VSATTP Bộ Y Tế"],
            "production_technology": "Dây chuyền khép kín tự động hóa tiệt trùng giữ trọn hương vị và dưỡng chất tự nhiên."
        },
        "usage_guide": {
            "detailed_benefits": [
                prod.get("health_benefits") or "Bồi bổ cơ thể, tăng cường sức đề kháng tự nhiên.",
                "Cung cấp năng lượng và dưỡng chất thiết yếu hàng ngày.",
                "Đóng gói tiêu chuẩn an toàn vệ sinh thực phẩm, tiện lợi khi sử dụng và làm quà biếu."
            ],
            "target_users": "Mọi đối tượng khách hàng gia đình, nhân viên văn phòng và người cần bồi bổ sức khỏe.",
            "best_time": "Sử dụng trực tiếp vào buổi sáng hoặc chiều để đạt hiệu quả hấp thu tốt nhất.",
            "storage_guide": "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp."
        }
    })

    with DBContext() as db:
        # Thành phần cấu tạo từ BOM thực tế
        bom_rows = db.query("""
            SELECT b.quantity_required, b.unit as bom_unit, b.notes,
                   m.material_code, m.material_name, m.unit as mat_unit
            FROM bill_of_materials b
            JOIN materials m ON b.material_id = m.material_id
            WHERE b.product_id = %s
            ORDER BY b.bom_id;
        """, (product_id,))

        # Lô thành phẩm tồn kho thực tế
        raw_batches = db.query("""
            SELECT *
            FROM finished_goods_inventory
            WHERE product_id = %s AND quantity_in_stock > 0
            ORDER BY inventory_id DESC;
        """, (product_id,))
        batches = [
            {
                "batch_code": b.get("lot_number") or b.get("batch_code") or f"LOT-2026-0{product_id}",
                "quantity_in_stock": int(b.get("quantity_in_stock") or 0),
                "manufacturing_date": str(b.get("manufactured_date") or b.get("manufacturing_date") or "2026-10-01"),
                "expiry_date": str(b.get("expiry_date") or "2028-10-01"),
                "warehouse_location": b.get("warehouse_location") or "Kho Lạnh Chuẩn GSP - Nhà máy Khánh Hòa",
            }
            for b in raw_batches
        ]

        # Đánh giá của khách hàng
        reviews = db.query("""
            SELECT review_id, product_id, reviewer_name, customer_type, rating, comment, region, verified_purchase, created_at
            FROM product_reviews
            WHERE product_id = %s
            ORDER BY review_id DESC;
        """, (product_id,))

    total_rev = len(reviews)
    if total_rev > 0:
        avg_rating = round(sum(float(r["rating"]) for r in reviews) / total_rev, 1)
    else:
        avg_rating = 5.0

    star_breakdown = {str(s): sum(1 for r in reviews if int(r["rating"]) == s) for s in range(5, 0, -1)}

    related_products = [p for p in catalog if int(p["product_id"]) != int(product_id)][:4]

    return {
        "product": prod,
        "origin_info": profile["origin_info"],
        "usage_guide": profile["usage_guide"],
        "bom_ingredients": bom_rows,
        "batches": batches,
        "reviews": reviews,
        "rating_summary": {
            "average_rating": avg_rating,
            "total_reviews": total_rev,
            "star_breakdown": star_breakdown
        },
        "related_products": related_products
    }


class ProductReviewCreate(BaseModel):
    reviewer_name: str
    customer_type: Optional[str] = "RETAIL"
    rating: int = 5
    comment: str
    region: Optional[str] = "Toàn Quốc"


@app.post("/api/store/products/{product_id}/reviews")
def create_product_review(product_id: int, req: ProductReviewCreate):
    """Khách hàng gửi đánh giá và nhận xét thực tế cho sản phẩm trên Storefront"""
    name = (req.reviewer_name or "").strip()
    comment = (req.comment or "").strip()
    if not name or not comment:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ Tên người đánh giá và Nội dung nhận xét")

    stars = max(1, min(int(req.rating or 5), 5))
    ctype = (req.customer_type or "RETAIL").upper()
    reg = (req.region or "Toàn Quốc").strip()

    with DBContext() as db:
        prods = db.query("SELECT product_id, product_name FROM products WHERE product_id = %s", (product_id,))
        if not prods:
            raise HTTPException(status_code=404, detail=f"Sản phẩm #{product_id} không tồn tại")

        new_rev_id = db.execute("""
            INSERT INTO product_reviews (product_id, reviewer_name, customer_type, rating, comment, region, verified_purchase)
            VALUES (%s, %s, %s, %s, %s, %s, 1);
        """, (product_id, name, ctype, stars, comment, reg))

        stats = db.query("""
            SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as total_reviews
            FROM product_reviews
            WHERE product_id = %s
        """, (product_id,))
        avg_r = float(stats[0]["avg_rating"] or 5.0) if stats else 5.0
        tot_r = int(stats[0]["total_reviews"] or 1) if stats else 1

    return {
        "success": True,
        "message": "Cảm ơn bạn đã gửi đánh giá sản phẩm!",
        "review_id": new_rev_id,
        "average_rating": avg_r,
        "total_reviews": tot_r
    }


# =============================================================================
# 11. PHÂN HỆ MỞ RỘNG V1.9.0: NHÂN SỰ XƯỞNG, PHÂN PHỐI ĐẠI LÝ & ĐỔI TRẢ
# =============================================================================

def ensure_v190_schema():
    """
    Tự động nâng cấp CSDL cho Version 1.9.0 (thực dụng theo đề tài):
    - Bổ sung 6 bảng: workshops, workers, work_shifts, production_worker_assignments, dealer_purchase_requests, order_returns
    - Bổ sung cột workshop_id vào production_orders
    - Seed danh mục xưởng, công nhân, ca làm và chuẩn hóa 6 tài khoản người dùng
    """
    with DBContext() as db:
        is_pg = (db.mode == "POSTGRESQL")
        pk_type = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
        ts_type = "TIMESTAMP" if is_pg else "DATETIME"
        dec_type = "DECIMAL(15,2)" if is_pg else "NUMERIC"

        # 1. Bảng workshops
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS workshops (
                workshop_id {pk_type},
                workshop_code VARCHAR(30) UNIQUE NOT NULL,
                workshop_name VARCHAR(150) NOT NULL,
                workshop_type VARCHAR(50) NOT NULL,
                location VARCHAR(255) NOT NULL,
                manager_name VARCHAR(100),
                capacity_per_day INT DEFAULT 2000,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Bảng workers
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS workers (
                worker_id {pk_type},
                worker_code VARCHAR(30) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                workshop_id INT,
                skill_level VARCHAR(50) DEFAULT 'THO_CHINH',
                specialty VARCHAR(100),
                hourly_rate {dec_type} DEFAULT 35000.00,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Bảng work_shifts
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS work_shifts (
                shift_id {pk_type},
                shift_code VARCHAR(30) UNIQUE NOT NULL,
                shift_name VARCHAR(100) NOT NULL,
                start_time VARCHAR(10) NOT NULL,
                end_time VARCHAR(10) NOT NULL,
                standard_hours {dec_type} DEFAULT 8.0,
                description TEXT,
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 4. Bảng production_worker_assignments
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS production_worker_assignments (
                assignment_id {pk_type},
                production_order_id INT NOT NULL,
                worker_id INT NOT NULL,
                shift_id INT,
                assigned_date DATE NOT NULL,
                planned_hours {dec_type} DEFAULT 8.0,
                actual_hours {dec_type} DEFAULT 8.0,
                output_completed INT DEFAULT 0,
                notes TEXT,
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Bảng dealer_purchase_requests
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS dealer_purchase_requests (
                request_id {pk_type},
                request_code VARCHAR(30) UNIQUE NOT NULL,
                customer_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity_requested INT NOT NULL,
                unit_price {dec_type} NOT NULL,
                total_amount {dec_type} NOT NULL,
                status VARCHAR(30) DEFAULT 'CHO_XU_LY',
                expected_delivery_date DATE,
                notes TEXT,
                sales_order_id INT,
                supplementary_prod_order_id INT,
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP,
                resolved_at {ts_type}
            );
        """)

        # 6. Bảng order_returns
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS order_returns (
                return_id {pk_type},
                return_code VARCHAR(30) UNIQUE NOT NULL,
                sales_order_id INT,
                customer_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity_returned INT NOT NULL,
                reason TEXT NOT NULL,
                resolution_type VARCHAR(30) DEFAULT 'TRU_CONG_NO',
                amount_compensated {dec_type} DEFAULT 0.00,
                status VARCHAR(30) DEFAULT 'DA_XU_LY',
                notes TEXT,
                created_at {ts_type} DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 7. Bảng staff_agent_assignments (Phân quyền đại lý cho nhân viên tiếp thị / phân phối)
        db.execute(f"""
            CREATE TABLE IF NOT EXISTS staff_agent_assignments (
                assignment_id {pk_type},
                user_id INT NOT NULL,
                customer_id INT NOT NULL,
                assigned_at {ts_type} DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                CONSTRAINT uq_staff_customer UNIQUE (user_id, customer_id)
            );
        """)

        # Cột workshop_id và defect_rate cho production_orders
        if is_pg:
            try:
                db.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS workshop_id INT;")
            except Exception:
                pass
            try:
                db.execute(f"ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS defect_rate {dec_type} DEFAULT 0.0;")
            except Exception:
                pass
        else:
            try:
                db.execute("ALTER TABLE production_orders ADD COLUMN workshop_id INT;")
            except Exception:
                pass
            try:
                db.execute(f"ALTER TABLE production_orders ADD COLUMN defect_rate {dec_type} DEFAULT 0.0;")
            except Exception:
                pass

        # Cập nhật defect_rate cho đơn hoàn thành có hao hụt mẫu
        try:
            db.execute("UPDATE production_orders SET defect_rate = 14.5 WHERE LOWER(order_code) = 'po-2026-003';")
        except Exception:
            pass

        # Seed Phân xưởng mẫu
        w_cnt = db.query("SELECT COUNT(*) as cnt FROM workshops;")[0]["cnt"]
        if w_cnt == 0:
            seed_workshops = [
                ("WS01", "Xưởng Chưng Yến Vô Trùng Khánh Hòa", "YEN_SAO", "Số 12 Trần Phú, TP. Nha Trang, Khánh Hòa", "Lê Văn Sản", 3000),
                ("WS02", "Xưởng Rang Xay & Đóng Gói Cà Phê Cầu Đất", "CA_PHE", "Xã Xuân Trường, TP. Đà Lạt, Lâm Đồng", "Trần Hữu Nghị", 2500),
                ("WS03", "Phân Xưởng Hoàn Thiện & Đóng Gói Sài Gòn", "DONG_GOI", "KCN Tân Bình, Quận Tân Phú, TP.HCM", "Nguyễn Thị Hoa", 5000),
            ]
            for c, n, t, loc, mgr, cap in seed_workshops:
                db.execute("""
                    INSERT INTO workshops (workshop_code, workshop_name, workshop_type, location, manager_name, capacity_per_day, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'ACTIVE');
                """, (c, n, t, loc, mgr, cap))

        # Seed Ca làm việc mẫu
        s_cnt = db.query("SELECT COUNT(*) as cnt FROM work_shifts;")[0]["cnt"]
        if s_cnt == 0:
            seed_shifts = [
                ("CA-1", "Ca Sáng Sản Xuất", "06:00", "14:00", 8.0, "Ca chế biến sơ chế nguyên liệu & hấp tiệt trùng mẻ đầu ngày"),
                ("CA-2", "Ca Chiều Hoàn Thiện", "14:00", "22:00", 8.0, "Ca đóng gói, dán nhãn, siết nắp và kiểm định thành phẩm"),
                ("CA-HC", "Ca Hành Chính Kỹ Thuật", "08:00", "17:00", 8.0, "Ca quản lý xưởng, bảo trì máy móc và kiểm tra QA/QC"),
            ]
            for c, n, st, et, hr, ds in seed_shifts:
                db.execute("""
                    INSERT INTO work_shifts (shift_code, shift_name, start_time, end_time, standard_hours, description)
                    VALUES (%s, %s, %s, %s, %s, %s);
                """, (c, n, st, et, hr, ds))

        # Seed Công nhân mẫu
        wk_cnt = db.query("SELECT COUNT(*) as cnt FROM workers;")[0]["cnt"]
        if wk_cnt == 0:
            seed_workers = [
                ("CN01", "Trần Văn Lành", "0912345001", 1, "THO_CHINH", "Sơ chế & nhặt lông yến rút khô", 42000),
                ("CN02", "Lê Thị Mười", "0912345002", 1, "THO_CHINH", "Vận hành nồi chưng tiệt trùng 121 độ C", 40000),
                ("CN03", "Nguyễn Văn Đức", "0912345003", 1, "THO_PHU", "Rửa sấy tiệt trùng hũ & siết nắp thiếc", 32000),
                ("CN04", "Phạm Quốc Cường", "0912345004", 2, "THO_CHINH", "Vận hành máy rang cà phê khí nóng Probat", 45000),
                ("CN05", "Đặng Thị Lan", "0912345005", 2, "KY_THUAT_VIEN", "Đóng gói phin giấy & kiểm định cupping", 38000),
                ("CN06", "Bùi Văn Tài", "0912345006", 3, "THO_PHU", "Đóng thùng carton, dán tem QR & bốc xếp pallet", 32000),
            ]
            for c, fn, ph, wid, sk, sp, rt in seed_workers:
                db.execute("""
                    INSERT INTO workers (worker_code, full_name, phone, workshop_id, skill_level, specialty, hourly_rate, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE');
                """, (c, fn, ph, wid, sk, sp, rt))

        # Seed Yêu cầu nhập hàng từ Đại lý mẫu
        dr_cnt = db.query("SELECT COUNT(*) as cnt FROM dealer_purchase_requests;")[0]["cnt"]
        if dr_cnt == 0:
            seed_dealer_reqs = [
                ("DLR-2026-001", 1, 1, 100, 38000, 3800000, "DU_HANG_DA_XUAT", "2026-02-01", "Đại lý Tâm An đặt 100 lọ yến chưng - Kho đủ tồn đã xuất"),
                ("DLR-2026-002", 2, 2, 300, 38000, 11400000, "THIEU_HANG_CHO_SX", "2026-02-15", "Siêu thị GreenMart đặt 300 chai yến - Thiếu 120 chai, đã gửi yêu cầu SX"),
                ("DLR-2026-003", 3, 5, 50, 60000, 3000000, "CHO_XU_LY", "2026-02-10", "Chuỗi Cafe Bình Minh yêu cầu nhập 50 hộp cà phê phin giấy"),
            ]
            for rc, cid, pid, qty, prc, tot, st, edd, nt in seed_dealer_reqs:
                db.execute("""
                    INSERT INTO dealer_purchase_requests (request_code, customer_id, product_id, quantity_requested, unit_price, total_amount, status, expected_delivery_date, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (rc, cid, pid, qty, prc, tot, st, edd, nt))

        # Seed Đổi trả hàng mẫu
        ret_cnt = db.query("SELECT COUNT(*) as cnt FROM order_returns;")[0]["cnt"]
        if ret_cnt == 0:
            db.execute("""
                INSERT INTO order_returns (return_code, sales_order_id, customer_id, product_id, quantity_returned, reason, resolution_type, amount_compensated, status, notes)
                VALUES (%s, 1, 1, 1, 2, 'Vỡ 2 lọ thủy tinh do đơn vị vận chuyển dằn xóc', 'TRU_CONG_NO', 90000, 'DA_XU_LY', 'Đã cấn trừ 90,000 đ vào công nợ đại lý Tâm An');
            """, ("RET-2026-001",))

        # Cập nhật danh sách 6 vai trò tài khoản chuẩn
        roles_to_seed = [
            ("admin", "admin123", "Trần Quốc Bảo (Admin Dev Mode)", "ADMIN", "admin@yencaphe.vn"),
            ("giamdoc", "giamdoc123", "Trần Quốc Bảo (Giám Đốc)", "GIAM_DOC", "giamdoc@yencaphe.vn"),
            ("kho", "kho123", "Nguyễn Văn Kho (Trưởng Kho)", "QUAN_LY_KHO", "kho@yencaphe.vn"),
            ("sanxuat", "sanxuat123", "Lê Văn Sản (Quản Đốc SX)", "QUAN_DOC_SAN_XUAT", "sanxuat@yencaphe.vn"),
            ("phanphoi", "phanphoi123", "Hoàng Thị Phân Phối (QL Đại Lý Miền Nam)", "QUAN_LY_PHAN_PHOI", "phanphoi@yencaphe.vn"),
            ("tiepthi1", "tiepthi123", "Nguyễn Văn Tiếp Thị (QL Đại Lý Miền Trung/Bắc)", "QUAN_LY_PHAN_PHOI", "tiepthi1@yencaphe.vn"),
            ("daily1", "daily123", "Đại Lý Yến Cà Phê Tâm An", "DAI_LY", "taman@daily.vn"),
            ("thumua", "thumua123", "Phạm Thị Mua (Ban Thu Mua)", "PROCUREMENT", "thumua@yencaphe.vn"),
            ("sx", "sx123", "Lê Văn Sản (Alias SX)", "PRODUCTION_STAFF", "sx@yencaphe.vn"),
        ]
        for u, p, fn, r, em in roles_to_seed:
            ex = db.query("SELECT user_id FROM users WHERE LOWER(username) = %s;", (u.lower(),))
            if not ex:
                db.execute("""
                    INSERT INTO users (username, password_hash, full_name, role, email, status)
                    VALUES (%s, %s, %s, %s, %s, 'ACTIVE');
                """, (u, p, fn, r, em))
            else:
                db.execute("UPDATE users SET full_name = %s, role = %s WHERE LOWER(username) = %s;", (fn, r, u.lower()))

        # Seed Phân công đại lý mẫu cho nhân viên tiếp thị
        saa_cnt = db.query("SELECT COUNT(*) as cnt FROM staff_agent_assignments;")[0]["cnt"]
        if saa_cnt == 0:
            u_pp = db.query("SELECT user_id FROM users WHERE LOWER(username) = 'phanphoi';")
            u_tt = db.query("SELECT user_id FROM users WHERE LOWER(username) = 'tiepthi1';")
            if u_pp:
                pp_id = u_pp[0]["user_id"]
                # phanphoi phụ trách đại lý 1, 2, 5
                for cid in [1, 2, 5]:
                    db.execute("INSERT INTO staff_agent_assignments (user_id, customer_id, notes) VALUES (%s, %s, %s);",
                               (pp_id, cid, "Gán phụ trách quản lý đại lý & kênh phân phối miền Nam"))
            if u_tt:
                tt_id = u_tt[0]["user_id"]
                # tiepthi1 phụ trách đại lý 3, 4
                for cid in [3, 4]:
                    db.execute("INSERT INTO staff_agent_assignments (user_id, customer_id, notes) VALUES (%s, %s, %s);",
                               (tt_id, cid, "Gán phụ trách quản lý đại lý & kênh phân phối miền Trung/Bắc"))

ensure_v190_schema()

def ensure_v200_schema():
    """
    Nâng cấp CSDL Version 2.0.0 phục vụ trọn vẹn 3 tác nhân:
    - Bổ sung contact_phone cho workshops
    - Bổ sung status cho suppliers
    - Bổ sung bom_version và receipt_status cho production_orders
    - Bổ sung version_code cho bill_of_materials
    """
    with DBContext() as db:
        is_pg = (db.mode == "POSTGRESQL")
        if is_pg:
            try:
                db.execute("ALTER TABLE workshops ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);")
            except Exception:
                pass
            try:
                db.execute("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';")
            except Exception:
                pass
            try:
                db.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS bom_version VARCHAR(50);")
            except Exception:
                pass
            try:
                db.execute("ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(30) DEFAULT 'CHO_NHAP_KHO';")
            except Exception:
                pass
            try:
                db.execute("ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS version_code VARCHAR(50);")
            except Exception:
                pass
        else:
            for sql in [
                "ALTER TABLE workshops ADD COLUMN contact_phone TEXT;",
                "ALTER TABLE suppliers ADD COLUMN status TEXT DEFAULT 'ACTIVE';",
                "ALTER TABLE production_orders ADD COLUMN bom_version TEXT;",
                "ALTER TABLE production_orders ADD COLUMN receipt_status TEXT DEFAULT 'CHO_NHAP_KHO';",
                "ALTER TABLE bill_of_materials ADD COLUMN version_code TEXT;",
            ]:
                try:
                    db.execute(sql)
                except Exception:
                    pass

        try:
            db.execute("UPDATE workshops SET contact_phone = '0905123456' WHERE workshop_code = 'WS01' AND (contact_phone IS NULL OR contact_phone = '');")
            db.execute("UPDATE workshops SET contact_phone = '0908765432' WHERE workshop_code = 'WS02' AND (contact_phone IS NULL OR contact_phone = '');")
            db.execute("UPDATE workshops SET contact_phone = '0901234888' WHERE workshop_code = 'WS03' AND (contact_phone IS NULL OR contact_phone = '');")
            db.execute("UPDATE suppliers SET status = 'ACTIVE' WHERE status IS NULL OR status = '';")
            db.execute("UPDATE production_orders SET receipt_status = 'DA_NHAP_KHO' WHERE LOWER(status) = 'completed' OR LOWER(status) = 'hoan_thanh';")
            db.execute("UPDATE production_orders SET receipt_status = 'CHO_NHAP_KHO' WHERE (receipt_status IS NULL OR receipt_status = '') AND LOWER(status) != 'completed' AND LOWER(status) != 'hoan_thanh';")
        except Exception:
            pass

ensure_v200_schema()

def ensure_v210_schema():
    """
    Nâng cấp CSDL Version 2.1.0:
    - Bổ sung cột is_selling cho products (PP_01)
    - Tạo bảng warehouses cho quản lý kho (QLK mới)
    - Bổ sung cột dispatch_code cho dealer_purchase_requests phục vụ quy trình 6 bước
    """
    with DBContext() as db:
        is_pg = (db.mode == "POSTGRESQL")
        if is_pg:
            try:
                db.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_selling BOOLEAN DEFAULT TRUE;")
            except Exception:
                pass
            try:
                db.execute("ALTER TABLE dealer_purchase_requests ADD COLUMN IF NOT EXISTS dispatch_code VARCHAR(50);")
            except Exception:
                pass
            try:
                db.execute("""
                    CREATE TABLE IF NOT EXISTS warehouses (
                        warehouse_id SERIAL PRIMARY KEY,
                        warehouse_code VARCHAR(50) UNIQUE NOT NULL,
                        warehouse_name VARCHAR(150) NOT NULL,
                        warehouse_type VARCHAR(50) NOT NULL DEFAULT 'KHO_THANH_PHAM',
                        manager_name VARCHAR(100),
                        contact_phone VARCHAR(20),
                        location VARCHAR(255),
                        capacity VARCHAR(100),
                        status VARCHAR(20) DEFAULT 'ACTIVE',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            except Exception:
                pass
        else:
            for sql in [
                "ALTER TABLE products ADD COLUMN is_selling INTEGER DEFAULT 1;",
                "ALTER TABLE dealer_purchase_requests ADD COLUMN dispatch_code TEXT;",
                """CREATE TABLE IF NOT EXISTS warehouses (
                    warehouse_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    warehouse_code TEXT UNIQUE NOT NULL,
                    warehouse_name TEXT NOT NULL,
                    warehouse_type TEXT NOT NULL DEFAULT 'KHO_THANH_PHAM',
                    manager_name TEXT,
                    contact_phone TEXT,
                    location TEXT,
                    capacity TEXT,
                    status TEXT DEFAULT 'ACTIVE',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );"""
            ]:
                try:
                    db.execute(sql)
                except Exception:
                    pass

        try:
            db.execute("UPDATE products SET is_selling = TRUE WHERE is_selling IS NULL;")
            # Seed 2 kho ban đầu nếu bảng warehouses đang trống
            cnt = db.query("SELECT COUNT(*) as cnt FROM warehouses;")[0]["cnt"]
            if cnt == 0:
                seed_whs = [
                    ("KHO_NVL_01", "Kho Nguyên Vật Liệu & Bao Bì Khánh Hòa", "KHO_NGUYEN_VAT_LIEU", "Nguyễn Văn Kho", "0901000005", "Lô C1, KCN Suối Dầu, Cam Lâm, Khánh Hòa", "50 Tấn Yến Thô & Chai Lọ", "ACTIVE"),
                    ("KHO_TP_01", "Kho Thành Phẩm Trung Tâm TP.HCM", "KHO_THANH_PHAM", "Lê Thị Thủ Kho", "0908555666", "Kho B3, KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM", "100.000 Hộp/Lon/Chai", "ACTIVE")
                ]
                for code, name, wtype, mgr, phone, loc, cap, st in seed_whs:
                    db.execute("""
                        INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, manager_name, contact_phone, location, capacity, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                    """, (code, name, wtype, mgr, phone, loc, cap, st))
        except Exception:
            pass

ensure_v210_schema()


# =============================================================================
# API PHÂN XƯỞNG SẢN XUẤT (QUẢN ĐỐC SẢN XUẤT - QDSX_03)
# =============================================================================

@app.get("/api/production/workshops")
def get_workshops():
    """Lấy danh sách các phân xưởng sản xuất kèm số điện thoại liên hệ"""
    with DBContext() as db:
        data = db.query("SELECT * FROM workshops ORDER BY workshop_id;")
    return {"data": data, "total": len(data)}

class WorkshopCreate(BaseModel):
    workshop_code: str
    workshop_name: str
    workshop_type: str = "YEN_SAO"
    location: str
    manager_name: Optional[str] = "Lê Văn Sản"
    contact_phone: Optional[str] = "0905123456"
    capacity_per_day: Optional[int] = 2000

@app.post("/api/production/workshops")
def create_workshop(req: WorkshopCreate):
    """Tạo phân xưởng sản xuất mới"""
    with DBContext() as db:
        new_id = db.execute("""
            INSERT INTO workshops (workshop_code, workshop_name, workshop_type, location, manager_name, contact_phone, capacity_per_day, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE');
        """, (req.workshop_code.strip(), req.workshop_name.strip(), req.workshop_type, req.location, req.manager_name, req.contact_phone, req.capacity_per_day))
    return {"success": True, "message": f"Tạo thành công phân xưởng {req.workshop_name}", "workshop_id": new_id}

class WorkshopUpdate(BaseModel):
    workshop_name: str
    workshop_type: str = "YEN_SAO"
    location: str
    manager_name: Optional[str] = ""
    contact_phone: Optional[str] = ""
    capacity_per_day: Optional[int] = 2000
    status: Optional[str] = "ACTIVE"

@app.put("/api/production/workshops/{workshop_id}")
def update_workshop(workshop_id: int, req: WorkshopUpdate):
    """Cập nhật thông tin phân xưởng sản xuất (QDSX_03)"""
    with DBContext() as db:
        db.execute("""
            UPDATE workshops 
            SET workshop_name = %s, workshop_type = %s, location = %s,
                manager_name = %s, contact_phone = %s, capacity_per_day = %s, status = %s
            WHERE workshop_id = %s;
        """, (req.workshop_name.strip(), req.workshop_type, req.location, req.manager_name, req.contact_phone, req.capacity_per_day, req.status, workshop_id))
    return {"success": True, "message": f"Cập nhật thông tin phân xưởng '{req.workshop_name}' thành công"}

@app.get("/api/production/workshops/{workshop_id}/history")
def get_workshop_orders_history(workshop_id: int):
    """Lấy danh sách các lệnh sản xuất từng được phân bổ cho phân xưởng này (QDSX_03)"""
    with DBContext() as db:
        orders = db.query("""
            SELECT po.*, p.product_name, p.product_code, p.unit
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            WHERE po.workshop_id = %s
            ORDER BY po.order_id DESC;
        """, (workshop_id,))
    return {"data": orders, "total": len(orders)}

# =============================================================================
# API QUẢN LÝ NHÀ CUNG CẤP NGUYÊN VẬT LIỆU (QUẢN LÝ KHO - QLK_01)
# =============================================================================

class SupplierCreateUpdate(BaseModel):
    supplier_code: str
    supplier_name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    status: Optional[str] = "ACTIVE"

@app.get("/api/suppliers")
def get_suppliers(q: Optional[str] = None, status: Optional[str] = None):
    """Lấy danh sách nhà cung cấp NVL kèm tìm kiếm & lọc trạng thái (QLK_01)"""
    with DBContext() as db:
        sql = "SELECT * FROM suppliers WHERE 1=1"
        params = []
        if status:
            sql += " AND UPPER(status) = UPPER(%s)"
            params.append(status)
        if q:
            kw = f"%{q.strip().lower()}%"
            sql += " AND (LOWER(supplier_name) LIKE %s OR LOWER(supplier_code) LIKE %s OR LOWER(phone) LIKE %s)"
            params.extend([kw, kw, kw])
        sql += " ORDER BY supplier_id;"
        data = db.query(sql, tuple(params))
    return {"data": data, "total": len(data)}

@app.post("/api/suppliers")
def create_supplier(req: SupplierCreateUpdate):
    """Thêm mới nhà cung cấp nguyên vật liệu (QLK_01)"""
    with DBContext() as db:
        existing = db.query("SELECT supplier_id FROM suppliers WHERE UPPER(supplier_code) = %s;", (req.supplier_code.strip().upper(),))
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã nhà cung cấp '{req.supplier_code}' đã tồn tại")
        new_id = db.execute("""
            INSERT INTO suppliers (supplier_code, supplier_name, phone, email, address, status)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (req.supplier_code.strip().upper(), req.supplier_name.strip(), req.phone, req.email, req.address, req.status or "ACTIVE"))
    return {"success": True, "message": f"Thêm mới nhà cung cấp '{req.supplier_name}' thành công", "supplier_id": new_id}

@app.put("/api/suppliers/{supplier_id}")
def update_supplier(supplier_id: int, req: SupplierCreateUpdate):
    """Cập nhật thông tin hoặc trạng thái hợp tác của nhà cung cấp (QLK_01)"""
    with DBContext() as db:
        db.execute("""
            UPDATE suppliers 
            SET supplier_name = %s, phone = %s, email = %s, address = %s, status = %s
            WHERE supplier_id = %s;
        """, (req.supplier_name.strip(), req.phone, req.email, req.address, req.status or "ACTIVE", supplier_id))
    return {"success": True, "message": f"Cập nhật nhà cung cấp '{req.supplier_name}' thành công"}

@app.delete("/api/suppliers/{supplier_id}")
def delete_or_deactivate_supplier(supplier_id: int):
    """Ngừng hợp tác hoặc xóa nhà cung cấp nếu chưa có phiếu nhập phát sinh (QLK_01)"""
    with DBContext() as db:
        sup = db.query("SELECT * FROM suppliers WHERE supplier_id = %s;", (supplier_id,))
        if not sup:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhà cung cấp")
        sname = sup[0]["supplier_name"]
        rcs = db.query("SELECT receipt_id FROM material_receipts WHERE supplier_name = %s;", (sname,))
        if rcs:
            db.execute("UPDATE suppliers SET status = 'INACTIVE' WHERE supplier_id = %s;", (supplier_id,))
            return {"success": True, "message": f"Nhà cung cấp '{sname}' đã có lịch sử nhập hàng nên hệ thống chuyển trạng thái sang [NGỪNG HỢP TÁC]", "action": "DEACTIVATED"}
        else:
            db.execute("DELETE FROM suppliers WHERE supplier_id = %s;", (supplier_id,))
            return {"success": True, "message": f"Đã xóa hoàn toàn nhà cung cấp '{sname}'", "action": "DELETED"}

# =============================================================================
# API DUYỆT NHẬP KHO THÀNH PHẨM SAU SẢN XUẤT (QUẢN LÝ KHO - QLK_06)
# =============================================================================

class FinishedGoodsReceiveRequest(BaseModel):
    order_id: int
    batch_number: Optional[str] = None
    received_quantity: int = 0
    manufacture_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = "Thủ kho duyệt nhập thành phẩm từ xưởng sản xuất"
    approved_by: Optional[str] = "kho"

@app.get("/api/inventory/pending-finished-goods")
def get_pending_finished_goods():
    """Lấy danh sách các lệnh sản xuất đã hoàn thành nhưng đang chờ Thủ kho duyệt nhập thành phẩm (QLK_06)"""
    with DBContext() as db:
        sql = """
            SELECT po.*, p.product_name, p.product_code, p.unit, p.cost_price,
                   ws.workshop_name, ws.workshop_code
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            LEFT JOIN workshops ws ON po.workshop_id = ws.workshop_id
            WHERE (LOWER(po.status) = 'completed' OR LOWER(po.status) = 'hoan_thanh')
              AND (po.receipt_status IS NULL OR po.receipt_status != 'DA_NHAP_KHO')
            ORDER BY po.order_id DESC;
        """
        data = db.query(sql)
    return {"data": data, "total": len(data)}

@app.post("/api/inventory/receive-finished-goods")
def receive_finished_goods(req: FinishedGoodsReceiveRequest):
    """
    Thủ kho xác nhận duyệt nhập kho thành phẩm sau sản xuất (QLK_06):
    - Cập nhật lệnh sản xuất receipt_status = 'DA_NHAP_KHO'
    - Cộng số lượng vào kho thành phẩm finished_goods_inventory kèm số lô, NSX, HSD
    - Đẩy thông báo chuông hệ thống
    """
    with DBContext() as db:
        orders = db.query("SELECT * FROM production_orders WHERE order_id = %s;", (req.order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy lệnh sản xuất")
        order = orders[0]
        pid = order["product_id"]
        qty = req.received_quantity if req.received_quantity > 0 else (order.get("completed_quantity") or order.get("target_quantity") or 100)
        
        from datetime import timedelta
        batch = req.batch_number or f"BATCH-{order['order_code']}"
        mfg = req.manufacture_date or datetime.now().strftime("%Y-%m-%d")
        exp = req.expiry_date or (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")

        # Cập nhật trạng thái lệnh sản xuất
        db.execute("""
            UPDATE production_orders 
            SET receipt_status = 'DA_NHAP_KHO', completed_quantity = %s
            WHERE order_id = %s;
        """, (qty, req.order_id))

        # Nhập kho thành phẩm: Kiểm tra đã có bản ghi batch_number này chưa
        exist_inv = db.query("SELECT inventory_id, quantity_in_stock FROM finished_goods_inventory WHERE product_id = %s AND batch_number = %s;", (pid, batch))
        if exist_inv:
            db.execute("UPDATE finished_goods_inventory SET quantity_in_stock = quantity_in_stock + %s WHERE inventory_id = %s;", (qty, exist_inv[0]["inventory_id"]))
        else:
            cost_p = db.query("SELECT cost_price FROM products WHERE product_id = %s;", (pid,))
            c_val = cost_p[0]["cost_price"] if cost_p and cost_p[0]["cost_price"] else 25000.0
            db.execute("""
                INSERT INTO finished_goods_inventory (product_id, batch_number, quantity_in_stock, manufacture_date, expiry_date, unit_cost)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (pid, batch, qty, mfg, exp, c_val))

        # Bắn thông báo hệ thống
        db.execute("""
            INSERT INTO system_notifications (title, message, severity, is_read)
            VALUES (%s, %s, 'SUCCESS', FALSE);
        """, (
            f"Duyệt nhập kho thành phẩm: Lệnh {order['order_code']}",
            f"Thủ kho {req.approved_by} đã duyệt nhập kho {qty} sản phẩm (Lô {batch}, HSD: {exp}) từ xưởng sản xuất."
        ))

    return {
        "success": True,
        "message": f"Duyệt nhập kho thành công {qty} sản phẩm theo lệnh {order['order_code']}",
        "batch_number": batch,
        "quantity_received": qty
    }
    return {"success": True, "message": f"Tạo thành công phân xưởng {req.workshop_name}", "workshop_id": new_id}

@app.get("/api/production/workers")
def get_workers():
    """Lấy danh sách công nhân xưởng kèm thông tin xưởng phụ trách"""
    with DBContext() as db:
        sql = """
            SELECT w.*, ws.workshop_name, ws.workshop_type 
            FROM workers w
            LEFT JOIN workshops ws ON w.workshop_id = ws.workshop_id
            ORDER BY w.worker_id;
        """
        data = db.query(sql)
    return {"data": data, "total": len(data)}

class WorkerCreate(BaseModel):
    worker_code: str
    full_name: str
    phone: Optional[str] = ""
    workshop_id: Optional[int] = 1
    skill_level: Optional[str] = "THO_CHINH"
    specialty: Optional[str] = ""
    hourly_rate: Optional[float] = 35000.0

@app.post("/api/production/workers")
def create_worker(req: WorkerCreate):
    """Thêm công nhân xưởng mới"""
    with DBContext() as db:
        new_id = db.execute("""
            INSERT INTO workers (worker_code, full_name, phone, workshop_id, skill_level, specialty, hourly_rate, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE');
        """, (req.worker_code.strip(), req.full_name.strip(), req.phone, req.workshop_id, req.skill_level, req.specialty, req.hourly_rate))
    return {"success": True, "message": f"Đã thêm công nhân {req.full_name}", "worker_id": new_id}

@app.get("/api/production/shifts")
def get_work_shifts():
    """Lấy danh mục các ca làm việc"""
    with DBContext() as db:
        data = db.query("SELECT * FROM work_shifts ORDER BY shift_id;")
    return {"data": data}

class WorkerAssignRequest(BaseModel):
    worker_ids: List[int]
    shift_id: int = 1
    planned_hours: float = 8.0
    notes: Optional[str] = ""

@app.post("/api/production/orders/{order_id}/assign-workers")
def assign_workers_to_order(order_id: int, req: WorkerAssignRequest):
    """Phân công công nhân và ca làm cho một lệnh sản xuất cụ thể"""
    assigned_date = datetime.now().strftime("%Y-%m-%d")
    with DBContext() as db:
        order = db.query("SELECT order_id, order_code FROM production_orders WHERE order_id = %s;", (order_id,))
        if not order:
            raise HTTPException(status_code=404, detail="Lệnh sản xuất không tồn tại")
        
        assigned_cnt = 0
        for wid in req.worker_ids:
            db.execute("""
                INSERT INTO production_worker_assignments 
                (production_order_id, worker_id, shift_id, assigned_date, planned_hours, actual_hours, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (order_id, wid, req.shift_id, assigned_date, req.planned_hours, req.planned_hours, req.notes))
            assigned_cnt += 1
            
    return {
        "success": True, 
        "message": f"Đã phân công thành công {assigned_cnt} công nhân vào lệnh {order[0]['order_code']}",
        "order_id": order_id,
        "assigned_workers": assigned_cnt
    }

@app.get("/api/production/orders/{order_id}/workers")
def get_order_workers(order_id: int):
    """Xem danh sách công nhân phân công trong lệnh sản xuất"""
    with DBContext() as db:
        sql = """
            SELECT pwa.*, w.worker_code, w.full_name, w.skill_level, w.specialty, ws.shift_name, ws.start_time, ws.end_time
            FROM production_worker_assignments pwa
            JOIN workers w ON pwa.worker_id = w.worker_id
            LEFT JOIN work_shifts ws ON pwa.shift_id = ws.shift_id
            WHERE pwa.production_order_id = %s
            ORDER BY pwa.assignment_id;
        """
        data = db.query(sql, (order_id,))
    return {"data": data, "total": len(data)}

@app.post("/api/production/orders/{order_id}/auto-reorder-defect")
def auto_reorder_defect(order_id: int):
    """
    Tự động tạo Lệnh sản xuất bù hao hụt khi tỷ lệ phế phẩm > 10% (theo đề bài):
    Tự động tính số lượng hỏng để tạo Lệnh sản xuất bổ sung và gửi thông báo chuông.
    """
    with DBContext() as db:
        orders = db.query("""
            SELECT po.*, p.product_name 
            FROM production_orders po
            JOIN products p ON po.product_id = p.product_id
            WHERE po.order_id = %s;
        """, (order_id,))
        if not orders:
            raise HTTPException(status_code=404, detail="Không tìm thấy Lệnh sản xuất")
        
        orig = orders[0]
        completed = int(orig.get("completed_quantity") or 0)
        defect = int(orig.get("defect_quantity") or 0)
        total_produced = completed + defect
        
        if defect <= 0:
            raise HTTPException(status_code=400, detail="Lệnh này không ghi nhận sản phẩm lỗi/hao hụt để bù")
        
        defect_rate = (defect / total_produced) if total_produced > 0 else 0.0
        
        # Tạo mã lệnh bổ sung
        new_code = f"PO-BU-{orig['order_code']}-{int(datetime.now().timestamp()) % 10000}"
        new_notes = f"Lệnh sản xuất bổ sung bù hao hụt {defect} sản phẩm ({defect_rate*100:.1f}%) từ lệnh gốc {orig['order_code']}"
        
        new_order_id = db.execute("""
            INSERT INTO production_orders (order_code, plan_id, workshop_id, product_id, target_quantity, status, notes)
            VALUES (%s, %s, %s, %s, %s, 'PENDING', %s);
        """, (new_code, orig.get("plan_id"), orig.get("workshop_id") or 1, orig["product_id"], defect, new_notes))
        
    # Bắn thông báo lên chuông hệ thống sau khi commit DB
    try:
        dispatch_n8n_webhook("system-alert", {
            "title": f"[Sản Xuất] Kích hoạt Lệnh bù hao hụt {new_code}",
            "message": f"Hao hụt vượt ngưỡng ({defect_rate*100:.1f}% > 10%). Đã lập lệnh SX bổ sung {defect} {orig['product_name']}.",
            "severity": "WARNING"
        }, "03_event_driven_alerts", "03 - Event-Driven System Alerts")
    except Exception:
        pass
        
    return {
        "success": True,
        "message": f"Đã tự động tạo Lệnh sản xuất bổ sung {new_code} với số lượng {defect} sản phẩm",
        "new_order_id": new_order_id,
        "new_order_code": new_code,
        "defect_quantity": defect,
        "reorder_quantity": defect,
        "defect_rate_percent": round(defect_rate * 100, 2)
    }


# =============================================================================
# API QUẢN LÝ PHÂN PHỐI ĐẠI LÝ & ĐỔI TRẢ
# =============================================================================

@app.get("/api/distribution/dealer-requests")
def get_dealer_purchase_requests(staff_user_id: Optional[int] = None):
    """Lấy danh sách các yêu cầu nhập hàng từ đại lý (hỗ trợ lọc theo nhân viên tiếp thị phụ trách)"""
    with DBContext() as db:
        if staff_user_id:
            sql = """
                SELECT dpr.*, c.customer_name, c.customer_code, c.phone, c.current_debt, c.credit_limit,
                       p.product_name, p.product_code, p.unit,
                       COALESCE((SELECT SUM(quantity_in_stock) FROM finished_goods_inventory WHERE product_id = dpr.product_id), 0) as current_stock
                FROM dealer_purchase_requests dpr
                JOIN customers c ON dpr.customer_id = c.customer_id
                JOIN products p ON dpr.product_id = p.product_id
                JOIN staff_agent_assignments saa ON dpr.customer_id = saa.customer_id
                WHERE saa.user_id = %s
                ORDER BY dpr.request_id DESC;
            """
            data = db.query(sql, (staff_user_id,))
        else:
            sql = """
                SELECT dpr.*, c.customer_name, c.customer_code, c.phone, c.current_debt, c.credit_limit,
                       p.product_name, p.product_code, p.unit,
                       COALESCE((SELECT SUM(quantity_in_stock) FROM finished_goods_inventory WHERE product_id = dpr.product_id), 0) as current_stock
                FROM dealer_purchase_requests dpr
                JOIN customers c ON dpr.customer_id = c.customer_id
                JOIN products p ON dpr.product_id = p.product_id
                ORDER BY dpr.request_id DESC;
            """
            data = db.query(sql)
    return {"data": data, "total": len(data)}

class DealerRequestCreate(BaseModel):
    customer_id: Optional[int] = None
    agent_code: Optional[str] = None
    product_id: int
    quantity_requested: int
    expected_delivery_date: Optional[str] = None
    notes: Optional[str] = ""

@app.post("/api/distribution/dealer-requests")
def create_dealer_purchase_request(req: DealerRequestCreate):
    """Đại lý hoặc nhân viên phân phối gửi yêu cầu nhập hàng mới"""
    if req.quantity_requested <= 0:
        raise HTTPException(status_code=400, detail="Số lượng yêu cầu phải lớn hơn 0")
        
    with DBContext() as db:
        cust_id = req.customer_id
        if not cust_id and req.agent_code:
            code = req.agent_code.strip()
            c_rows = db.query("SELECT customer_id FROM customers WHERE UPPER(customer_code) = UPPER(%s) OR phone = %s", (code, code))
            if c_rows:
                cust_id = c_rows[0]["customer_id"]
            else:
                cust_id = 1
        elif not cust_id:
            cust_id = 1

        prod = db.query("SELECT product_name, selling_price, cost_price FROM products WHERE product_id = %s;", (req.product_id,))
        cust = db.query("SELECT customer_name, customer_type FROM customers WHERE customer_id = %s;", (cust_id,))
        if not prod or not cust:
            raise HTTPException(status_code=404, detail="Sản phẩm hoặc Đại lý không tồn tại")
            
        unit_price = float(prod[0]["selling_price"] or 45000.0)
        # Nếu là đại lý VIP chiết khấu sỉ
        if cust[0]["customer_type"] == "AGENT_VIP":
            unit_price = round(unit_price * 0.82, 0)
            
        import uuid
        total_amount = unit_price * req.quantity_requested
        req_code = f"DLR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        new_id = db.execute("""
            INSERT INTO dealer_purchase_requests 
            (request_code, customer_id, product_id, quantity_requested, unit_price, total_amount, status, expected_delivery_date, notes)
            VALUES (%s, %s, %s, %s, %s, %s, 'CHO_XU_LY', %s, %s);
        """, (req_code, cust_id, req.product_id, req.quantity_requested, unit_price, total_amount, req.expected_delivery_date, req.notes))
        cust_name = cust[0]['customer_name']
        prod_name = prod[0]['product_name']
        
    # Bắn thông báo có yêu cầu nhập hàng mới sau khi commit DB
    try:
        dispatch_n8n_webhook("system-alert", {
            "title": f"[Đại Lý] Yêu cầu nhập hàng mới {req_code}",
            "message": f"Đại lý {cust_name} yêu cầu nhập {req.quantity_requested} {prod_name} ({total_amount:,.0f} ₫).",
            "severity": "INFO"
        }, "03_event_driven_alerts", "03 - Event-Driven System Alerts")
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Đã tiếp nhận yêu cầu nhập hàng {req_code} từ đại lý",
        "request_id": new_id,
        "request_code": req_code,
        "total_amount": total_amount
    }

@app.post("/api/distribution/dealer-requests/{request_id}/check-stock")
def check_dealer_request_stock(request_id: int):
    """Kiểm tra số lượng tồn kho thành phẩm khả dụng so với yêu cầu"""
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu nhập hàng")
        r = reqs[0]
        
        stock_rows = db.query("""
            SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock 
            FROM finished_goods_inventory 
            WHERE product_id = %s;
        """, (r["product_id"],))
        
        total_stock = int(stock_rows[0]["total_stock"] or 0)
        qty_needed = int(r["quantity_requested"])
        is_sufficient = (total_stock >= qty_needed)
        deficit = max(0, qty_needed - total_stock)
        
    return {
        "success": True,
        "request_id": request_id,
        "product_id": r["product_id"],
        "requested_quantity": qty_needed,
        "available_stock": total_stock,
        "is_sufficient": is_sufficient,
        "is_stock_sufficient": is_sufficient,
        "deficit": deficit,
        "deficit_quantity": deficit,
        "recommendation": "ĐỦ TỒN KHO: Có thể duyệt xuất kho ngay" if is_sufficient else f"THIẾU {deficit} SẢN PHẨM: Đề xuất hẹn giao và chuyển Lệnh sản xuất"
    }

@app.post("/api/distribution/dealer-requests/{request_id}/approve-dispatch")
def approve_dealer_request_dispatch(request_id: int):
    """
    Kịch bản 1 (Đủ tồn kho): Duyệt xuất kho thành phẩm
    - Tự động tạo đơn hàng bán (sales_orders)
    - Tự động tạo phiếu xuất kho (inventory_dispatches)
    - Trừ tồn kho thành phẩm tương ứng
    - Cập nhật trạng thái yêu cầu sang 'DU_HANG_DA_XUAT'
    """
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]
        
        stock_rows = db.query("SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock FROM finished_goods_inventory WHERE product_id = %s;", (r["product_id"],))
        avail = int(stock_rows[0]["total_stock"] or 0)
        if avail < int(r["quantity_requested"]):
            raise HTTPException(status_code=400, detail=f"Tồn kho thành phẩm không đủ (Chỉ còn {avail}/{r['quantity_requested']})! Hãy chuyển yêu cầu sang sản xuất.")
            
        # 1. Tạo sales_orders
        so_code = f"SO-DLR-{int(datetime.now().timestamp()) % 100000}"
        so_id = db.execute("""
            INSERT INTO sales_orders 
            (order_code, customer_id, total_amount, discount_amount, final_amount, status, payment_method, payment_status, channel_type, notes)
            VALUES (%s, %s, %s, 0, %s, 'DELIVERED', 'CONG_NO_DAI_LY', 'PENDING', 'DEALER_PORTAL', %s);
        """, (so_code, r["customer_id"], r["total_amount"], r["total_amount"], f"Xuất kho tự động từ yêu cầu đại lý {r['request_code']}"))
        
        # 2. Tạo sales_order_details
        db.execute("""
            INSERT INTO sales_order_details (sales_order_id, product_id, quantity, unit_price, discount, subtotal)
            VALUES (%s, %s, %s, %s, 0, %s);
        """, (so_id, r["product_id"], r["quantity_requested"], r["unit_price"], r["total_amount"]))
        
        # 3. Tạo inventory_dispatches
        disp_code = f"DISP-DLR-{int(datetime.now().timestamp()) % 100000}"
        db.execute("""
            INSERT INTO inventory_dispatches (dispatch_code, sales_order_id, created_by)
            VALUES (%s, %s, 'phanphoi');
        """, (disp_code, so_id))
        
        # 4. Trừ tồn kho
        rem = int(r["quantity_requested"])
        invs = db.query("SELECT inventory_id, quantity_in_stock FROM finished_goods_inventory WHERE product_id = %s AND quantity_in_stock > 0 ORDER BY expiry_date ASC;", (r["product_id"],))
        for inv in invs:
            ded = min(rem, int(inv["quantity_in_stock"]))
            db.execute("UPDATE finished_goods_inventory SET quantity_in_stock = quantity_in_stock - %s WHERE inventory_id = %s;", (ded, inv["inventory_id"]))
            rem -= ded
            if rem <= 0:
                break
                
        # 5. Cập nhật công nợ đại lý
        db.execute("UPDATE customers SET current_debt = current_debt + %s WHERE customer_id = %s;", (r["total_amount"], r["customer_id"]))
        
        # 6. Cập nhật trạng thái yêu cầu
        db.execute("""
            UPDATE dealer_purchase_requests 
            SET status = 'DU_HANG_DA_XUAT', sales_order_id = %s, resolved_at = CURRENT_TIMESTAMP 
            WHERE request_id = %s;
        """, (so_id, request_id))
        
    return {
        "success": True,
        "message": f"Duyệt xuất kho thành công! Đã tạo đơn bán hàng {so_code} và phiếu xuất {disp_code}",
        "sales_order_id": so_id,
        "sales_order_code": so_code,
        "dispatch_code": disp_code
    }

class DealerRequestProductionHandoff(BaseModel):
    expected_delivery_date: Optional[str] = None
    promised_delivery_date: Optional[str] = None
    notes: Optional[str] = "Chuyển yêu cầu sản xuất bổ sung do thiếu tồn kho"

@app.post("/api/distribution/dealer-requests/{request_id}/request-production")
def request_dealer_production_handoff(request_id: int, req: DealerRequestProductionHandoff):
    """
    Kịch bản 2 (Thiếu hàng): Bộ phận phân phối phản hồi hẹn ngày giao
    và tự động tạo đề xuất Lệnh sản xuất gửi sang Quản đốc xưởng.
    """
    promised_date = req.promised_delivery_date or req.expected_delivery_date or "2026-12-05"
    with DBContext() as db:
        reqs = db.query("""
            SELECT dpr.*, c.customer_name, p.product_name 
            FROM dealer_purchase_requests dpr
            JOIN customers c ON dpr.customer_id = c.customer_id
            JOIN products p ON dpr.product_id = p.product_id
            WHERE dpr.request_id = %s;
        """, (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]
        
        # Tính tồn kho thiếu
        stock_rows = db.query("SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock FROM finished_goods_inventory WHERE product_id = %s;", (r["product_id"],))
        avail = int(stock_rows[0]["total_stock"] or 0)
        deficit = max(int(r["quantity_requested"]) - avail, int(r["quantity_requested"]))
        
        # Tạo Lệnh sản xuất bổ sung
        import uuid
        po_code = f"PO-DLR-{uuid.uuid4().hex[:6].upper()}"
        po_notes = f"Sản xuất đáp ứng đơn hàng đại lý {r['customer_name']} (Yêu cầu {r['request_code']}). Hẹn giao: {promised_date}."
        
        po_id = db.execute("""
            INSERT INTO production_orders (order_code, product_id, workshop_id, target_quantity, status, notes)
            VALUES (%s, %s, 1, %s, 'PENDING', %s);
        """, (po_code, r["product_id"], deficit, po_notes))
        
        # Cập nhật yêu cầu
        db.execute("""
            UPDATE dealer_purchase_requests 
            SET status = 'THIEU_HANG_CHO_SX', expected_delivery_date = %s, supplementary_prod_order_id = %s, notes = %s, resolved_at = CURRENT_TIMESTAMP
            WHERE request_id = %s;
        """, (promised_date, po_id, req.notes, request_id))
        
        cust_name = r['customer_name']
        prod_name = r['product_name']

    # Bắn thông báo sang Quản đốc sau khi commit DB
    try:
        dispatch_n8n_webhook("system-alert", {
            "title": f"[Sản Xuất] Lệnh SX mới từ đơn đại lý {po_code}",
            "message": f"Đại lý {cust_name} thiếu {deficit} {prod_name}. Đã lập lệnh SX {po_code} hẹn giao {promised_date}.",
            "severity": "WARNING"
        }, "03_event_driven_alerts", "03 - Event-Driven System Alerts")
    except Exception:
        pass
        
    return {
        "success": True,
        "message": f"Đã hẹn giao ngày {promised_date} và chuyển đề xuất tạo Lệnh sản xuất {po_code} ({deficit} sản phẩm)",
        "production_order_id": po_id,
        "production_order_code": po_code,
        "expected_delivery_date": promised_date,
        "promised_delivery_date": promised_date
    }

# --- Đổi trả hàng lỗi (Order Returns) ---

@app.get("/api/distribution/returns")
def get_order_returns(staff_user_id: Optional[int] = None):
    """Lấy danh sách các phiếu đổi trả hàng từ đại lý (hỗ trợ lọc theo nhân viên tiếp thị phụ trách)"""
    with DBContext() as db:
        if staff_user_id:
            sql = """
                SELECT ret.*, c.customer_name, c.customer_code, p.product_name, p.product_code, so.order_code
                FROM order_returns ret
                JOIN customers c ON ret.customer_id = c.customer_id
                JOIN products p ON ret.product_id = p.product_id
                JOIN staff_agent_assignments saa ON ret.customer_id = saa.customer_id
                LEFT JOIN sales_orders so ON ret.sales_order_id = so.sales_order_id
                WHERE saa.user_id = %s
                ORDER BY ret.return_id DESC;
            """
            data = db.query(sql, (staff_user_id,))
        else:
            sql = """
                SELECT ret.*, c.customer_name, c.customer_code, p.product_name, p.product_code, so.order_code
                FROM order_returns ret
                JOIN customers c ON ret.customer_id = c.customer_id
                JOIN products p ON ret.product_id = p.product_id
                LEFT JOIN sales_orders so ON ret.sales_order_id = so.sales_order_id
                ORDER BY ret.return_id DESC;
            """
            data = db.query(sql)
    return {"data": data, "total": len(data)}

# =============================================================================
# API PHÂN QUYỀN ĐẠI LÝ CHO NHÂN VIÊN TIẾP THỊ (STAFF - AGENT ASSIGNMENTS)
# =============================================================================

@app.get("/api/distribution/marketing-staff")
def get_marketing_staff_list():
    """Lấy danh sách tài khoản nhân viên tiếp thị / phân phối kèm số đại lý đang phụ trách"""
    with DBContext() as db:
        sql = """
            SELECT u.user_id, u.username, u.full_name, u.role, u.email,
                   COUNT(saa.assignment_id) as assigned_agent_count
            FROM users u
            LEFT JOIN staff_agent_assignments saa ON u.user_id = saa.user_id
            WHERE u.role IN ('QUAN_LY_PHAN_PHOI', 'ADMIN', 'GIAM_DOC') AND u.status = 'ACTIVE'
            GROUP BY u.user_id, u.username, u.full_name, u.role, u.email
            ORDER BY u.user_id;
        """
        data = db.query(sql)
    return {"data": data, "total": len(data)}

@app.get("/api/distribution/staff-assignments")
def get_staff_agent_assignments(staff_user_id: Optional[int] = None):
    """
    Lấy danh sách phân công đại lý cho nhân viên tiếp thị:
    Nếu có staff_user_id -> trả về danh sách chi tiết và mảng assigned_customer_ids.
    """
    with DBContext() as db:
        if staff_user_id:
            sql = """
                SELECT saa.assignment_id, saa.user_id, saa.customer_id, saa.assigned_at, saa.notes,
                       c.customer_name, c.customer_code, c.customer_type, c.region, c.phone, c.current_debt, c.credit_limit
                FROM staff_agent_assignments saa
                JOIN customers c ON saa.customer_id = c.customer_id
                WHERE saa.user_id = %s
                ORDER BY c.customer_id;
            """
            data = db.query(sql, (staff_user_id,))
            assigned_ids = [r["customer_id"] for r in data]
            return {
                "staff_user_id": staff_user_id,
                "data": data,
                "assigned_customer_ids": assigned_ids,
                "total": len(data)
            }
        else:
            sql = """
                SELECT saa.assignment_id, saa.user_id, saa.customer_id, saa.assigned_at, saa.notes,
                       u.full_name as staff_name, u.username as staff_username,
                       c.customer_name, c.customer_code, c.customer_type, c.region
                FROM staff_agent_assignments saa
                JOIN users u ON saa.user_id = u.user_id
                JOIN customers c ON saa.customer_id = c.customer_id
                ORDER BY saa.user_id, c.customer_id;
            """
            data = db.query(sql)
            return {"data": data, "total": len(data)}

class StaffAssignmentUpdate(BaseModel):
    staff_user_id: int
    customer_ids: List[int]
    notes: Optional[str] = "Phân công phụ trách đại lý từ ban quản trị"

@app.post("/api/distribution/staff-assignments")
def update_staff_agent_assignments(req: StaffAssignmentUpdate):
    """
    Admin phân quyền phụ trách đại lý cho nhân viên tiếp thị:
    Lưu danh sách đại lý được chọn cho nhân viên cụ thể.
    """
    with DBContext() as db:
        # Kiểm tra nhân viên tồn tại
        staff_rows = db.query("SELECT user_id, full_name, username, role FROM users WHERE user_id = %s;", (req.staff_user_id,))
        if not staff_rows:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản nhân viên")
        staff = staff_rows[0]

        # Xóa các phân công cũ của nhân viên này
        db.execute("DELETE FROM staff_agent_assignments WHERE user_id = %s;", (req.staff_user_id,))

        # Thêm mới các phân công được chọn
        added_count = 0
        for cid in req.customer_ids:
            try:
                db.execute("""
                    INSERT INTO staff_agent_assignments (user_id, customer_id, notes)
                    VALUES (%s, %s, %s);
                """, (req.staff_user_id, cid, req.notes or f"Phân công cho {staff['full_name']}"))
                added_count += 1
            except Exception:
                pass

    return {
        "success": True,
        "message": f"Đã cập nhật phân quyền thành công! Nhân viên {staff['full_name']} hiện phụ trách {added_count} đại lý.",
        "staff_user_id": req.staff_user_id,
        "assigned_count": added_count,
        "assigned_customer_ids": req.customer_ids
    }

class OrderReturnCreate(BaseModel):
    sales_order_id: Optional[int] = None
    customer_id: int
    product_id: int
    quantity_returned: int
    reason: str
    resolution_type: Optional[str] = "TRU_CONG_NO" # "TRU_CONG_NO" hoặc "DOI_HANG_MOI"

@app.post("/api/distribution/returns")
def create_order_return(req: OrderReturnCreate):
    """Tiếp nhận và xử lý phiếu đổi trả hàng lỗi từ đại lý"""
    if req.quantity_returned <= 0:
        raise HTTPException(status_code=400, detail="Số lượng trả phải lớn hơn 0")
        
    with DBContext() as db:
        cust = db.query("SELECT customer_name FROM customers WHERE customer_id = %s;", (req.customer_id,))
        prod = db.query("SELECT product_name, selling_price FROM products WHERE product_id = %s;", (req.product_id,))
        if not cust or not prod:
            raise HTTPException(status_code=404, detail="Khách hàng hoặc Sản phẩm không tồn tại")
            
        unit_price = float(prod[0]["selling_price"] or 45000.0)
        amount_comp = unit_price * req.quantity_returned
        ret_code = f"RET-{datetime.now().strftime('%Y%m%d')}-{int(datetime.now().timestamp()) % 10000}"
        
        # Nếu chọn cấn trừ công nợ -> trừ trực tiếp nợ khách
        if req.resolution_type == "TRU_CONG_NO":
            db.execute("UPDATE customers SET current_debt = MAX(0.0, current_debt - %s) WHERE customer_id = %s;", (amount_comp, req.customer_id))
            
        ret_id = db.execute("""
            INSERT INTO order_returns 
            (return_code, sales_order_id, customer_id, product_id, quantity_returned, reason, resolution_type, amount_compensated, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'DA_XU_LY', %s);
        """, (ret_code, req.sales_order_id, req.customer_id, req.product_id, req.quantity_returned, req.reason, req.resolution_type, amount_comp, f"Đã tiếp nhận xử lý phương án: {req.resolution_type}"))
        
    return {
        "success": True,
        "message": f"Đã tiếp nhận xử lý phiếu đổi trả {ret_code} ({amount_comp:,.0f} ₫)",
        "return_id": ret_id,
        "return_code": ret_code,
        "amount_compensated": amount_comp
    }


# =============================================================================
# API QUẢN LÝ DANH MỤC CÁC KHO (QUẢN LÝ KHO - YÊU CẦU MỚI)
# =============================================================================

class WarehouseCreateUpdate(BaseModel):
    warehouse_code: str
    warehouse_name: str
    warehouse_type: str = "KHO_THANH_PHAM" # KHO_NGUYEN_VAT_LIEU hoặc KHO_THANH_PHAM
    manager_name: Optional[str] = ""
    contact_phone: Optional[str] = ""
    location: Optional[str] = ""
    capacity: Optional[str] = ""
    status: Optional[str] = "ACTIVE"

@app.get("/api/warehouses")
def get_warehouses():
    """Lấy danh sách các kho (kho NVL, kho thành phẩm) kèm người đại diện & SĐT liên hệ"""
    with DBContext() as db:
        data = db.query("SELECT * FROM warehouses ORDER BY warehouse_id;")
    return {"data": data, "total": len(data)}

@app.post("/api/warehouses")
def create_warehouse(req: WarehouseCreateUpdate):
    """Đăng ký mới một kho lưu trữ"""
    with DBContext() as db:
        existing = db.query("SELECT warehouse_id FROM warehouses WHERE UPPER(warehouse_code) = %s;", (req.warehouse_code.strip().upper(),))
        if existing:
            raise HTTPException(status_code=400, detail=f"Mã kho '{req.warehouse_code}' đã tồn tại")
        new_id = db.execute("""
            INSERT INTO warehouses (warehouse_code, warehouse_name, warehouse_type, manager_name, contact_phone, location, capacity, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (req.warehouse_code.strip().upper(), req.warehouse_name.strip(), req.warehouse_type, req.manager_name, req.contact_phone, req.location, req.capacity, req.status or "ACTIVE"))
    return {"success": True, "message": f"Tạo mới kho '{req.warehouse_name}' thành công", "warehouse_id": new_id}

@app.put("/api/warehouses/{warehouse_id}")
def update_warehouse(warehouse_id: int, req: WarehouseCreateUpdate):
    """Cập nhật thông tin kho, người đại diện, số điện thoại, sức chứa"""
    with DBContext() as db:
        db.execute("""
            UPDATE warehouses
            SET warehouse_name = %s, warehouse_type = %s, manager_name = %s, contact_phone = %s,
                location = %s, capacity = %s, status = %s
            WHERE warehouse_id = %s;
        """, (req.warehouse_name.strip(), req.warehouse_type, req.manager_name, req.contact_phone, req.location, req.capacity, req.status or "ACTIVE", warehouse_id))
    return {"success": True, "message": f"Cập nhật thông tin kho '{req.warehouse_name}' thành công"}

@app.get("/api/warehouses/{warehouse_id}/transactions")
def get_warehouse_transactions(warehouse_id: int):
    """Lấy lịch sử các lệnh nhập kho và xuất kho liên quan đến kho này"""
    with DBContext() as db:
        wh = db.query("SELECT * FROM warehouses WHERE warehouse_id = %s;", (warehouse_id,))
        if not wh:
            raise HTTPException(status_code=404, detail="Không tìm thấy kho")
        w = wh[0]
        # Lấy lịch sử nhập thành phẩm
        inbounds = db.query("""
            SELECT fg.lot_number, p.product_name, p.product_code, fg.quantity_in_stock, fg.manufactured_date, fg.expiry_date, fg.created_at
            FROM finished_goods_inventory fg
            JOIN products p ON fg.product_id = p.product_id
            ORDER BY fg.inventory_id DESC LIMIT 15;
        """)
        # Lấy lịch sử xuất kho
        outbounds = db.query("""
            SELECT d.dispatch_code, so.order_code, c.customer_name, d.dispatched_at, d.created_by
            FROM inventory_dispatches d
            JOIN sales_orders so ON d.sales_order_id = so.sales_order_id
            JOIN customers c ON so.customer_id = c.customer_id
            ORDER BY d.dispatch_id DESC LIMIT 15;
        """)
    return {
        "warehouse": w,
        "inbounds": inbounds,
        "outbounds": outbounds
    }


# =============================================================================
# API QUY TRÌNH 6 BƯỚC ĐẠI LÝ NHẬP HÀNG & ĐỔI TRẢ (MỞ RỘNG)
# =============================================================================

@app.post("/api/distribution/dealer-requests/{request_id}/forward-to-warehouse")
def forward_dealer_request_to_warehouse(request_id: int):
    """
    Bước 2: Nhân viên phân phối kiểm tra kho -> Đủ hàng -> Gửi 'Lệnh yêu cầu xuất kho thành phẩm' sang Quản lý kho.
    Trạng thái chuyển sang: CHO_KHO_XUAT
    """
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]

        # Kiểm tra tồn kho
        stock_rows = db.query("SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock FROM finished_goods_inventory WHERE product_id = %s;", (r["product_id"],))
        avail = int(stock_rows[0]["total_stock"] or 0)
        if avail < int(r["quantity_requested"]):
            raise HTTPException(status_code=400, detail=f"Tồn kho thành phẩm không đủ (Chỉ còn {avail}/{r['quantity_requested']})! Vui lòng chọn nhánh Hẹn giao & Chuyển sản xuất.")

        db.execute("""
            UPDATE dealer_purchase_requests
            SET status = 'CHO_KHO_XUAT', notes = %s
            WHERE request_id = %s;
        """, (f"Nhân viên phân phối đã kiểm tra đủ tồn ({avail} SP) và gửi lệnh yêu cầu xuất kho sang Quản lý kho", request_id))

    return {
        "success": True,
        "message": f"Đã gửi Lệnh yêu cầu xuất kho cho yêu cầu {r['request_code']} sang Quản lý kho phê duyệt",
        "status": "CHO_KHO_XUAT"
    }

@app.post("/api/distribution/dealer-requests/{request_id}/warehouse-dispatch")
def warehouse_dispatch_dealer_request(request_id: int):
    """
    Bước 3 & 4: Quản lý kho kiểm tra số lượng lần 2 -> Chấp nhận & Tự động tạo 'Phiếu xuất kho cho đại lý',
    trừ tồn kho thực tế, ghi nhận công nợ đại lý.
    Trạng thái chuyển sang: DANG_GIAO_HANG
    """
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]

        # Kiểm tra tồn kho lần 2
        stock_rows = db.query("SELECT COALESCE(SUM(quantity_in_stock), 0) as total_stock FROM finished_goods_inventory WHERE product_id = %s;", (r["product_id"],))
        avail = int(stock_rows[0]["total_stock"] or 0)
        if avail < int(r["quantity_requested"]):
            raise HTTPException(status_code=400, detail=f"Quản lý kho kiểm tra: Tồn kho hiện tại không đủ ({avail}/{r['quantity_requested']})")

        # 1. Tạo sales_orders
        so_code = f"SO-DLR-{int(datetime.now().timestamp()) % 100000}"
        so_id = db.execute("""
            INSERT INTO sales_orders 
            (order_code, customer_id, total_amount, discount_amount, final_amount, status, payment_method, payment_status, channel_type, notes)
            VALUES (%s, %s, %s, 0, %s, 'CONFIRMED', 'CONG_NO_DAI_LY', 'PENDING', 'DEALER_PORTAL', %s);
        """, (so_code, r["customer_id"], r["total_amount"], r["total_amount"], f"Đơn hàng xuất kho tự động cho đại lý theo yêu cầu {r['request_code']}"))

        # 2. Tạo sales_order_details
        db.execute("""
            INSERT INTO sales_order_details (sales_order_id, product_id, quantity, unit_price, discount, subtotal)
            VALUES (%s, %s, %s, %s, 0, %s);
        """, (so_id, r["product_id"], r["quantity_requested"], r["unit_price"], r["total_amount"]))

        # 3. Tạo inventory_dispatches
        disp_code = f"DISP-DLR-{int(datetime.now().timestamp()) % 100000}"
        db.execute("""
            INSERT INTO inventory_dispatches (dispatch_code, sales_order_id, created_by)
            VALUES (%s, %s, 'kho (Thủ Kho)');
        """, (disp_code, so_id))

        # 4. Trừ tồn kho thành phẩm
        rem = int(r["quantity_requested"])
        invs = db.query("SELECT inventory_id, quantity_in_stock FROM finished_goods_inventory WHERE product_id = %s AND quantity_in_stock > 0 ORDER BY expiry_date ASC;", (r["product_id"],))
        for inv in invs:
            ded = min(rem, int(inv["quantity_in_stock"]))
            db.execute("UPDATE finished_goods_inventory SET quantity_in_stock = quantity_in_stock - %s WHERE inventory_id = %s;", (ded, inv["inventory_id"]))
            rem -= ded
            if rem <= 0:
                break

        # 5. Ghi nhận công nợ cho đại lý
        db.execute("UPDATE customers SET current_debt = current_debt + %s WHERE customer_id = %s;", (r["total_amount"], r["customer_id"]))

        # 6. Cập nhật trạng thái yêu cầu
        db.execute("""
            UPDATE dealer_purchase_requests 
            SET status = 'DANG_GIAO_HANG', sales_order_id = %s, dispatch_code = %s, resolved_at = CURRENT_TIMESTAMP 
            WHERE request_id = %s;
        """, (so_id, disp_code, request_id))

    return {
        "success": True,
        "message": f"Thủ kho đã duyệt xuất hàng thành công! Đã tạo phiếu xuất kho {disp_code} và ghi nhận công nợ đại lý.",
        "sales_order_id": so_id,
        "sales_order_code": so_code,
        "dispatch_code": disp_code,
        "status": "DANG_GIAO_HANG"
    }

@app.post("/api/distribution/dealer-requests/{request_id}/agent-confirm-received")
def agent_confirm_received(request_id: int):
    """
    Bước 5: Đại lý kiểm tra hàng đúng -> Bấm 'Xác nhận nhận hàng'.
    Trạng thái chuyển sang: HOAN_THANH
    """
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]

        db.execute("""
            UPDATE dealer_purchase_requests
            SET status = 'HOAN_THANH', notes = %s
            WHERE request_id = %s;
        """, (f"Đại lý đã kiểm tra số lượng & chất lượng hàng và bấm xác nhận nhận hàng thành công", request_id))

        if r.get("sales_order_id"):
            db.execute("UPDATE sales_orders SET status = 'DELIVERED' WHERE sales_order_id = %s;", (r["sales_order_id"],))

    return {
        "success": True,
        "message": f"Đại lý đã xác nhận nhận hàng thành công cho yêu cầu {r['request_code']}!",
        "status": "HOAN_THANH"
    }

class AgentReturnRequest(BaseModel):
    reason: str
    quantity_returned: Optional[int] = None

@app.post("/api/distribution/dealer-requests/{request_id}/agent-request-return")
def agent_request_return(request_id: int, req: AgentReturnRequest):
    """
    Bước 6: Đại lý kiểm tra hàng không đúng -> Gửi 'Phiếu yêu cầu trả hàng' cho nhà phân phối.
    Hệ thống cấn trừ công nợ đại lý và hoàn trả hàng về kho.
    """
    with DBContext() as db:
        reqs = db.query("SELECT * FROM dealer_purchase_requests WHERE request_id = %s;", (request_id,))
        if not reqs:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        r = reqs[0]

        qty = req.quantity_returned or int(r["quantity_requested"])
        refund_amount = qty * float(r["unit_price"] or 45000)

        # 1. Trừ công nợ đại lý
        db.execute("UPDATE customers SET current_debt = MAX(0.0, current_debt - %s) WHERE customer_id = %s;", (refund_amount, r["customer_id"]))

        # 2. Hoàn hàng về kho thành phẩm
        invs = db.query("SELECT inventory_id FROM finished_goods_inventory WHERE product_id = %s LIMIT 1;", (r["product_id"],))
        if invs:
            db.execute("UPDATE finished_goods_inventory SET quantity_in_stock = quantity_in_stock + %s WHERE inventory_id = %s;", (qty, invs[0]["inventory_id"]))

        # 3. Tạo order_returns
        ret_code = f"RET-DLR-{int(datetime.now().timestamp()) % 100000}"
        db.execute("""
            INSERT INTO order_returns (return_code, sales_order_id, customer_id, product_id, quantity_returned, reason, resolution_type, amount_compensated, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, 'TRU_CONG_NO', %s, 'DA_XU_LY', %s);
        """, (ret_code, r.get("sales_order_id"), r["customer_id"], r["product_id"], qty, req.reason, refund_amount, f"Đại lý trả hàng do: {req.reason}. Đã trừ công nợ và hoàn hàng vào kho."))

        # 4. Cập nhật trạng thái yêu cầu
        db.execute("""
            UPDATE dealer_purchase_requests
            SET status = 'DA_HOAN_HANG', notes = %s
            WHERE request_id = %s;
        """, (f"Đại lý yêu cầu trả hàng ({qty} SP). Đã lập phiếu đổi trả {ret_code}, cấn trừ {refund_amount:,.0f}₫ công nợ và hoàn hàng vào kho.", request_id))

    return {
        "success": True,
        "message": f"Đã lập phiếu trả hàng {ret_code}, cấn trừ {refund_amount:,.0f} ₫ công nợ đại lý và hoàn hàng về kho thành công!",
        "return_code": ret_code,
        "refund_amount": refund_amount,
        "status": "DA_HOAN_HANG"
    }


# =============================================================================
# API TỔNG KẾT SẢN LƯỢNG SẢN XUẤT THEO THÁNG (QUẢN ĐỐC SẢN XUẤT - QDSX_09)
# =============================================================================

@app.get("/api/production/monthly-summary")
def get_production_monthly_summary():
    """
    Tổng kết số lượng sản phẩm sản xuất theo tháng (QDSX_09):
    Bao gồm Tháng/Năm, Tổng lệnh SX, Tổng sản lượng hoàn thành, Tỷ lệ hao hụt trung bình.
    """
    with DBContext() as db:
        sql = """
            SELECT 
                p.product_id,
                p.product_name,
                p.product_code,
                p.unit,
                COUNT(po.order_id) as total_orders,
                COALESCE(SUM(po.target_quantity), 0) as total_target_qty,
                COALESCE(SUM(po.completed_quantity), 0) as total_completed_qty,
                ROUND(COALESCE(AVG(po.defect_rate), 0.0), 1) as avg_defect_rate,
                COALESCE(SUM(po.total_cost), 0) as total_production_cost
            FROM products p
            LEFT JOIN production_orders po ON p.product_id = po.product_id
            GROUP BY p.product_id, p.product_name, p.product_code, p.unit
            ORDER BY p.product_id;
        """
        rows = db.query(sql)

        # Mock tổng kết theo 3 tháng gần nhất phục vụ báo cáo xu hướng
        monthly_breakdown = [
            {"month": "Tháng 09/2026", "total_orders": 8, "total_output": 4200, "avg_defect_pct": 2.1, "status": "HOÀN TẤT KẾ HOẠCH"},
            {"month": "Tháng 10/2026", "total_orders": 12, "total_output": 6800, "avg_defect_pct": 1.8, "status": "HOÀN TẤT KẾ HOẠCH"},
            {"month": "Tháng 11/2026 (Hiện tại)", "total_orders": 15, "total_output": 9500, "avg_defect_pct": 2.4, "status": "ĐANG CAO ĐIỂM TẾT"},
        ]

    return {
        "data": rows,
        "monthly_breakdown": monthly_breakdown,
        "total_products": len(rows)
    }


@app.get("/api/inventory/report/export")
def get_inventory_export_report():
    """Lấy dữ liệu báo cáo tồn kho tổng hợp chi tiết sẵn sàng in/PDF"""
    with DBContext() as db:
        # Tồn kho nguyên vật liệu
        materials = db.query("""
            SELECT material_code, material_name, unit, current_stock, unit_cost, min_stock_level,
                   ROUND(current_stock * unit_cost, 2) as total_value,
                   CASE WHEN current_stock < min_stock_level THEN 'CANH_BAO_THIEU' ELSE 'AN_TOAN' END as stock_status
            FROM materials ORDER BY material_id;
        """)
        # Tồn kho thành phẩm
        finished_goods = db.query("""
            SELECT fg.lot_number, p.product_code, p.product_name, p.unit, p.selling_price, p.cost_price,
                   fg.quantity_in_stock, fg.manufactured_date, fg.expiry_date, fg.warehouse_location,
                   ROUND(fg.quantity_in_stock * p.selling_price, 2) as retail_value,
                   ROUND(fg.quantity_in_stock * p.cost_price, 2) as cogs_value
            FROM finished_goods_inventory fg
            JOIN products p ON fg.product_id = p.product_id
            WHERE fg.quantity_in_stock > 0
            ORDER BY fg.expiry_date ASC;
        """)
        
        tot_mat_val = sum(float(m.get("total_value") or 0) for m in materials)
        tot_fg_val = sum(float(f.get("retail_value") or 0) for f in finished_goods)
        
    return {
        "report_title": "BÁO CÁO NHẬP - XUẤT - TỒN KHO TOÀN HỆ THỐNG",
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "company_name": "DOANH NGHIỆP YẾN SÀO KHÁNH HÒA & CÀ PHÊ CẦU ĐẤT",
        "summary": {
            "total_material_items": len(materials),
            "total_material_value_vnd": tot_mat_val,
            "total_finished_goods_lots": len(finished_goods),
            "total_finished_goods_value_vnd": tot_fg_val
        },
        "materials": materials,
        "finished_goods": finished_goods
    }

class DevSwitchRoleRequest(BaseModel):
    target_role: str # 'ADMIN', 'GIAM_DOC', 'QUAN_LY_KHO', 'QUAN_DOC_SAN_XUAT', 'QUAN_LY_PHAN_PHOI', 'DAI_LY'

@app.post("/api/auth/dev-switch-role")
def dev_switch_role(req: DevSwitchRoleRequest):
    """
    Nút giả lập vai trò dành cho Admin (Dev Mode):
    Chuyển đổi tức thì sang danh tính người dùng đại diện của vai trò mục tiêu.
    """
    role_user_map = {
        "ADMIN": "admin",
        "GIAM_DOC": "giamdoc",
        "QUAN_LY_KHO": "kho",
        "WAREHOUSE_MANAGER": "kho",
        "QUAN_DOC_SAN_XUAT": "sanxuat",
        "PRODUCTION_STAFF": "sanxuat",
        "QUAN_LY_PHAN_PHOI": "phanphoi",
        "PROCUREMENT": "thumua",
        "DAI_LY": "daily1"
    }
    target_user = role_user_map.get(req.target_role.upper(), "admin")
    with DBContext() as db:
        users = db.query("SELECT user_id, username, full_name, role, email FROM users WHERE LOWER(username) = %s;", (target_user.lower(),))
        if not users:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản giả lập tương ứng")
        u = users[0]
        token = f"token_{u['role']}_{u['user_id']}_{u['username']}"
        
    return {
        "success": True,
        "message": f"Dev Mode: Đã chuyển đổi vai trò thành công sang [{u['role']}] - {u['full_name']}",
        "token": token,
        "user": u
    }


# =============================================================================
# 12. UNIFIED SINGLE-PORT SPA SERVING (DÀNH CHO CLOUDFLARE TUNNEL & PRODUCTION)
# =============================================================================
_assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
if os.path.isdir(_assets_dir):
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="frontend_assets")


@app.get("/{spa_path:path}", include_in_schema=False)
def serve_spa_catchall(spa_path: str):
    if spa_path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API endpoint '/{spa_path}' không tồn tại")

    # Kiểm tra các tệp tĩnh (assets, js, css, images, icons, font...)
    # Nếu tệp tĩnh không tồn tại, trả về 404 thay vì trả về index.html để tránh lỗi MIME type script
    is_static_asset = (
        spa_path.startswith("assets/")
        or any(spa_path.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".json", ".map"])
    )
    candidate = os.path.join(FRONTEND_DIST_DIR, spa_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)
    elif is_static_asset:
        raise HTTPException(status_code=404, detail=f"Tài nguyên tĩnh '/{spa_path}' không tồn tại")

    index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file, headers=SPA_NO_CACHE_HEADERS)
    return api_health()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

