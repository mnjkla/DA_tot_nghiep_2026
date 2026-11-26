# KỊCH BẢN BÁO CÁO TIẾN ĐỘ ĐỒ ÁN TỐT NGHIỆP (LIVE DEMO & THUYẾT MINH)

> **Đề tài:** Hệ Thống Quản Trị Doanh Nghiệp Sản Xuất & Kinh Doanh Vừa & Nhỏ (SMB) Tích Hợp Trí Tuệ Nhân Tạo (Hybrid RAG, Gemini 1.5 Flash, Text-to-SQL, n8n Automation & BI)  
> **Mô hình doanh nghiệp:** Sản xuất và thương mại đa kênh **05 mặt hàng Yến sào & Cà phê đặc sản**.  
> **Sinh viên thực hiện:**  
> - **Trần Quốc Bảo** (MSSV: ....................)  
> - **Nguyễn Hồ Quang Minh** (MSSV: ....................)  
> **Giảng viên hướng dẫn:** ....................................................  
> **Thời lượng đề xuất:** 7 – 10 phút (kèm demo trực tiếp).

---

## 🧭 CẤU TRÚC PHẦN BÁO CÁO (TIMELINE)

```
[00:00 - 01:30] Mở đầu: Báo cáo tỷ lệ hoàn thành (95%) & Điểm nhấn công nghệ
[01:30 - 04:00] Live Demo Cổng Khách Hàng (Storefront B2B/B2C & AI Shoppable Chatbot)
[04:00 - 07:00] Live Demo Phân Hệ Quản Trị ERP Nội Bộ (RBAC, BOM, Xuất NVL 2 Bước, BI)
[07:00 - 08:30] Live Demo Trợ Lý AI Vận Hành ERP (Hybrid RAG Gemini 1.5 Flash & Grounding)
[08:30 - 10:00] Kế hoạch hoàn tất & Lắng nghe góp ý của Giảng viên hướng dẫn
```

---

## 🎙️ LỜI THOẠI & THAO TÁC CHI TIẾT TỪNG PHẦN

### PHẦN 1: MỞ ĐẦU & TỔNG QUAN TIẾN ĐỘ (1.5 PHÚT)

**Lời thoại sinh viên:**
> *"Kính chào Thầy/Cô! Hôm nay nhóm chúng em xin phép được báo cáo tiến độ định kỳ của Đồ án Tốt nghiệp với đề tài: **Xây dựng Hệ thống Quản trị Kinh doanh & Sản xuất Doanh nghiệp Vừa & Nhỏ tích hợp AI**.*
>
> *Tính đến thời điểm hiện tại, nhóm em đã hoàn thành **khoảng 95% khối lượng công việc** của đồ án, bao gồm:*
> 1. *Xây dựng Cơ sở dữ liệu chuẩn hóa **24 bảng nghiệp vụ** với cơ chế CSDL Kép: PostgreSQL 15 cho sản xuất và SQLite WAL cho tính linh hoạt.*
> 2. *Hoàn thiện hệ sinh thái đa kênh: Từ **Cổng bán hàng Storefront B2B/B2C** đến **Phân hệ Quản trị sản xuất & kho vận ERP nội bộ**.*
> 3. *Tích hợp Trợ lý Trí tuệ Nhân tạo thông minh theo kiến trúc **Hybrid RAG kết hợp Google Gemini 1.5 Flash** và bộ phân tích ngữ nghĩa CSDL thời gian thực.*
> 4. *Kết nối luồng tự động hóa bất đồng bộ với **n8n Webhook** và hệ thống chuông cảnh báo vận hành.*
>
> *Sau đây, em xin phép được chia sẻ màn hình để Thầy/Cô cùng trải nghiệm trực tiếp hệ thống thực tế đang chạy ạ."*

---

### PHẦN 2: DEMO CỔNG BÁN HÀNG THƯƠNG MẠI & AI CHATBOT (2.5 PHÚT)

**Thao tác:** Mở trình duyệt tại đường dẫn `http://localhost:8000/store` (hoặc link Tunnel).

**Lời thoại sinh viên:**
> *"Đầu tiên là **Cổng Thương Mại Điện Tử Đa Kênh (Storefront)** dành cho khách mua lẻ và đại lý B2B:*
>
> - *Hệ thống hiển thị **05 dòng sản phẩm chủ lực**: Yến lọ 70ml, Yến chai 150ml, Nước yến lon 190ml, Cháo yến sấy 50g và Cà phê phin giấy Cầu Đất.*
> - *Hệ thống có tính năng **Cá nhân hóa theo vùng miền**: Khi khách ở Miền Bắc, hệ thống tự động ưu tiên đẩy Cháo yến và Yến lọ mùa đông lên đầu; khi chọn Miền Trung/Nam, các sản phẩm giải khát thanh nhiệt sẽ được đề xuất tối ưu.*
> - *Mỗi sản phẩm đều có **Trang Chi Tiết chuẩn E-commerce**: gồm địa chỉ nhà máy sản xuất tại Nha Trang/Cầu Đất, định mức nguyên liệu tiêu chuẩn, công dụng sức khỏe và đánh giá thực tế từ người mua hàng.*
>
> *Đặc biệt, hệ thống tích hợp **Shoppable AI Sales Chatbot** ở góc phải màn hình:*
> *(Thao tác: Bấm vào icon Chatbot, gõ câu hỏi: 'Tư vấn cho tôi yến lọ và cà phê')*
> - *Chatbot không chỉ trả lời văn bản thông thường, mà tự động sinh ra **Thẻ Sản Phẩm Tương Tác**.*
> *(Thao tác: Bấm nút '⚡ Mua ngay' trực tiếp trên thẻ của bot)*
> - *Giao diện giỏ hàng lập tức mở ra, khách hàng chỉ cần điền thông tin và chọn thanh toán.*
> *(Thao tác: Chọn thanh toán VietQR và bấm Xác Nhận Đặt Hàng)*
> - *Hệ thống tự động sinh **Mã VietQR Napas247 động** chuẩn ngân hàng kèm số tiền và mã đơn hàng `SO-STORE-...` để khách quét mã thanh toán tức thì."*

---

### PHẦN 3: DEMO PHÂN HỆ QUẢN TRỊ NỘI BỘ ERP & RBAC (3 PHÚT)

**Thao tác:** Chuyển sang trang Đăng nhập quản trị `http://localhost:8000/login`.

**Lời thoại sinh viên:**
> *"Tiếp theo là **Hệ Thống Quản Trị Vận Hành Cốt Lõi ERP** dành cho cán bộ công nhân viên:*
>
> - *Hệ thống triển khai phân quyền đa cấp **RBAC 4 vai trò rõ rệt**: Giám Đốc (`admin`), Trưởng Kho (`kho`), Quản Đốc Sản Xuất (`sanxuat`), và Thu Mua (`thumua`).*
> *(Thao tác: Đăng nhập tài khoản `admin / admin123`)*
>
> *1. **Dashboard Tổng Quan (BI & Báo Cáo):** Hiển thị doanh thu lũy kế, tồn kho thành phẩm, nguyên vật liệu thực tế, biểu đồ phân tích và module AI dự báo biến động lợi nhuận 12 tháng.*
>
> *2. **Quy Trình Quản Lý Sản Xuất & BOM:** Nhóm em đã giải quyết triệt để bài toán thất thoát vật tư bằng **Quy trình Lĩnh Vật Tư 2 Bước**:*
> *(Thao tác: Vào mục Sản Xuất)*
> - *Khi Quản đốc tạo Lệnh sản xuất (Production Order), hệ thống dựa trên định mức BOM kỹ thuật để tính chính xác lượng yến khô, đường phèn, bao bì cần dùng và lập Phiếu yêu cầu ở trạng thái Chờ Duyệt (`PENDING_APPROVAL`).*
> - *Chỉ khi Trưởng kho đăng nhập và bấm **Phê Duyệt**, số lượng nguyên vật liệu trong kho mới chính thức bị trừ, ngăn chặn hoàn toàn việc sai lệch giữa số liệu phần mềm và kho thực tế.*
>
> *3. **Quản Lý Bán Hàng & Công Nợ:** Hỗ trợ chính sách giá sỉ theo MOQ thùng và chính sách đại lý B2B cấp hạn mức công nợ gối đầu 30 ngày kèm chức năng xuất hóa đơn/phiếu xuất kho chuẩn ERP."*

---

### PHẦN 4: DEMO TRỢ LÝ AI COPILOT NỘI BỘ (HYBRID RAG GEMINI) (1.5 PHÚT)

**Thao tác:** Bấm vào biểu tượng **"✨ AI Copilot"** ở góc màn hình ERP.

**Lời thoại sinh viên:**
> *"Đây là một trong những điểm sáng công nghệ nổi bật nhất của đồ án: **Trợ Lý Trí Tuệ Nhân Tạo Vận Hành ERP**.*
>
> *Thay vì sử dụng các chatbot thông thường dễ bị sinh ảo giác (hallucination), hệ thống của nhóm em hoạt động theo kiến trúc **Hybrid RAG (Retrieval-Augmented Generation)**:*
> *(Thao tác: Bấm chip câu hỏi gợi ý hoặc gõ: 'trong kho có gì')*
> - *Mỗi khi người dùng đặt câu hỏi, hệ thống sẽ thực hiện trích xuất dữ liệu CSDL thời gian thực (Live Context Snapshot) gồm tồn kho từng mã hàng, nguyên liệu và doanh thu để nạp vào prompt cho **Google Gemini 1.5 Flash**.*
> - *Dưới mỗi câu trả lời luôn có **Huy hiệu Minh chứng Nguồn Gốc (Data Grounding)** chỉ rõ dữ liệu được lấy từ bảng `finished_goods_inventory` hay `materials`.*
> - *Đặc biệt, nếu hệ thống bị mất mạng internet hoặc chưa có API Key, bộ giải mã ngữ nghĩa nội bộ (**Semantic Fallback Engine**) sẽ tự động tiếp quản, đảm bảo hệ thống luôn phản hồi chính xác 100% số liệu kho mà không bao giờ bị gián đoạn hoạt động."*

---

### PHẦN 5: TỰ ĐỘNG HÓA N8N & KẾT THÚC BÁO CÁO (1.5 PHÚT)

**Thao tác:** Mở biểu tượng **Chuông Thông Báo** hoặc Modal Tự Động Hóa n8n trên thanh Header.

**Lời thoại sinh viên:**
> *"Cuối cùng là tầng **Tự động hóa luồng dữ liệu n8n**:*
> - *Hệ thống thiết lập 3 luồng workflow chính thức: Đồng bộ dữ liệu sang Data Warehouse Star Schema, Middleware gọi hàm AI Tool Calling, và Bộ phát cảnh báo tự động khi nguyên liệu xuống dưới ngưỡng an toàn.*
> - *Mọi phản hồi từ Webhook đều được lưu vết chi tiết (thời gian phản hồi mili-giây) vào bảng kiểm toán nội bộ.*
>
> *Dạ thưa Thầy/Cô, hệ thống hiện đã vượt qua toàn bộ **30 bài Unit Tests Backend** và **14 bài Component Tests Frontend**, sẵn sàng vận hành ổn định.*
>
> *Nhóm em đã chuẩn bị sẵn tài liệu thiết kế CSDL, hồ sơ quyết định kiến trúc ADR và kế hoạch hoàn thiện các báo cáo văn bản cuối cùng.*
>
> *Nhóm em rất mong nhận được những nhận xét, góp ý quý báu từ Thầy/Cô để đồ án được hoàn thiện tốt nhất ạ. Nhóm em xin chân thành cảm ơn Thầy/Cô!"*

---

## ❓ CÁC CÂU HỎI THƯỜNG GẶP (FAQ) & CÁCH TRẢ LỜI TỰ TIN

| Câu hỏi của Giảng viên | Cách trả lời trọng tâm & chuyên nghiệp |
| :--- | :--- |
| **"Tại sao nhóm lại dùng cả SQLite và PostgreSQL (Hybrid DB)?"** | *"Dạ thưa Thầy/Cô, PostgreSQL là CSDL chính thức chuẩn doanh nghiệp khi chạy môi trường Docker/Production. Tuy nhiên, nhóm em cấu hình song song SQLite chế độ WAL để tăng tính linh động (portable): các thành viên nhóm có thể kiểm thử nhanh hoặc trình diễn máy tính cá nhân 1-click mà không sợ bị nghẽn do cấu hình mạng hay chưa bật Docker service."* |
| **"Chatbot của nhóm có bị ảo giác trả lời sai số tồn kho không?"** | *"Dạ hoàn toàn không ạ. Hệ thống sử dụng kỹ thuật RAG Grounding: câu hỏi của người dùng được gắn kèm snapshot dữ liệu thật từ câu lệnh SQL ngay tại mili-giây đó. AI không tự bịa ra số lượng mà buộc phải trích xuất chính xác từ bảng CSDL được cung cấp kèm theo."* |
| **"Nếu mất kết nối internet thì chatbot có chạy được không?"** | *"Dạ có ạ. Nhóm đã xây dựng bộ Semantic NLP Fallback nội bộ bằng Python regex & token matching, nhận diện hàng chục biến thể ngôn ngữ tiếng Việt đời thường để truy vấn trực tiếp CSDL và trả về bảng số liệu chi tiết mà không cần gọi ra server Google."* |
| **"Nhóm giải quyết vấn đề hao hụt nguyên vật liệu trong sản xuất thế nào?"** | *"Dạ trong bảng `bill_of_materials`, nhóm đã thiết kế cột tỷ lệ hao hụt (`scrap_rate`) và bắt buộc quy trình duyệt xuất kho 2 bước qua phiếu `material_requisitions`. Khi hoàn thành lệnh, hệ thống ghi nhận cả số lượng hoàn thành và số lượng lỗi (`defect_quantity`) để tính giá thành lô chính xác ạ."* |

---

## 🌐 PHỤ LỤC: CHIA SẺ SERVER LAPTOP RA INTERNET QUA CLOUDFLARE CHO GIẢNG VIÊN XEM

> Chi tiết kỹ thuật đầy đủ: Xem tài liệu [HUONG_DAN_CHIA_SE_SERVER_LAPTOP_CHO_GIANG_VIEN.md](../deployment/HUONG_DAN_CHIA_SE_SERVER_LAPTOP_CHO_GIANG_VIEN.md)

### 1. Cách Lấy Link Cloudflare Nhanh (1-Click)
1. Đảm bảo Backend Server đang chạy tại `http://localhost:8000`.
2. Nhấp đúp chạy file [`chia-se-internet.bat`](../../chia-se-internet.bat) ở thư mục gốc (hoặc chạy lệnh `.\cloudflared.exe tunnel --url http://localhost:8000`).
3. Copy đường link HTTPS chính chủ của Cloudflare (dạng `https://xxxx.trycloudflare.com`) in ra trong cửa sổ terminal.

### 2. Mẫu Tin Nhắn Gửi Giảng Viên Kèm Link Demo
```text
Dạ em chào Thầy/Cô ạ,
Nhóm em xin gửi Thầy/Cô link truy cập hệ thống Quản trị Doanh nghiệp SMB Yến sào & Cà phê tích hợp AI (đang được host trực tiếp từ máy trạm của nhóm qua đường truyền Cloudflare HTTPS) để Thầy/Cô tiện xem thử và đánh giá tiến độ thực tế ạ:

🔗 Cổng Bán Hàng Trực Tuyến: https://<Dán_Link_Cloudflare_Của_Bạn>/store
🔐 Cổng Đăng Nhập Quản Trị ERP: https://<Dán_Link_Cloudflare_Của_Bạn>/login

⚡ Tài khoản kiểm thử nhanh (có sẵn nút chọn 1-chạm trên trang đăng nhập):
- Giám Đốc (Admin):       admin   / admin123
- Trưởng Kho:             kho     / kho123
- Quản Đốc Sản Xuất:      sanxuat / sanxuat123
- Ban Thu Mua:            thumua  / thumua123

Nhóm kính nhờ Thầy/Cô xem qua và cho chúng em xin thêm ý kiến nhận xét ạ. Em cảm ơn Thầy/Cô!
```
