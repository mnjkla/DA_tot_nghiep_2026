import os
import re
import sys
import sqlite3

# Cấu hình UTF-8 cho console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "database")
SCHEMA_FILE = os.path.join(DB_DIR, "schema.sql")
SEED_FILE = os.path.join(DB_DIR, "seed.sql")
SQLITE_DB_PATH = os.path.join(DB_DIR, "enterprise_erp.db")


def convert_ddl_to_sqlite(sql_text: str) -> str:
    """Chuyển đổi cú pháp DDL PostgreSQL sang SQLite chuẩn."""
    sql = re.sub(r"DROP TABLE IF EXISTS (\w+) CASCADE;", r"DROP TABLE IF EXISTS \1;", sql_text)
    sql = re.sub(r"\bSERIAL PRIMARY KEY\b", "INTEGER PRIMARY KEY AUTOINCREMENT", sql)
    sql = re.sub(r"\bTIMESTAMP\b", "DATETIME", sql)
    sql = re.sub(r"\bBOOLEAN\b", "INTEGER", sql)
    sql = re.sub(r"\bDECIMAL\(\d+,\s*\d+\)", "NUMERIC", sql)
    sql = re.sub(r"\bINT\b", "INTEGER", sql)
    return sql


def init_database(force_reinit: bool = False):
    """
    Khởi tạo CSDL SQLite nếu chưa có hoặc khi yêu cầu khởi tạo lại.
    Đảm bảo 100% chạy bằng thư viện chuẩn của Python (không phụ thuộc package ngoài).
    """
    os.makedirs(DB_DIR, exist_ok=True)
    needs_init = force_reinit or not os.path.exists(SQLITE_DB_PATH) or os.path.getsize(SQLITE_DB_PATH) == 0

    if not needs_init:
        # Kiểm tra xem có bảng cốt lõi products chưa
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM products")
            cnt = cur.fetchone()[0]
            conn.close()
            if cnt > 0:
                print(f"[Database] Đã tìm thấy cơ sở dữ liệu hợp lệ: {SQLITE_DB_PATH} ({cnt} sản phẩm).")
                # Đảm bảo schema bổ sung (users, campaigns, reviews, notifications, v.v.)
                sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
                try:
                    import main
                    main.ensure_v140_schema()
                    print("[Database] Schema mở rộng (v1.4 - v1.8) đã sẵn sàng.")
                except Exception as ex:
                    print(f"[Database Warning] Không thể cập nhật schema mở rộng: {ex}")
                return
        except Exception:
            needs_init = True

    if needs_init:
        print(f"[Database] Đang khởi tạo CSDL mới tại: {SQLITE_DB_PATH}...")
        if os.path.exists(SQLITE_DB_PATH):
            try:
                os.remove(SQLITE_DB_PATH)
            except Exception:
                pass

        conn = sqlite3.connect(SQLITE_DB_PATH)
        cur = conn.cursor()

        # 1. Nạp schema 24 bảng ERP chuẩn
        if os.path.exists(SCHEMA_FILE):
            print(f"[Database] -> Nạp schema 24 bảng từ {os.path.basename(SCHEMA_FILE)}...")
            with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                schema_sql = convert_ddl_to_sqlite(f.read())
                cur.executescript(schema_sql)

        # 2. Nạp dữ liệu thực tế seed.sql
        if os.path.exists(SEED_FILE):
            print(f"[Database] -> Nạp bộ dữ liệu thực tế từ {os.path.basename(SEED_FILE)}...")
            with open(SEED_FILE, "r", encoding="utf-8") as f:
                cur.executescript(f.read())

        conn.commit()
        conn.close()

        # 3. Kích hoạt schema bổ sung và seed người dùng/chiến dịch nếu cần
        sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
        try:
            import main
            main.ensure_v140_schema()
            print("[Database] -> Khởi tạo bảng users, campaigns, reviews và quyền RBAC thành công!")
        except Exception as ex:
            print(f"[Database Warning] Lỗi khi tạo schema mở rộng: {ex}")

        print(f"[Database] Hoàn tất khởi tạo CSDL SQLite: {SQLITE_DB_PATH}")


if __name__ == "__main__":
    force = "--reset" in sys.argv or "--force" in sys.argv
    init_database(force_reinit=force)
