import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text

# Cấu hình UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "erp_dataset_csv")

# Kết nối container erp_postgres_db (Port chính 5432)
PG_PORT = os.getenv("PG_PORT", "5432")
PG_URI = os.getenv("DATABASE_URL", f"postgresql+psycopg2://erp_user:erp_password@localhost:{PG_PORT}/enterprise_erp")

# Thứ tự nạp chuẩn theo ràng buộc khóa ngoại (Foreign Key)
TABLE_LOAD_ORDER = [
    "suppliers",
    "materials",
    "material_lots",
    "products",
    "bom",
    "production_plans",
    "production_plan_details",
    "production_orders",
    "material_transactions",
    "finished_goods_batches",
    "finished_goods_transactions",
    "customers",
    "price_policies",
    "sales_orders",
    "sales_order_details",
    "goods_issues",
    "goods_issue_details",
    "payments",
    "returns"
]

def load_data():
    print(f"🔌 Đang kết nối tới PostgreSQL (erp_postgres_db trên port {PG_PORT})...")
    engine = create_engine(PG_URI)

    with engine.connect() as conn:
        print("🧹 Đang dọn dẹp dữ liệu cũ (TRUNCATE) để nạp bộ mới...")
        # Xóa theo thứ tự ngược lại để không dính Foreign Key
        for tbl in reversed(TABLE_LOAD_ORDER):
            conn.execute(text(f'TRUNCATE TABLE "{tbl}" CASCADE;'))
        conn.commit()

        print("\n📥 Đang nạp dữ liệu từ 19 file CSV vào PostgreSQL:")
        for tbl in TABLE_LOAD_ORDER:
            csv_path = os.path.join(CSV_DIR, f"{tbl}.csv")
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                # Nạp vào database
                df.to_sql(tbl, con=engine, if_exists="append", index=False, method="multi", chunksize=2000)
                print(f"  ✅ Đã nạp bảng {tbl:<28}: {len(df):>6,} dòng")
            else:
                print(f"  ⚠️ Không tìm thấy file: {csv_path}")

        # Đồng bộ lại sequence tự tăng cho các cột SERIAL
        print("\n🔄 Cập nhật sequence tự tăng cho các cột ID...")
        serial_tables = [
            ("bom", "bom_id"),
            ("production_plan_details", "plan_detail_id"),
            ("material_transactions", "mat_trans_id"),
            ("finished_goods_transactions", "fg_trans_id"),
            ("price_policies", "policy_id"),
            ("sales_order_details", "order_detail_id"),
            ("goods_issue_details", "issue_detail_id")
        ]
        for tbl, col in serial_tables:
            conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), COALESCE(max({col}), 1)) FROM {tbl};"))
        conn.commit()

    print("\n🎉 HOÀN TẤT! Toàn bộ 19 bảng đã được lưu đầy đủ vào Docker PostgreSQL!")

if __name__ == "__main__":
    load_data()
