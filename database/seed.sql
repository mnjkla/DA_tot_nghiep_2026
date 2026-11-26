-- =========================================================================
-- FILE: database/seed.sql
-- MÔ TẢ: Bộ Dữ Liệu Thực Tế Doanh Nghiệp Sản Xuất Yến Sào & Cà Phê Đặc Sản
-- =========================================================================

-- 1. Product Categories
INSERT INTO product_categories (category_id, category_code, category_name, description) VALUES
(1, 'CAT-YEN-LO', 'Yến Lọ Chưng Tươi', 'Dòng sản phẩm tổ yến chưng sẵn hũ thủy tinh tiện lợi bồi bổ sức khỏe'),
(2, 'CAT-YEN-CHAI', 'Yến Chai Xuất Khẩu', 'Dòng sản phẩm yến tươi nguyên chất đóng chai dung tích lớn 150ml'),
(3, 'CAT-YEN-LON', 'Nước Yến Lon Uống Liền', 'Nước yến ngân nhĩ giải khát đóng lon nhôm thanh mát'),
(4, 'CAT-CHAO-YEN', 'Cháo Yến Dinh Dưỡng', 'Cháo yến sấy thăng hoa thịt bằm tiện dụng cho gia đình và trẻ em'),
(5, 'CAT-CA-PHE', 'Cà Phê Phin Giấy Đặc Sản', 'Cà phê nguyên chất Cầu Đất rang mộc đóng gói phin giấy tiện lợi cao cấp');

-- 2. Products
INSERT INTO products (product_id, product_code, product_name, category_id, unit, packaging_spec, cost_price, selling_price, status, image_url, target_region, health_benefits, case_spec, wholesale_moq) VALUES
(1, 'SP01', 'Yến Lọ Chưng Đường Phèn 70ml', 1, 'Lọ', 'Hộp 6 lọ x 70ml', 21000, 45000, 'ACTIVE', 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80', 'NORTH', 'Bổ phổi, bồi bổ khí huyết, tăng cường đề kháng cho người già và trẻ nhỏ.', 'Thùng 24 hộp', 24),
(2, 'SP02', 'Yến Chai Nguyên Chất 150ml', 2, 'Chai', 'Lốc 6 chai x 150ml', 26500, 45000, 'ACTIVE', 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80', 'SOUTH', 'Hàm lượng yến tươi đậm đặc 18%, tái tạo làn da, chống lão hóa chuyên sâu.', 'Thùng 12 lốc', 12),
(3, 'SP03', 'Yến Lon Uống Liền 190ml', 3, 'Lon', 'Thùng 24 lon x 190ml', 10000, 18000, 'ACTIVE', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80', 'ALL', 'Giải khát thanh nhiệt tức thì, cung cấp năng lượng và khoáng chất tự nhiên.', 'Thùng 24 lon', 48),
(4, 'SP04', 'Cháo Yến Thịt Bằm 50g', 4, 'Gói', 'Thùng 30 gói x 50g', 9500, 16000, 'ACTIVE', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80', 'NORTH', 'Gạo thơm thăng hoa hòa quyện tổ yến thật, dinh dưỡng trọn vẹn cho bữa ăn nhanh.', 'Thùng 30 gói', 30),
(5, 'SP05', 'Cà Phê Phin Giấy Premium 15g', 5, 'Hộp', 'Hộp 10 phin x 15g', 42000, 75000, 'ACTIVE', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'CENTRAL', '100% Cà phê Arabica & Robusta Cầu Đất rang mộc, hương hoa cỏ đắng dịu hậu ngọt.', 'Thùng 20 hộp', 20);

-- 3. Suppliers
INSERT INTO suppliers (supplier_id, supplier_code, supplier_name, phone, email, address) VALUES
(1, 'SUP01', 'Công ty Yến Sào Khánh Hòa Nguồn Việt', '0905111222', 'nguonviet@yenkhanhhoa.vn', 'Số 12 Trần Phú, TP. Nha Trang, Khánh Hòa'),
(2, 'SUP02', 'Nhà máy Đường Biên Hòa', '0903222333', 'kinhdoanh@duongbienhoa.vn', 'KCN Biên Hòa 1, TP. Biên Hòa, Đồng Nai'),
(3, 'SUP03', 'Nông trường Cà Phê Cầu Đất Farm', '0908333444', 'contact@caudatcoffee.vn', 'Xã Xuân Trường, TP. Đà Lạt, Lâm Đồng'),
(4, 'SUP04', 'Công ty Nông sản Gạo Việt', '0909444555', 'gaoviet@mientay.vn', 'Huyện Cái Bè, Tiền Giang'),
(5, 'SUP05', 'Nhà máy Bao Bì Thủy Tinh & Chai Lọ Sài Gòn', '0901555666', 'baobi@saigonglass.vn', 'KCN Tân Bình, Quận Tân Phú, TP.HCM'),
(6, 'SUP06', 'Tập đoàn Bao Bì Nhôm Alpha Can Việt Nam', '0907777888', 'info@alphacan.vn', 'KCN VSIP 1, TP. Thuận An, Bình Dương');

-- 4. Materials
INSERT INTO materials (material_id, material_code, material_name, unit, unit_cost, min_stock_level, current_stock, description) VALUES
(1, 'NVL01', 'Tổ yến tinh chế loại 1', 'Gram', 25000, 5000, 18500, 'Yến sào làm sạch rút lông khô đạt tiêu chuẩn HACCP'),
(2, 'NVL02', 'Đường phèn kết tinh tự nhiên', 'Gram', 35, 100000, 480000, 'Đường phèn Quảng Ngãi độ tinh khiết cao không chất tẩy trắng'),
(3, 'NVL03', 'Gạo thơm sấy thăng hoa', 'Gram', 40, 50000, 240000, 'Gạo thơm ST25 sấy thăng hoa giữ nguyên hạt và vi chất'),
(4, 'NVL04', 'Cà phê Arabica/Robusta rang mộc', 'Gram', 250, 50000, 195000, 'Cà phê Cầu Đất tỷ lệ 70% Arabica và 30% Robusta rang medium'),
(5, 'NVL05', 'Lọ thủy tinh 70ml (kèm nắp thiếc siết)', 'Cái', 2500, 5000, 22000, 'Lọ thủy tinh chịu nhiệt tiệt trùng nhiệt độ cao 121 độ C'),
(6, 'NVL06', 'Chai thủy tinh 150ml (kèm nắp siết viền)', 'Cái', 3200, 5000, 18000, 'Chai thủy tinh vuông cao cấp xuất khẩu'),
(7, 'NVL07', 'Lon nhôm 190ml (kèm nắp bật an toàn)', 'Cái', 1800, 10000, 42000, 'Lon nhôm 2 mảnh phủ lớp tráng bảo vệ thực phẩm'),
(8, 'NVL08', 'Bao bì màng nhôm Cháo yến 50g', 'Cái', 800, 10000, 35000, 'Màng ghép 3 lớp chống ẩm tuyệt đối bảo quản 12 tháng'),
(9, 'NVL09', 'Túi lọc phin giấy Nhật & Hộp Kraft', 'Bộ', 4500, 5000, 14000, 'Màng lọc thực vật Yamanaka Nhật Bản chiết xuất trọn vị cà phê');

-- 5. Bill of Materials (BOM)
INSERT INTO bill_of_materials (bom_id, product_id, material_id, quantity_required, unit, notes) VALUES
(1, 1, 1, 0.7000, 'Gram', 'Định mức yến khô cho 1 lọ yến chưng 70ml'),
(2, 1, 2, 8.0000, 'Gram', 'Đường phèn tạo ngọt thanh'),
(3, 1, 5, 1.0000, 'Cái', 'Vỏ lọ thủy tinh 70ml tiệt trùng'),
(4, 2, 1, 1.2000, 'Gram', 'Định mức yến đậm đặc cho chai 150ml'),
(5, 2, 2, 12.0000, 'Gram', 'Đường phèn chai 150ml'),
(6, 2, 6, 1.0000, 'Cái', 'Vỏ chai thủy tinh vuông 150ml'),
(7, 3, 1, 0.3500, 'Gram', 'Tổ yến cho lon nước yến 190ml'),
(8, 3, 2, 9.5000, 'Gram', 'Đường phèn lon 190ml'),
(9, 3, 7, 1.0000, 'Cái', 'Lon nhôm 190ml Alpha Can'),
(10, 4, 1, 0.2000, 'Gram', 'Tổ yến sấy trong gói cháo 50g'),
(11, 4, 3, 45.0000, 'Gram', 'Gạo thơm ST25 sấy thăng hoa'),
(12, 4, 8, 1.0000, 'Cái', 'Bao bì màng nhôm 50g'),
(13, 5, 4, 150.0000, 'Gram', '10 phin x 15g cà phê rang mộc'),
(14, 5, 9, 1.0000, 'Bộ', '10 túi lọc + Hộp giấy Kraft in màu');

-- 6. Production Plans
INSERT INTO production_plans (plan_id, plan_code, plan_name, start_date, end_date, status, created_by) VALUES
(1, 'PLAN-2026-Q1', 'Kế hoạch sản xuất cao điểm Tết 2026', '2026-01-02', '2026-03-31', 'ACTIVE', 'admin'),
(2, 'PLAN-2026-Q2', 'Kế hoạch sản xuất hè và kênh trường học', '2026-04-01', '2026-06-30', 'DRAFT', 'admin');

-- 7. Production Orders
INSERT INTO production_orders (order_id, order_code, plan_id, workshop_id, product_id, target_quantity, completed_quantity, defect_quantity, status, start_time, end_time, notes) VALUES
(1, 'PO-2026-001', 1, 1, 1, 5000, 5000, 12, 'COMPLETED', '2026-01-10 08:00:00', '2026-01-11 17:00:00', 'Hoàn thành mẻ yến lọ chưng đường phèn lô Tết'),
(2, 'PO-2026-002', 1, 1, 2, 3000, 3000, 8, 'COMPLETED', '2026-01-12 08:00:00', '2026-01-13 16:30:00', 'Hoàn thành mẻ yến chai 150ml xuất khẩu'),
(3, 'PO-2026-003', 1, 1, 3, 10000, 10000, 25, 'COMPLETED', '2026-01-15 08:00:00', '2026-01-16 18:00:00', 'Hoàn thành mẻ nước yến lon đóng thùng'),
(4, 'PO-2026-004', 1, 1, 4, 6000, 6000, 10, 'COMPLETED', '2026-01-18 08:00:00', '2026-01-19 15:00:00', 'Hoàn thành mẻ cháo yến thịt bằm sấy'),
(5, 'PO-2026-005', 1, 2, 5, 2000, 2000, 5, 'COMPLETED', '2026-01-20 08:00:00', '2026-01-21 16:00:00', 'Đóng gói mẻ cà phê phin giấy Cầu Đất');

-- 8. Finished Goods Inventory
INSERT INTO finished_goods_inventory (inventory_id, product_id, lot_number, quantity_in_stock, manufactured_date, expiry_date, warehouse_location) VALUES
(1, 1, 'LOT-YL-202601-A', 4543, '2026-01-11', '2027-01-11', 'KHO_THANH_PHAM_A1'),
(2, 2, 'LOT-YC-202601-A', 2800, '2026-01-13', '2027-01-13', 'KHO_THANH_PHAM_A2'),
(3, 3, 'LOT-NL-202601-A', 6000, '2026-01-16', '2027-07-16', 'KHO_THANH_PHAM_B1'),
(4, 4, 'LOT-CY-202601-A', 3500, '2026-01-19', '2027-01-19', 'KHO_THANH_PHAM_B2'),
(5, 5, 'LOT-CP-202601-A', 1200, '2026-01-21', '2027-01-21', 'KHO_THANH_PHAM_C1');

-- 9. Customers
INSERT INTO customers (customer_id, customer_code, customer_name, customer_type, phone, email, address, region, credit_limit, current_debt) VALUES
(1, 'CUST_AGENT_01', 'Đại lý Yến Sào Miền Nam - Cần Thơ', 'AGENT', '0909888111', 'cantho@yensaomn.vn', 'Quận Ninh Kiều, Cần Thơ', 'SOUTH', 50000000, 0),
(2, 'KH002', 'Chuỗi Cửa Hàng Bách Hóa Xanh Khu Vực 1', 'DISTRIBUTOR', '0908777222', 'cungung@bachhoaxanh.com', 'Quận Bình Tân, TP. Hồ Chí Minh', 'SOUTH', 300000000, 48000000),
(3, 'KH003', 'Hệ Thống Siêu Thị BigC Thăng Long', 'DISTRIBUTOR', '0912333444', 'muahang@bigcthanglong.vn', 'Quận Cầu Giấy, TP. Hà Nội', 'NORTH', 200000000, 0),
(4, 'KH004', 'Chuỗi The Coffee House Đà Nẵng', 'DISTRIBUTOR', '0905444555', 'procurement@tch.danang.vn', 'Quận Hải Châu, TP. Đà Nẵng', 'CENTRAL', 100000000, 15000000),
(5, 'KH005', 'Nhà Phân Phối Nông Sản & Yến Đảo Nha Trang', 'DISTRIBUTOR', '0903666777', 'daily@yendaonhatrang.vn', 'TP. Nha Trang, Khánh Hòa', 'CENTRAL', 120000000, 32000000),
(6, 'KH006', 'Chị Nguyễn Thị Mai (Khách Hàng Thân Thiết VIP)', 'RETAIL', '0918999888', 'mainguyen@gmail.com', 'Phường Bến Nghé, Quận 1, TP.HCM', 'SOUTH', 10000000, 0);

-- 10. Price Policies
INSERT INTO price_policies (policy_id, product_id, customer_type, min_quantity, discount_rate, custom_price, effective_date) VALUES
(1, 1, 'WHOLESALE_MOQ', 24, 17.78, 37000, '2026-01-01'),
(2, 1, 'AGENT_VIP', 1, 22.22, 35000, '2026-01-01'),
(3, 2, 'WHOLESALE_MOQ', 12, 10.00, 40500, '2026-01-01'),
(4, 2, 'AGENT_VIP', 1, 15.00, 38250, '2026-01-01'),
(5, 3, 'WHOLESALE_MOQ', 48, 11.11, 16000, '2026-01-01'),
(6, 3, 'AGENT_VIP', 1, 16.67, 15000, '2026-01-01'),
(7, 4, 'WHOLESALE_MOQ', 30, 10.00, 14400, '2026-01-01'),
(8, 4, 'AGENT_VIP', 1, 15.00, 13600, '2026-01-01'),
(9, 5, 'WHOLESALE_MOQ', 20, 12.00, 66000, '2026-01-01'),
(10, 5, 'AGENT_VIP', 1, 17.33, 62000, '2026-01-01');

-- 11. Sales Orders
INSERT INTO sales_orders (sales_order_id, order_code, customer_id, order_date, total_amount, discount_amount, final_amount, status, payment_method, payment_status, channel_type, notes) VALUES
(1, 'SO-2026-001', 1, '2026-01-25 09:30:00', 42000000, 0, 42000000, 'COMPLETED', 'BANK_TRANSFER', 'PAID', 'DIRECT', 'Đơn hàng đại lý miền Nam phân phối trước Tết'),
(2, 'SO-2026-002', 2, '2026-01-28 14:15:00', 64800000, 3240000, 61560000, 'COMPLETED', 'VIETQR', 'PAID', 'DIRECT', 'Giao 3600 lon nước yến cho chuỗi Bách Hóa Xanh'),
(3, 'SO-2026-003', 4, '2026-02-02 10:00:00', 37500000, 1875000, 35625000, 'COMPLETED', 'BANK_TRANSFER', 'PAID', 'DIRECT', 'Giao 500 hộp cà phê phin giấy Cầu Đất'),
(4, 'SO-2026-004', 6, '2026-02-10 16:45:00', 1350000, 0, 1350000, 'COMPLETED', 'VIETQR', 'PAID', 'STOREFRONT', 'Khách mua lẻ trực tuyến 30 lọ yến chưng đường phèn'),
(5, 'SO-2026-005', 5, '2026-02-15 11:20:00', 54000000, 2700000, 51300000, 'NEW', 'BANK_TRANSFER', 'PENDING', 'DIRECT', 'Đơn hàng bổ sung sau Tết đang chờ xuất kho');

-- 12. Sales Order Details
INSERT INTO sales_order_details (detail_id, sales_order_id, product_id, quantity, unit_price, discount, subtotal) VALUES
(1, 1, 1, 1200, 35000, 0, 42000000),
(2, 2, 3, 3600, 18000, 3240000, 61560000),
(3, 3, 5, 500, 75000, 1875000, 35625000),
(4, 4, 1, 30, 45000, 0, 1350000),
(5, 5, 2, 1200, 45000, 2700000, 51300000);

-- 13. Payments
INSERT INTO payments (payment_id, payment_code, sales_order_id, customer_id, amount_paid, payment_method, payment_date, notes) VALUES
(1, 'PAY-2026-001', 1, 1, 42000000, 'BANK_TRANSFER', '2026-01-25 10:00:00', 'Thanh toán đơn hàng SO-2026-001 qua VCB'),
(2, 'PAY-2026-002', 2, 2, 61560000, 'VIETQR', '2026-01-28 15:00:00', 'Quét mã VietQR chuyển khoản thanh toán'),
(3, 'PAY-2026-003', 3, 4, 35625000, 'BANK_TRANSFER', '2026-02-02 11:00:00', 'Tất toán tiền hàng cà phê phin giấy'),
(4, 'PAY-2026-004', 4, 6, 1350000, 'VIETQR', '2026-02-10 16:50:00', 'Khách lẻ thanh toán mua qua Storefront');

-- 14. Users (RBAC)
INSERT INTO users (user_id, username, password_hash, full_name, role, email, status) VALUES
(1, 'admin', 'admin123', 'Trần Quốc Bảo (Giám Đốc)', 'ADMIN', 'admin@yencaphe.vn', 'ACTIVE'),
(2, 'kho', 'kho123', 'Nguyễn Văn Kho (Trưởng Kho)', 'WAREHOUSE_MANAGER', 'kho@yencaphe.vn', 'ACTIVE'),
(3, 'sanxuat', 'sanxuat123', 'Lê Văn Sản (Quản Đốc Phân Xưởng)', 'PRODUCTION_STAFF', 'sx@yencaphe.vn', 'ACTIVE'),
(4, 'sx', 'sx123', 'Lê Văn Sản (Quản Đốc Phân Xưởng - Alias)', 'PRODUCTION_STAFF', 'sx_alias@yencaphe.vn', 'ACTIVE'),
(5, 'thumua', 'thumua123', 'Phạm Thị Mua (Trưởng Ban Thu Mua)', 'PROCUREMENT', 'thumua@yencaphe.vn', 'ACTIVE'),
(6, 'giamdoc', 'giamdoc123', 'Trần Quốc Bảo (Giám Đốc)', 'GIAM_DOC', 'giamdoc@yencaphe.vn', 'ACTIVE'),
(7, 'phanphoi', 'phanphoi123', 'Hoàng Thị Phân Phối (QL Đại Lý Miền Nam)', 'QUAN_LY_PHAN_PHOI', 'phanphoi@yencaphe.vn', 'ACTIVE'),
(8, 'tiepthi1', 'tiepthi123', 'Nguyễn Văn Tiếp Thị (QL Đại Lý Miền Trung/Bắc)', 'QUAN_LY_PHAN_PHOI', 'tiepthi1@yencaphe.vn', 'ACTIVE'),
(9, 'daily1', 'daily123', 'Đại Lý Yến Cà Phê Tâm An', 'DAI_LY', 'taman@daily.vn', 'ACTIVE');

-- 15. Campaigns
INSERT INTO campaigns (campaign_id, title, campaign_type, target_region, banner_url, video_url, discount_percentage, product_id, start_time, end_time, is_active, notes) VALUES
(1, 'Lộc Vàng Đầu Năm - Giảm 20% Yến Sào', 'FLASHSALE', 'ALL', 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80', 'https://assets.mixkit.co/videos/preview/mixkit-coffee-beans-falling-into-a-sack-41031-large.mp4', 20.0, 1, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1, 'Flash Sale tri ân khách hàng trực tuyến'),
(2, 'Khám Phá Cà Phê Mộc Cầu Đất - Giảm 15%', 'FLASHSALE', 'CENTRAL', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', NULL, 15.0, 5, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1, 'Ưu đãi kích cầu thị trường miền Trung'),
(3, 'Cháo Yến Dinh Dưỡng Cho Gia Đình Miền Bắc', 'BANNER', 'NORTH', 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80', NULL, 10.0, 4, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 1, 'Banner mùa đông ấm áp miền Bắc');

-- 16. Material Requisitions (Quy trình 2 bước)
INSERT INTO material_requisitions (req_id, req_code, prod_order_id, product_id, requested_by, approved_by, status, notes, approved_at) VALUES
(1, 'REQ-2026-001', 1, 1, 'sx', 'kho', 'APPROVED', 'Đề xuất xuất 3.5kg yến sào tinh chế & 40kg đường phèn cho PO-001', '2026-01-10 09:00:00'),
(2, 'REQ-2026-002', 2, 2, 'sx', 'kho', 'APPROVED', 'Đề xuất xuất vật tư mẻ yến chai xuất khẩu 150ml', '2026-01-12 09:00:00'),
(3, 'REQ-2026-003', 5, 5, 'sx', 'kho', 'APPROVED', 'Đề xuất xuất 300kg cà phê Cầu Đất & 2000 bộ túi lọc phin giấy', '2026-01-20 09:00:00'),
(4, 'REQ-2026-004', NULL, 1, 'sx', NULL, 'PENDING_APPROVAL', 'Phiếu yêu cầu dự trù mẻ yến lọ mới cho tuần tới', NULL);

-- 17. Material Receipts (Thu mua nhập kho)
INSERT INTO material_receipts (receipt_id, receipt_code, material_id, supplier_name, quantity, unit_price, total_cost, market_season, imported_by, notes) VALUES
(1, 'REC-2026-001', 1, 'Công ty Yến Sào Khánh Hòa Nguồn Việt', 20000, 24800, 496000000, 'TET_HOLIDAY', 'thumua', 'Nhập 20kg tổ yến tinh chế chuẩn bị vụ Tết'),
(2, 'REC-2026-002', 2, 'Nhà máy Đường Biên Hòa', 500000, 34, 17000000, 'NORMAL', 'thumua', 'Nhập 500kg đường phèn kết tinh loại 1'),
(3, 'REC-2026-003', 4, 'Nông trường Cà Phê Cầu Đất Farm', 200000, 240, 48000000, 'HARVEST_SEASON', 'thumua', 'Thu mua cà phê vụ thu hoạch mới Cầu Đất Lâm Đồng'),
(4, 'REC-2026-004', 5, 'Nhà máy Bao Bì Thủy Tinh & Chai Lọ Sài Gòn', 25000, 2450, 61250000, 'NORMAL', 'thumua', 'Nhập 25,000 hũ thủy tinh 70ml chịu nhiệt');

-- 18. System Notifications
INSERT INTO system_notifications (notification_id, title, message, severity, is_read) VALUES
(1, 'Chào mừng đến với Hệ thống Quản trị Doanh nghiệp ERP & AI', 'Toàn bộ 24 phân hệ nghiệp vụ Yến sào & Cà phê đã sẵn sàng hoạt động.', 'INFO', TRUE),
(2, 'Cảnh báo tồn kho an toàn', 'Nguyên liệu Tổ yến tinh chế đạt mức sử dụng tối ưu, đã kích hoạt tự động phiếu thu mua.', 'WARNING', FALSE),
(3, 'Đơn hàng mới hoàn tất', 'Đơn hàng SO-2026-004 đã được thanh toán thành công qua cổng VietQR.', 'SUCCESS', FALSE);

-- 19. n8n Execution Logs
INSERT INTO n8n_execution_logs (log_id, workflow_id, workflow_name, webhook_path, execution_mode, status, summary, duration_ms) VALUES
(1, 'wf-01-etl', '01 - Visual ETL Pipeline (OLTP -> Star Schema DW)', '/webhook/trigger-etl', 'HYBRID_FALLBACK', 'SUCCESS', 'Đồng bộ toàn bộ bảng nghiệp vụ sang Star Schema Data Warehouse', 118),
(2, 'wf-02-ai-tool', '02 - AI Agent Tool Calling Middleware', '/webhook/ai-tool', 'HYBRID_FALLBACK', 'SUCCESS', 'AI Copilot truy vấn tồn kho tổ yến và định mức BOM an toàn', 64),
(3, 'wf-03-alerts', '03 - Event-Driven System Alerts & Notification', '/webhook/system-alert', 'HYBRID_FALLBACK', 'SUCCESS', 'Kiểm tra ngưỡng tồn kho an toàn và đẩy cảnh báo chuông ERP', 38);

-- 20. Product Reviews
INSERT INTO product_reviews (review_id, product_id, reviewer_name, customer_type, rating, comment, region, verified_purchase) VALUES
(1, 1, 'Bác Nguyễn Văn Hòa (64 tuổi)', 'RETAIL', 5, 'Tôi ở Hà Nội mua 2 thùng dùng mỗi tối mùa lạnh thấy ấm phổi, ngủ rất sâu giấc, sợi yến thật và thơm dịu không bị ngọt gắt.', 'Miền Bắc', 1),
(2, 1, 'Chị Trần Minh Thư', 'RETAIL', 5, 'Mua biếu bố mẹ chồng dịp lễ, hộp đóng gói cực kỳ sang trọng, có đầy đủ tem truy xuất lô nhà máy Khánh Hòa.', 'Miền Trung', 1),
(3, 1, 'Nhà Thuốc & Quà Biếu Tâm An', 'AGENT_VIP', 5, 'Đại lý bên mình nhập sỉ đều đặn 10 thùng/tháng, khách phản hồi chất lượng đồng đều, hạn sử dụng luôn mới tinh từ nhà máy.', 'Miền Bắc', 1),
(4, 2, 'Anh Lê Hoàng Nam (Giám đốc XD)', 'RETAIL', 5, 'Chai 300ml rất chất lượng, sợi yến đặc, mang đi làm hay biếu đối tác ở Đà Nẵng ai cũng khen lịch sự.', 'Miền Trung', 1),
(5, 2, 'Chị Phạm Thu Trang', 'RETAIL', 5, 'Mình mua cho ông xã đi tập thể thao về uống, để ngăn mát tủ lạnh uống rất sảng khoái và khỏe người.', 'Miền Nam', 1),
(6, 3, 'Anh Võ Thành Đạt (TP.HCM)', 'RETAIL', 5, 'Thời tiết Sài Gòn nóng bức có thùng Yến Lon 190ml để tủ lạnh uống cực đã, vị thanh mát ít ngọt nên người tiểu đường nhẹ dùng rất yên tâm.', 'Miền Nam', 1),
(7, 3, 'Siêu Thị Mini GreenMart', 'AGENT_VIP', 5, 'Dòng yến lon này bán chạy nhất tại cửa hàng mình ở Quận 7, chiết khấu thùng 24 lon rất tốt.', 'Miền Nam', 1),
(8, 4, 'Chị Đỗ Bích Ngọc (Hải Phòng)', 'RETAIL', 5, 'Sáng mùa đông pha 1 tô cháo yến nóng hổi cho các cháu đi học chỉ mất 3 phút, hạt cháo sánh mịn, có gói tổ yến và thịt thật rất thơm.', 'Miền Bắc', 1),
(9, 4, 'Anh Hoàng Xuân Bách', 'RETAIL', 4, 'Cháo dễ ăn, người mới ốm dậy ăn vào tỉnh táo hẳn, giao hàng nhanh.', 'Miền Bắc', 1),
(10, 5, 'Anh Trần Quốc Tuấn (Đà Lạt)', 'RETAIL', 5, 'Đúng chuẩn vị Arabica Cầu Đất rang mộc! Túi phin giấy gác lên ly cực kỳ tiện khi ngồi văn phòng, thơm nồng nàn.', 'Miền Nam', 1),
(11, 5, 'Chuỗi Cafe & Bakery Bình Minh', 'AGENT_VIP', 5, 'Đặt sỉ 20 hộp cho khách mang về, ai cũng ấn tượng vì bao bì đẹp và hương vị cà phê sạch 100%.', 'Miền Trung', 1);

-- 21. Workshops (Phân xưởng sản xuất)
INSERT INTO workshops (workshop_id, workshop_code, workshop_name, workshop_type, location, manager_name, capacity_per_day, status) VALUES
(1, 'WS01', 'Xưởng Chưng Yến Vô Trùng Khánh Hòa', 'YEN_SAO', 'Số 12 Trần Phú, TP. Nha Trang, Khánh Hòa', 'Lê Văn Sản', 3000, 'ACTIVE'),
(2, 'WS02', 'Xưởng Rang Xay & Đóng Gói Cà Phê Cầu Đất', 'CA_PHE', 'Xã Xuân Trường, TP. Đà Lạt, Lâm Đồng', 'Trần Hữu Nghị', 2500, 'ACTIVE'),
(3, 'WS03', 'Phân Xưởng Hoàn Thiện & Đóng Gói Sài Gòn', 'DONG_GOI', 'KCN Tân Bình, Quận Tân Phú, TP.HCM', 'Nguyễn Thị Hoa', 5000, 'ACTIVE');

-- 22. Work Shifts (Danh mục ca làm việc)
INSERT INTO work_shifts (shift_id, shift_code, shift_name, start_time, end_time, standard_hours, description) VALUES
(1, 'CA-1', 'Ca Sáng Sản Xuất', '06:00', '14:00', 8.0, 'Ca chế biến sơ chế nguyên liệu & hấp tiệt trùng mẻ đầu ngày'),
(2, 'CA-2', 'Ca Chiều Hoàn Thiện', '14:00', '22:00', 8.0, 'Ca đóng gói, dán nhãn, siết nắp và kiểm định thành phẩm'),
(3, 'CA-HC', 'Ca Hành Chính Kỹ Thuật', '08:00', '17:00', 8.0, 'Ca quản lý xưởng, bảo trì máy móc và kiểm tra QA/QC');

-- 23. Workers (Công nhân xưởng sản xuất)
INSERT INTO workers (worker_id, worker_code, full_name, phone, workshop_id, skill_level, specialty, hourly_rate, status) VALUES
(1, 'CN01', 'Trần Văn Lành', '0912345001', 1, 'THO_CHINH', 'Sơ chế & nhặt lông yến rút khô', 42000, 'ACTIVE'),
(2, 'CN02', 'Lê Thị Mười', '0912345002', 1, 'THO_CHINH', 'Vận hành nồi chưng tiệt trùng 121 độ C', 40000, 'ACTIVE'),
(3, 'CN03', 'Nguyễn Văn Đức', '0912345003', 1, 'THO_PHU', 'Rửa sấy tiệt trùng hũ & siết nắp thiếc', 32000, 'ACTIVE'),
(4, 'CN04', 'Phạm Quốc Cường', '0912345004', 2, 'THO_CHINH', 'Vận hành máy rang cà phê khí nóng Probat', 45000, 'ACTIVE'),
(5, 'CN05', 'Đặng Thị Lan', '0912345005', 2, 'KY_THUAT_VIEN', 'Đóng gói phin giấy & kiểm định cupping', 38000, 'ACTIVE'),
(6, 'CN06', 'Bùi Văn Tài', '0912345006', 3, 'THO_PHU', 'Đóng thùng carton, dán tem QR & bốc xếp pallet', 32000, 'ACTIVE');

-- 24. Production Worker Assignments (Phân công công nhân theo lệnh SX)
INSERT INTO production_worker_assignments (assignment_id, production_order_id, worker_id, shift_id, assigned_date, planned_hours, actual_hours, output_completed, notes) VALUES
(1, 1, 1, 1, '2026-01-10', 8.0, 8.0, 1500, 'Hoàn thành công đoạn nhặt lông yến mẻ PO-001'),
(2, 1, 2, 1, '2026-01-10', 8.0, 8.5, 3500, 'Tăng ca 0.5h chưng tiệt trùng hoàn thiện lô PO-001'),
(3, 2, 2, 2, '2026-01-12', 8.0, 8.0, 1800, 'Vận hành dây chuyền chiết rót yến chai 150ml'),
(4, 5, 4, 1, '2026-01-20', 8.0, 8.0, 1200, 'Rang mộc 300kg cà phê Cầu Đất đạt chuẩn cupping');

-- 25. Dealer Purchase Requests (Yêu cầu nhập hàng từ Đại lý)
INSERT INTO dealer_purchase_requests (request_id, request_code, customer_id, product_id, quantity_requested, unit_price, total_amount, status, expected_delivery_date, notes) VALUES
(1, 'DLR-2026-001', 1, 1, 100, 38000, 3800000, 'DU_HANG_DA_XUAT', '2026-02-01', 'Đại lý Tâm An đặt 100 lọ yến chưng - Kho đủ tồn đã duyệt xuất'),
(2, 'DLR-2026-002', 2, 2, 300, 38000, 11400000, 'THIEU_HANG_CHO_SX', '2026-02-15', 'Siêu thị GreenMart đặt 300 chai yến - Tồn kho thiếu 120 chai, đã chuyển lệnh SX'),
(3, 'DLR-2026-003', 3, 5, 50, 60000, 3000000, 'CHO_XU_LY', '2026-02-10', 'Chuỗi Cafe Bình Minh yêu cầu nhập 50 hộp cà phê phin giấy');

-- 26. Order Returns (Phiếu đổi trả hàng lỗi)
INSERT INTO order_returns (return_id, return_code, sales_order_id, customer_id, product_id, quantity_returned, reason, resolution_type, amount_compensated, status, notes) VALUES
(1, 'RET-2026-001', 1, 1, 1, 2, 'Vỡ 2 lọ thủy tinh do đơn vị vận chuyển dằn xóc', 'TRU_CONG_NO', 90000, 'DA_XU_LY', 'Đã cấn trừ 90,000 đ vào công nợ đại lý Tâm An');

-- 27. Staff Agent Assignments (Phân quyền phụ trách đại lý)
INSERT INTO staff_agent_assignments (assignment_id, user_id, customer_id, notes) VALUES
(1, 7, 1, 'Hoàng Thị Phân Phối phụ trách Đại lý Yến Cần Thơ'),
(2, 7, 2, 'Hoàng Thị Phân Phối phụ trách Bách Hóa Xanh'),
(3, 7, 5, 'Hoàng Thị Phân Phối phụ trách NPP Nông Sản Nha Trang');
