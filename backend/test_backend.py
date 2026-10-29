import unittest
import os
import sys

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
            ("admin", "admin123", "ADMIN"),
            ("kho", "kho123", "WAREHOUSE_MANAGER"),
            ("sanxuat", "sanxuat123", "PRODUCTION_STAFF"),
            ("thumua", "thumua123", "PROCUREMENT"),
        ]
        for username, pwd, expected_role in roles_expected:
            res = auth_login(LoginRequest(username=username, password=pwd))
            self.assertTrue(res["success"])
            self.assertEqual(res["user"]["role"], expected_role)
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
        self.assertEqual(yen_after, yen_before + 500.0)

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


if __name__ == "__main__":
    unittest.main()

