import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Cố định seed để kết quả sinh ra nhất quán
random.seed(42)
np.random.seed(42)

OUTPUT_DIR = "erp_dataset_csv"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🚀 Bắt đầu sinh dữ liệu ERP Dataset (2024 - 2025)...")

# ==============================================================================
# 1. KHỞI TẠO MASTER DATA (SUPPLIERS, MATERIALS, PRODUCTS, BOM, CUSTOMERS, PRICE)
# ==============================================================================

# 1.1. Bảng suppliers
suppliers = [
    {"supplier_id": "SUP01", "supplier_name": "Công ty Yến Sào Khánh Hòa Nguồn Việt", "phone": "0905111222", "address": "Nha Trang, Khánh Hòa"},
    {"supplier_id": "SUP02", "supplier_name": "Nhà máy Đường Biên Hòa", "phone": "0903222333", "address": "Biên Hòa, Đồng Nai"},
    {"supplier_id": "SUP03", "supplier_name": "Nông trường Cà Phê Cầu Đất", "phone": "0908333444", "address": "Đà Lạt, Lâm Đồng"},
    {"supplier_id": "SUP04", "supplier_name": "Công ty Nông sản Gạo Việt", "phone": "0909444555", "address": "Cái Bè, Tiền Giang"},
    {"supplier_id": "SUP05", "supplier_name": "Nhà máy Bao Bì Thủy Tinh & Lon Sài Gòn", "phone": "0901555666", "address": "KCN Tân Bình, TP.HCM"},
]

# 1.2. Bảng materials
materials = [
    {"material_id": "NVL01", "material_name": "Tổ yến tinh chế", "unit": "Gram", "standard_unit_cost": 25000, "current_stock": 0.0, "min_stock_level": 5000, "max_stock_level": 50000, "lead_time_days": 7},
    {"material_id": "NVL02", "material_name": "Đường phèn kết tinh", "unit": "Gram", "standard_unit_cost": 35, "current_stock": 0.0, "min_stock_level": 100000, "max_stock_level": 1000000, "lead_time_days": 3},
    {"material_id": "NVL03", "material_name": "Gạo thơm sấy thăng hoa", "unit": "Gram", "standard_unit_cost": 40, "current_stock": 0.0, "min_stock_level": 50000, "max_stock_level": 500000, "lead_time_days": 4},
    {"material_id": "NVL04", "material_name": "Cà phê Arabica/Robusta rang xay", "unit": "Gram", "standard_unit_cost": 250, "current_stock": 0.0, "min_stock_level": 50000, "max_stock_level": 500000, "lead_time_days": 5},
    {"material_id": "NVL05", "material_name": "Lọ thủy tinh 70ml (kèm nắp)", "unit": "Cái", "standard_unit_cost": 2500, "current_stock": 0.0, "min_stock_level": 5000, "max_stock_level": 50000, "lead_time_days": 5},
    {"material_id": "NVL06", "material_name": "Chai thủy tinh 150ml (kèm nắp)", "unit": "Cái", "standard_unit_cost": 3200, "current_stock": 0.0, "min_stock_level": 5000, "max_stock_level": 50000, "lead_time_days": 5},
    {"material_id": "NVL07", "material_name": "Lon nhôm 250ml (kèm nắp)", "unit": "Cái", "standard_unit_cost": 1800, "current_stock": 0.0, "min_stock_level": 10000, "max_stock_level": 80000, "lead_time_days": 5},
    {"material_id": "NVL08", "material_name": "Bao bì màng nhôm Cháo yến", "unit": "Cái", "standard_unit_cost": 800, "current_stock": 0.0, "min_stock_level": 10000, "max_stock_level": 80000, "lead_time_days": 4},
    {"material_id": "NVL09", "material_name": "Túi lọc phin giấy & Hộp cà phê", "unit": "Bộ", "standard_unit_cost": 4500, "current_stock": 0.0, "min_stock_level": 5000, "max_stock_level": 40000, "lead_time_days": 4},
]
mat_dict = {m["material_id"]: m for m in materials}
mat_supplier_map = {
    "NVL01": "SUP01", "NVL02": "SUP02", "NVL03": "SUP04", "NVL04": "SUP03",
    "NVL05": "SUP05", "NVL06": "SUP05", "NVL07": "SUP05", "NVL08": "SUP05", "NVL09": "SUP05"
}

# 1.3. Bảng products (5 mặt hàng chủ lực)
products = [
    {"product_id": "SP01", "product_name": "Yến lọ", "unit": "Lọ", "packaging_spec": "Hộp 6 lọ x 70ml", "units_per_package": 6, "estimated_cost": 21000, "base_selling_price": 38000, "current_stock": 0, "min_stock_level": 2000, "max_stock_level": 25000, "lead_time_days": 2, "business_status": "ACTIVE"},
    {"product_id": "SP02", "product_name": "Yến chai", "unit": "Chai", "packaging_spec": "Lốc 6 chai x 150ml", "units_per_package": 6, "estimated_cost": 26500, "base_selling_price": 45000, "current_stock": 0, "min_stock_level": 2000, "max_stock_level": 25000, "lead_time_days": 2, "business_status": "ACTIVE"},
    {"product_id": "SP03", "product_name": "Yến lon", "unit": "Lon", "packaging_spec": "Thùng 24 lon x 250ml", "units_per_package": 24, "estimated_cost": 10000, "base_selling_price": 18000, "current_stock": 0, "min_stock_level": 5000, "max_stock_level": 50000, "lead_time_days": 2, "business_status": "ACTIVE"},
    {"product_id": "SP04", "product_name": "Cháo yến", "unit": "Gói", "packaging_spec": "Thùng 30 gói x 50g", "units_per_package": 30, "estimated_cost": 9500, "base_selling_price": 16000, "current_stock": 0, "min_stock_level": 3000, "max_stock_level": 35000, "lead_time_days": 3, "business_status": "ACTIVE"},
    {"product_id": "SP05", "product_name": "Cà phê phin giấy", "unit": "Hộp", "packaging_spec": "Hộp 10 phin x 15g", "units_per_package": 1, "estimated_cost": 42000, "base_selling_price": 75000, "current_stock": 0, "min_stock_level": 1500, "max_stock_level": 15000, "lead_time_days": 3, "business_status": "ACTIVE"},
]
prod_dict = {p["product_id"]: p for p in products}

# 1.4. Bảng bom (Định mức sản xuất)
bom_raw = [
    ("SP01", "NVL01", 0.7, 2.0), ("SP01", "NVL02", 8.0, 1.0), ("SP01", "NVL05", 1.0, 1.5),
    ("SP02", "NVL01", 0.9, 2.0), ("SP02", "NVL02", 12.0, 1.0), ("SP02", "NVL06", 1.0, 1.5),
    ("SP03", "NVL01", 0.3, 1.5), ("SP03", "NVL02", 15.0, 1.0), ("SP03", "NVL07", 1.0, 1.0),
    ("SP04", "NVL01", 0.25, 2.0), ("SP04", "NVL03", 45.0, 1.5), ("SP04", "NVL08", 1.0, 1.0),
    ("SP05", "NVL04", 150.0, 2.0), ("SP05", "NVL09", 1.0, 1.0),
]
bom = []
for idx, (pid, mid, qty, scrap) in enumerate(bom_raw, 1):
    bom.append({
        "bom_id": idx, "product_id": pid, "material_id": mid, "version": "v1.0",
        "quantity_per_unit": qty, "scrap_rate": scrap, "is_active": True,
        "updated_at": "2024-01-01 08:00:00"
    })

# 1.5. Bảng price_policies (Chính sách giá theo nhóm KH)
price_policies = []
pol_id = 1
discount_multipliers = {
    "RETAIL": (1, 1.0),
    "AGENCY": (50, 0.90),
    "CORPORATE": (100, 0.88),
    "DISTRIBUTOR": (300, 0.82)
}
for p in products:
    for c_type, (min_q, mult) in discount_multipliers.items():
        price_policies.append({
            "policy_id": pol_id,
            "product_id": p["product_id"],
            "customer_type": c_type,
            "min_quantity": min_q,
            "custom_price": round(p["base_selling_price"] * mult, -2),
            "effective_date": "2024-01-01"
        })
        pol_id += 1

# 1.6. Bảng customers (120 Khách hàng thuộc 4 phân khúc)
customers = []
provinces = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Hải Phòng", "Khánh Hòa"]
cust_types = [("RETAIL", 60), ("AGENCY", 30), ("DISTRIBUTOR", 15), ("CORPORATE", 15)]
c_idx = 1
for c_type, count in cust_types:
    for _ in range(count):
        cid = f"KH{c_idx:03d}"
        prefix = {"RETAIL": "Khách lẻ", "AGENCY": "Đại lý Yến & Cà phê", "DISTRIBUTOR": "Nhà phân phối", "CORPORATE": "Công ty TNHH"}[c_type]
        customers.append({
            "customer_id": cid,
            "customer_name": f"{prefix} Minh Bảo {c_idx}",
            "customer_type": c_type,
            "phone": f"09{random.randint(10000000, 99999999)}",
            "address": f"Số {random.randint(1, 500)}, {random.choice(provinces)}",
            "total_debt": 0.0
        })
        c_idx += 1
cust_dict = {c["customer_id"]: c for c in customers}

# ==============================================================================
# 2. MÔ PHỎNG VẬN HÀNH THEO THỜI GIAN THỰC (2024 - 2025)
# ==============================================================================

material_lots = []
material_transactions = []
production_plans = []
production_plan_details = []
production_orders = []
finished_goods_batches = []
finished_goods_transactions = []
sales_orders = []
sales_order_details = []
goods_issues = []
goods_issue_details = []
payments = []
returns = []

# Bộ đếm ID tự tăng
mat_lot_counter = 1
mat_trans_counter = 1
plan_detail_counter = 1
prod_order_counter = 1
fg_batch_counter = 1
fg_trans_counter = 1
so_counter = 1
so_detail_counter = 1
gi_counter = 1
gi_detail_counter = 1
pay_counter = 1
ret_counter = 1

# Hàm nhập kho nguyên vật liệu
def import_material(mid, import_date_obj, qty):
    global mat_lot_counter, mat_trans_counter
    lot_id = f"MLOT-{import_date_obj.strftime('%Y%m')}-{mat_lot_counter:04d}"
    mat_lot_counter += 1
    
    # Bao bì không có hạn sử dụng, thực phẩm có hạn 1 năm
    is_packaging = mid in ["NVL05", "NVL06", "NVL07", "NVL08", "NVL09"]
    exp_date = None if is_packaging else (import_date_obj + timedelta(days=365)).strftime("%Y-%m-%d")
    
    unit_cost = round(mat_dict[mid]["standard_unit_cost"] * random.uniform(0.96, 1.04), 2)
    lot = {
        "mat_lot_id": lot_id,
        "material_id": mid,
        "supplier_id": mat_supplier_map[mid],
        "import_date": import_date_obj.strftime("%Y-%m-%d"),
        "expiry_date": exp_date,
        "import_unit_cost": unit_cost,
        "initial_qty": round(qty, 2),
        "current_qty": round(qty, 2)
    }
    material_lots.append(lot)
    mat_dict[mid]["current_stock"] = round(mat_dict[mid]["current_stock"] + qty, 2)
    
    material_transactions.append({
        "mat_trans_id": mat_trans_counter,
        "mat_lot_id": lot_id,
        "prod_order_id": None,
        "trans_type": "IMPORT",
        "quantity": round(qty, 2),
        "trans_date": import_date_obj.strftime("%Y-%m-%d 08:30:00"),
        "notes": "Nhập kho nguyên vật liệu từ nhà cung cấp"
    })
    mat_trans_counter += 1

# 2.1. Khởi tạo Tồn kho đầu kỳ (01/01/2024)
start_sim_date = datetime(2024, 1, 1)
for m in materials:
    import_material(m["material_id"], start_sim_date, m["max_stock_level"] * 0.8)

for p in products:
    pid = p["product_id"]
    init_qty = p["min_stock_level"] * 3
    b_id = f"BATCH-OPEN-{fg_batch_counter:04d}"
    fg_batch_counter += 1
    finished_goods_batches.append({
        "batch_id": b_id,
        "product_id": pid,
        "prod_order_id": None, # Tồn kho đầu kỳ không có lệnh sản xuất
        "mfg_date": "2023-12-20",
        "exp_date": "2024-12-20",
        "initial_qty": init_qty,
        "current_qty": init_qty
    })
    p["current_stock"] += init_qty
    finished_goods_transactions.append({
        "fg_trans_id": fg_trans_counter,
        "batch_id": b_id,
        "trans_type": "OPENING_STOCK",
        "reference_id": None,
        "quantity": init_qty,
        "trans_date": "2024-01-01 08:00:00",
        "notes": "Nhập tồn kho thành phẩm đầu kỳ"
    })
    fg_trans_counter += 1

# 2.2. Vòng lặp mô phỏng từng ngày trong 2 năm (2024 - 2025)
total_days = (datetime(2025, 12, 31) - start_sim_date).days + 1
current_plan_details_map = {}

for day_offset in range(total_days):
    cur_date = start_sim_date + timedelta(days=day_offset)
    date_str = cur_date.strftime("%Y-%m-%d")
    month = cur_date.month
    
    # Hệ số mùa vụ: Tháng 1, 2, 12 (Cận Tết) nhu cầu Yến tăng gấp 2.5 - 3 lần
    is_tet_season = month in [1, 2, 12]
    
    # --- A. ĐẦU THÁNG: TẠO KẾ HOẠCH SẢN XUẤT THÁNG ---
    if cur_date.day == 1:
        plan_id = f"PLAN-{cur_date.strftime('%Y%m')}"
        last_day_of_month = (cur_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        production_plans.append({
            "plan_id": plan_id,
            "plan_name": f"Kế hoạch sản xuất Tháng {cur_date.strftime('%m/%Y')}",
            "period_type": "MONTHLY",
            "start_date": date_str,
            "end_date": last_day_of_month.strftime("%Y-%m-%d"),
            "plan_status": "COMPLETED"
        })
        current_plan_details_map = {}
        for p in products:
            pid = p["product_id"]
            base_plan = {"SP01": 18000, "SP02": 15000, "SP03": 35000, "SP04": 22000, "SP05": 10000}[pid]
            if is_tet_season and pid in ["SP01", "SP02", "SP03"]:
                planned_q = int(base_plan * 2.6)
            else:
                planned_q = base_plan
            
            p_detail = {
                "plan_detail_id": plan_detail_counter,
                "plan_id": plan_id,
                "product_id": pid,
                "planned_qty": planned_q,
                "completed_qty": 0
            }
            production_plan_details.append(p_detail)
            current_plan_details_map[pid] = p_detail
            plan_detail_counter += 1

    # --- B. KIỂM TRA & NHẬP BỔ SUNG NGUYÊN VẬT LIỆU ---
    for m in materials:
        if m["current_stock"] <= m["min_stock_level"] * 2.5:
            import_material(m["material_id"], cur_date, m["max_stock_level"] * 0.7)

    # --- C. CHẠY LỆNH SẢN XUẤT (KHI TỒN KHO THẤP HOẶC ĐỊNH KỲ) ---
    for p in products:
        pid = p["product_id"]
        trigger_stock = p["min_stock_level"] * (4 if (is_tet_season and pid in ["SP01", "SP02", "SP03"]) else 2.2)
        
        if p["current_stock"] < trigger_stock or random.random() < 0.18:
            po_id = f"PO-{cur_date.strftime('%Y%m%d')}-{prod_order_counter:04d}"
            prod_order_counter += 1
            
            expected_q = random.choice([1500, 2000, 3000, 4000, 5000])
            if is_tet_season and pid in ["SP01", "SP02", "SP03"]:
                expected_q = int(expected_q * 1.5)
                
            defect_q = int(expected_q * random.uniform(0.005, 0.025))
            completed_q = expected_q - defect_q
            
            # Xuất nguyên vật liệu theo BOM (FEFO)
            total_mat_cost = 0.0
            prod_boms = [b for b in bom if b["product_id"] == pid]
            for b_item in prod_boms:
                mid = b_item["material_id"]
                req_qty = round(expected_q * b_item["quantity_per_unit"] * (1 + b_item["scrap_rate"] / 100.0), 2)
                
                # Đảm bảo đủ NVL trước khi trừ
                if mat_dict[mid]["current_stock"] < req_qty:
                    import_material(mid, cur_date, max(req_qty * 2, mat_dict[mid]["max_stock_level"] * 0.6))
                
                rem_to_issue = req_qty
                avail_lots = [l for l in material_lots if l["material_id"] == mid and l["current_qty"] > 0]
                for lot in avail_lots:
                    if rem_to_issue <= 0:
                        break
                    take_q = round(min(lot["current_qty"], rem_to_issue), 2)
                    if take_q > 0:
                        lot["current_qty"] = round(lot["current_qty"] - take_q, 2)
                        mat_dict[mid]["current_stock"] = round(mat_dict[mid]["current_stock"] - take_q, 2)
                        rem_to_issue = round(rem_to_issue - take_q, 2)
                        total_mat_cost += take_q * lot["import_unit_cost"]
                        
                        material_transactions.append({
                            "mat_trans_id": mat_trans_counter,
                            "mat_lot_id": lot["mat_lot_id"],
                            "prod_order_id": po_id,
                            "trans_type": "PRODUCTION_ISSUE",
                            "quantity": -take_q,
                            "trans_date": f"{date_str} 09:00:00",
                            "notes": f"Xuất NVL cho lệnh sản xuất {po_id}"
                        })
                        mat_trans_counter += 1
            
            # 10% lệnh sản xuất là đột xuất (plan_detail_id = None)
            plan_det_id = None if random.random() < 0.1 else current_plan_details_map[pid]["plan_detail_id"]
            if plan_det_id is not None:
                current_plan_details_map[pid]["completed_qty"] += completed_q
                
            production_orders.append({
                "prod_order_id": po_id,
                "plan_detail_id": plan_det_id,
                "product_id": pid,
                "bom_version": "v1.0",
                "start_time": f"{date_str} 08:00:00",
                "end_time": f"{date_str} 16:30:00",
                "expected_qty": expected_q,
                "completed_qty": completed_q,
                "defect_qty": defect_q,
                "production_cost": round(total_mat_cost * 1.15, 2), # Cộng 15% nhân công & điện nước
                "status": "COMPLETED"
            })
            
            # Nhập kho lô thành phẩm
            batch_id = f"FG-{cur_date.strftime('%Y%m%d')}-{fg_batch_counter:04d}"
            fg_batch_counter += 1
            exp_days = 365 if pid in ["SP01", "SP02", "SP03", "SP05"] else 270
            finished_goods_batches.append({
                "batch_id": batch_id,
                "product_id": pid,
                "prod_order_id": po_id,
                "mfg_date": date_str,
                "exp_date": (cur_date + timedelta(days=exp_days)).strftime("%Y-%m-%d"),
                "initial_qty": completed_q,
                "current_qty": completed_q
            })
            p["current_stock"] += completed_q
            
            finished_goods_transactions.append({
                "fg_trans_id": fg_trans_counter,
                "batch_id": batch_id,
                "trans_type": "PROD_RECEIPT",
                "reference_id": po_id,
                "quantity": completed_q,
                "trans_date": f"{date_str} 17:00:00",
                "notes": "Nhập kho thành phẩm từ lệnh sản xuất"
            })
            fg_trans_counter += 1

    # --- D. PHÁT SINH ĐƠN ĐẶT HÀNG & XUẤT KHO BÁN HÀNG (FEFO) ---
    num_orders_today = random.randint(10, 18) if is_tet_season else random.randint(5, 10)
    
    for _ in range(num_orders_today):
        cust = random.choice(customers)
        cid = cust["customer_id"]
        c_type = cust["customer_type"]
        
        so_id = f"SO-{cur_date.strftime('%Y%m%d')}-{so_counter:05d}"
        so_counter += 1
        
        # Trọng số chọn sản phẩm: Mùa Tết ưu tiên đặt Yến lọ, Yến chai, Yến lon
        weights = [0.32, 0.28, 0.25, 0.08, 0.07] if is_tet_season else [0.18, 0.18, 0.22, 0.22, 0.20]
        num_items = random.randint(1, 3)
        chosen_prods = np.random.choice(["SP01", "SP02", "SP03", "SP04", "SP05"], size=num_items, replace=False, p=weights)
        
        order_total = 0.0
        order_details_temp = []
        
        for pid in chosen_prods:
            avail_stock = prod_dict[pid]["current_stock"]
            if avail_stock < 20:
                continue
                
            # Số lượng mua tùy theo phân khúc khách hàng
            qty_range = {
                "RETAIL": (6, 36),
                "AGENCY": (60, 240),
                "CORPORATE": (100, 350),
                "DISTRIBUTOR": (300, 800)
            }[c_type]
            order_qty = min(random.randint(*qty_range), avail_stock)
            if order_qty <= 0:
                continue
                
            # Lấy giá theo chính sách
            unit_p = prod_dict[pid]["base_selling_price"]
            for pol in price_policies:
                if pol["product_id"] == pid and pol["customer_type"] == c_type and order_qty >= pol["min_quantity"]:
                    unit_p = pol["custom_price"]
                    
            disc = round(order_qty * unit_p * (0.03 if order_qty >= 500 else 0.0), 2)
            line_tot = round(order_qty * unit_p - disc, 2)
            order_total += line_tot
            
            det_obj = {
                "order_detail_id": so_detail_counter,
                "sales_order_id": so_id,
                "product_id": pid,
                "quantity": order_qty,
                "unit_price": unit_p,
                "discount": disc,
                "line_total": line_tot
            }
            sales_order_details.append(det_obj)
            order_details_temp.append(det_obj)
            so_detail_counter += 1
            
        if not order_details_temp:
            continue
            
        # Trạng thái thanh toán & Công nợ
        pay_rand = random.random()
        if c_type == "RETAIL" or pay_rand < 0.78:
            pay_status = "PAID"
            paid_amt = order_total
        elif pay_rand < 0.92:
            pay_status = "PARTIAL"
            paid_amt = round(order_total * 0.5, 2)
        else:
            pay_status = "UNPAID"
            paid_amt = 0.0
            
        sales_orders.append({
            "sales_order_id": so_id,
            "customer_id": cid,
            "order_date": f"{date_str} {random.randint(8, 16):02d}:{random.randint(10, 59):02d}:00",
            "total_amount": order_total,
            "paid_amount": paid_amt,
            "payment_status": pay_status,
            "order_status": "COMPLETED"
        })
        
        # Ghi nhận thanh toán
        if paid_amt > 0:
            payments.append({
                "payment_id": f"PAY-{pay_counter:05d}",
                "sales_order_id": so_id,
                "payment_date": f"{date_str} 17:30:00",
                "amount": paid_amt,
                "payment_method": "CASH" if c_type == "RETAIL" else "BANK_TRANSFER"
            })
            pay_counter += 1
            
        # Xuất kho theo lô (FEFO)
        issue_id = f"GI-{cur_date.strftime('%Y%m%d')}-{gi_counter:05d}"
        gi_counter += 1
        goods_issues.append({
            "issue_id": issue_id,
            "sales_order_id": so_id,
            "issue_date": f"{date_str} 18:00:00",
            "notes": f"Xuất kho giao hàng cho đơn {so_id}"
        })
        
        for det in order_details_temp:
            pid = det["product_id"]
            rem_issue = det["quantity"]
            # Sắp xếp lô theo hạn sử dụng gần nhất (FEFO)
            fg_lots = [b for b in finished_goods_batches if b["product_id"] == pid and b["current_qty"] > 0]
            fg_lots.sort(key=lambda x: x["exp_date"])
            
            for fg_lot in fg_lots:
                if rem_issue <= 0:
                    break
                take_fg = min(fg_lot["current_qty"], rem_issue)
                if take_fg > 0:
                    fg_lot["current_qty"] -= take_fg
                    prod_dict[pid]["current_stock"] -= take_fg
                    rem_issue -= take_fg
                    
                    cur_gi_det_id = gi_detail_counter
                    goods_issue_details.append({
                        "issue_detail_id": cur_gi_det_id,
                        "issue_id": issue_id,
                        "order_detail_id": det["order_detail_id"],
                        "batch_id": fg_lot["batch_id"],
                        "issued_qty": take_fg
                    })
                    gi_detail_counter += 1
                    
                    finished_goods_transactions.append({
                        "fg_trans_id": fg_trans_counter,
                        "batch_id": fg_lot["batch_id"],
                        "trans_type": "SALES_ISSUE",
                        "reference_id": issue_id,
                        "quantity": -take_fg,
                        "trans_date": f"{date_str} 18:05:00",
                        "notes": f"Xuất bán theo đơn {so_id}"
                    })
                    fg_trans_counter += 1
                    
                    # Xác suất 1.5% phát sinh đổi trả hàng
                    if random.random() < 0.015 and take_fg >= 10:
                        ret_id = f"RET-{ret_counter:04d}"
                        ret_counter += 1
                        ret_q = max(2, int(take_fg * 0.1))
                        damaged_q = int(ret_q * 0.4)
                        restocked_q = ret_q - damaged_q
                        refund_amt = round(ret_q * det["unit_price"], 2)
                        
                        returns.append({
                            "return_id": ret_id,
                            "issue_detail_id": cur_gi_det_id,
                            "return_date": (cur_date + timedelta(days=2)).strftime("%Y-%m-%d 10:00:00"),
                            "return_qty": ret_q,
                            "restocked_qty": restocked_q,
                            "damaged_qty": damaged_q,
                            "reason": "Móp hộp/vỡ lọ trong quá trình vận chuyển",
                            "refund_amount": refund_amt
                        })
                        
                        if restocked_q > 0:
                            fg_lot["current_qty"] += restocked_q
                            prod_dict[pid]["current_stock"] += restocked_q
                            finished_goods_transactions.append({
                                "fg_trans_id": fg_trans_counter,
                                "batch_id": fg_lot["batch_id"],
                                "trans_type": "RETURN_RESTOCK",
                                "reference_id": ret_id,
                                "quantity": restocked_q,
                                "trans_date": (cur_date + timedelta(days=2)).strftime("%Y-%m-%d 10:30:00"),
                                "notes": "Nhập lại hàng trả còn nguyên vẹn"
                            })
                            fg_trans_counter += 1

# Đồng bộ lại tổng công nợ (total_debt) cho từng khách hàng
for so in sales_orders:
    debt = round(so["total_amount"] - so["paid_amount"], 2)
    if debt > 0:
        cust_dict[so["customer_id"]]["total_debt"] = round(cust_dict[so["customer_id"]]["total_debt"] + debt, 2)

# ==============================================================================
# 3. XUẤT TOÀN BỘ 19 BẢNG RA FILE CSV
# ==============================================================================

tables_to_export = {
    "suppliers": suppliers,
    "materials": materials,
    "material_lots": material_lots,
    "bom": bom,
    "production_plans": production_plans,
    "production_plan_details": production_plan_details,
    "production_orders": production_orders,
    "material_transactions": material_transactions,
    "products": products,
    "finished_goods_batches": finished_goods_batches,
    "finished_goods_transactions": finished_goods_transactions,
    "customers": customers,
    "price_policies": price_policies,
    "sales_orders": sales_orders,
    "sales_order_details": sales_order_details,
    "goods_issues": goods_issues,
    "goods_issue_details": goods_issue_details,
    "payments": payments,
    "returns": returns
}

print("\n📊 KẾT QUẢ SINH DỮ LIỆU (19 BẢNG):")
for table_name, data_list in tables_to_export.items():
    df = pd.DataFrame(data_list)
    file_path = os.path.join(OUTPUT_DIR, f"{table_name}.csv")
    df.to_csv(file_path, index=False, encoding="utf-8-sig")
    print(f"  ✅ {table_name:<30}: {len(df):>7,} dòng -> {file_path}")

print(f"\n🎉 Hoàn tất! Toàn bộ 19 file CSV đã được lưu trong thư mục '{OUTPUT_DIR}/'.")