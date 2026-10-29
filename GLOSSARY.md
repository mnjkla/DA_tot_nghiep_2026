# Hệ Thống Quản Trị Doanh Nghiệp Yến Sào & Cà Phê (ERP Domain Model)

Mô hình miền nghiệp vụ chuẩn hóa cho hệ sinh thái quản lý sản xuất, chuỗi cung ứng, kho vận và thương mại đa kênh của doanh nghiệp sản xuất Yến sào và Cà phê đặc sản.

## Production & Manufacturing

**Product**:
Thành phẩm hoàn chỉnh được sản xuất để lưu kho và phân phối ra thị trường thương mại.
_Avoid_: Finished good, item, hàng bán, SKU

**Bill of Materials (BOM)**:
Định mức kỹ thuật quy định số lượng và tỷ lệ hao hụt nguyên vật liệu cần thiết để tạo ra một đơn vị thành phẩm.
_Avoid_: Recipe, công thức sản xuất, spec sheet, định lượng

**Production Plan**:
Kế hoạch sản xuất định kỳ xác lập mục tiêu số lượng từng thành phẩm cần đạt trong một khung thời gian xác định.
_Avoid_: Master schedule, dự trù sản xuất, lịch sản xuất

**Production Order**:
Lệnh chỉ định phân xưởng thực thi việc sản xuất một số lượng thành phẩm cụ thể theo một phiên bản BOM nhất định.
_Avoid_: Job, work order, ca sản xuất, mẻ chạy

**Material Requisition**:
Chứng từ đề xuất xuất kho nguyên vật liệu tương ứng theo định mức của Lệnh sản xuất cần được Thủ kho phê duyệt.
_Avoid_: Export slip, phiếu xuất xưởng, vật tư yêu cầu, phiếu xin hàng

## Inventory & Warehouse

**Material**:
Nguyên liệu thô hoặc bao bì phụ liệu đầu vào dùng cho quá trình gia công chế biến thành phẩm.
_Avoid_: Raw material, ingredient, vật tư thô, phụ liệu

**Material Lot**:
Lô nguyên vật liệu nhập kho từ một Nhà cung cấp tại một thời điểm, có đơn giá nhập và hạn sử dụng riêng biệt.
_Avoid_: Batch, kiện hàng, lô nhập

**Finished Goods Batch**:
Lô thành phẩm hoàn thành từ một Lệnh sản xuất xác định, gắn liền với ngày sản xuất, hạn sử dụng và chi phí giá thành lô.
_Avoid_: Lot, số lô, mẻ thành phẩm, đợt hàng

**Material Receipt**:
Chứng từ ghi nhận việc tiếp nhận nguyên vật liệu từ Nhà cung cấp vào kho và ghi tăng số lượng tồn thực tế.
_Avoid_: Import voucher, phiếu nhập mua, đơn tiếp nhận

**Goods Issue**:
Phiếu xuất kho thành phẩm chuyển giao hàng hóa cho Đơn đặt hàng của khách hàng sau khi đóng gói.
_Avoid_: Delivery slip, phiếu giao hàng, hóa đơn xuất kho

## Sales & Commercial

**Customer**:
Cá nhân hoặc tổ chức tham gia giao dịch mua sỉ hoặc lẻ thành phẩm của doanh nghiệp.
_Avoid_: Client, buyer, partner, account

**Customer Tier**:
Phân loại đối tác kinh doanh (Đại lý, Khách sỉ, Khách lẻ) dùng làm căn cứ áp dụng hạn mức công nợ và chính sách giá.
_Avoid_: Segment, group, level, hạng mục

**Sales Order**:
Thỏa thuận mua bán có hiệu lực pháp lý xác nhận danh mục thành phẩm, đơn giá và số lượng xuất giao cho Khách hàng.
_Avoid_: Deal, purchase, contract, booking, phiếu đặt

**Price Policy**:
Quy tắc định giá bán thành phẩm theo từng Hạng khách hàng kết hợp với số lượng đặt hàng tối thiểu (MOQ).
_Avoid_: Discount rate, bảng giá, biểu giá, chiết khấu

**Campaign**:
Chính sách kích cầu bán hàng có thời hạn, quy định mức giảm giá trực tiếp theo mã sản phẩm hoặc toàn bộ giỏ hàng.
_Avoid_: Promotion, voucher, flash sale event, khuyến mãi

**Payment**:
Khoản tiền khách hàng thanh toán để tất toán một phần hoặc toàn bộ giá trị công nợ của Đơn đặt hàng.
_Avoid_: Settlement, remittance, cấn trừ, nộp tiền

**Product Review**:
Đánh giá chất lượng và phản hồi trải nghiệm từ khách hàng về một thành phẩm cụ thể đã tiêu dùng.
_Avoid_: Feedback, comment, testimonial, nhận xét

## Identity & Access

**User**:
Tài khoản người dùng nội bộ của cán bộ nhân viên được xác thực để vận hành các phân hệ trong hệ thống ERP.
_Avoid_: Account, member, staff, employee, nhân sự

**Role**:
Tập hợp các đặc quyền nghiệp vụ được gán cho User nhằm kiểm soát phạm vi đọc, ghi và phê duyệt dữ liệu.
_Avoid_: Permission group, authorization level, quyền hạn

## AI & Automation

**Copilot Query**:
Yêu cầu truy vấn hoặc câu hỏi bằng ngôn ngữ tự nhiên do người dùng gửi vào trợ lý ảo thông minh.
_Avoid_: Prompt, message, chat input, câu hỏi

**Live Context Snapshot**:
Bản tổng hợp dữ liệu trạng thái vận hành tức thời (tồn kho, đơn hàng, công nợ) cung cấp làm ngữ cảnh cho mô hình AI.
_Avoid_: Database dump, cache, training data, ngữ cảnh cứng

**Automation Workflow**:
Kịch bản tự động hóa xử lý sự kiện bất đồng bộ định tuyến qua hệ thống webhook n8n hoặc worker nội bộ.
_Avoid_: Cron job, script, pipeline trigger, tác vụ tự động

