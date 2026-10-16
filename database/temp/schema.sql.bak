-- =============================================================================
-- ĐỒ ÁN TỐT NGHIỆP: THIẾT KẾ CƠ SỞ DỮ LIỆU CỐT LÕI (DATABASE SCHEMA)
-- Doanh nghiệp Sản xuất & Kinh doanh: Yến lọ, Yến chai, Yến lon, Cháo yến, Cà phê phin
-- =============================================================================

-- 1. DANH MỤC SẢN PHẨM & NGUYÊN VẬT LIỆU
CREATE TABLE IF NOT EXISTS product_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES product_categories(category_id),
    unit VARCHAR(30) NOT NULL, -- lọ, chai, lon, gói, hộp
    packaging_spec TEXT, -- Quy cách đóng gói (vd: Lốc 6 lọ, Thùng 24 chai)
    cost_price DECIMAL(15, 2) DEFAULT 0.00, -- Giá vốn dự kiến
    selling_price DECIMAL(15, 2) DEFAULT 0.00, -- Giá bán tiêu chuẩn
    status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materials (
    material_id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) UNIQUE NOT NULL,
    material_name VARCHAR(150) NOT NULL,
    unit VARCHAR(30) NOT NULL, -- gram, ml, cái, nắp, nhãn
    min_stock_level DECIMAL(12, 2) DEFAULT 0.00,
    current_stock DECIMAL(12, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ĐỊNH MỨC SẢN XUẤT (BILL OF MATERIALS - BOM)
CREATE TABLE IF NOT EXISTS bill_of_materials (
    bom_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    material_id INT REFERENCES materials(material_id),
    quantity_required DECIMAL(12, 4) NOT NULL, -- Số lượng NVL cho 1 đơn vị sản phẩm
    unit VARCHAR(30) NOT NULL,
    notes TEXT,
    UNIQUE(product_id, material_id)
);

-- 3. QUẢN LÝ SẢN XUẤT (PRODUCTION MANAGEMENT)
CREATE TABLE IF NOT EXISTS production_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT', -- DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_orders (
    order_id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    plan_id INT REFERENCES production_plans(plan_id),
    product_id INT REFERENCES products(product_id),
    target_quantity INT NOT NULL,
    completed_quantity INT DEFAULT 0,
    defect_quantity INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_issues (
    issue_id SERIAL PRIMARY KEY,
    issue_code VARCHAR(50) UNIQUE NOT NULL,
    production_order_id INT REFERENCES production_orders(order_id),
    issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS material_issue_details (
    detail_id SERIAL PRIMARY KEY,
    issue_id INT REFERENCES material_issues(issue_id),
    material_id INT REFERENCES materials(material_id),
    quantity DECIMAL(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS finished_goods_inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    lot_number VARCHAR(50) NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    manufactured_date DATE,
    expiry_date DATE,
    warehouse_location VARCHAR(100) DEFAULT 'KHO_THANH_PHAM_CHINH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUẢN LÝ BÁN HÀNG (SALES MANAGEMENT)
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(30) DEFAULT 'RETAIL', -- RETAIL, AGENT, DISTRIBUTOR, ENTERPRISE
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    credit_limit DECIMAL(15, 2) DEFAULT 0.00,
    current_debt DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_orders (
    sales_order_id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    discount_amount DECIMAL(15, 2) DEFAULT 0.00,
    final_amount DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'NEW', -- NEW, CONFIRMED, DELIVERING, COMPLETED, CANCELLED
    notes TEXT
);

CREATE TABLE IF NOT EXISTS sales_order_details (
    detail_id SERIAL PRIMARY KEY,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    product_id INT REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount DECIMAL(15, 2) DEFAULT 0.00,
    subtotal DECIMAL(15, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_dispatches (
    dispatch_id SERIAL PRIMARY KEY,
    dispatch_code VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    dispatch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    payment_code VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    customer_id INT REFERENCES customers(customer_id),
    amount_paid DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH', -- CASH, BANK_TRANSFER
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS product_returns (
    return_id SERIAL PRIMARY KEY,
    return_code VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    customer_id INT REFERENCES customers(customer_id),
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    refund_amount DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'PENDING' -- PENDING, APPROVED, REJECTED
);

-- INDEXES CHO TỐI ƯU TRUY VẤN BI & TEXT-TO-SQL
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_bom_product ON bill_of_materials(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
