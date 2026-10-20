-- =========================================================================
-- FILE: database/seed.sql
-- MÔ TẢ: Dữ liệu mẫu khởi tạo (Seed Data) cho 5 mặt hàng Yến & Cà phê
-- =========================================================================

-- 1. Products
INSERT INTO products (product_id, product_name, unit, packaging_spec, units_per_package, estimated_cost, base_selling_price, current_stock, min_stock_level, max_stock_level, lead_time_days, business_status) VALUES
('SP01', 'Yến lọ', 'Lọ', 'Hộp 6 lọ x 70ml', 6, 21000, 38000, 3500, 2000, 25000, 2, 'ACTIVE'),
('SP02', 'Yến chai', 'Chai', 'Lốc 6 chai x 150ml', 6, 26500, 45000, 4200, 2000, 25000, 2, 'ACTIVE'),
('SP03', 'Yến lon', 'Lon', 'Thùng 24 lon x 250ml', 24, 10000, 18000, 12000, 5000, 50000, 2, 'ACTIVE'),
('SP04', 'Cháo yến', 'Gói', 'Thùng 30 gói x 50g', 30, 9500, 16000, 8000, 3000, 35000, 3, 'ACTIVE'),
('SP05', 'Cà phê phin giấy', 'Hộp', 'Hộp 10 phin x 15g', 1, 42000, 75000, 2500, 1500, 15000, 3, 'ACTIVE');

-- 2. Suppliers
INSERT INTO suppliers (supplier_id, supplier_name, phone, address) VALUES
('SUP01', 'Công ty Yến Sào Khánh Hòa Nguồn Việt', '0905111222', 'Nha Trang, Khánh Hòa'),
('SUP02', 'Nhà máy Đường Biên Hòa', '0903222333', 'Biên Hòa, Đồng Nai'),
('SUP03', 'Nông trường Cà Phê Cầu Đất', '0908333444', 'Đà Lạt, Lâm Đồng'),
('SUP04', 'Công ty Nông sản Gạo Việt', '0909444555', 'Cái Bè, Tiền Giang'),
('SUP05', 'Nhà máy Bao Bì Thủy Tinh & Lon Sài Gòn', '0901555666', 'KCN Tân Bình, TP.HCM');

-- 3. Materials
INSERT INTO materials (material_id, material_name, unit, standard_unit_cost, current_stock, min_stock_level, max_stock_level, lead_time_days) VALUES
('NVL01', 'Tổ yến tinh chế', 'Gram', 25000, 25000, 5000, 50000, 7),
('NVL02', 'Đường phèn kết tinh', 'Gram', 35, 500000, 100000, 1000000, 3),
('NVL03', 'Gạo thơm sấy thăng hoa', 'Gram', 40, 250000, 50000, 500000, 4),
('NVL04', 'Cà phê Arabica/Robusta rang xay', 'Gram', 250, 200000, 50000, 500000, 5),
('NVL05', 'Lọ thủy tinh 70ml (kèm nắp)', 'Cái', 2500, 20000, 5000, 50000, 5),
('NVL06', 'Chai thủy tinh 150ml (kèm nắp)', 'Cái', 3200, 20000, 5000, 50000, 5),
('NVL07', 'Lon nhôm 250ml (kèm nắp)', 'Cái', 1800, 40000, 10000, 80000, 5),
('NVL08', 'Bao bì màng nhôm Cháo yến', 'Cái', 800, 40000, 10000, 80000, 4),
('NVL09', 'Túi lọc phin giấy & Hộp cà phê', 'Bộ', 4500, 15000, 5000, 40000, 4);

-- 4. Material Lots
INSERT INTO material_lots (mat_lot_id, material_id, supplier_id, import_date, expiry_date, import_unit_cost, initial_qty, current_qty) VALUES
('MLOT-202501-001', 'NVL01', 'SUP01', '2025-01-05', '2026-01-05', 25000, 30000, 25000),
('MLOT-202501-002', 'NVL02', 'SUP02', '2025-01-05', '2026-01-05', 35, 600000, 500000),
('MLOT-202501-003', 'NVL06', 'SUP05', '2025-01-05', NULL, 3200, 25000, 20000);

-- 5. BOM
INSERT INTO bom (product_id, material_id, version, quantity_per_unit, scrap_rate, is_active, updated_at) VALUES
('SP01', 'NVL01', 'v1.0', 0.7000, 2.0, TRUE, '2025-01-01 08:00:00'),
('SP01', 'NVL02', 'v1.0', 8.0000, 1.0, TRUE, '2025-01-01 08:00:00'),
('SP01', 'NVL05', 'v1.0', 1.0000, 1.5, TRUE, '2025-01-01 08:00:00'),
('SP02', 'NVL01', 'v1.0', 0.9000, 2.0, TRUE, '2025-01-01 08:00:00'),
('SP02', 'NVL02', 'v1.0', 12.0000, 1.0, TRUE, '2025-01-01 08:00:00'),
('SP02', 'NVL06', 'v1.0', 1.0000, 1.5, TRUE, '2025-01-01 08:00:00');

-- 6. Production Plans & Details
INSERT INTO production_plans (plan_id, plan_name, period_type, start_date, end_date, plan_status) VALUES
('PLAN-202501', 'Kế hoạch sản xuất Tháng 01/2025', 'MONTHLY', '2025-01-01', '2025-01-31', 'COMPLETED');

INSERT INTO production_plan_details (plan_id, product_id, planned_qty, completed_qty) VALUES
('PLAN-202501', 'SP02', 5000, 5000);

-- 7. Production Orders (Ví dụ Mục 3 trong đặc tả: Sản xuất 5000 chai Yến)
INSERT INTO production_orders (prod_order_id, plan_detail_id, product_id, bom_version, start_time, end_time, expected_qty, completed_qty, defect_qty, production_cost, status) VALUES
('PO-20250110-0001', 1, 'SP02', 'v1.0', '2025-01-10 08:00:00', '2025-01-10 17:00:00', 5000, 5000, 0, 132500000, 'COMPLETED');

-- 8. Finished Goods Batches (Nhập kho 5000 chai, xuất 1500 chai, còn tồn 3500 chai)
INSERT INTO finished_goods_batches (batch_id, product_id, prod_order_id, mfg_date, exp_date, initial_qty, current_qty) VALUES
('FG-20250110-0001', 'SP02', 'PO-20250110-0001', '2025-01-10', '2026-01-10', 5000, 3500);

-- 9. Customers & Sales Orders (Khách đặt 1500 chai Yến)
INSERT INTO customers (customer_id, customer_name, customer_type, phone, address, total_debt) VALUES
('KH001', 'Nhà phân phối Yến Sào Miền Nam', 'DISTRIBUTOR', '0909888777', 'Quận 1, TP.HCM', 0);

INSERT INTO sales_orders (sales_order_id, customer_id, order_date, total_amount, paid_amount, payment_status, order_status) VALUES
('SO-20250115-00001', 'KH001', '2025-01-15 09:30:00', 55350000, 55350000, 'PAID', 'COMPLETED');

INSERT INTO sales_order_details (sales_order_id, product_id, quantity, unit_price, discount, line_total) VALUES
('SO-20250115-00001', 'SP02', 1500, 36900, 0, 55350000);

-- 10. Goods Issues & Payments
INSERT INTO goods_issues (issue_id, sales_order_id, issue_date, notes) VALUES
('GI-20250115-00001', 'SO-20250115-00001', '2025-01-15 14:00:00', 'Xuất kho 1500 chai Yến cho KH001');

INSERT INTO goods_issue_details (issue_id, order_detail_id, batch_id, issued_qty) VALUES
('GI-20250115-00001', 1, 'FG-20250110-0001', 1500);

INSERT INTO payments (payment_id, sales_order_id, payment_date, amount, payment_method) VALUES
('PAY-00001', 'SO-20250115-00001', '2025-01-15 15:00:00', 55350000, 'BANK_TRANSFER');