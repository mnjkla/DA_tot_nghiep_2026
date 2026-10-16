import os
import re
import sys
import sqlite3
import pandas as pd
from sqlalchemy import create_engine, text

# Cấu hình UTF-8 cho console Windows tránh lỗi UnicodeEncodeError khi in tiếng Việt
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")

# Đường dẫn file schema & seed chuẩn chính thức (19 bảng)
SCHEMA_FILE = os.path.join(DB_DIR, "schema.sql")
SEED_FILE = os.path.join(DB_DIR, "seed.sql")
SQLITE_DB_PATH = os.path.join(DB_DIR, "enterprise_erp.db")
CSV_DIR = os.path.join(BASE_DIR, "erp_dataset_csv")

# Cấu hình kết nối PostgreSQL
# Ưu tiên đọc từ biến môi trường DATABASE_URL
# Nếu không có, linh hoạt thử port 5433 (temp hiện tại) hoặc 5432 (container chính)
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_USER = os.getenv("PG_USER", "erp_user")
PG_PASS = os.getenv("PG_PASS", "erp_password")
PG_DB = os.getenv("PG_DB", "enterprise_erp")

PG_URI = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"
)
SQLITE_URI = f"sqlite:///{SQLITE_DB_PATH}"


def _convert_pg_ddl_to_sqlite(sql_script: str) -> str:
    """Chuyển đổi cú pháp DDL của PostgreSQL sang SQLite tương thích 100%."""
    sql = re.sub(r"DROP TABLE IF EXISTS (\w+) CASCADE;", r"DROP TABLE IF EXISTS \1;", sql_script)
    sql = re.sub(r"\bSERIAL PRIMARY KEY\b", "INTEGER PRIMARY KEY AUTOINCREMENT", sql)
    sql = re.sub(r"\bTIMESTAMP\b", "DATETIME", sql)
    return sql


def init_sqlite_fallback():
    """Khởi tạo file database/enterprise_erp.db kèm dữ liệu nếu chưa tồn tại."""
    os.makedirs(DB_DIR, exist_ok=True)
    is_new_db = not os.path.exists(SQLITE_DB_PATH) or os.path.getsize(SQLITE_DB_PATH) == 0

    if is_new_db:
        print("[Hybrid DB] Đang khởi tạo SQLite cục bộ tại: database/enterprise_erp.db ...")
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()

        # 1. Khởi tạo schema (19 bảng chuẩn)
        if os.path.exists(SCHEMA_FILE):
            print(f"[Hybrid DB] Đang nạp schema từ {os.path.basename(SCHEMA_FILE)}...")
            with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                sqlite_schema = _convert_pg_ddl_to_sqlite(f.read())
                cursor.executescript(sqlite_schema)

        # 2. Nạp dữ liệu: ưu tiên bộ 19 CSV nếu có, ngược lại nạp seed.sql
        if os.path.exists(CSV_DIR) and os.listdir(CSV_DIR):
            print("[Hybrid DB] Nạp toàn bộ dữ liệu từ erp_dataset_csv/ vào SQLite...")
            table_load_order = [
                "suppliers", "materials", "material_lots", "products", "bom",
                "production_plans", "production_plan_details", "production_orders",
                "material_transactions", "finished_goods_batches", "finished_goods_transactions",
                "customers", "price_policies", "sales_orders", "sales_order_details",
                "goods_issues", "goods_issue_details", "payments", "returns"
            ]
            for tbl in table_load_order:
                csv_path = os.path.join(CSV_DIR, f"{tbl}.csv")
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    df.to_sql(tbl, conn, if_exists="append", index=False)
        elif os.path.exists(SEED_FILE):
            print(f"[Hybrid DB] Đang nạp dữ liệu mẫu từ {os.path.basename(SEED_FILE)}...")
            with open(SEED_FILE, "r", encoding="utf-8") as f:
                cursor.executescript(f.read())

        conn.commit()
        conn.close()
        print("[Hybrid DB] Khởi tạo SQLite hoàn tất!")


def get_hybrid_db_engine():
    """
    Cơ chế CSDL Kép (Hybrid DB Engine):
    - Ưu tiên 1: Kết nối PostgreSQL trong Docker Container.
    - Ưu tiên 2 (Fallback): Tự động chuyển sang SQLite (database/enterprise_erp.db).
    """
    # Thử kết nối PG_URI chính
    try:
        pg_engine = create_engine(PG_URI, pool_pre_ping=True, connect_args={"connect_timeout": 2})
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[Hybrid DB] Đã kết nối thành công tới PostgreSQL ({PG_URI.split('@')[-1]}).")
        return pg_engine, "POSTGRESQL"
    except Exception:
        # Nếu đang ở port 5433 mà fail, thử fallback sang 5432 (container chuẩn)
        if PG_PORT == "5433":
            try:
                alt_uri = f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:5432/{PG_DB}"
                alt_engine = create_engine(alt_uri, pool_pre_ping=True, connect_args={"connect_timeout": 2})
                with alt_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                print(f"[Hybrid DB] Đã kết nối thành công tới PostgreSQL (port 5432).")
                return alt_engine, "POSTGRESQL"
            except Exception:
                pass

        print("[Hybrid DB] PostgreSQL chưa mở. Tự động fallback sang SQLite (database/enterprise_erp.db).")
        init_sqlite_fallback()
        sqlite_engine = create_engine(SQLITE_URI, connect_args={"check_same_thread": False})
        return sqlite_engine, "SQLITE"


# Khởi chạy kiểm tra khi chạy trực tiếp file này
if __name__ == "__main__":
    print(f"Schema chính thức : {os.path.basename(SCHEMA_FILE)}")
    print(f"Seed data chính   : {os.path.basename(SEED_FILE)}")
    print(f"PostgreSQL target : {PG_URI.split('@')[-1]}")
    engine, db_mode = get_hybrid_db_engine()
    with engine.connect() as connection:
        res = connection.execute(
            text("SELECT product_id, product_name, current_stock FROM products")
        ).fetchall()
        print(f"\nDữ liệu kiểm tra từ [{db_mode}] (Chuẩn 19 bảng ERP):")
        for row in res:
            print(f"   - {row[0]}: {row[1]} (Tồn kho: {row[2]:,})")