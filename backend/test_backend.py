import unittest
import os
import sys
import sqlite3

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import HTTPException
from main import (
    DBContext,
    auth_login,
    LoginRequest,
    get_products,
    get_bom,
    get_materials,
    get_dashboard_stats,
    calculate_item_pricing,
    verify_agent,
    preview_pricing,
    store_checkout,
    get_store_products,
    get_campaigns,
    create_campaign,
    CampaignCreate,
    create_production_order,
    ProductionOrderCreate,
    get_material_requisitions,
    approve_material_requisition,
    import_material_stock,
    MaterialImportRequest,
    get_ai_profit_forecast,
    execute_ai_strategy,
    StrategyExecuteRequest,
    AgentVerifyRequest,
    PricingPreviewRequest,
    PricingPreviewItem,
    StoreCheckoutRequest,
    StoreOrderItem,
    get_n8n_status,
    trigger_n8n_workflow,
    N8nTriggerRequest,
    download_n8n_workflow_json,
    get_tax_report_summary,
    export_tax_and_archive_file,
    download_import_template,
    import_tabular_data_file,
    FileImportRequest,
    get_cloud_images,
    upload_or_register_cloud_image,
    CloudImageUploadRequest,
)
from excel_service import parse_tabular_file

class TestBackendCore(unittest.TestCase):
    """
    TDD Seam Tests for Backend ERP Core Logic & Database Integrity
    """

    def test_database_connection_and_mode(self):
        """Kiểm tra kết nối DBContext và đảm bảo chế độ hoạt động hợp lệ"""
        with DBContext() as db:
            self.assertIn(db.mode, ["SQLITE", "POSTGRESQL"])
            self.assertIsNotNone(db.conn)

    def test_products_exist_and_cover_5_categories(self):
        """Đảm bảo CSDL có đủ 5 dòng sản phẩm chiến lược của doanh nghiệp"""
        res = get_products()
        self.assertIn("data", res)
        products = res["data"]
        self.assertGreaterEqual(len(products), 5)
        
        product_names = [p["product_name"] for p in products]
        has_yen_lo = any("Yến Lọ" in name for name in product_names)
        has_yen_chai = any("Yến Chai" in name for name in product_names)
        has_yen_lon = any("Yến Lon" in name for name in product_names)
        has_chao_yen = any("Cháo Yến" in name for name in product_names)
        has_ca_phe = any("Cà Phê" in name for name in product_names)

        self.assertTrue(has_yen_lo, "Thiếu dòng sản phẩm Yến Lọ")
        self.assertTrue(has_yen_chai, "Thiếu dòng sản phẩm Yến Chai")
        self.assertTrue(has_yen_lon, "Thiếu dòng sản phẩm Yến Lon")
        self.assertTrue(has_chao_yen, "Thiếu dòng sản phẩm Cháo Yến")
        self.assertTrue(has_ca_phe, "Thiếu dòng sản phẩm Cà Phê")

    def test_bom_specification_exists(self):
        """Đảm bảo định mức BOM được cấu hình đầy đủ cho sản phẩm yến lọ (ID 1)"""
        res = get_bom(1)
        self.assertEqual(res["product_id"], 1)
        self.assertGreater(len(res["bom"]), 0)
        materials = [b["material_name"].lower() for b in res["bom"]]
        has_yen_raw = any("tổ yến" in m for m in materials)
        self.assertTrue(has_yen_raw, "BOM sản phẩm 1 thiếu nguyên vật liệu Tổ yến")

    def test_dashboard_stats_calculation(self):
        """Đảm bảo API Dashboard Stats trả về đúng cấu trúc chỉ số BI"""
        stats = get_dashboard_stats()
        self.assertIn("monthly_revenue", stats)
        self.assertIn("finished_goods_count", stats)
        self.assertIn("raw_bird_nest_stock", stats)
        self.assertIn("active_production_orders", stats)
        self.assertGreaterEqual(stats["monthly_revenue"], 0)


class TestStorefrontSecurityAndCommerce(unittest.TestCase):
    """
    Unit Tests cho Phân Hệ Bán Hàng Storefront: Server-side Pricing,
    Bảo Mật Tồn Kho, Ràng Buộc Công Nợ và Xác Thực Đại Lý B2B
    """

    def test_server_side_pricing_retail(self):
        """Khách mua lẻ dưới MOQ (VD: 5 lọ yến) phải tính đúng giá niêm yết bán lẻ"""
        with DBContext() as db:
            # Sản phẩm 1 (Yến lọ 70ml): Giá lẻ 45,000 đ
            res = calculate_item_pricing(db, product_id=1, quantity=5, is_agent=False)
            self.assertEqual(res["applied_price"], 45000.0)
            self.assertEqual(res["line_total"], 45000.0 * 5)
            self.assertEqual(res["discount_amount"], 0.0)
            self.assertFalse(res["is_wholesale"])

    def test_server_side_pricing_wholesale_moq(self):
        """Khách mua đạt MOQ thùng (VD: 24 lọ yến) tự động áp dụng giá sỉ MOQ (37,000 đ)"""
        with DBContext() as db:
            res = calculate_item_pricing(db, product_id=1, quantity=24, is_agent=False)
            self.assertEqual(res["applied_price"], 37000.0)
            self.assertEqual(res["line_total"], 37000.0 * 24)
            self.assertGreater(res["discount_amount"], 0)
            self.assertTrue(res["is_wholesale"])

    def test_server_side_pricing_agent_vip(self):
        """Đại lý chính thức (is_agent=True) luôn được hưởng giá sỉ VIP cao nhất (35,000 đ)"""
        with DBContext() as db:
            res = calculate_item_pricing(db, product_id=1, quantity=1, is_agent=True)
            self.assertEqual(res["applied_price"], 35000.0)
            self.assertEqual(res["line_total"], 35000.0)
            self.assertTrue(res["is_wholesale"])

    def test_verify_agent_valid_and_invalid(self):
        """Kiểm tra xác thực Mã Đại Lý B2B: Mã thật thành công, mã giả bị từ chối"""
        # Mã hợp lệ trong CSDL: CUST_AGENT_01
        valid_res = verify_agent(AgentVerifyRequest(agent_code="CUST_AGENT_01"))
        self.assertTrue(valid_res["valid"])
        self.assertEqual(valid_res["agent"]["customer_type"], "AGENT")
        self.assertGreater(valid_res["agent"]["credit_limit"], 0)

        # Mã giả mạo hoặc không tồn tại
        invalid_res = verify_agent(AgentVerifyRequest(agent_code="FAKE_AGENT_999"))
        self.assertFalse(invalid_res["valid"])

    def test_pricing_preview_calculation(self):
        """API tính giá trước trả về tổng tiền và chiết khấu chuẩn xác"""
        req = PricingPreviewRequest(
            agent_code=None,
            items=[
                PricingPreviewItem(product_id=1, quantity=24), # đạt MOQ thùng
                PricingPreviewItem(product_id=2, quantity=2),  # giá lẻ
            ]
        )
        preview = preview_pricing(req)
        self.assertGreater(preview["final_amount"], 0)
        self.assertGreater(preview["total_discount"], 0)
        self.assertEqual(len(preview["items"]), 2)

    def test_checkout_stock_validation_prevents_overselling(self):
        """Đặt hàng vượt quá số lượng tồn kho thành phẩm thực tế phải bị từ chối 400"""
        req = StoreCheckoutRequest(
            customer_name="Khách Thử Nghiệm",
            phone="0911223344",
            address="123 Đường Test, TP.HCM",
            items=[StoreOrderItem(product_id=1, quantity=999999)], # vượt tồn kho
            payment_method="VIETQR"
        )
        with self.assertRaises(HTTPException) as ctx:
            store_checkout(req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("không đủ tồn kho", ctx.exception.detail)

    def test_checkout_retail_customer_cannot_use_debt(self):
        """Khách mua lẻ bình thường không thể chọn thanh toán Ghi nợ công nợ (DEBT)"""
        req = StoreCheckoutRequest(
            customer_name="Khách Lẻ Hack",
            phone="0933333333",
            address="456 Đường Lẻ, Hà Nội",
            agent_code=None,
            items=[StoreOrderItem(product_id=1, quantity=2)],
            payment_method="DEBT" # trái phép đối với khách lẻ
        )
        with self.assertRaises(HTTPException) as ctx:
            store_checkout(req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Ghi nợ công nợ", ctx.exception.detail)

    def test_checkout_success_with_vietqr_generation(self):
        """Đơn đặt hàng hợp lệ tạo thành công và sinh mã VietQR Napas247 đầy đủ"""
        req = StoreCheckoutRequest(
            customer_name="Trần Thị Thu",
            phone="0977889900",
            address="789 Lê Lợi, Đà Nẵng",
            items=[StoreOrderItem(product_id=1, quantity=2)],
            payment_method="VIETQR"
        )
        res = store_checkout(req)
        self.assertTrue(res["success"])
        self.assertTrue(res["order_code"].startswith("SO-STORE-"))
        self.assertIn("vietqr.io", res["vietqr_url"])
        self.assertIn("MBBank", res["bank_info"]["bank_name"])
        self.assertEqual(res["final_amount"], 90000.0) # 2 x 45,000 đ


class TestVersion140RBACAndGeoPersonalizationAndAI(unittest.TestCase):
    """
    Unit Tests cho Phiên bản 1.4.0:
    - Phân quyền đa cấp RBAC (ADMIN, WAREHOUSE_MANAGER, PRODUCTION_STAFF, PROCUREMENT)
    - Cá nhân hóa Storefront theo khu vực (Miền Bắc, Miền Trung, Miền Nam)
    - Quản trị Chiến dịch Flash Sale & Video Showcase
    - Quy trình duyệt xuất kho NVL 2 bước (Sản xuất lập -> Trưởng kho duyệt)
    - Phân hệ Thu mua NVL theo giá biến động thị trường
    - Module AI Dự báo biến động lợi nhuận 12 tháng & 4 giai đoạn chiến lược
    """

    def test_rbac_four_standard_roles_login(self):
        """Kiểm tra đăng nhập thành công cả 4 tài khoản mẫu chuẩn RBAC"""
        roles_expected = [
            ("admin", "admin123", ["ADMIN"]),
            ("kho", "kho123", ["QUAN_LY_KHO", "WAREHOUSE_MANAGER"]),
            ("sanxuat", "sanxuat123", ["QUAN_DOC_SAN_XUAT", "PRODUCTION_STAFF"]),
            ("thumua", "thumua123", ["PROCUREMENT"]),
        ]
        for username, pwd, expected_roles in roles_expected:
            res = auth_login(LoginRequest(username=username, password=pwd))
            self.assertTrue(res["success"])
            self.assertIn(res["user"]["role"], expected_roles)
            self.assertTrue(res["token"].startswith("token_"))

    def test_geo_targeted_personalization_sorting(self):
        """Kiểm tra Storefront tự động đẩy sản phẩm ưu tiên theo vùng miền lên Top 1"""
        north_res = get_store_products(region="NORTH")
        self.assertEqual(north_res["selected_region"], "NORTH")
        self.assertEqual(north_res["data"][0]["target_region"], "NORTH")
        self.assertTrue(north_res["data"][0]["is_regional_top"])

        south_res = get_store_products(region="SOUTH")
        self.assertEqual(south_res["selected_region"], "SOUTH")
        self.assertEqual(south_res["data"][0]["target_region"], "SOUTH")
        self.assertTrue(south_res["data"][0]["is_regional_top"])

        central_res = get_store_products(region="CENTRAL")
        self.assertEqual(central_res["selected_region"], "CENTRAL")
        self.assertEqual(central_res["data"][0]["target_region"], "CENTRAL")
        self.assertTrue(central_res["data"][0]["is_regional_top"])

    def test_two_step_material_requisition_approval_workflow(self):
        """Kiểm tra quy trình 2 bước: Sản xuất tạo lệnh -> Sinh phiếu chờ duyệt -> Trưởng kho duyệt mới trừ NVL"""
        # Bước 1: Tạo lệnh sản xuất mới
        po_res = create_production_order(
            ProductionOrderCreate(product_id=1, target_quantity=10, notes="Test 2-Step Approval")
        )
        self.assertIn("req_code", po_res)
        po_id = po_res["id"]

        # Kiểm tra phiếu yêu cầu ở trạng thái PENDING_APPROVAL
        reqs = get_material_requisitions()["data"]
        target_req = next((r for r in reqs if r["prod_order_id"] == po_id), None)
        self.assertIsNotNone(target_req)
        self.assertEqual(target_req["status"], "PENDING_APPROVAL")
        self.assertEqual(target_req["po_status"], "PENDING")

        # Bước 2: Trưởng kho phê duyệt xuất kho
        approve_res = approve_material_requisition(target_req["req_id"])
        self.assertTrue(approve_res["success"])

        # Kiểm tra sau khi duyệt: Phiếu chuyển APPROVED, Lệnh SX chuyển IN_PROGRESS
        reqs_after = get_material_requisitions()["data"]
        updated_req = next((r for r in reqs_after if r["req_id"] == target_req["req_id"]), None)
        self.assertEqual(updated_req["status"], "APPROVED")
        self.assertEqual(updated_req["po_status"], "IN_PROGRESS")

    def test_procurement_material_import_with_market_price(self):
        """Kiểm tra bộ phận Thu mua nhập kho NVL với đơn giá thị trường biến động"""
        mats_before = get_materials()["data"]
        yen_before = next(m for m in mats_before if m["material_id"] == 1)["current_stock"]

        imp_res = import_material_stock(
            MaterialImportRequest(
                material_id=1,
                quantity=500.0,
                unit_price=20100.0,
                supplier_name="Nhà Yến Khánh Hòa Test",
                market_season="LOW_SEASON_MAY_JUL",
                notes="Nhập tích trữ mùa hè giá đáy"
            )
        )
        self.assertTrue(imp_res["success"])
        self.assertEqual(imp_res["total_cost"], 500.0 * 20100.0)

        mats_after = get_materials()["data"]
        yen_after = next(m for m in mats_after if m["material_id"] == 1)["current_stock"]
        self.assertEqual(float(yen_after), float(yen_before) + 500.0)

    def test_ai_profit_forecast_1year_and_4_phases(self):
        """Kiểm tra API Dự báo biến động lợi nhuận 1 năm trả về đủ 12 tháng và 4 giai đoạn chiến lược"""
        forecast = get_ai_profit_forecast()
        self.assertIn("summary", forecast)
        self.assertEqual(len(forecast["monthly_forecast"]), 12)
        self.assertEqual(len(forecast["strategic_phases"]), 4)

        phase_codes = [p["phase_code"] for p in forecast["strategic_phases"]]
        self.assertIn("ACCUMULATE_MAY_JUL", phase_codes)
        self.assertIn("ACCELERATE_AUG_OCT", phase_codes)
        self.assertIn("HARVEST_NOV_DEC", phase_codes)
        self.assertIn("CLEARANCE_JAN_FEB", phase_codes)

    # =========================================================================
    # VERSION 1.5.0 SEAM TESTS: n8n, Tax Excel/CSV Export-Import & Cloud Images
    # =========================================================================
    def test_n8n_status_and_trigger_and_workflow_json(self):
        """Kiểm tra trạng thái 3 Workflows n8n, kích hoạt Webhook và tải file JSON"""
        status_res = get_n8n_status()
        self.assertEqual(len(status_res["workflows"]), 3)
        self.assertGreaterEqual(len(status_res["recent_logs"]), 3)

        trig_res = trigger_n8n_workflow(N8nTriggerRequest(workflow_id="01_etl_star_schema"))
        self.assertTrue(trig_res["success"])
        self.assertEqual(trig_res["execution"]["workflow_id"], "01_etl_star_schema")

        json_resp = download_n8n_workflow_json("01_etl_star_schema")
        self.assertEqual(json_resp.status_code, 200)
        self.assertIn(b"01 - Visual ETL Pipeline", json_resp.body)

    def test_tax_report_summary_and_multi_sheet_xlsx_export(self):
        """Kiểm tra tổng hợp báo cáo thuế GTGT (8%/10%) và xuất file .xlsx 4 sheet chuẩn OpenXML"""
        summary_8 = get_tax_report_summary(period="ALL", vat_rate=8.0)
        self.assertEqual(summary_8["summary"]["vat_rate"], 8.0)
        self.assertGreater(summary_8["summary"]["total_final_payment"], 0)
        self.assertIn("01_Bang_Ke_Thue_Dau_Ra", summary_8["preview"])
        self.assertIn("02_Nhap_Xuat_Ton_Kho", summary_8["preview"])
        self.assertIn("03_Nhat_Ky_San_Xuat", summary_8["preview"])
        self.assertIn("04_So_Cong_No_Khach_Hang", summary_8["preview"])

        xlsx_resp = export_tax_and_archive_file(period="ALL", vat_rate=8.0, format="xlsx")
        self.assertEqual(xlsx_resp.status_code, 200)
        self.assertTrue(xlsx_resp.body.startswith(b"PK\x03\x04"))

        # Kiểm tra đọc ngược lại file .xlsx vừa xuất bằng parser thuần Python
        parsed_rows = parse_tabular_file(xlsx_resp.body, "HoSo_BaoCaoThue.xlsx")
        self.assertGreater(len(parsed_rows), 0)
        self.assertIn("So_Hoa_Don_Don_Hang", parsed_rows[0])

    def test_tabular_file_import_materials(self):
        """Kiểm tra tải file mẫu .xlsx và import dữ liệu vào kho NVL"""
        tpl_resp = download_import_template(target="MATERIALS", format="xlsx")
        self.assertTrue(tpl_resp.body.startswith(b"PK\x03\x04"))

        import base64
        b64_content = base64.b64encode(tpl_resp.body).decode("utf-8")
        imp_res = import_tabular_data_file(
            FileImportRequest(
                target="MATERIALS",
                filename="FileMau_Import_NguyenVatLieu.xlsx",
                file_base64=b64_content,
                imported_by="kho"
            )
        )
        self.assertTrue(imp_res["success"])
        self.assertGreaterEqual(imp_res["processed_count"], 2)

    def test_cloud_images_gallery_and_upload(self):
        """Kiểm tra kho ảnh Cloud CDN và API đăng ký/upload ảnh sản phẩm mới"""
        gallery = get_cloud_images()["data"]
        self.assertGreaterEqual(len(gallery), 5)

        up_res = upload_or_register_cloud_image(
            CloudImageUploadRequest(
                title="Ảnh Cloud Test Yến Chưng Hoàng Gia",
                category="YEN_LO",
                cloud_url="https://images.unsplash.com/photo-1544787219-7f47ccb76574"
            )
        )
        self.assertTrue(up_res["success"])
        self.assertIn("auto=format", up_res["cloud_url"])

    # =========================================================================
    # VERSION 1.6.0 TDD SEAMS: Notification Center, Debt Settlement & Load Test
    # =========================================================================
    def test_seam1_system_notifications_list_and_mark_read(self):
        """Seam 1: Kiểm tra lấy danh sách Chuông thông báo, số lượng chưa đọc và đánh dấu đã đọc"""
        from main import get_system_notifications, mark_notifications_read, NotificationReadRequest
        res_before = get_system_notifications()
        self.assertIn("data", res_before)
        self.assertIn("unread_count", res_before)
        self.assertGreaterEqual(len(res_before["data"]), 1)

        mark_res = mark_notifications_read(NotificationReadRequest(mark_all=True))
        self.assertTrue(mark_res["success"])

        res_after = get_system_notifications()
        self.assertEqual(res_after["unread_count"], 0)

    def test_seam2_customer_debt_settlement(self):
        """Seam 2: Kiểm tra nghiệp vụ thu hồi/thanh toán công nợ khách hàng B2B và ghi sổ thanh toán"""
        from main import get_customers, settle_customer_debt, CustomerDebtSettleRequest
        customers = get_customers()["data"]
        target = customers[0]
        cid = target["customer_id"]

        # Cấp tạm dư nợ 5,000,000đ để test thu hồi nợ
        with DBContext() as db:
            db.execute("UPDATE customers SET current_debt = 5000000 WHERE customer_id = %s", (cid,))

        res = settle_customer_debt(
            cid,
            CustomerDebtSettleRequest(amount=2000000, payment_method="BANK_TRANSFER", notes="Thu nợ đợt 1")
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["remaining_debt"], 3000000.0)

    def test_seam3_web_load_and_concurrency_stress_benchmark(self):
        """Seam 3: Kiểm thử chịu tải đồng thời (100 requests song song trên 20 luồng) đạt 100% thành công & P95 < 250ms"""
        from main import run_system_load_benchmark, LoadBenchmarkRequest
        bench = run_system_load_benchmark(LoadBenchmarkRequest(concurrent_users=20, total_requests=100))
        self.assertTrue(bench["success"])
        self.assertEqual(bench["total_requests"], 100)
        self.assertEqual(bench["failed_requests"], 0)
        self.assertEqual(bench["success_rate_pct"], 100.0)
        self.assertGreater(bench["requests_per_second"], 50.0)
        self.assertLess(bench["p95_latency_ms"], 250.0)
        self.assertEqual(len(bench["endpoint_breakdown"]), 5)

    def test_v170_product_detail_and_reviews(self):
        """Version 1.7.0 Seam 1: Kiểm tra API Trang Chi Tiết Sản Phẩm (Thông tin, Địa chỉ SX, Công dụng, BOM, Lô hàng & Đánh giá người mua)"""
        from main import get_store_product_detail, create_product_review, ProductReviewCreate
        detail = get_store_product_detail(1)
        self.assertIn("product", detail)
        self.assertIn("origin_info", detail)
        self.assertIn("factory_address", detail["origin_info"])
        self.assertIn("usage_guide", detail)
        self.assertIn("bom_ingredients", detail)
        self.assertIn("batches", detail)
        self.assertIn("reviews", detail)
        self.assertIn("rating_summary", detail)
        self.assertGreaterEqual(len(detail["reviews"]), 2)
        initial_count = detail["rating_summary"]["total_reviews"]

        # Khách hàng gửi đánh giá mới
        new_rev = create_product_review(
            1,
            ProductReviewCreate(
                reviewer_name="Chị Lan Hương (Hà Nội)",
                customer_type="RETAIL",
                rating=5,
                comment="Yến chưng rất thơm ngon, sợi yến dai tự nhiên, đóng gói sang trọng!",
                region="Miền Bắc"
            )
        )
        self.assertTrue(new_rev["success"])

        detail_after = get_store_product_detail(1)
        self.assertEqual(detail_after["rating_summary"]["total_reviews"], initial_count + 1)
        self.assertEqual(detail_after["reviews"][0]["reviewer_name"], "Chị Lan Hương (Hà Nội)")

    def test_v170_shoppable_ai_sales_chat(self):
        """Version 1.7.0 Seam 2: Kiểm tra Chatbot gợi ý thẻ sản phẩm đa năng có đủ ảnh, giá lẻ/sỉ, sao đánh giá để Mua Ngay hoặc Xem Chi Tiết"""
        from main import ai_sales_chat, SalesChatQuery
        res1 = ai_sales_chat(SalesChatQuery(message="Tư vấn quà biếu sức khỏe cho người lớn tuổi", customer_type="RETAIL"))
        self.assertGreaterEqual(len(res1["suggested_products"]), 1)
        first_card = res1["suggested_products"][0]
        self.assertIn("product_id", first_card)
        self.assertIn("image", first_card)
        self.assertIn("wholesale_price", first_card)
        self.assertIn("average_rating", first_card)
        self.assertIn("buy_now", first_card["actions"])
        self.assertIn("view_detail", first_card["actions"])

        # Câu hỏi chung / chào hỏi cũng phải trả kèm danh sách gợi ý để khách bấm mua ngay
        res2 = ai_sales_chat(SalesChatQuery(message="Xin chào, gợi ý sản phẩm nổi bật hôm nay giúp tôi", customer_type="RETAIL"))
        self.assertGreaterEqual(len(res2["suggested_products"]), 2)

    def test_v180_rag_natural_query_understanding_and_sources(self):
        """Version 1.8.0 Seam 1: Kiểm tra RAG hiểu câu hỏi tự nhiên 'trong kho có gì', 'còn tồn những gì' và trả về nguồn dữ liệu"""
        from main import ai_chatbot, ChatQuery
        # 1. Câu hỏi 'trong kho có gì' - trước đây bị lỗi rơi vào fallback
        res1 = ai_chatbot(ChatQuery(question="trong kho có gì"))
        self.assertNotIn("Đã nhận diện yêu cầu", res1["answer"], "Không được trả về câu trả lời fallback rỗng")
        self.assertTrue(any(prod in res1["answer"] for prod in ["Yến Lọ", "Yến Chai", "Yến Lon", "Cháo Yến", "Cà Phê"]))
        self.assertIn("sources", res1)
        self.assertIn("finished_goods_inventory", res1["sources"])
        self.assertIn("model_used", res1)

        # 2. Câu hỏi 'còn tồn những gì'
        res2 = ai_chatbot(ChatQuery(question="còn tồn những gì"))
        self.assertNotIn("Đã nhận diện yêu cầu", res2["answer"])
        self.assertTrue(any(prod in res2["answer"] for prod in ["Yến Lọ", "Yến Chai", "Yến Lon"]))

        # 3. Câu hỏi về nguyên liệu
        res3 = ai_chatbot(ChatQuery(question="nguyên liệu còn lại thế nào"))
        self.assertNotIn("Đã nhận diện yêu cầu", res3["answer"])
        self.assertTrue("materials" in res3["sources"] or "materials" in str(res3))

        # 4. Câu hỏi về chính sách đại lý & giá sỉ B2B
        res4 = ai_chatbot(ChatQuery(question="chính sách đại lý và giá sỉ thế nào"))
        self.assertIn("Chiết Khấu", res4["answer"])
        self.assertTrue("price_policies" in res4["sources"] or "customers" in res4["sources"])

        # 5. Câu hỏi về công dụng sức khỏe
        res5 = ai_chatbot(ChatQuery(question="công dụng của yến lọ và cà phê"))
        self.assertIn("Bổ phế khí", res5["answer"])
        self.assertIn("products", res5["sources"])

    def test_v180_gemini_ai_configuration_api(self):
        """Version 1.8.0 Seam 2: Kiểm tra API lấy và cập nhật cấu hình Gemini API Key"""
        from main import get_ai_config, update_ai_config, AIConfigUpdateRequest
        cfg = get_ai_config()
        self.assertIn("gemini_configured", cfg)
        self.assertIn("active_model", cfg)

        # Cập nhật thử cấu hình
        up_res = update_ai_config(AIConfigUpdateRequest(api_key="AIzaSyTestMockKeyForTddVerification123", model="gemini-1.5-flash"))
        self.assertTrue(up_res["success"])
        self.assertTrue(up_res["gemini_configured"])
        self.assertEqual(up_res["active_model"], "gemini-1.5-flash")


class TestCanonicalDatabaseSeam(unittest.TestCase):
    """
    Seam 1: Kiểm thử Cấu trúc DDL 24 Bảng Chuẩn & Bộ Dữ Liệu Thực Tế (database/schema.sql & database/seed.sql)
    """
    EXPECTED_CANONICAL_TABLES = [
        "product_categories", "products", "suppliers", "materials", "bill_of_materials",
        "production_plans", "production_orders", "material_issues", "material_issue_details",
        "finished_goods_inventory", "customers", "sales_orders", "sales_order_details",
        "inventory_dispatches", "payments", "price_policies", "users", "campaigns",
        "material_requisitions", "material_receipts", "system_notifications",
        "n8n_execution_logs", "cloud_assets", "product_reviews",
        "workshops", "workers", "work_shifts", "production_worker_assignments",
        "dealer_purchase_requests", "order_returns"
    ]

    def test_schema_sql_creates_all_24_canonical_tables(self):
        """Kiểm tra database/schema.sql tạo sạch sẽ đầy đủ 24 bảng chuẩn ERP"""
        import setup_database
        schema_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_text = f.read()

        converted_sql = setup_database.convert_ddl_to_sqlite(sql_text)
        mem_conn = sqlite3.connect(":memory:")
        mem_conn.executescript(converted_sql)
        cur = mem_conn.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

        for expected in self.EXPECTED_CANONICAL_TABLES:
            self.assertIn(expected, tables, f"Thiếu bảng '{expected}' trong schema.sql")
        mem_conn.close()

    def test_seed_sql_populates_realistic_enterprise_data(self):
        """Kiểm tra database/seed.sql nạp đầy đủ dữ liệu thực tế: 5 sản phẩm, 6 NCC, 9 NVL, 14 BOM, người dùng RBAC, review"""
        import setup_database
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        schema_path = os.path.join(base_dir, "database", "schema.sql")
        seed_path = os.path.join(base_dir, "database", "seed.sql")

        with open(schema_path, "r", encoding="utf-8") as f:
            schema_sql = setup_database.convert_ddl_to_sqlite(f.read())
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_sql = f.read()

        mem_conn = sqlite3.connect(":memory:")
        mem_conn.executescript(schema_sql)
        mem_conn.executescript(seed_sql)
        cur = mem_conn.cursor()

        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM products").fetchone()[0], 5)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM suppliers").fetchone()[0], 6)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM materials").fetchone()[0], 9)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM bill_of_materials").fetchone()[0], 13)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM finished_goods_inventory").fetchone()[0], 5)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM customers").fetchone()[0], 6)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM users").fetchone()[0], 4)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM product_reviews").fetchone()[0], 10)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM workshops").fetchone()[0], 3)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM workers").fetchone()[0], 6)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM work_shifts").fetchone()[0], 3)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM dealer_purchase_requests").fetchone()[0], 3)
        self.assertGreaterEqual(cur.execute("SELECT COUNT(*) FROM order_returns").fetchone()[0], 1)
        mem_conn.close()


class TestVersion190WorkforceAndDistributionFlow(unittest.TestCase):
    """
    Version 1.9.0: Kiểm thử toàn diện các tác nhân thực tế:
    1. Quản đốc sản xuất: Xưởng, công nhân, ca làm việc & Tự động tạo lệnh SX bù hao hụt > 10%
    2. Quản lý phân phối & Đại lý: Yêu cầu nhập hàng 2 nhánh (Đủ hàng xuất / Thiếu hàng hẹn giao + chuyển SX)
    3. Đổi trả hàng lỗi và cấn trừ công nợ đại lý
    4. Thanh công cụ Dev Role Switcher 1-chạm
    """

    def test_workshops_and_workers_api(self):
        """Kiểm tra API lấy danh sách xưởng sản xuất, công nhân và ca làm việc"""
        import time
        from main import get_workshops, get_workers, get_work_shifts, create_worker, WorkerCreate
        ws_res = get_workshops()
        self.assertIn("data", ws_res)
        self.assertGreaterEqual(len(ws_res["data"]), 3)

        shift_res = get_work_shifts()
        self.assertIn("data", shift_res)
        self.assertGreaterEqual(len(shift_res["data"]), 3)

        workers_res = get_workers()
        self.assertIn("data", workers_res)
        self.assertGreaterEqual(len(workers_res["data"]), 6)

        # Thêm công nhân mới
        new_w = create_worker(WorkerCreate(
            worker_code=f"CN-T-{int(time.time() * 1000) % 100000}",
            full_name="Nguyễn Văn Test",
            workshop_id=1,
            skill_level="BẬC_3",
            specialty="Kiểm tra chất lượng đóng hộp",
            hourly_rate=48000,
            current_shift_id=1
        ))
        self.assertTrue(new_w["success"])

    def test_dealer_purchase_request_two_branches(self):
        """
        Kiểm tra 2 nhánh nghiệp vụ yêu cầu nhập hàng đại lý:
        - Nhánh 1: Đủ tồn kho -> Duyệt xuất kho ngay (sinh SO)
        - Nhánh 2: Thiếu tồn kho -> Hẹn ngày giao & chuyển Lệnh sản xuất PO
        """
        from main import (
            create_dealer_purchase_request,
            check_dealer_request_stock,
            approve_dealer_request_dispatch,
            request_dealer_production_handoff,
            DealerRequestCreate,
            DealerRequestProductionHandoff
        )

        # Tạo yêu cầu nhập số lượng nhỏ (chắc chắn đủ kho)
        req1 = create_dealer_purchase_request(DealerRequestCreate(
            agent_code="AGENT-001",
            product_id=1,
            quantity_requested=5,
            notes="Đại lý Tâm An đặt thêm hàng có sẵn"
        ))
        self.assertTrue(req1["success"])
        req1_id = req1["request_id"]

        # So khớp tồn kho
        chk1 = check_dealer_request_stock(req1_id)
        self.assertTrue(chk1["success"])
        self.assertTrue(chk1["is_stock_sufficient"])

        # Nhánh 1: Duyệt xuất kho
        disp_res = approve_dealer_request_dispatch(req1_id)
        self.assertTrue(disp_res["success"])
        self.assertIsNotNone(disp_res["sales_order_id"])
        self.assertIsNotNone(disp_res["dispatch_code"])

        # Tạo yêu cầu nhập số lượng cực lớn (chắc chắn thiếu kho)
        req2 = create_dealer_purchase_request(DealerRequestCreate(
            agent_code="AGENT-001",
            product_id=1,
            quantity_requested=99999,
            notes="Đại lý đặt dự án siêu lớn thiếu kho"
        ))
        self.assertTrue(req2["success"])
        req2_id = req2["request_id"]

        # So khớp tồn kho
        chk2 = check_dealer_request_stock(req2_id)
        self.assertFalse(chk2["is_stock_sufficient"])
        self.assertGreater(chk2["deficit_quantity"], 0)

        # Nhánh 2: Hẹn giao & chuyển sang PO sản xuất
        po_handoff = request_dealer_production_handoff(
            req2_id,
            DealerRequestProductionHandoff(
                promised_delivery_date="2026-12-05",
                notes="Hẹn ngày giao 2026-12-05 và lập lệnh PO sản xuất bổ sung"
            )
        )
        self.assertTrue(po_handoff["success"])
        self.assertIsNotNone(po_handoff["production_order_id"])
        self.assertIsNotNone(po_handoff["production_order_code"])

    def test_auto_reorder_defect_flow(self):
        """Kiểm tra tự động lập lệnh PO sản xuất bù khi tỷ lệ hao hụt vượt 10%"""
        from main import auto_reorder_defect, DBContext
        with DBContext() as db:
            # Tìm lệnh PO có defect_rate > 10% trong seed (PO-2026-003)
            orders = db.query("SELECT order_id FROM production_orders WHERE defect_rate > 10 LIMIT 1")
            if orders:
                oid = orders[0]["order_id"]
                res = auto_reorder_defect(oid)
                self.assertTrue(res["success"])
                self.assertGreater(res["reorder_quantity"], 0)
                self.assertTrue(res["new_order_code"].startswith("PO-"))

    def test_dev_role_switch(self):
        """Kiểm tra API chuyển đổi vai trò 1-chạm cho Giảng viên / Hội đồng"""
        from main import dev_switch_role, DevSwitchRoleRequest
        roles = ["ADMIN", "GIAM_DOC", "QUAN_LY_KHO", "QUAN_DOC_SAN_XUAT", "QUAN_LY_PHAN_PHOI", "DAI_LY"]
        for r in roles:
            res = dev_switch_role(DevSwitchRoleRequest(target_role=r))
            self.assertTrue(res["success"])
            self.assertEqual(res["user"]["role"], r)
            self.assertTrue(res["token"].startswith("token_"))


if __name__ == "__main__":
    unittest.main()

