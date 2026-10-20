import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

# Cấu hình UTF-8 cho console Windows tránh lỗi UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

print("Bắt đầu tiến trình ETL: OLTP -> Data Warehouse (Schema 'dw')...")

# 1. Kết nối cơ sở dữ liệu PostgreSQL (Mặc định cổng 5432 cho container chính erp_postgres_db)
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_USER = os.getenv("PG_USER", "erp_user")
PG_PASS = os.getenv("PG_PASS", "erp_password")
PG_DB = os.getenv("PG_DB", "enterprise_erp")

DB_URL = os.getenv("DATABASE_URL", f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}")
engine = create_engine(DB_URL)

# Tạo Schema dw nếu chưa có
with engine.connect() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS dw;"))
    conn.commit()

# ==========================================
# PHASE 1: EXTRACT (TRÍCH XUẤT DỮ LIỆU)
# ==========================================
print("Đang trích xuất dữ liệu từ OLTP (Schema: public)...")
products = pd.read_sql("SELECT * FROM public.products", engine)
customers = pd.read_sql("SELECT * FROM public.customers", engine)
sales_orders = pd.read_sql("SELECT * FROM public.sales_orders", engine)
sales_order_details = pd.read_sql("SELECT * FROM public.sales_order_details", engine)
fg_transactions = pd.read_sql("SELECT * FROM public.finished_goods_transactions", engine)
fg_batches = pd.read_sql("SELECT batch_id, product_id FROM public.finished_goods_batches", engine)
prod_orders = pd.read_sql("SELECT * FROM public.production_orders", engine)

# ==========================================
# PHASE 2: TRANSFORM (BIẾN ĐỔI DỮ LIỆU) & LOAD (NẠP DỮ LIỆU)
# ==========================================
print("Đang xử lý Dimensions (Bảng Chiều)...")

# --- 2.1. Bảng dim_date (Tạo mảng ngày chuẩn 2 năm 2024 - 2025) ---
start_date = datetime(2024, 1, 1)
end_date = datetime(2025, 12, 31)
date_list = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]

dim_date = pd.DataFrame({'full_date': date_list})
dim_date['date_key'] = dim_date['full_date'].dt.strftime('%Y%m%d').astype(int)
dim_date['year'] = dim_date['full_date'].dt.year
dim_date['quarter'] = dim_date['full_date'].dt.quarter
dim_date['month'] = dim_date['full_date'].dt.month
dim_date['day'] = dim_date['full_date'].dt.day
dim_date['is_weekend'] = dim_date['full_date'].dt.dayofweek.isin([5, 6])
# Đánh dấu mùa vụ Tết (Tháng 12, 1, 2)
dim_date['season_type'] = np.where(dim_date['month'].isin([1, 2, 12]), 'TET_SEASON', 'NORMAL')

dim_date.to_sql('dim_date', engine, schema='dw', if_exists='replace', index=False)
print(" dim_date: đã nạp thành công.")

# --- 2.2. Bảng dim_product ---
dim_product = products[['product_id', 'product_name', 'unit', 'packaging_spec', 'estimated_cost', 'base_selling_price']].copy()
dim_product.reset_index(inplace=True)
dim_product.rename(columns={'index': 'product_key'}, inplace=True)
dim_product['product_key'] += 1  # Bắt đầu từ 1
dim_product.to_sql('dim_product', engine, schema='dw', if_exists='replace', index=False)
print(" dim_product: đã nạp thành công.")

# --- 2.3. Bảng dim_customer ---
dim_customer = customers[['customer_id', 'customer_name', 'customer_type']].copy()
dim_customer.reset_index(inplace=True)
dim_customer.rename(columns={'index': 'customer_key'}, inplace=True)
dim_customer['customer_key'] += 1  # Bắt đầu từ 1
dim_customer.to_sql('dim_customer', engine, schema='dw', if_exists='replace', index=False)
print(" dim_customer: đã nạp thành công.")

print("⚙️ Đang xử lý Facts (Bảng Sự Kiện)...")

# --- 2.4. Bảng fact_sales ---
fact_sales = pd.merge(sales_order_details, sales_orders, on='sales_order_id')
fact_sales = pd.merge(fact_sales, dim_product[['product_id', 'product_key', 'estimated_cost']], on='product_id')
fact_sales = pd.merge(fact_sales, dim_customer[['customer_id', 'customer_key']], on='customer_id')

fact_sales['date_key'] = pd.to_datetime(fact_sales['order_date']).dt.strftime('%Y%m%d').astype(int)
fact_sales['standard_cogs'] = fact_sales['quantity'] * fact_sales['estimated_cost']
fact_sales['gross_profit'] = fact_sales['line_total'] - fact_sales['standard_cogs']

# Phân bổ công nợ chính xác theo tỷ trọng từng dòng sản phẩm trong đơn hàng (tránh nhân đôi nợ)
fact_sales['order_debt'] = fact_sales['total_amount'] - fact_sales['paid_amount']
fact_sales['line_ratio'] = np.where(fact_sales['total_amount'] > 0, fact_sales['line_total'] / fact_sales['total_amount'], 0.0)
fact_sales['outstanding_amount'] = (fact_sales['order_debt'] * fact_sales['line_ratio']).round(2)

fact_sales_clean = fact_sales[[
    'date_key', 'product_key', 'customer_key', 'sales_order_id', 
    'quantity', 'line_total', 'discount', 'standard_cogs', 'gross_profit',
    'payment_status', 'outstanding_amount'
]].rename(columns={'line_total': 'revenue', 'sales_order_id': 'order_id'})
fact_sales_clean.reset_index(inplace=True)
fact_sales_clean.rename(columns={'index': 'sales_key'}, inplace=True)
fact_sales_clean['sales_key'] += 1

fact_sales_clean.to_sql('fact_sales', engine, schema='dw', if_exists='replace', index=False)
print("  fact_sales: đã nạp thành công.")

# --- 2.5. Bảng fact_production ---
fact_prod = pd.merge(prod_orders, dim_product[['product_id', 'product_key']], on='product_id')
fact_prod['date_key'] = pd.to_datetime(fact_prod['end_time'].fillna(fact_prod['start_time'])).dt.strftime('%Y%m%d').astype(int)
fact_prod['defect_rate'] = np.where(fact_prod['expected_qty'] > 0, (fact_prod['defect_qty'] / fact_prod['expected_qty']).round(4), 0.0)

fact_prod_clean = fact_prod[[
    'date_key', 'product_key', 'prod_order_id', 'plan_detail_id', 
    'expected_qty', 'completed_qty', 'defect_qty', 'production_cost', 'defect_rate'
]]
fact_prod_clean.reset_index(inplace=True)
fact_prod_clean.rename(columns={'index': 'production_key'}, inplace=True)
fact_prod_clean['production_key'] += 1

fact_prod_clean.to_sql('fact_production', engine, schema='dw', if_exists='replace', index=False)
print("  fact_production: đã nạp thành công.")

# --- 2.6. Bảng fact_inventory_daily (Lưới hoàn chỉnh Ngày x Sản phẩm, không khuyết ngày) ---
all_dates = dim_date[['date_key']].copy()
all_prods = dim_product[['product_key', 'product_id']].copy()
all_dates['dummy'] = 1
all_prods['dummy'] = 1
inventory_grid = pd.merge(all_dates, all_prods, on='dummy').drop('dummy', axis=1)

# Xử lý giao dịch kho thành phẩm
fg_trans = pd.merge(fg_transactions, fg_batches, on='batch_id')
fg_trans['date_key'] = pd.to_datetime(fg_trans['trans_date']).dt.strftime('%Y%m%d').astype(int)

# Nhóm theo ngày và sản phẩm
daily_movements = fg_trans.groupby(['date_key', 'product_id']).agg(
    in_qty=('quantity', lambda x: x[x > 0].sum()),
    out_qty=('quantity', lambda x: abs(x[x < 0].sum()))
).reset_index()

daily_movements = pd.merge(daily_movements, dim_product[['product_id', 'product_key']], on='product_id')

# Merge giao dịch vào lưới
fact_inv = pd.merge(inventory_grid, daily_movements, on=['date_key', 'product_key'], how='left')
fact_inv['in_qty'] = fact_inv['in_qty'].fillna(0)
fact_inv['out_qty'] = fact_inv['out_qty'].fillna(0)

# Tính toán luân chuyển tồn kho (Cumulative Sum)
fact_inv = fact_inv.sort_values(['product_key', 'date_key'])
fact_inv['net_change'] = fact_inv['in_qty'] - fact_inv['out_qty']
fact_inv['closing_qty'] = fact_inv.groupby('product_key')['net_change'].cumsum()
fact_inv['opening_qty'] = fact_inv.groupby('product_key')['closing_qty'].shift(1).fillna(0)

fact_inv_clean = fact_inv[['date_key', 'product_key', 'opening_qty', 'in_qty', 'out_qty', 'closing_qty']]
fact_inv_clean.reset_index(inplace=True)
fact_inv_clean.rename(columns={'index': 'inventory_key'}, inplace=True)
fact_inv_clean['inventory_key'] += 1

fact_inv_clean.to_sql('fact_inventory_daily', engine, schema='dw', if_exists='replace', index=False)
print("  ✅ fact_inventory_daily: đã nạp thành công.")

# ==========================================
# PHASE 3: THIẾT LẬP RÀNG BUỘC KHÓA (PK & FK) CHO AI TEXT-TO-SQL
# ==========================================
print("🔒 Đang thiết lập Primary Key, Foreign Key và Indexes cho schema 'dw'...")
with engine.connect() as conn:
    # 1. Primary Keys
    conn.execute(text("ALTER TABLE dw.dim_date ADD PRIMARY KEY (date_key);"))
    conn.execute(text("ALTER TABLE dw.dim_product ADD PRIMARY KEY (product_key);"))
    conn.execute(text("ALTER TABLE dw.dim_customer ADD PRIMARY KEY (customer_key);"))
    conn.execute(text("ALTER TABLE dw.fact_sales ADD PRIMARY KEY (sales_key);"))
    conn.execute(text("ALTER TABLE dw.fact_production ADD PRIMARY KEY (production_key);"))
    conn.execute(text("ALTER TABLE dw.fact_inventory_daily ADD PRIMARY KEY (inventory_key);"))

    # 2. Foreign Keys cho fact_sales
    conn.execute(text("ALTER TABLE dw.fact_sales ADD CONSTRAINT fk_sales_date FOREIGN KEY (date_key) REFERENCES dw.dim_date(date_key);"))
    conn.execute(text("ALTER TABLE dw.fact_sales ADD CONSTRAINT fk_sales_product FOREIGN KEY (product_key) REFERENCES dw.dim_product(product_key);"))
    conn.execute(text("ALTER TABLE dw.fact_sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_key) REFERENCES dw.dim_customer(customer_key);"))

    # 3. Foreign Keys cho fact_production
    conn.execute(text("ALTER TABLE dw.fact_production ADD CONSTRAINT fk_prod_date FOREIGN KEY (date_key) REFERENCES dw.dim_date(date_key);"))
    conn.execute(text("ALTER TABLE dw.fact_production ADD CONSTRAINT fk_prod_product FOREIGN KEY (product_key) REFERENCES dw.dim_product(product_key);"))

    # 4. Foreign Keys cho fact_inventory_daily
    conn.execute(text("ALTER TABLE dw.fact_inventory_daily ADD CONSTRAINT fk_inv_date FOREIGN KEY (date_key) REFERENCES dw.dim_date(date_key);"))
    conn.execute(text("ALTER TABLE dw.fact_inventory_daily ADD CONSTRAINT fk_inv_product FOREIGN KEY (product_key) REFERENCES dw.dim_product(product_key);"))

    conn.commit()
print("  Ràng buộc Primary Key & Foreign Key đã được tạo thành công.")

print("\nHoàn tất toàn bộ tiến trình ETL! Data Warehouse (Schema 'dw') sẵn sàng cho Dashboard và AI Text-to-SQL.")