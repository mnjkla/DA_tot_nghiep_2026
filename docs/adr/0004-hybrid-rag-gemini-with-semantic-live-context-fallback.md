# Kiến Trúc Hybrid RAG Kết Hợp Google Gemini 1.5 Flash và Semantic Live Context Fallback

Để đáp ứng câu hỏi phong phú bằng tiếng Việt của người dùng về tồn kho, định mức kỹ thuật và tư vấn bán hàng, hệ thống kết hợp mô hình đám mây Google Gemini 1.5 Flash với kỹ thuật nạp ngữ cảnh dữ liệu sống (Live Context Snapshot) từ CSDL, đồng thời tích hợp cơ chế dự phòng xử lý ngữ nghĩa (Semantic Fallback) độc lập với mạng internet.

## Status
Accepted

## Considered Options
1. **Truy vấn LLM truyền thống không có Grounding**: Mô hình ngôn ngữ dễ sinh ảo giác (hallucination), không nắm được số lượng tồn kho hay trạng thái đơn hàng biến động theo từng giây của doanh nghiệp.
2. **Hard-coded rule / Keyword matching tĩnh**: Tốc độ phản hồi tức thì nhưng thất bại khi người dùng thay đổi cách diễn đạt (ví dụ: "trong kho có gì", "còn tồn những gì", "liệt kê yến sào").
3. **Kiến trúc Hybrid RAG hai lớp**: Tự động tổng hợp snapshot dữ liệu tức thời từ cơ sở dữ liệu làm ngữ cảnh thực tế (Grounding Data) truyền vào Gemini 1.5 Flash API. Nếu Gemini không được cấu hình API Key, hết hạn ngạch hoặc mạng bị ngắt kết nối, bộ giải mã ngữ nghĩa nội bộ (Semantic Engine) sẽ tự động phân tích ý định và trả kết quả dữ liệu sống chính xác 100%.

## Consequences
- Hệ thống trợ lý AI hoạt động liên tục 24/7 với độ sẵn sàng cao, đảm bảo không bao giờ bị gián đoạn giao dịch tại quầy bán lẻ hoặc cổng thương mại điện tử.
- Dữ liệu trả về luôn kèm theo huy hiệu minh chứng nguồn gốc (`⚡ Gemini 1.5 Flash Grounding` hoặc `🛡️ Trợ lý ERP Cốt Lõi`) nhằm tăng độ tin cậy cho ban giám đốc.

