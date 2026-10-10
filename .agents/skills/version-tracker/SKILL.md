---
name: version-tracker
description: Quản lý và theo dõi nhật ký thay đổi phiên bản (changelog, version updates, bug fixes, và roadmap) cho dự án Đồ án tốt nghiệp.
---

# SKILL: Version Tracker (Nhật ký phiên bản & Tiến độ dự án)

Skill này hướng dẫn quy trình ghi nhận, cập nhật và theo dõi các phiên bản thay đổi (Changelog & Version Updates) của hệ thống.

## 📌 QUY TRÌNH NÂNG CẤP PHIÊN BẢN (VERSION BUMP WORKFLOW)

Mỗi khi hệ thống có cập nhật mới (sửa lỗi CSDL, thêm API, cấu hình n8n, phát triển UI Dashboard, hoặc tích hợp AI Agent), hãy ghi nhận vào `version-tracker.md` với định dạng chuẩn sau:

```markdown
# Changelog: Version X.Y.Z
**Date:** YYYY-MM-DD

## Overview
[Mô tả tóm tắt mục đích chính của phiên bản này]

## Errors Found
- [Danh sách các lỗi hoặc điểm nghẽn phát hiện trong phiên bản trước]

## Fixes & Edits
- [Chi tiết các giải pháp, hàm đã sửa, bảng đã thay đổi, node n8n đã tối ưu]

## Next Steps
- [Các công việc dự kiến cho phiên bản tiếp theo]
```

## 🔍 QUY TẮC PHÂN LOẠI PHIÊN BẢN (SEMANTIC VERSIONING)
- **MAJOR (X.0.0):** Thay đổi lớn về kiến trúc (Ví dụ: hoàn thành toàn bộ Giai đoạn 1/2/3).
- **MINOR (1.X.0):** Bổ sung tính năng mới (Ví dụ: tích hợp xong module Text-to-SQL, thêm phân hệ Quản lý bán hàng).
- **PATCH (1.0.X):** Sửa lỗi nhỏ, tối ưu SQL, cập nhật định dạng dữ liệu, bổ sung chỉ mục index.
