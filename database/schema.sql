-- =========================================================================
-- FILE: database/schema.sql
-- MÔ TẢ: Cấu trúc DDL chuẩn Enterprise ERP & BI (24 Bảng Chuẩn Hóa)
-- Tương thích ANSI SQL, PostgreSQL 15+ và SQLite (qua setup_database.py)
-- Doanh nghiệp: Yến sào & Cà phê đặc sản
-- =========================================================================

-- Xóa bảng nếu đã tồn tại (thứ tự ngược khóa ngoại)
DROP TABLE IF EXISTS order_returns CASCADE;
DROP TABLE IF EXISTS dealer_purchase_requests CASCADE;
DROP TABLE IF EXISTS production_worker_assignments CASCADE;
DROP TABLE IF EXISTS work_shifts CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS cloud_assets CASCADE;
DROP TABLE IF EXISTS n8n_execution_logs CASCADE;
DROP TABLE IF EXISTS system_notifications CASCADE;
DROP TABLE IF EXISTS material_receipts CASCADE;
DROP TABLE IF EXISTS material_requisitions CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS price_policies CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS inventory_dispatches CASCADE;
DROP TABLE IF EXISTS sales_order_details CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS finished_goods_inventory CASCADE;
DROP TABLE IF EXISTS material_issue_details CASCADE;
DROP TABLE IF EXISTS material_issues CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS bill_of_materials CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;

-- 1. Danh mục ngành hàng
CREATE TABLE product_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(30) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Danh mục sản phẩm thành phẩm
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_code VARCHAR(30) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES product_categories(category_id),
    unit VARCHAR(20) NOT NULL,
    packaging_spec VARCHAR(150),
    cost_price DECIMAL(15,2) DEFAULT 0.00,
    selling_price DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    image_url TEXT,
    target_region VARCHAR(30) DEFAULT 'ALL',
    health_benefits TEXT,
    case_spec VARCHAR(100),
    wholesale_moq INT DEFAULT 24,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Danh mục nhà cung cấp
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(30) UNIQUE NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Danh mục nguyên vật liệu & bao bì
CREATE TABLE materials (
    material_id SERIAL PRIMARY KEY,
    material_code VARCHAR(30) UNIQUE NOT NULL,
    material_name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost DECIMAL(15,2) DEFAULT 0.00,
    min_stock_level DECIMAL(15,2) DEFAULT 0.00,
    current_stock DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Định mức nguyên vật liệu sản xuất (BOM)
CREATE TABLE bill_of_materials (
    bom_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    material_id INT NOT NULL REFERENCES materials(material_id),
    quantity_required DECIMAL(12,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    UNIQUE(product_id, material_id)
);

-- 6. Kế hoạch sản xuất định kỳ
CREATE TABLE production_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_code VARCHAR(30) UNIQUE NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Lệnh sản xuất phân xưởng
CREATE TABLE production_orders (
    order_id SERIAL PRIMARY KEY,
    order_code VARCHAR(30) UNIQUE NOT NULL,
    plan_id INT REFERENCES production_plans(plan_id),
    workshop_id INT,
    product_id INT NOT NULL REFERENCES products(product_id),
    target_quantity INT NOT NULL,
    completed_quantity INT DEFAULT 0,
    defect_quantity INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Phiếu xuất kho nguyên vật liệu cho sản xuất
CREATE TABLE material_issues (
    issue_id SERIAL PRIMARY KEY,
    issue_code VARCHAR(30) UNIQUE NOT NULL,
    production_order_id INT REFERENCES production_orders(order_id),
    issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- 9. Chi tiết xuất kho nguyên vật liệu
CREATE TABLE material_issue_details (
    detail_id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES material_issues(issue_id),
    material_id INT NOT NULL REFERENCES materials(material_id),
    quantity DECIMAL(15,2) NOT NULL
);

-- 10. Kho tồn thành phẩm theo số lô & hạn sử dụng
CREATE TABLE finished_goods_inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    lot_number VARCHAR(50) NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    manufactured_date DATE,
    expiry_date DATE,
    warehouse_location VARCHAR(100) DEFAULT 'KHO_THANH_PHAM_CHINH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Danh mục khách hàng & đại lý
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_code VARCHAR(30) UNIQUE NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(20) DEFAULT 'RETAIL',
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    region VARCHAR(30) DEFAULT 'SOUTH',
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    current_debt DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Đơn đặt hàng bán
CREATE TABLE sales_orders (
    sales_order_id SERIAL PRIMARY KEY,
    order_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    final_amount DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'NEW',
    payment_method VARCHAR(20) DEFAULT 'VIETQR',
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    channel_type VARCHAR(20) DEFAULT 'DIRECT',
    notes TEXT
);

-- 13. Chi tiết đơn đặt hàng bán
CREATE TABLE sales_order_details (
    detail_id SERIAL PRIMARY KEY,
    sales_order_id INT NOT NULL REFERENCES sales_orders(sales_order_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) DEFAULT 0.00,
    subtotal DECIMAL(15,2) NOT NULL
);

-- 14. Phiếu xuất kho bán hàng
CREATE TABLE inventory_dispatches (
    dispatch_id SERIAL PRIMARY KEY,
    dispatch_code VARCHAR(30) UNIQUE NOT NULL,
    sales_order_id INT NOT NULL REFERENCES sales_orders(sales_order_id),
    dispatch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50)
);

-- 15. Giao dịch thanh toán & tất toán công nợ
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    payment_code VARCHAR(30) UNIQUE NOT NULL,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    customer_id INT REFERENCES customers(customer_id),
    amount_paid DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'CASH',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- 16. Chính sách giá theo hạng khách & MOQ
CREATE TABLE price_policies (
    policy_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    customer_type VARCHAR(20) NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1,
    discount_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    custom_price DECIMAL(15,2) NOT NULL,
    effective_date DATE NOT NULL
);

-- 17. Tài khoản người dùng nội bộ (RBAC)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Chiến dịch khuyến mãi & Flash Sale đa kênh
CREATE TABLE campaigns (
    campaign_id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    campaign_type VARCHAR(30) NOT NULL DEFAULT 'FLASHSALE',
    target_region VARCHAR(30) NOT NULL DEFAULT 'ALL',
    banner_url VARCHAR(255),
    video_url VARCHAR(255),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    product_id INT REFERENCES products(product_id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    is_active INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. Phiếu yêu cầu xuất kho NVL sản xuất (Quy trình 2 bước)
CREATE TABLE material_requisitions (
    req_id SERIAL PRIMARY KEY,
    req_code VARCHAR(30) UNIQUE NOT NULL,
    prod_order_id INT,
    product_id INT,
    requested_by VARCHAR(50) NOT NULL,
    approved_by VARCHAR(50),
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP
);

-- 20. Phiếu thu mua nhập kho nguyên vật liệu
CREATE TABLE material_receipts (
    receipt_id SERIAL PRIMARY KEY,
    receipt_code VARCHAR(30) UNIQUE NOT NULL,
    material_id INT NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) NOT NULL,
    market_season VARCHAR(40) DEFAULT 'NORMAL',
    imported_by VARCHAR(50) DEFAULT 'thumua',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 21. Chuông cảnh báo thông báo ERP thời gian thực
CREATE TABLE system_notifications (
    notification_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(30) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 22. Nhật ký tự động hóa quy trình n8n
CREATE TABLE n8n_execution_logs (
    log_id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(80) NOT NULL,
    workflow_name VARCHAR(150) NOT NULL,
    webhook_path VARCHAR(100) NOT NULL,
    execution_mode VARCHAR(40) DEFAULT 'HYBRID_FALLBACK',
    status VARCHAR(30) DEFAULT 'SUCCESS',
    summary TEXT,
    payload_preview TEXT,
    duration_ms INT DEFAULT 45,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. Tài sản số đám mây (Cloud Media Assets)
CREATE TABLE cloud_assets (
    asset_id SERIAL PRIMARY KEY,
    asset_code VARCHAR(60) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'SAN_PHAM',
    cloud_provider VARCHAR(80) DEFAULT 'Cloudinary / Unsplash CDN',
    cloud_url TEXT NOT NULL,
    product_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. Đánh giá & phản hồi trải nghiệm của khách hàng
CREATE TABLE product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id),
    reviewer_name VARCHAR(120) NOT NULL,
    customer_type VARCHAR(30) DEFAULT 'RETAIL',
    rating INT NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    region VARCHAR(50) DEFAULT 'Toàn Quốc',
    verified_purchase INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 25. Danh mục phân xưởng sản xuất (Quản đốc sản xuất)
CREATE TABLE workshops (
    workshop_id SERIAL PRIMARY KEY,
    workshop_code VARCHAR(30) UNIQUE NOT NULL,
    workshop_name VARCHAR(150) NOT NULL,
    workshop_type VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    manager_name VARCHAR(100),
    capacity_per_day INT DEFAULT 2000,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 26. Danh mục công nhân xưởng sản xuất (Quản lý nhân sự sản xuất)
CREATE TABLE workers (
    worker_id SERIAL PRIMARY KEY,
    worker_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    workshop_id INT REFERENCES workshops(workshop_id),
    skill_level VARCHAR(50) DEFAULT 'THO_CHINH',
    specialty VARCHAR(100),
    hourly_rate DECIMAL(15,2) DEFAULT 35000.00,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. Danh mục ca làm việc sản xuất
CREATE TABLE work_shifts (
    shift_id SERIAL PRIMARY KEY,
    shift_code VARCHAR(30) UNIQUE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    standard_hours DECIMAL(4,2) DEFAULT 8.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 28. Phân công công nhân & chấm giờ làm theo lệnh sản xuất
CREATE TABLE production_worker_assignments (
    assignment_id SERIAL PRIMARY KEY,
    production_order_id INT NOT NULL REFERENCES production_orders(order_id),
    worker_id INT NOT NULL REFERENCES workers(worker_id),
    shift_id INT REFERENCES work_shifts(shift_id),
    assigned_date DATE NOT NULL,
    planned_hours DECIMAL(5,2) DEFAULT 8.0,
    actual_hours DECIMAL(5,2) DEFAULT 8.0,
    output_completed INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 29. Yêu cầu nhập hàng từ đại lý (Bộ phận phân phối & Đại lý)
CREATE TABLE dealer_purchase_requests (
    request_id SERIAL PRIMARY KEY,
    request_code VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_requested INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'CHO_XU_LY',
    expected_delivery_date DATE,
    notes TEXT,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    supplementary_prod_order_id INT REFERENCES production_orders(order_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 30. Quản lý đổi trả hàng lỗi (Bộ phận phân phối & Đại lý & Kho)
CREATE TABLE order_returns (
    return_id SERIAL PRIMARY KEY,
    return_code VARCHAR(30) UNIQUE NOT NULL,
    sales_order_id INT REFERENCES sales_orders(sales_order_id),
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_returned INT NOT NULL,
    reason TEXT NOT NULL,
    resolution_type VARCHAR(30) DEFAULT 'TRU_CONG_NO',
    amount_compensated DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'DA_XU_LY',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 31. Phân quyền phụ trách đại lý cho nhân viên tiếp thị / phân phối
CREATE TABLE staff_agent_assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT uq_staff_customer UNIQUE (user_id, customer_id)
);
