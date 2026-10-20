import unittest
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from main import DBContext, get_products, get_bom, get_materials, get_dashboard_stats

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
        # Kiểm tra sự xuất hiện của các dòng sản phẩm cốt lõi
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
        # Yến lọ phải có thành phần tổ yến
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

if __name__ == "__main__":
    unittest.main()
