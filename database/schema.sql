-- =========================================================================
-- FILE: database/schema.sql
-- MÔ TẢ: Cấu trúc DDL chuẩn ERP (19 bảng - V4.0)
-- Mặt hàng: Yến lọ, Yến chai, Yến lon, Cháo yến, Cà phê phin giấy
-- =========================================================================

-- Xóa bảng nếu đã tồn tại (theo thứ tự ngược khóa ngoại)
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS goods_issue_details CASCADE;
DROP TABLE IF EXISTS goods_issues CASCADE;
DROP TABLE IF EXISTS sales_order_details CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS price_policies CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS finished_goods_transactions CASCADE;
DROP TABLE IF EXISTS finished_goods_batches CASCADE;
DROP TABLE IF EXISTS material_transactions CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS production_plan_details CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS material_lots CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 1. Bảng products (Danh mục sản phẩm thành phẩm)
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    packaging_spec VARCHAR(100),
    units_per_package INT NOT NULL DEFAULT 1,
    estimated_cost DECIMAL(15,2) NOT NULL,
    base_selling_price DECIMAL(15,2) NOT NULL,
    current_stock INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 100,
    max_stock_level INT NOT NULL DEFAULT 10000,
    lead_time_days INT NOT NULL DEFAULT 3,
    business_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- 2. Bảng suppliers (Nhà cung cấp)
CREATE TABLE suppliers (
    supplier_id VARCHAR(20) PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    phone VARCHAR(15),
    address VARCHAR(255)
);

-- 3. Bảng materials (Nguyên vật liệu)
CREATE TABLE materials (
    material_id VARCHAR(20) PRIMARY KEY,
    material_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    standard_unit_cost DECIMAL(15,2) NOT NULL,
    current_stock DECIMAL(15,2) NOT NULL DEFAULT 0,
    min_stock_level DECIMAL(15,2) NOT NULL DEFAULT 0,
    max_stock_level DECIMAL(15,2) NOT NULL DEFAULT 0,
    lead_time_days INT NOT NULL DEFAULT 7
);

-- 4. Bảng material_lots (Lô nguyên vật liệu)
CREATE TABLE material_lots (
    mat_lot_id VARCHAR(30) PRIMARY KEY,
    material_id VARCHAR(20) NOT NULL REFERENCES materials(material_id),
    supplier_id VARCHAR(20) NOT NULL REFERENCES suppliers(supplier_id),
    import_date DATE NOT NULL,
    expiry_date DATE,
    import_unit_cost DECIMAL(15,2) NOT NULL,
    initial_qty DECIMAL(15,2) NOT NULL,
    current_qty DECIMAL(15,2) NOT NULL
);

-- 5. Bảng bom (Định mức nguyên vật liệu)
CREATE TABLE bom (
    bom_id SERIAL PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    material_id VARCHAR(20) NOT NULL REFERENCES materials(material_id),
    version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
    quantity_per_unit DECIMAL(10,4) NOT NULL,
    scrap_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, material_id, version)
);

-- 6. Bảng production_plans (Kế hoạch sản xuất - Header)
CREATE TABLE production_plans (
    plan_id VARCHAR(20) PRIMARY KEY,
    plan_name VARCHAR(150) NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
);

-- 7. Bảng production_plan_details (Chi tiết kế hoạch sản xuất)
CREATE TABLE production_plan_details (
    plan_detail_id SERIAL PRIMARY KEY,
    plan_id VARCHAR(20) NOT NULL REFERENCES production_plans(plan_id),
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    planned_qty INT NOT NULL,
    completed_qty INT NOT NULL DEFAULT 0,
    UNIQUE (plan_id, product_id)
);

-- 8. Bảng production_orders (Lệnh sản xuất)
CREATE TABLE production_orders (
    prod_order_id VARCHAR(20) PRIMARY KEY,
    plan_detail_id INT REFERENCES production_plan_details(plan_detail_id),
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    bom_version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    expected_qty INT NOT NULL,
    completed_qty INT NOT NULL DEFAULT 0,
    defect_qty INT NOT NULL DEFAULT 0,
    production_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
);

-- 9. Bảng material_transactions (Giao dịch kho nguyên vật liệu)
CREATE TABLE material_transactions (
    mat_trans_id SERIAL PRIMARY KEY,
    mat_lot_id VARCHAR(30) NOT NULL REFERENCES material_lots(mat_lot_id),
    prod_order_id VARCHAR(20) REFERENCES production_orders(prod_order_id),
    trans_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    trans_date TIMESTAMP NOT NULL,
    notes VARCHAR(255)
);

-- 10. Bảng finished_goods_batches (Lô thành phẩm)
CREATE TABLE finished_goods_batches (
    batch_id VARCHAR(30) PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    prod_order_id VARCHAR(20) REFERENCES production_orders(prod_order_id),
    mfg_date DATE NOT NULL,
    exp_date DATE NOT NULL,
    initial_qty INT NOT NULL,
    current_qty INT NOT NULL
);

-- 11. Bảng finished_goods_transactions (Giao dịch kho thành phẩm)
CREATE TABLE finished_goods_transactions (
    fg_trans_id SERIAL PRIMARY KEY,
    batch_id VARCHAR(30) NOT NULL REFERENCES finished_goods_batches(batch_id),
    trans_type VARCHAR(20) NOT NULL,
    reference_id VARCHAR(20),
    quantity INT NOT NULL,
    trans_date TIMESTAMP NOT NULL,
    notes VARCHAR(255)
);

-- 12. Bảng customers (Khách hàng)
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(20) NOT NULL,
    phone VARCHAR(15),
    address VARCHAR(255),
    total_debt DECIMAL(15,2) NOT NULL DEFAULT 0
);

-- 13. Bảng price_policies (Chính sách giá)
CREATE TABLE price_policies (
    policy_id SERIAL PRIMARY KEY,
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    customer_type VARCHAR(20) NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1,
    custom_price DECIMAL(15,2) NOT NULL,
    effective_date DATE NOT NULL,
    UNIQUE (product_id, customer_type, min_quantity)
);

-- 14. Bảng sales_orders (Đơn đặt hàng - Header)
CREATE TABLE sales_orders (
    sales_order_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL REFERENCES customers(customer_id),
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    order_status VARCHAR(20) NOT NULL DEFAULT 'NEW'
);

-- 15. Bảng sales_order_details (Chi tiết đơn hàng)
CREATE TABLE sales_order_details (
    order_detail_id SERIAL PRIMARY KEY,
    sales_order_id VARCHAR(20) NOT NULL REFERENCES sales_orders(sales_order_id),
    product_id VARCHAR(20) NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL
);

-- 16. Bảng goods_issues (Phiếu xuất kho - Header)
CREATE TABLE goods_issues (
    issue_id VARCHAR(20) PRIMARY KEY,
    sales_order_id VARCHAR(20) NOT NULL REFERENCES sales_orders(sales_order_id),
    issue_date TIMESTAMP NOT NULL,
    notes VARCHAR(255)
);

-- 17. Bảng goods_issue_details (Chi tiết xuất kho theo lô)
CREATE TABLE goods_issue_details (
    issue_detail_id SERIAL PRIMARY KEY,
    issue_id VARCHAR(20) NOT NULL REFERENCES goods_issues(issue_id),
    order_detail_id INT NOT NULL REFERENCES sales_order_details(order_detail_id),
    batch_id VARCHAR(30) NOT NULL REFERENCES finished_goods_batches(batch_id),
    issued_qty INT NOT NULL
);

-- 18. Bảng payments (Lịch sử thanh toán)
CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    sales_order_id VARCHAR(20) NOT NULL REFERENCES sales_orders(sales_order_id),
    payment_date TIMESTAMP NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL
);

-- 19. Bảng returns (Đổi trả hàng)
CREATE TABLE returns (
    return_id VARCHAR(20) PRIMARY KEY,
    issue_detail_id INT NOT NULL REFERENCES goods_issue_details(issue_detail_id),
    return_date TIMESTAMP NOT NULL,
    return_qty INT NOT NULL,
    restocked_qty INT NOT NULL DEFAULT 0,
    damaged_qty INT NOT NULL DEFAULT 0,
    reason VARCHAR(255) NOT NULL,
    refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0
);