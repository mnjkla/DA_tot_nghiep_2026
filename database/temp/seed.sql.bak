-- =============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA FOR TESTING & ERP DATASET)
-- =============================================================================

-- 1. DANH MỤC SẢN PHẨM
INSERT INTO product_categories (category_code, category_name, description) VALUES
('CAT_YEN_LO', 'Yến Lọ Chưng Sẵn', 'Dòng sản phẩm yến hũ chưng tươi cao cấp'),
('CAT_YEN_CHAI', 'Yến Chai Nước Uống', 'Nước yến giải khát đóng chai'),
('CAT_YEN_LON', 'Yến Lon Uống Liền', 'Nước yến đóng lon tiện lợi'),
('CAT_CHAO_YEN', 'Cháo Yến Dinh Dưỡng', 'Cháo ăn liền bổ sung tổ yến'),
('CAT_CA_PHE', 'Cà Phê Phin Giấy', 'Cà phê túi lọc phin giấy chất lượng cao')
ON CONFLICT DO NOTHING;

-- 2. SẢN PHẨM CỐT LÕI (5 DÒNG SẢN PHẨM)
INSERT INTO products (product_code, product_name, category_id, unit, packaging_spec, cost_price, selling_price) VALUES
('PROD_YEN_LO_70ML', 'Yến Lọ Chưng Đường Phèn 70ml', 1, 'lọ', 'Lốc 6 lọ / Thùng 4 lốc (24 lọ)', 25000.00, 45000.00),
('PROD_YEN_CHAI_300ML', 'Yến Chai Nguyên Chất 300ml', 2, 'chai', 'Thùng 24 chai', 35000.00, 65000.00),
('PROD_YEN_LON_190ML', 'Yến Lon Uống Liền 190ml', 3, 'lon', 'Khay 24 lon', 12000.00, 22000.00),
('PROD_CHAO_YEN_THIT_HEO', 'Cháo Yến Thịt Bằm 50g', 4, 'gói', 'Thùng 30 gói', 8000.00, 15000.00),
('PROD_CA_PHE_PHIN_GIAY', 'Cà Phê Phin Giấy Premium 15g', 5, 'hộp', 'Hộp 10 túi phin giấy', 40000.00, 85000.00)
ON CONFLICT DO NOTHING;

-- 3. NGUYÊN VẬT LIỆU (MATERIALS)
INSERT INTO materials (material_code, material_name, unit, min_stock_level, current_stock) VALUES
('MAT_YEN_THO', 'Tổ Yến Tinh Chế', 'gram', 1000.00, 5000.00),
('MAT_DUONG_PHEN', 'Đường Phèn Quảng Ngãi', 'gram', 5000.00, 50000.00),
('MAT_VO_LO_70ML', 'Vỏ Lọ Thuỷ Tinh 70ml', 'cái', 2000.00, 10000.00),
('MAT_NAP_LO', 'Nắp Kim Loại Lọ Yến', 'cái', 2000.00, 10000.00),
('MAT_VO_CHAI_300ML', 'Chai Thuỷ Tinh 300ml', 'cái', 1000.00, 5000.00),
('MAT_CA_PHE_BOT', 'Hạt Cà Phê Robusta/Arabica Xay', 'gram', 5000.00, 20000.00),
('MAT_TUI_PHIN_GIAY', 'Túi Phin Giấy Lọc Cà Phê', 'cái', 2000.00, 15000.00)
ON CONFLICT DO NOTHING;

-- 4. ĐỊNH MỨC SẢN XUẤT (BOM CHO 1 ĐƠN VỊ SẢN PHẨM)
-- Cho 1 Lọ Yến 70ml: 3g Tổ yến, 10g Đường phèn, 1 Vỏ lọ, 1 Nắp lọ
INSERT INTO bill_of_materials (product_id, material_id, quantity_required, unit) VALUES
(1, 1, 3.00, 'gram'),
(1, 2, 10.00, 'gram'),
(1, 3, 1.00, 'cái'),
(1, 4, 1.00, 'cái'),

-- Cho 1 Hộp Cà Phê Phin Giấy: 150g Cà phê bột, 10 Túi phin giấy
(5, 6, 150.00, 'gram'),
(5, 7, 10.00, 'cái')
ON CONFLICT DO NOTHING;

-- 5. KHÁCH HÀNG MẪU (CUSTOMERS)
INSERT INTO customers (customer_code, customer_name, customer_type, phone, email, address, credit_limit) VALUES
('CUST_RETAIL_01', 'Nguyễn Văn An (Khách lẻ)', 'RETAIL', '0901234567', 'an.nguyen@gmail.com', 'Q1, TP.HCM', 0.00),
('CUST_AGENT_01', 'Đại Lý Yến Sào Sài Gòn', 'AGENT', '0918889999', 'contact@yensaosaigon.vn', 'Q3, TP.HCM', 50000000.00),
('CUST_DIST_01', 'Nhà Phân Phối Miền Tây', 'DISTRIBUTOR', '0922334455', 'sales@mientaydist.com', 'Cần Thơ', 200000000.00)
ON CONFLICT DO NOTHING;
