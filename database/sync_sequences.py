import psycopg2
import time

def sync_sequences(retries=5, delay=1.5):
    conn = None
    for i in range(retries):
        try:
            conn = psycopg2.connect(
                host="localhost",
                port=5434,
                dbname="enterprise_erp",
                user="erp_user",
                password="erp_password",
                connect_timeout=3
            )
            break
        except Exception as e:
            if i < retries - 1:
                time.sleep(delay)
            else:
                print(f"[Warning] Khong the ket noi PostgreSQL: {e}")
                return
    cur = conn.cursor()
    # Lấy danh sách các bảng và sequence tương ứng
    cur.execute("""
        SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS col_name
        FROM pg_class c
        JOIN pg_depend d ON d.objid = c.oid
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        WHERE c.relkind = 'S';
    """)
    rows = cur.fetchall()
    for seq_name, table_name, col_name in rows:
        cur.execute(f"SELECT COALESCE(MAX({col_name}), 0) FROM {table_name};")
        max_id = cur.fetchone()[0]
        cur.execute(f"SELECT setval('{seq_name}', {max(max_id, 1)}, true);")
        print(f"Updated {seq_name} ({table_name}.{col_name}) -> {max(max_id, 1)}")
    conn.commit()
    conn.close()
    print("All sequences synchronized successfully!")

if __name__ == "__main__":
    sync_sequences()
